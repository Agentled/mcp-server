/**
 * MCP Tools — Control workspace router install kit
 *
 * Packages the manual VC-Analyst control-router pattern (dedicated control
 * workspace + router agent + channel defaultAgentId + registry state) into a
 * dry-run/apply kit. Preview never mutates. Provision installs only safe
 * workspace assets; channel binding stays a separate operator-approved step.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

export function registerControlRouterTools(server: McpServer, clientFactory: ClientFactory) {
    const registryFieldShape = z.object({
        name: z.string().describe('Storage/query key written to rowData (unique per list)'),
        label: z.string().optional().describe('Human-readable field label'),
        type: z.enum(['text', 'number', 'date', 'boolean', 'url', 'email', 'select']).optional().describe('Field type'),
        required: z.boolean().optional().describe('Whether the field is required'),
        options: z.array(z.string()).optional().describe('Options for select fields'),
        description: z.string().optional().describe('Field description'),
    });

    const registryListShape = z.object({
        key: z.string().describe('Immutable knowledge-list key, e.g. nina-salon-router-registry'),
        displayName: z.string().optional().describe('List display name'),
        role: z.enum(['threads', 'routing_decisions', 'registry', 'requests', 'other']).optional().describe('Router list role'),
        fields: z.array(registryFieldShape).optional().describe('Reviewable registry schema'),
        userKeyField: z.string().optional().describe('Field used for deterministic upsert dedup'),
        dedupeKeyTemplate: z.string().optional().describe('Dedupe key template, e.g. {phoneE164}:{googleProfileUrlCanonical}'),
        statusField: z.string().optional().describe('Status field name'),
        initialStatus: z.string().optional().describe('Initial status for inserted rows'),
        syncToKg: z.boolean().optional().describe('Sync rows to the knowledge graph'),
    });

    const controlRouterPreviewShape = {
        profileId: z.string().optional().describe('Stable persona/profile id, e.g. nina.salon-audit.v0'),
        persona: z.string().min(1).describe('Public persona name, e.g. nina'),
        workspace: z.object({
            alias: z.string().describe('Control workspace alias, e.g. nina-salon-control'),
            slug: z.string().optional().describe('Workspace slug'),
            id: z.string().optional().describe('Known workspace id; when set the kit selects rather than creates'),
            mode: z.enum(['select-or-create', 'existing']).optional().describe('Workspace resolution mode'),
            ownerEmail: z.string().optional().describe('Owner email used only when the operator create path provisions a new workspace'),
            clientDomain: z.string().optional().describe('Client domain for idempotent workspace matching'),
        }).describe('Target control workspace'),
        agent: z.object({
            id: z.string().optional().describe('Router agent id, e.g. nina-router@nina-salon-control'),
            name: z.string().describe('Router agent display name'),
            email: z.string().optional().describe('Router agent email/address'),
            instructionBlock: z.string().describe('Public persona instruction block; separates hidden internal terms and approval policy'),
        }).describe('Router agent'),
        channel: z.object({
            type: z.enum(['email', 'whatsapp', 'slack']).describe('Public channel type'),
            senderIdentityKeys: z.array(z.string()).min(1).describe('Sender identity keys, e.g. [phoneE164, waContactId] or [senderEmail, firmDomain]'),
            publicIntake: z.string().optional().describe('Public intake address/number/contact'),
            senderPolicy: z.string().optional().describe('Sender/allowlist policy note'),
        }).describe('Public channel front door'),
        registryLists: z.array(registryListShape).min(1).describe('Router registry/decision lists'),
        routerWorkflow: z.object({
            name: z.string().optional().describe('Router workflow name'),
            pipeline: z.record(z.unknown()).optional().describe('Concrete router workflow pipeline to provision later after preview approval'),
            branches: z.array(z.string()).optional().describe('Router branch modes, e.g. [qualified, unclear, spam]'),
        }).describe('Inbound router workflow skeleton'),
        operatingGuide: z.object({
            key: z.string().describe('KG text operating-guide key, e.g. nina.salon_audit_guide'),
            title: z.string().optional(),
            content: z.string().optional(),
        }).optional().describe('Router operating guide (KG text)'),
        approvalPolicy: z.object({
            approvalGatedReplies: z.boolean().optional().describe('Gate every external send/reply behind approval (default true)'),
            blockAutonomousOutbound: z.boolean().optional().describe('Block autonomous outbound (default true)'),
            hiddenInternalTerms: z.array(z.string()).optional().describe('Internal terms blocked from customer-facing replies'),
            approvalNotify: z.string().optional().describe('Approval notification target'),
        }).optional().describe('Approval-gated reply policy'),
        sourceAssets: z.array(z.object({
            name: z.string().describe('Source asset label, e.g. Nina Google Profile Audit'),
            workflowId: z.string().optional().describe('Existing workflow id to reuse'),
            manifestRef: z.string().optional().describe('Where the asset copy/install is documented'),
            required: z.boolean().optional().describe('Whether the asset must exist before live tests'),
        })).optional().describe('Source workflow assets the router reuses'),
        useCase: z.object({
            key: z.string().optional(),
            name: z.string().optional(),
            clientFacingUseCase: z.string().optional(),
        }).optional().describe('WorkspaceUseCase product record for the router'),
        validation: z.object({
            commands: z.array(z.string()).optional(),
            smokeChecklist: z.array(z.string()).optional(),
        }).optional().describe('Validation commands and smoke checklist'),
        metadata: z.record(z.unknown()).optional().describe('Additional metadata'),
    };

    server.tool(
        'preview_control_router_kit',
        `Preview the install plan for a public-persona control-workspace router (dedicated control workspace + router agent + channel defaultAgentId + registry state).

Use this to package the VC-Analyst-style control-router pattern for a new persona (e.g. Nina) instead of hand-wiring the router workspace. It returns the target workspace, router agent, registry lists, router workflow draft skeleton, approval policy, prepared (unexecuted) channel binding, and named pending approvals/operator-only steps. This is dry-run only: it does not create records, workflows, agents, KG rows, bind channels, send messages, run providers, activate routines, or spend credits. All side-effect flags are false.`,
        controlRouterPreviewShape,
        async (input, extra) => {
            const client = clientFactory(extra);
            const result = await client.previewControlRouterKit(input);
            return {
                content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
            };
        },
    );

    server.tool(
        'provision_control_router_kit',
        `Provision a previously reviewed control-workspace router kit.

Use preview_control_router_kit first, review the deterministic plan, then call this only when the operator explicitly approves the write. It installs only safe assets: the WorkspaceUseCase, KG text operating guide, registry lists, the router agent (created in DRAFT), and the router workflow draft (inactive), then links them. Channel binding is PREPARED but never executed here — it remains a separate operator-approved step. When the target control workspace does not exist and operator create scope is unavailable, the workspace step degrades to a setup request. It does not bind channels, send messages, run workflows, activate routines, write CRM/providers, or spend credits. Requires confirmToken exactly "PROVISION_CONTROL_ROUTER_KIT".`,
        {
            ...controlRouterPreviewShape,
            confirmToken: z.literal('PROVISION_CONTROL_ROUTER_KIT').describe('Required explicit confirmation token for control-router kit provisioning writes'),
            locale: z.string().optional().describe('Locale used when creating the router workflow; defaults to en'),
        },
        async (input, extra) => {
            const client = clientFactory(extra);
            const result = await client.provisionControlRouterKit(input);
            return {
                content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
            };
        },
    );
}
