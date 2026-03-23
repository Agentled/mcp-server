---
name: agentled
description: Build, manage, and execute Agentled AI workflows via MCP tools. Use when the user asks to create workflows, automate tasks, enrich leads, scrape websites, find emails, manage executions, or interact with any Agentled workspace capability.
user-invocable: false
---

# Agentled Workflow Automation

You have access to the Agentled MCP server which lets you create, manage, and execute AI-powered workflows. Use these tools to help the user automate business processes.

## Iterative Building Pattern

Follow this pattern when creating workflows:

1. Design the pipeline JSON based on requirements
2. `create_workflow` to save it
3. `validate_workflow` to check for errors
4. If errors: fix the pipeline, `update_workflow`, `validate_workflow` again
5. When valid: `publish_workflow` with status `"live"`
6. Test: `start_workflow` with sample input
7. Check results: `get_execution` to see step outputs

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

Use `list_apps` and `get_app_actions` for full schemas of all available apps.

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

## Conversational Building

For complex workflows, use the `chat` tool to design workflows through natural language conversation. It supports multi-turn via `session_id`.

```
chat("Build a workflow that takes a LinkedIn URL, enriches the company, finds decision-maker emails, and scores by ICP fit")
```
