/**
 * Agentled MCP Server setup.
 *
 * Registers all tools and resources.
 * Supports both stdio (single-tenant via env var) and HTTP (multi-tenant via OAuth) modes.
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
import { registerAppResources } from './resources/apps.js';
import { registerWorkflowResources } from './resources/workflows.js';

/**
 * Factory function that creates an AgentledClient per request.
 * In HTTP mode: uses the OAuth Bearer token from authInfo.
 * In stdio mode: falls back to AGENTLED_API_KEY env var.
 */
export type ClientFactory = (extra: { authInfo?: { token?: string } }) => AgentledClient;

function createClientFactory(): ClientFactory {
    // Cache the env-var client for stdio mode (created once)
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

        // Stdio mode: reuse single client from env vars
        // This will throw if AGENTLED_API_KEY is not set, which is expected
        // in HTTP-only mode — the error surfaces only if a tool is called
        // without a Bearer token (which shouldn't happen after OAuth).
        if (!stdioClient) {
            if (!process.env.AGENTLED_API_KEY) {
                throw new Error(
                    'No authentication provided. In HTTP mode, requests must include a Bearer token. ' +
                    'In stdio mode, set AGENTLED_API_KEY environment variable.'
                );
            }
            stdioClient = new AgentledClient();
        }
        return stdioClient;
    };
}

export function createServer(): McpServer {
    const server = new McpServer({
        name: 'agentled',
        version: '0.3.0',
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

    // Register resources
    registerAppResources(server, clientFactory);
    registerWorkflowResources(server, clientFactory);

    return server;
}
