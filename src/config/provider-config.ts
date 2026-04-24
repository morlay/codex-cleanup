export async function readConfiguredProvider(configPath: string): Promise<string> {
    const configText = await Bun.file(configPath).text();
    const match = configText.match(/^\s*model_provider\s*=\s*"([^"]+)"\s*$/m);

    if (!match) {
        throw new Error(`model_provider not found in ${configPath}`);
    }

    return match[1]!;
}
