/**
 * MCP Tools — AI Model Discovery
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ClientFactory } from '../server.js';

export function registerModelTools(server: McpServer, clientFactory: ClientFactory) {

    server.tool(
        'list_models',
        `List all supported AI models for workflow steps. Returns model ID, provider, display name,
tier (mini/standard/max), credit cost, and category.

Use the model ID in step.agent.model and the provider in step.agent.provider when configuring AI steps.
Example: agent: { model: "claude-5-opus", provider: "anthropic" }`,
        {},
        async (_args, extra) => {
            const client = clientFactory(extra);
            const result = await client.listModels();
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );
}
