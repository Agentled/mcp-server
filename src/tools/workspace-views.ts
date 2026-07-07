/**
 * MCP Tools — Workspace Views
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const viewStatus = z.enum(['draft', 'active', 'paused', 'archived']);
const viewSource = z.enum(['agent', 'user', 'system', 'template', 'imported']);
const viewType = z.enum(['dashboard', 'list', 'funnel', 'approval_queue', 'report', 'custom']);
const dataSourceKind = z.enum([
    'kg.list',
    'kg.text',
    'workflow.executions',
    'workflow.output_page',
    'workflow.timeline',
    'approvals.pending',
    'agent.approvals',
    'actions.queue',
    'routine.runs',
    'external.api',
    'custom',
]);
const actionKind = z.enum([
    'open_url',
    'navigate',
    'kg.update_rows',
    'kg.upsert_rows',
    'workflow.start',
    'workflow.open',
    'approval.request',
    'approval.decide',
    'app.action',
    'custom',
]);

const dataSourceShape = z.object({
    id: z.string().min(1).describe('Stable source id used by layout/transforms, e.g. "followups"'),
    kind: dataSourceKind.describe('Source kind. KG is supported but not required; views can use workflows, approvals, agents, routines, app queues, external APIs, or custom sources.'),
    label: z.string().optional().describe('Human-readable source label'),
    required: z.boolean().optional().describe('Whether the view is incomplete when this source is missing'),
    listKey: z.string().optional().describe('Knowledge list key when kind is kg.list'),
    textKey: z.string().optional().describe('Knowledge text key when kind is kg.text'),
    workflowId: z.string().optional().describe('Workflow id for workflow-backed sources'),
    outputPagePathname: z.string().optional().describe('Output page pathname for workflow.output_page sources'),
    executionId: z.string().optional().describe('Optional execution id for execution-specific sources'),
    timelineId: z.string().optional().describe('Optional timeline id for timeline-specific sources'),
    approvalSource: z.enum(['workflow', 'agent', 'any']).optional().describe('Approval source for approval-backed views'),
    agentId: z.string().optional().describe('Agent id for agent-backed sources'),
    routineId: z.string().optional().describe('Routine id for routine-backed sources'),
    appId: z.string().optional().describe('App id for app/action-backed sources'),
    actionId: z.string().optional().describe('Action id for app/action-backed sources'),
    url: z.string().optional().describe('External API URL for external.api or custom sources'),
    dataPath: z.string().optional().describe('Path in the source response to bind into the view data object'),
    status: z.string().optional().describe('Optional source-specific status filter'),
    limit: z.number().int().positive().max(1000).optional().describe('Optional source-specific row limit'),
    config: z.record(z.unknown()).optional().describe('Source-specific config'),
});

const actionShape = z.object({
    id: z.string().min(1).describe('Stable action id'),
    kind: actionKind.describe('Action kind. Writes/sends/destructive operations still require normal approval gates.'),
    label: z.string().min(1).describe('Button/menu label'),
    dataSourceId: z.string().optional().describe('Source id whose row data feeds this action'),
    targetPath: z.string().optional().describe('Path in the selected row/source to use as the action target'),
    urlPath: z.string().optional().describe('Path in row data for open_url actions'),
    workflowId: z.string().optional().describe('Workflow id for workflow actions'),
    appId: z.string().optional().describe('App id for app.action actions'),
    actionId: z.string().optional().describe('Action id for app.action actions'),
    approvalRequired: z.boolean().optional().describe('Set true for writes, sends, approvals, provider actions, and other side effects'),
    destructive: z.boolean().optional().describe('Set true for delete/archive/destructive actions'),
    config: z.record(z.unknown()).optional().describe('Action-specific config'),
});

const mutationShape = {
    name: z.string().min(1).optional().describe('View display name'),
    description: z.string().nullable().optional().describe('View description; null clears it on update'),
    status: viewStatus.optional().describe('Lifecycle status'),
    source: viewSource.optional().describe('How this view was created'),
    viewType: viewType.nullable().optional().describe('View type; null clears it on update'),
    iconName: z.string().nullable().optional().describe('Lucide icon name; null clears it on update'),
    ownerUserId: z.string().nullable().optional().describe('Owner user id; null clears it on update'),
    collaboratorUserIds: z.array(z.string()).optional().describe('Collaborator user ids'),
    useCaseIds: z.array(z.string()).optional().describe('Linked WorkspaceUseCase ids'),
    workflowIds: z.array(z.string()).optional().describe('Linked workflow ids'),
    executionIds: z.array(z.string()).optional().describe('Linked execution ids'),
    approvalIds: z.array(z.string()).optional().describe('Linked approval ids'),
    agentIds: z.array(z.string()).optional().describe('Linked agent ids'),
    routineIds: z.array(z.string()).optional().describe('Linked routine ids'),
    knowledgeTextKeys: z.array(z.string()).optional().describe('Linked KG text keys'),
    knowledgeListKeys: z.array(z.string()).optional().describe('Linked KG list keys'),
    dataSourceIds: z.array(z.string()).optional().describe('Linked data source ids'),
    externalSourceIds: z.array(z.string()).optional().describe('Linked external source ids'),
    dataSources: z.array(dataSourceShape).optional().describe('Data source manifest. Required on create.'),
    filters: z.record(z.unknown()).nullable().optional().describe('Filter manifest; null clears it on update'),
    transforms: z.record(z.unknown()).nullable().optional().describe('Transform manifest; null clears it on update'),
    layout: z.record(z.unknown()).optional().describe('ConfigLayout-compatible renderer manifest. Required on create.'),
    actions: z.array(actionShape).nullable().optional().describe('View action manifest; null clears it on update'),
    refreshPolicy: z.record(z.unknown()).nullable().optional().describe('Refresh policy; null clears it on update'),
    config: z.record(z.unknown()).nullable().optional().describe('Additional config; null clears it on update'),
    validation: z.record(z.unknown()).nullable().optional().describe('Validation metadata; null clears it on update'),
    metadata: z.record(z.unknown()).nullable().optional().describe('Additional metadata; null clears it on update'),
    pinned: z.boolean().optional().describe('Whether this view should be treated as a workspace-level operating surface'),
};

export function registerWorkspaceViewTools(server: McpServer, clientFactory: ClientFactory) {
    server.tool(
        'list_workspace_views',
        `List saved workspace views and their source/action guidance.

Use this before designing a new view so you can reuse or update an existing operating surface. This is read-only and does not run workflows, read provider data, mutate KG rows, make approval decisions, or spend credits.`,
        {
            status: viewStatus.optional().describe('Optional lifecycle status filter'),
            limit: z.number().int().positive().max(500).optional().describe('Maximum views to return'),
        },
        async ({ status, limit }, extra) => {
            const client = clientFactory(extra);
            const result = await client.listWorkspaceViews({ status, limit });
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        },
    );

    server.tool(
        'create_workspace_view',
        `Create a saved WorkspaceView manifest over live workspace data.

Workspace Views are general operating surfaces, not KG-only reports. Data sources can include KG lists/text, workflow executions/output pages/timelines, pending approvals, agent approvals, action queues, routine runs, external APIs, and custom sources. Creating the view writes only the manifest; it does not read sources, run workflows, insert KG rows, send messages, call providers, make approval decisions, or spend credits.`,
        {
            key: z.string().optional().describe('Stable workspace-local key, e.g. linkedin-operating-view'),
            workspaceSlug: z.string().optional().describe('Optional workspace slug for readable ids when known'),
            name: z.string().min(1).describe('View display name'),
            description: z.string().optional().describe('View description'),
            status: viewStatus.optional().describe('Lifecycle status; defaults to draft'),
            source: viewSource.optional().describe('How this view was created; defaults to agent'),
            viewType: viewType.optional().describe('View type'),
            iconName: z.string().optional().describe('Lucide icon name'),
            ownerUserId: z.string().optional().describe('Owner user id'),
            collaboratorUserIds: z.array(z.string()).optional().describe('Collaborator user ids'),
            useCaseIds: z.array(z.string()).optional().describe('Linked WorkspaceUseCase ids'),
            workflowIds: z.array(z.string()).optional().describe('Linked workflow ids'),
            executionIds: z.array(z.string()).optional().describe('Linked execution ids'),
            approvalIds: z.array(z.string()).optional().describe('Linked approval ids'),
            agentIds: z.array(z.string()).optional().describe('Linked agent ids'),
            routineIds: z.array(z.string()).optional().describe('Linked routine ids'),
            knowledgeTextKeys: z.array(z.string()).optional().describe('Linked KG text keys'),
            knowledgeListKeys: z.array(z.string()).optional().describe('Linked KG list keys'),
            dataSourceIds: z.array(z.string()).optional().describe('Linked data source ids'),
            externalSourceIds: z.array(z.string()).optional().describe('Linked external source ids'),
            dataSources: z.array(dataSourceShape).describe('Data source manifest'),
            filters: z.record(z.unknown()).optional().describe('Filter manifest'),
            transforms: z.record(z.unknown()).optional().describe('Transform manifest'),
            layout: z.record(z.unknown()).describe('ConfigLayout-compatible renderer manifest'),
            actions: z.array(actionShape).optional().describe('View action manifest'),
            refreshPolicy: z.record(z.unknown()).optional().describe('Refresh policy'),
            config: z.record(z.unknown()).optional().describe('Additional config'),
            validation: z.record(z.unknown()).optional().describe('Validation metadata'),
            metadata: z.record(z.unknown()).optional().describe('Additional metadata'),
            pinned: z.boolean().optional().describe('Whether this view is a workspace-level operating surface'),
        },
        async (input, extra) => {
            const client = clientFactory(extra);
            const result = await client.createWorkspaceView(input);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        },
    );

    server.tool(
        'get_workspace_view',
        `Get one saved WorkspaceView by stored id or key.

Read agentGuidance before rendering or acting from the view. View reads are safe; action execution must still use the normal approval and side-effect policies.`,
        {
            id: z.string().min(1).describe('WorkspaceView id or key'),
        },
        async ({ id }, extra) => {
            const client = clientFactory(extra);
            const result = await client.getWorkspaceView(id);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        },
    );

    server.tool(
        'update_workspace_view',
        `Update a saved WorkspaceView by id or key.

This updates only the view manifest. It does not mutate source rows, execute view actions, start workflows, make approval decisions, call providers, or spend credits.`,
        {
            id: z.string().min(1).describe('WorkspaceView id or key'),
            ...mutationShape,
        },
        async ({ id, ...updates }, extra) => {
            const client = clientFactory(extra);
            const result = await client.updateWorkspaceView(id, updates);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        },
    );

    server.tool(
        'archive_workspace_view',
        'Archive a WorkspaceView manifest without deleting linked KG rows, workflows, executions, approvals, agents, routines, or external data.',
        {
            id: z.string().min(1).describe('WorkspaceView id or key'),
        },
        async ({ id }, extra) => {
            const client = clientFactory(extra);
            const result = await client.archiveWorkspaceView(id);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        },
    );
}
