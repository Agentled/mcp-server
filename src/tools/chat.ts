/**
 * MCP Tools — Conversational Chat Agent
 *
 * Exposes the AgentLed conversational AI agent as an MCP tool.
 * Users can build workflows through natural language dialogue instead of
 * manually constructing pipeline JSON.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { AgentledClient } from '../client.js';

export function registerChatTools(server: McpServer, client: AgentledClient) {

    server.tool(
        'chat',
        `Send a message to the AgentLed AI agent and get a response. The agent can reason, plan, and build workflows through natural language conversation — no need to construct pipeline JSON manually.

Use this tool when you want to:
- Build a workflow from a high-level description ("Create a lead enrichment workflow for SaaS companies")
- Get recommendations on how to structure a workflow
- Ask questions about available integrations or capabilities
- Iterate on workflow design through conversation

The agent has access to the same planning tools, workflow builder, and workspace context as the in-app chat.

For multi-turn conversations, pass the session_id returned from the first message to maintain context across messages.

Example: chat("Build me a workflow that takes a LinkedIn company URL, enriches the data, and scores it by ICP fit")`,
        {
            message: z.string().describe('The message to send to the AI agent'),
            session_id: z.string().optional().describe('Session ID for multi-turn conversations. Use the session_id from a previous response to continue the same conversation.'),
        },
        async ({ message, session_id }) => {
            const result = await client.chat(message, session_id);
            return {
                content: [{
                    type: 'text' as const,
                    text: result.response || JSON.stringify(result, null, 2),
                }],
            };
        }
    );
}
