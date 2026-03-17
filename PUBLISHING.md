# Publishing @agentled/mcp-server

## When to publish

Publish a new version whenever you change code in `agentled-mcp-server/`:
- New or updated tools
- Bug fixes
- README updates (npm shows the README from the published version)

## Steps

### 1. Bump version in package.json

```bash
cd agentled-mcp-server
# Patch (0.1.2 → 0.1.3): bug fixes, docs
npm version patch
# Minor (0.1.3 → 0.2.0): new tools, features
npm version minor
# Major (0.2.0 → 1.0.0): breaking changes
npm version major
```

### 2. Build & publish to npm

```bash
npm publish --access public
```

npm will open a browser for 2FA. Approve it.

### 3. Push to GitHub repo

```bash
# From the monorepo root
cd ..
# Copy changes to the public repo (until MCP-004 separates the repos)
# For now, push the monorepo commit — the public repo is synced manually
```

### 4. Commit in monorepo

```bash
git add agentled-mcp-server/
git commit -m "chore: publish @agentled/mcp-server vX.Y.Z"
```

## Checklist

- [ ] Version bumped in `package.json`
- [ ] `npm publish --access public` succeeded
- [ ] GitHub repo updated (manual sync until MCP-004)
- [ ] Monorepo commit created
- [ ] Test with `npx -y @agentled/mcp-server` to verify the published version works

## Accounts

- **npm**: org `@agentled`, account `ouadie-agentled`
- **GitHub**: org `Agentled`, repo `mcp-server`
