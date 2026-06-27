/**
 * Agentled MCP Server setup.
 *
 * Registers all tools and resources.
 * Supports both stdio (active saved workspace / env var) and HTTP (multi-tenant via OAuth) modes.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { AgentledClient } from './client.js';
import { registerWorkflowTools } from './tools/workflows.js';
import { registerExecutionTools } from './tools/executions.js';
import { registerAppTools } from './tools/apps.js';
import { registerTestingTools } from './tools/testing.js';
import { registerKnowledgeTools } from './tools/knowledge.js';
import { registerChatTools } from './tools/chat.js';
import { registerBrandingTools } from './tools/branding.js';
import { registerChannelTools } from './tools/channels.js';
import { registerIntentTools } from './tools/intent.js';
import { registerModelTools } from './tools/models.js';
import { registerAgentTools } from './tools/agents.js';
import { registerFeedbackTools } from './tools/feedback.js';
import { registerMemoryTools } from './tools/memory.js';
import { registerRoutineTools } from './tools/routines.js';
import { registerFormTools } from './tools/forms.js';
import { registerAgentSkillTools } from './tools/agent-skills.js';
import { registerAiBuilderTools } from './tools/ai-builders.js';
import { registerUseCaseTools } from './tools/use-cases.js';
import { registerAppResources } from './resources/apps.js';
import { registerWorkflowResources } from './resources/workflows.js';

/**
 * Factory function that creates an AgentledClient per request.
 * In HTTP mode: uses the OAuth Bearer token from authInfo.
 * In stdio mode: uses AGENTLED_API_KEY or the active workspace from ~/.agentled/config.json.
 */
export type ClientFactory = (extra: { authInfo?: { token?: string } }) => AgentledClient;

function createClientFactory(): ClientFactory {
    // Cache the stdio client for the current process. Restart/reconnect the MCP
    // server after `agentled auth use` or `agentled auth login` changes the
    // active workspace.
    let stdioClient: AgentledClient | null = null;

    return (extra) => {
        const token = extra?.authInfo?.token;
        if (token) {
            // HTTP/OAuth mode: create per-request client with Bearer token
            return new AgentledClient({
                bearerToken: token,
                baseUrl: process.env.AGENTLED_URL,
            });
        }

        // Stdio mode: reuse a client resolved from env vars or the active
        // ~/.agentled workspace profile. This throws only if a tool is called
        // without any configured auth.
        if (!stdioClient) {
            stdioClient = new AgentledClient();
        }
        return stdioClient;
    };
}

export function createServer(): McpServer {
    const server = new McpServer({
        name: 'agentled',
        version: '0.6.0',
        icons: [
            {
                src: 'https://www.agentled.app/images/logos/icon-180.png',
                mimeType: 'image/png',
                sizes: ['180x180'],
            },
        ],
    });

    const clientFactory = createClientFactory();

    // Register tools
    registerWorkflowTools(server, clientFactory);
    registerExecutionTools(server, clientFactory);
    registerAppTools(server, clientFactory);
    registerTestingTools(server, clientFactory);
    registerKnowledgeTools(server, clientFactory);
    registerChatTools(server, clientFactory);
    registerBrandingTools(server, clientFactory);
    registerChannelTools(server, clientFactory);
    registerIntentTools(server, clientFactory);
    registerModelTools(server, clientFactory);
    registerAgentTools(server, clientFactory);
    registerFeedbackTools(server, clientFactory);
    registerMemoryTools(server, clientFactory);
    registerRoutineTools(server, clientFactory);
    registerFormTools(server, clientFactory);
    registerAgentSkillTools(server, clientFactory);
    registerAiBuilderTools(server, clientFactory);
    registerUseCaseTools(server, clientFactory);

    // Register resources
    registerAppResources(server, clientFactory);
    registerWorkflowResources(server, clientFactory);

    return server;
}
