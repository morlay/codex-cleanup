export type CliOptions = {
    apply: boolean;
    verbose: boolean;
};

const HELP_TEXT = `codex-cleanup

Usage:
  codex-cleanup [--apply] [--verbose]

Options:
  --apply    Apply cleanup changes to ~/.codex
  --verbose  Print extra cleanup details
  --help     Show this help
`;

export function parseCliOptions(argv: string[]): CliOptions {
    const args = new Set(argv);

    if (args.has("--help")) {
        console.log(HELP_TEXT);
        process.exit(0);
    }

    const knownArgs = new Set(["--apply", "--verbose", "--help"]);
    const unknownArgs = argv.filter((arg) => !knownArgs.has(arg));

    if (unknownArgs.length > 0) {
        throw new Error(`Unknown arguments: ${unknownArgs.join(", ")}`);
    }

    return {
        apply: args.has("--apply"),
        verbose: args.has("--verbose"),
    };
}
