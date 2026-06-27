/**
 * MCP Tools — Workspace use-case inspection
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

export function registerUseCaseTools(server: McpServer, clientFactory: ClientFactory) {
    const kitFieldShape = z.object({
        key: z.string().describe('Field key'),
        label: z.string().optional().describe('Human-readable field label'),
        type: z.string().optional().describe('Field type, e.g. string, url, select, date'),
        required: z.boolean().optional().describe('Whether the field is required'),
        description: z.string().optional().describe('Field description'),
    });

    const kitListShape = z.object({
        key: z.string().describe('Knowledge list key for the shared target list'),
        name: z.string().optional().describe('Knowledge list display name'),
        schema: z.array(kitFieldShape).optional().describe('Reviewable knowledge-list schema'),
        userKeyField: z.string().optional().describe('Field used as the stable user key'),
        dedupBy: z.enum(['userKey', 'composite']).optional().describe('Deduplication strategy'),
        statusField: z.string().optional().describe('Status field name'),
        initialStatus: z.string().optional().describe('Initial status for inserted rows'),
    });

    const kitSourceShape = z.object({
        id: z.string().optional().describe('Stable source id; defaults from name'),
        name: z.string().describe('Source workflow display name'),
        kind: z.enum(['search', 'scrape', 'api', 'manual', 'workflow']).describe('Source type'),
        config: z.record(z.unknown()).optional().describe('Source config to review before workflow creation'),
        schedule: z.string().optional().describe('Optional schedule/cadence'),
        criteriaInputPage: z.string().optional().describe('Optional criteria/input page id'),
        pipeline: z.record(z.unknown()).optional().describe('Concrete workflow pipeline payload to provision later after preview approval'),
    });

    const kitTailShape = z.object({
        name: z.string().optional().describe('Shared tail workflow name'),
        normalizePrompt: z.string().optional().describe('Normalization prompt/spec before upsert'),
        upsertStrategy: z.enum(['merge', 'overwrite']).optional().describe('Shared-list upsert strategy'),
        pipeline: z.record(z.unknown()).optional().describe('Concrete shared-tail workflow pipeline payload to provision later after preview approval'),
    });

    const kitOrchestratorShape = z.object({
        name: z.string().optional().describe('Orchestrator/qualifier workflow name'),
        schedule: z.string().optional().describe('Optional schedule/cadence'),
        criteria: z.string().optional().describe('Qualification criteria'),
        onMatch: z.enum(['outreach', 'slack', 'none']).optional().describe('Follow-up action after match'),
        outreachWorkflowId: z.string().optional().describe('Existing outreach workflow id when onMatch is outreach'),
        pipeline: z.record(z.unknown()).optional().describe('Concrete orchestrator workflow pipeline payload to provision later after preview approval'),
    });

    const kitPreviewShape = {
        key: z.string().optional().describe('Stable workspace-local use-case key, e.g. business-intro'),
        workspaceSlug: z.string().optional().describe('Optional workspace slug for readable preview ids'),
        name: z.string().min(1).describe('Use-case display name'),
        description: z.string().optional().describe('Use-case description'),
        setupHint: z.string().optional().describe('Setup hint for the UI'),
        status: z.enum(['selected', 'draft', 'active', 'paused', 'archived']).optional().describe('Lifecycle status; defaults to draft'),
        source: z.enum(['onboarding', 'catalog', 'custom', 'imported']).optional().describe('How this use case will be created; defaults to custom'),
        workflowGraphId: z.string().optional().describe('Runtime workflowGraphId bridge; defaults to key'),
        ownerUserId: z.string().optional().describe('Owner user ID'),
        collaboratorUserIds: z.array(z.string()).optional().describe('Collaborator user IDs'),
        list: kitListShape.optional().describe('Shared knowledge-list spec'),
        sources: z.array(kitSourceShape).optional().describe('Source workflow specs'),
        tail: kitTailShape.optional().describe('Shared tail workflow spec'),
        orchestrator: kitOrchestratorShape.optional().describe('Optional orchestrator/qualifier spec'),
        config: z.record(z.unknown()).optional().describe('Use-case config'),
        metadata: z.record(z.unknown()).optional().describe('Additional metadata'),
    };

    server.tool(
        'list_use_cases',
        `List workspace use cases and their operating guides, linked workflows, agents, routines, AgentFiles, knowledge refs, data sources, config, validation, and metadata.

Use this before building or changing a multi-workflow business goal so you can reuse the existing WorkspaceUseCase instead of hand-rolling disconnected workflows. Read operatingGuides/agentGuidance first; missing operating-guide warnings mean the agent context is incomplete. This tool is read-only and does not run workflows, spend credits, trigger routines, or write to providers.`,
        {
            status: z.enum(['selected', 'draft', 'active', 'paused', 'archived']).optional().describe('Optional lifecycle status filter'),
            limit: z.number().int().positive().max(500).optional().describe('Maximum rows to return'),
        },
        async ({ status, limit }, extra) => {
            const client = clientFactory(extra);
            const result = await client.listWorkspaceUseCases({ status, limit });
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        },
    );

    server.tool(
        'preview_use_case_kit',
        `Preview the atomic operation plan for a Source -> KG -> Process WorkspaceUseCase kit.

Use this before creating multiple related workflows for sourcing, intake, monitoring, business intros, or other shared-tail use cases. It returns the planned WorkspaceUseCase record, knowledge list, source workflows, shared tail, optional orchestrator, and link operations in deterministic order. This is dry-run only: it does not create records, workflows, KG rows, sends, provider writes, routine runs, or spend credits.`,
        kitPreviewShape,
        async (input, extra) => {
            const client = clientFactory(extra);
            const result = await client.previewWorkspaceUseCaseKit(input);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        },
    );

    server.tool(
        'provision_use_case_kit',
        `Provision a previously reviewed Source -> KG -> Process WorkspaceUseCase kit.

Use preview_use_case_kit first, review the deterministic plan, then call this only when the user explicitly approves the write. This creates the WorkspaceUseCase record, knowledge-list schema, and concrete workflows carried in payload.pipeline, then links them on the use-case record. It does not run workflows, insert KG rows, send messages, write to external providers, trigger routines, make approval decisions, or spend credits. Requires confirmToken exactly "PROVISION_USE_CASE_KIT".`,
        {
            ...kitPreviewShape,
            confirmToken: z.literal('PROVISION_USE_CASE_KIT').describe('Required explicit confirmation token for kit provisioning writes'),
            locale: z.string().optional().describe('Locale used when assigning workflow agent language; defaults to en'),
        },
        async (input, extra) => {
            const client = clientFactory(extra);
            const result = await client.provisionWorkspaceUseCaseKit(input);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        },
    );

    const useCaseMutationShape = {
        name: z.string().min(1).optional().describe('Use-case display name'),
        description: z.string().nullable().optional().describe('Use-case description; null clears it on update'),
        setupHint: z.string().nullable().optional().describe('Setup hint for the UI; null clears it on update'),
        status: z.enum(['selected', 'draft', 'active', 'paused', 'archived']).optional().describe('Lifecycle status'),
        source: z.enum(['onboarding', 'catalog', 'custom', 'imported']).optional().describe('How this use case was created'),
        templateId: z.string().nullable().optional().describe('Catalog/template source ID; null clears it on update'),
        workflowGraphId: z.string().optional().describe('Runtime workflowGraphId bridge for linked workflows'),
        ownerUserId: z.string().nullable().optional().describe('Owner user ID; null clears it on update'),
        collaboratorUserIds: z.array(z.string()).optional().describe('Collaborator user IDs'),
        workflowIds: z.array(z.string()).optional().describe('Linked workflow IDs'),
        agentIds: z.array(z.string()).optional().describe('Linked agent IDs'),
        routineIds: z.array(z.string()).optional().describe('Linked routine IDs'),
        agentFileIds: z.array(z.string()).optional().describe('Linked AgentFile IDs'),
        knowledgeTextKeys: z.array(z.string()).optional().describe('Linked knowledge text keys'),
        knowledgeListKeys: z.array(z.string()).optional().describe('Linked knowledge list keys'),
        dataSourceIds: z.array(z.string()).optional().describe('Linked data source IDs'),
        config: z.record(z.unknown()).nullable().optional().describe('Use-case config; null clears it on update'),
        validation: z.record(z.unknown()).nullable().optional().describe('Validation metadata; null clears it on update'),
        metadata: z.record(z.unknown()).nullable().optional().describe('Additional metadata; null clears it on update'),
    };

    server.tool(
        'create_use_case',
        `Create a WorkspaceUseCase product record for a multi-workflow business goal.

Use this before creating or attaching workflows for use cases such as sourcing, intake, front desk, or business intros. This creates the product-layer object and linked references only; it does not create workflows, write KG rows, run providers, spend credits, trigger routines, or send messages. After creating it, create/update workflows with the returned workflowGraphId and keep linked refs on the use case current.`,
        {
            key: z.string().optional().describe('Stable workspace-local key, e.g. business-intro. Defaults from name.'),
            workspaceSlug: z.string().optional().describe('Optional workspace slug for readable IDs when known'),
            name: z.string().min(1).describe('Use-case display name'),
            description: z.string().optional().describe('Use-case description'),
            setupHint: z.string().optional().describe('Setup hint for the UI'),
            status: z.enum(['selected', 'draft', 'active', 'paused', 'archived']).optional().describe('Lifecycle status; defaults to draft'),
            source: z.enum(['onboarding', 'catalog', 'custom', 'imported']).optional().describe('How this use case was created; defaults to custom'),
            templateId: z.string().optional().describe('Catalog/template source ID'),
            workflowGraphId: z.string().optional().describe('Runtime workflowGraphId bridge; defaults to key'),
            ownerUserId: z.string().optional().describe('Owner user ID'),
            collaboratorUserIds: z.array(z.string()).optional().describe('Collaborator user IDs'),
            workflowIds: z.array(z.string()).optional().describe('Linked workflow IDs'),
            agentIds: z.array(z.string()).optional().describe('Linked agent IDs'),
            routineIds: z.array(z.string()).optional().describe('Linked routine IDs'),
            agentFileIds: z.array(z.string()).optional().describe('Linked AgentFile IDs'),
            knowledgeTextKeys: z.array(z.string()).optional().describe('Linked knowledge text keys'),
            knowledgeListKeys: z.array(z.string()).optional().describe('Linked knowledge list keys'),
            dataSourceIds: z.array(z.string()).optional().describe('Linked data source IDs'),
            config: z.record(z.unknown()).optional().describe('Use-case config'),
            validation: z.record(z.unknown()).optional().describe('Validation metadata'),
            metadata: z.record(z.unknown()).optional().describe('Additional metadata'),
        },
        async (input, extra) => {
            const client = clientFactory(extra);
            const result = await client.createWorkspaceUseCase(input);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        },
    );

    server.tool(
        'get_use_case',
        `Get one workspace use case by stored id, key, or workflowGraphId.

Use this as the first inspection step for a specific business goal such as business-intro or front-desk. Read operatingGuides before answering workflow-specific questions or changing linked workflows. If agentGuidance.warnings includes MISSING_USE_CASE_OPERATING_GUIDE, state that the operating README is missing and create/update the linked knowledge text before treating the context as complete. This tool is read-only; create/update/provisioning operations remain intentionally separate until the atomic use-case kit lifecycle lands.`,
        {
            id: z.string().min(1).describe('WorkspaceUseCase id, key, or workflowGraphId'),
        },
        async ({ id }, extra) => {
            const client = clientFactory(extra);
            const result = await client.getWorkspaceUseCase(id);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        },
    );

    server.tool(
        'update_use_case',
        `Update a WorkspaceUseCase product record by stored id, key, or workflowGraphId.

Use this to attach existing workflows, agents, routines, AgentFiles, KG refs, data sources, config, validation, owner, collaborators, or lifecycle status to the use-case hub. This updates the use-case record only; it does not run workflows, mutate providers, spend credits, or make approval decisions.`,
        {
            id: z.string().min(1).describe('WorkspaceUseCase id, key, or workflowGraphId'),
            ...useCaseMutationShape,
        },
        async ({ id, ...updates }, extra) => {
            const client = clientFactory(extra);
            const result = await client.updateWorkspaceUseCase(id, updates);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        },
    );

    server.tool(
        'archive_use_case',
        'Archive a WorkspaceUseCase product record without deleting linked workflows, agents, routines, AgentFiles, or knowledge.',
        {
            id: z.string().min(1).describe('WorkspaceUseCase id, key, or workflowGraphId'),
        },
        async ({ id }, extra) => {
            const client = clientFactory(extra);
            const result = await client.archiveWorkspaceUseCase(id);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        },
    );
}
