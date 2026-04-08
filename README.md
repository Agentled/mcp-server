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
claude mcp add agentled \
  -e AGENTLED_API_KEY=wsk_... \
  -- npx -y @agentled/mcp-server
```

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

Other automation tools start from zero every run. Agentled's Knowledge Graph remembers across executions — what worked, what didn't, what humans corrected. Every run compounds on the last.

```
Run 1:  Investor scoring → 62% accuracy (cold start)
Run 5:  → 78% (learning from IC feedback)
Run 12: → 89% (compound learning from outcomes, zero manual tuning)
```

### Intelligent Orchestration

Unlike trigger-action tools, Agentled workflows have AI reasoning at every step. Multi-model support (Claude, GPT-4, Gemini, Mistral, DeepSeek, Moonshot), adaptive execution, and human-in-the-loop approval gates when needed.

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

## Built-in Capabilities

**Media Production:** Video generation, image generation, text-to-speech, auto-captions, media assembly

**AI Intelligence:** Multi-model AI (Claude, GPT-4, Gemini, Mistral, DeepSeek, Moonshot, xAI), Knowledge Graph, feedback loops, scoring & analytics

**Data & Integration:** LinkedIn (search, enrich, post), email (send, personalize), web scraping, social publishing, CRM sync, document analysis, OCR

## Available Tools

### Workflows

| Tool | Description |
|------|-------------|
| `list_workflows` | List all workflows in the workspace |
| `get_workflow` | Get full workflow definition by ID |
| `create_workflow` | Create a new workflow from pipeline JSON |
| `update_workflow` | Update an existing workflow |
| `add_step` | Add a step with automatic positioning and next-pointer rewiring |
| `update_step` | Deep-merge updates into a single step by ID |
| `remove_step` | Remove a step with automatic next-pointer rewiring |
| `delete_workflow` | Permanently delete a workflow |
| `validate_workflow` | Validate pipeline structure, returns errors per step |
| `publish_workflow` | Change workflow status (draft, live, paused, archived) |
| `export_workflow` | Export a workflow as portable JSON |
| `import_workflow` | Import a workflow from exported JSON |

### Drafts & Snapshots

| Tool | Description |
|------|-------------|
| `get_draft` | Get the current draft version of a workflow |
| `promote_draft` | Promote a draft to the live version |
| `discard_draft` | Discard the current draft |
| `create_snapshot` | Create a manual config snapshot |
| `delete_snapshot` | Delete a specific config snapshot |
| `list_snapshots` | List version snapshots for a workflow |
| `restore_snapshot` | Restore a workflow to a previous snapshot |

### Executions

| Tool | Description |
|------|-------------|
| `start_workflow` | Start a workflow execution with input. Pass `useMocks: false` to force a real (credit-consuming) run that ignores per-step mock data; defaults to honoring the workflow's configured mocks. |
| `list_executions` | List executions for a workflow (paginated via `nextToken`) |
| `get_execution` | Get execution details with step results |
| `list_timelines` | List step execution records (timelines) for an execution (paginated via `nextToken`) |
| `get_timeline` | Get a single timeline by ID with full step output |
| `stop_execution` | Stop a running execution |
| `retry_execution` | Retry a failed step — auto-detects the most recent failure if no timeline ID provided |

### Apps & Testing

| Tool | Description |
|------|-------------|
| `list_apps` | List available apps and integrations |
| `get_app_actions` | Get action schemas for an app |
| `test_app_action` | Test an app action without creating a workflow |
| `test_ai_action` | Test an AI prompt without creating a workflow |
| `test_code_action` | Test JavaScript code in the same sandboxed VM as production |
| `get_step_schema` | Get allowed PipelineStep fields grouped by category |

### Knowledge & Data

| Tool | Description |
|------|-------------|
| `get_workspace` | Get workspace info and settings |
| `get_workspace_company_profile` | Get the editable workspace company profile and offerings |
| `update_workspace_company_profile` | Update top-level company profile fields like name, URLs, logo, industry, size, and additional information |
| `upsert_workspace_company_offerings` | Create new offerings or update existing offerings in the workspace company profile |
| `list_knowledge_lists` | List knowledge lists in the workspace |
| `get_knowledge_rows` | Get rows from a knowledge list |
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

### Branding (Whitelabel)

| Tool | Description |
|------|-------------|
| `get_branding` | Get the workspace's whitelabel branding config (displayName, logo, colors, favicon, badge) |
| `update_branding` | Update branding — set displayName, logoUrl, tagline, primaryColor, primaryColorDark, faviconUrl, hideBadge |

### Conversational Agent

| Tool | Description |
|------|-------------|
| `chat` | Send a message to the AgentLed AI agent. Build workflows through natural language — no JSON required. Supports multi-turn conversations via session_id. |

### Intent Router

| Tool | Description |
|------|-------------|
| `do` | Natural language intent router — describe what you want and it auto-selects and executes the right tool |

### Coming from n8n?

Import existing n8n workflows and make them AI-native:

| Tool | Description |
|------|-------------|
| `preview_n8n_import` | Preview an n8n workflow import (dry run) |
| `import_n8n_workflow` | Import an n8n workflow into Agentled |

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

## Proactive Agents — Examples

Proactive agents are background monitors that autonomously trigger workflows when conditions are met.

### Create an agent that watches for new leads

```
"Create a proactive agent named 'New Lead Watcher' that checks the 'incoming-leads' knowledge list
every 5 minutes. When new rows appear, start the 'lead-enrichment' workflow with the new rows as input.
Limit to 10 actions per day."
```

Config structure:

```json
{
  "monitorInterval": "5m",
  "evaluation": { "mode": "rules" },
  "monitors": [{
    "type": "kg_list",
    "listKey": "incoming-leads",
    "condition": "new_rows"
  }],
  "actions": [{
    "type": "start_workflow",
    "workflowId": "wf_abc123",
    "inputMapping": { "leads": "{{monitor.newRows}}" }
  }],
  "maxActionsPerDay": 10,
  "cooldownMs": 300000
}
```

### Create an AI-evaluated agent

```
"Create a proactive agent that checks execution history every hour.
Use AI evaluation to decide if the failure rate is abnormal, then notify me via email."
```

```json
{
  "monitorInterval": "1h",
  "evaluation": { "mode": "ai", "modelTier": "mini", "maxCreditsPerDay": 50 },
  "monitors": [{
    "type": "execution_history",
    "condition": "consecutive_failures",
    "threshold": 3
  }],
  "actions": [{
    "type": "notify",
    "channel": "email",
    "message": "{{monitor.summary}}"
  }],
  "maxActionsPerDay": 5
}
```

### Pause and resume

```
"Pause proactive agent pa_xyz789"
"Resume proactive agent pa_xyz789"
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
