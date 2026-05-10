---
name: agentled
version: 0.6.0
description: Build, manage, and execute Agentled AI workflows via MCP tools. Use when the user asks to create workflows, automate tasks, enrich leads, scrape websites, find emails, manage executions, or interact with any Agentled workspace capability.
user-invocable: false
---

# Agentled Workflow Automation

You have access to the Agentled MCP server which lets you create, manage, and execute AI-powered workflows. Use these tools to help the user automate business processes.

## Goal and bottleneck first

Before designing any workflow, determine what the user is actually trying to achieve and where the real bottleneck is. Agents that skip this step build the wrong system.

**Two common failure modes:**
- Building a full operating system when the user needed one workflow (wrong scope).
- Optimizing for theme curation or content quality when the bottleneck is paid conversion or reply handling (wrong objective).

**The design loop:**
1. Orient — inspect the workspace (identity, company profile, KG lists, connected apps, existing workflows, existing agents).
2. Infer — determine the likely goal and bottleneck from workspace context.
3. Ask — if the business direction is genuinely ambiguous, ask a few targeted questions.
4. Brief — produce a short build brief (goal, assumptions, assets to reuse, KG lists, workflow group, risks, cost hotspots, build order).
5. Build — create workflows incrementally from the brief.

> For multi-workflow systems, produce a group manifest before touching live workflow state. See `docs/GROUP_MANIFEST.md`.

## What to ask — and what not to ask

After orientation, ask **at most three to five** targeted questions. Focus only on what the workspace inspection cannot answer.

**Good questions:**
- "What is the primary goal: source more paying leads, run each event smoothly, or report pipeline health?"
- "Where is the bottleneck today: finding leads, getting replies, converting to paid, or operational follow-up?"
- "What is the system of record for payments/bookings right now: Stripe webhook, a booking page, a manual form, or a KG list?"
- "Which actions must be approval-gated: customer emails, status changes, or all customer-facing messages?"
- "What success metric should this optimize: conversions per week, leads contacted, confirmations, fill rate, or operator time saved?"

**Do not ask:**
- Step type names, app action names, schema syntax, or implementation details — discover these from `get_step_schema`, `list_apps`, and `get_app_actions`.
- Every possible future integration question before the first useful slice is designed.
- Anything answerable by calling `get_workspace`, `get_workspace_company_profile`, `list_workflows`, `list_knowledge_lists`, `list_connections`, or `list_agents`.

## Valid step types (closed list)

Every pipeline step **must** set `type` to one of these values. Any other value is silently normalised/rejected and the step won't execute. For full input/output schemas call `get_step_schema`.

<!-- agentled-step-types:start -->
| `type` | Purpose | Minimal shape |
|--------|---------|---------------|
| `trigger` | Entry point (manual / schedule / webhook / app event) | `{ id, type: "trigger", name, pipelineStepStartConditions: { trigger: { type: "manual" } }, next: { stepId } }` |
| `appAction` | Call an app/integration action (LinkedIn, Gmail, KG, HTTP, …) | `{ id, type: "appAction", name, app: { id, actionId, source: "native" }, stepInputData: {…}, next: { stepId } }` |
| `aiAction` | LLM prompt → structured JSON output | `{ id, type: "aiAction", name, pipelineStepPrompt: { template, responseStructure }, creditCost, next: { stepId } }` |
| `aiActionWithTools` | LLM agent that can invoke runtime tools (web_search, workspace_memory, app actions) | `{ id, type: "aiActionWithTools", name, tools: [{ builtinType }], pipelineStepPrompt: {…}, next: { stepId } }` |
| `toolAction` | Direct tool/webhook invocation (no LLM) | `{ id, type: "toolAction", name, tool: {…}, next: { stepId } }` |
| `code` | Run JS/Python in a sandbox | `{ id, type: "code", name, codeConfig: { language: "javascript", code: "…" }, next: { stepId } }` |
| `setVariables` | Deterministic expression → named output mapping (branch convergence, no LLM/credits) | `{ id, type: "setVariables", name, setVariablesConfig: { variables: [{ name, expression }] }, next: { stepId } }` |
| `knowledgeSync` | Deterministic KG field mapping & link writing | `{ id, type: "knowledgeSync", name, knowledgeSync: { source, listKey, fieldMapping }, next: { stepId } }` |
| `return` | Terminal step for **child** workflows — returns data to the caller | `{ id, type: "return", name, returnConfig: { fields: [{ name, stepId, field }] } }` |
| `milestone` | Terminal step for **top-level** workflows | `{ id, type: "milestone", name }` |
| `share` | Create a public share URL for prior step output | `{ id, type: "share", name, shareConfig: { outputSteps, visibility }, next: { stepId } }` |
| `wait` | Delay / pause between steps | `{ id, type: "wait", name, waitConfig: { durationMs } | { untilISO }, next: { stepId } }` |
| `branch` | Conditional routing to one of several paths | `{ id, type: "branch", name, branchConfig: { branches: [...] }, next: [...] }` |
| `parallel` | Fan-out to parallel branches | `{ id, type: "parallel", name, parallelConfig: { branches: [...] }, next: { stepId } }` |
| `loop` | Iterate over a collection as a first-class step (prefer `loopConfig` on an action step for most cases) | `{ id, type: "loop", name, loopConfig: {…}, next: { stepId } }` |
| `end_if` | Conditional gate that stops the pipeline when criteria fail | `{ id, type: "end_if", name, entryConditions: {…} }` |
| `agentOrchestrator` | Multi-agent orchestration (supervisor / debate / parallel) | `{ id, type: "agentOrchestrator", name, orchestratorConfig: {…}, next: { stepId } }` |
| `manualAction` | Legacy — kept for backward compatibility; prefer `aiAction` or `appAction` |  |
| `systemAction` | Legacy — kept for backward compatibility; prefer `appAction` |  |
<!-- agentled-step-types:end -->

