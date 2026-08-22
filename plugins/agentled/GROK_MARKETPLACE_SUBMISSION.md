# AgentLed Grok Build marketplace submission

Use this packet only after the source commit below is public and immutable.
The plugin contains no workspace credentials. It starts the published
`@agentled/mcp-server` package locally; users authenticate through their own
AgentLed CLI profile.

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

Before opening the xAI marketplace pull request:

1. Verify the SHA resolves on the public `Agentled/mcp-server` repository.
2. Verify `plugins/agentled/.grok-plugin/plugin.json` and `.mcp.json` contain
   no credentials, workspace IDs, or customer data.
3. Validate the plugin with the Grok Build validator when available.
4. Confirm the package named in `.mcp.json` is published and immutable.
5. Keep the public claim to beta/read-only discovery until a disposable
   workspace OAuth proof has been observed.
