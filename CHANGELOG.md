# Changelog

## [0.19.2] - MCP Server

### Typed onboarding-goal management

- Added read and typed mutation tools for onboarding-goal policy, approval paths, finish lines, goal briefs, skill bindings, and primary CRM references.
- Returned freshly resolved live safeguards and actor-attributed audit IDs without running workflows, providers, or external sends.

## [0.19.1] - MCP Server

### LinkedIn assistant skill and sourcing readiness

- Bundled the LinkedIn assistant operating skill for MCP/plugin installations.
- Added source-readiness fields to shared-assistant sourcing previews and provisioning.
- Updated the shared Core dependency for the source-readiness contract.

## [0.19.0] — MCP Server

### Use-case operations and external-agent safety

- Added resolved use-case operating context and source-backed operations-header fields to use-case tools.
- Exposed workflow deletion confirmation tokens through the MCP contract.
- Removed the temporary control-router tool after install-kit provisioning moved behind internal APIs.
- Kept MCP and standalone CLI behavior aligned for the shared-assistant sourcing lifecycle.

## [0.18.0] — MCP Server

### Claude Code plugin (MCP-016)

- **First-party Claude Code plugin** — `plugins/agentled/` now carries a `.claude-plugin/plugin.json` alongside the existing Codex manifest, over the same shared `skills/` and `.mcp.json`. Install from Claude Code with `/plugin marketplace add Agentled/mcp-server` then `/plugin install agentled@agentled`, set `AGENTLED_API_KEY`, and you get the `agentled:agentled` skill plus the auto-started MCP server in one step.
- **Marketplace catalog** at `.claude-plugin/marketplace.json` (synced to the public repo on publish).
- Added the previously missing shared `plugins/agentled/.mcp.json` referenced by the Codex manifest.
- `publish.sh` now stamps the Claude plugin manifest version, mirrors canonical `skills/` into the plugin (fixing prior drift), and syncs `plugins/`, `.claude-plugin/`, `README.md`, and `CHANGELOG.md` to the standalone repo.

### Workflow executive summaries

- `update_workflow_context` now documents the canonical `metadata.executiveSummary` write shape for workflow and workflow-group home summaries, including owner-pipeline selection, short operator-facing copy, metric/reporting-period guidance, and workspace-agent attribution.
- `update_workspace_executive_summary` exposes the workspace-wide summary write through MCP with the same `{ body, bullets?, author? }` signature as cluster summaries, while the API patches only `Workspace.metadata.executiveSummary`.

### Knowledge rows pagination

- `get_knowledge_rows` now accepts `nextToken`, returns the next cursor from the external API response, and raises the page limit from 50 to 200.
- `agentled knowledge rows` now exposes `--status` and `--next-token` for status-scoped pagination from the CLI.

## [0.14.3] — MCP Server

### Global install + Claude Code scope

