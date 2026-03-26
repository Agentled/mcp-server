# @agentled/mcp-server

> The automation engine built for AI agents. Like giving your AI assistant n8n + a knowledge graph + 100 API keys. Persistent memory across runs, compound intelligence, unified credits.

[![npm version](https://img.shields.io/npm/v/@agentled/mcp-server.svg)](https://www.npmjs.com/package/@agentled/mcp-server)
[![license](https://img.shields.io/npm/l/@agentled/mcp-server.svg)](https://github.com/Agentled/mcp-server/blob/main/LICENSE)

[![Agentled Server MCP server](https://glama.ai/mcp/servers/Agentled/mcp-server/badges/card.svg)](https://glama.ai/mcp/servers/Agentled/mcp-server)

## What is Agentled?

[Agentled](https://www.agentled.app) is the automation engine built for AI agents. Like handing your AI assistant n8n + a knowledge graph + 100 API keys — it builds, runs, and learns from workflows autonomously. 100+ integrations (30 native + Composio), a Knowledge Graph that compounds intelligence across executions, and a unified credit system replacing 100+ separate API accounts. This MCP server gives Claude, Codex, Cursor, Windsurf, or any MCP client full access to create, manage, and execute workflows.

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
→ agentled.app/your-team/fintech-cto-outbound
```

One prompt. Three workflows. LinkedIn enrichment, email finding, AI scoring, multi-channel outreach — all orchestrated, all stored in the Knowledge Graph for the next run.

## Quick Start

```bash
claude mcp add agentled \
  -e AGENTLED_API_KEY=wsk_... \
  -- npx -y @agentled/mcp-server
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
| `start_workflow` | Start a workflow execution with input |
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
| `list_knowledge_lists` | List knowledge lists in the workspace |
| `get_knowledge_rows` | Get rows from a knowledge list |
| `get_knowledge_text` | Get text content from a knowledge entry |
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