> Use `get_step_schema` to retrieve the authoritative input/output schema for any step type.

## Before you build: read the schema and the patterns

Before writing pipeline JSON, pull the canonical field schema and the matching best-practice pattern. This is **mandatory** when authoring any new step type, trigger, or routing pattern — skipping it is how agents end up inventing `type: "ai"` or `knowledge_graph_query`.

**Via MCP (in-session):**
- `get_step_schema` — authoritative list of valid fields per step type.
- `list_apps` / `get_app_actions` — exact `app.id` + `actionId` values and their input schemas.

**Via CLI (shell access):**
```
agentled schema --step-type aiAction              # fields valid on an aiAction step
agentled schema --context                          # valid input-page / context field types (MCP-029)
agentled tools builtins                            # valid aiActionWithTools builtinType values (MCP-030)
agentled examples                                   # list all patterns
agentled examples trigger-design                    # print the full pattern
agentled workflows scaffold --list                  # list working pipeline skeletons
agentled workflows scaffold lead-scoring-kg --out pipeline.json
agentled workflows scaffold ai-with-tools --out pipeline.json   # aiActionWithTools starter
agentled workflows validate --file pipeline.json   # fast client-side preflight (no API)
agentled workflows create --file pipeline.json     # full server validation on save
agentled best-practices                             # summary + link to agentic-ops repo
```

> **Silent-strip failures caught by preflight:** invalid `type` on a context / input-page field (e.g. `"multi-select"`, `"checkbox"`, `"number"`) and invalid `builtinType` on an `aiActionWithTools` tool (e.g. `"web-search"`, `"memory"`) both get silently stripped by the runtime — `workflows validate` now flags them with a "did you mean" fix.

**Which pattern to read, by task:**

| You're building… | Read pattern | Scaffold |
|------------------|--------------|----------|
| Anything triggered by email, schedule, webhook, or app event | `01-trigger-design` (polling vs events) | `email-polling-dedup` |
| Any email/intake workflow that must not double-process | `02-dedup-gates` (label-based idempotency) | `email-polling-dedup` |
| A workflow that calls LLMs, scraping, or paid app actions | `03-credit-efficiency` (caching, retry, mocks) | — |
| Anything using `loopConfig` or iterating a list | `04-loop-patterns` | `lead-scoring-kg` |
| A child workflow called via `call-workflow` | `05-child-workflow-contracts` (use `return`, not `milestone`) | — |
| Multi-path routing by score / category / condition | `06-conditional-routing` (`entryConditions.criteria`, not `conditions`) | `extract-threshold-alert` |
| Anything that can fail on upstream provider errors | `07-error-handling` (`failureHandling`, retries) | — |
| **Outreach** — personalized email with user approval | `08-composed-email-approval` (`pipelineStepPrompt.type: "email"` + approval + `schedule-email`; add outreachProfile only for user-selected connected senders) | `list-match-email` |
| **Report / dashboard** — structured output + sharing + KPI history | `09-reports-and-knowledge-storage` (Config renderer + share step + optional notification email with report URL) — see § Pattern A (scoringHeader + dimensionScores for any 0–100 scored output) and § Pattern B (funnel for orchestrator digests) | `lead-scoring-kg`, `extract-threshold-alert` |
| **Scored AI output** (any step that produces a 0–100 score, decision, and per-dimension breakdown) | `09-reports-and-knowledge-storage` § Pattern A — `scoringHeader` + `dimensionScores` + rubric `table`, NOT a wall of `markdown` blocks | — |
| **Orchestrator digest** (pipeline health, daily/weekly summary, batch report) | `09-reports-and-knowledge-storage` § Pattern B — `funnel` block with `stages: [{ label, valuePath, icon }]` for stage-by-stage attrition | — |
| **Multi-workflow system** — workflows sharing KG state and status transitions | `12-event-driven-workflow-groups` (group manifest, state machines, build order) | — |

Full patterns are maintained publicly at https://github.com/agentled/agentic-ops — the CLI ships a mirrored copy, see `agentled examples`. Scaffolds are preflight-clean pipeline JSON skeletons; start from one instead of writing from scratch.

## Business metrics vs ROI (must not be conflated)

Treat these as **two separate surfaces**:

- **Business metrics (`pipeline.analyticsConfig`)** = customer/workflow outcome stats extracted from step outputs (volume, conversions, approvals, rates, SLA-ish KPIs), aggregated into dashboard business-metric snapshots.
- **ROI (`pipeline.metadata.roi`)** = economic assumptions + rollups (minutes saved per unit, hourly rate, benchmark units/week, measured vs benchmark mode) used for ROI/time-saved reporting.

### Required wording for agent outputs

- If only `analyticsConfig` changes: say **"business metrics configured"**.
- If only `metadata.roi` changes: say **"ROI assumptions configured"**.
- If both change: report each section separately; never label analytics metrics as ROI metrics.

This distinction applies to MCP and CLI users equally because both surfaces call the same external workflow API and return the same pipeline shape.

## Common invalid patterns to avoid

Agents routinely invent step types that sound plausible. The API **silently strips unknown top-level fields** and stores the step, so you get a 201 Created on a workflow that will never execute. Watch for these:

