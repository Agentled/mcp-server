/**
 * MCP Resource — App Catalog
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AgentledClient } from '../client.js';

export function registerAppResources(server: McpServer, client: AgentledClient) {
    server.resource(
        'app-catalog',
        'agentled://apps',
        {
            description: 'Browse all available Agentled apps and their actions. Use this to discover integrations for building workflows.',
            mimeType: 'application/json',
        },
        async () => {
            const result = await client.listApps();
            return {
                contents: [{
                    uri: 'agentled://apps',
                    mimeType: 'application/json',
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );
}
