/**
 * `agentled create` — Generate a campaign from a natural-language description.
 *
 * Loads workspace context, plans workflows via the AI chat API, creates them
 * through the external API, validates, and optionally publishes.
 */

import { AgentledClient } from '../client.js';
import {
    header,
    info,
    success,
    warn,
    error,
    step,
    progress,
    divider,
    keyValue,
    summary,
    writeln,
    c,
} from './ui.js';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface CreateOptions {
    /** Auto-publish workflows to live after creation (default: false, stays draft). */
    publish?: boolean;
    /** Preview the plan only — do not create any workflows. */
    dryRun?: boolean;
    /** Schedule expression attached to the trigger (e.g. "every 48h"). */
    schedule?: string;
    /** Show detailed / verbose output. */
    verbose?: boolean;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

interface WorkflowPlan {
    name: string;
    goal: string;
    steps: Array<{ type: string; description: string; apps: string[] }>;
}

interface CampaignPlan {
    campaignName: string;
    workflows: WorkflowPlan[];
    schedule?: string;
    estimatedCredits: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract the first JSON object or array from a string that may contain
 * markdown fences, prose, or other non-JSON content.
 */
function extractJson(text: string): unknown | null {
    // Try fenced code blocks first (```json ... ``` or ``` ... ```).
    const fenceRe = /```(?:json)?\s*\n?([\s\S]*?)```/;
    const fenceMatch = text.match(fenceRe);
    if (fenceMatch) {
        try {
            return JSON.parse(fenceMatch[1].trim());
        } catch { /* fall through */ }
    }

    // Brute-force: find the first top-level { … } or [ … ].
    // Tracks whether we're inside a JSON string to avoid miscounting braces.
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '{' || text[i] === '[') {
            const open = text[i];
            const close = open === '{' ? '}' : ']';
            let depth = 0;
            let inString = false;
            let escaped = false;
            for (let j = i; j < text.length; j++) {
                const ch = text[j];
                if (escaped) {
                    escaped = false;
                    continue;
                }
                if (ch === '\\' && inString) {
                    escaped = true;
                    continue;
                }
                if (ch === '"') {
                    inString = !inString;
                    continue;
                }
                if (!inString) {
                    if (ch === open) depth++;
                    else if (ch === close) depth--;
                    if (depth === 0) {
                        try {
                            return JSON.parse(text.substring(i, j + 1));
                        } catch {
                            break;
                        }
                    }
                }
            }
        }
    }

    return null;
}

/**
 * Summarise the apps used across a workflow plan's steps into a compact
 * "linkedin · hunter · clearbit" string.
 */
function appsLabel(plan: WorkflowPlan): string {
    const apps = new Set<string>();
    for (const s of plan.steps) {
        for (const a of s.apps ?? []) {
            apps.add(a.toLowerCase().replace(/\s+/g, '-'));
        }
    }
    return apps.size > 0 ? [...apps].join(` ${c.gray}\u00B7${c.reset} `) : '';
}

// ---------------------------------------------------------------------------
// Main command
// ---------------------------------------------------------------------------