| ❌ Wrong | ✅ Right | Why |
|---------|---------|-----|
| `type: "ai"` | `type: "aiAction"` | There is no generic `ai` type. Use `aiAction` for LLM prompts, `aiActionWithTools` for agentic steps. |
| `type: "integration"` | `type: "appAction"` | Integrations are app actions. Set `app: { id, actionId }` to pick the integration. |
| `type: "conditional_integration"` | `type: "appAction"` + `entryConditions` | Conditions are configured per-step via `entryConditions`, not a separate type. |
| `type: "knowledge_graph_query"` / `knowledge_graph_upsert` / `knowledge_graph` | `type: "appAction"` with `app.id: "kg"` | KG reads/writes go through the `kg` app (`read-list`, `read-text`, `add-rows`, `update-rows`, `get-rows-by-ids`, `traverse-edges`, `store-insight`). |
| `type: "slack"` / `"webhook"` / `"gmail"` | `type: "appAction"` with the right `app.id` | Apps are never types. `webhook` and `schedule` go in `pipelineStepStartConditions.trigger.type` on a `trigger` step, not as step types. |

### Top-level fields that are silently stripped

Unknown fields at the step root are dropped. The most common mistakes (put them inside the right sub-object instead):

| ❌ At step root | ✅ Correct location |
|----------------|--------------------|
| `prompt: "…"` | `pipelineStepPrompt.template` |
| `responseStructure: {…}` | `pipelineStepPrompt.responseStructure` |
| `appId: "gmail"`, `actionId: "send"` | `app: { id: "gmail", actionId: "send", source: "native" }` |
| `listKey: "leads"` | `knowledgeSync.listKey` (for `knowledgeSync` steps) or inside `stepInputData` (for `kg` app actions) |
| `channel: "#alerts"`, `webhookUrl: "…"` | `stepInputData.channel`, `stepInputData.webhookUrl` on an `appAction` |
| `condition: "…"` | `entryConditions: { criteria: [{ variable, operator, value }] }` |
| `triggerType: "manual"` (on a `trigger` step) | `pipelineStepStartConditions: { trigger: { type: "manual" } }` |
| `note: "…"` | Step `description`, or a comment in the pipeline JSON (not persisted) |
| `enabled: false` | `entryConditions.onCriteriaFail: "skip"` with a falsy criterion, or remove the step |

> After `create_workflow` always call `validate_workflow` (or run `agentled workflows validate <id>`) — the CLI v0.2+ does this automatically and exits non-zero on error. Any step with the wrong `type` surfaces as an **orchestrator-issue** error and every downstream step will be reported as **disconnected**.

### Renderer mistakes that render silently as null

The Config renderer accepts the step config without validation, then individual block renderers `return null` on malformed config. Result: invisible gaps in the report and no error. The four traps:

| ❌ Wrong | ✅ Right | Why |
|---------|---------|-----|
| `{ blockType: "section", title, blocks: [...] }` | `{ blockType: "section", title, fields: [{ name, label, display? }] }` | The `section` renderer only reads `fields[]`. Nested `blocks[]` is dropped. Use `grid` (which DOES accept `blocks[]`) for nesting. |
| `{ blockType: "markdown", title: "Score: {{score}}/20", contentPath }` | `{ blockType: "section", title: "Score: {{score}}/20", fields: [{ name: contentPath, display: "text" }] }` | Markdown block titles are NOT template-resolved. Only `section` titles are. |
| `{ blockType: "scoringHeader", scorePath, max }` (no thresholds) | Add `thresholds: [{min:70,color:"emerald"},{min:40,color:"amber"},{min:0,color:"rose"}]` | Without thresholds the score chip renders gray. Same applies to `dimensionScores` per-dimension thresholds. |
| Wall of `markdown` blocks for a scored AI output | `scoringHeader` (hero) + `dimensionScores` (rubric bars) + `table` (rationale) + body sections | A scored step produces a verdict — surface it. See `packages/cli/patterns/v1/09-reports-and-knowledge-storage.md` § Pattern A. |

For orchestrator digests (pipeline health, daily/weekly summaries) use the **`funnel` block** with `stages: [{ label, valuePath, icon }]` — see § Pattern B. The funnel auto-detects bottlenecks from stage-to-stage drops.

## Platform capabilities (background reading)

Agentled provides caching per step, automatic retry with backoff, a persistent Knowledge Graph, scoped permissions, and a unified credit system across 100+ integrations. For the full rationale, see `skills/agentled/WHY-AGENTLED.md` (CLI) or the Agentled documentation.

**Practical implication:** "retry failed enrichment" and "avoid re-fetching already processed companies" are platform features. Use `retry_execution` to resume from a failed step; per-step caching is automatic. For cross-run row dedup, use `kg.upsert-rows` with a `userKey`.

## Orient Before Designing

Before helping with any request, inspect the workspace by calling these tools:

1. **`get_workspace`** — Confirm workspace identity (name, ID).
2. **`get_workspace_company_profile`** — Business context: ICP, industry, target personas, saved preferences that should shape workflow design.
3. **`list_workflows`** — Existing automations: avoid recreating, identify reuse opportunities, note gaps.
4. **`list_knowledge_lists`** — KG lists: contacts, companies, scored leads, status machines. Shapes what a new workflow reads from or writes to.
5. **`list_connections`** — Connected apps and integrations: know which enrichment, CRM, or email providers are already authed before designing steps that depend on them.
6. **`list_agents`** — Existing agents and routines: understand what is already running autonomously before adding new agents.

The workspace inspection directly informs:
- Which app integrations are already connected (and which are missing auth)
- What KG lists exist to read from or write to
- Whether new workflows should chain from existing ones or replace them
- What existing agents already cover, so you don't duplicate

## Incremental Authoring (recommended)

Build workflows **one step at a time**. This catches errors per-step instead of dumping a full JSON blob and getting 10+ errors at once.

### Via MCP tools

```
create_workflow({ name, goal })                          → empty shell, returns workflowId
add_step({ workflowId, step: { type: "trigger", ... } }) → returns validation per-step
add_step({ workflowId, step: { type: "aiAction", ... }, insertAfter: "trigger-id" })
  → validates template variables, model IDs, app action inputs immediately
... repeat for each step ...
validate_workflow(workflowId)                            → full graph-level check (reachability, cycles)
publish_workflow(workflowId, "live")
```

