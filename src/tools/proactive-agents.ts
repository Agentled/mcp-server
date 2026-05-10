/**
 * MCP Tools — Proactive Agents
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

export function registerProactiveAgentTools(server: McpServer, clientFactory: ClientFactory) {

    server.tool(
        'list_proactive_agents',
        `List all proactive agents in the workspace. Proactive agents are always-on monitors
that watch for conditions and autonomously trigger workflow executions.`,
        {
            status: z.enum(['active', 'paused', 'error']).optional().describe('Filter by status'),
        },
        async ({ status }, extra) => {
            const client = clientFactory(extra);
            const result = await client.listProactiveAgents({ status });
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'get_proactive_agent',
        `Get full details of a proactive agent including its config, monitors, actions, and recent action log.`,
        {
            id: z.string().describe('Agent ID'),
        },
        async ({ id }, extra) => {
            const client = clientFactory(extra);
            const result = await client.getProactiveAgent(id);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'create_proactive_agent',
        `Create a new proactive agent. Agents monitor conditions and trigger workflow executions.

Config structure:
- monitorInterval: How often to check (e.g., '5m', '1h', '24h')
- evaluation: { mode: 'rules' } or { mode: 'ai', modelTier: 'mini', maxCreditsPerDay: 50 }
- monitors: Array of monitor configs (kg_list, memory, execution_history, external_api)
- actions: Array of action configs (start_workflow, store_memory, notify)
- cooldownMs: Min ms between same action (default: 300000)
- maxActionsPerDay: Daily action limit (default: 10)`,
        {
            name: z.string().describe('Agent name'),
            description: z.string().optional().describe('Agent description'),
            config: z.any().describe('ProactiveAgentConfig object'),
        },
        async ({ name, description, config }, extra) => {
            const client = clientFactory(extra);
            const result = await client.createProactiveAgent({ name, description, config });
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'update_proactive_agent',
        `Update a proactive agent's name, description, or config.`,
        {
            id: z.string().describe('Agent ID'),
            name: z.string().optional().describe('New name'),
            description: z.string().optional().describe('New description'),
            config: z.any().optional().describe('Updated ProactiveAgentConfig'),
        },
        async ({ id, name, description, config }, extra) => {
            const client = clientFactory(extra);
            const result = await client.updateProactiveAgent(id, { name, description, config });
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'delete_proactive_agent',
        `Permanently delete a proactive agent.`,
        {
            id: z.string().describe('Agent ID'),
        },
        async ({ id }, extra) => {
            const client = clientFactory(extra);
            const result = await client.deleteProactiveAgent(id);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'pause_proactive_agent',
        `Pause a proactive agent. It will stop monitoring until resumed.`,
        {
            id: z.string().describe('Agent ID'),
        },
        async ({ id }, extra) => {
            const client = clientFactory(extra);
            const result = await client.pauseProactiveAgent(id);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'resume_proactive_agent',
        `Resume a paused proactive agent.`,
        {
            id: z.string().describe('Agent ID'),
        },
        async ({ id }, extra) => {
            const client = clientFactory(extra);
            const result = await client.resumeProactiveAgent(id);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );
}
