import { Database } from "bun:sqlite";

export async function openDatabase(path: string): Promise<Database> {
    if (!(await Bun.file(path).exists())) {
        throw new Error(`Missing database: ${path}`);
    }

    return new Database(path, { strict: true });
}
