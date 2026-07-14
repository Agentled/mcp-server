#!/usr/bin/env node

/**
 * Agentled CLI entry point.
 *
 * Parses command-line arguments manually — zero external dependencies.
 */

import { createRequire } from 'node:module';
import { banner, error, c } from './ui.js';
import { createCommand } from './create.js';
import { checkForUpdate, printUpdateNotice } from './update-check.js';
import {
    moveStepCommand,
    addStepCommand,
    removeStepCommand,
    updateStepCommand,
    getStepCommand,
} from './step-ops.js';
import { appsGrepCommand, appsForSourceCommand } from './apps.js';
import { schemaStepTypeCommand, schemaContextCommand } from './schema.js';
import { toolsBuiltinsCommand } from './tools-builtins.js';
import { scaffoldListCommand, scaffoldWriteCommand } from './scaffolds.js';
import { validateFileCommand } from './validate.js';
import { createFromFileCommand } from './create-from-file.js';
import { examplesListCommand, examplesShowCommand } from './examples.js';
import { bestPracticesCommand } from './best-practices.js';

// ---------------------------------------------------------------------------
// Version
// ---------------------------------------------------------------------------

const require = createRequire(import.meta.url);
const pkg = require('../../package.json') as { version: string };
const PKG_NAME = '@agentled/mcp-server';

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

interface ParsedArgs {
    command: string | undefined;
    positional: string[];
    flags: {
        publish: boolean;
        dryRun: boolean;
        verbose: boolean;
        schedule: string | undefined;
        help: boolean;
        after: string | undefined;
        position: string | undefined;
        step: string | undefined;
        updates: string | undefined;
        replace: string[];
        unset: string[];
        source: string | undefined;
        noRewire: boolean;
        // New flags
        stepType: string | undefined;
        shape: string | undefined;
        context: boolean;
        file: string | undefined;
        out: string | undefined;
        list: boolean;
        json: boolean;
        skipValidate: boolean;
    };
}

