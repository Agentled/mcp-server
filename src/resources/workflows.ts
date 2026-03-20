/**
 * MCP Resource — Workspace Workflows
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ClientFactory } from '../server.js';

export function registerWorkflowResources(server: McpServer, clientFactory: ClientFactory) {
    server.resource(
        'workflow-catalog',
        'agentled://workflows',
        {
            description: 'Browse all workflows in the current workspace. Shows id, name, status, and goal for each workflow.',
            mimeType: 'application/json',
        },
        async () => {
            const client = clientFactory({});
            const result = await client.listWorkflows({ limit: 100 });
            return {
                contents: [{
                    uri: 'agentled://workflows',
                    mimeType: 'application/json',
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );
}
