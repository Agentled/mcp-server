/**
 * MCP Tools — Workflow CRUD + Validation + Lifecycle
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';
import { findStepShape, listShapesForStepType, STEP_SHAPES } from '../step-shapes.js';

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
        `Create a new workflow.

## KG-First — before you write any prompt content

If the workflow you're building contains workspace-specific content (investment thesis, ICP criteria, scoring rubrics, target sectors, brand voice, geo focus, seed lists), run this preflight before generating AI-step prompt strings:

1. **Inspect** — call \`list_memories\`, \`list_knowledge_lists\`, \`get_knowledge_text\` to see what already exists in the workspace KG.
2. **Seed** — if the content isn't in the KG yet, write it there first (\`store_memory\`, \`upsert_knowledge_text\`, \`upsert_knowledge_rows\`). Confirm with the user before seeding new content.
3. **Reference** — pull KG content at runtime in the step (\`kg.read-text\`, \`kg.read-list\`, \`recall_memory\`). Never paste workspace-specific paragraphs into prompt template strings.

**Boundary: strategy → KG; execution wiring → workflow context; workflow structure → workflow.**

## Recommended flow for agent-authored workflows

\`create_workflow({ name, goal })\` → \`add_step\` per step → \`validate_workflow\` → \`publish_workflow\`.

Call this with **only** \`name\` + \`goal\` — leave \`steps\` empty. Then \`add_step\` one step at a time. The incremental path catches errors immediately and surfaces \`{{input.X}}\` / \`{{steps.Y.Z}}\` bindings per-step. Internal testing: 0 errors incremental vs 13 errors bulk.

\`pipeline.steps\` is supported for imports/templates/round-trips only. Agents authoring from scratch should not use it.

## Pipeline object fields

- \`name\` (required), \`goal\`, \`description\`, \`context\`, \`metadata\`, \`style\`
- \`steps\`: Closed \`type\` values (others silently stripped): \`trigger\`, \`appAction\`, \`aiAction\`, \`aiActionWithTools\`, \`toolAction\`, \`code\`, \`knowledgeSync\`, \`return\`, \`milestone\`, \`share\`, \`wait\`, \`branch\`, \`parallel\`, \`loop\`, \`end_if\`, \`agentOrchestrator\`.

Prefer \`schedule\` triggers for email intake and non-real-time use — idempotent, no webhook infra. Use \`app_event\`/\`webhook\` only for "as soon as" / "real-time" requirements.

For child / sub-workflows that end in a \`return\` step and are only invoked via \`agentled.call-workflow\`, set \`context.executionInputConfig.internal: true\` to hide the Run button in the UI (see \`update_workflow\` for details).

## Step shape reference

Call \`get_step_schema({ stepType, shape? })\` for the authoritative field schema AND minimal JSON examples of every common step shape. The highest-friction shapes are:

- **Report step** (aiAction with Config renderer) — \`get_step_schema({ stepType: "aiAction", shape: "report" })\`.
- **Composed email with approval** — \`get_step_schema({ stepType: "aiAction", shape: "email" })\`. Use this with \`schedule-email\`; do not add Gmail/Outlook send appActions unless explicitly requested.
- **Agentic research** (web_search + workspace_memory) — \`get_step_schema({ stepType: "aiActionWithTools", shape: "agentic-search" })\`.
- **Agent Team** (agentOrchestrator) — \`get_step_schema({ stepType: "agentOrchestrator", shape: "supervisor" })\`.
- **Public share URL for a report** — \`get_step_schema({ stepType: "share", shape: "public" })\`.
- **KG field mapping** — \`get_step_schema({ stepType: "knowledgeSync", shape: "standard" })\`.
- **Code step** (JavaScript transformation) — \`get_step_schema({ stepType: "code", shape: "standard" })\`. JavaScript only — Python is not supported.

For app actions, call \`get_app_actions({ appId })\` for input/output schemas. For models, call \`list_models\`.

## Composable Step Blocks

**Search & Extract**: \`aiAction (queries) → appAction (search) → aiAction (extract)\`
⚠️ NEVER pass raw user input (job titles, topics) directly to a search API — always generate optimized boolean/keyword queries first.
**Enrich & Score**: \`appAction (fetch) → aiAction (score)\`
**Draft & Send**: \`aiAction email (pipelineStepPrompt.type="email") → [approval + schedule-email]\`
**Report & Notify**: \`aiAction report with Config renderer → share step → aiAction notification email with concise HTML overview + shareUrl\`
**Loop Enrich & Filter**: \`loopConfig on first step → appAction (enrich) → aiAction (score)\`

## Available Apps & Data Sources

**Before proposing data sources or sourcing channels to the user, you MUST know what is actually reachable.** The catalog has two billing models — don't conflate them, and don't invent connectors that don't exist. Always call \`list_apps\` and \`get_app_actions({ appId })\` to verify before finalizing a plan.

### Billed via Agentled credits (no user setup needed)

- **agentled native LinkedIn / email**: \`get-linkedin-profile-from-url\`, \`get-linkedin-company-from-url\`, \`find-email-person-domain\`, \`get-emails-from-company-domain\`.
- **agentled native LinkedIn search & content**: \`linkedin-post-search\` (keyword post search — primary LinkedIn discovery surface), \`linkedin-jobs\`, \`linkedin-profile-posts\`, \`linkedin-company-posts\`.
- **email finder**: \`hunter\`.
- **web fetch / scrape**: \`web-scraping.scrape\` (any URL → markdown), \`http-request.request\`, \`page-index\`.
- **browser automation**: \`browser-use.run-task\` / \`extract-data\`, \`anthropic-computer-use\`, \`openai-computer-use\`.
- **AI / image gen**: \`openai\`, \`google-gemini\`, \`mistral\`, \`bytedance\`, \`kling\`.
- **public data feeds**: \`french-gouv\`, \`google-maps\`, \`realtor\`, \`seloger\`, \`amazon\`, \`ad-intelligence\`, \`upwork\`, \`instagram\`, \`facebook\`.
- **knowledge graph**: \`kg.*\` (read-list, upsert-rows, update-rows, traverse-edges, etc.) — 1 credit per call.
- **comms**: \`gmail\`, \`google-calendar\`, \`webhook\` (Slack/Discord), \`notion\`.

### Bring-your-own-key (NOT billed via Agentled credits)

These require the user to connect their own account / paste their own API key. Treat them as available only if the user has the integration connected.
- \`crunchbase\` (user's Crunchbase API key)
- \`specter\` (user's Specter API key)
- \`affinity-crm\` (user's Affinity API key)
- \`phantombuster\` (user's PhantomBuster account — runs LinkedIn search agents, Sales Navigator scrapers, etc.)

When proposing one of these, ask "do you already have a <service> account connected?" before assuming you can use it.

### Built-in tools (for \`aiActionWithTools\` steps, not standalone apps)

\`web_search\`, \`file_search\`, \`code_interpreter\`, \`fetch_website_content\`, \`kg_search\`, \`kg_traverse\`, \`kg_nodes\`, \`kg_write\`, \`workspace_memory\`. Attach via the step's \`tools\` array; the AI decides at runtime whether to call them.

### Common gotchas

- Want LinkedIn keyword/post search? Use the native \`linkedin-post-search\` (Agentled credits) — see \`deal-sourcing-linkedin-founder-signals.ts\` for a reference workflow.
- Want LinkedIn Sales Navigator search / lead lists / company employees? \`phantombuster\` (BYOK) — see \`deal-sourcing-linkedin.ts\`.
- No native ProductHunt / EU-Startups / X-Twitter connector — use \`web-scraping.scrape\` on a known URL or \`web_search\` via \`aiActionWithTools\`.
- LinkedIn profile / company *enrichment* is URL-only (\`get-linkedin-profile-from-url\`). For discovery, pair it with \`linkedin-post-search\` or \`phantombuster\`.

## Multi-Workflow Architecture (Source → KG → Process)

When the user wants to "find leads", "source startups", "build a list to act on later", or run anything on a recurring cadence that produces entities to act on, **do not build one monolithic workflow**. Build several:

1. **One sourcing workflow per channel/theme** (e.g. "LinkedIn cybersecurity startups", "YC W25 batch", "ProductHunt this week"). Each runs on its own schedule and writes to a **shared KG list** via \`kg.upsert-rows\` with: \`userKey\` = stable id (URL/domain/LinkedIn URL) for O(1) dedup across runs; \`status: "new"\` to mark rows for downstream processing; \`mergeStrategy: "merge"\` so fields added later (scores, outreach status) survive re-upserts.
2. **One orchestrator/qualifier workflow** that runs on its own cadence (e.g. weekly), reads \`kg.read-list({ filters: { status: "new" } })\`, qualifies/scores each row against the current theme, then either dispatches to outreach or marks \`status: "qualified" / "rejected"\`.
3. **One outreach workflow** (often a child workflow called via \`agentled.call-workflow\`) that the orchestrator invokes for qualified rows.

Why split: sourcing cadences vary per channel, qualification criteria change per theme, outreach is approval-gated — combining them into one pipeline couples concerns that should evolve independently. Multiple sourcing workflows converging on one \`listKey\` is the canonical pattern.

When proposing this to the user, suggest the split explicitly ("I'll build N sourcing workflows + 1 qualifier + 1 outreach") rather than offering a single mega-workflow.

## Build incrementally — two first, then refactor, then the rest

When the plan calls for many sourcing workflows (or any N near-identical workflows), **do not build all N upfront**. Build two first, ship them end-to-end, then look at what's actually shared — most often the *tail*: normalize → kg.upsert-rows (with userKey + status: "new" + mergeStrategy: "merge") → milestone. Sometimes also the head: read theme/criteria from a config knowledge list.

Once the shared shape is clear:
1. Extract the common tail into a **child workflow** (terminal \`return\` step, \`context.executionInputConfig.internal: true\`) and have the two existing sourcing workflows call it via \`agentled.call-workflow\`.
2. Validate + run the two pilots end-to-end on the shared tail.
3. *Then* build the remaining sourcing workflows on top of that shared tail — they become small (just the source-specific search/scrape/extract head, then call the shared tail).

Why: building all N at once locks in mistakes and triples rework when the shared bits change. Two pilots surface the real shared shape; refactoring before scaling means workflows 3..N are short, consistent, and cheap to add. Don't pre-extract a child workflow before the second pilot exists — premature abstraction guesses wrong about what's actually shared.

## KG Status Lifecycle — multi-phase pipeline pattern

When the workflow scouts entities and acts on them across multiple phases (source → score → report → outreach → follow-up), use the \`status\` field on KG rows as a DB-indexed state machine. Filtering by a single status value (e.g. \`status: "new"\`) is an O(1) indexed lookup regardless of list size — never scan the full list and filter in code.

**Status values are user-defined** — choose names that map to your pipeline phases (e.g. \`new → scored → reported → email_sent → closed_*\`, or \`draft → review → approved → published\`). Document the state machine in the workflow goal or as a KG text entry.

Key rules:
- Sourcing writes \`status: "new"\` via \`kg.upsert-rows\` with \`mergeStrategy: "merge"\` (preserves downstream-added fields across re-runs).
- Each phase reads only its input status tier and advances rows to the next.
- Mark the next status **before** side-effects (email, share, Slack). If delivery fails, the row stays in the new status — it won't be double-sent on retry.
- Every upserted row needs a \`userKey\` (URL, domain, LinkedIn URL, email) for O(1) cross-run dedup.
- Use \`entryConditions.criteria[{ type: "loop_completion" }]\` with \`onCriteriaFail: "wait"\` before cross-phase reads that depend on a loop finishing.

The \`Loop Enrich & Filter\` block above hints at the same fan-in mechanism: for post-loop convergence, use \`entryConditions.criteria[{ type: "loop_completion" }]\` with \`onCriteriaFail: "wait"\` — do not use \`scope\` as the runtime wait mechanism.`,
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
        `Update an existing workflow.

## Recommended flow for agent-driven edits

For editing an existing workflow step-by-step, prefer the per-step tools — they catch errors incrementally and avoid the bulk-JSON vocabulary traps (\`ai\` / \`integration\` / \`knowledge_graph_query\`, silently-stripped root fields like \`prompt\` / \`listKey\` / \`appId\`):

- \`update_step({ workflowId, stepId, updates })\` — change one step (prompt, inputs, next, etc.). Safest and most common.
- \`add_step({ workflowId, step, insertAfter? })\` — append or insert a new step.
- \`remove_step({ workflowId, stepId })\` — delete a step and re-wire its neighbors.
- After a series of edits: \`validate_workflow\` → (if live) \`promote_draft\` / \`discard_draft\`.

The bulk \`updates\` param below is supported for **imports, templated rewrites, and programmatic round-trips** (export → edit JSON → re-import). Agents editing interactively should not use it for step changes — use \`update_step\` instead.

## Trigger type guidance

Prefer \`schedule\` (polling) for email intake, document processing, and any workflow where exact-millisecond latency is not required — it is idempotent, supports backfill, and needs no webhook infrastructure. Use \`app_event\` or \`webhook\` only when the user explicitly says "as soon as", "within X seconds", or "real-time". When in doubt, schedule wins.

## Draft routing (live workflows)

If the workflow is live, config edits (steps, context, name, etc.) are automatically routed to a draft snapshot instead of modifying the live pipeline. The response will include \`editingDraft: true\`. Use \`get_draft\` to view the draft, \`promote_draft\` to make it live, or \`discard_draft\` to throw away the changes. Non-live workflows are updated directly with an automatic pre-edit snapshot for rollback.

## Bulk updates param (imports / round-trips only)

⚠️ Avoid sending a full \`steps\` array for large workflows — use \`update_step\` instead.
Sending more than ~20 steps risks silent truncation at the MCP transport layer.
Full steps array replacement is only safe when doing a complete pipeline replacement from a known-good JSON source (import, template, export round-trip). For editing individual steps, always use \`update_step\`.

## \`context\` merge semantics (read before patching)

**Root level:** \`updates.context\` is **shallow-merged** with the stored workflow’s \`context\` (\`{ ...existingContext, ...patchContext }\`). Sibling keys at the root (\`inputPages\`, \`outputPages\`, \`executionInputConfig\`, etc.) do not clobber each other: **omitting a key preserves the stored value**; only keys present in the patch are overwritten. To clear a collection explicitly, send an empty value (e.g. \`inputPages: []\`). Silent deletion-by-omission no longer applies at the root — same spirit as \`update_step\`’s deep-merge for nested step fields.

**One level down:** Each **value** under \`context\` is still replaced **wholesale** when the patch includes that key. For example, \`context: { executionInputConfig: { someKey: "x" } }\` replaces the entire \`executionInputConfig\` object — any sibling fields under it (e.g. \`defaults\`, \`fields\`, \`internal\`) that are not in the payload are dropped. To partial-patch a nested object, **\`get_workflow\` first**, merge the current value with your changes client-side, then send the **full merged** object for that key in \`update_workflow\`.

**Surgical alternative (preferred for context/metadata):** \`update_workflow_context\` is the workflow-level analog of \`update_step\` — it accepts the same three explicit verbs (\`updates\` / \`replace\` / \`unset\`) on workflow-relative paths under \`context.<anything>\` (both page schemas like \`context.inputPages\` AND user-saved page values like \`context.outreachProfile\`) and \`metadata\`. Returns \`diff\` + \`warnings\`. Use it instead of bulk \`update_workflow\` for any context or metadata edit, including pre-filling configuration input pages programmatically (e.g. \`updates: { context: { outreachProfile: { name: "Alberto", signature: "..." } } }\`). To flip a single nested key like \`executionInputConfig.internal\`, fetch with \`get_workflow\` first, merge locally, then \`updates: { context: { executionInputConfig: {...full merged...} } }, replace: ["context.executionInputConfig"]\` — the same merge-order trap as \`update_step\` applies (deep-merge runs before replace[], so replace at the parent level).

## Internal-only workflows

Set \`context.executionInputConfig.internal: true\` to mark a workflow as a child / sub-workflow that runs only via \`agentled.call-workflow\`. The UI hides the Run button and replaces the manual run form with a banner; orchestrators still pass inputs via \`executionInputData\` (UI guard, not runtime restriction). Use for child workflows that end in a \`return\` step. To toggle on an existing workflow, fetch the current value with \`get_workflow\`, then call \`update_workflow_context\` with the explicit ops shape replacing at the parent level: \`updates: { context: { executionInputConfig: {...merged...} } }, replace: ["context.executionInputConfig"]\`.`,
        {
            workflowId: z.string().describe('The workflow ID to update'),
            updates: z.record(z.string(), z.any()).describe('Partial pipeline updates (name, steps, context, etc.)'),
            locale: z.string().optional().describe('Locale (default: en)'),
        },
        async ({ workflowId, updates, locale }, extra) => {
            const client = clientFactory(extra);

            const mcpWarnings: string[] = [];

            // Guard: inspect steps array if provided
            if (Array.isArray(updates.steps)) {
                const stepsJson = JSON.stringify(updates.steps);
                const sizeKB = Math.round(stepsJson.length / 1024);

                // Pre-flight size guard: warn if steps payload exceeds ~50KB
                if (stepsJson.length > 50 * 1024) {
                    mcpWarnings.push(
                        `Warning: steps array is large (${sizeKB}KB). Consider using update_step for individual ` +
                        `step changes to avoid payload truncation. Full array updates are risky above ~50KB.`
                    );
                }

                // Step count guard: reject if incoming steps are far fewer than the current workflow
                let currentStepCount = 0;
                try {
                    const current = await client.getWorkflow(workflowId);
                    const currentSteps = current?.workflow?.steps ?? current?.steps ?? [];
                    currentStepCount = Array.isArray(currentSteps) ? currentSteps.length : 0;
                } catch {
                    // Non-critical — skip count check if workflow can't be fetched
                }

                if (currentStepCount > 0 && updates.steps.length < currentStepCount - 5) {
                    throw new Error(
                        `Received only ${updates.steps.length} steps but workflow has ${currentStepCount}. ` +
                        `This likely means the payload was truncated. ` +
                        `Use update_step to modify individual steps instead of replacing the full array.`
                    );
                }
            }

            const result = await client.updateWorkflow(workflowId, updates, locale);

            const response = mcpWarnings.length > 0
                ? { ...result, mcpWarnings }
                : result;

            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(response, null, 2),
                }],
            };
        }
    );

    // --- Step-Level Operations ---

    server.tool(
        'add_step',
        `Add a new step to a workflow. **This is the recommended path for agent-authored workflows** — call \`create_workflow({ name, goal })\` first, then \`add_step\` one step at a time, then \`validate_workflow\` + \`publish_workflow\`.

Each call returns per-step validation errors immediately, so a bad step type / prompt template / missing required field is caught before the next step is built on top of it.

## KG-First — before writing prompt content into a step

Before writing an AI-step prompt that contains workspace-specific content (thesis, ICP criteria, scoring rubric, sector list, geo focus, brand voice, seed lists), check whether that content already lives in the workspace KG: call \`list_memories\` / \`list_knowledge_lists\` / \`get_knowledge_text\`. If it doesn't exist yet, seed it first (\`store_memory\` / \`upsert_knowledge_text\`) before adding this step. Then reference it at runtime in the prompt template via \`{{steps.read-kg.content}}\` rather than pasting the text inline.

**Boundary: strategy → KG; execution wiring → workflow context; workflow structure → workflow.**

## Required \`step\` fields (all types)

- \`id\`: stable string unique within the workflow.
- \`type\`: one of the closed list — \`trigger\`, \`appAction\`, \`aiAction\`, \`aiActionWithTools\`, \`toolAction\`, \`code\`, \`knowledgeSync\`, \`return\`, \`milestone\`, \`share\`, \`wait\`, \`branch\`, \`parallel\`, \`loop\`, \`end_if\`, \`agentOrchestrator\`. Any other string is silently stripped by the runtime.
- \`name\`: human-readable label.

Non-terminal steps also need \`next: { stepId }\` pointing to the next step. Terminal steps (\`milestone\`, \`return\`) omit \`next\`.

## Minimal shape by type

\`\`\`json
// trigger (manual)
{ "id": "start", "type": "trigger", "name": "Manual Start", "pipelineStepStartConditions": { "trigger": { "type": "manual" } }, "next": { "stepId": "next-step" } }

// aiAction — LLM prompt → structured JSON
{ "id": "analyze", "type": "aiAction", "name": "Analyze",
  "pipelineStepPrompt": { "template": "Analyze {{input.company_url}}", "responseStructure": { "summary": "string", "score": "number (0-100)" } },
  "creditCost": 10, "next": { "stepId": "next-step" } }

// appAction — call an app/integration action
{ "id": "enrich", "type": "appAction", "name": "Enrich Company",
  "app": { "id": "agentled", "actionId": "agentled.get-linkedin-company-from-url", "source": "native" },
  "stepInputData": { "profileUrls": "{{input.company_url}}" },
  "next": { "stepId": "next-step" } }
// → call \`get_app_actions({ appId })\` FIRST to get valid actionId + input field names for this app.

// aiActionWithTools — LLM agent invoking runtime tools
{ "id": "research", "type": "aiActionWithTools", "name": "Research",
  "tools": [{ "type": "builtin", "name": "web_search", "builtinType": "web_search" }],
  "pipelineStepPrompt": { "template": "Research {{input.topic}}", "responseStructure": { "summary": "string" } },
  "creditCost": 10, "next": { "stepId": "next-step" } }
// → call \`list_models\` for valid builtinType values (web_search, workspace_memory, kg_search, …).

// knowledgeSync — persist prior step output to a KG list
{ "id": "save", "type": "knowledgeSync", "name": "Save to KG",
  "knowledgeSync": { "source": { "stepId": "analyze", "resultsPath": "items" }, "listKey": "scored_companies", "fieldMapping": { "name": "name", "score": "score" } },
  "next": { "stepId": "done" } }

// milestone — terminal step for top-level workflows
{ "id": "done", "type": "milestone", "name": "Done" }
\`\`\`

## Variable references

- \`{{input.fieldName}}\` — input page field (defined in \`context.executionInputConfig.fields\` or \`context.inputPages[].configuration.fields\`).
- \`{{steps.stepId.fieldName}}\` — output of a prior step.
- \`{{currentItem.field}}\` — current item inside a \`loopConfig\` iteration.

Trigger step inputs are referenced as \`{{input.X}}\`, **not** \`{{steps.trigger-id.X}}\` — common agent mistake.

## Composable step blocks

When building multi-step workflows, apply these reusable patterns:
- **Search & Extract**: aiAction (generate queries) → appAction (search) → aiAction (extract). Never pass raw input to search APIs.
- **Enrich & Score**: appAction (fetch data) → aiAction (score). Always enrich before scoring.
- **Draft & Send**: aiAction email (pipelineStepPrompt.type="email") → approval with onApproval.action="schedule-email". Do not use Gmail/Outlook send appActions unless explicitly requested.
- **Report & Notify**: aiAction report with Config renderer → share step → aiAction notification email. Include \`{{steps.<shareStepId>.shareUrl}}\` in the email template and keep the body to an HTML overview + report link.
- **Scrape & Summarize**: appAction (scrape) → aiAction (summarize).
- **Loop Enrich & Filter**: loopConfig on first step only → appAction (enrich each) → aiAction (score/filter). Post-loop: aiAction to rank with \`entryConditions.criteria[{ type: "loop_completion" }]\` and \`onCriteriaFail: "wait"\`. Do not use \`scope\` as the runtime wait/fan-in mechanism; it only declares explicit container membership.
- **Multi-phase KG pipeline**: each phase reads its input status, processes rows, then advances them (kg.upsert-rows with initial status → kg.read-list by status → kg.update-rows to next status). Status values are user-defined per pipeline. Status is DB-indexed — always filter by a single equality value, never scan. Mark the next status BEFORE side-effects (email, share, Slack).
(Source of truth: COMPOSABLE_STEP_BLOCKS in workflowPatternExamples.ts)

## Positioning

Use \`insertAfter\` to place the step after an existing step ID. When \`rewireNext\` is true (default), the insertAfter step's \`next\` is updated to the new step, and the new step's \`next\` is set to what insertAfter previously pointed to — maintaining the chain. Validates step ID uniqueness. Respects draft snapshot routing for live workflows.`,
        {
            workflowId: z.string().describe('The workflow ID'),
            step: z.record(z.string(), z.any()).describe('The full step object (must include id, type, name, and type-specific config — see description for minimal shapes per type)'),
            insertAfter: z.string().optional().describe('Step ID to insert after. If omitted, appends to end.'),
            rewireNext: z.boolean().optional().describe('Auto-rewire next pointers (default: true). Set to false for manual wiring.'),
        },
        async ({ workflowId, step, insertAfter, rewireNext }, extra) => {
            const client = clientFactory(extra);
            const result = await client.addStep(workflowId, step, insertAfter, rewireNext);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'move_step',
        `Move a step to a new position in the workflow's steps array.

Provide exactly one target:
- \`insertAfter\`: place the step immediately after the given step ID.
- \`position: "first"\`: place the step at index 0. Use this to put a trigger
  back in first position after a remove + add cycle (the only way to recover
  trigger order via MCP — \`add_step\` always appends at the end).
- \`position: "last"\`: place the step at the end of the array.

Only the array order changes — NO next pointers or step config are modified.
This is a pure cosmetic reorder that fixes the "orchestrator-issue" validator warning
caused by steps being stored out of execution-chain order.

Use this when the validator reports:
  "Step X appears after Step Y but executes before it. Reorder the steps array..."

Works for both live workflows (via draft snapshot) and draft workflows.`,
        {
            workflowId: z.string().describe('The workflow ID'),
            stepId: z.string().describe('The step ID to move'),
            insertAfter: z.string().optional().describe('The step ID to insert after. Mutually exclusive with `position`.'),
            position: z.enum(['first', 'last']).optional().describe('Move the step to the first or last index of the array. Mutually exclusive with `insertAfter`. Use "first" to recover trigger position.'),
        },
        async ({ workflowId, stepId, insertAfter, position }, extra) => {
            if (!insertAfter && !position) {
                throw new Error('move_step requires either `insertAfter` or `position` ("first" | "last").');
            }
            if (insertAfter && position) {
                throw new Error('move_step accepts either `insertAfter` or `position`, not both.');
            }
            const client = clientFactory(extra);
            const target = position ? { position } : { insertAfter: insertAfter! };
            const result = await client.moveStep(workflowId, stepId, target);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'remove_step',
        `Remove a step from a workflow with optional next-pointer rewiring.

When rewireNext is true (default): steps that pointed to the removed step are rewired to
the removed step's next target. Entry condition criteria referencing the removed step are
also cleaned up. Respects draft snapshot routing for live workflows.`,
        {
            workflowId: z.string().describe('The workflow ID'),
            stepId: z.string().describe('The step ID to remove'),
            rewireNext: z.boolean().optional().describe('Auto-rewire next pointers around the removed step (default: true)'),
        },
        async ({ workflowId, stepId, rewireNext }, extra) => {
            const client = clientFactory(extra);
            const result = await client.removeStep(workflowId, stepId, rewireNext);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'update_step',
        `Update a single step in a workflow by step ID. **Preferred path for any single-step edit on an existing workflow** — only the fields in \`updates\` / \`replace\` / \`unset\` are touched, every other step and field is left as-is.

Use this instead of \`update_workflow\` for any one-step change (prompt, inputs, entry conditions, switching shape, swapping tools). \`update_workflow\` with a full \`steps\` array is for imports/round-trips only.

## KG-First — when editing a prompt template

If this edit introduces or changes workspace-specific content in a prompt template (thesis, ICP, rubric, sector list, geo focus, brand voice), check the KG first: call \`list_memories\` / \`list_knowledge_lists\` / \`get_knowledge_text\`. Seed the content there if it isn't already present, then reference it at runtime (\`{{steps.read-kg.content}}\`) instead of pasting text inline.

**Boundary: strategy → KG; execution wiring → workflow context; workflow structure → workflow.**

## Merge semantics

\`update_step\` accepts three independent operations on the same call. At least one must be non-empty.

- **\`updates\`** — partial step patch. Top-level fields are replaced; nested objects (\`pipelineStepPrompt\`, \`stepInputData\`, \`entryConditions\`, \`renderer\`, etc.) are deep-merged ONE LEVEL deep — keys nested two levels deep are overwritten as a unit, not merged. Arrays are replaced wholesale.
- **\`replace: string[]\`** — dot-paths (e.g. \`"stepInputData.fieldUpdates"\`) whose values from \`updates\` are assigned WHOLESALE onto the step, skipping the deep-merge. Use for dictionary-shaped fields where keys are user data.
- **\`unset: string[]\`** — dot-paths to DELETE. Each must exist on the original step.

## When to use which

| Situation | Verb | Example |
|---|---|---|
| Change one config key, keep siblings | \`updates\` | \`updates: { pipelineStepPrompt: { template: "new..." } }\` keeps \`responseStructure\` |
| Add a stepInputData entry | \`updates\` | \`updates: { stepInputData: { profileUrls: "{{input.url}}" } }\` |
| Replace a dictionary wholesale (keys = user data) | \`replace\` | \`updates: { stepInputData: { fieldUpdates: {...} } }, replace: ["stepInputData.fieldUpdates"]\` |
| Replace \`responseStructure\` / \`knowledgeSync.fieldMapping\` | \`replace\` | \`replace: ["pipelineStepPrompt.responseStructure"]\` |
| Remove a step input | \`unset\` | \`unset: ["stepInputData.oldKey"]\` |
| Swap full arrays (tools, integrations) | \`updates\` | \`updates: { tools: [...] }\` (arrays already replaced wholesale) |

**The trap.** Default deep-merge is one level deep — patching \`stepInputData.fieldUpdates\` with a partial dict silently wipes the others. Either send the FULL dict + \`replace: ["stepInputData.fieldUpdates"]\`, or call \`get_step\` first, edit locally, send back via \`replace\`.

## Read-before-write for dictionary fields

For dictionary fields where keys are user data (\`stepInputData.fieldUpdates\`, \`responseStructure\`, \`fieldMapping\`): \`get_step\` (~1KB), modify locally, send full object back under \`replace[]\`.

## Diff + warnings

Response includes \`diff: { addedPaths, changedPaths, removedPaths }\` and \`warnings[]\`. ≥6 fields removed without explicit \`unset\` triggers a warning — usually a "you wiped a dictionary" signal.

## Shape conversions

Fetch the canonical example before changing shape:
- email: \`get_step_schema({ stepType: "aiAction", shape: "email" })\`
- report: \`get_step_schema({ stepType: "aiAction", shape: "report" })\`
Send under \`updates\`, \`replace[]\` for dictionary children, \`unset[]\` for stale type-specific fields.

## Won't do

- **Cannot change \`step.id\`** — root id is immutable; API returns 400. Nested \`*.id\` is fine.
- **Does not enforce \`step.type\` immutability.** Stale type-specific fields (\`pipelineStepPrompt\`, \`app\`, \`tools\`) persist unless \`unset\`. For clean conversions, prefer \`remove_step\` + \`add_step\`.
- **Does not validate the merged result against shape rules** — call \`validate_workflow\` after edits.

## Draft routing (live workflows)

Edits are routed to a draft snapshot (\`editingDraft: true\` in response). Inspect via \`get_draft\`, ship via \`promote_draft\`, discard via \`discard_draft\`.

When a draft exists, the response carries a \`draft\` summary: \`{ exists, draftCreatedAt, liveUpdatedAt, stale, modifiedStepIds, modifiedFields }\`. **If \`draft.stale === true\`, the live workflow advanced past the draft** — promoting will land older values for fields you didn't touch. A staleness warning is pushed into \`warnings[]\`. Recovery: \`discard_draft\` + retry, or inspect via \`get_draft\` first.`,
        {
            workflowId: z.string().describe('The workflow ID'),
            stepId: z.string().describe('The step ID to update (e.g., "analyze", "scrape-company")'),
            updates: z.record(z.string(), z.any()).optional().describe('Partial step patch, one-level deep-merged into the existing step. Top-level fields are shallow-replaced; nested objects (pipelineStepPrompt, stepInputData, entryConditions, etc.) are deep-merged ONE LEVEL only — keys two levels deep are overwritten as a unit. Arrays are replaced wholesale. Optional if `replace` or `unset` is provided.'),
            replace: z.array(z.string()).optional().describe('Dot-paths (e.g. "stepInputData.fieldUpdates") whose values in `updates` should be assigned wholesale, skipping deep-merge. Use for dictionary-shaped fields where keys are user data (responseStructure, fieldUpdates, fieldMapping). Each listed path must have a corresponding value in `updates`.'),
            unset: z.array(z.string()).optional().describe('Dot-paths to delete from the step. Each must currently exist on the step (validated against the original, not the post-merge state).'),
        },
        async ({ workflowId, stepId, updates, replace, unset }, extra) => {
            const client = clientFactory(extra);
            const result = await client.updateStep(workflowId, stepId, { updates, replace, unset });
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'get_step',
        `Read a single step from a workflow by step ID. Cheap alternative to \`get_workflow\` (typically ~1KB vs 50-200KB for a full workflow).

**Use this before editing dictionary-shaped fields** (\`stepInputData.fieldUpdates\`, \`responseStructure\`, \`knowledgeSync.fieldMapping\`, \`agent.workers\`) so you can fetch the current value, modify it locally, and send the full new object back via \`update_step\` with \`replace: ["<path>"]\`. Avoids the "patched one key, silently wiped the others" trap.

## Source resolution

- \`source: "auto"\` (default) — returns the draft step if a draft exists, else live. Matches \`update_step\`'s routing for live workflows.
- \`source: "live"\` — always reads from the live pipeline, ignoring any draft.
- \`source: "draft"\` — returns the draft step or 404 if no draft exists. Never creates a draft.

The response includes the resolved \`source: "live" | "draft"\` so you know which one you got.

## Response shape

\`\`\`
{
  workflowId, stepId, source,
  step: <PipelineStep>,
  contextRefs: {
    inputPagesUsed: ["company_url", ...],   // {{input.X}} references found in the step
    stepRefs: ["fetch", "analyze", ...]      // {{steps.X.*}} references found in the step
  },
  draft?: {                                   // present when a draft snapshot exists
    exists: true,
    draftCreatedAt, liveUpdatedAt,
    stale: boolean,                           // live advanced past draft.createdAt
    modifiedStepIds: [...],                   // step IDs differing between draft and live
    modifiedFields: ["steps", "context", ...] // top-level keys differing
  }
}
\`\`\`

\`contextRefs\` tells you which upstream fields the step depends on — useful when you're about to break a downstream chain by editing inputs.

\`draft.stale === true\` means the live workflow has been touched since the draft was created. Promoting will land older values for fields the agent didn't touch in this draft. Recovery: \`discard_draft\` and re-apply, or \`get_draft\` to inspect what's pending.`,
        {
            workflowId: z.string().describe('The workflow ID'),
            stepId: z.string().describe('The step ID to read (e.g., "analyze", "scrape-company")'),
            source: z.enum(['auto', 'live', 'draft']).optional().describe('Which config to read from. "auto" (default) returns draft if one exists, else live. "draft" returns 404 if no draft. Never creates a draft.'),
        },
        async ({ workflowId, stepId, source }, extra) => {
            const client = clientFactory(extra);
            const result = await client.getStep(workflowId, stepId, source ?? 'auto');
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'update_workflow_context',
        `Surgical edit of \`workflow.context\` (and \`workflow.metadata\`) — the workflow-level analog of \`update_step\`. Does NOT reach into \`steps\` (use \`update_step\` for that).

## Calling shape (preferred): three explicit verbs

\`{ updates, replace, unset }\` — same merge model as \`update_step\`, but on **workflow-relative paths**. At least one must be non-empty.

- **\`updates\`** — partial workflow patch. Top-level keys are limited to \`context\` and \`metadata\`. Each is shallow-merged (\`{ ...stored, ...patch }\`) so omitting a sibling preserves it. Direct sub-objects under \`context\` (e.g. \`executionInputConfig\`) are still replaced wholesale by default — use \`replace[]\` for explicit deep replacement, \`unset[]\` for deletion.
- **\`replace: string[]\`** — workflow-relative dot-paths whose values from \`updates\` are assigned WHOLESALE, skipping the deep-merge. Path examples: \`"context.executionInputConfig.fields"\`, \`"context.inputPages"\`, \`"metadata.tags"\`. The path's value MUST be present in \`updates\`.
- **\`unset: string[]\`** — workflow-relative dot-paths to delete. Each must currently exist on the workflow.

## What lives under \`context\`

\`workflow.context\` holds two things, side by side as siblings:

1. **Page schemas** — \`context.inputPages\`, \`context.outputPages\`, \`context.executionInputConfig\`. Field definitions, defaults, shortDescriptionFields, etc.
2. **User-saved page values** — \`context.<contextKey>\`, where \`<contextKey>\` mirrors a page's \`contextKey\`. e.g. \`context.outreachProfile\`, \`context.cadence\`, \`context.introductionWorkflow\`. These are the values a user persists when clicking "Save" on a configuration input page.

### Page entry shapes (read these BEFORE writing to \`context.outputPages\` or \`context.inputPages\`)

The workflow detail UI crashes on load if a page entry is missing required fields, and \`validate_workflow\` now rejects bad shapes with \`MISSING_OUTPUT_PAGE_FIELD\` / \`INVALID_OUTPUT_STEPS_TYPE\`.

- **\`context.outputPages\`** — \`PipelineOutputPage[]\`. Authoritative example: \`get_step_schema({ stepType: "outputPage", shape: "standard" })\`.
  - Required: \`id\` (string, unique), \`title\` (string), \`pathname\` (string, URL slug), \`outputSteps\` (string[] of step IDs that exist in \`workflow.steps\`).
  - Optional: \`description\`, \`iconName\`, \`displayConfig.showExecutionsList\` (boolean), \`displayConfig.executionNameTemplate\`, \`displayConfig.filterStatuses\`, \`displayConfig.defaultFilterStatus\`, \`displayConfig.sortField\`, \`displayConfig.sortDirection\`.
- **\`context.inputPages\`** — \`PipelineInputPage[]\`. Authoritative example: \`get_step_schema({ stepType: "inputPage", shape: "standard" })\`.
  - Required: \`title\`, \`pathname\`, \`configuration.contextKey\`, \`configuration.fields[]\`. Saved values land at \`context.<contextKey>\` (sibling).

Both shapes are dictionaries the workflow author owns, both are read at runtime via \`{{context.<key>.<field>}}\`, and both are edited through this tool with the same three-verb model. To pre-fill a config page programmatically:

\`\`\`jsonc
update_workflow_context({
  workflowId,
  updates: { context: { outreachProfile: { name: "Alberto", signature: "<p>Best, Alberto</p>" } } }
})
\`\`\`

Sibling context keys are preserved by the one-level deep-merge. Live workflows route to draft.

## Allowed path scope (both replace and unset)

Paths must begin with one of:

- \`context.<anything>\` — page schemas (\`context.inputPages\`, …) or user-saved page values (\`context.outreachProfile\`, \`context.cadence\`, …).
- \`metadata\` (exact, or any \`metadata.*\` sub-path).

Anything else (e.g. \`steps.*\`, \`name\`, \`goal\`, \`status\`) is rejected with \`PATH_OUT_OF_SCOPE\`. Use \`update_step\` for step-level edits and \`update_workflow\` for top-level scalars (\`name\`, \`goal\`, \`description\`, \`style\`).

## Diff and warnings

The ops shape returns \`diff: { addedPaths, changedPaths, removedPaths }\` and \`warnings[]\`. If ≥6 fields were silently removed without an explicit \`unset\`, a warning fires — that's usually a "you wiped a dictionary" signal. Read it.

## Errors (400)

| Code | When |
|---|---|
| \`EMPTY_PAYLOAD\` | All three of \`updates\`/\`replace\`/\`unset\` are missing or empty. |
| \`INVALID_PATH\` | Dot-path syntax violation (empty segment, leading/trailing dot, prototype-pollution segment). |
| \`PATH_OUT_OF_SCOPE\` | Path is not under \`context.<anything>\` or \`metadata\` (e.g. \`steps.*\`, \`name\`). |
| \`REPLACE_VALUE_MISSING\` | A \`replace[]\` path has no corresponding value in \`updates\`. |
| \`UNSET_PATH_NOT_FOUND\` | An \`unset[]\` path doesn't exist on the workflow. |

## Draft routing (live workflows)

Context edits are routed to a draft snapshot (\`editingDraft: true\`). Metadata is NOT part of the snapshot config — metadata edits write directly to the Pipeline row, **immediately and on the live workflow**.

⚠ **Mixed metadata + context in one call**: metadata is applied immediately while context goes to the pending draft. \`discard_draft\` reverts the pending context changes but **does NOT revert metadata**. If you need a single atomic checkpoint covering metadata too, call \`create_snapshot\` first, or split the call.

## Compatibility body shape

A legacy \`{ contextKey, value }\` shape is still accepted for one-shot wholesale replacement of a single root context key (\`inputPages\` / \`outputPages\` / \`executionInputConfig\` only — saved-values keys are not reachable through this shape). It does not return \`diff\` / \`warnings\` and cannot edit metadata. Prefer the three-verb shape above for new code.

## Recipes

\`\`\`jsonc
// Add a single field to executionInputConfig.fields without rebuilding the array.
// Step 1: get_workflow → read context.executionInputConfig.fields
// Step 2:
{
  updates: { context: { executionInputConfig: {...full new value with the appended field...} } },
  replace: ["context.executionInputConfig"]
}

// Replace inputPages wholesale.
{
  updates: { context: { inputPages: [...new pages...] } },
  replace: ["context.inputPages"]
}

// Pre-fill a config page (user-saved values land at context.<contextKey>).
// Uses one-level deep-merge under updates.context — sibling saved-values
// dictionaries are preserved.
{
  updates: { context: { outreachProfile: { name: "Alberto", signature: "<p>Best, Alberto</p>" } } }
}

// Wholesale-replace a single saved-values dictionary.
{
  updates: { context: { cadence: { firstNudgeDays: 3, secondNudgeDays: 7 } } },
  replace: ["context.cadence"]
}

// Delete a saved-values dictionary.
{ unset: ["context.introductionWorkflow"] }

// Add a metadata tag.
{ updates: { metadata: { tags: ["beta"] } } }

// Delete an obsolete metadata key.
{ unset: ["metadata.legacyFlag"] }

// Toggle executionInputConfig.internal: fetch first (get_workflow), merge locally, replace at the
// PARENT level. The one-level deep-merge under updates.context wipes nested-object siblings BEFORE
// replace[] runs (same merge-order trap as update_step) — so replace at "context.executionInputConfig"
// (not ".internal") and pass the full object in updates.
{
  updates: { context: { executionInputConfig: {...full merged executionInputConfig with internal: true...} } },
  replace: ["context.executionInputConfig"]
}
\`\`\`

Response: \`{ editingDraft?, context, metadata?, diff?, warnings?, validation }\`.`,
        {
            workflowId: z.string().describe('The workflow ID'),
            contextKey: z.enum(['inputPages', 'outputPages', 'executionInputConfig']).optional().describe(
                'Compatibility shape only. Prefer `updates`/`replace`/`unset`. The context key to replace wholesale.'
            ),
            value: z.any().optional().describe(
                'Compatibility shape only. New value for `contextKey`. Pass [] to clear a list.'
            ),
            updates: z.record(z.string(), z.any()).optional().describe(
                'Partial workflow patch keyed by `context` and/or `metadata`. Each is shallow-merged with the stored value; omitting siblings preserves them. Direct sub-objects (e.g. context.executionInputConfig) replace wholesale unless paired with replace[].'
            ),
            replace: z.array(z.string()).optional().describe(
                'Workflow-relative dot-paths whose values in `updates` are assigned wholesale. Allowed scope: any path under `context.<anything>` (page schemas like context.inputPages OR user-saved page values like context.outreachProfile) and `metadata`.'
            ),
            unset: z.array(z.string()).optional().describe(
                'Workflow-relative dot-paths to delete. Same allowed scope as replace[]. Each must currently exist on the workflow.'
            ),
        },
        async ({ workflowId, contextKey, value, updates, replace, unset }, extra) => {
            const client = clientFactory(extra);
            const usingOps = updates !== undefined || replace !== undefined || unset !== undefined;
            const result = usingOps
                ? await client.updateWorkflowContext(workflowId, { updates, replace, unset })
                : await client.updateWorkflowContext(workflowId, contextKey as 'inputPages' | 'outputPages' | 'executionInputConfig', value);
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
        `Permanently delete a workflow by ID. This cannot be undone.

**Two-phase flow (required):**
1. Call with just \`workflowId\` to get a deletion preview. Response:
   \`{ pendingDelete: true, id, name, status, relatedEntities: { executions, leads, timelines }, relatedEntitiesTruncated, confirmToken, expiresIn: 300, expiresAt, message }\`
   Nothing is deleted in phase 1. Token is valid for 5 minutes.
2. Call again with both \`workflowId\` AND \`confirmToken\` to perform the cascade delete.
   Response: \`{ deleted: true, id }\`.

**Server error responses (always structured JSON):**
- \`404 { error: "Workflow not found" }\` — wrong ID or wrong workspace.
- \`403 { error: "Invalid or expired confirmation token. Request a new deletion preview first." }\` — token typo, expired, or workspace/workflow mismatch.
- \`500 { error: "Failed to delete workflow" }\` — cascade failure (rare; safe to retry phase 2 with a fresh token).

**If you see a bare "Denied." with no detail, that is your MCP host (Claude Desktop / Cursor / etc.)
denying the destructive call at the approval-policy layer, not this server.** Agentled never returns
"Denied." — every error from this tool includes a JSON body. Check the host's tool-permission settings
and re-approve, then retry.`,
        {
            workflowId: z.string().describe('The workflow ID to delete'),
            confirmToken: z.string().optional().describe('Confirmation token from phase 1. If omitted, returns a deletion preview instead of deleting. The token is short-lived (~5 minutes); on expiry, request a new preview.'),
        },
        async ({ workflowId, confirmToken }, extra) => {
            const client = clientFactory(extra);
            const result = await client.deleteWorkflow(workflowId, confirmToken);
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
        `List config snapshots for a workflow, paginated across all pages (cap 500).
Snapshots are automatically captured before every external API update, allowing you to
restore a previous configuration. Includes both saved versions and unpublished drafts.
Use filter to narrow results: "all" (default, includes drafts), "saved" (no drafts), or
"draft" (drafts only). Returns snapshot ID, timestamp, source, and which fields changed.`,
        {
            workflowId: z.string().describe('The workflow ID'),
            filter: z.enum(['all', 'saved', 'draft']).optional().describe(
                'Filter snapshots by type. Default "all" includes drafts.'
            ),
        },
        async ({ workflowId, filter }, extra) => {
            const client = clientFactory(extra);
            const result = await client.listSnapshots(workflowId, filter ?? 'all');
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'get_snapshot_content',
        `Read the full content of a config snapshot WITHOUT restoring it. Returns the captured
\`steps\`, \`context\`, \`name\`, \`description\`, \`goal\`, \`style\`, and \`analyticsConfig\`
under a \`config\` field, plus snapshot metadata (createdAt, source, label, updatedFields).
Use this to inspect or compare an old snapshot against the live workflow without the
destructive create + restore + restore dance. No quota cost.`,
        {
            workflowId: z.string().describe('The workflow ID'),
            snapshotId: z.string().describe('The snapshot ID to read (from list_snapshots)'),
        },
        async ({ workflowId, snapshotId }, extra) => {
            const client = clientFactory(extra);
            const result = await client.getSnapshotContent(workflowId, snapshotId);
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

    server.tool(
        'get_step_schema',
        `Get allowed fields and minimal JSON examples for pipeline steps.

Unknown fields are automatically stripped on save — only fields listed here are persisted.

## Params

- \`stepType\` (optional): filter to one of \`trigger\`, \`aiAction\`, \`aiActionWithTools\`, \`appAction\`, \`agentOrchestrator\`, \`code\`, \`knowledgeSync\`, \`share\`, \`return\`, \`milestone\`, etc. Omit for the full schema.
- \`shape\` (optional): minimal JSON example for a specific shape. Requires \`stepType\`. Examples:
  - \`aiAction\` shapes: \`standard\`, \`report\` (with Config renderer), \`email\` (composed email with approval).
  - \`aiActionWithTools\` shapes: \`standard\`, \`agentic-search\` (web_search + workspace_memory).
  - \`agentOrchestrator\` shapes: \`supervisor\` (Agent Team preset).
  - \`share\` shapes: \`public\` (public URL for a report step).
  - \`knowledgeSync\` shapes: \`standard\` (deterministic KG field mapping).
  - \`outputPage\` shapes: \`standard\` — workflow-level output page schema for \`context.outputPages\` (NOT a pipeline step; edit via \`update_workflow_context\`).
  - \`inputPage\` shapes: \`standard\` — workflow-level configuration input page schema for \`context.inputPages\`.

## Response shape

\`\`\`
{
  "description": "...",               // schema description
  "fieldCount": <number>,             // total fields (scoped to stepType when provided)
  "groups": [<field groups>],         // schema groups (scoped to stepType when provided)
  "shapes": [<shape examples>]        // only when stepType is set
}
\`\`\`

Top-level keys are backward-compatible with pre-v0.11 callers that read \`description\`/\`groups\` directly.

## When to call

- **Before adding a report step**: \`get_step_schema({ stepType: "aiAction", shape: "report" })\`.
- **Before adding a composed-email step**: \`get_step_schema({ stepType: "aiAction", shape: "email" })\` — remember to also add an \`outreachProfile\` input page.
- **Before adding an Agent Team**: \`get_step_schema({ stepType: "agentOrchestrator", shape: "supervisor" })\`.
- **Before adding an aiActionWithTools step**: \`get_step_schema({ stepType: "aiActionWithTools" })\`, then \`agentled tools builtins\` for the closed \`builtinType\` list.
- **Before adding a code step**: \`get_step_schema({ stepType: "code", shape: "standard" })\`. Note: only JavaScript is supported — Python will fail at runtime.
- **Before writing to \`context.outputPages\`**: \`get_step_schema({ stepType: "outputPage", shape: "standard" })\`. Required fields: \`id\`, \`title\`, \`pathname\`, \`outputSteps[]\` — missing any crashes the workflow detail UI on load.
- **Before writing to \`context.inputPages\`**: \`get_step_schema({ stepType: "inputPage", shape: "standard" })\`. Saved values land at sibling \`context.<contextKey>\`.

## Trigger type guidance

Prefer \`schedule\` (polling) for email intake, document processing, and any workflow where sub-minute latency is not required. Use \`app_event\` or \`webhook\` only when the user explicitly requires real-time delivery (e.g. "as soon as", "within 30 seconds"). When in doubt, schedule wins — it is idempotent, supports backfill, and needs no event infrastructure.`,
        {
            stepType: z.string().optional().describe('Filter the schema/examples to a single step type (e.g. "aiAction", "share").'),
            shape: z.string().optional().describe('Return a minimal JSON example for a named shape. Requires stepType. E.g. "report", "email", "agentic-search", "supervisor".'),
        },
        async ({ stepType, shape }, extra) => {
            const client = clientFactory(extra);
            const schema = await client.getStepSchema();

            // Backward compat: spread the API response at the top level
            // (pre-MCP-033 callers read result.description, result.groups directly)
            const result: Record<string, unknown> = { ...schema };

            // Filter schema groups by stepType when provided
            if (stepType && result.groups && Array.isArray(result.groups)) {
                result.groups = (result.groups as Array<{ category: string; fields: Array<{ stepTypes?: string[] }> }>)
                    .map(group => ({
                        ...group,
                        fields: group.fields.filter(f => !f.stepTypes || f.stepTypes.includes(stepType)),
                    }))
                    .filter(group => group.fields.length > 0);
                result.fieldCount = (result.groups as Array<{ fields: unknown[] }>)
                    .reduce((sum, g) => sum + g.fields.length, 0);
            }

            // Enforce: shape requires stepType
            if (shape && !stepType) {
                result.error = `\`shape\` requires \`stepType\`. Example: get_step_schema({ stepType: "aiAction", shape: "${shape}" }).`;
            } else if (stepType) {
                if (shape) {
                    const match = findStepShape(stepType, shape);
                    if (match) {
                        result.shapes = [match];
                    } else {
                        const available = listShapesForStepType(stepType).map((s) => s.shape);
                        result.shapes = [];
                        result.error = available.length
                            ? `Unknown shape "${shape}" for stepType "${stepType}". Available shapes: ${available.join(', ')}.`
                            : `No shape examples registered for stepType "${stepType}". Call without \`shape\` to see the field schema.`;
                    }
                } else {
                    result.shapes = listShapesForStepType(stepType);
                }
            }

            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );
}

// Re-export for tests and CLI mirror
export { STEP_SHAPES };
