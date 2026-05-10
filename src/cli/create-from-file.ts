/**
 * `agentled workflows create --file <path>` — POST a pipeline JSON file to the API.
 *
 * Separate from the NL `create` command. Reads a pipeline JSON (e.g. from a scaffold
 * or export), posts it to /api/external/workflows, then runs server validation.
 * Prints the workflowId on success.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { AgentledClient } from '../client.js';
import { c, writeln, success, error, info, keyValue } from './ui.js';

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

export async function createFromFileCommand(
    filePath: string,
    options: { publish?: boolean; json?: boolean; skipValidate?: boolean },
): Promise<void> {
    requireApiKey();

    const abs = path.resolve(filePath);
    if (!fs.existsSync(abs)) {
        writeln('');
        error(`File not found: ${abs}`);
        writeln('');
        process.exit(1);
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
        process.exit(1);
    }

    if (!pipeline || typeof pipeline !== 'object' || Array.isArray(pipeline)) {
        writeln('');
        error('Pipeline JSON must be an object.');
        writeln('');
        process.exit(1);
    }

    const client = new AgentledClient({
        apiKey: process.env.AGENTLED_API_KEY!,
        baseUrl: process.env.AGENTLED_URL,
    });

    let createResult: { id?: string; workflowId?: string; [key: string]: unknown };
    try {
        createResult = await client.createWorkflow(pipeline as Record<string, any>) as typeof createResult;
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        writeln('');
        error(`Failed to create workflow: ${msg}`);
        writeln('');
        process.exit(1);
    }

    const workflowId = createResult.id ?? createResult.workflowId;
    if (!workflowId) {
        writeln('');
        error('Workflow created but no ID returned. Check the API response.');
        writeln('');
        if (options.json) {
            process.stdout.write(JSON.stringify(createResult, null, 2) + '\n');
        }
        process.exit(1);
    }

    if (options.json) {
        process.stdout.write(JSON.stringify({ workflowId, ...createResult }, null, 2) + '\n');
        return;
    }

    writeln('');
    success(`Workflow created: ${c.bold}${workflowId}${c.reset}`);

    // Run server validation unless skipped
    if (!options.skipValidate) {
        writeln('');
        info('Running server validation…');

        try {
            const valResult = await client.validateWorkflow(workflowId) as {
                valid?: boolean;
                issues?: Array<{ severity?: string; code?: string; message?: string; stepId?: string }>;
            };

            const issues = valResult.issues ?? [];
            const blockers = issues.filter((i) => i.severity === 'error');
            const warnings = issues.filter((i) => i.severity === 'warning');

            if (blockers.length === 0 && warnings.length === 0) {
                success('Validation passed — no issues');
            } else {
                if (blockers.length > 0) {
                    writeln('');
                    for (const issue of blockers) {
                        const step = issue.stepId ? `  ${c.dim}[step: ${issue.stepId}]${c.reset}` : '';
                        writeln(`  ${c.red}✗${c.reset} ${issue.code ? `${c.bold}${issue.code}${c.reset}  ` : ''}${issue.message ?? ''}${step}`);
                    }
                }
                if (warnings.length > 0) {
                    writeln('');
                    for (const issue of warnings) {
                        const step = issue.stepId ? `  ${c.dim}[step: ${issue.stepId}]${c.reset}` : '';
                        writeln(`  ${c.yellow}⚠${c.reset}  ${issue.code ? `${c.bold}${issue.code}${c.reset}  ` : ''}${issue.message ?? ''}${step}`);
                    }
                }
            }
        } catch {
            writeln(`  ${c.dim}(server validation skipped — could not reach validation endpoint)${c.reset}`);
        }
    }

    if (options.publish) {
        writeln('');
        info('Publishing workflow to live…');
        try {
            await client.publishWorkflow(workflowId, 'live');
            success('Published to live');
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            error(`Failed to publish: ${msg}`);
        }
    }

    writeln('');
    writeln(`  ${c.bold}Next steps:${c.reset}`);
    writeln(`  ${c.dim}→ View/edit: open Agentled in your browser and find "${workflowId}"${c.reset}`);
    writeln(`  ${c.dim}→ Test run:  agentled wf start ${workflowId}   (via MCP) ${c.reset}`);
    writeln('');
}
