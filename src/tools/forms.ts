/**
 * MCP Tools — Workflow public form links
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const formLinkOptionsSchema = {
    enabled: z.boolean().optional().describe('Whether the public form link is enabled. Defaults to true on create.'),
    expiresAt: z.string().nullable().optional().describe('Optional ISO datetime after which the form link expires.'),
    submissionLimit: z.number().int().positive().nullable().optional().describe('Optional max number of submissions.'),
    autoShare: z.boolean().optional().describe('Whether to show generated results inline after completion.'),
    shareExpiresInDays: z.number().int().positive().nullable().optional().describe('Optional number of days before inline result shares expire.'),
    successMessage: z.string().nullable().optional().describe('Optional thank-you message shown after submission.'),
};

export function registerFormTools(server: McpServer, clientFactory: ClientFactory) {
    server.tool(
        'list_public_form_links',
        'List public form links for a workflow. Public URLs use /en/forms/{formLinkId}.',
        {
            workflowId: z.string().describe('The workflow ID'),
        },
        async ({ workflowId }, extra) => {
            const client = clientFactory(extra);
            const result = await client.listPublicFormLinks(workflowId);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'create_public_form_link',
        'Create and enable a public form link for a workflow so anyone can submit the workflow input form without an account.',
        {
            workflowId: z.string().describe('The workflow ID'),
            ...formLinkOptionsSchema,
        },
        async ({ workflowId, ...options }, extra) => {
            const client = clientFactory(extra);
            const result = await client.createPublicFormLink(workflowId, options);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'update_public_form_link',
        'Update a workflow public form link, including enabling/disabling it, limits, auto-share, expiry, and success message.',
        {
            workflowId: z.string().describe('The workflow ID'),
            formLinkId: z.string().describe('The public form link ID'),
            ...formLinkOptionsSchema,
        },
        async ({ workflowId, formLinkId, ...updates }, extra) => {
            const client = clientFactory(extra);
            const result = await client.updatePublicFormLink(workflowId, formLinkId, updates);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'get_public_form_link',
        'Get one public form link by token/id.',
        { formToken: z.string().describe('The form token / link id') },
        async ({ formToken }, extra) => {
            const client = clientFactory(extra);
            const result = await client.getPublicFormLink(formToken);
            return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        }
    );

    server.tool(
        'delete_public_form_link',
        'Delete a public form link by token/id. Currently unsupported by External API (returns 501).',
        { formToken: z.string().describe('The form token / link id') },
        async ({ formToken }, extra) => {
            const client = clientFactory(extra);
            const result = await client.deletePublicFormLink(formToken);
            return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        }
    );

    server.tool(
        'share_execution',
        'Create or get a share URL for an execution.',
        {
            executionId: z.string(),
            expiresAt: z.string().nullable().optional(),
            expiresInDays: z.number().int().positive().optional(),
            outputSteps: z.array(z.string()).optional(),
        },
        async ({ executionId, expiresAt, expiresInDays, outputSteps }, extra) => {
            const client = clientFactory(extra);
            const result = await client.shareExecution(executionId, { expiresAt, expiresInDays, outputSteps });
            return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        }
    );
    server.tool('get_share', 'Get share metadata by share id.', { shareId: z.string() }, async ({ shareId }, extra) => {
        const client = clientFactory(extra);
        const result = await client.getShare(shareId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    });
    server.tool('revoke_share', 'Revoke/delete share by share id.', { shareId: z.string() }, async ({ shareId }, extra) => {
        const client = clientFactory(extra);
        const result = await client.revokeShare(shareId);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
    });
}
