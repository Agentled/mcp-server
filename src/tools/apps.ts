/**
 * MCP Tools — App Discovery
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

export function registerAppTools(server: McpServer, clientFactory: ClientFactory) {

    server.tool(
        'list_apps',
        `List all available apps/integrations in Agentled. Returns app names, descriptions, and action summaries.
Use this to discover what integrations are available before building a workflow.
Common apps: agentled (LinkedIn enrichment, email finder), hunter (email), web-scraping, affinity-crm, specter, http-request.`,
        {},
        async (_args, extra) => {
            const client = clientFactory(extra);
            const result = await client.listApps();
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'get_app_actions',
        `Get detailed action schemas for a specific app. Returns input parameters, output fields, and credit costs.
Use this to understand exactly what inputs an action needs when building workflow steps.`,
        {
            appId: z.string().describe('The app ID (e.g., "agentled", "hunter", "web-scraping", "affinity-crm")'),
        },
        async ({ appId }, extra) => {
            const client = clientFactory(extra);
            const result = await client.getAppActions(appId);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );
}
