# @agentled/mcp-server

MCP server for [Agentled](https://www.agentled.app) — create, manage, and run automation workflows from Claude Code.

## Quick Setup

```bash
claude mcp add agentled \
  -e AGENTLED_API_KEY=wsk_... \
  -e AGENTLED_URL=https://www.agentled.app \
  -- agentled-mcp-server
```

### Getting your API key

1. Go to your [Agentled workspace](https://www.agentled.app)
2. Open **Workspace Settings > Developer**
3. Generate a new API key (starts with `wsk_`)

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AGENTLED_API_KEY` | Yes | Workspace API key (`wsk_...`) |
| `AGENTLED_URL` | No | API base URL (default: `https://www.agentled.app`) |

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
| `list_executions` | List executions for a workflow |
| `get_execution` | Get execution details with step results |
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

### n8n Migration

| Tool | Description |
|------|-------------|
| `preview_n8n_import` | Preview an n8n workflow import (dry run) |
| `import_n8n_workflow` | Import an n8n workflow into Agentled |

## Example Usage

Once connected, you can ask Claude Code to:

- "List my workflows"
- "Create a workflow that scrapes a URL and summarizes the content"
- "Show me the last 5 executions of my lead scoring workflow"
- "Test the LinkedIn company enrichment action with this URL"

## Building from Source

```bash
git clone https://github.com/agentled/mcp-server.git
cd mcp-server
npm install
npm run build
```

## License

MIT
