# Post-Publish Checklist

Run this every time you publish a new version of `@agentled/mcp-server` or `@agentled/core`.

---

## 1. Publish using publish.sh (MCP server)

`publish.sh` is the canonical publish script — it bumps versions in `package.json` AND `server.json`, builds, publishes to npm, publishes to the MCP Registry, and syncs to the standalone GitHub repo. **Always use it, never run `npm publish` directly.**

```bash
# Clone standalone repo once (required for the sync step)
git clone git@github.com:Agentled/mcp-server.git /tmp/mcp-server

# Then publish (from repo root or agentled-mcp-server/):
cd agentled-mcp-server
./publish.sh patch   # bug fix
./publish.sh minor   # new tools or capabilities  ← most common
./publish.sh major   # breaking changes
```

Requires npm 2FA approval in the browser.

## 1b. Publish @agentled/core (if client.ts changed)

If you added methods to `packages/core/src/client.ts`, also publish core **before** the MCP server publish:

```bash
cd packages/core
npm version patch --no-git-tag-version   # or minor/major
npm publish --access public

# Then update agentled-mcp-server/package.json to reference the new core version:
# "@agentled/core": "^X.Y.Z"
```

**Rule:** patch = bug fix / new client method, minor = new shared behaviour, major = breaking API change.

---

## 3. In-repo docs (always update)

- [ ] **`agentled-mcp-server/README.md`** — update the "Knowledge & Data" (or relevant) tools table with any new tools
- [ ] **`CLAUDE.md`** — update the `### Available MCP Tools` section with new tools
- [ ] **`agentled-mcp-server/server.json`** — version already bumped in step 1

---

## 4. MCP Registry (Official)

Registry: `io.github.Agentled/mcp-server`

The registry reads from `server.json` in the GitHub repo. After the monorepo commit is pushed:

- [ ] Push the monorepo commit so `server.json` is live on GitHub main
- [ ] The registry should auto-pick up the version bump (it polls GitHub)
- [ ] If not auto-synced: go to [https://modelcontextprotocol.io](https://modelcontextprotocol.io) and trigger a refresh

---

## 5. Glama.ai

Listed at: `https://glama.ai/mcp/servers/Agentled/mcp-server`

- [ ] Glama auto-syncs from npm — verify the new version appears after publish (usually within ~1h)
- [ ] If tool descriptions changed: check that Glama reflects the new tool schema (it re-indexes from npm)

---

## 6. punkpeye/awesome-mcp-servers (84K stars)

Current entry is in the repo. After adding new tools:

- [ ] Update the tool count in the PR/entry (currently tracked as pending in MCP-013)
- [ ] Submit or update the PR: [https://github.com/punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers)
- [ ] Description to use: `"AI-native workflow orchestration with long-term memory, 100+ integrations, and unified credits. 47+ MCP tools for building and running intelligent business workflows."`

---

## 7. Landing page `/en/mcp` tools list

- [ ] Check `agentsled-landingpage` repo for any hardcoded tools table on the `/en/mcp` page
- [ ] If tools are listed there, add the new ones

---

## 8. Monorepo commit

```bash
git add packages/core/package.json \
        agentled-mcp-server/package.json \
        agentled-mcp-server/server.json \
        agentled-mcp-server/README.md \
        CLAUDE.md
git commit -m "chore: publish @agentled/core vX.Y.Z + @agentled/mcp-server vX.Y.Z"
```

---

## 9. Verify post-publish

```bash
# Verify core
npm view @agentled/core version

# Verify MCP server
npm view @agentled/mcp-server version

# Smoke test: run the new published version
npx -y @agentled/mcp-server --version
```

---

## Registries tracked (from MCP-013)

| Registry | Status | Auto-syncs from npm? |
|----------|--------|----------------------|
| Official MCP Registry | Live | Via server.json on GitHub |
| Glama.ai (server) | Live | Yes (~1h) |
| Glama.ai (connector) | Live | Yes |
| punkpeye/awesome-mcp-servers | Live (update pending) | No — manual PR |
| PulseMCP | Live | Check |
| mcpservers.org | Live | Check |
| mcp.so | TODO | Unknown |
| Smithery | TODO | Unknown |
| LobeHub | TODO | Unknown |
| Cursor Directory | TODO | Unknown |
