/**
 * Agentled MCP Server setup.
 *
 * Registers all tools and resources.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AgentledClient } from './client.js';
import { registerWorkflowTools } from './tools/workflows.js';
import { registerExecutionTools } from './tools/executions.js';
import { registerAppTools } from './tools/apps.js';
import { registerTestingTools } from './tools/testing.js';
import { registerKnowledgeTools } from './tools/knowledge.js';
import { registerChatTools } from './tools/chat.js';
import { registerAppResources } from './resources/apps.js';
import { registerWorkflowResources } from './resources/workflows.js';

export function createServer(): McpServer {
    const server = new McpServer({
        name: 'agentled',
        version: '0.1.0',
    });

    const client = new AgentledClient();

    // Register tools
    registerWorkflowTools(server, client);
    registerExecutionTools(server, client);
    registerAppTools(server, client);
    registerTestingTools(server, client);
    registerKnowledgeTools(server, client);
    registerChatTools(server, client);

    // Register resources
    registerAppResources(server, client);
    registerWorkflowResources(server, client);

    return server;
}
