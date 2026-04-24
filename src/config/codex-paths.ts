import { join } from "node:path";

export type CodexPaths = {
    codexDir: string;
    stateDbPath: string;
    logsDbPath: string;
    configPath: string;
    sessionIndexPath: string;
    archivedSessionsPath: string;
    archivedIndexPath: string;
};

export function resolveCodexPaths(homeDir: string): CodexPaths {
    const codexDir = join(homeDir, ".codex");

    return {
        codexDir,
        stateDbPath: join(codexDir, "state_5.sqlite"),
        logsDbPath: join(codexDir, "logs_2.sqlite"),
        configPath: join(codexDir, "config.toml"),
        sessionIndexPath: join(codexDir, "session_index.jsonl"),
        archivedSessionsPath: join(codexDir, "archived_sessions"),
        archivedIndexPath: join(codexDir, "archived_sessions.jsonl"),
    };
}