export async function createCommand(
    description: string,
    options: CreateOptions,
): Promise<void> {
    try {
        const client = new AgentledClient();

        // ── Phase 1: Load Context ─────────────────────────────────────────
        header('Loading workspace context from Knowledge Graph...');

        const ctxSpinner = progress('Fetching workspace data...');

        let workspaceName = 'your workspace';
        let companyContext = '';
        let kgListCount = 0;
        let kgTotalRows = 0;
        let existingWorkflowCount = 0;

        // Fire requests concurrently.
        const [workspaceRes, kgRes, wfRes] = await Promise.allSettled([
            client.getWorkspace(),
            client.listKnowledgeLists(),
            client.listWorkflows({ limit: 200 }),
        ]);

        if (workspaceRes.status === 'fulfilled' && workspaceRes.value) {
            const ws = workspaceRes.value;
            const company = ws.workspace?.company;
            workspaceName = company?.name ?? ws.workspace?.name ?? workspaceName;
            // Cherry-pick only campaign-relevant fields to avoid leaking sensitive workspace data.
            const ctx: Record<string, unknown> = {};
            if (company?.name) ctx.name = company.name;
            if (company?.industry) ctx.industry = company.industry;
            if (company?.size) ctx.size = company.size;
            if (company?.description) ctx.description = company.description;
            if (company?.website) ctx.website = company.website;
            companyContext = Object.keys(ctx).length > 0 ? JSON.stringify(ctx) : '';
        }

        if (kgRes.status === 'fulfilled' && kgRes.value) {
            const lists: any[] = kgRes.value.lists ?? [];
            kgListCount = lists.length;
            for (const list of lists) {
                kgTotalRows += (list.rowCount ?? list.count ?? 0);
            }
        }

        if (wfRes.status === 'fulfilled' && wfRes.value) {
            existingWorkflowCount = (wfRes.value.workflows ?? []).length;
        }

        ctxSpinner.succeed('Workspace context loaded');

        info(`ICP loaded`);
        info(`${existingWorkflowCount} prior campaigns`);
        info(`${kgTotalRows.toLocaleString()} contacts in KG (${kgListCount} lists)`);

        // ── Phase 2: Plan Campaign ────────────────────────────────────────
        header('Planning campaign...');

        const planSpinner = progress('Thinking...');

        const planPrompt = [
            `Create a campaign based on the following user description:`,
            `<user_description>${description}</user_description>`,
            '',
            `Workspace: ${workspaceName}`,
            companyContext ? `<workspace_context>${companyContext}</workspace_context>` : '',
            kgListCount > 0 ? `Knowledge Graph: ${kgListCount} lists, ${kgTotalRows} rows` : '',
            existingWorkflowCount > 0 ? `Existing workflows: ${existingWorkflowCount}` : '',
            options.schedule ? `Requested schedule: ${options.schedule}` : '',
            '',
            'Return a JSON plan with this exact structure:',
            '{ "campaignName": string, "workflows": [{ "name": string, "goal": string, "steps": [{ "type": string, "description": string, "apps": string[] }] }], "schedule": string | null, "estimatedCredits": number }',
            '',
            'Return ONLY the JSON inside a ```json code fence. No extra prose.',
        ]
            .filter(Boolean)
            .join('\n');

        let chatSession: string | undefined;
        let plan: CampaignPlan | null = null;

        try {
            const planRes = await client.chat(planPrompt);
            chatSession = planRes.sessionId;
            plan = extractJson(planRes.response) as CampaignPlan | null;

            // If the AI didn't return clean JSON, ask once more.
            if (!plan || !Array.isArray(plan.workflows)) {
                const retryRes = await client.chat(
                    'Please respond with ONLY the JSON plan inside a ```json code fence. No other text.',
                    chatSession,
                );
                chatSession = retryRes.sessionId;
                plan = extractJson(retryRes.response) as CampaignPlan | null;
            }
        } catch (err: any) {
            planSpinner.fail('Failed to plan campaign');
            error(err.message ?? String(err));
            process.exitCode = 1;
            return;
        }

        if (!plan || !Array.isArray(plan.workflows) || plan.workflows.length === 0) {
            planSpinner.fail('Could not parse a valid campaign plan from AI response');
            error('The AI did not return a structured plan. Please try again with a more specific description.');
            process.exitCode = 1;
            return;
        }

        planSpinner.succeed(`Planned "${plan.campaignName}" with ${plan.workflows.length} workflow(s)`);

        if (options.verbose) {
            divider();
            for (const wf of plan.workflows) {
                keyValue('Workflow', wf.name);
                keyValue('Goal', wf.goal);
                for (const s of wf.steps) {
                    keyValue(`  ${s.type}`, `${s.description} [${(s.apps ?? []).join(', ')}]`);
                }
            }
            divider();
        }

        // ── Phase 3: Build Workflows ──────────────────────────────────────
        header(`Creating campaign with ${plan.workflows.length} workflow(s)...`);

        const createdWorkflows: Array<{ id: string; name: string; pathname?: string }> = [];
        let totalErrors = 0;

        for (let i = 0; i < plan.workflows.length; i++) {
            const wfPlan = plan.workflows[i];
            const label = `Workflow ${i + 1}: ${wfPlan.name}`;
            const apps = appsLabel(wfPlan);

            step(label);
            if (apps) {
                process.stdout.write(`     ${c.gray}${apps}${c.reset}\n`);
            }

            // ---- Ask the AI to generate the full pipeline JSON ----
            const buildSpinner = progress(`Building ${wfPlan.name}...`);

            let pipeline: Record<string, any> | null = null;

            try {
                const buildPrompt = [
                    `Now generate the full Agentled pipeline JSON for workflow "${wfPlan.name}".`,
                    `Goal: ${wfPlan.goal}`,
                    `Steps outline: ${JSON.stringify(wfPlan.steps)}`,
                    options.schedule ? `Schedule: ${options.schedule}` : '',
                    '',
                    'Return a complete pipeline object (with name, goal, description, status: "draft", steps array, etc.).',
                    'Use valid Agentled step types: trigger, appAction, aiAction, code, milestone.',
                    'Return ONLY the JSON inside a ```json code fence.',
                ].filter(Boolean).join('\n');

                const buildRes = await client.chat(buildPrompt, chatSession);
                chatSession = buildRes.sessionId;
                pipeline = extractJson(buildRes.response) as Record<string, any> | null;

                if (!pipeline || typeof pipeline !== 'object') {
                    // One more attempt.
                    const retryRes = await client.chat(
                        'Please return ONLY the pipeline JSON inside a ```json code fence. No other text.',
                        chatSession,
                    );
                    chatSession = retryRes.sessionId;
                    pipeline = extractJson(retryRes.response) as Record<string, any> | null;
                }
            } catch (err: any) {
                buildSpinner.fail(`Failed to generate pipeline for ${wfPlan.name}`);
                error(err.message ?? String(err));
                totalErrors++;
                continue;
            }

            if (!pipeline || typeof pipeline !== 'object') {
                buildSpinner.fail(`Could not parse pipeline JSON for ${wfPlan.name}`);
                totalErrors++;
                continue;
            }

            buildSpinner.succeed(`Pipeline generated`);

            // ---- Dry-run: just show what would be created ----
            if (options.dryRun) {
                info(`${c.yellow}[dry-run]${c.reset} Would create "${pipeline.name ?? wfPlan.name}"`);
                if (options.verbose) {
                    keyValue('Steps', String((pipeline.steps ?? []).length));
                    keyValue('Pipeline', JSON.stringify(pipeline, null, 2).substring(0, 500));
                }
                continue;
            }

            // ---- Create the workflow ----
            const createSpinner = progress('Creating workflow...');
            let created: any;

            try {
                created = await client.createWorkflow(pipeline);
                createSpinner.succeed('Created');
            } catch (err: any) {
                createSpinner.fail('Failed to create workflow');
                error(err.message ?? String(err));
                totalErrors++;
                continue;
            }

            const workflowId = created.id ?? created.workflow?.id;
            if (!workflowId) {
                error('API returned no workflow ID');
                totalErrors++;
                continue;
            }

            createdWorkflows.push({
                id: workflowId,
                name: created.name ?? pipeline.name ?? wfPlan.name,
                pathname: created.pathname,
            });

            // ---- Validate ----
            const valSpinner = progress('Validating...');
            let validationPassed = false;

            try {
                const valRes = await client.validateWorkflow(workflowId);
                const valErrors: any[] = valRes.errors ?? [];
                const warnings: any[] = valRes.warnings ?? [];

                if (valErrors.length > 0) {
                    valSpinner.fail(`Validation failed (${valErrors.length} error(s))`);
                    for (const e of valErrors) {
                        error(typeof e === 'string' ? e : (e.message ?? JSON.stringify(e)));
                    }
                    totalErrors += valErrors.length;
                } else {
                    validationPassed = true;
                    valSpinner.succeed(`Validated (0 errors${warnings.length > 0 ? `, ${warnings.length} warning(s)` : ''})`);
                    if (warnings.length > 0) {
                        for (const w of warnings) {
                            warn(typeof w === 'string' ? w : (w.message ?? JSON.stringify(w)));
                        }
                    }
                }
            } catch (err: any) {
                valSpinner.fail('Validation request failed');
                error(err.message ?? String(err));
                totalErrors++;
            }

            // ---- Publish (only if validation passed) ----
            if (options.publish && validationPassed) {
                const pubSpinner = progress('Publishing...');
                try {
                    await client.publishWorkflow(workflowId, 'live');
                    pubSpinner.succeed('Published (live)');
                } catch (err: any) {
                    pubSpinner.fail('Failed to publish');
                    error(err.message ?? String(err));
                }
            } else if (options.publish) {
                warn('Skipped publish — workflow has validation errors');
            }
        }

        // ── Phase 4: Summary ──────────────────────────────────────────────
        if (options.dryRun) {
            header('Dry run complete — no workflows were created.');
            return;
        }

        if (createdWorkflows.length === 0) {
            error('No workflows were created. See errors above.');
            process.exitCode = 1;
            return;
        }

        const summaryItems: Array<{ label: string; value: string }> = [
            { label: 'Workflows', value: String(createdWorkflows.length) },
        ];

        if (plan.estimatedCredits) {
            summaryItems.push({ label: 'Credits estimate', value: `~${plan.estimatedCredits}` });
        }

        if (options.schedule ?? plan.schedule) {
            summaryItems.push({ label: 'Schedule', value: options.schedule ?? plan.schedule ?? '' });
        }

        if (options.publish) {
            summaryItems.push({ label: 'Status', value: 'live' });
        } else {
            summaryItems.push({ label: 'Status', value: 'draft' });
        }

        if (totalErrors > 0) {
            summaryItems.push({ label: 'Errors', value: String(totalErrors) });
        }

        writeln('');
        success(`${c.bold}Campaign saved.${c.reset}`);
        summary(summaryItems);

        // Show a link to the workspace.
        const baseUrl = (process.env.AGENTLED_URL || 'https://www.agentled.app').replace(/\/$/, '');
        info(`${c.cyan}\u2192${c.reset} ${baseUrl}/workflows`);
        writeln('');
    } catch (err: any) {
        error(`Unexpected error: ${err.message ?? String(err)}`);
        if (options.verbose && err.stack) {
            process.stderr.write(`\n${c.gray}${err.stack}${c.reset}\n`);
        }
        process.exitCode = 1;
    }
}

