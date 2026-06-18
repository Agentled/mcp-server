# @agentled/mcp-server

> The automation engine built for AI agents. Intelligent AI workflow orchestration with long-term memory, 100+ integrations, and unified credits.

[![npm version](https://img.shields.io/npm/v/@agentled/mcp-server.svg)](https://www.npmjs.com/package/@agentled/mcp-server)
[![license](https://img.shields.io/npm/l/@agentled/mcp-server.svg)](https://github.com/Agentled/mcp-server/blob/main/LICENSE)

[![Agentled Server MCP server](https://glama.ai/mcp/servers/Agentled/mcp-server/badges/card.svg)](https://glama.ai/mcp/servers/Agentled/mcp-server)

## What is Agentled?

[Agentled](https://www.agentled.app) is the automation engine built for AI agents.
It gives Claude, Codex, Cursor, Windsurf, and any MCP-compatible client direct access
to intelligent workflow orchestration, long-term memory, and 100+ integrations.

**Three things make it different:**

🧠 **Long-Term Memory** — A built-in Knowledge Graph stores insights across
workflow executions. Your agents get smarter over time — they remember past
research, lead scores, content performance, and business context.

⚡ **Unified Credits** — One API key, one credit system, 100+ services.
No need to sign up for LinkedIn, email, scraping, AI models, or video
generation separately. Connect once, use everything.

🎯 **Intelligent Orchestration** — AI reasons at every step. Workflows
aren't just "if this then that" — they understand context, make decisions,
and adapt to results.

## See it in action

```
$ agentled create "Outbound to fintech CTOs in Europe"

Loading workspace context from Knowledge Graph...
✦ ICP loaded  ✦ 3 prior campaigns  ✦ 847 contacts in KG

Creating campaign with 3 workflows...

━━ Workflow 1: Prospect Research  linkedin · hunter · clearbit
  ✓ LinkedIn: CTO + fintech + EU → 189 profiles
  ✓ Enriched via Hunter + Clearbit → 156 matched
  ✓ ICP scoring → 43 high-intent leads

━━ Workflow 2: Signal Detection  web-scraper · crunchbase
  ✓ Job postings → 12 hiring devops
  ✓ Crunchbase → 8 recently funded
  ✓ Cross-match: hiring + funded → 5 hot leads

━━ Workflow 3: Outreach  email · linkedin · kg
  ✓ Personalized emails from context
  ✓ LinkedIn requests with custom notes
  ✓ 43 leads saved to Knowledge Graph

Campaign saved. Scheduled: every 48h
Credits used: 720
→ https://www.agentled.app/your-team/fintech-cto-outbound
```

One prompt. Three workflows. LinkedIn enrichment, email finding, AI scoring, multi-channel outreach — all orchestrated, all stored in the Knowledge Graph for the next run.

## Quick Start

```bash
claude mcp add --transport stdio --scope user agentled \
  -e AGENTLED_API_KEY=wsk_... \
  -- npx -y @agentled/mcp-server
```

`--scope user` registers the server in your user MCP config so it loads in **every** project (not only the repo where you ran the command). Use a distinct server name (e.g. `agentled_my_workspace`) if you add multiple workspaces. For team-shared config in git, use `--scope project` and `.mcp.json` instead ([Claude Code MCP scopes](https://code.claude.com/docs/en/mcp)).

### Claude Code plugin (one-step install)

Prefer the plugin if you want the MCP server **and** the Agentled skill installed together. In Claude Code:

```
/plugin marketplace add Agentled/mcp-server
/plugin install agentled@agentled
```

Then set your API key in the shell Claude Code runs from:

```bash
export AGENTLED_API_KEY=wsk_...
```

The plugin bundles the `agentled` skill (workflow-authoring guidance, namespaced `agentled:agentled`) and auto-starts the MCP server via `npx -y @agentled/mcp-server`. The same plugin directory also carries the Codex manifest (`.codex-plugin/`) — one bundle, both hosts.

> **Pick one install path, not both.** If you previously ran `claude mcp add agentled ...` or `--setup-skills`, remove those before (or instead of) installing the plugin — otherwise you get two identical MCP server processes and the skill registered twice. Cleanup: `claude mcp remove agentled` and delete `.claude/skills/agentled/` (or `~/.claude/skills/agentled/`). `--setup-skills` now detects an installed plugin and refuses to double-register unless you pass `--force`.

To develop the plugin locally:

```bash
claude --plugin-dir ./plugins/agentled     # load from source
claude plugin validate ./plugins/agentled  # check manifest + structure
```

> `plugins/agentled/skills/` is a generated mirror of `skills/` (synced by `publish.sh`) — edit `skills/agentled/SKILL.md`, never the mirror.

### Local development

Use the local built entrypoint when you want to test unpublished changes against a
local app. `npx -y @agentled/mcp-server` always uses the latest published npm package.

```bash
cd agentled-mcp-server
npm run build

claude mcp add --transport stdio agentled_local \
  --env AGENTLED_API_KEY=wsk_... \
  --env AGENTLED_URL=http://localhost:8080 \
  -- node /absolute/path/to/agentsled-front/agentled-mcp-server/dist/index.js
```

### Getting your API key

1. Sign up at [agentled.app](https://www.agentled.app)
2. Open **Workspace Settings > Developer**
3. Generate a new API key (starts with `wsk_`)

## Why Agentled MCP?

### One API Key. One Credit System. 100+ Services.

No need to sign up for LinkedIn APIs, email services, web scrapers, video generators, or AI models separately. Agentled handles all integrations through a single credit system.

| Capability | Credits | Without Agentled |
|-----------|---------|-----------------|
| LinkedIn company enrichment | 50 | LinkedIn API ($99/mo+) |
| Email finding & verification | 5 | Hunter.io ($49/mo) |
| AI analysis (Claude/GPT/Gemini) | 10-30 | Multiple API keys + billing |
| Web scraping | 3-10 | Apify account ($49/mo+) |
| Image generation | 30 | DALL-E/Midjourney subscription |
| Video generation (8s scene) | 300 | RunwayML ($15/mo+) |
| Text-to-speech | 60 | ElevenLabs ($22/mo+) |
| Knowledge Graph storage | 1-2 | Custom infrastructure |
| CRM sync (Affinity, HubSpot) | 5-10 | CRM API + middleware |

### Workflows That Learn

Other automation tools start from zero every run. Agentled's Knowledge Graph remembers across executions — what worked, what didn't, what humans corrected. Scoring workflows can use compact row-level `scoring_profile` summaries and bounded scoring-memory retrieval so every run compounds on the last without dumping raw history into prompts.

```
Run 1:  Investor scoring → 62% accuracy (cold start)
Run 5:  → 78% (learning from IC feedback)
Run 12: → 89% (compound learning from outcomes, zero manual tuning)
```

### Intelligent Orchestration

Unlike trigger-action tools, Agentled workflows have AI reasoning at every step. Multi-model support (Claude, GPT-4, Gemini, Mistral, DeepSeek, Moonshot), adaptive execution, and human-in-the-loop approval gates when needed.

### Agent Teams

Agent Teams let you run multiple AI specialists in a single workflow step. Pick a preset and describe what you need — the team handles coordination, delegation, and synthesis.

```
"Add an Agent Team step that researches the company and produces an investment memo"
```

Six built-in presets cover the most common patterns:

| Preset | What it does |
|--------|-------------|
| `research-and-summarize` | Specialists gather information, one synthesizes a summary |
| `analyze-and-recommend` | Multiple analysts evaluate options, produce a ranked recommendation |
| `generate-then-review` | A generator drafts content, reviewers critique and refine |
| `compare-options` | Specialists argue for competing options, coordinator arbitrates |
| `investigate-in-parallel` | Independent specialists explore different angles simultaneously |
| `review-and-improve` | Reviewers find issues, an editor applies improvements |

When creating Agent Team steps via MCP, include preset metadata so the step opens correctly in the builder:

```json
{
  "id": "analyze",
  "type": "agentOrchestrator",
  "name": "Agent Team",
  "orchestratorConfig": {
    "pattern": "supervisor",
    "workers": [
      { "id": "researcher", "name": "Researcher", "systemPrompt": "Research {{input.company_url}} — team, funding, market position" },
      { "id": "analyst", "name": "Analyst", "systemPrompt": "Analyse the research. Identify risks and growth signals." }
    ]
  },
  "metadata": {
    "agentTeamPreset": "research-and-summarize",
    "agentTeamMode": "simple",
    "agentTeamUxVersion": 1
  },
  "next": { "stepId": "milestone" }
}
```

Existing steps created with raw `orchestratorConfig` and no metadata continue to work — they open in advanced mode in the builder without errors.


## Analytics vs ROI semantics

When describing workflow outcomes, keep these terms separate:

- `pipeline.analyticsConfig` = **business metrics** (execution outcome stats shown in Business Metrics cards/charts).
- `pipeline.metadata.roi` = **ROI assumptions/rollups** (time saved and cost-value estimates).

If you update one without the other, name exactly what changed (e.g. "business metrics configured" vs "ROI assumptions configured").

## CLI parity guard

The repository includes an automated parity guard so MCP tool additions do not silently drift from the CLI surface.

- Test: `__tests__/cli/cli-mcp-parity.test.ts`
- Docs: `docs/CLI_MCP_PARITY.md`

Run it with:

```bash
yarn test:node -- cli-mcp-parity.test.ts
```

## What Can You Build?

### Lead Enrichment & Sales Automation

```
"Find fintech CTOs in Europe, enrich via LinkedIn + Hunter, score by ICP fit,
draft personalized outreach, save everything to the Knowledge Graph"
```

### Content & Media Production

```
"Scrape trending topics in our niche, generate 5 LinkedIn posts with AI,
create thumbnail images, schedule publishing for the week"
```

### Company Research & Intelligence

```
"Research this company from its URL — team, funding, market position, competitors.
Generate an investment memo. Store in KG for future reference."
```

### VC Investor Matching (real case study)

```
"Match this startup against our 2,000+ investor database. Score by sector focus,
stage preference, check size, and portfolio synergy. Compare with last round's outcomes."
```

3,000+ profiles processed. IC-ready reports. Prediction vs outcome learning — accuracy went from 62% to 89% over 12 runs with zero manual tuning.

## Built-in Skills And Integrations

**Media Production:** Video generation, image generation, text-to-speech, auto-captions, media assembly

**AI Intelligence:** Multi-model AI (Claude, GPT-4, Gemini, Mistral, DeepSeek, Moonshot, xAI), Knowledge Graph, feedback loops, scoring & analytics

**Data & Integration:** LinkedIn (search, enrich, post), email (send, personalize), web scraping, social publishing, CRM sync, document analysis, OCR

## Available Tools

### Workflows

| Tool | Description |
|------|-------------|
| `list_workflows` | List all workflows in the workspace |
| `get_workflow` | Get full workflow definition by ID |
| `get_workflow_credits` | Get ledger-derived, period-labelled workflow credit usage; opt in to cost drivers with `includeCostDrivers` |
| `create_workflow` | Create a new workflow from pipeline JSON |
| `update_workflow` | Update an existing workflow (top-level scalars; for context/metadata prefer `update_workflow_context`) |
| `update_workflow_context` | Workflow-level analog of `update_step` — three explicit verbs (`updates` / `replace` / `unset`) on `context.*` and `metadata.*` paths, returns `diff` + `warnings` |
| `add_step` | Add a step with automatic positioning and next-pointer rewiring |
| `update_step` | Deep-merge updates into a single step by ID |
| `remove_step` | Remove a step with automatic next-pointer rewiring |
| `delete_workflow` | Permanently delete a workflow |
| `validate_workflow` | Validate pipeline structure, returns errors per step |
| `publish_workflow` | Change workflow status (draft, live, paused, archived) |
| `export_workflow` | Export a workflow as portable JSON |
| `import_workflow` | Import a workflow from exported JSON |

### Public Form Links

Public form links are the external intake surface for workflows with
`context.executionInputConfig` fields. Use them when people outside the
workspace need to submit a workflow form without signing in: inbound lead
forms, pitch deck submissions, referral forms, support intake, assessment
questionnaires, or any workflow whose first step is a manual/input trigger.

Do **not** use a public form link for internal child workflows. Child workflows
should use `context.executionInputConfig.internal: true` and be called from
another workflow with `agentled.call-workflow`.

| Tool | Description |
|------|-------------|
| `list_public_form_links` | List existing public form links for a workflow |
| `create_public_form_link` | Create and enable a public form link |
| `update_public_form_link` | Enable/disable a link or update limits, expiry, auto-share, and thank-you copy. To revoke external access, set `enabled: false`. |

> **Deletion is intentionally not exposed via the external API or MCP.** To
> revoke a public form link, call `update_public_form_link` with
> `enabled: false`. Permanent deletion requires an authenticated workspace
> member acting through the UI — destructive ops on the form-link surface are
> not granted to the public API key.

Typical agent flow:

```text
1. get_workflow({ workflowId })
2. Confirm context.executionInputConfig exists and is not internal.
3. list_public_form_links({ workflowId })
4. If none exists, create_public_form_link({ workflowId, enabled: true })
5. Return the publicUrl to the user.
```

The public URL is `/en/forms/{formLinkId}`. On submit, Agentled validates the
form link, starts the workflow with the submitted `input`, records a
`PublicFormSubmission`, and increments `submissionCount`. Optional settings:

- `enabled`: disable without deleting the link.
- `expiresAt`: ISO datetime expiry.
- `submissionLimit`: maximum accepted submissions.
- `autoShare`: when true, the public form status page can show generated
  results after completion. Use this only when the workflow output is safe for
  the submitter to see.
- `shareExpiresInDays`: expiry for auto-shared result links.
- `successMessage`: custom thank-you message after submission.

### Internal-only Workflows

Mark a workflow as a child / sub-workflow that is only run via `agentled.call-workflow` from an orchestrator by setting `context.executionInputConfig.internal: true`. The UI then hides the Run button and replaces the manual run form with an info banner. Inputs are still validated and passed by orchestrators via `executionInputData` exactly as before — this is a UI guard, not a runtime restriction.

Use it for any workflow whose goal/description starts with "Internal sub-workflow", that ends in a `return` step, or that you only intend to invoke from another workflow.

```json
{
  "context": {
    "executionInputConfig": {
      "title": "Save Sourced Candidates",
      "internal": true,
      "fields": [{ "name": "candidates", "label": "Candidates", "type": "text", "required": true }]
    }
  }
}
```

Flip the flag via `update_workflow_context` — fetch first, merge locally, replace at the parent level (the merge-order trap from `update_step` applies here too — see [`docs/MCP_STEP_EDITING.md`](../docs/MCP_STEP_EDITING.md)):

```jsonc
// 1. get_workflow → read context.executionInputConfig
// 2. local: { ...executionInputConfig, internal: true }
// 3.
{
  "updates": { "context": { "executionInputConfig": {...full merged value...} } },
  "replace": ["context.executionInputConfig"]
}
```

### Editing existing workflows: merge model

`update_step` accepts three explicit operations on the same call. At least one must be non-empty.

- **`updates`** — partial step patch, **deep-merged ONE LEVEL deep**. Top-level scalars are replaced; nested objects (`pipelineStepPrompt`, `stepInputData`, etc.) get their direct keys merged with the stored value's keys. Keys nested two levels deep are overwritten as a unit, not merged.
- **`replace: string[]`** — dot-paths whose values from `updates` are assigned **wholesale**, skipping the deep-merge. Use this for **dictionary-shaped fields where keys are user data** (not config) — patching one inner key with `updates` alone silently wipes the others.
- **`unset: string[]`** — dot-paths to delete. Each path must currently exist on the step (validated against the original).

**Read before editing dictionary fields.** Before changing `stepInputData.fieldUpdates`, `pipelineStepPrompt.responseStructure`, `knowledgeSync.fieldMapping`, or any field where keys are user data: call `get_step({ workflowId, stepId })` (~1KB), modify locally, send the full new object back via `replace[]`. This avoids the "patched one key, silently wiped the others" trap.

**Diff in the response.** Every `update_step` call returns `diff: { addedPaths, changedPaths, removedPaths }` and `warnings[]`. If the merge silently removed ≥6 fields without an explicit `unset`, a warning fires.

**What to use where:**

| Path / field | API | How to edit | Notes |
|---|---|---|---|
| `name`, `goal`, `description`, `pipelineStepPrompt.template`, `creditCost` | `update_step` | `updates` | Plain scalar; safe to send alone. |
| `next`, `loopConfig`, `entryConditions` (full block) | `update_step` | `updates` | Direct nested config; sending the new value wholesale is fine. |
| `tools`, `integrations` | `update_step` | `updates` | Arrays replace wholesale by design. To append, fetch with `get_step`, splice locally, send the full new array. |
| `stepInputData.fieldUpdates` | `update_step` | `get_step` → `updates` (full dict) + `replace: ["stepInputData.fieldUpdates"]` | Keys are user data; default one-level merge replaces this dict and can drop sibling mappings. |
| `pipelineStepPrompt.responseStructure` | `update_step` | `get_step` → `updates` + `replace: ["pipelineStepPrompt.responseStructure"]` | Output-shape dictionary; treat as user data. |
| `knowledgeSync.fieldMapping` | `update_step` | `get_step` → `updates` + `replace: ["knowledgeSync.fieldMapping"]` | Source→target dict; same trap as `fieldUpdates`. |
| `renderer.config` (when preserving sibling keys matters) | `update_step` | `updates` (full `renderer.config`) + `replace: ["renderer.config"]` | ⚠ `replace: ["renderer.config.layout"]` does NOT protect `renderer.config`'s siblings — one-level deep-merge runs first on `updates.renderer`. Replace at the parent level. |
| `entryConditions.criteria` (when preserving the rest of `entryConditions`) | `update_step` | `updates: { entryConditions: {...full block...} }` | Send the full `entryConditions` block; one-level merge already does the right thing for direct children. |
| Removing a step input or stale field | `update_step` | `unset: ["stepInputData.oldKey"]` | Cleanest way to remove. Path must exist on the original. |
| `context.inputPages`, `context.outputPages`, `context.executionInputConfig` | `update_workflow_context` | Three explicit verbs (`updates` / `replace` / `unset`) on workflow-relative paths. Compatibility: `{ contextKey, value }` still accepted for wholesale per-key replacement. | **Workflow-level, not step-level.** `update_step` cannot reach `context.*` and vice versa. |
| `metadata` | `update_workflow_context` | Same three verbs on `metadata.*` paths | Workflow-level. Metadata bypasses the draft snapshot — even on live workflows it writes direct to the Pipeline row, immediately. |

**Executive summaries for workflow groups.** When a user asks to save a summary for a workflow, workflow group, cluster, or home card, write it to `metadata.executiveSummary` with `update_workflow_context`. Do not store it as Knowledge text unless the user explicitly asks for a reusable note. For a group, write exactly once to the owner pipeline: prefer `metadata.workflowGraph.role === "orchestrator"`, otherwise use the lowest `metadata.workflowGraph.order` pipeline. Keep the body to 1-2 short sentences, include concrete counts/rates and the reporting period when available, and set `author` to the active workspace agent, not the external tool/coding agent.

```jsonc
{
  "workflowId": "2e1cdd60-2fcf-441a-856f-583ae76b38a5",
  "updates": {
    "metadata": {
      "executiveSummary": {
        "body": "Startup Outreach sent 46 founder emails for the reporting period, with 28 opens and 9 clicks: a 60.9% open rate, 19.6% click rate, and 32.1% click-to-open rate.",
        "bullets": ["Clicks: 6 UTM Pitch Night, 2 plain Pitch Night, 1 calendar."],
        "generatedAt": "2026-06-03T00:00:00.000Z",
        "author": "AngelHive Assistant"
      }
    }
  }
}
```

**Type changes.** `step.type` is technically mutable but stale type-specific fields (`pipelineStepPrompt`, `app`, `tools`, `orchestratorConfig`) persist unless you `unset` them. For clean conversions, prefer `remove_step` + `add_step`.

**Live workflows.** Edits are routed to a draft snapshot. Response includes `editingDraft: true`. Inspect via `get_draft`, ship via `promote_draft`, throw away via `discard_draft`. For high-stakes edits, `create_snapshot` first as a manual checkpoint.

**Draft staleness.** When a draft exists, every `update_step` and `get_step` response includes a `draft` summary with `exists`, `draftCreatedAt`, `liveUpdatedAt`, `stale`, `modifiedStepIds`, and `modifiedFields`. If `draft.stale === true`, the live workflow advanced after the draft was created — promoting will land the draft's older values for fields you didn't touch. `update_step` also emits a staleness warning. Recovery: `discard_draft` and re-apply.

⚠ **`discard_draft` only reverts pending context (and step) changes — NOT metadata.** Metadata writes via `update_workflow_context` bypass the draft and apply immediately to the live Pipeline row. If you need a single rollback point covering metadata too, `create_snapshot` before the edit. See [`docs/MCP_STEP_EDITING.md`](../docs/MCP_STEP_EDITING.md) for the full atomicity contract.

**Never** send a full `steps[]` array via `update_workflow`. Use `update_step`, `add_step`, `remove_step` instead.

For the deep reference (StepMergeError codes, dot-path validation rules, full diff semantics) see [`docs/MCP_STEP_EDITING.md`](../docs/MCP_STEP_EDITING.md).

### Drafts & Snapshots

| Tool | Description |
|------|-------------|
| `get_draft` | Get the current draft version of a workflow |
| `promote_draft` | Promote a draft to the live version |
| `discard_draft` | Discard the current draft |
| `create_snapshot` | Create a manual config snapshot |
| `delete_snapshot` | Delete a specific config snapshot |
| `list_snapshots` | List version snapshots for a workflow |
| `get_snapshot_content` | Read a snapshot's full config (steps, context, etc.) without restoring it |
| `restore_snapshot` | Restore a workflow to a previous snapshot |

### Executions

| Tool | Description |
|------|-------------|
| `start_workflow` | Start a workflow execution with input. Returns `executionInputId` always and `executionId` only when the async execution row is already available. Pass `useMocks: false` to force a real (credit-consuming) run that ignores per-step mock data; defaults to honoring the workflow's configured mocks. |
| `list_executions` | List executions for a workflow (paginated via `nextToken`), including `pipelineExecutionInputId` for matching a start result that only returned `executionInputId`. |
| `get_execution` | Get execution details with step results. Requires the real `executionId`, not `executionInputId`; if needed, call `list_executions` and match `pipelineExecutionInputId`. |
| `list_timelines` | List step execution records (timelines) for an execution (paginated via `nextToken`) |
| `get_timeline` | Get a single timeline by ID with full step output |
| `stop_execution` | Stop a running execution |
| `retry_execution` | Retry a failed step — auto-detects the most recent failure if no timeline ID provided |
| `rerun` | Rerun or retry any step by `timelineId` — works for failed AND succeeded steps, disambiguates loop iterations |

Run deep links use `/<locale>/<workspace>/<workflowPathname>/runs?runId=<executionId>&step=<stepId>`.
The `step` query param is optional; when present, the app expands that workflow
step and scrolls to it. `stepId` is the workflow step id, not the timeline id.
Inside the app chat/navigation tool surface, `navigateToExecutionPage` accepts
the same optional `stepId`.

Knowledge row deep links use `/<locale>/<workspace>/knowledge-and-data/<listKey>?rowId=<rowId>`.
The app opens the Knowledge & Data list page and opens the row editor sheet for
that row. The backwards-compatible route
`/<locale>/<workspace>/knowledge-and-data/<listKey>/row/<rowId>` redirects to the
canonical query-param URL.

Knowledge text deep links use `/<locale>/<workspace>/knowledge-and-data/<key>`.
The backwards-compatible route
`/<locale>/<workspace>/knowledge-and-data/text/<key>` redirects to the canonical
item URL.

### Apps & Testing

| Tool | Description |
|------|-------------|
| `list_apps` | List available apps and integrations |
| `get_app_actions` | Get action schemas for an app |
| `test_app_action` | Test an app action without creating a workflow |
| `test_ai_action` | Test an AI prompt without creating a workflow |
| `test_code_action` | Test JavaScript code in the same sandboxed VM as production |
| `get_step_schema` | Get allowed PipelineStep fields grouped by category |

#### AI step types: `aiAction` vs `aiActionWithTools`

Pick the right type — `validate_workflow` will reject the wrong one:

| You need… | Use |
|-----------|-----|
| Reason over inputs already present in the prompt variables | `aiAction` (single LLM call, no tool loop) |
| Live web search, workspace memory recall/write, knowledge-graph lookup | `aiActionWithTools` with the matching `builtinType` |
| The AI to decide at runtime what inputs to pass to an app action | `aiActionWithTools` with an `appActionConfig` tool |

**`aiActionWithTools` requires at least one tool** — placed under `step.tools` **or** `step.agent.tools` (both are merged at runtime). If you omit tools from both locations, `validate_workflow` returns a blocker `AI_STEP_TOOLS_REQUIRED`. If the prompt says "search the web" / "recall memory" / "knowledge graph" without the matching tool attached, you get a warning `AI_STEP_TOOL_PROMPT_MISMATCH`: web-search prompts need `web_search`; memory prompts need `workspace_memory`; KG lookup prompts need `kg_search` or `kg_traverse`. `fetch_website_content` fetches a known URL and `kg_write` writes KG data, so neither satisfies those lookup/search prompts.

Valid `builtinType` values: `web_search`, `file_search`, `code_interpreter`, `fetch_website_content`, `kg_search`, `kg_traverse`, `kg_nodes`, `kg_write`, `workspace_memory`.

#### Prompt caching for repeated AI steps

Agentled enables provider prompt caching where supported. Caching reuses prompt processing for an identical prefix; it does not cache or replay the AI response. To benefit in bulk workflows, especially scoring/matching loops, write prompts with the stable material first:

```text
[stable role and task]
[stable rubric / scoring dimensions]
[stable output JSON schema]
[stable examples or decision rules]

Runtime inputs:
{{currentItem}}
{{steps.previous.output}}
{{input.field}}
```

Do not start high-volume prompts with `INPUTS`, `{{currentItem}}`, `{{steps.*}}`, `{{input.*}}`, `{{execution.id}}`, `{{now}}`, or `{{today}}`. Keep changing payloads, dates, execution IDs, and per-item records at the end so OpenAI/Anthropic can cache the shared prefix.

```jsonc
// aiActionWithTools example
{
  "id": "research",
  "type": "aiActionWithTools",
  "name": "Research Company",
  "tools": [
    { "type": "builtin", "builtinType": "web_search", "name": "Web Search" }
  ],
  "pipelineStepPrompt": {
    "template": "Search the web for the founder of {{input.company}} and return their name.",
    "responseStructure": { "firstName": "string", "lastName": "string" }
  },
  "creditCost": 10,
  "next": { "stepId": "find-email" }
}
```

### Knowledge & Data

| Tool | Description |
|------|-------------|
| `get_workspace` | Get workspace info, company settings, active team members, pending invitations, and knowledge-list schemas |
| `get_workspace_company_profile` | Get the editable workspace company profile and company knowledge text |
| `update_workspace_company_profile` | Update top-level company profile fields like name, URLs, logo, industry, size, and additional information |
| `update_workspace_executive_summary` | Write the workspace-wide executive summary on the Workspace Assistant card |
| `list_pinned_outputs` | List output pages pinned to the workspace home/sidebar |
| `set_output_page_pin` | Pin or unpin a workflow output page on the workspace home/sidebar |
| `list_knowledge_lists` | List knowledge lists in the workspace |
| `get_knowledge_rows` | Get rows from a knowledge list (paginated via `nextToken`, max 200) |
| `get_knowledge_rows_by_ids` | Fetch specific rows by ID (max 200) — use after `query_kg_edges` |
| `get_knowledge_text` | Get text content from a knowledge entry |
| `create_knowledge_list` | Create a new knowledge list with a typed schema (idempotent on key collision) |
| `update_knowledge_list_schema` | Add or remove fields on an existing list schema |
| `delete_knowledge_list` | Permanently delete a list and all its rows |
| `upsert_knowledge_rows` | Insert or update rows in a list (max 500/call, per-row error reporting) |
| `delete_knowledge_rows` | Delete rows by ID |
| `upsert_knowledge_text` | Create or update a text knowledge entry |
| `delete_knowledge_text` | Delete a text knowledge entry by key |
| `query_kg_edges` | Query knowledge graph edges |
| `get_scoring_history` | Get scoring history for an entity |


### Credits and Cost Drivers

Credit reporting tools are opt-in for cost-driver detail so existing balance checks stay compact.
Every credit total is ledger-derived and returned with a `period` object containing `label`, `display`, `start`, and `end`; always show that period label next to totals.

For a human/operator UI check, open the workspace credit usage page:

```text
https://www.agentled.app/en/{workspace}/account/billing/credits-usage
```

Example: `https://www.agentled.app/en/inovexus/account/billing/credits-usage`.

| Tool | Description |
|------|-------------|
| `get_workspace_credits` | Workspace balance, usage, executions, and recent ledger rows. Optional args: `period`, `includeCostDrivers`, `includeRecentUsage`, `limit`. |
| `get_workspace_credit_cost_drivers` | Convenience report with `includeCostDrivers=true` by default. Returns bounded top workflows, steps, models, and apps. |
| `get_workflow_credits` | Workflow-level usage and optional cost drivers, scoped to workflows in the authenticated API key workspace. |

Supported periods:

- `rolling-30-days`: moving 30-day window ending at request time.
- `rolling-7-days`: moving 7-day window ending at request time.
- `current-month` / `month-to-date`: UTC calendar month-to-date, not the billing renewal period.
- `previous-month`: prior UTC calendar month.
- `all-time`: full ledger before the request time; use intentionally because it can scan more rows.

Examples:

```jsonc
// Compact balance/burn-rate check
{ "tool": "get_workspace_credits", "arguments": { "period": "rolling-30-days" } }

// Workspace cost drivers for a calendar month-to-date window
{ "tool": "get_workspace_credit_cost_drivers", "arguments": { "period": "current-month", "limit": 5 } }

// Workflow cost drivers
{ "tool": "get_workflow_credits", "arguments": { "workflowId": "wf_abc123", "period": "rolling-30-days", "includeCostDrivers": true } }
```

External API equivalents:

```text
GET /api/external/workspace/credits?period=rolling-30-days&include=costDrivers&limit=5
GET /api/external/workflows/{workflowId}/credits?period=current-month&include=costDrivers
```

Billing-period reporting is separate from calendar-month reporting and should not be implied unless a future API adds an explicit billing-period label.

### Branding (Whitelabel)

| Tool | Description |
|------|-------------|
| `get_branding` | Get the workspace's whitelabel branding config (displayName, logo, colors, favicon, badge) |
| `update_branding` | Update branding — set displayName, logoUrl, tagline, primaryColor, primaryColorDark, faviconUrl, hideBadge |

### Agents

First-class workspace agents with identity, instructions, tools, config files, and assigned workflows. All agents are conversational (chat-only). For scheduled/autonomous work, attach routines via `create_routine`. `SOUL.md` and `TOOLS.md` live in `configFiles`; reflection context (`JOURNAL.md`, `OBJECTIVES.md`, `PEOPLE.md`) lives as linked AgentFiles and is auto-seeded for active chat-only reflection agents. Agents decide what durable signal belongs in those files; AgentLed only provides scoped storage and scheduled Reflection. An agent created entirely via MCP renders identically to one built in the Agent Wizard.

| Tool | Description |
|------|-------------|
| `list_agents` | List agents in the workspace (filter by status: active, paused, draft) |
| `get_agent` | Get full agent config — instructions, files, workflows, attached routines |
| `create_agent` | Create an agent. Accepts `agentType` presets (personal-assistant, competitive-researcher, social-media-marketer, customer-support, content-marketer, lead-qualifier, deal-sourcer, custom), `enabledApps`, `appPermissions`, `assignedWorkflowIds`, `linkedFileIds`, `configFiles` (SOUL.md/TOOLS.md), `avatar_icon_name`, `avatar_color`, `chatModel`, `activate: true` |
| `update_agent` | Partial update — same fields as `create_agent`; `updates.slug` renames the agent email slug, moves the `AgentEntity` id to `{slug}@{workspace}`, and rebinds routines/file links/channel sessions/chat sessions where available |
| `activate_agent` | Activate an agent (draft/paused → active). Attached routines begin running on schedule |
| `pause_agent` | Pause an active agent. Attached routines stop until resumed |
| `manage_agent_workflows` | Add/remove/set the workflows assigned to an agent without rewriting the full config |
| `delete_agent` | Permanently delete an agent and all its files |
| `chat_with_agent` | Send a message to a specific agent. Multi-turn via `session_id` |

Slug convention: `slug` is the short role ID used in URLs and email addresses. Keep `Agent` in the display name when useful, but do not append `-agent` to the slug just because the display name includes it; for example, `Deal Sourcing Agent` should use `deal-sourcing@{workspace}.agentled.ai`, not `deal-sourcing-agent@{workspace}.agentled.ai`.

#### Agent Files

| Tool | Description |
|------|-------------|
| `list_agent_files` | List files attached to an agent (knowledge, context, reference docs) |
| `get_agent_file` | Get the content of a specific agent file |
| `upload_agent_file` | Upload a file (max 400KB text/markdown) to an agent |
| `update_agent_file` | Update a file already attached to an agent; use this after `get_agent_file` for `JOURNAL.md`, `OBJECTIVES.md`, and `PEOPLE.md` edits |
| `delete_agent_file` | Delete a file from an agent |

Reflection files follow the same durable markdown pattern used by OpenClaw and Hermes memory surfaces: keep `JOURNAL.md` as a concise dated log, `OBJECTIVES.md` as active/completed goals, and `PEOPLE.md` as stable relationship context. Read first, update only when there is durable signal, and send full replacement content. See `docs/AGENT_REFLECTION_FILES.md` for the UI, MCP, and CLI editing contract.

#### Routines

Routines are scheduled prompts attached to an agent — the agent evaluates the prompt on a set interval and can trigger workflows or send notifications.

Example — add a daily deal-sourcer routine to an existing agent:
```
# Step 1: create the agent
create_agent({
  name: "Daily Deal Sourcer",
  agentType: "deal-sourcer",
  enabledApps: ["agentled", "kg", "web-scraping"],
  appPermissions: {
    kg: { access: "write", writeApprovalRequired: true },
    "web-scraping": { access: "read" }
  },
  assignedWorkflowIds: ["<opportunity-scoring-workflow-id>"],
  activate: true
})

# Step 2: attach a routine
create_routine({
  agent_id: "<agent-id>",
  name: "Daily Sourcing Run",
  prompt: "Find 5 new SaaS startups that match our deal criteria and trigger the scoring workflow for each.",
  interval: "daily"
})
```

Read access is implicit and never requires approval. The internal `agentled` app is selected as an app when needed but is not configurable in `appPermissions`.

| Tool | Description |
|------|-------------|
| `list_routines` | List all routines for an agent |
| `create_routine` | Create a routine (name, prompt, interval) |
| `update_routine` | Update routine fields; recalculates nextRunAt if interval changes |
| `pause_routine` | Pause a routine |
| `resume_routine` | Resume a paused routine |
| `trigger_routine` | Run a routine immediately without changing its schedule |
| `delete_routine` | Permanently delete a routine |

Interval values: `weekday-morning`, `weekday-evening`, `weekly-monday`, `weekly-tuesday-evening`, `weekly-friday-evening`, `daily`, `monthly`, `6h`, `48h`.

#### Deprecated Low-Level Runtime

Direct low-level monitor-runtime MCP tools are deprecated and no longer
registered. Use `create_agent` / `update_agent` plus routines for autonomous
work.

### Channels (Email, Slack, WhatsApp, Signal)

Channels route inbound messages into the agent chat runtime. Each channel has a `defaultAgentId` that decides which agent handles the conversation. Replies are sent back through the originating channel.

| Tool | Description |
|------|-------------|
| `list_channels` | List configured channels with their `defaultAgentId`, enabled state, and non-secret config (secrets redacted) |
| `set_channel_default_agent` | Assign the agent that handles a channel's inbound conversations |
| `configure_channel` | Update non-secret channel config — `enabled`, `defaultAgentId`, `allowedSenders` (email), `defaultChannelId` (slack) |
| `set_channel_defaults` | Update workspace-wide defaults: `maxSessionsPerDay`, `sessionTimeoutMinutes`, `toolMode` |

> Secret credentials (Slack bot tokens, signing secrets, WhatsApp access tokens, Signal webhook secrets) are NEVER readable or writable via the external API. Connect those via Settings → Channels in the UI — OAuth flows store them encrypted at rest.

### Conversational Agent

| Tool | Description |
|------|-------------|
| `chat` | Send a message to the AgentLed AI agent. Build workflows through natural language — no JSON required. Supports multi-turn conversations via session_id. |

#### Chat Tool — Usage & Examples

The `chat` tool is a conversational AI agent that can reason, plan, and build workflows through dialogue. Think of it as the difference between `gh api` (raw) and `gh copilot` (intelligent).

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `message` | string | Yes | The message to send to the AI agent |
| `session_id` | string | No | Session ID from a previous response, for multi-turn conversations |

**Response format:**

```json
{
  "response": "The agent's reply — may include workflow suggestions, explanations, or confirmation of actions taken",
  "sessionId": "mcp-chat-ws123-1711929600000"
}
```

**Multi-turn conversation:**

```
# Turn 1: Describe what you want
chat("Build me a workflow that enriches LinkedIn companies and scores them by ICP fit")
# → Agent responds with a plan and creates a draft workflow
# → Response includes sessionId: "mcp-chat-ws123-1711..."

# Turn 2: Iterate on the design
chat("Add an email finding step using the company domain", session_id: "mcp-chat-ws123-1711...")
# → Agent modifies the workflow, maintaining conversation context

# Turn 3: Finalize
chat("Looks good, publish it as live", session_id: "mcp-chat-ws123-1711...")
# → Agent publishes the workflow
```

**When to use `chat` vs structured tools:**

| Use `chat` when... | Use structured tools when... |
|---------------------|------------------------------|
| You have a high-level goal | You know the exact pipeline JSON |
| You want AI recommendations | You need precise control |
| You're exploring available skills or integrations | You're automating a known pattern |
| You want to iterate through dialogue | You're doing bulk operations |

**Notes:**
- 5-minute timeout — break complex requests into smaller steps if needed
- Responses are non-streaming (collected then returned) for MCP client compatibility
- The agent has full access to planning tools, workflow builder, and workspace context
- Error responses include actionable messages (e.g., timeout → "try breaking it into smaller steps")

### Intent Router

| Tool | Description |
|------|-------------|
| `do` | Natural language intent router — describe what you want and it auto-selects and executes the right tool |

### Help & Feedback — Talk to the Agentled Team

**For AI agents — pick the right channel:**

| What you hit | Where it goes |
|-------------|---------------|
| Workflow not behaving as expected, app/integration question, platform/billing question, missing feature, anything about how Agentled works | Call `submit_feedback_to_agentled` (below). Routes straight to the team. |
| Bug in the **CLI itself** (`agentled` command crashes, writes wrong data to `.agentled/`, flag doesn't work) — a reproducible CLI code defect | File a GitHub issue at <https://github.com/agentled/mcp-server/issues>. Include CLI version + reproduction steps. |
| Anything else, or you're not sure | `submit_feedback_to_agentled` — the team will reroute if needed. |

> **Do not** search npm metadata, scrape GitHub, or shell out to `gh` to "find" a bug tracker — the routes above are the only ones. The `bugs` field in the package points at the human contact page (<https://www.agentled.ai/en/contact-us>) on purpose.

**For humans:** email **contact@agentled.ai** or visit <https://www.agentled.ai/en/contact-us>.

| Tool | Description |
|------|-------------|
| `submit_feedback_to_agentled` | Ask a question, file a bug, request a feature, or escalate an issue. Types: `ask`, `bug`, `feature_request`, `escalation`. Provide `userEmail` if you want a reply. |

### Coming from n8n?

Import existing n8n workflows and make them AI-native:

| Tool | Description |
|------|-------------|
| `preview_n8n_import` | Preview an n8n workflow import (dry run) |
| `import_n8n_workflow` | Import an n8n workflow into Agentled |

## Looking Up Entity-Scoped Data

When you need all records related to a specific entity, use the two-tool chain instead of paginating `get_knowledge_rows`:

**Example 1 — all deals scored by an investor:**
```
1.  query_kg_edges({ entityName: "Investor Name", relationshipType: "SCORED" })
    → returns edges with targetNodeIds

2.  get_knowledge_rows_by_ids({ rowIds: <targetNodeIds from step 1> })
    → returns full row data for each matched deal
```

**Example 2 — all leads sourced from a campaign:**
```
1.  query_kg_edges({ entityName: "Campaign Name", relationshipType: "SOURCED" })
    → returns edges with targetNodeIds

2.  get_knowledge_rows_by_ids({ rowIds: <targetNodeIds from step 1> })
    → returns full contact/lead rows
```

**Why this matters:** `get_knowledge_rows` is limited to 200 rows per call. At 3k rows that means 15 round trips; at 10k it means 50. The KG-edge path is O(edges for that entity) — independent of total list size — so it stays fast regardless of how large the list grows.

**Node ID convention:** `source_node_id` and `target_node_id` values from `query_kg_edges` are knowledge row IDs. Rows outside the authenticated workspace are silently excluded.

## For Agencies: White-Label Ready

Build workflows once, deploy to multiple clients under your own brand. Configure branding directly from the MCP server:

```
"Set my workspace branding: displayName 'Acme AI', primaryColor '#6366f1', tagline 'Powered by Acme'"
```

Use `get_branding` and `update_branding` to manage displayName, logo, colors, favicon, tagline, and badge visibility. Client portal appearance updates instantly.

## Persistent Memory — Examples

Memories let workflows learn across executions. Store what worked, recall it next time.

### Store a fact after enrichment

```
"Store a memory: key 'icp_criteria', value { industry: 'fintech', minEmployees: 50, region: 'EU' },
category 'preference', scope 'workspace'"
```

### Recall before scoring

```
"Recall memory 'icp_criteria' at workspace scope — use it to score this batch of leads"
```

### Search for past outcomes

```
"Search memories for 'conversion rate' in the 'outcome' category"
```

### Track a running metric

```
"Store memory: key 'total_leads_processed', value 43, merge 'increment', scope 'workspace'"
```

Each subsequent call with `merge: 'increment'` adds to the existing value — no read-modify-write needed.

### Outreach PCPL

For email or outbound workflows, track PCPL as a business metric:

```
PCPL = prospects contacted / positive replies
```

Use `analyticsConfig` for contacted prospects, positive replies, and PCPL. Literal PCPL should use a `ratio` metric with `ratioMode: "raw"`; positive reply rate should use the default percentage ratio.

## Routines — Examples

Routines are scheduled prompts attached to agents. Use them for autonomous work
such as daily checks, weekly digests, and workflow follow-up.

### Create an agent with a daily sourcing routine

```
"Create a deal sourcing agent, then add a daily routine that checks the
incoming-leads knowledge list and starts the lead-enrichment workflow for
qualified new rows. Limit the routine to 10 workflow starts per day."
```

Tool sequence:

```
create_agent({
  name: "Daily Deal Sourcer",
  agentType: "deal-sourcer",
  enabledApps: ["agentled", "kg"],
  assignedWorkflowIds: ["wf_abc123"],
  activate: true
})

create_routine({
  agent_id: "<agent-id-or-slug>",
  name: "Daily New Lead Review",
  prompt: "Review incoming-leads, identify qualified new rows, and start the lead-enrichment workflow for each. Do not start more than 10 workflow runs in one day.",
  interval: "daily",
  max_steps_per_run: 20,
  max_credits_per_day: 50
})
```

### Create a weekly workflow health routine

```
"Add a weekly routine to the operations agent that reviews workflow execution
history, flags abnormal failures, and notifies me only when action is needed."
```

```
create_routine({
  agent_id: "operations",
  name: "Weekly Workflow Health Review",
  prompt: "Review recent workflow execution history. If failures or stalls require action, summarize the affected workflows, likely impact, and recommended next step. Otherwise record that no action is needed.",
  interval: "weekly-monday"
})
```

### Pause and resume

```
"Pause routine <routine-id>"
"Resume routine <routine-id>"
"Run routine <routine-id> now"
```

## Works With

- **Claude Code** (Anthropic)
- **Codex** (OpenAI)
- **Cursor**
- **Windsurf**
- Any MCP-compatible client

## Links

- [Agentled Platform](https://www.agentled.app)
- [npm Package](https://www.npmjs.com/package/@agentled/mcp-server)
- [GitHub](https://github.com/Agentled/mcp-server)
- [Report Issues](https://github.com/Agentled/mcp-server/issues)

## Building from Source

```bash
git clone https://github.com/Agentled/mcp-server.git
cd mcp-server
npm install
npm run build
```

## License

MIT
