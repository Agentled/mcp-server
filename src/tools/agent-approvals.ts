import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { AGENT_APPROVAL_REJECTION_COMMENT_MAX_LENGTH } from '@agentled/core';

export function registerAgentApprovalTools(server: McpServer, clientFactory: ClientFactory) {
    server.tool(
        'reject_agent_approval',
        `Terminally reject one pending AgentApprovalRequest in the current workspace.
Requires the exact approval request ID, a non-empty operator comment, and confirm=true.
This never approves, sends, executes, retries, continues, or invokes a provider. A prior
terminal decision is preserved and cannot be overwritten.`,
        {
            approval_request_id: z.string().trim().min(1).describe('Exact AgentApprovalRequest ID'),
            comment: z.string()
                .trim()
                .min(1)
                .max(AGENT_APPROVAL_REJECTION_COMMENT_MAX_LENGTH)
                .describe(
                    `Operator rationale persisted on the approval audit record (maximum ${AGENT_APPROVAL_REJECTION_COMMENT_MAX_LENGTH} characters)`,
                ),
            confirm: z.literal(true).describe('Explicit confirmation of terminal rejection with no send or continuation'),
        },
        async ({ approval_request_id, comment, confirm }, extra) => {
            const client = clientFactory(extra);
            const result = await client.rejectAgentApproval({
                approvalId: approval_request_id,
                comment,
                confirm,
            });
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        },
    );
}
