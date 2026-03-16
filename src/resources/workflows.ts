/**
 * MCP Resource — Workspace Workflows
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AgentledClient } from '../client.js';

export function registerWorkflowResources(server: McpServer, client: AgentledClient) {
    server.resource(
        'workflow-catalog',
        'agentled://workflows',
        {
            description: 'Browse all workflows in the current workspace. Shows id, name, status, and goal for each workflow.',
            mimeType: 'application/json',
        },
        async () => {
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