- **Removed `bin.agentled` from this package** — it conflicted with `@agentled/cli` (`EEXIST` on `npm install -g @agentled/mcp-server` when the CLI was already installed). Use `npm install -g @agentled/cli` for the `agentled` terminal command; use `npx -y @agentled/mcp-server` or the `agentled-mcp-server` / `mcp-server` binaries for MCP. `npx @agentled/mcp-server create|help|version` still works: those subcommands are routed from the main entry.
- **`npx @agentled/mcp-server --setup`** runs `claude mcp add … --transport stdio --scope user <name> …` so onboarding registers **user-scoped** MCP (available in all projects). **`--transport stdio`** selects the stdio transport (local process talking over stdin/stdout), as required for command-based MCP servers in [Claude Code MCP](https://docs.claude.com/en/docs/claude-code/mcp.md). **`<server-name>` must come before `-e` / `--env`** on Claude Code 2.1+ ([anthropics/claude-code#25490](https://github.com/anthropics/claude-code/issues/25490)); env flags before the name trigger “Invalid environment variable format”. App copy-paste (Developer settings) and docs follow that order.

## [0.14.0] — MCP Server

### CLI update notifier (MCP-035)

The `agentled` CLI now tells users when a newer version of
`@agentled/mcp-server` is available on npm. Motivated by a month-long
stretch of shipping incremental-authoring improvements (MCP-031/033/034)
that users only pick up if they actually upgrade — a silent CLI is a
stale CLI.

- **Dependency-free implementation** (`src/cli/update-check.ts`). Uses
  Node 18+ native `fetch` and `AbortController` — matches the rest of
  the CLI's zero-dep posture.
- **Cache-first** — one HTTP round-trip to `registry.npmjs.org` per 24
  hours; cache hits are free. Cache lives at
  `$XDG_CONFIG_HOME/agentled/update-check-<pkg>.json` (falls back to
  `~/.config/agentled/`).
- **Hard timeout** — fetch capped at 1.2s via `AbortController`, so the
  worst-case latency added to any CLI invocation is bounded. Fetch
  failures fall back to stale cache rather than silently suppressing a
  known update.
- **Opt-out** honors `AGENTLED_NO_UPDATE_CHECK=1`, `NO_UPDATE_NOTIFIER=1`,
  `CI`, and `CONTINUOUS_INTEGRATION`; auto-disabled when stderr is not
  a TTY (e.g. piped output).
- **Only the interactive CLI notifies** — wired into `bin/agentled`
  only. The MCP server bins (`agentled-mcp-server`,
  `agentled-mcp-server-http`, `mcp-server`) do not run the check
  because stderr writes would contaminate the MCP stdio protocol.
- **Notice renders on stderr** so piped stdout stays clean:

  ```
    ─── ◆ Update available: 0.13.0 → 0.14.0
        Run npx @agentled/mcp-server@latest to update.
  ```

Covered by 25 unit tests in `src/cli/__tests__/update-check.test.ts`
(semver compare, cache I/O round-trip with malformed-file handling,
disable-env matrix, end-to-end `checkForUpdate` with mocked fetcher for
fresh-cache / stale-cache / fetch-failure paths).

## [0.13.0] — MCP Server

### Steer agents to incremental edits via `update_step` (MCP-034)

Follow-up to MCP-031 / MCP-033. The `create_workflow` and `add_step`
descriptions had been rewritten to recommend incremental authoring and
to point at `get_step_schema` for shape-specific JSON examples, but
`update_step` was still a 9-line stub — agents editing existing
workflows kept reaching for `update_workflow` with full `steps` arrays
(silent truncation risk on large pipelines, vocabulary traps on
mis-typed step types).

- **`update_step` description rewritten (562 → 3491 bytes / 9 → 30
  lines).** Now leads with "Preferred path for any single-step edit on
  an existing workflow", explicit merge semantics (top-level shallow,
  nested objects deep-merged, arrays replaced wholesale, send `null`
  to remove a field), six common edit recipes (prompt change, app
  inputs, entry condition, convert to email shape, convert to report
  shape, swap tools, re-wire `next`), and a "What `update_step` will
  NOT do" block warning that `step.id` and `step.type` are immutable
  (use `remove_step` + `add_step` instead).
- **Shape conversions point at `get_step_schema`** — same pattern as
  `create_workflow`: never inline the email/report/supervisor JSON
  shape, point at the keyed catalog so the canonical example stays in
  one place.
- **`updates` Zod param** now documents merge semantics inline
  (deep-merged objects vs replaced arrays vs immutable id/type) so
  hosts that surface only the param schema (not the tool description)
  still get the safety rails.
- **Drift guard test** (`__tests__/step-shapes.test.ts` →
  `update_step description — incremental edit steer (MCP-034)`) locks
  in: ≤4KB budget, preferred-path framing, merge-semantics doc, the
  two `get_step_schema` shape pointers, no inlined JSON blobs, the
  immutable-id/type warning, and the draft-routing mention. 7 new
  cases, 28/28 pass.

## [0.12.0] — MCP Server

### Slim `create_workflow` description + keyed `get_step_schema` shapes (MCP-033)

Moves the Report / Email / Agent-Team / Share / Agentic-search JSON example
blocks out of the `create_workflow` tool description and into
`get_step_schema` keyed responses. Follows the MCP-031 review note:
`create_workflow` was ~6KB / 141 lines, large enough that some MCP hosts
truncate or skim it and the inline JSON duplicated information already
served by `get_step_schema`.

- **`create_workflow` description shrunk 6144 → 2713 bytes (55% reduction,
  141 → 32 lines).** Keeps the incremental-authoring steer (MCP-031), the
  closed `step.type` vocabulary, the pipeline field list, and the bulk
  round-trip caveat. Removes the inline JSON for report / email / share /
  agent-team shapes — those now live behind `get_step_schema`.