function parseArgs(argv: string[]): ParsedArgs {
    // Skip node + script path
    const raw = argv.slice(2);

    const command = raw.length > 0 && !raw[0].startsWith('-') ? raw[0] : undefined;
    const positional: string[] = [];
    const flags = {
        publish: false,
        dryRun: false,
        verbose: false,
        schedule: undefined as string | undefined,
        help: false,
        after: undefined as string | undefined,
        position: undefined as string | undefined,
        step: undefined as string | undefined,
        updates: undefined as string | undefined,
        replace: [] as string[],
        unset: [] as string[],
        source: undefined as string | undefined,
        noRewire: false,
        // Schema/discovery flags
        stepType: undefined as string | undefined,
        shape: undefined as string | undefined,
        context: false,
        file: undefined as string | undefined,
        out: undefined as string | undefined,
        list: false,
        json: false,
        skipValidate: false,
    };

    let i = command ? 1 : 0;
    while (i < raw.length) {
        const arg = raw[i];

        if (arg === '--publish') {
            flags.publish = true;
        } else if (arg === '--dry-run') {
            flags.dryRun = true;
        } else if (arg === '--verbose') {
            flags.verbose = true;
        } else if (arg === '--help' || arg === '-h') {
            flags.help = true;
        } else if (arg === '--no-rewire') {
            flags.noRewire = true;
        } else if (arg === '--context') {
            flags.context = true;
        } else if (arg === '--list') {
            flags.list = true;
        } else if (arg === '--json') {
            flags.json = true;
        } else if (arg === '--skip-validate') {
            flags.skipValidate = true;
        } else if (arg === '--schedule') {
            i++;
            if (i >= raw.length) { error('--schedule requires a value (e.g., "every 48h")'); process.exit(1); }
            flags.schedule = raw[i];
        } else if (arg.startsWith('--schedule=')) {
            flags.schedule = arg.slice('--schedule='.length);
        } else if (arg === '--after') {
            i++;
            if (i >= raw.length) { error('--after requires a step ID'); process.exit(1); }
            flags.after = raw[i];
        } else if (arg.startsWith('--after=')) {
            flags.after = arg.slice('--after='.length);
        } else if (arg === '--position') {
            i++;
            if (i >= raw.length) { error('--position requires a value (first|last)'); process.exit(1); }
            flags.position = raw[i];
        } else if (arg.startsWith('--position=')) {
            flags.position = arg.slice('--position='.length);
        } else if (arg === '--step') {
            i++;
            if (i >= raw.length) { error('--step requires a JSON string'); process.exit(1); }
            flags.step = raw[i];
        } else if (arg.startsWith('--step=')) {
            flags.step = arg.slice('--step='.length);
        } else if (arg === '--updates') {
            i++;
            if (i >= raw.length) { error('--updates requires a JSON string'); process.exit(1); }
            flags.updates = raw[i];
        } else if (arg.startsWith('--updates=')) {
            flags.updates = arg.slice('--updates='.length);
        } else if (arg === '--replace') {
            i++;
            if (i >= raw.length) { error('--replace requires a comma-separated list of dot-paths'); process.exit(1); }
            flags.replace.push(...raw[i].split(',').map(s => s.trim()).filter(Boolean));
        } else if (arg.startsWith('--replace=')) {
            flags.replace.push(...arg.slice('--replace='.length).split(',').map(s => s.trim()).filter(Boolean));
        } else if (arg === '--unset') {
            i++;
            if (i >= raw.length) { error('--unset requires a comma-separated list of dot-paths'); process.exit(1); }
            flags.unset.push(...raw[i].split(',').map(s => s.trim()).filter(Boolean));
        } else if (arg.startsWith('--unset=')) {
            flags.unset.push(...arg.slice('--unset='.length).split(',').map(s => s.trim()).filter(Boolean));
        } else if (arg === '--source') {
            i++;
            if (i >= raw.length) { error('--source requires a value (auto, live, or draft)'); process.exit(1); }
            flags.source = raw[i];
        } else if (arg.startsWith('--source=')) {
            flags.source = arg.slice('--source='.length);
        } else if (arg === '--step-type') {
            i++;
            if (i >= raw.length) { error('--step-type requires a value (e.g., aiAction)'); process.exit(1); }
            flags.stepType = raw[i];
        } else if (arg.startsWith('--step-type=')) {
            flags.stepType = arg.slice('--step-type='.length);
        } else if (arg === '--shape') {
            i++;
            if (i >= raw.length) { error('--shape requires a value (e.g., agentic-search)'); process.exit(1); }
            flags.shape = raw[i];
        } else if (arg.startsWith('--shape=')) {
            flags.shape = arg.slice('--shape='.length);
        } else if (arg === '--file') {
            i++;
            if (i >= raw.length) { error('--file requires a path'); process.exit(1); }
            flags.file = raw[i];
        } else if (arg.startsWith('--file=')) {
            flags.file = arg.slice('--file='.length);
        } else if (arg === '--out') {
            i++;
            if (i >= raw.length) { error('--out requires a path'); process.exit(1); }
            flags.out = raw[i];
        } else if (arg.startsWith('--out=')) {
            flags.out = arg.slice('--out='.length);
        } else if (arg.startsWith('-')) {
            error(`Unknown option: ${arg}`);
            console.log('');
            console.log(`  Run ${c.cyan}npx @agentled/mcp-server help${c.reset} for usage information.`);
            console.log('');
            process.exit(1);
        } else {
            positional.push(arg);
        }

        i++;
    }

    return { command, positional, flags };
}

// ---------------------------------------------------------------------------
// Shared API key guard
// ---------------------------------------------------------------------------