### Via CLI

```bash
agentled wf create --pipeline '{"name":"My Workflow","goal":"..."}'  --skip-validate
  # → returns workflowId (no steps yet)

agentled wf add-step <wfId> --step '{"id":"start","type":"trigger","name":"Start",...}'
  # → returns per-step validation

agentled wf add-step <wfId> --insert-after start --rewire-next \
  --step '{"id":"extract","type":"aiAction","name":"Extract",...}'
  # → bad variable refs, wrong model ID, or unknown app action caught HERE

# ... repeat ...

agentled wf validate <wfId>        # full graph check
agentled wf publish <wfId> --status live
```

### Why not bulk JSON?

The full-pipeline `steps` array on `create_workflow` / `update_workflow` is supported for **imports, templates, and export→edit→re-import round-trips**. Agents authoring from scratch should not use it:

- No per-step feedback — a bad `type`, model ID, or variable ref on step 2 cascades into 10+ errors on steps 3-8.
- No variable discovery — `{{input.X}}` vs `{{steps.trigger-id.X}}` is a common agent mistake that only surfaces after the full blob is submitted.
- Agents invent step types (`"ai"`, `"integration"`, `"knowledge_graph_query"`) that are silently accepted but never execute.

Internal testing: **0 errors with incremental vs 13 errors with bulk JSON** on the same pipeline.

### Editing existing workflows

For live workflows, prefer per-step tools over bulk updates:

- `update_step(workflowId, stepId, updates)` — change one step (prompt, inputs, next, etc.)
- `add_step(workflowId, step, insertAfter?)` — insert a new step
- `remove_step(workflowId, stepId)` — delete a step and re-wire neighbors
- After edits: `validate_workflow` → `publish_workflow` (or `promote_draft` for live workflows)

### Post-authoring

6. Test: `start_workflow` with sample input
7. Check results: `get_execution` to see step outputs

## Workspace Surfaces

The workspace home and sidebar carry workspace-level UI state on `Workspace.metadata`. These surfaces are read-only via the MCP today (most tooling does not need to write them), but agents authoring templated workspaces should know they exist:

### Pinned outputs (sidebar shortcuts)

`Workspace.metadata.pinnedOutputs[]` lists output pages that appear in the sidebar **after Knowledge & Data**, always visible regardless of which workflow is currently open. Operators set these manually from each output page's configuration sheet (toggle: *"Pin to workspace home"*). Pin sparingly: only pin output pages that are useful as direct workspace-level destinations, such as a recurring report, scoring dashboard, or canonical results list. Do not pin every output page, implementation detail, approval surface, or one-off execution artifact; normal workflow output pages remain accessible from the workflow itself. Each entry:

```json
{
  "pipelineId": "wfl_abc123",
  "pipelinePathname": "deal-flow",
  "outputPagePathname": "weekly-report",
  "label": "Weekly Investor Report",
  "iconName": "FileText",
  "pipelineName": "Deal Sourcing",
  "colorTextClass": "text-emerald-700 dark:text-emerald-400",
  "pinnedAt": "2026-05-09T10:00:00Z"
}
```

All snapshot fields capture the source values at pin time and do not auto-update if the workflow or page is later renamed or restyled. To refresh, the operator unpins and re-pins.

Sidebar rendering uses each field directly:
- `label` is the primary line.
- `pipelineName` renders in small muted text below the label, so two pins with the same `label` from different workflows are distinguishable.
- `iconName` resolves to a lucide icon (defaults to `Pin` if missing or unknown).
- `colorTextClass` is applied as a Tailwind class on the icon, mirroring the source workflow's accent. Use the same shape produced by the workflow style picker (e.g. `text-emerald-700 dark:text-emerald-400`).
- The pin row renders as **active** when the operator's current URL matches the pin's target.

When seeding a workspace via templates, pre-populate `pinnedOutputs[]` only for the curated artifacts the operator should access directly from the workspace sidebar on day one. Supply `pipelineName` and `colorTextClass` for the proper rendering (otherwise they fall back to the muted default, which still works but loses the visual cue). Pin entries reference output pages that exist on workflows in the same workspace; entries pointing at deleted or renamed pipelines still render — the URL just resolves to a 404 page until the pin is removed.

### Cluster summaries

Each workflow card (cluster) on the home page renders a per-cluster summary block above its workflow cards. The summary is read from the freshest `pipeline.metadata.executiveSummary` across the cluster's pipelines:

```json
{
  "body": "Sourcing surfaced 47 new startups this week. 12 met the fit threshold; 4 high-priority.",
  "bullets": ["47 new candidates", "12 qualified", "4 high-priority"],
  "generatedAt": "2026-05-09T07:00:00Z",
  "author": "by Sourcing Agent"
}
```

This field is intended to be written by an agent routine that has access to the cluster's KG list and recent executions. The home page renders nothing when no pipeline in the cluster has a summary — there is no fallback narrative.

## Workspace Awareness

Be explicit about which Agentled workspace you are operating on.

- When multiple Agentled MCP servers are registered, use the server-specific namespace directly instead of assuming a default.
- When using the standalone CLI, remember it can store multiple saved workspace profiles.
- Check the active CLI workspace with `agentled auth current`.
- Switch the saved CLI target with `agentled auth use <workspace>`.
- Override a single CLI command with `agentled --workspace <workspace> ...` or `AGENTLED_WORKSPACE=<workspace> ...`.
- Before making destructive or customer-visible changes, confirm the target workspace via `get_workspace` or `agentled auth current`.

## Pipeline Structure

Every workflow needs at minimum: a trigger step, one or more action steps, and a milestone (terminal) step. Steps are connected via `next: { stepId: "..." }`.

