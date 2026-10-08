/**
 * MCP Tools — Agent Routines
 *
 * CRUD for AgentRoutine rows. Routines are per-agent scheduled tasks with
 * their own clock (nextRunAt). One agent → N routines.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { DEFAULT_AGENTLED_URL } from '../client.js';

const INTERVAL_VALUES = [
    'weekday-morning',
    'weekday-evening',
    'weekly-monday',
    'weekly-tuesday-evening',
    'weekly-friday-evening',
    'daily',
    'monthly',
    '6h',
    '48h',
] as const;

const TRIGGER_SOURCE_VALUES = ['codex', 'claude', 'ui', 'api', 'mcp'] as const;

type RoutineUrlContext = {
    baseUrl?: string;
    workspaceSlug?: string;
};

function normalizeBaseUrl(baseUrl?: string): string {
    return (baseUrl || DEFAULT_AGENTLED_URL).replace(/\/+$/, '');
}

/**
 * Last-resort guess of the workspace slug from an `agentEntityId` of the form
 * `<agent-slug>@<namespace>`.
 *
 * ⚠️ The `@<namespace>` suffix is the AGENT's namespace, NOT the workspace slug.
 * They coincide for some workspaces (e.g. `revenue-operator@agentled-ops`) but
 * diverge for others (e.g. `content-manager@agentled` lives in workspace
 * `agentled-ops`). Only used when no configured workspace slug is available,
 * because a wrong slug is still better than no link at all.
 */
function inferWorkspaceSlugFromAgent(agentEntityId?: unknown): string | undefined {
    if (typeof agentEntityId === 'string') {
        const atIndex = agentEntityId.lastIndexOf('@');
        if (atIndex >= 0 && atIndex < agentEntityId.length - 1) {
            return agentEntityId.slice(atIndex + 1);
        }
    }
    return undefined;
}

/**
 * The agent's slug is the part BEFORE the `@` in `<agent-slug>@<namespace>`
 * (e.g. `content-manager@agentled` → `content-manager`). The agent Runs
 * route is keyed by this slug, not the full entity id.
 */
function agentSlugFromEntityId(agentEntityId?: string): string | undefined {
    if (!agentEntityId) return undefined;
    const atIndex = agentEntityId.indexOf('@');
    const slug = atIndex > 0 ? agentEntityId.slice(0, atIndex) : agentEntityId;
    return slug || undefined;
}

/**
 * Build the canonical per-agent Runs URL, optionally linking to one durable run.
 */
