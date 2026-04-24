# List available recipes.
default:
    @just --list

# Inspect local Codex state without modifying ~/.codex.
dry-run:
    bun run ./src/bin/codex-cleanup.ts

# Apply cleanup changes to ~/.codex.
apply:
    bun run ./src/bin/codex-cleanup.ts --apply

# Apply cleanup changes and print extra removal details.
apply-verbose:
    bun run ./src/bin/codex-cleanup.ts --apply --verbose
