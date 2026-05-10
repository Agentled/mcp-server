/**
 * `agentled workflows scaffold` — list or write preflight-clean pipeline JSON skeletons.
 *
 * workflows scaffold --list                    list available scaffold names + descriptions
 * workflows scaffold <name> --out <file>       write scaffold JSON to a file
 * workflows scaffold <name>                    print scaffold JSON to stdout
 */

import { createRequire } from 'node:module';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { c, writeln, success, warn, info } from './ui.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Scaffold registry
// ---------------------------------------------------------------------------

interface ScaffoldMeta {
    name: string;
    description: string;
    pattern: string;
    file: string;
}

const SCAFFOLDS: ScaffoldMeta[] = [
    {
        name: 'minimal',
        description: 'Minimal manual trigger → milestone workflow skeleton',
        pattern: 'Smoke-test starter',
        file: 'minimal.json',
    },
    {
        name: 'lead-scoring-kg',
        description: 'Source leads → enrich (LinkedIn) → AI score → persist to KG',
        pattern: '04-loop-patterns + 09-reports-and-knowledge-storage',
        file: 'lead-scoring-kg.json',
    },
    {
        name: 'ai-with-tools',
        description: 'Agentic research step with web_search + workspace_memory',
        pattern: 'Native vs agentic rubric (use when no native app covers source)',
        file: 'ai-with-tools.json',
    },
    {
        name: 'email-polling-dedup',
        description: 'Schedule-triggered Gmail polling with label-based dedup gate',
        pattern: '01-trigger-design + 02-dedup-gates',
        file: 'email-polling-dedup.json',
    },
    {
        name: 'extract-threshold-alert',
        description: 'Fetch → AI triage → conditional Slack alert (entryConditions)',
        pattern: '06-conditional-routing',
        file: 'extract-threshold-alert.json',
    },
    {
        name: 'list-match-email',
        description: 'KG list → score/match → composed email outreach with approval gate',
        pattern: '08-composed-email-approval',
        file: 'list-match-email.json',
    },
    {
        name: 'source-from-platform',
        description: 'Source entities from native app → kg.upsert-rows (status: new)',
        pattern: 'Entity Pipeline Pattern (Workflow A — sourcing)',
        file: 'source-from-platform.json',
    },
];

// ---------------------------------------------------------------------------
// Resolve the scaffolds directory at runtime
// ---------------------------------------------------------------------------

function getScaffoldsDir(): string {
    // When running from dist/, go up two levels to reach the package root
    // When running via tsx from src/, go up two levels as well
    const candidates = [
        path.resolve(__dirname, '../../scaffolds'),    // dist/cli/ → root
        path.resolve(__dirname, '../../../scaffolds'),  // src/cli/ → root (tsx)
    ];
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) return candidate;
    }
    // Fallback: relative to CWD
    return path.resolve(process.cwd(), 'scaffolds');
}

function loadScaffoldJson(file: string): unknown {
    const dir = getScaffoldsDir();
    const fullPath = path.join(dir, file);
    if (!fs.existsSync(fullPath)) {
        throw new Error(`Scaffold file not found: ${fullPath}`);
    }
    const raw = fs.readFileSync(fullPath, 'utf-8');
    return JSON.parse(raw);
}

// ---------------------------------------------------------------------------
// workflows scaffold --list
// ---------------------------------------------------------------------------

export function scaffoldListCommand(json: boolean): void {
    if (json) {
        process.stdout.write(JSON.stringify(SCAFFOLDS, null, 2) + '\n');
        return;
    }

    writeln('');
    info('Available workflow scaffolds (preflight-clean pipeline JSON skeletons):');
    writeln('');

    const nameW = Math.max(...SCAFFOLDS.map((s) => s.name.length));
    for (const scaffold of SCAFFOLDS) {
        writeln(`  ${c.cyan}${scaffold.name.padEnd(nameW)}${c.reset}  ${scaffold.description}`);
        writeln(`  ${' '.repeat(nameW)}  ${c.dim}pattern: ${scaffold.pattern}${c.reset}`);
        writeln('');
    }

    writeln(`  ${c.bold}Usage:${c.reset}`);
    writeln(`  ${c.dim}agentled workflows scaffold lead-scoring-kg --out pipeline.json${c.reset}`);
    writeln(`  ${c.dim}agentled workflows scaffold ai-with-tools${c.reset}  # print to stdout`);
    writeln('');
}

// ---------------------------------------------------------------------------
// workflows scaffold <name> [--out <file>]
// ---------------------------------------------------------------------------

export function scaffoldWriteCommand(name: string, outFile: string | undefined, json: boolean): void {
    const meta = SCAFFOLDS.find((s) => s.name === name);
    if (!meta) {
        writeln('');
        warn(`Unknown scaffold: "${name}"`);
        writeln('');
        writeln(`  Available scaffolds: ${SCAFFOLDS.map((s) => s.name).join(', ')}`);
        writeln('');
        writeln(`  Run ${c.cyan}agentled workflows scaffold --list${c.reset} for descriptions.`);
        writeln('');
        process.exit(1);
    }

    let data: unknown;
    try {
        data = loadScaffoldJson(meta.file);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        writeln('');
        warn(`Failed to load scaffold "${name}": ${msg}`);
        writeln('');
        process.exit(1);
    }

    // Strip private _scaffold / _comment fields before writing
    const cleaned = stripPrivateFields(data);
    const output = JSON.stringify(cleaned, null, 2);

    if (outFile) {
        const abs = path.resolve(outFile);
        fs.writeFileSync(abs, output + '\n', 'utf-8');
        if (!json) {
            writeln('');
            success(`Scaffold written to ${c.bold}${abs}${c.reset}`);
            writeln('');
            writeln(`  ${c.bold}Next steps:${c.reset}`);
            writeln(`  ${c.dim}1. Edit the pipeline JSON (fill in REPLACE_WITH_* placeholders)${c.reset}`);
            writeln(`  ${c.dim}2. agentled workflows validate --file ${outFile}${c.reset}`);
            writeln(`  ${c.dim}3. agentled workflows create --file ${outFile}${c.reset}`);
            writeln('');
        }
    } else {
        process.stdout.write(output + '\n');
    }
}

// ---------------------------------------------------------------------------
// Strip _-prefixed private fields recursively
// ---------------------------------------------------------------------------

function stripPrivateFields(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(stripPrivateFields);
    }
    if (value !== null && typeof value === 'object') {
        const obj: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
            if (!k.startsWith('_')) {
                obj[k] = stripPrivateFields(v);
            }
        }
        return obj;
    }
    return value;
}
