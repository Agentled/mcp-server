/**
 * MCP Tools — guarded workspace provisioning.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

export function registerWorkspaceProvisioningTools(server: McpServer, clientFactory: ClientFactory) {
    server.tool(
        'resolve_workspace',
        `Check whether a workspace already exists for a firm, slug, domain, owner email, or idempotency key.

This is read-only. Agents should call this before create_workspace so existing firm workspaces are reused instead of accidentally creating duplicates.`,
        {
            workspaceName: z.string().optional().describe('Workspace display name to look up'),
            requestedSlug: z.string().optional().describe('Preferred workspace slug'),
            ownerEmail: z.string().email().optional().describe('Proposed owner email'),
            clientDomain: z.string().optional().describe('Firm/client domain used for idempotent matching'),
            idempotencyKey: z.string().optional().describe('Stable idempotency key from a prior workspace request'),
        },
        async (input, extra) => {
            const client = clientFactory(extra);
            const result = await client.resolveWorkspace(input);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        },
    );

    server.tool(
        'create_workspace',
        `Create a workspace only when the caller has operator workspace-create scope; otherwise the request is rejected without mutation.

Call resolve_workspace first. This setup primitive does not provision use-case kits, run workflows, insert candidate rows, send messages to customers, write CRM/calendar, call SignalKit receive, trigger routines, or spend provider credits.`,
        {
            workspaceName: z.string().min(1).describe('Workspace display name to create'),
            requestedSlug: z.string().optional().describe('Preferred workspace slug'),
            ownerEmail: z.string().email().optional().describe('Proposed owner email'),
            ownerUserId: z.string().optional().describe('Known owner user id, when already resolved'),
            clientDomain: z.string().optional().describe('Firm/client domain used for idempotent matching'),
            sourceRequestId: z.string().min(1).describe('Source thread, approval, or request id'),
            reason: z.string().min(1).describe('Plain-language reason for the workspace request'),
            billingPlanHint: z.string().optional().describe('Optional billing policy hint, e.g. trial_or_low_fixed_cap'),
            initialAgentTemplate: z.string().optional().describe('Optional initial agent template hint, e.g. vc-analyst'),
            idempotencyKey: z.string().min(1).describe('Stable idempotency key for the workspace request'),
            locale: z.string().optional().describe('Locale used by workspace bootstrap; defaults to en'),
        },
        async (input, extra) => {
            const client = clientFactory(extra);
            const result = await client.createWorkspace(input);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        },
    );
}