```json
{
  "name": "My Workflow",
  "goal": "What this workflow achieves",
  "steps": [
    { "id": "trigger", "type": "trigger", "name": "Start", "pipelineStepStartConditions": { "trigger": { "type": "manual" } }, "next": { "stepId": "action" } },
    { "id": "action", "type": "aiAction", "name": "Analyze", "pipelineStepPrompt": { "template": "...", "responseStructure": {} }, "creditCost": 10, "next": { "stepId": "done" } },
    { "id": "done", "type": "milestone", "name": "Complete" }
  ],
  "context": {
    "executionInputConfig": {
      "title": "Run Workflow",
      "fields": [{ "name": "input_field", "label": "Input", "type": "text", "required": true }]
    }
  }
}
```

## Step Types

### Trigger
```json
{ "id": "trigger", "type": "trigger", "name": "Start", "pipelineStepStartConditions": { "trigger": { "type": "manual" } }, "next": { "stepId": "next-step" } }
```

`pipelineStepStartConditions.trigger.type` is one of: `manual`, `schedule`, `webhook`, `event`, `delay`, `app_event`. For `schedule` add `config: { frequency: "daily", time: "07:00" }` (or a cron expression). For `app_event` add `config: { appId, triggerSlug, connectionSource }`. **Do not put `triggerType` at the step root** — it is not in the step schema and is silently dropped on save.

### App Action
```json
{
  "id": "enrich",
  "type": "appAction",
  "name": "Enrich Company",
  "app": { "id": "agentled", "actionId": "agentled.get-linkedin-company-from-url", "source": "native" },
  "stepInputData": { "profileUrls": "{{input.company_url}}" },
  "next": { "stepId": "next-step" }
}
```

### AI Action
```json
{
  "id": "analyze",
  "type": "aiAction",
  "name": "Analyze",
  "pipelineStepPrompt": {
    "template": "Analyze this company: {{steps.enrich.company}}",
    "responseStructure": { "score": "number 0-100", "summary": "string" }
  },
  "creditCost": 10,
  "next": { "stepId": "next-step" }
}
```

### AI Step Model & Provider Configuration

AI steps can optionally specify a model and provider via the `agent` field:

```json
{
  "id": "analyze",
  "type": "aiAction",
  "agent": { "model": "claude-4-6-sonnet", "provider": "anthropic" },
  "pipelineStepPrompt": { "template": "...", "responseStructure": {} },
  "creditCost": 10,
  "next": { "stepId": "next-step" }
}
```

**Supported Providers:** `openai`, `anthropic`, `google`, `mistral`, `deepseek`, `kimi`, `minimax`, `bytedance`, `perplexity`, `xai`

**Supported Models by Provider:**

| Provider | Models |
|----------|--------|
| `openai` | `gpt-5-nano`, `gpt-5-mini`, `gpt-5.4`, `o4-mini`, `o3`, `o3-pro`, `o3-deep-research` |
| `anthropic` | `claude-4-6-sonnet`, `claude-4-5-haiku`, `claude-4-6-opus` |
| `google` | `gemini-3-pro`, `gemini-3-flash`, `gemini-2.5-pro`, `gemini-2.5-flash` |
| `mistral` | `mistral-large-latest`, `mistral-small-latest`, `codestral-latest` |
| `deepseek` | `deepseek-chat`, `deepseek-reasoner` |
| `kimi` | `kimi-k2.5` |
| `minimax` | `minimax-m2.5` |
| `bytedance` | `doubao-seed-1.6-flash`, `seed-2.0-mini`, `doubao-seed-1.8-beta` |
| `perplexity` | `sonar-pro`, `sonar`, `sonar-reasoning-pro`, `sonar-reasoning` |
| `xai` | `grok-4.3`, `grok-3-mini` |

> **Tip:** Use `list_models` to get the full up-to-date list of supported model IDs. Use the internal model IDs (e.g., `claude-4-6-sonnet`), NOT the raw API model IDs (e.g., `claude-sonnet-4-6`). Using unsupported model IDs will result in a validation error.

### Code Step
```json
{
  "id": "transform",
  "type": "code",
  "name": "Transform Data",
  "codeConfig": {
    "language": "javascript",
    "code": "const data = {{steps.prev.output}};\nreturn data.map(x => x.name);",
    "responseStructure": { "items": "array of strings" }
  },
  "next": { "stepId": "next-step" }
}
```

Declare `responseStructure` when downstream steps reference this step's output via loops or template variables — flat map of `{ field: "type description" }`. Without it, loop source validation emits a warning; with it, typos in field names are caught as blockers.

### Milestone (terminal)
```json
{ "id": "done", "type": "milestone", "name": "Complete" }
```

## Template Variables

| Pattern | Description |
|---------|-------------|
| `{{input.fieldName}}` | Input page field value |
| `{{steps.stepId.field}}` | Previous step output |
| `{{currentItem}}` | Current item in a loop |
| `{{currentItem.field}}` | Nested field in loop item |

## Loop Configuration

To iterate over a list from a previous step:
```json
{
  "loopConfig": { "enabled": true, "field": "{{steps.prev.items}}", "ItemAlias": "currentItem" }
}
```

## Entry Conditions

Skip or stop a step based on prior output:
```json
{
  "entryConditions": {
    "onCriteriaFail": "skip",
    "conditionText": "Skip if no URL",
    "criteria": [{ "variable": "{{input.url}}", "operator": "isNotNull" }]
  }
}
```

Operators: `==`, `!=`, `>`, `<`, `isNull`, `isNotNull`, `contains`.

**Important**: Use `criteria` (not `conditions`) and `variable` (not `field`).

## Email Workflow Conventions

### Trigger choice: polling vs event

**Default to Schedule trigger + label-based dedup** for all email intake workflows (deal flow, triage, review, digest). Only propose an App Event trigger when the user explicitly needs sub-minute latency.