- **`get_step_schema` gains `stepType` + `shape` params.**
  - No args → full schema (backward compatible).
  - `{ stepType }` → schema + every registered shape example for that type.
  - `{ stepType, shape }` → schema + the one matching shape's minimal JSON
    example plus notes. Unknown shape returns the available list with a
    clear error string.
  - Registered shapes: `aiAction:standard | report | email`,
    `aiActionWithTools:standard | agentic-search`,
    `agentOrchestrator:supervisor`, `share:public`,
    `knowledgeSync:standard`.
- **`src/step-shapes.ts`** is the single source of truth for the shape
  catalog. Pure JS objects (not template strings) so each example is
  JSON-serializable, testable, and CLI-mirror-able. Drift guard in
  `__tests__/step-shapes.test.ts` locks in: closed vocabulary, type/shape
  consistency, ≤3KB `create_workflow` budget, no JSON example blocks in
  the description, and the full-approval-gate shape for composed email.

## [0.11.0] — MCP Server

### Tool-description steering: prefer incremental over bulk JSON (MCP-031)

`create_workflow` and `add_step` tool descriptions rewritten to steer agents
toward the incremental authoring path (`create_workflow({ name, goal })` →
`add_step` per step → `validate_workflow` → `publish_workflow`). Motivated by
a live client test where the same pipeline produced **0 errors via incremental
vs 13 errors via bulk JSON** — the bulk path gave the agent no per-step
feedback, no template-variable discovery, and no signal on the closed
vocabulary of valid `step.type` values.

