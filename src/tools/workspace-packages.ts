/**
 * MCP Tools — managed workspace package lifecycle.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const packageTargetShape = {
    packageId: z.string().min(1)
        .default('vc-deal-flow')
        .describe('Registered package ID; raw manifests are not accepted'),
    version: z.string().optional()
        .describe('Optional exact registered package version'),
};

const confirmationShape = {
    preview: z.record(z.unknown())
        .describe('Exact signed preview returned by preview_workspace_package'),
    approvalReference: z.string().min(1)
        .describe('Exact approval reference bound into the preview'),
    bindingHash: z.string().min(1)
        .describe('Exact bindingHash returned in preview.binding'),
    planHash: z.string().min(1)
        .describe('Exact planHash returned in preview.binding'),
    leaseToken: z.string().min(1)
        .describe('Caller-stable lease token for idempotent apply or recovery'),
};

const resolutionSchema = z.object({
    ref: z.string().min(1)
        .describe('Exact operation ref returned by the current preview'),
    decision: z.enum(['adopt', 'preserve'])
        .describe('Additively adopt the eligible asset, or keep it workspace-owned'),
    currentFingerprint: z.string().regex(/^[a-f0-9]{64}$/)
        .describe('Exact currentFingerprint returned for this adoption candidate'),
}).strict();

function toolResult(result: unknown) {
    return {
        content: [{
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
        }],
    };
}

export function registerWorkspacePackageTools(
    server: McpServer,
    clientFactory: ClientFactory,
) {
    server.tool(
        'inspect_workspace_package',
        `Inspect eligibility, installability, blockers, and current lifecycle state for a registered workspace package.

This is read-only and reports every side-effect flag. It never installs, runs, activates, connects, calls providers, spends credits, sends, or imports data.`,
        packageTargetShape,
        async (input, extra) => toolResult(
            await clientFactory(extra).inspectWorkspacePackage(input),
        ),
    );

    server.tool(
        'preview_workspace_package',
        `Produce the exact signed, non-mutating install plan for a registered workspace package.

Eligible existing assets can be reviewed with fingerprint-bound adopt or preserve resolutions. Adoption is additive: the existing identity and workspace-owned settings are preserved. Preview never applies or changes the workspace.

The preview is bound to the workspace, designation, package version, manifest, authoritative snapshot, resolutions, operations, and approval reference. Review it before any apply.`,
        {
            ...packageTargetShape,
            approvalReference: z.string().min(1)
                .describe('Durable approval or review reference for this exact preview'),
            resolutions: z.array(resolutionSchema).max(100).optional()
                .describe('Optional exact per-asset decisions from a prior preview'),
        },
        async (input, extra) => toolResult(
            await clientFactory(extra).previewWorkspacePackage(input),
        ),
    );

    server.tool(
        'apply_workspace_package',
        `Apply one exact reviewed workspace package preview. Requires workspace:packages:apply plus workspace owner or ADMIN authority.

Installation creates only paused/draft workspace assets. It never runs workflows, activates routines or SignalKit, calls providers, spends credits, sends, writes CRM/calendar/integrations, or imports customer data.`,
        {
            ...packageTargetShape,
            ...confirmationShape,
        },
        async (input, extra) => toolResult(
            await clientFactory(extra).applyWorkspacePackage({
                packageId: input.packageId,
                version: input.version,
                preview: input.preview,
                confirmation: {
                    approvalReference: input.approvalReference,
                    bindingHash: input.bindingHash,
                    planHash: input.planHash,
                },
                leaseToken: input.leaseToken,
            }),
        ),
    );

    server.tool(
        'get_workspace_package_status',
        `Read the authoritative lifecycle and installation bindings for a registered workspace package.

This is read-only and does not activate or run installed assets.`,
        packageTargetShape,
        async (input, extra) => toolResult(
            await clientFactory(extra).getWorkspacePackageStatus(input),
        ),
    );

    server.tool(
        'recover_workspace_package',
        `Resume only the pending assets from an incomplete package installation using a fresh exact signed preview and confirmation.

Recovery uses the same paused lifecycle and requires workspace:packages:apply plus workspace owner or ADMIN authority.`,
        {
            ...packageTargetShape,
            ...confirmationShape,
        },
        async (input, extra) => toolResult(
            await clientFactory(extra).recoverWorkspacePackage({
                packageId: input.packageId,
                version: input.version,
                preview: input.preview,
                confirmation: {
                    approvalReference: input.approvalReference,
                    bindingHash: input.bindingHash,
                    planHash: input.planHash,
                },
                leaseToken: input.leaseToken,
            }),
        ),
    );
}