| User asks for | Trigger |
|---------------|---------|
| "process inbound emails", "triage daily", "review pitches" | **Schedule** (polling) |
| "as soon as", "real-time", "within X seconds/minutes" | **App event** |

### Canonical email polling pattern

```
schedule trigger → GMAIL_FETCH_EMAILS (-label:processed newer_than:1d) → loop: [process] → GMAIL_ADD_LABEL (mark processed) → milestone
```

Step order:
1. **`GMAIL_CREATE_LABEL`** — create/get the `processed` label (idempotent, returns label ID)
2. **`GMAIL_FETCH_EMAILS`** — query `-label:processed newer_than:1d` (or wider window as needed)
3. **Loop** — process each email (AI analysis, KG storage, enrichment, etc.)
4. **`GMAIL_ADD_LABEL`** — apply `{{steps.ensure-label.id}}` to mark email done (dedup gate)

### Label ID rule (prevents `400: Invalid label`)

Gmail requires **label IDs** (e.g., `Label_3456789012345`), not display names (e.g., `"processed"` or `"agentled"`).

**Always resolve via `GMAIL_CREATE_LABEL`** and reference its returned `id`:
```json
{ "stepInputData": { "label_id": "{{steps.ensure-label.id}}" } }
```
Never pass a string label name directly to `GMAIL_ADD_LABEL`.

See `docs/workflows/triggers.md` for the full decision framework, query examples, and common mistakes.

---

## Email Step Pattern (AI Draft → Approve → Send)

Email steps use a single `aiAction` step (never separate "draft" + "gmail send" appAction steps). The AI drafts the email, a human approves, then the platform sends it.

For workflows that gather or show information and then email the result, use this sequence instead of embedding the full result in the email: report `aiAction` with a Config renderer → `share` step → composed notification email `aiAction`. The notification email should be email-safe HTML with a short overview and `{{steps.<shareStepId>.shareUrl}}`. Do not add Gmail/Outlook/Composio send appAction steps unless the user explicitly asks to send through that provider account.

### 1. Outreach Profile Input Page

When a workflow sends emails, add an outreach profile input page to `context.inputPages` so the user can configure sender identity:

```json
{
  "title": "Outreach Profile",
  "pathname": "outreach-profile",
  "configuration": {
    "contextKey": "outreachProfile",
    "shortDescriptionFields": ["name", "fromEmail"],
    "fields": [
      { "name": "name", "label": "Sender Name", "type": "text", "required": true },
      { "name": "fromEmailLabel", "label": "From Name", "type": "text", "required": true },
      { "name": "fromEmail", "label": "From Email", "type": "connected_emails_selector_multiple", "required": true },
      { "name": "replyToEmail", "label": "Reply-To Email (optional)", "type": "text" }
    ]
  }
}
```

### 2. Composed Email Step

```json
{
  "id": "send_email",
  "type": "aiAction",
  "name": "Send Email",
  "pipelineStepPrompt": {
    "type": "email",
    "template": "Draft a personalized email...\n{{steps.previous_step.data}}\nReturn JSON ONLY per schema.",
    "responseStructure": {
      "email": {
        "from": "{{context.outreachProfile.fromEmail}}",
        "to": "recipient@example.com",
        "subject": "Email subject line",
        "body": "Email body (email-safe HTML)",
        "bodyType": "html"
      }
    },
    "responseType": "json"
  },
  "renderer": {
    "type": "Email",
    "config": { "fromContextKey": "outreachProfile" }
  },
  "onApproval": {
    "action": "schedule-email",
    "executedText": "Email sent by {{name}} at {{date}}",
    "scheduledText": "Email scheduled to be sent for {{date}} by {{name}}",
    "failedText": "Email failed to send."
  },
  "integrations": [{
    "type": "oneOf",
    "label": "Email",
    "connectorType": "email",
    "options": [
      { "name": "Gmail", "url": "https://gmail.com", "isUserAccountConnectionRequired": true },
      { "name": "Outlook", "url": "https://outlook.com", "isUserAccountConnectionRequired": true }
    ],
    "selectionHint": "preferConnected"
  }],
  "creditCost": 10,
  "next": { "conditions": { "approvalRequired": true } }
}
```

### Key Requirements

- Include `outreachProfile` input page when the user must choose a connected personal sender
- `pipelineStepPrompt.type: "email"` — tells the system this is an email step
- `renderer.config.fromContextKey: "outreachProfile"` — links renderer to sender profile
- `onApproval.action: "schedule-email"` — triggers the actual send; without it, approval does nothing
- `next.conditions.approvalRequired: true` — blocks the pipeline until human approval
- Email body must be email-safe HTML (`<p>`, `<br>`, `<a>`, `<strong>` — no CSS, no scripts)
- **Never** use separate "draft" + "gmail send" appAction steps for outreach
- For report notifications, create a share URL and include that URL in the email instead of copying the full report into the email body

## Top Apps Quick Reference

| App | Action | Credits | Key Inputs |
|-----|--------|---------|------------|
| `agentled` | `get-linkedin-company-from-url` | 5 | `profileUrls` |
| `agentled` | `get-linkedin-profile-from-url` | 2 | `profileUrls` |
| `agentled` | `find-email-person-domain` | 3 | `firstName`, `lastName`, `domain` |
| `hunter` | `find-email-person-domain` | 3 | `firstName`, `lastName`, `domain` |
| `web-scraping` | `scrape` | 0 | `url` |
| `http-request` | `request` | 0 | `url`, `method`, `headers`, `body` |
| `notion` | `get-page-markdown` | 1 | `pageUrl` |
| `browser-use` | `run-task` | 15 | `task`, `startUrl` |
| `agentled` | `call-workflow` | varies | `workflowId`, `input` |

Use `list_apps` and `get_app_actions` for full schemas of all available apps. Use `list_models` for supported AI model IDs.

## Credit-Efficient Testing

