#!/usr/bin/env bun

import { parseCliOptions } from "../cli/options";
import { runCleanup } from "../services/cleanup-service";

const options = parseCliOptions(Bun.argv.slice(2));

await runCleanup(options);
