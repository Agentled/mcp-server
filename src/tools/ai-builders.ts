import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const json = (value: unknown) => ({
    content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
});

const providerSchema = z.enum(['codex', 'claude', 'openclaw', 'herms', 'custom']);
const workItemTypeSchema = z.enum(['build_workflow', 'fix_workflow', 'review', 'summarize', 'configure', 'other']);
const workItemStatusSchema = z.enum(['queued', 'claimed', 'in_progress', 'submitted', 'accepted', 'needs_changes', 'closed']);

export function registerAiBuilderTools(server: McpServer, clientFactory: ClientFactory) {
    server.tool(
        'upsert_ai_builder_profile',
        `Create or update the external AI builder profile linked to this authenticated API key.
Clients should call this after receiving a scoped API key; workspaceId and apiKeyId are derived server-side.
Setup cadence for the builder: poll every 4h when idle/no active topic, every 1h when there is an active topic or recent assigned work, every 30m while work is in progress, and opportunistically call list_builder_work_items when already engaging with the user on another topic.`,
        {
            provider: providerSchema.describe('Builder runtime/provider label.'),
            name: z.string().min(1).describe('Display name for this builder identity.'),
            metadata: z.record(z.unknown()).optional().describe('Optional provider hints, contact info, capabilities, and setup state.'),
        },
        async (args, extra) => json(await clientFactory(extra).upsertAiBuilderProfile(args)),
    );

    server.tool(
        'list_builder_work_items',
        'List work items eligible for this authenticated builder. Defaults to queued and needs_changes items assigned to the registered builder/API key when available.',
        {
            status: z.array(workItemStatusSchema).optional().describe('Statuses to include. Defaults to queued and needs_changes.'),
            sourceAgentEntityId: z.string().optional().describe('Optional source business-agent filter.'),
            type: workItemTypeSchema.optional().describe('Optional work item type filter.'),
            limit: z.number().int().min(1).max(100).optional(),
        },
        async (args, extra) => json(await clientFactory(extra).listBuilderWorkItems(args)),
    );

    server.tool(
        'claim_builder_work_item',
        'Claim a queued or needs_changes builder work item for this authenticated builder and append activity.',
        {
            id: z.string().describe('Builder work item ID.'),
            status: z.enum(['claimed', 'in_progress']).optional().describe('Status to set after claiming.'),
            note: z.string().optional().describe('Optional progress note.'),
        },
        async ({ id, ...body }, extra) => json(await clientFactory(extra).claimBuilderWorkItem(id, body)),
    );

    server.tool(
        'append_builder_work_activity',
        'Builder-only activity append. Use this when the authenticated external builder is reporting progress, links, test notes, or questions; the server records the registered builder identity.',
        {
            id: z.string().describe('Builder work item ID.'),
            note: z.string().min(1),
            activityAction: z.string().optional().describe('Machine-readable activity action label.'),
            refs: z.array(z.unknown()).optional().describe('Optional links/artifact refs.'),
        },
        async ({ id, ...body }, extra) => json(await clientFactory(extra).appendBuilderWorkActivity(id, body)),
    );

    server.tool(
        'submit_builder_work_item',
        'Submit completed builder output refs and a summary. The work item moves to submitted for business-agent review.',
        {
            id: z.string().describe('Builder work item ID.'),
            summary: z.string().min(1),
            outputRefs: z.array(z.unknown()).optional(),
            note: z.string().optional(),
            metadata: z.record(z.unknown()).optional(),
        },
        async ({ id, ...body }, extra) => json(await clientFactory(extra).submitBuilderWorkItem(id, body)),
    );

    server.tool(
        'create_builder_work_item',
        'Create a durable work handoff from a business agent to an external AI builder. Use sourceAgentEntityId to preserve the business-agent owner for review/email/UI.',
        {
            sourceAgentEntityId: z.string().min(1),
            title: z.string().min(1),
            brief: z.string().min(1),
            type: workItemTypeSchema.optional(),
            builderId: z.string().optional(),
            contextRefs: z.array(z.unknown()).optional(),
            metadata: z.record(z.unknown()).optional(),
        },
        async (args, extra) => json(await clientFactory(extra).createBuilderWorkItem(args)),
    );

    server.tool(
        'list_builder_work_items_for_agent',
        'List open/stale/submitted builder work items for a business agent by sourceAgentEntityId.',
        {
            sourceAgentEntityId: z.string().min(1),
            status: z.array(workItemStatusSchema).optional(),
            type: workItemTypeSchema.optional(),
            limit: z.number().int().min(1).max(100).optional(),
        },
        async (args, extra) => json(await clientFactory(extra).listBuilderWorkItemsForAgent(args)),
    );

    server.tool(
        'get_builder_work_item',
        'Get full builder work item context, outputs, activity, metadata, and review state.',
        { id: z.string() },
        async ({ id }, extra) => json(await clientFactory(extra).getBuilderWorkItem(id)),
    );

    server.tool(
        'review_builder_work_item',
        'Review submitted builder work as a business agent; set accepted, needs_changes, or closed and optionally attach thumbs-up/down quality signal.',
        {
            id: z.string(),
            verdict: z.enum(['accepted', 'needs_changes', 'closed']),
            note: z.string().min(1),
            sourceAgentEntityId: z.string().optional(),
            businessAgentRating: z.enum(['thumbs_up', 'thumbs_down', 'neutral']).optional(),
            metadata: z.record(z.unknown()).optional(),
        },
        async ({ id, ...body }, extra) => json(await clientFactory(extra).reviewBuilderWorkItem(id, body)),
    );

    server.tool(
        'append_builder_work_item_activity',
        'Business-agent-only activity append. Use this for source-agent follow-up, review, or routing notes; builders should use append_builder_work_activity instead.',
        {
            id: z.string(),
            note: z.string().min(1),
            actorId: z.string().optional(),
            activityAction: z.string().optional(),
            refs: z.array(z.unknown()).optional(),
        },
        async ({ id, ...body }, extra) => json(await clientFactory(extra).appendBuilderWorkItemActivity(id, body)),
    );
}