function requireApiKey(): void {
    if (!process.env.AGENTLED_API_KEY) {
        console.log('');
        error('Missing AGENTLED_API_KEY environment variable.');
        console.log('');
        console.log(`  Generate an API key in ${c.bold}Workspace Settings > Developer${c.reset}`);
        console.log(`  Then export it:  ${c.cyan}export AGENTLED_API_KEY=wsk_...${c.reset}`);
        console.log('');
        process.exit(1);
    }
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------

function showHelp(): void {
    console.log('');
    console.log(`  ${c.magenta}◆${c.reset} ${c.bold}agentled CLI${c.reset}`);
    console.log('');

    console.log(`  ${c.dim}For workspace setup, testing (init, lint, fixture, test, pull, sync) → install ${c.cyan}@agentled/cli${c.reset}${c.dim}.${c.reset}`);
    console.log('');

    console.log(`  ${c.bold}Build${c.reset}`);
    console.log(`    npx @agentled/mcp-server create <description>                     Create workflows from natural language`);
    console.log(`    npx @agentled/mcp-server workflows create --file <path>           POST a pipeline JSON file to the API`);
    console.log(`    npx @agentled/mcp-server workflows validate --file <path>         Client-side preflight (exit 0/1/2)`);
    console.log(`    npx @agentled/mcp-server workflows scaffold --list                List available pipeline skeletons`);
    console.log(`    npx @agentled/mcp-server workflows scaffold <name> --out <file>   Write a skeleton to file`);
    console.log('');

    console.log(`  ${c.bold}Step editing${c.reset}`);
    console.log(`    npx @agentled/mcp-server add-step <wf> --step <json>              Add a step to a workflow`);
    console.log(`    npx @agentled/mcp-server remove-step <wf> <step>                 Remove a step`);
    console.log(`    npx @agentled/mcp-server update-step <wf> <step> --updates <j>   Update step fields`);
    console.log(`    npx @agentled/mcp-server get-step <wf> <step>                    Read a single step`);
    console.log(`    npx @agentled/mcp-server move-step <wf> <step> (--after <id> | --position first|last)  Reposition a step`);
    console.log('');

    console.log(`  ${c.bold}Discover${c.reset}`);
    console.log(`    npx @agentled/mcp-server apps grep <keyword>                     Search app catalog`);
    console.log(`    npx @agentled/mcp-server apps for-source <source>                Check for native app (with fallback guidance)`);
    console.log(`    npx @agentled/mcp-server tools builtins                          Valid aiActionWithTools builtinType values`);
    console.log('');

    console.log(`  ${c.bold}Schema / Reference${c.reset}`);
    console.log(`    npx @agentled/mcp-server schema --step-type <type>               Step shape examples`);
    console.log(`    npx @agentled/mcp-server schema --step-type <t> --shape <s>      Specific shape variant`);
    console.log(`    npx @agentled/mcp-server schema --context                        Valid input-page field types`);
    console.log(`    npx @agentled/mcp-server examples                                List agentic-ops patterns`);
    console.log(`    npx @agentled/mcp-server examples <pattern>                      Print a pattern`);
    console.log(`    npx @agentled/mcp-server best-practices                          One-page summary + repo URL`);
    console.log('');

    console.log(`  ${c.bold}Other${c.reset}`);
    console.log(`    npx @agentled/mcp-server help                                    Show this help message`);
    console.log(`    npx @agentled/mcp-server version                                 Show version`);
    console.log(`    (Global install: npm i -g @agentled/cli → use the agentled command directly)`);
    console.log('');

    console.log(`  ${c.bold}Global flags${c.reset}`);
    console.log(`    --json              Output raw JSON (machine-readable)`);
    console.log(`    --publish           Auto-publish after create`);
    console.log(`    --dry-run           Preview without creating`);
    console.log(`    --schedule <expr>   Set recurrence on create (e.g., "every 48h")`);
    console.log(`    --verbose           Show detailed output`);
    console.log('');

    console.log(`  ${c.bold}Environment${c.reset}`);
    console.log(`    AGENTLED_API_KEY    API key from Workspace Settings > Developer`);
    console.log(`    AGENTLED_URL        API base URL (default: https://www.agentled.app)`);
    console.log('');

    console.log(`  ${c.bold}Examples${c.reset}`);
    console.log(`    npx @agentled/mcp-server create "Outbound to fintech CTOs in Europe"`);
    console.log(`    npx @agentled/mcp-server apps for-source linkedin`);
    console.log(`    npx @agentled/mcp-server apps grep producthunt --json`);
    console.log(`    npx @agentled/mcp-server schema --step-type aiActionWithTools --shape agentic-search`);
    console.log(`    npx @agentled/mcp-server tools builtins`);
    console.log(`    npx @agentled/mcp-server workflows scaffold lead-scoring-kg --out pipeline.json`);
    console.log(`    npx @agentled/mcp-server workflows validate --file pipeline.json`);
    console.log(`    npx @agentled/mcp-server workflows create --file pipeline.json --publish`);
    console.log(`    npx @agentled/mcp-server examples trigger-design`);
    console.log(`    npx @agentled/mcp-server best-practices`);
    console.log('');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
    const { command, positional, flags } = parseArgs(process.argv);

    // Kick off the update check early so its latency overlaps with command
    // work. The check itself is cache-first (free on cache hit) and capped by
    // a hard timeout on miss, so it never blocks the CLI meaningfully.
    // Register the notice on `exit` so every code path prints it once.
    const updatePromise = checkForUpdate(PKG_NAME, pkg.version);
    let latestVersion: string | null = null;
    updatePromise.then((v) => {
        latestVersion = v;
    });
    process.on('exit', () => {
        if (latestVersion) printUpdateNotice(PKG_NAME, pkg.version, latestVersion);
    });

    // No command or explicit help flag
    if (!command || command === 'help' || flags.help) {
        showHelp();
        await updatePromise;
        process.exit(0);
    }

    // Version
    if (command === 'version') {
        console.log(`agentled ${pkg.version}`);
        await updatePromise;
        process.exit(0);
    }

    // -----------------------------------------------------------------------
    // best-practices
    // -----------------------------------------------------------------------
    if (command === 'best-practices') {
        bestPracticesCommand();
        await updatePromise;
        process.exit(0);
    }

    // -----------------------------------------------------------------------
    // schema
    // -----------------------------------------------------------------------
    if (command === 'schema') {
        if (flags.context) {
            schemaContextCommand(flags.json);
        } else {
            schemaStepTypeCommand(flags.stepType ?? '', flags.shape, flags.json);
        }
        await updatePromise;
        process.exit(process.exitCode ?? 0);
    }

    // -----------------------------------------------------------------------
    // tools
    // -----------------------------------------------------------------------
    if (command === 'tools') {
        const subcommand = positional[0];
        if (!subcommand || subcommand === 'builtins') {
            toolsBuiltinsCommand(flags.json);
        } else {
            error(`Unknown tools subcommand: ${subcommand}`);
            console.log(`  Available: builtins`);
            process.exit(1);
        }
        await updatePromise;
        process.exit(process.exitCode ?? 0);
    }

    // -----------------------------------------------------------------------
    // apps
    // -----------------------------------------------------------------------
    if (command === 'apps') {
        const subcommand = positional[0];
        const keyword = positional[1] ?? '';

        if (subcommand === 'grep') {
            if (!keyword) {
                error('Usage: agentled apps grep <keyword>');
                process.exit(1);
            }
            await appsGrepCommand(keyword, flags.json);
        } else if (subcommand === 'for-source') {
            if (!keyword) {
                error('Usage: agentled apps for-source <source>');
                process.exit(1);
            }
            await appsForSourceCommand(keyword, flags.json);
        } else {
            error(`Unknown apps subcommand: ${subcommand ?? '(none)'}`);
            console.log(`  Available: grep, for-source`);
            process.exit(1);
        }
        await updatePromise;
        process.exit(process.exitCode ?? 0);
    }

    // -----------------------------------------------------------------------
    // examples
    // -----------------------------------------------------------------------
    if (command === 'examples') {
        const patternArg = positional[0];
        if (patternArg) {
            examplesShowCommand(patternArg, flags.json);
        } else {
            examplesListCommand(flags.json);
        }
        await updatePromise;
        process.exit(process.exitCode ?? 0);
    }

    // -----------------------------------------------------------------------
    // workflows
    // -----------------------------------------------------------------------
    if (command === 'workflows' || command === 'wf') {
        const subcommand = positional[0];

        if (subcommand === 'scaffold') {
            const scaffoldName = positional[1];
            if (flags.list || !scaffoldName) {
                scaffoldListCommand(flags.json);
            } else {
                scaffoldWriteCommand(scaffoldName, flags.out, flags.json);
            }
            await updatePromise;
            return;
        }

        if (subcommand === 'validate') {
            if (!flags.file) {
                error('Usage: agentled workflows validate --file <path>');
                process.exit(1);
            }
            requireApiKey();
            await validateFileCommand(flags.file, flags.json);
            await updatePromise;
            process.exit(process.exitCode ?? 0);
        }

        if (subcommand === 'create') {
            if (!flags.file) {
                error('Usage: agentled workflows create --file <path>');
                process.exit(1);
            }
            requireApiKey();
            await createFromFileCommand(flags.file, {
                publish: flags.publish,
                json: flags.json,
                skipValidate: flags.skipValidate,
            });
            await updatePromise;
            process.exit(process.exitCode ?? 0);
        }

        // Legacy alias: workflows add-step, etc. — forward to top-level commands
        if (!subcommand) {
            error('Usage: agentled workflows <scaffold|validate|create>');
            console.log(`  Run ${c.cyan}npx @agentled/mcp-server help${c.reset} for usage.`);
            process.exit(1);
        }

        error(`Unknown workflows subcommand: ${subcommand}`);
        console.log(`  Available: scaffold, validate, create`);
        process.exit(1);
    }

    // -----------------------------------------------------------------------
    // create command (NL)
    // -----------------------------------------------------------------------
    if (command === 'create') {
        requireApiKey();

        // Description can be a single quoted arg or multiple positional args joined
        const description = positional.join(' ').trim();

        if (!description) {
            console.log('');
            error('Missing workflow description.');
            console.log('');
            console.log(`  ${c.bold}Usage:${c.reset}  npx @agentled/mcp-server create <description>`);
            console.log('');
            console.log(`  ${c.bold}Example:${c.reset}`);
            console.log(`    npx @agentled/mcp-server create "Outbound to fintech CTOs in Europe"`);
            console.log('');
            process.exit(1);
        }

        banner();

        await createCommand(description, {
            publish: flags.publish,
            dryRun: flags.dryRun,
            verbose: flags.verbose,
            schedule: flags.schedule,
        });

        await updatePromise;
        process.exit(process.exitCode ?? 0);
    }

    // move-step command
    if (command === 'move-step') {
        requireApiKey();

        const [workflowId, stepId] = positional;
        if (!workflowId || !stepId) {
            error('Usage: npx @agentled/mcp-server move-step <workflow-id> <step-id> (--after <step-id> | --position first|last)');
            process.exit(1);
        }
        const positionFlag = flags.position as string | undefined;
        if (!flags.after && !positionFlag) {
            error('Provide --after <step-id> or --position first|last');
            process.exit(1);
        }
        if (flags.after && positionFlag) {
            error('Provide --after or --position, not both');
            process.exit(1);
        }
        if (positionFlag && positionFlag !== 'first' && positionFlag !== 'last') {
            error('--position must be "first" or "last"');
            process.exit(1);
        }

        await moveStepCommand({
            workflowId,
            stepId,
            ...(flags.after ? { insertAfter: flags.after } : {}),
            ...(positionFlag ? { position: positionFlag as 'first' | 'last' } : {}),
        });
        process.exit(process.exitCode ?? 0);
    }

    // add-step command
    if (command === 'add-step') {
        requireApiKey();

        const [workflowId] = positional;
        if (!workflowId) {
            error('Usage: npx @agentled/mcp-server add-step <workflow-id> --step <json> [--after <step-id>]');
            process.exit(1);
        }
        if (!flags.step) {
            error('--step <json> is required');
            process.exit(1);
        }

        await addStepCommand({
            workflowId,
            stepJson: flags.step,
            insertAfter: flags.after,
            rewireNext: !flags.noRewire,
        });
        process.exit(process.exitCode ?? 0);
    }

    // remove-step command
    if (command === 'remove-step') {
        requireApiKey();

        const [workflowId, stepId] = positional;
        if (!workflowId || !stepId) {
            error('Usage: npx @agentled/mcp-server remove-step <workflow-id> <step-id>');
            process.exit(1);
        }

        await removeStepCommand({
            workflowId,
            stepId,
            rewireNext: !flags.noRewire,
        });
        process.exit(process.exitCode ?? 0);
    }

    // update-step command
    if (command === 'update-step') {
        requireApiKey();

        const [workflowId, stepId] = positional;
        if (!workflowId || !stepId) {
            error('Usage: npx @agentled/mcp-server update-step <workflow-id> <step-id> [--updates <json>] [--replace <paths>] [--unset <paths>]');
            process.exit(1);
        }
        if (!flags.updates && flags.replace.length === 0 && flags.unset.length === 0) {
            error('At least one of --updates, --replace, or --unset is required');
            process.exit(1);
        }

        await updateStepCommand({
            workflowId,
            stepId,
            updatesJson: flags.updates,
            replace: flags.replace,
            unset: flags.unset,
        });
        process.exit(process.exitCode ?? 0);
    }

    // get-step command
    if (command === 'get-step') {
        requireApiKey();

        const [workflowId, stepId] = positional;
        if (!workflowId || !stepId) {
            error('Usage: npx @agentled/mcp-server get-step <workflow-id> <step-id> [--source auto|live|draft]');
            process.exit(1);
        }

        const source = flags.source ?? 'auto';
        if (!['auto', 'live', 'draft'].includes(source)) {
            error(`Invalid --source "${source}". Must be one of: auto, live, draft.`);
            process.exit(1);
        }

        await getStepCommand({
            workflowId,
            stepId,
            source: source as 'auto' | 'live' | 'draft',
        });
        process.exit(process.exitCode ?? 0);
    }

    // Unknown command
    error(`Unknown command: ${command}`);
    console.log('');
    console.log(`  Run ${c.cyan}npx @agentled/mcp-server help${c.reset} for usage information.`);
    console.log('');
    await updatePromise;
    process.exit(1);
}

main().catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    error(`Unexpected error: ${message}`);
    process.exit(1);
});
