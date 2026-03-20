/**
 * MCP Tools — Workflow CRUD + Validation + Lifecycle
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

export function registerWorkflowTools(server: McpServer, clientFactory: ClientFactory) {

    server.tool(
        'list_workflows',
        'List all workflows in the workspace. Returns id, name, status, goal for each.',
        {
            status: z.string().optional().describe('Filter by status: draft, active, paused'),
            limit: z.number().optional().describe('Max results (default 50, max 200)'),
        },
        async ({ status, limit }, extra) => {
            const client = clientFactory(extra);
            const result = await client.listWorkflows({ status, limit });
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'get_workflow',
        `Get full details of a workflow including all steps, context, metadata, and configuration.
Also returns hasDraftSnapshot (boolean) and draftSnapshot summary if a draft exists for a live workflow.`,
        {
            workflowId: z.string().describe('The workflow ID'),
        },
        async ({ workflowId }, extra) => {
            const client = clientFactory(extra);
            const result = await client.getWorkflow(workflowId);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'create_workflow',
        `Create a new workflow from a pipeline definition. The pipeline object should include:
- name (required): Workflow name
- goal: What the workflow does
- description: Longer description
- steps: Array of pipeline steps (trigger, aiAction, appAction, milestone, etc.)
- context: Execution input config and input/output pages
- metadata: Template info, notifications, ROI
- style: UI styling (colors, icon)`,
        {
            pipeline: z.record(z.string(), z.any()).describe('The pipeline definition object'),
            locale: z.string().optional().describe('Locale (default: en)'),
        },
        async ({ pipeline, locale }, extra) => {
            const client = clientFactory(extra);
            const result = await client.createWorkflow(pipeline, locale);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'update_workflow',
        `Update an existing workflow. Provide only the fields you want to change.

IMPORTANT: If the workflow is live, config edits (steps, context, name, etc.) are automatically
routed to a draft snapshot instead of modifying the live pipeline. The response will include
editingDraft: true. Use get_draft to view the draft, promote_draft to make it live, or
discard_draft to throw away the changes. Non-live workflows are updated directly with an
automatic pre-edit snapshot for rollback.`,
        {
            workflowId: z.string().describe('The workflow ID to update'),
            updates: z.record(z.string(), z.any()).describe('Partial pipeline updates (name, steps, context, etc.)'),
            locale: z.string().optional().describe('Locale (default: en)'),
        },
        async ({ workflowId, updates, locale }, extra) => {
            const client = clientFactory(extra);
            const result = await client.updateWorkflow(workflowId, updates, locale);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'delete_workflow',
        'Permanently delete a workflow by ID. This cannot be undone.',
        {
            workflowId: z.string().describe('The workflow ID to delete'),
        },
        async ({ workflowId }, extra) => {
            const client = clientFactory(extra);
            const result = await client.deleteWorkflow(workflowId);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'validate_workflow',
        `Validate a workflow's pipeline definition. Returns structured errors per step.
Use this after creating or updating a workflow to check for:
- Missing step connections (broken next.stepId references)
- Missing required fields (app action without inputs, AI step without prompt)
- Unreachable steps (not connected to the trigger chain)
- Invalid app/action IDs (not in the app registry)
- Missing trigger or milestone steps
- List field misconfigurations (missing itemFields, defaultValue format mismatches)
- Config page field validation (missing name/type on input page fields)

Each error/warning may include a "suggestedFix" with a concrete remediation.

You can also pass a pipeline object to validate a draft before saving.
Returns: { valid: boolean, errors: [...], warnings: [...], stepCount: number }`,
        {
            workflowId: z.string().describe('The workflow ID to validate'),
            pipeline: z.record(z.string(), z.any()).optional().describe('Optional draft pipeline to validate before saving (merged with stored pipeline)'),
        },
        async ({ workflowId, pipeline }, extra) => {
            const client = clientFactory(extra);
            const result = await client.validateWorkflow(workflowId, pipeline);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'list_snapshots',
        `List available config snapshots for a workflow. Snapshots are automatically captured
before every external API update, allowing you to restore a previous configuration.
Returns snapshot ID, timestamp, and which fields were changed.`,
        {
            workflowId: z.string().describe('The workflow ID'),
        },
        async ({ workflowId }, extra) => {
            const client = clientFactory(extra);
            const result = await client.listSnapshots(workflowId);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'restore_snapshot',
        `Restore a workflow to a previous config snapshot. Use list_snapshots first to find the
snapshot ID. This will revert the workflow's steps, context, name, description, goal, and
style to the state captured in the snapshot.`,
        {
            workflowId: z.string().describe('The workflow ID'),
            snapshotId: z.string().describe('The snapshot ID to restore (from list_snapshots)'),
        },
        async ({ workflowId, snapshotId }, extra) => {
            const client = clientFactory(extra);
            const result = await client.restoreSnapshot(workflowId, snapshotId);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'create_snapshot',
        `Create a manual config snapshot of a workflow's current state. Use this to save a
checkpoint before making changes, so you can restore later if needed.
Enforces plan-based limits (Pro=2, Teams=10, Custom=50). Returns an error with limit
info if the snapshot limit is reached — delete old snapshots first to free up space.`,
        {
            workflowId: z.string().describe('The workflow ID to snapshot'),
            label: z.string().optional().describe('Optional label to identify the snapshot (e.g. "before refactor")'),
        },
        async ({ workflowId, label }, extra) => {
            const client = clientFactory(extra);
            const result = await client.createSnapshot(workflowId, label);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'delete_snapshot',
        `Delete a specific config snapshot. Use list_snapshots to find snapshot IDs.
Useful for freeing up space when the snapshot limit is reached.`,
        {
            workflowId: z.string().describe('The workflow ID'),
            snapshotId: z.string().describe('The snapshot ID to delete (from list_snapshots)'),
        },
        async ({ workflowId, snapshotId }, extra) => {
            const client = clientFactory(extra);
            const result = await client.deleteSnapshot(workflowId, snapshotId);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'get_draft',
        `Get the draft snapshot for a live workflow. When you update a live workflow, changes
go to a draft instead of modifying the live pipeline. Use this to inspect the current draft
state. Returns hasDraft: true/false and the draft config if it exists.`,
        {
            workflowId: z.string().describe('The workflow ID'),
        },
        async ({ workflowId }, extra) => {
            const client = clientFactory(extra);
            const result = await client.getDraft(workflowId);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'promote_draft',
        `Promote the draft snapshot to live. This overwrites the live pipeline config with
the draft contents, then deletes the draft snapshot. A pre-promote snapshot is saved
automatically so the previous live config can be restored if needed.`,
        {
            workflowId: z.string().describe('The workflow ID'),
        },
        async ({ workflowId }, extra) => {
            const client = clientFactory(extra);
            const result = await client.promoteDraft(workflowId);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'discard_draft',
        `Discard the draft snapshot for a live workflow. The live pipeline config stays
unchanged. Use this to abandon draft changes and go back to the current live version.`,
        {
            workflowId: z.string().describe('The workflow ID'),
        },
        async ({ workflowId }, extra) => {
            const client = clientFactory(extra);
            const result = await client.discardDraft(workflowId);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'publish_workflow',
        `Change the status of a workflow (publish, pause, or archive).
Valid transitions: created/draft -> live, live -> paused, paused -> live, any -> archived.
Use "live" to publish a draft workflow so it can be executed.`,
        {
            workflowId: z.string().describe('The workflow ID'),
            status: z.enum(['live', 'paused', 'archived']).describe('Target status'),
        },
        async ({ workflowId, status }, extra) => {
            const client = clientFactory(extra);
            const result = await client.publishWorkflow(workflowId, status);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'export_workflow',
        `Export a workflow as portable JSON for cross-environment transfer.
Returns a self-contained WorkflowExport object with all steps, context, metadata, and pages.
Workspace-specific identifiers (workspaceId, agentIds) are stripped so the export can be imported into any workspace.

Use this together with import_workflow to move workflows between environments (e.g. sandbox → prod).`,
        {
            workflowId: z.string().describe('The workflow ID to export'),
        },
        async ({ workflowId }, extra) => {
            const client = clientFactory(extra);
            const result = await client.exportWorkflow(workflowId);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'import_workflow',
        `Import a workflow from an export JSON into this workspace.
Accepts the full WorkflowExport object (from export_workflow) and creates a new workflow with fresh IDs.
Associated pages are recreated. Import provenance is recorded in the workflow metadata.

Use this together with export_workflow to move workflows between environments.
Tip: register separate MCP servers for sandbox and prod, export from one, import into the other.`,
        {
            exportJson: z.record(z.string(), z.any()).describe('The WorkflowExport object (output from export_workflow)'),
            locale: z.string().optional().describe('Locale for the imported workflow (default: en)'),
        },
        async ({ exportJson, locale }, extra) => {
            const client = clientFactory(extra);
            const result = await client.importWorkflow(exportJson, locale);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'preview_n8n_import',
        `Preview a deterministic n8n import from JSON. Returns:
- normalized import hash and IR
- mapped step graph
- unsupported nodes + remediation
- warnings/risks
- draft workflow build contract and compiler readiness summary

This is a read-only preview and does not create any workflow.`,
        {
            n8nJson: z.any().describe('n8n workflow JSON object or string export'),
            options: z.record(z.string(), z.any()).optional().describe('Optional import options (e.g. maxNodes, allowPartial)'),
            workflow: z.object({
                name: z.string().optional(),
                goal: z.string().optional(),
                description: z.string().optional(),
                pathname: z.string().optional(),
            }).optional().describe('Optional workflow metadata overrides for preview contract'),
        },
        async ({ n8nJson, options, workflow }, extra) => {
            const client = clientFactory(extra);
            const result = await client.previewN8nImport(n8nJson, options, workflow);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'import_n8n_workflow',
        `Create a new Agentled workflow from an n8n JSON import.

Behavior:
- runs deterministic import preview
- creates workflow in preflight draft mode
- stores imported contract for review/approval
- does NOT auto-apply scaffold`,
        {
            n8nJson: z.any().describe('n8n workflow JSON object or string export'),
            workflow: z.object({
                name: z.string().optional(),
                goal: z.string().optional(),
                description: z.string().optional(),
                pathname: z.string().optional(),
            }).optional().describe('Optional metadata overrides for the created workflow'),
            options: z.record(z.string(), z.any()).optional().describe('Optional import options'),
            locale: z.string().optional().describe('Locale for workflow creation (default en)'),
        },
        async ({ n8nJson, workflow, options, locale }, extra) => {
            const client = clientFactory(extra);
            const result = await client.importN8nWorkflow(n8nJson, workflow, options, locale);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );
}
