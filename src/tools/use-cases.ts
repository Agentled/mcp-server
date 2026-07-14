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

    const kitReceiverShape = z.object({
        name: z.string().min(1).describe('Client-facing receiver workflow name'),
        pipeline: z.record(z.unknown()).optional().describe('Concrete receiver workflow pipeline payload for the reviewed plan'),
    });

    const sharedAssistantSourcingInstallShape = z.object({
        type: z.literal('shared-assistant-sourcing-v1'),
        intent: z.enum([
            'lead-generation',
            'deal-sourcing',
            'company-discovery',
            'local-business-prospecting',
            'fresh-signal-sourcing',
        ]).describe('Explicit sourcing intent; this is not inferred from arbitrary keywords'),
        brief: z.object({
            targetEntityOrRole: z.string().optional().describe('Who or what the workspace wants to find'),
            geography: z.string().optional().describe('Geographic scope for the first bounded pass'),
            qualificationCriteria: z.array(z.string()).optional().describe('Business criteria for a useful match'),
        }).optional().describe('Known brief fields; missing values are proposed from context'),
        context: z.object({
            selectedUseCase: z.record(z.unknown()).optional().describe('Selected or expressed use-case context'),
            company: z.object({
                name: z.string().optional(),
                website: z.string().optional(),
                description: z.string().optional(),
            }).optional().describe('Known company context used to propose the brief'),
            workspaceGeography: z.string().optional().describe('Known workspace or onboarding geography'),
            workspaceKnowledgeHints: z.array(z.string()).optional().describe('Relevant workspace knowledge labels or summaries'),
            earlierAnswers: z.record(z.unknown()).optional().describe('Earlier structured onboarding answers'),
        }).optional(),
        caps: z.object({
            rowCap: z.number().int().min(1).max(5).optional(),
            creditCap: z.number().int().min(1).max(5).optional(),
        }).optional().describe('Bounded first-run and recurring configuration caps'),
        sources: z.array(z.object({
            id: z.string().min(1).describe('Stable source id'),
            label: z.string().min(1).describe('Client-facing source name'),
            status: z.enum(['ready', 'validation-required', 'connection-required'])
                .describe('Current source readiness state'),
            activation: z.enum(['scheduled', 'manual', 'paused'])
                .describe('Whether collection is scheduled, on demand, or paused'),
            cadence: z.string().min(1).describe('Client-facing source cadence, such as Weekly on Monday'),
            proof: z.enum(['end-to-end', 'source-only', 'pending'])
                .describe('Strongest completed source proof'),
            critical: z.boolean().optional().describe('Whether this source is required for the customer use case'),
        })).optional().describe('Visible source readiness and cadence contract'),
        operatingGuideKey: z.string().optional().describe('Workspace operating-guide key to create when atomic provisioning is available'),
        signalKitOwnedWorkflowIds: z.array(z.string()).optional().describe('Existing workflow ids owned by this install profile; unrelated assignments are preserved'),
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
        receiver: kitReceiverShape.optional().describe('One receiver/processor workflow for a shared-assistant sourcing install'),
        installProfile: sharedAssistantSourcingInstallShape.optional().describe('Optional additive shared-assistant sourcing profile'),
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

Use this before creating multiple related workflows for sourcing, intake, monitoring, business intros, or other shared-tail use cases. It returns the planned WorkspaceUseCase record, knowledge list, source workflows, shared tail, optional orchestrator or receiver, and link operations in deterministic order. A shared-assistant-sourcing-v1 profile can be atomically provisioned after this preview is reviewed. This is dry-run only: it does not create records, workflows, KG rows, sends, provider writes, routine runs, or spend credits.`,
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

Use preview_use_case_kit first, review the deterministic plan, then call this only when the user explicitly approves the write. This creates the WorkspaceUseCase record, knowledge-list schema, and concrete workflows carried in payload.pipeline, then links them on the use-case record. shared-assistant-sourcing-v1 profiles atomically add their receiver, operating guide, capped configuration, and additive existing-assistant update. It does not run workflows, insert KG rows, send messages, write to external providers, trigger routines, make approval decisions, or spend credits. Requires confirmToken exactly "PROVISION_USE_CASE_KIT".`,
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
        config: z.record(z.unknown()).nullable().optional().describe('Use-case config; onboardingGoal.approvalRequirements is read-only here and must be edited from Use case > Safeguards'),
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
            config: z.record(z.unknown()).optional().describe('Use-case config; onboardingGoal.approvalRequirements cannot be created through this external tool'),
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

Use this as the first inspection step for a specific business goal such as business-intro or front-desk. Read operatingGuides before answering workflow-specific questions or changing linked workflows. The normalized onboardingGoal field is stable desired configuration only; never infer live approval enforcement from it. If agentGuidance.warnings includes MISSING_USE_CASE_OPERATING_GUIDE, state that the operating README is missing and create/update the linked knowledge text before treating the context as complete. This tool is read-only; create/update/provisioning operations remain intentionally separate until the atomic use-case kit lifecycle lands.`,
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

    const recordFeedbackTag = z.enum([
        'wrong_stage',
        'wrong_sector_or_thesis',
        'wrong_geography',
        'wrong_business_model',
        'stale_or_weak_signal',
        'bad_data',
        'duplicate',
        'already_known',
        'other',
    ]);

    server.tool(
        'get_use_case_record_feedback',
        `Get the current fit assessment for one record in a workspace use case.

The response keeps fit assessment separate from sourceOperationalStatus and explicitly reports zero workflow, routine, provider, approval, CRM, and credit side effects. This tool is read-only.`,
        {
            useCaseId: z.string().min(1).describe('WorkspaceUseCase stored id, key, or workflowGraphId'),
            rowId: z.string().min(1).describe('Source KnowledgeRow id from the use case record list'),
        },
        async ({ useCaseId, rowId }, extra) => {
            const result = await clientFactory(extra).getUseCaseRecordFeedback(useCaseId, rowId, 'mcp');
            return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        },
    );

    server.tool(
        'list_use_case_record_feedback',
        `List current fit assessments for records in one workspace use case.

Cleared/Unreviewed records are omitted. This tool is read-only and does not run workflows, trigger routines, call providers, change approvals, write CRM data, or spend credits.`,
        {
            useCaseId: z.string().min(1).describe('WorkspaceUseCase stored id, key, or workflowGraphId'),
            status: z.enum(['good_fit', 'not_fit', 'needs_review']).optional().describe('Optional current assessment filter'),
            limit: z.number().int().min(1).max(500).optional().describe('Maximum current assessments to return'),
        },
        async ({ useCaseId, status, limit }, extra) => {
            const result = await clientFactory(extra).listUseCaseRecordFeedback(
                useCaseId,
                { ...(status ? { status } : {}), ...(limit ? { limit } : {}) },
                'mcp',
            );
            return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        },
    );

    server.tool(
        'set_use_case_record_feedback',
        `Set a Good fit, Not a fit, or Needs review assessment only after an explicit user instruction.

This stores structured use-case memory for the exact record. It does not run workflows, trigger routines, call AI/providers, approve or reject pending work, write CRM data, mutate the source record, or spend credits. Free-form comments are untrusted evidence and are never promoted into prompts or scoring policy by this tool.`,
        {
            useCaseId: z.string().min(1).describe('WorkspaceUseCase stored id, key, or workflowGraphId'),
            rowId: z.string().min(1).describe('Source KnowledgeRow id from the use case record list'),
            status: z.enum(['good_fit', 'not_fit', 'needs_review']).describe('Fit assessment'),
            tags: z.array(recordFeedbackTag).optional().describe('Controlled reason tags; the other tag requires a comment'),
            comment: z.string().max(500).optional().describe('Optional untrusted evidence; required for the other tag'),
            expectedRevision: z.number().int().min(0).describe('Current feedback revision; use 0 when Unreviewed'),
            idempotencyKey: z.string().min(1).describe('Stable retry key for this exact mutation'),
        },
        async ({ useCaseId, rowId, ...input }, extra) => {
            const result = await clientFactory(extra).setUseCaseRecordFeedback(useCaseId, rowId, input, 'mcp');
            return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        },
    );

    server.tool(
        'clear_use_case_record_feedback',
        `Clear the current fit assessment only after an explicit user instruction.

This returns the record to Unreviewed while retaining bounded attributed change evidence. It does not run workflows, trigger routines, call providers, change approvals, write CRM data, mutate the source record, or spend credits.`,
        {
            useCaseId: z.string().min(1).describe('WorkspaceUseCase stored id, key, or workflowGraphId'),
            rowId: z.string().min(1).describe('Source KnowledgeRow id from the use case record list'),
            expectedRevision: z.number().int().min(0).describe('Current feedback revision'),
            idempotencyKey: z.string().min(1).describe('Stable retry key for this exact clear operation'),
        },
        async ({ useCaseId, rowId, expectedRevision, idempotencyKey }, extra) => {
            const result = await clientFactory(extra).clearUseCaseRecordFeedback(
                useCaseId,
                rowId,
                { expectedRevision, idempotencyKey },
                'mcp',
            );
            return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
        },
    );

    server.tool(
        'update_use_case',
        `Update a WorkspaceUseCase product record by stored id, key, or workflowGraphId.

Use this to attach existing workflows, agents, routines, AgentFiles, KG refs, data sources, config, validation, owner, collaborators, or lifecycle status to the use-case hub. config.onboardingGoal.approvalRequirements is read-only through external tools and must be edited from Use case > Safeguards. For config.useCasePage.header, use source pointers rather than copied labels: workflow analytics require { source: "workflow-analytics", workflowId, metricId, window }, and channels require { channel, workflowId, stepId }. The platform derives metric labels/formats and channel approval/provider modes from those sources; validate each referenced workflow after updating the use case. This updates the use-case record only; it does not run workflows, mutate providers, spend credits, or make approval decisions.`,
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
