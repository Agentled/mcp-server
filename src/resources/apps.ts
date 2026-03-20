/**
 * MCP Resource — App Catalog
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ClientFactory } from '../server.js';

export function registerAppResources(server: McpServer, clientFactory: ClientFactory) {
    server.resource(
        'app-catalog',
        'agentled://apps',
        {
            description: 'Browse all available Agentled apps and their actions. Use this to discover integrations for building workflows.',
            mimeType: 'application/json',
        },
        async () => {
            const client = clientFactory({});
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
