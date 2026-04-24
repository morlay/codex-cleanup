import type { CodexPaths } from "../config/codex-paths";
import type { StateRepository } from "../db/state-repository";

function isoFromEpochSeconds(seconds: number): string {
    return new Date(seconds * 1000).toISOString();
}

async function atomicWrite(path: string, content: string): Promise<void> {
    await Bun.write(path, content);
}

export async function rebuildSessionIndex(paths: CodexPaths, stateRepository: StateRepository): Promise<void> {
    const liveJsonl = stateRepository
        .listLiveThreads()
        .map((thread) =>
            JSON.stringify({
                id: thread.id,
                thread_name: thread.title,
                updated_at: isoFromEpochSeconds(thread.updated_at),
            }),
        )
        .join("\n");

    await atomicWrite(paths.sessionIndexPath, liveJsonl ? `${liveJsonl}\n` : "");

    const archivedThreads = stateRepository.listArchivedThreads();
    const archivedJsonl = archivedThreads
        .map((thread) =>
            JSON.stringify({
                id: thread.id,
                thread_name: thread.title,
                updated_at: isoFromEpochSeconds(thread.updated_at),
            }),
        )
        .join("\n");

    if (
        (await Bun.file(paths.archivedSessionsPath).exists()) ||
        (await Bun.file(paths.archivedIndexPath).exists()) ||
        archivedThreads.length > 0
    ) {
        await atomicWrite(paths.archivedIndexPath, archivedJsonl ? `${archivedJsonl}\n` : "");
    }
}