function buildAgentRunsUrl(params: {
    baseUrl?: string;
    workspaceSlug?: string;
    agentEntityId?: string;
    routineRunId?: string;
}): string | undefined {
    if (!params.workspaceSlug) return undefined;
    const agentSlug = agentSlugFromEntityId(params.agentEntityId);
    if (!agentSlug) return undefined;

    const base = `${normalizeBaseUrl(params.baseUrl)}/en/${encodeURIComponent(params.workspaceSlug)}/agents/${encodeURIComponent(agentSlug)}/runs`;

    if (params.routineRunId) {
        return `${base}/${encodeURIComponent(params.routineRunId)}`;
    }
    return base;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function objectValue(value: unknown): Record<string, unknown> {
    return isRecord(value) ? value : {};
}

function withoutLegacyActivityUrl(value: unknown): Record<string, unknown> {
    return Object.fromEntries(Object.entries(objectValue(value)).filter(([key]) => key !== 'activity'));
}

function decorateRoutineWithUrls<T extends Record<string, unknown>>(routine: T, context: RoutineUrlContext): T {
    const routineId = typeof routine.id === 'string' ? routine.id : typeof routine.routineId === 'string' ? routine.routineId : undefined;
    if (!routineId) return { ...routine };

    const agentEntityId = typeof routine.agentEntityId === 'string' ? routine.agentEntityId : undefined;
    // Prefer the configured workspace slug (AGENTLED_WORKSPACE); only fall back to
    // the agent-namespace guess when none is configured. The `@<namespace>` suffix
    // is NOT a reliable workspace slug — see inferWorkspaceSlugFromAgent.
    const workspaceSlug = context.workspaceSlug || inferWorkspaceSlugFromAgent(agentEntityId);
    const latestRun = objectValue(routine.latestRun);
    const latestRunId = typeof latestRun.id === 'string' ? latestRun.id : undefined;
    const runsUrl = buildAgentRunsUrl({
        baseUrl: context.baseUrl,
        workspaceSlug,
        agentEntityId,
    });
    const acceptedRunId = typeof routine.runId === 'string' ? routine.runId : undefined;

    const decorated: Record<string, unknown> = { ...routine };
    if (runsUrl) {
        decorated.urls = {
            ...withoutLegacyActivityUrl(routine.urls),
            runs: runsUrl,
        };
    }

    if (acceptedRunId) {
        const acceptedRunDetailUrl = buildAgentRunsUrl({
            baseUrl: context.baseUrl,
            workspaceSlug,
            agentEntityId,
            routineRunId: acceptedRunId,
        });
        if (acceptedRunDetailUrl) {
            decorated.urls = {
                ...withoutLegacyActivityUrl(decorated.urls),
                detail: acceptedRunDetailUrl,
            };
        }
    }

    if (latestRunId) {
        const latestRunDetailUrl = buildAgentRunsUrl({
            baseUrl: context.baseUrl,
            workspaceSlug,
            agentEntityId,
            routineRunId: latestRunId,
        });
        decorated.latestRun = latestRunDetailUrl
            ? { ...latestRun, urls: { ...withoutLegacyActivityUrl(latestRun.urls), detail: latestRunDetailUrl } }
            : { ...latestRun };
    }

    if (Array.isArray(routine.runLog)) {
        decorated.runLog = routine.runLog.map((run: unknown) => {
            if (!isRecord(run)) return run;
            const routineRunId = typeof run.id === 'string' ? run.id : undefined;
            const runDetailUrl = routineRunId
                ? buildAgentRunsUrl({
                    baseUrl: context.baseUrl,
                    workspaceSlug,
                    agentEntityId,
                    routineRunId,
                })
                : undefined;

            return runDetailUrl
                ? { ...run, urls: { ...withoutLegacyActivityUrl(run.urls), detail: runDetailUrl } }
                : { ...run };
        });
    }

    return decorated as T;
}

export function decorateRoutineResponseWithUrls<T>(response: T, context: RoutineUrlContext = {}): T {
    if (!response || typeof response !== 'object') return response;

    const value = response as Record<string, unknown>;
    if (isRecord(value.run)) {
        const run = value.run;
        const agentEntityId = typeof run.agentEntityId === 'string' ? run.agentEntityId : undefined;
        const workspaceSlug = context.workspaceSlug || inferWorkspaceSlugFromAgent(agentEntityId);
        const runId = typeof run.id === 'string' ? run.id : undefined;
        const detailUrl = runId
            ? buildAgentRunsUrl({
                baseUrl: context.baseUrl,
                workspaceSlug,
                agentEntityId,
                routineRunId: runId,
            })
            : undefined;
        return {
            ...value,
            run: detailUrl
                ? { ...run, urls: { ...withoutLegacyActivityUrl(run.urls), detail: detailUrl } }
                : { ...run },
        } as T;
    }

    if (Array.isArray(value.routines)) {
        return {
            ...value,
            routines: value.routines.map((routine: unknown) =>
                isRecord(routine)
                    ? decorateRoutineWithUrls(routine, context)
                    : routine
            ),
        } as T;
    }

    if (typeof value.id === 'string' || typeof value.routineId === 'string') {
        return decorateRoutineWithUrls(value, context) as T;
    }

    return { ...value } as T;
}

function routineUrlContext(extra?: { workspaceSlug?: string }): RoutineUrlContext {
    return {
        baseUrl: process.env.AGENTLED_URL || DEFAULT_AGENTLED_URL,
        workspaceSlug: extra?.workspaceSlug || process.env.AGENTLED_WORKSPACE,
    };
}

export function registerRoutineTools(server: McpServer, clientFactory: ClientFactory) {

    server.tool(
        'list_routines',
        `List all routines for an agent. Routines are scheduled tasks that run
automatically on a fixed interval (e.g. daily, weekday-morning).

Pass the agent's slug (e.g. "dealflow") or ID as \`agent_id\`.`,
        {
            agent_id: z.string().describe('Agent slug or ID'),
        },
        async ({ agent_id }, extra) => {
            const client = clientFactory(extra);
            const result = await client.listRoutines(agent_id, { includeLatestRun: true });
            const decorated = decorateRoutineResponseWithUrls(result, routineUrlContext());
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(decorated, null, 2),
                }],
            };
        }
    );

    server.tool(
        'create_routine',
        `Create a new routine for an agent. Routines are paid autonomous features; free-tier workspaces cannot create or resume them.

Interval values:
  By schedule: weekday-morning (Mon–Fri 08:00 UTC), weekday-evening (Mon–Fri 18:00 UTC),
               weekly-monday (Mon 08:00 UTC), weekly-tuesday-evening (Tue 18:00 UTC),
               weekly-friday-evening (Fri 18:00 UTC),
               daily (every day 08:00 UTC), monthly (1st of month 08:00 UTC)
  By interval: 6h, 48h

Model format: "provider:modelId" e.g. "openai:gpt-5.4-mini" (default).
Use skillIds from list_agent_skills for routine-level skill overrides. Use list_agent_skills({ includeRuntime: true }) for advanced routine runtime bundles such as routine-core.`,
        {
            agent_id: z.string().describe('Agent slug or ID'),
            name: z.string().describe('Routine name'),
            prompt: z.string().describe('Instructions the agent follows each run'),
            interval: z.enum(INTERVAL_VALUES).describe('Run schedule'),
            model: z.string().optional().describe('Model to use (default: openai:gpt-5.4-mini)'),
            max_steps_per_run: z.number().int().optional().describe('Max tool-use steps per run (default: 20)'),
            max_credits_per_day: z.number().int().optional().describe('Daily credit cap (default: 50)'),
            skillIds: z.array(z.string()).optional().describe('Routine-level skill IDs. Overrides the parent agent skills for this routine. Use list_agent_skills({ includeRuntime: true }) for advanced bundles such as routine-core.'),
        },
        async ({ agent_id, name, prompt, interval, model, max_steps_per_run, max_credits_per_day, skillIds }, extra) => {
            const client = clientFactory(extra);
            const result = await client.createRoutine(agent_id, {
                name,
                prompt,
                interval,
                model,
                maxStepsPerRun: max_steps_per_run,
                maxCreditsPerDay: max_credits_per_day,
                skillIds,
            });
            const decorated = decorateRoutineResponseWithUrls(result, routineUrlContext());
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(decorated, null, 2),
                }],
            };
        }
    );

    server.tool(
        'update_routine',
        `Update a routine's fields. Only provided fields are changed.
If interval is updated, nextRunAt is automatically recalculated.`,
        {
            routine_id: z.string().describe('Routine ID'),
            name: z.string().optional().describe('New name'),
            prompt: z.string().optional().describe('New prompt / instructions'),
            interval: z.enum(INTERVAL_VALUES).optional().describe('New schedule interval'),
            model: z.string().optional().describe('New model'),
            max_steps_per_run: z.number().int().optional().describe('Max steps per run'),
            max_credits_per_day: z.number().int().optional().describe('Daily credit cap'),
            skillIds: z.array(z.string()).optional().describe('Routine-level skill IDs. Overrides the parent agent skills for this routine. Use list_agent_skills({ includeRuntime: true }) for advanced bundles such as routine-core.'),
            status: z.enum(['active', 'paused']).optional().describe('New status'),
        },
        async ({ routine_id, name, prompt, interval, model, max_steps_per_run, max_credits_per_day, skillIds, status }, extra) => {
            const client = clientFactory(extra);
            const result = await client.updateRoutine(routine_id, {
                name,
                prompt,
                interval,
                model,
                maxStepsPerRun: max_steps_per_run,
                maxCreditsPerDay: max_credits_per_day,
                skillIds,
                status,
            });
            const decorated = decorateRoutineResponseWithUrls(result, routineUrlContext());
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(decorated, null, 2),
                }],
            };
        }
    );

    server.tool(
        'pause_routine',
        `Pause a routine (status → paused). The routine will not run until resumed.`,
        {
            routine_id: z.string().describe('Routine ID'),
        },
        async ({ routine_id }, extra) => {
            const client = clientFactory(extra);
            const result = await client.pauseRoutine(routine_id);
            const decorated = decorateRoutineResponseWithUrls(result, routineUrlContext());
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(decorated, null, 2),
                }],
            };
        }
    );

    server.tool(
        'resume_routine',
        `Resume a paused routine (status → active). Routines are paid autonomous features; free-tier workspaces cannot resume them. nextRunAt is reset to the next
occurrence of the routine's interval from now.`,
        {
            routine_id: z.string().describe('Routine ID'),
        },
        async ({ routine_id }, extra) => {
            const client = clientFactory(extra);
            const result = await client.resumeRoutine(routine_id);
            const decorated = decorateRoutineResponseWithUrls(result, routineUrlContext());
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(decorated, null, 2),
                }],
            };
        }
    );

    server.tool(
        'trigger_routine',
        `Run a routine immediately without changing its scheduled cadence. Free-tier workspaces cannot trigger routines.

Use a short reason, for example "verify analytics monitor". Source must be one
of: codex, claude, ui, api, mcp.`,
        {
            routine_id: z.string().describe('Routine ID'),
            source: z.enum(TRIGGER_SOURCE_VALUES).describe('Manual trigger source tag'),
            reason: z.string().min(1).max(120).describe('Short reason for the manual run'),
        },
        async ({ routine_id, source, reason }, extra) => {
            const client = clientFactory(extra);
            const result = await client.triggerRoutine(routine_id, { source, reason });
            const decorated = decorateRoutineResponseWithUrls(result, routineUrlContext());
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(decorated, null, 2),
                }],
            };
        }
    );

    server.tool(
        'get_routine_run',
        `Read one exact durable routine run and a bounded page of its ordered events.
This is read-only and does not run, retry, resume, pause, approve, or send anything.`,
        {
            routine_id: z.string().describe('Routine ID'),
            run_id: z.string().describe('Durable routine run ID returned by trigger_routine'),
            limit: z.number().int().min(1).max(200).optional().describe('Maximum events to return (default 100, maximum 200)'),
            next_token: z.string().optional().describe('Opaque event pagination token'),
        },
        async ({ routine_id, run_id, limit, next_token }, extra) => {
            const client = clientFactory(extra);
            const result = await client.getRoutineRun(routine_id, run_id, {
                limit,
                nextToken: next_token,
            });
            const decorated = decorateRoutineResponseWithUrls(result, routineUrlContext());
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(decorated, null, 2),
                }],
            };
        }
    );

    server.tool(
        'delete_routine',
        `Permanently delete a routine. This cannot be undone.`,
        {
            routine_id: z.string().describe('Routine ID'),
        },
        async ({ routine_id }, extra) => {
            const client = clientFactory(extra);
            const result = await client.deleteRoutine(routine_id);
            const decorated = decorateRoutineResponseWithUrls(result, routineUrlContext());
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(decorated, null, 2),
                }],
            };
        }
    );
}