- **`create_workflow` description** now leads with the recommended incremental
  flow and demotes the full-pipeline `pipeline.steps` param to "imports,
  templates, and JSON round-trips." The step-type enumeration is closed
  (was previously `"(trigger, aiAction, appAction, agentOrchestrator,
  milestone, etc.)"` — the "etc." invited the exact invented vocabulary
  (`ai`, `integration`, `knowledge_graph_query`) we've been seeing).
- **`add_step` description** — was a three-line stub, now includes the
  closed type enumeration, minimal shape per common step type (trigger,
  aiAction, appAction, aiActionWithTools, knowledgeSync, milestone),
  variable-reference rules (including the `{{input.X}}` vs
  `{{steps.trigger-id.X}}` gotcha), and pointers to `get_app_actions` /
  `list_models` / `get_step_schema` for pre-authoring lookups.
- **No Zod schema changes, no error blocking.** Bulk submit still works
  for legitimate imports; per-step authoring is just what agents see first
  and what the description recommends.

### Skill v0.5.0 — context-field + builtin-tool schema (MCP-029 + MCP-030)

Bumps the bundled Agentled skill to v0.5.0 to match `@agentled/cli` v0.5.0.
The "Before you build" section now points at two new CLI commands —
`agentled schema --context` (valid context / input-page field `type` values)
and `agentled tools builtins` (valid `aiActionWithTools` tool `builtinType`
values) — and calls out the two silent-strip-class failure modes the CLI's
preflight now catches: invalid `type` on an input-page field (e.g.
`"multi-select"`, `"checkbox"`, `"number"`) and invalid `builtinType` on an
`aiActionWithTools` tool (e.g. `"web-search"`, `"memory"`). See
`@agentled/cli` v0.5.0 changelog for the full implementation.

The skill also references the new `ai-with-tools` scaffold — a
preflight-clean starter for the agentic-search-with-memory pattern
(trigger → `aiActionWithTools` with `web_search` + `workspace_memory` →
milestone).

## [0.10.2] — MCP Server

### Skill v0.4.1 — trigger schema fix (MCP-028 followup)

Bumps the bundled Agentled skill to v0.4.1. The trigger step shape in
SKILL.md (valid-step-types table, Pipeline Structure example, Step
Types > Trigger example, and silently-stripped fields anti-pattern
table) now teaches `pipelineStepStartConditions: { trigger: { type:
"manual" } }`. The previously-documented `triggerType: "manual"` at the
step root is **not** in the step schema and was being silently dropped
on save — exactly the silent-strip-class bug the skill is meant to prevent. See
`@agentled/cli` v0.4.2 changelog for the matching scaffold + preflight
fix and the live-MCP test that surfaced it.

## [0.10.1] — MCP Server

### Scaffold cleanup + local scaffolds + fix-flow guidance (MCP-028 followup)

- Skill updated: renamed scaffold references from domain-flavored
  (`mentor-match-outreach`, `transcript-kpi-sync`) to pattern-shape names
  (`list-match-email`, `extract-threshold-alert`). Scaffolds are pattern
  shapes, not domain templates.
- CLI (`@agentled/cli` 0.4.1) gains local scaffold support via
  `$AGENTLED_SCAFFOLDS_DIR` or `~/.agentled/scaffolds/` — teams bring
  their own without waiting on a CLI release. Standalone `workflows
  validate <id>` prints the export → edit → preflight → update fix flow.

## [0.10.0] — MCP Server

### Scaffolds + client-side preflight + patterns 08/09 (MCP-028)

Follows MCP-027. Closes the remaining gaps from a client self-review:
an agent had the schema and patterns but still had to hand-author every
JSON, couldn't validate without a round-trip, and had no guidance on the
two highest-friction step shapes (composed email, rendered report).

- **Skill bump → v0.4.0.** "Before you build" checklist now references the
  scaffold catalog and the two new patterns. The "which pattern to read,
  by task" table gains a scaffold column so each task maps to both a
  pattern and a runnable JSON starting point.
- **New patterns** (mirrored from `agentic-ops/patterns/v1/`):
  - `08-composed-email-approval.md` — full composed-email shape with
    approval gate: `pipelineStepPrompt.type: "email"`, Email renderer,
    `integrations[]` block, `onApproval.action: "schedule-email"`,
    `approvalRequired: true`, and the `outreachProfile` input page.
  - `09-reports-and-knowledge-storage.md` — closing loop for report
    workflows: Config renderer (kpiRow / markdown / table / signalList)
    → `share` step for a public URL → `knowledgeSync` to persist metrics
    for trending.
- **CLI (`@agentled/cli` v0.4+):**
  - `agentled workflows scaffold [pattern] [--list] [--out <path>]` emits
    preflight-clean pipeline skeletons for the five most common shapes
    (`minimal`, `email-polling-dedup`, `lead-scoring-kg`,
    `list-match-email`, `extract-threshold-alert`). Local scaffolds via
    `~/.agentled/scaffolds/` or `$AGENTLED_SCAFFOLDS_DIR` shadow bundled
    ones for bring-your-own workflows.
  - `agentled workflows validate --file <path>` runs client-side
    preflight with no API call — catches invalid step types (with
    suggestions), silently-stripped root fields, dangling `next.stepId`,
    missing required sub-object fields, and duplicate step IDs. Exits 2
    on error so CI can gate on it.

## [0.9.0] — MCP Server

### Schema + patterns commands + "Before you build" checklist (MCP-027)

Follows MCP-025/026. Fixes the remaining gap: even with a rich skill, an
agent had no shell-visible way to pull live schema or the matching pattern
before authoring a new step. Now it does.

- **Skill bump → v0.3.0.** New "Before you build: read the schema and the
  patterns" section near the top of `SKILL.md`. Lists both MCP
  (`get_step_schema`, `list_apps`, `get_app_actions`) and CLI
  (`agentled schema`, `agentled examples`) entry points, plus a
  "which pattern to read, by task" lookup table covering all 8 agentic-ops
  patterns (triggers, dedup, credits, loops, child workflows, routing,
  errors).
- **CLI (`@agentled/cli` v0.3+):**
  - `agentled schema [--step-type <t>]` wraps the existing
    `GET /api/external/workflows/step-schema` endpoint.
  - `agentled examples [pattern]` ships the 8 agentic-ops patterns bundled
    with the CLI for offline reading; resolves by slug, number, or keyword.
  - `agentled best-practices` points at `github.com/agentled/agentic-ops`
    (the public, canonical source).
- **Drift guard:** `agentled-mcp-server/__tests__/cli-patterns-mirror.test.ts`
  enforces byte-identity between `agentic-ops/patterns/v1/` and
  `packages/cli/patterns/v1/`. Editing happens in the agentic-ops repo;
  the bundled copy is a mirror.

## [0.8.0] — MCP Server

### Skill enrichment (MCP-026)

`skills/agentled/SKILL.md` now prescribes the closed list of valid pipeline
step types and calls out the most common invalid patterns agents invent
(`type: "ai"`, `type: "integration"`, `knowledge_graph_query`, top-level
`prompt`/`listKey`/`appId`, …). Added:

- **Valid step types (closed list)** section near the top of the skill, with
  one-line description and minimal JSON shape per type.
- **Common invalid patterns to avoid** section enumerating the exact step types
  and root-level fields that the API silently strips.
- Drift guard: `agentled-mcp-server/__tests__/skill-step-types.test.ts` parses
  the skill's `<!-- agentled-step-types:start -->` table and fails CI if it
  disagrees with `VALID_STEP_TYPES` in the orchestrator validator or if the
  two skill copies (mcp-server + packages/cli) diverge.
- Skill frontmatter now carries a `version:` field (starts at `0.2.0`) so the
  CLI installer can detect "skill already installed (vX), newer vY available".

### CLI auto-install + auto-validate (MCP-025)

Shipped via the companion `@agentled/cli` v0.2+ release:

- `agentled auth login` installs the bundled Agentled skill into
  `~/.claude/skills/agentled/` on first successful login. Opt-out with
  `--skip-skills`. Returning users see a version comparison line.
- `agentled skills install | update | status` subcommands for manual
  management and force-overwrite (`--force`).
- `agentled workflows create` and `agentled workflows update` call
  `validate_workflow` after a successful POST. On validation failure the
  CLI exits with status code `2`, prints the structured error report, and
  tells the user how to re-check, fix, or delete the broken workflow.
- `--skip-validate` on both commands for advanced users who need the raw
  create/update behavior.

This closes the silent-strip class of bug (2026-04-17) where the CLI
returned 201 Created on workflows whose steps used invented types and
were therefore never going to execute.

## [0.7.7] — MCP Server

### New: `rerun` tool (MCP-024)

Rerun or retry any step in a workflow execution by its `timelineId`. Works for both failed steps (retry) and succeeded steps (rerun) — the backend auto-detects the state and picks the right path.

```
rerun({ timelineId: "tl_abc123", forceWithoutCache: true })
```

- `timelineId` is the canonical identifier — no more ambiguity with `stepId` inside loops (each loop iteration has its own timeline)
- `forceWithoutCache` (default `true`) bypasses step output cache
- Backed by new `POST /api/external/rerun` external API endpoint

Fetch a `timelineId` via `list_timelines` or `get_execution`.

### CLI parity (MCP-002)

The `@agentled/cli` package now exposes matching commands for tools already available via MCP:

- `agentled executions rerun <workflowId> <executionId> <stepId>` — rerun a specific step
- `agentled knowledge rows-by-ids <rowIds...>` — bulk-fetch up to 200 rows by ID (pairs with `kg graph edges`)

## [0.7.0] — MCP Server

### New: `get_knowledge_rows_by_ids`

Fetch up to 200 knowledge rows by their IDs in a single call. Designed to pair with `query_kg_edges`: query the graph for entity relationships, then bulk-resolve the matched rows without paginating through an entire list.

**Before:** to find all deals scored by an investor, you'd page through `get_knowledge_rows` filtering manually — O(list size) calls regardless of how many matches existed.

**Now:** `query_kg_edges` returns the matching row IDs directly; `get_knowledge_rows_by_ids` fetches them in one call — O(edges for that entity). Entity lookups now scale past 10k rows.

**Example 1 — all deals scored by an investor:**
```
1. query_kg_edges({ entityName: "Investor Name", relationshipType: "SCORED" })
   → returns targetNodeIds: ["row_abc", "row_def", ...]

2. get_knowledge_rows_by_ids({ rowIds: ["row_abc", "row_def", ...] })
   → returns full row data for each matched deal
```

**Example 2 — all leads sourced from a campaign:**
```
1. query_kg_edges({ entityName: "Campaign Name", relationshipType: "SOURCED" })
   → returns targetNodeIds: ["row_xyz", "row_uvw", ...]

2. get_knowledge_rows_by_ids({ rowIds: ["row_xyz", "row_uvw", ...] })
   → returns full contact/lead rows
```

Results are automatically scoped to the authenticated workspace — rows from other workspaces are silently excluded.

### Updated descriptions

- `query_kg_edges` — description now explicitly mentions that `targetNodeIds` in the response are knowledge row IDs, ready to pass to `get_knowledge_rows_by_ids`.
- `get_knowledge_rows` — description clarifies it filters by list key (max 50 rows per call); use `get_knowledge_rows_by_ids` when you have specific IDs from a graph query.