Each execution costs real credits. Follow these rules:

1. **One execution at a time** — don't start new ones unnecessarily
2. **Retry, don't restart** — use `retry_execution` to continue from a failed step instead of starting over
3. **Test in isolation** — use `test_ai_action`, `test_app_action`, or `test_code_action` to verify steps before wiring them into a workflow
4. **Reuse prior output** — when testing downstream steps, use output data from a prior successful execution as mock input

## Dry-Run Protocol (zero credits)

Use this three-phase sequence after creating or significantly editing a workflow to catch data-flow bugs before the first real execution.

> **Implementation status (2026-05-01):** Phases 1 and 2 are runnable today with the tools listed below. Phase 3 (`dry_run_workflow` MCP tool + `agentled workflows dry-run` CLI) is the **target of this branch and is not yet shipped** — until then, perform Phase 3 manually as described in the "Manual Phase 3" subsection.

### Phase 1 — Structural validation

```
validate_workflow(workflowId)
# CLI equivalent (file-based preflight):
agentled workflows validate --file pipeline.json
```

Catches: unreachable steps, missing prompt templates, unknown action IDs, bad model IDs, `AI_STEP_TOOLS_REQUIRED`, broken `next.stepId` chains. Exit code 0 = clean, 1 = errors, 2 = warnings only.

Fix all errors before continuing. Warnings are acceptable but worth reviewing.

### Phase 2 — Get real payloads for key steps (no workflow execution)

For each step that produces data consumed downstream, run it in isolation to get a real output:

```
# App action step
test_app_action("web-scraping", "scrape", { url: "https://example.com" })

# AI action step
test_ai_action(
  "Analyze this company: {{company}}",
  { company: "Acme Corp — B2B SaaS, 50 employees" },
  { score: "number 0-100", signals: "array of strings", decision: "string" }
)

# Code step (0 credits)
test_code_action("javascript", "return { domain: {{url}}.split('/')[2] }", { url: "https://acme.com" })
```

Capture the output JSON of each step. You will use these as `mockOutputs` in Phase 3.

**Which steps to test in Phase 2:**
- The trigger's first downstream step (sets the shape everything else depends on)
- Any step whose output is referenced by 3+ downstream steps
- Any step whose `responseStructure` is rich (nested objects, arrays)
- Steps with conditional fields (`entryConditions.criteria` that reference their output)

You do **not** need to test every step — only the ones that anchor the variable graph.

### Phase 3 — Variable-resolution dry-run with mock data (planned)

> **Not yet shipped.** The `dry_run_workflow` MCP tool and `agentled workflows dry-run` CLI command described in this section are the target surface for the in-progress dry-run feature. Until they ship, follow the **Manual Phase 3** procedure below.

Planned tool surface:

```
dry_run_workflow({
  workflowId: "<id>",
  input: { company_url: "https://example.com" },    // matches executionInputConfig.fields
  mockOutputs: {
    "scrape-step":    { content: "Acme Corp...", metadata: { title: "Acme" } },  // from Phase 2
    "ai-score-step":  { score: 82, signals: ["growing", "funded"], decision: "HOT" },
    "code-step":      { domain: "acme.com" }
  }
})

# CLI equivalent (planned):
agentled workflows dry-run <wfId> \
  --input '{"company_url":"https://example.com"}' \
  --mock-outputs '{"scrape-step":{"content":"..."},"ai-score-step":{"score":82}}'
```

The dry-run walks the step graph topologically, resolves every `{{steps.X.field}}`, `{{input.Y}}`, and `{{currentItem.Z}}` reference against the provided mocks + synthesized fallbacks, and reports:

| Check | What it catches |
|-------|----------------|
| Unresolved `{{steps.X.field}}` | Field name typo, wrong step ID, missing `responseStructure` key |
| Unresolved `{{input.Y}}` | Field not declared in `executionInputConfig.fields` |
| `{{currentItem.*}}` outside a loop | Loop config missing on the step |
| Always-skip branches | `entryConditions` that mock data never satisfies |
| Unreachable steps via conditions | HOT/WARM/COLD routing where one path is never reachable |
| Credit estimate | Sum of `creditCost` along the live path (loop-multiplied) |

**Interpreting results:**

- `✗ Variables` errors → fix field name or step reference, then re-run Phase 3 (no need to redo Phase 2 unless you change the step that produces the mocked output).
- `⚠ Always-skip branch` → check `entryConditions` logic; your mock data may not be representative, or the condition is wrong.
- `ℹ Credits ~N` → use this to set user expectations before the first real run.

### Manual Phase 3 (interim, until `dry_run_workflow` ships)

Until the tool ships, do Phase 3 by hand:

1. List every `{{steps.X.field}}`, `{{input.Y}}`, and `{{currentItem.Z}}` reference across the steps you've edited (the `pipelineStepPrompt.template`, `stepInputData`, `entryConditions.criteria[].variable`, `setVariablesConfig.variables[].expression` are the usual suspects).
2. For each reference, confirm against the Phase 2 captured payloads (or the `responseStructure` of upstream AI steps / app action output schema) that the field name actually exists.
3. Cross-check `{{input.Y}}` keys against `context.executionInputConfig.fields`.
4. Check that any `{{currentItem.*}}` reference is on a step under `loopConfig`.

Capturing the Phase 2 outputs in your worklog makes this scan a quick `grep`/eyeball pass rather than a full re-derivation.

### When to skip Phase 2 (planned)

Once `dry_run_workflow` ships, you'll be able to skip the per-step `test_*_action` calls if you have a prior successful execution and use `--from-execution` instead:

```
# Planned, not yet shipped:
dry_run_workflow({ workflowId: "<id>", fromExecutionId: "<execId>" })
# CLI:
agentled workflows dry-run <wfId> --from-execution <execId>
```

