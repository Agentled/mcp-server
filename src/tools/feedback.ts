/**
 * MCP Tools — Agent Feedback (Bug Reports, Feature Requests, Escalations)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

export function registerFeedbackTools(server: McpServer, clientFactory: ClientFactory) {

    server.tool(
        'get_feedback',
        'Read the status and latest Agentled response for a submitted feedbackId in the current workspace. A null response means the team has not posted a reply yet.',
        { feedbackId: z.string().min(1).describe('Feedback ID returned by submit_feedback_to_agentled') },
        async ({ feedbackId }, extra) => ({
            content: [{ type: 'text' as const, text: JSON.stringify(await clientFactory(extra).getFeedback(feedbackId), null, 2) }],
        }),
    );

    server.tool(
        'submit_feedback_to_agentled',
        `Report a bug, request a feature, escalate an issue, or ask the Agentled team a question.
Use this when you encounter something broken, have a suggestion for improvement,
need human help from the Agentled team, or want to escalate a problem you cannot solve.
Include a clear title and detailed description. Save the returned feedbackId and use get_feedback to read its status and the latest team response. The team can also reply by email: pass userEmail to choose where;
if omitted, replies go to the email of the account that owns this API key.`,
        {
            type: z.enum(['bug', 'feature_request', 'escalation', 'ask']).describe(
                'Type of report: bug (something broken), feature_request (suggestion), escalation (needs human attention), ask (question for team)'
            ),
            title: z.string().describe('Short summary of the issue or request (max 200 chars)'),
            description: z.string().describe('Detailed description including context, steps to reproduce, or feature details'),
            severity: z.enum(['low', 'medium', 'high', 'critical']).optional().describe(
                'Severity level. critical=blocking, high=major, medium=workaround exists, low=minor'
            ),
            userEmail: z.string().optional().describe('Email the Agentled team should reply to. Defaults to the API key owner\'s email.'),
            source: z.string().optional().describe('Source context (e.g., mcp, chat, workflow)'),
            context: z.record(z.any()).optional().describe('Additional context (workflowId, executionId, etc.)'),
        },
        async ({ type, title, description, severity, userEmail, source, context }, extra) => {
            const client = clientFactory(extra);
            const result = await client.submitFeedback({
                type,
                title,
                description,
                severity,
                userEmail,
                source: source || 'mcp',
                context,
            });
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );
}
