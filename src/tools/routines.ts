/**
 * MCP Tools — Agent Routines
 *
 * CRUD for AgentRoutine rows. Routines are per-agent scheduled tasks with
 * their own clock (nextRunAt). One agent → N routines.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const INTERVAL_VALUES = [
    'weekday-morning',
    'weekday-evening',
    'weekly-monday',
    'weekly-friday-evening',
    'daily',
    '2h',
    '6h',
    '48h',
] as const;

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
            const result = await client.listRoutines(agent_id);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'create_routine',
        `Create a new routine for an agent.

Interval values:
  By schedule: weekday-morning (Mon–Fri 08:00 UTC), weekday-evening (Mon–Fri 18:00 UTC),
               weekly-monday (Mon 08:00 UTC), weekly-friday-evening (Fri 18:00 UTC),
               daily (every day 08:00 UTC)
  By interval: 2h, 6h, 48h

Model format: "provider:modelId" e.g. "anthropic:claude-4-6-sonnet" (default).`,
        {
            agent_id: z.string().describe('Agent slug or ID'),
            name: z.string().describe('Routine name'),
            prompt: z.string().describe('Instructions the agent follows each run'),
            interval: z.enum(INTERVAL_VALUES).describe('Run schedule'),
            model: z.string().optional().describe('Model to use (default: anthropic:claude-4-6-sonnet)'),
            max_steps_per_run: z.number().int().optional().describe('Max tool-use steps per run (default: 20)'),
            max_credits_per_day: z.number().int().optional().describe('Daily credit cap (default: 50)'),
        },
        async ({ agent_id, name, prompt, interval, model, max_steps_per_run, max_credits_per_day }, extra) => {
            const client = clientFactory(extra);
            const result = await client.createRoutine(agent_id, {
                name,
                prompt,
                interval,
                model,
                maxStepsPerRun: max_steps_per_run,
                maxCreditsPerDay: max_credits_per_day,
            });
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
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
            status: z.enum(['active', 'paused']).optional().describe('New status'),
        },
        async ({ routine_id, name, prompt, interval, model, max_steps_per_run, max_credits_per_day, status }, extra) => {
            const client = clientFactory(extra);
            const result = await client.updateRoutine(routine_id, {
                name,
                prompt,
                interval,
                model,
                maxStepsPerRun: max_steps_per_run,
                maxCreditsPerDay: max_credits_per_day,
                status,
            });
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
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
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'resume_routine',
        `Resume a paused routine (status → active). nextRunAt is reset to the next
occurrence of the routine's interval from now.`,
        {
            routine_id: z.string().describe('Routine ID'),
        },
        async ({ routine_id }, extra) => {
            const client = clientFactory(extra);
            const result = await client.resumeRoutine(routine_id);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
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
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );
}
