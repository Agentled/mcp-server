/**
 * `agentled examples [<pattern>]` — list or print agentic-ops patterns.
 *
 * examples             list all available patterns
 * examples <pattern>   print the full pattern markdown
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { c, writeln, info, warn } from './ui.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Pattern registry (mirrored from packages/cli/patterns/v1/)
// ---------------------------------------------------------------------------

interface PatternMeta {
    id: string;
    file: string;
    title: string;
    description: string;
}

const PATTERNS: PatternMeta[] = [
    { id: '00-why-agentic-ops', file: '00-why-agentic-ops.md', title: 'Why Agentic Ops', description: 'Philosophy behind the pattern library' },
    { id: '01-trigger-design', file: '01-trigger-design.md', title: 'Trigger Design', description: 'Polling vs events, schedule triggers, webhook vs app_event' },
    { id: '02-dedup-gates', file: '02-dedup-gates.md', title: 'Dedup Gates', description: 'Label-based idempotency for email and event intake' },
    { id: '03-credit-efficiency', file: '03-credit-efficiency.md', title: 'Credit Efficiency', description: 'Caching, retry, mocking — avoid paying for the same call twice' },
    { id: '04-loop-patterns', file: '04-loop-patterns.md', title: 'Loop Patterns', description: 'loopConfig, loop_completion wait, fan-in patterns' },
    { id: '05-child-workflow-contracts', file: '05-child-workflow-contracts.md', title: 'Child Workflow Contracts', description: 'Return steps, call-workflow, orchestrator pattern' },
    { id: '06-conditional-routing', file: '06-conditional-routing.md', title: 'Conditional Routing', description: 'entryConditions.criteria, branch/skip/wait patterns' },
    { id: '07-error-handling', file: '07-error-handling.md', title: 'Error Handling', description: 'failureHandling, retries, graceful degradation' },
    { id: '08-composed-email-approval', file: '08-composed-email-approval.md', title: 'Composed Email + Approval', description: 'pipelineStepPrompt.type:email, approval, schedule-email' },
    { id: '09-reports-and-knowledge-storage', file: '09-reports-and-knowledge-storage.md', title: 'Reports + Knowledge Storage', description: 'Config renderer, share URL, notification email, KPI history' },
    { id: '10-person-research-ladder', file: '10-person-research-ladder.md', title: 'Person Research Ladder', description: 'LinkedIn → email → enrichment → scoring for people' },
    { id: '11-company-research-ladder', file: '11-company-research-ladder.md', title: 'Company Research Ladder', description: 'LinkedIn → Crunchbase → Specter → scoring for companies' },
];

// ---------------------------------------------------------------------------
// Locate the patterns directory
// ---------------------------------------------------------------------------

function getPatternsDir(): string {
    // When running from dist/cli/ or src/cli/ inside the mcp-server package,
    // the patterns live in packages/cli/patterns/v1 relative to the monorepo root.
    const candidates = [
        // dist/cli/ → ../../.. → monorepo root → packages/cli/patterns/v1
        path.resolve(__dirname, '../../../packages/cli/patterns/v1'),
        // src/cli/ via tsx → same
        path.resolve(__dirname, '../../../../packages/cli/patterns/v1'),
    ];
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) return candidate;
    }
    // Fallback: same directory structure from CWD
    return path.resolve(process.cwd(), 'packages/cli/patterns/v1');
}

function loadPattern(file: string): string | null {
    const dir = getPatternsDir();
    const fullPath = path.join(dir, file);
    if (!fs.existsSync(fullPath)) return null;
    return fs.readFileSync(fullPath, 'utf-8');
}

// ---------------------------------------------------------------------------
// examples (list)
// ---------------------------------------------------------------------------

export function examplesListCommand(json: boolean): void {
    if (json) {
        process.stdout.write(JSON.stringify(PATTERNS, null, 2) + '\n');
        return;
    }

    writeln('');
    info('Agentic-ops workflow patterns (use `agentled examples <id>` to print):');
    writeln('');

    const idW = Math.max(...PATTERNS.map((p) => p.id.length));
    for (const pattern of PATTERNS) {
        writeln(`  ${c.cyan}${pattern.id.padEnd(idW)}${c.reset}  ${pattern.description}`);
    }

    writeln('');
    writeln(`  ${c.bold}Full patterns:${c.reset} https://github.com/agentled/agentic-ops`);
    writeln('');
    writeln(`  ${c.bold}Example:${c.reset}`);
    writeln(`  ${c.dim}agentled examples trigger-design${c.reset}`);
    writeln(`  ${c.dim}agentled examples 04-loop-patterns${c.reset}`);
    writeln('');
}

// ---------------------------------------------------------------------------
// examples <pattern>
// ---------------------------------------------------------------------------

export function examplesShowCommand(patternArg: string, json: boolean): void {
    // Support short-form (e.g. "trigger-design" → "01-trigger-design")
    const meta = PATTERNS.find(
        (p) => p.id === patternArg
            || p.id.replace(/^\d+-/, '') === patternArg
            || p.file === patternArg
            || p.file === patternArg + '.md',
    );

    if (!meta) {
        writeln('');
        warn(`Unknown pattern: "${patternArg}"`);
        writeln('');
        writeln(`  Available pattern IDs:`);
        for (const p of PATTERNS) {
            writeln(`    ${c.cyan}${p.id}${c.reset}`);
        }
        writeln('');
        process.exit(1);
    }

    const content = loadPattern(meta.file);
    if (!content) {
        writeln('');
        warn(`Pattern file not found locally: ${meta.file}`);
        writeln('');
        writeln(`  View it online: https://github.com/agentled/agentic-ops/blob/main/patterns/v1/${meta.file}`);
        writeln('');
        process.exit(1);
    }

    if (json) {
        process.stdout.write(JSON.stringify({ ...meta, content }, null, 2) + '\n');
        return;
    }

    writeln('');
    writeln(`  ${c.magenta}◆${c.reset} ${c.bold}Pattern: ${meta.title}${c.reset}`);
    writeln(`  ${c.dim}${meta.description}${c.reset}`);
    writeln('');
    writeln('  ' + '─'.repeat(60));
    writeln('');

    // Simple markdown rendering: highlight headers and code blocks
    let inCode = false;
    for (const line of content.split('\n')) {
        if (line.startsWith('```')) {
            inCode = !inCode;
            writeln(`  ${c.dim}${line}${c.reset}`);
        } else if (inCode) {
            writeln(`  ${c.gray}${line}${c.reset}`);
        } else if (line.startsWith('# ')) {
            writeln(`  ${c.bold}${c.brightWhite}${line.slice(2)}${c.reset}`);
        } else if (line.startsWith('## ')) {
            writeln('');
            writeln(`  ${c.bold}${line.slice(3)}${c.reset}`);
        } else if (line.startsWith('### ')) {
            writeln(`  ${c.cyan}${line.slice(4)}${c.reset}`);
        } else if (line.startsWith('> ')) {
            writeln(`  ${c.yellow}│${c.reset}  ${c.dim}${line.slice(2)}${c.reset}`);
        } else {
            writeln(`  ${line}`);
        }
    }

    writeln('');
}
