/**
 * MCP Tools — Conversational Chat Agent
 *
 * Exposes the AgentLed conversational AI agent as an MCP tool.
 * Users can build workflows through natural language dialogue instead of
 * manually constructing pipeline JSON.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

export function registerChatTools(server: McpServer, clientFactory: ClientFactory) {

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
        async ({ message, session_id }, extra) => {
            const client = clientFactory(extra);
            try {
                const result = await client.chat(message, session_id);

                if (result.error) {
                    return {
                        content: [{
                            type: 'text' as const,
                            text: `Chat error: ${result.error}`,
                        }],
                        isError: true,
                    };
                }

                const text = result.response || JSON.stringify(result, null, 2);
                const sessionId = result.sessionId;
                const turnId = result.turnId;

                return {
                    content: [{
                        type: 'text' as const,
                        text: result.status === 'running' && turnId
                            ? JSON.stringify({
                                status: 'running',
                                sessionId,
                                turnId,
                                instruction: `Call get_chat_turn_result with turn_id "${turnId}". Do not resend the original prompt while this turn is running.`,
                                statusUrl: result.statusUrl,
                                resultUrl: result.resultUrl,
                            }, null, 2)
                            : sessionId
                            ? JSON.stringify({ response: text, sessionId, ...(turnId ? { turnId } : {}) })
                            : text,
                    }],
                };
            } catch (error: any) {
                return {
                    content: [{
                        type: 'text' as const,
                        text: `Chat request failed: ${error?.message || 'Unknown error'}`,
                    }],
                    isError: true,
                };
            }
        }
    );

    server.tool(
        'get_chat_turn_result',
        `Get the status or final result for a durable external chat turn returned by chat or chat_with_agent.

Use this after a chat tool response returns status "running" and a turn_id. Polling this tool is idempotent and does not rerun the original prompt, model call, app actions, approvals, credits, or external sends.`,
        {
            turn_id: z.string().describe('The durable turn ID returned by chat or chat_with_agent.'),
        },
        async ({ turn_id }, extra) => {
            const client = clientFactory(extra);
            try {
                const result = await client.getChatTurnResult(turn_id);
                return {
                    content: [{
                        type: 'text' as const,
                        text: JSON.stringify(result, null, 2),
                    }],
                    isError: result?.status === 'failed' || !!result?.error,
                };
            } catch (error: any) {
                return {
                    content: [{
                        type: 'text' as const,
                        text: `Chat turn result failed: ${error?.message || 'Unknown error'}`,
                    }],
                    isError: true,
                };
            }
        },
    );
}
