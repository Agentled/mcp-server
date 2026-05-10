/**
 * `agentled workflows validate --file <path>` — client-side + server-side preflight.
 *
 * Reads a pipeline JSON file and calls the validate_workflow API endpoint
 * (same logic as the `validate_workflow` MCP tool).
 *
 * Exit codes:
 *   0 — no issues
 *   1 — warnings only (non-blocking)
 *   2 — blockers present
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { AgentledClient } from '../client.js';
import { c, writeln, success, warn, error, info } from './ui.js';

function requireApiKey(): void {
    if (!process.env.AGENTLED_API_KEY) {
        writeln('');
        error('Missing AGENTLED_API_KEY environment variable.');
        writeln('');
        writeln(`  Generate an API key in ${c.bold}Workspace Settings > Developer${c.reset}`);
        writeln(`  Then export it:  ${c.cyan}export AGENTLED_API_KEY=wsk_...${c.reset}`);
        writeln('');
        process.exit(1);
    }
}

interface ValidationIssue {
    code?: string;
    message?: string;
    severity?: 'error' | 'warning' | string;
    stepId?: string;
}

interface ValidationResult {
    valid?: boolean;
    issues?: ValidationIssue[];
    errors?: ValidationIssue[];
    warnings?: ValidationIssue[];
}

export async function validateFileCommand(filePath: string, json: boolean): Promise<void> {
    requireApiKey();

    const abs = path.resolve(filePath);
    if (!fs.existsSync(abs)) {
        writeln('');
        error(`File not found: ${abs}`);
        writeln('');
        process.exit(2);
    }

    let pipeline: unknown;
    try {
        const raw = fs.readFileSync(abs, 'utf-8');
        pipeline = JSON.parse(raw);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        writeln('');
        error(`Failed to parse JSON: ${msg}`);
        writeln('');
        process.exit(2);
    }

    const client = new AgentledClient({
        apiKey: process.env.AGENTLED_API_KEY!,
        baseUrl: process.env.AGENTLED_URL,
    });

    let result: ValidationResult;
    try {
        result = await client.validateWorkflow('', pipeline as Record<string, unknown>) as ValidationResult;
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        writeln('');
        error(`Validation request failed: ${msg}`);
        writeln('');
        process.exit(2);
    }

    if (json) {
        process.stdout.write(JSON.stringify(result, null, 2) + '\n');
        return;
    }

    // Normalize issues from different response shapes
    const allIssues: ValidationIssue[] = [
        ...(result.issues ?? []),
        ...(result.errors ?? []),
        ...(result.warnings ?? []),
    ];

    const blockers = allIssues.filter(
        (i) => i.severity === 'error' || (!i.severity && result.errors?.includes(i)),
    );
    const warnings = allIssues.filter(
        (i) => i.severity === 'warning' || (!i.severity && result.warnings?.includes(i)),
    );

    writeln('');

    if (blockers.length === 0 && warnings.length === 0) {
        success(`${c.bold}${abs}${c.reset} — no issues found`);
        writeln('');
        process.exit(0);
    }

    if (blockers.length > 0) {
        error(`${blockers.length} blocker${blockers.length === 1 ? '' : 's'} found:`);
        writeln('');
        for (const issue of blockers) {
            const step = issue.stepId ? `  ${c.dim}[step: ${issue.stepId}]${c.reset}` : '';
            writeln(`  ${c.red}✗${c.reset} ${issue.code ? `${c.bold}${issue.code}${c.reset}  ` : ''}${issue.message ?? ''}${step}`);
        }
    }

    if (warnings.length > 0) {
        writeln('');
        warn(`${warnings.length} warning${warnings.length === 1 ? '' : 's'}:`);
        writeln('');
        for (const issue of warnings) {
            const step = issue.stepId ? `  ${c.dim}[step: ${issue.stepId}]${c.reset}` : '';
            writeln(`  ${c.yellow}⚠${c.reset}  ${issue.code ? `${c.bold}${issue.code}${c.reset}  ` : ''}${issue.message ?? ''}${step}`);
        }
    }

    writeln('');

    if (blockers.length > 0) {
        process.exitCode = 2;
    } else {
        process.exitCode = 1;
    }
}
