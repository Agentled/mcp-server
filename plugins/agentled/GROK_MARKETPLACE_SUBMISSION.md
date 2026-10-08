# AgentLed Grok Build marketplace submission

Use this packet only after the AgentLed plugin source has been published to the
official `Agentled/mcp-server` repository. Do not substitute a local commit,
branch name, tag, or abbreviated SHA.

## Marketplace entry

```json
{
  "name": "agentled",
  "description": "Build, validate, and operate AgentLed AI workflows from Grok Build.",
  "category": "productivity",
  "source": {
    "source": "url",
    "url": "https://github.com/Agentled/mcp-server.git",
    "sha": "<published-40-character-sha>",
    "path": "plugins/agentled"
  },
  "homepage": "https://www.agentled.ai/en/developers",
  "keywords": ["agentled", "agentled workflows", "agentled mcp"],
  "domains": ["agentled.ai", "agentled.app"]
}
```

## Required evidence before opening xAI's PR

- The `source.sha` is the full, lowercase SHA of a public `Agentled/mcp-server`
  commit that contains `.grok-plugin/plugin.json`, `.mcp.json`, the plugin
  README, and the bundled skills.
- `grok plugin validate plugins/agentled` passes in a Grok Build environment.
- The plugin contains no API key, OAuth client secret, token, customer
  workspace ID, or user credential.
- The README says the bundled MCP is local stdio and requires explicit local
  AgentLed authentication. It does not claim a remote OAuth connection.
- A separate read-only Grok custom-connector check has verified the existing
  workspace-scoped OAuth metadata and consent path.
- In `xai-org/plugin-marketplace`, add the entry, regenerate the component
  index, run its catalog validator and index check, then open a pull request.

The marketplace PR is a request for xAI review, not proof that AgentLed is
listed or available in the marketplace.
