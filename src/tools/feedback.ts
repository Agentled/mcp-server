/**
 * MCP Tools — Agent Feedback (Bug Reports, Feature Requests, Escalations)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

export function registerFeedbackTools(server: McpServer, clientFactory: ClientFactory) {

    server.tool(
        'submit_feedback_to_agentled',
        `Report a bug, request a feature, escalate an issue, or ask the Agentled team a question.
Use this when you encounter something broken, have a suggestion for improvement,
need human help from the Agentled team, or want to escalate a problem you cannot solve.
Include a clear title and detailed description. Provide the user's email if follow-up is needed.`,
        {
            type: z.enum(['bug', 'feature_request', 'escalation', 'ask']).describe(
                'Type of report: bug (something broken), feature_request (suggestion), escalation (needs human attention), ask (question for team)'
            ),
            title: z.string().describe('Short summary of the issue or request (max 200 chars)'),
            description: z.string().describe('Detailed description including context, steps to reproduce, or feature details'),
            severity: z.enum(['low', 'medium', 'high', 'critical']).optional().describe(
                'Severity level. critical=blocking, high=major, medium=workaround exists, low=minor'
            ),
            userEmail: z.string().optional().describe('User email for follow-up'),
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
