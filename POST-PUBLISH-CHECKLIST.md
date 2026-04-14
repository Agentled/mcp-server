# Post-Publish Checklist (maintainers)

After publishing a new version to npm:

- [ ] Verify npm: `npm view @agentled/mcp-server version`
- [ ] Smoke test: `npx -y @agentled/mcp-server --version`
- [ ] Confirm `https://mcp.agentled.app/health` returns `{"status":"ok"}`
- [ ] Check [Glama listing](https://glama.ai/mcp/servers/Agentled/mcp-server) reflects the new version (auto-syncs within ~1h)