The dry-run pulls real step outputs from that execution and uses them as mock data automatically. This is the highest-fidelity option.

### Summary

```
Phase 1: validate_workflow                   → fix structural errors          (shipped)
Phase 2: test_*_action per key step          → capture real output payloads   (shipped)
Phase 3: dry_run_workflow + mockOutputs      → catch all variable-reference bugs   (planned — manual scan today)
         └─ if prior execution exists: dry_run_workflow --from-execution instead   (planned)
```

Only proceed to `start_workflow` (real execution) after the manual Phase 3 scan (or, once shipped, the automated dry-run) passes with 0 errors.

## Common Validation Errors

| Error | Fix |
|-------|-----|
| `"references non-existent next step"` | Ensure some step has `next: { stepId: "X" }` pointing to the missing step |
| `"missing prompt template"` | Add `pipelineStepPrompt.template` to AI steps |
| `"Unknown action"` | Verify `actionId` format via `get_app_actions` |
| `"is unreachable"` | Connect every step via `next.stepId` from the trigger chain |
| `"unsupported model"` | Use a valid internal model ID (e.g., `claude-4-6-sonnet`, not `claude-sonnet-4-6`). Run `list_models` for all valid IDs. |

## Persistent Memory

Workflows can store and recall memories that persist across executions. Two mechanisms:

### MCP Tools (for managing memory externally)

| Tool | Purpose | Key Params |
|------|---------|------------|
| `recall_memory` | Get a specific memory by key | `key`, `scope?`, `workflowId?` |
| `search_memories` | Search by natural language query | `query?`, `category?`, `scope?`, `workflowId?`, `limit?` |
| `store_memory` | Save a persistent memory | `key`, `value`, `category?`, `scope?`, `workflowId?`, `confidence?`, `merge?` |
| `list_memories` | List all memories in a scope | `scope?`, `workflowId?`, `category?`, `limit?` |
| `delete_memory` | Delete a memory by key | `key`, `scope?`, `workflowId?` |

**Scopes**: `workspace` (shared across all workflows) or `workflow` (scoped to one workflow, default).

**Categories**: `fact` (known truth), `insight` (pattern/learning), `preference` (user preference), `outcome` (result to track).

**Merge strategies** (for `store_memory`): `overwrite` (default), `append`, `max`, `min`, `increment`.

**Confidence**: 0-100. Memories with confidence >= 70 are automatically synced to the Knowledge Graph.

### Pipeline Step Configuration (for memory inside workflows)

#### Auto-extraction (pipeline-level)

Enable on the pipeline to automatically extract memories after each execution completes:

```json
{
  "persistentMemoryConfig": {
    "autoExtract": true,
    "scopes": ["pipeline"],
    "categories": ["fact", "insight", "outcome"],
    "maxPerExtraction": 10,
    "extractionModelTier": "mini"
  }
}
```

#### Explicit per-step writes

Configure specific steps to write memories from their output:

```json
{
  "id": "score-company",
  "type": "aiAction",
  "persistentMemory": {
    "writes": [
      {
        "key": "score_{{input.company_name}}",
        "valuePath": "total_score",
        "category": "outcome",
        "scope": "pipeline",
        "confidence": 85
      }
    ]
  }
}
```

The `valuePath` extracts from the step's output using dot notation. The `key` supports template variables.

#### Builtin tool for AI steps (`workspace_memory`)

AI steps with type `aiActionWithTools` can use the `workspace_memory` builtin tool to read/write memory during execution:

```json
{
  "id": "analyze",
  "type": "aiActionWithTools",
  "name": "Analyze with Memory",
  "tools": [{ "builtinType": "workspace_memory" }],
  "pipelineStepPrompt": {
    "template": "Recall what we know about this company, then analyze...",
    "responseStructure": { "analysis": "string" }
  },
  "creditCost": 10,
  "next": { "stepId": "done" }
}
```

The AI agent can then call `recall`, `search`, or `store` actions within the tool during execution. This is the same pattern used by KG tools (`kg_search`, `kg_traverse`, etc.).

### Memory Patterns

**1. Learning workflow** — accumulates knowledge over repeated runs:
```
trigger → enrich → AI analyze (with workspace_memory tool) → milestone
```
The AI step recalls prior scores, compares trends, and stores updated insights.

**2. Explicit score tracking** — saves structured data for cross-run comparison:
```
trigger → score company → [persistentMemory.writes: score_{{company}}] → milestone
```

**3. Workspace-wide preferences** — store ICP criteria, outreach templates, or scoring weights shared across workflows:
```
store_memory(key: "target_icp", value: { industry: "SaaS", minEmployees: 50 }, scope: "workspace", category: "preference")
```

## Conversational Building

For complex workflows, use the `chat` tool to design workflows through natural language conversation. It supports multi-turn via `session_id`.

```
chat("Build a workflow that takes a LinkedIn URL, enriches the company, finds decision-maker emails, and scores by ICP fit")
```

## Reporting Issues & Feedback

When you (an AI agent) hit something broken, confusing, or missing, route it to the right channel — **do not** search npm metadata, scrape GitHub, or shell out to `gh` to discover a bug tracker.

| What you hit | Channel |
|--------------|---------|
| Workflow misbehaves, app/integration question, platform/billing question, missing feature, anything about how Agentled works | `submit_feedback_to_agentled` |
| Reproducible bug in the **CLI itself** (`agentled` crashes, writes wrong data to `.agentled/`, a flag is broken) | File a GitHub issue at <https://github.com/agentled/mcp-server/issues> with CLI version + repro |
| Anything else, or unsure | `submit_feedback_to_agentled` — the team reroutes if needed |

For human users, point them to **contact@agentled.ai** or <https://www.agentled.ai/en/contact-us>. The `bugs` field in the npm package intentionally points at the contact page, not a public issue tracker.
