/**
 * MCP Tools — Workflow Executions
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

/**
 * Codex review on PR #720: Zod's `value: z.any()` does NOT require the
 * `value` key to be present in the parsed object. So `{ op: "replace",
 * path: "x" }` (no `value`) passes Zod validation, then JSON
 * serialization drops the missing key, sending `{ op, path }` to the
 * service which rejects with INVALID_VALUE — a confusing service-level
 * error for what's really a schema-level contract violation.
 *
 * Fix it at the MCP handler boundary: reject any op where value is
 * undefined (key absent). `null` is preserved as a legitimate intentional
 * patch value (see Stage 3's null-preservation work).
 *
 * Returns either normalized patches ready for the client, or an MCP-
 * compatible error envelope the handler can return directly.
 */
function validateAndNormalizePatches(
    patches: Array<{ op: 'replace'; path: string; value?: unknown; expectedCurrentValue?: unknown }>,
): { ok: true; normalized: Array<{ op: 'replace'; path: string; value: unknown; expectedCurrentValue?: unknown }> }
  | { ok: false; errorPayload: { type: 'text'; text: string } } {
    for (let i = 0; i < patches.length; i++) {
        const p = patches[i];
        if (!Object.prototype.hasOwnProperty.call(p, 'value')) {
            return {
                ok: false,
                errorPayload: {
                    type: 'text' as const,
                    text: JSON.stringify({
                        error: `patches[${i}] missing required \`value\` key — the wire shape requires \`value\` to be present even when its value is null`,
                        code: 'INVALID_VALUE',
                        path: p.path,
                    }, null, 2),
                },
            };
        }
    }
    const normalized = patches.map((p) => ({
        op: p.op,
        path: p.path,
        value: p.value as unknown,
        ...(p.expectedCurrentValue !== undefined ? { expectedCurrentValue: p.expectedCurrentValue as unknown } : {}),
    }));
    return { ok: true, normalized };
}

