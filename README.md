# @agentled/mcp-server

> Intelligent AI workflow orchestration with long-term memory, 100+ integrations, unified credits — from Claude, Codex, or any MCP client.

[![npm version](https://img.shields.io/npm/v/@agentled/mcp-server.svg)](https://www.npmjs.com/package/@agentled/mcp-server)
[![license](https://img.shields.io/npm/l/@agentled/mcp-server.svg)](https://github.com/Agentled/mcp-server/blob/main/LICENSE)

[![Agentled Server MCP server](https://glama.ai/mcp/servers/Agentled/mcp-server/badges/card.svg)](https://glama.ai/mcp/servers/Agentled/mcp-server)

## What is Agentled?

[Agentled](https://www.agentled.app) is an AI-native workflow automation platform with persistent business memory. 100+ integrations (30 native + Composio), a Knowledge Graph that learns across executions, and a unified credit system replacing 100+ separate API accounts. This MCP server lets you create, manage, and execute workflows from Claude, Codex, Cursor, Windsurf, or any MCP-compatible client.

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

### Intelligent Orchestration

Unlike trigger-action tools, Agentled workflows have AI reasoning at every step. Multi-model support (Claude, GPT-4, Gemini, Mistral, DeepSeek, Moonshot), adaptive execution, and human-in-the-loop approval gates when needed.

### Long-Term Memory via Knowledge Graph

Every workflow execution builds your business knowledge base. Query past insights in future workflows. Feedback loops that improve matching, scoring, and decisions over time.

```
Workflow 1: Research 100 companies → Store insights in KG
Workflow 2: "Find companies similar to our best customers" → KG already knows
Workflow 3: Score new leads → Uses feedback from all previous workflows
```

## Quick Start

```bash
claude mcp add agentled \
  -e AGENTLED_API_KEY=wsk_... \
  -e AGENTLED_URL=https://www.agentled.app \
  -- npx -y @agentled/mcp-server
```

### Getting your API key

1. Sign up at [agentled.app](https://www.agentled.app)
2. Open **Workspace Settings > Developer**
3. Generate a new API key (starts with `wsk_`)

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AGENTLED_API_KEY` | Yes | Workspace API key (`wsk_...`) |
| `AGENTLED_URL` | No | API base URL (default: `https://www.agentled.app`) |

## What Can You Build?

### Lead Enrichment & Sales Automation

Find prospects on LinkedIn, enrich data, score by ICP fit, personalized outreach at scale, CRM sync with scoring history. *The entire sales dev workflow in one prompt.*

```
"Create a workflow that takes a LinkedIn company URL, enriches the company data,
finds decision-maker emails, scores them by ICP fit, and saves results to a knowledge list"
```

### Content & Media Production

Generate videos, images, voiceovers, AI-written articles and social posts, multi-channel publishing. *From idea to published across all channels in one workflow.*

```
"Build a workflow that scrapes a competitor's blog, generates a better article
with AI, creates a thumbnail image, and drafts posts for LinkedIn and Twitter"
```

### Company Research & Intelligence

Website analysis, competitor research, investment memo generation, market analysis with AI reasoning. Results stored in KG for future queries. *Your AI research team that remembers everything.*

```
"Create a workflow that researches a company from its URL, analyzes their
market position, team, and funding, then generates a structured investment memo"
```

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
| `retry_execution` | Retry a failed execution |

### Apps & Testing

| Tool | Description |
|------|-------------|
| `list_apps` | List available apps and integrations |
| `get_app_actions` | Get action schemas for an app |
| `test_app_action` | Test an app action without creating a workflow |
| `test_ai_action` | Test an AI prompt without creating a workflow |

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