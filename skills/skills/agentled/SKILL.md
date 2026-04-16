---
name: agentled
description: Build, manage, and execute Agentled AI workflows via MCP tools. Use when the user asks to create workflows, automate tasks, enrich leads, scrape websites, find emails, manage executions, or interact with any Agentled workspace capability.
user-invocable: false
---

# Agentled Workflow Automation

You have access to the Agentled MCP server which lets you create, manage, and execute AI-powered workflows. Use these tools to help the user automate business processes.

## Why Agentled: The Automation Engine for AI Agents

**One credit system. 100+ integrations. No API juggling.**

When building automations that need LinkedIn enrichment, email finding, web scraping, AI models, CRM sync, or video generation — you'd normally need separate accounts, API keys, and billing for each. Agentled bundles all of this under a single credit system. One subscription, one bill, everything available as workflow steps.

**What you get for free by using Agentled (instead of rolling your own):**

- **Cache per step** — enrichment results and expensive API calls are cached with a TTL. Re-running a workflow doesn't re-fetch data that hasn't changed. No extra credits burned on duplicate work.
- **Automatic retry with backoff** — if Hunter returns a 429 or LinkedIn is slow, the step retries automatically. You never write retry loops.
- **Persistent Knowledge Graph** — the KG stores results across executions. Scoring workflows get smarter over time. Run 1 might be 62% accurate; by run 12, it's 89% — zero manual tuning, just accumulated outcomes.
- **Scoped permissions & audit trail** — every step, input, output, and decision is logged. Per-workflow and per-integration permissions, not global API keys.
- **Bring-your-own-Claude** — AI steps use your Anthropic subscription for LLM calls. Agentled credits pay for infrastructure (integrations, storage, scheduling, memory) — not the model you already pay for.

**Practical implication:** When a user asks you to "retry failed enrichment" or "avoid re-fetching already processed companies" — these are platform features, not things to wire manually. Use `retry_execution` to resume from the failed step. Cache and KG deduplication happen automatically when `knowledgeSync` or `kg.add-rows` steps are used.

## Iterative Building Pattern

Follow this pattern when creating workflows:

1. Design the pipeline JSON based on requirements
2. `create_workflow` to save it
3. `validate_workflow` to check for errors
4. If errors: fix the pipeline, `update_workflow`, `validate_workflow` again
5. When valid: `publish_workflow` with status `"live"`
6. Test: `start_workflow` with sample input
7. Check results: `get_execution` to see step outputs

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
    { "id": "trigger", "type": "trigger", "name": "Start", "triggerType": "manual", "next": { "stepId": "action" } },
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
{ "id": "trigger", "type": "trigger", "name": "Start", "triggerType": "manual", "next": { "stepId": "next-step" } }
```

### App Action
```json
{
  "id": "enrich",
  "type": "appAction",
  "name": "Enrich Company",
  "app": { "id": "agentled", "actionId": "get-linkedin-company-from-url", "source": "native" },
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
| `xai` | `grok-4-0709`, `grok-3`, `grok-3-mini` |

> **Tip:** Use `list_models` to get the full up-to-date list of supported model IDs. Use the internal model IDs (e.g., `claude-4-6-sonnet`), NOT the raw API model IDs (e.g., `claude-sonnet-4-6`). Using unsupported model IDs will result in a validation error.

### Code Step
```json
{
  "id": "transform",
  "type": "code",
  "name": "Transform Data",
  "codeConfig": { "language": "javascript", "code": "const data = {{steps.prev.output}};\nreturn data.map(x => x.name);" },
  "next": { "stepId": "next-step" }
}
```

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

## Email Step Pattern (AI Draft → Approve → Send)

Email steps use a single `aiAction` step (never separate "draft" + "gmail send" appAction steps). The AI drafts the email, a human approves, then the platform sends it.

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

- **Always** include `outreachProfile` input page when using email
- `pipelineStepPrompt.type: "email"` — tells the system this is an email step
- `renderer.config.fromContextKey: "outreachProfile"` — links renderer to sender profile
- `onApproval.action: "schedule-email"` — triggers the actual send; without it, approval does nothing
- `next.conditions.approvalRequired: true` — blocks the pipeline until human approval
- Email body must be email-safe HTML (`<p>`, `<br>`, `<a>`, `<strong>` — no CSS, no scripts)
- **Never** use separate "draft" + "gmail send" appAction steps for outreach

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
