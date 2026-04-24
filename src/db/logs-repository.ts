import { Database } from "bun:sqlite";

import type { CountBytesRecord } from "./models";

export class LogsRepository {
    private readonly clearValidThreadsTableStatement;
    private readonly insertValidThreadStatement;
    private readonly countOrphanLogsStatement;
    private readonly deleteOrphanLogsStatement;

    private readonly syncValidThreadIdsTransaction;
    private readonly deleteOrphanLogsTransaction;

    constructor(private readonly db: Database) {
        this.db.run("PRAGMA busy_timeout = 5000;");

        this.db.run(`
            CREATE TEMP TABLE IF NOT EXISTS valid_threads (
                id TEXT PRIMARY KEY
            ) WITHOUT ROWID
        `);

        this.clearValidThreadsTableStatement = this.db.prepare(`
            DELETE FROM valid_threads
        `);

        this.insertValidThreadStatement = this.db.prepare(`
            INSERT OR IGNORE INTO valid_threads (id)
            VALUES ($id)
        `);

        this.countOrphanLogsStatement = this.db.prepare(`
            SELECT COUNT(*) AS count, COALESCE(SUM(estimated_bytes), 0) AS bytes
            FROM logs
            WHERE thread_id IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1
                  FROM valid_threads
                  WHERE valid_threads.id = logs.thread_id
              )
        `);

        this.deleteOrphanLogsStatement = this.db.prepare(`
            DELETE FROM logs
            WHERE thread_id IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1
                  FROM valid_threads
                  WHERE valid_threads.id = logs.thread_id
              )
        `);

        this.syncValidThreadIdsTransaction = this.db.transaction((threadIds: readonly string[]) => {
            this.clearValidThreadsTableStatement.run();

            for (const threadId of threadIds) {
                this.insertValidThreadStatement.run({ id: threadId });
            }
        });

        this.deleteOrphanLogsTransaction = this.db.transaction((threadIds: readonly string[]) => {
            this.clearValidThreadsTableStatement.run();

            for (const threadId of threadIds) {
                this.insertValidThreadStatement.run({ id: threadId });
            }

            this.deleteOrphanLogsStatement.run();
        });
    }

    countOrphanLogs(threadIds: readonly string[]): CountBytesRecord {
        this.syncValidThreadIdsTransaction.immediate(threadIds);
        return (this.countOrphanLogsStatement.get() as CountBytesRecord | null) ?? { count: 0, bytes: 0 };
    }

    deleteOrphanLogs(threadIds: readonly string[]): void {
        this.deleteOrphanLogsTransaction.immediate(threadIds);
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
