import { Database } from "bun:sqlite";

import type { CountBytesRecord, ThreadRecord } from "./models";

export class StateRepository {
    private readonly countNonMatchingProviderThreadsStatement;
    private readonly countArchivedThreadsStatement;
    private readonly listLiveThreadsStatement;
    private readonly listArchivedThreadsStatement;
    private readonly listAllThreadIdsStatement;
    private readonly clearDoomedThreadsTableStatement;
    private readonly insertNonMatchingThreadsStatement;
    private readonly insertArchivedThreadsStatement;
    private readonly deleteThreadSpawnEdgesStatement;
    private readonly deleteThreadsStatement;

    private readonly cleanupTransaction;

    constructor(private readonly db: Database) {
        this.db.run("PRAGMA foreign_keys = ON;");
        this.db.run("PRAGMA busy_timeout = 5000;");

        this.countNonMatchingProviderThreadsStatement = this.db.prepare(`
            SELECT COUNT(*) AS count, 0 AS bytes
            FROM threads
            WHERE model_provider IS NULL OR model_provider != $configuredProvider
        `);

        this.countArchivedThreadsStatement = this.db.prepare(`
            SELECT COUNT(*) AS count, 0 AS bytes
            FROM threads
            WHERE archived = 1
        `);

        const listThreadsSql = `
            SELECT id, title, updated_at
            FROM threads
            WHERE archived = $archived
            ORDER BY updated_at ASC, id ASC
        `;
        this.listLiveThreadsStatement = this.db.prepare(listThreadsSql);
        this.listArchivedThreadsStatement = this.db.prepare(listThreadsSql);

        this.listAllThreadIdsStatement = this.db.prepare(`
            SELECT id
            FROM threads
            ORDER BY id ASC
        `);

        this.db.run(`
            CREATE TEMP TABLE IF NOT EXISTS doomed_threads (
                id TEXT PRIMARY KEY
            ) WITHOUT ROWID
        `);

        this.clearDoomedThreadsTableStatement = this.db.prepare(`
            DELETE FROM doomed_threads
        `);

        this.insertNonMatchingThreadsStatement = this.db.prepare(`
            INSERT OR IGNORE INTO doomed_threads (id)
            SELECT id
            FROM threads
            WHERE model_provider IS NULL OR model_provider != $configuredProvider
        `);

        this.insertArchivedThreadsStatement = this.db.prepare(`
            INSERT OR IGNORE INTO doomed_threads (id)
            SELECT id
            FROM threads
            WHERE archived = 1
        `);

        this.deleteThreadSpawnEdgesStatement = this.db.prepare(`
            DELETE FROM thread_spawn_edges
            WHERE parent_thread_id IN (SELECT id FROM doomed_threads)
               OR child_thread_id IN (SELECT id FROM doomed_threads)
        `);

        this.deleteThreadsStatement = this.db.prepare(`
            DELETE FROM threads
            WHERE id IN (SELECT id FROM doomed_threads)
        `);

        this.cleanupTransaction = this.db.transaction((configuredProvider: string) => {
            this.clearDoomedThreadsTableStatement.run();
            this.insertNonMatchingThreadsStatement.run({ configuredProvider });
            this.insertArchivedThreadsStatement.run();
            this.deleteThreadSpawnEdgesStatement.run();
            this.deleteThreadsStatement.run();
        });
    }

    countNonMatchingProviderThreads(configuredProvider: string): CountBytesRecord {
        return (
            (this.countNonMatchingProviderThreadsStatement.get({
                configuredProvider,
            }) as CountBytesRecord | null) ?? { count: 0, bytes: 0 }
        );
    }

    countArchivedThreads(): CountBytesRecord {
        return (this.countArchivedThreadsStatement.get() as CountBytesRecord | null) ?? { count: 0, bytes: 0 };
    }

    listLiveThreads(): ThreadRecord[] {
        return this.listLiveThreadsStatement.all({ archived: 0 }) as ThreadRecord[];
    }

    listArchivedThreads(): ThreadRecord[] {
        return this.listArchivedThreadsStatement.all({ archived: 1 }) as ThreadRecord[];
    }

    listAllThreadIds(): string[] {
        const rows = this.listAllThreadIdsStatement.all() as Array<{ id: string }>;
        return rows.map((row) => row.id);
    }

    cleanupThreads(configuredProvider: string): void {
        this.cleanupTransaction.immediate(configuredProvider);
    }

    checkpointWal(): void {
        this.db.run("PRAGMA wal_checkpoint(TRUNCATE);");
    }

    vacuum(): void {
        this.db.run("VACUUM;");
    }

    close(): void {
        this.db.close(false);
    }
}
