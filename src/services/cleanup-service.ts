import { rm, stat } from "node:fs/promises";

import type { CliOptions } from "../cli/options";
import { resolveCodexPaths } from "../config/codex-paths";
import { readConfiguredProvider } from "../config/provider-config";
import { LogsRepository } from "../db/logs-repository";
import { openDatabase } from "../db/open-database";
import { StateRepository } from "../db/state-repository";
import { rebuildSessionIndex } from "./rebuild-session-index";
import { sizeText } from "../utils/format";

async function cleanupArchivedSessionsDir(archivedSessionsPath: string): Promise<number> {
    if (!(await Bun.file(archivedSessionsPath).exists())) {
        return 0;
    }

    const before = await stat(archivedSessionsPath);
    await rm(archivedSessionsPath, { recursive: true, force: true });
    return before.size;
}

export async function runCleanup(options: CliOptions): Promise<void> {
    const home = process.env.HOME;

    if (!home) {
        throw new Error("HOME is not set");
    }

    const paths = resolveCodexPaths(home);
    const configuredProvider = await readConfiguredProvider(paths.configPath);

    const stateRepository = new StateRepository(await openDatabase(paths.stateDbPath));
    const logsRepository = new LogsRepository(await openDatabase(paths.logsDbPath));

    try {
        const nonMatchingThreads = stateRepository.countNonMatchingProviderThreads(configuredProvider);
        const archivedThreads = stateRepository.countArchivedThreads();
        const orphanLogs = logsRepository.countOrphanLogs(stateRepository.listAllThreadIds());

        console.log(`Configured provider: ${configuredProvider}`);
        console.log(`Non-matching provider threads: ${nonMatchingThreads.count}`);
        console.log(`Archived threads: ${archivedThreads.count}`);
        console.log(`Orphan logs: ${orphanLogs.count} rows, ${sizeText(orphanLogs.bytes ?? 0)}`);

        if (!options.apply) {
            console.log("Dry run only. Re-run with --apply to modify ~/.codex.");
            return;
        }

        stateRepository.cleanupThreads(configuredProvider);
        logsRepository.deleteOrphanLogs(stateRepository.listAllThreadIds());

        const removedArchivedDirBytes = await cleanupArchivedSessionsDir(paths.archivedSessionsPath);

        stateRepository.checkpointWal();
        logsRepository.checkpointWal();

        stateRepository.close();
        logsRepository.close();

        const vacuumStateRepository = new StateRepository(await openDatabase(paths.stateDbPath));
        const vacuumLogsRepository = new LogsRepository(await openDatabase(paths.logsDbPath));

        try {
            vacuumStateRepository.vacuum();
            vacuumLogsRepository.vacuum();
            await rebuildSessionIndex(paths, vacuumStateRepository);
        } finally {
            vacuumStateRepository.close();
            vacuumLogsRepository.close();
        }

        if (options.verbose) {
            console.log(`Removed archived_sessions directory bytes: ${sizeText(removedArchivedDirBytes)}`);
        }

        console.log("Cleanup complete.");
    } finally {
        try {
            stateRepository.close();
        } catch {
            // Ignore close errors after successful close.
        }

        try {
            logsRepository.close();
        } catch {
            // Ignore close errors after successful close.
        }
    }
}