export function registerExecutionTools(server: McpServer, clientFactory: ClientFactory) {

    server.tool(
        'start_workflow',
        `Start a workflow execution. Optionally provide input data that maps to the workflow's input page fields.
For example, if the workflow expects "company_url", pass: { input: { company_url: "https://..." } }

Returns executionInputId for the submitted input/run record. It may also return executionId when the async PipelineExecution row is already available. Use only executionId with get_execution/list_timelines/get_timeline. If executionId is absent, call list_executions and match pipelineExecutionInputId to the returned executionInputId; the matching row's id is the executionId.

Mock control: by default, steps that have mock data configured (\`step.mock.enabledByDefault\`) will return that mock data and consume zero credits. Pass \`useMocks: false\` to force a real run that ignores mocks for every step. Pass \`useMocks: true\` (or omit) to keep the workflow's default mock behavior.`,
        {
            workflowId: z.string().describe('The workflow ID to start'),
            input: z.record(z.string(), z.any()).optional().describe('Input payload matching the workflow input page fields'),
            metadata: z.record(z.string(), z.any()).optional().describe('Optional execution metadata. Merged with mock controls if useMocks is provided.'),
            useMocks: z.boolean().optional().describe('Whether to honor per-step mock data. Default true (honor mocks). Set to false to force a real, credit-consuming execution that ignores all step mocks.'),
        },
        async ({ workflowId, input, metadata, useMocks }, extra) => {
            const client = clientFactory(extra);
            const mergedMetadata =
                useMocks === undefined
                    ? metadata
                    : { ...(metadata ?? {}), mockConfig: { ...(metadata?.mockConfig ?? {}), disabled: useMocks === false } };
            const result = await client.startWorkflow(workflowId, input, mergedMetadata);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'list_executions',
        'List recent executions for a workflow. Returns execution id, pipelineExecutionInputId, status, timestamps. Use pipelineExecutionInputId to match an executionInputId returned by start_workflow when executionId was not available yet.',
        {
            workflowId: z.string().describe('The workflow ID'),
            status: z.string().optional().describe('Filter: running, completed, failed'),
            limit: z.number().optional().describe('Max results (default 50, max 500)'),
            direction: z.enum(['asc', 'desc']).optional().describe('Sort order (default: desc)'),
            nextToken: z.string().optional().describe('Pagination cursor from a previous response. Pass this to fetch the next page of results.'),
        },
        async ({ workflowId, status, limit, direction, nextToken }, extra) => {
            const client = clientFactory(extra);
            const result = await client.listExecutions(workflowId, { status, limit, direction, nextToken });
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'get_execution',
        `Get full execution details including results from each completed step.
The executionContent field maps stepId -> step output data.
Use this to inspect what a workflow produced, debug failures, or check intermediate results.

executionId must be the PipelineExecution id, not executionInputId. If start_workflow returned only executionInputId, first call list_executions and match pipelineExecutionInputId to find the execution id.`,
        {
            workflowId: z.string().describe('The workflow ID'),
            executionId: z.string().describe('The execution ID'),
        },
        async ({ workflowId, executionId }, extra) => {
            const client = clientFactory(extra);
            const result = await client.getExecution(workflowId, executionId);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'list_timelines',
        `List timelines (step execution records) for a specific execution. Each timeline represents a step that ran, with its status, output, and metadata. Use this to inspect individual step results, debug failures, or see the execution flow.

To debug the actual prompt used for a step in an execution, find that step's timeline here, then call get_timeline and inspect metadata.computedPrompt. get_step only shows the configured prompt template, not the resolved execution prompt.`,
        {
            workflowId: z.string().describe('The workflow ID'),
            executionId: z.string().describe('The execution ID'),
            limit: z.number().optional().describe('Max results (default 50, max 500)'),
            direction: z.enum(['asc', 'desc']).optional().describe('Sort order by creation time (default: desc)'),
            nextToken: z.string().optional().describe('Pagination cursor from a previous response. Pass this to fetch the next page of results.'),
        },
        async ({ workflowId, executionId, limit, direction, nextToken }, extra) => {
            const client = clientFactory(extra);
            const result = await client.listTimelines(workflowId, executionId, { limit, direction, nextToken });
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'get_timeline',
        `Get a single timeline (step execution record) by ID. Returns the full timeline including eventContent (step output), status, metadata, and context. Use this to inspect a specific step's result in detail.

To debug the actual prompt used for this step invocation, inspect metadata.computedPrompt. get_step only shows the configured prompt template, not the resolved execution prompt.`,
        {
            workflowId: z.string().describe('The workflow ID'),
            executionId: z.string().describe('The execution ID'),
            timelineId: z.string().describe('The timeline ID'),
        },
        async ({ workflowId, executionId, timelineId }, extra) => {
            const client = clientFactory(extra);
            const result = await client.getTimeline(workflowId, executionId, timelineId);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'stop_execution',
        'Stop a running or pending workflow execution. Only works on executions with status "running" or "pending".',
        {
            workflowId: z.string().describe('The workflow ID'),
            executionId: z.string().describe('The execution ID to stop'),
            reason: z.string().max(500).optional().describe('Optional stop reason persisted in execution metadata'),
        },
        async ({ workflowId, executionId, reason }, extra) => {
            const client = clientFactory(extra);
            const result = await client.stopExecution(workflowId, executionId, { reason });
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'read_step_output',
        `Read the full output from a previous workflow step.

Use this tool when a step output was deferred as a tool reference in a prompt — you will see a block like:

  [Tool Reference: stepName]
  Size: 24.3KB | Fields: name, emails, organizations, ...
  To read full data: call read_step_output(executionId="...", stepId="...")

Pass the executionId and stepId shown in that block. Optionally narrow the response with 'field' (dot-notation path) or 'select' (list of top-level fields to include).`,
        {
            workflowId: z.string().describe('The workflow ID'),
            executionId: z.string().describe('The execution ID (shown in the tool reference block)'),
            stepId: z.string().describe('The step ID whose output to read (shown in the tool reference block)'),
            field: z.string().optional().describe('Dot-notation path to a specific field within the step output (e.g. "person.emails")'),
            select: z.array(z.string()).optional().describe('List of top-level field names to include (reduces response size)'),
        },
        async ({ workflowId, executionId, stepId, field, select }, extra) => {
            const client = clientFactory(extra);
            const result = await client.getStepOutput(workflowId, executionId, stepId, { field, select });
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'rerun',
        `Rerun or retry any step in a workflow execution. Pass the timelineId — the backend derives everything else (workflowId, executionId, stepId) automatically from the timeline record.

Works for both retrying failed steps and rerunning any step regardless of status.
Bypasses cache by default (forceWithoutCache: true).

To find the timelineId: use list_timelines to browse step execution records for an execution, or get_execution which includes recent timeline IDs.`,
        {
            timelineId: z.string().describe('The timeline ID to rerun (from list_timelines or get_execution)'),
            forceWithoutCache: z.boolean().optional().describe('Bypass cache when rerunning (default: true)'),
        },
        async ({ timelineId, forceWithoutCache }, extra) => {
            const client = clientFactory(extra);
            const result = await client.rerun(timelineId, { forceWithoutCache });
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'retry_execution',
        `[Deprecated — use rerun instead] Retry a failed step in a workflow execution. If no timelineId is provided, the most recent failed timeline is automatically detected and retried. This re-runs the failed step and continues the workflow from that point.`,
        {
            workflowId: z.string().describe('The workflow ID'),
            executionId: z.string().describe('The execution ID containing the failed step'),
            timelineId: z.string().optional().describe('Specific timeline ID to retry. If omitted, the most recent failed timeline is auto-detected.'),
            forceWithoutCache: z.boolean().optional().describe('Bypass cache when retrying the step'),
        },
        async ({ workflowId, executionId, timelineId, forceWithoutCache }, extra) => {
            const client = clientFactory(extra);
            const result = await client.retryExecution(workflowId, executionId, {
                timelineId,
                forceWithoutCache,
            });
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'rerun_step',
        `[Deprecated — use rerun instead] Rerun a specific step in a workflow execution, regardless of step status (pending, completed, failed, skipped).
Works on any step and uses the current live pipeline config.
Bypasses cache by default (forceWithoutCache: true).
If no timelineId is provided, the most recent timeline for that step is automatically detected and rerun.`,
        {
            workflowId: z.string().describe('The workflow ID'),
            executionId: z.string().describe('The execution ID'),
            stepId: z.string().describe('The step ID to rerun (e.g. "generate-report" or "analyze-5")'),
            timelineId: z.string().optional().describe('Specific timeline ID to rerun. If omitted, the most recent timeline for that step is auto-detected.'),
            forceWithoutCache: z.boolean().optional().describe('Bypass cache when rerunning the step (default: true)'),
        },
        async ({ workflowId, executionId, stepId, timelineId, forceWithoutCache }, extra) => {
            const client = clientFactory(extra);
            const result = await client.rerunStep(workflowId, executionId, {
                stepId,
                timelineId,
                forceWithoutCache,
            });
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    // ─── ORC-092 admin patch tools ──────────────────────────────────────────
    //
    // Reserve these for **exceptional** ops work, not day-to-day patching:
    //
    //  - `patch_timeline_fields` is for fixing a *pending* approval timeline
    //    when the upstream AI-step output came out wrong (e.g. malformed
    //    `email.to` shape blocking the send). Without this you'd have to
    //    rerun the entire AI step and re-burn its credits.
    //  - `patch_execution_fields` is mainly for relabeling a stuck or test
    //    run's `executionName` to disambiguate it after the fact, or
    //    advancing an execution out of `waiting`/`failed` into `running` for
    //    manual recovery.
    //
    // Both require an API key carrying the `admin:patch` scope (Stage 2).
    // Without that scope the route returns 403 FORBIDDEN_SCOPE.

    server.tool(
        'patch_timeline_fields',
        `Surgically edit a pending approval timeline's eventContent or metadata fields without rerunning the upstream step.

EXCEPTION-ONLY tool. Use cases:
  - Fix a malformed email.to / subject / body in a pending email-draft step (no need to re-run the LLM)
  - Update metadata.pendingReasonTag for UI annotation
  - Recover a failed timeline back to pending (status transition: failed → pending)

DO NOT use for day-to-day data fixes — most edits should happen by re-running the step or updating the workflow definition. This tool exists for incident response, not regular workflow operation.

Required:
  - API key with admin:patch scope (Stage 2 — without it returns 403 FORBIDDEN_SCOPE)
  - reason: non-empty string (≤500 chars), persisted in the audit row
  - expectedUpdatedAt: timeline.updatedAt from a fresh read — guards against lost-update races

Allowed paths (status === 'pending'):
  - eventContent  (wholesale replace; reserved keys _* rejected)
  - eventContent.email.subject | body | bodyType | to | cc | bcc
  - eventContent.<any>  (any AI-output field, except _*-prefixed reserved keys)
  - metadata.pendingReasonTag
  - status  (only failed → pending)

Forbidden:
  - Any path containing an underscore-prefixed segment (_timelineId, _metadata, _pointer, _continuation, etc. — runtime-internal markers)
  - Any write to a completed/approved/rejected timeline
  - Identity fields, provider send results, audit fields

Returns: { patched, dryRun, auditId, diff: [{path, before, after}], record }
On error: { error, code, path? }  — codes: FORBIDDEN_SCOPE | FORBIDDEN_PATH | FORBIDDEN_TRANSITION | INVALID_VALUE | NOT_FOUND | CONCURRENCY_CONFLICT | STATUS_MISMATCH | PRECONDITION_FAILED`,
        {
            workflowId: z.string().describe('The workflow ID'),
            executionId: z.string().describe('The execution ID'),
            timelineId: z.string().describe('The timeline ID being patched'),
            reason: z.string().min(1).max(500).describe('Why this patch is needed; persisted in the audit record'),
            expectedUpdatedAt: z.string().describe('The timeline\'s current updatedAt (ISO). Required for optimistic concurrency.'),
            patches: z.array(z.object({
                op: z.literal('replace'),
                path: z.string().describe('Dot-path: e.g. "eventContent.email.subject"'),
                value: z.any(),
                expectedCurrentValue: z.any().optional().describe('Optional: reject if current value differs (defensive precondition)'),
            })).min(1).describe('Array of replace operations (at most 12)'),
            dryRun: z.boolean().optional().describe('Compute diff without writing or auditing. Default false.'),
        },
        async ({ workflowId, executionId, timelineId, reason, expectedUpdatedAt, patches, dryRun }, extra) => {
            const validated = validateAndNormalizePatches(patches);
            if (!validated.ok) {
                return { content: [validated.errorPayload] };
            }
            const client = clientFactory(extra);
            const result = await client.patchTimeline(workflowId, executionId, timelineId, {
                reason, expectedUpdatedAt, patches: validated.normalized, dryRun,
            });
            return {
                content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
            };
        }
    );

    server.tool(
        'patch_execution_fields',
        `Surgically edit a PipelineExecution's metadata, currentStepId, or status without re-running the workflow.

EXCEPTION-ONLY tool. Primary use case: relabeling a stuck or test run's executionName so it's distinguishable in the executions list, without spending credits on a rerun. Other use cases:
  - Update metadata.debugNote during incident investigation
  - Update metadata.pendingReasonTag for UI annotation
  - Advance currentStepId for stuck-state recovery (only when status is waiting or failed)
  - Force status transitions: waiting/failed/credits_missing → running

DO NOT use for routine work. If you find yourself reaching for this tool repeatedly, the underlying workflow is misconfigured and the right fix is to update the workflow definition or the execution input.

Required:
  - API key with admin:patch scope (Stage 2)
  - reason, expectedUpdatedAt — same as patch_timeline_fields

Allowed paths:
  - metadata.debugNote
  - metadata.pendingReasonTag
  - metadata.executionName  (relabel run; orchestrator may recompute via executionNameTemplate)
  - currentStepId  (only when status is waiting or failed)
  - status  (only waiting → running, failed → running, credits_missing → running)

Forbidden:
  - Wholesale metadata replacement (must use sub-paths)
  - Analytics totals (totalCreditsUsed, creditsUsed, analyticsExtracted, etc. — anything not in the allowlist)
  - Identity fields, executionContent, completedAt, terminal-status executions

Audit: each patch appends an entry to metadata.adminPatchLog with { actor, apiKeyId, reason, diffs, timestamp }. This is the §8.1 short-term storage location — sufficient for the exception-only use case.

Returns: { patched, dryRun, auditId, diff, record }`,
        {
            workflowId: z.string().describe('The workflow ID'),
            executionId: z.string().describe('The execution ID being patched'),
            reason: z.string().min(1).max(500).describe('Why this patch is needed; persisted in the audit log'),
            expectedUpdatedAt: z.string().describe('The execution\'s current updatedAt (ISO). Required for optimistic concurrency.'),
            patches: z.array(z.object({
                op: z.literal('replace'),
                path: z.string().describe('Dot-path: e.g. "metadata.executionName"'),
                value: z.any(),
                expectedCurrentValue: z.any().optional(),
            })).min(1).describe('Array of replace operations (at most 12)'),
            dryRun: z.boolean().optional().describe('Compute diff without writing. Default false.'),
        },
        async ({ workflowId, executionId, reason, expectedUpdatedAt, patches, dryRun }, extra) => {
            const validated = validateAndNormalizePatches(patches);
            if (!validated.ok) {
                return { content: [validated.errorPayload] };
            }
            const client = clientFactory(extra);
            const result = await client.patchExecution(workflowId, executionId, {
                reason, expectedUpdatedAt, patches: validated.normalized, dryRun,
            });
            return {
                content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
            };
        }
    );
}
