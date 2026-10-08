# AgentLed Portable Agent Plugin v1

This directory is a portable Agent Plugins v1 package. It reuses the canonical
AgentLed Markdown skills under `skills/` and declares a pinned local stdio MCP
server in `mcp.json`. AgentLed remains authoritative for workspace context,
tools, connections, approvals, credits, executions, receipts, recovery, and
routines.

## Grok Build

Grok Build discovers this package through `.grok-plugin/plugin.json` and the
existing `.mcp.json` server declaration. It runs the same pinned local stdio
MCP server as other local coding-agent installs. Authenticate a local AgentLed
CLI profile first, then install and trust the plugin through Grok Build; do not
place an API key, OAuth client secret, or workspace identifier in this package.

The plugin is distinct from the remote Grok connector. For a workspace-scoped
OAuth connection in Grok chat, use AgentLed's Developer settings to create a
dedicated read-only OAuth client and follow the Grok connector instructions.

The Social Media Management skill is the canonical AgentLed Markdown skill. Its
named Jobs and references are not copied into this README or reimplemented here.

## Install and enable in Hermes v0.20.2

Hermes' stable plugin installer accepts a Git URL or an `owner/repo[/subdir]`
source. A local directory path is not the stable installer syntax. The public
install command below is future/post-publication guidance only; this repository
does not claim current package publication or an observed Hermes installation.
Prefer a full immutable commit ref when the source is available:

```bash
# Future, after publication; not a current availability claim.
hermes plugins install Agentled/mcp-server/plugins/agentled \
  --ref <40-character-commit-sha> --no-enable
hermes plugins list
hermes plugins enable agentled
```

Do not execute these commands as part of this repository task. After a controlled
installation, start a fresh Hermes session or use `/reload-mcp`. Then limit
verification to bounded read-only MCP tool discovery and status inspection;
this bounded discovery check does not make the enabled server read-only, and
installation is not proof of authenticated workspace access.

Use `skills_list` in Hermes to find the namespaced skill, then `skill_view` to
load it. The Social Media skill is read-only Markdown guidance, but an
authenticated stdio server exposes more than that skill. Installation without
an active credential grants no AgentLed authority. This is trusted-local-agent
access for an owner/admin machine, not read-only or least privilege: when an
active CLI profile exists, enabling or reloading exposes to Hermes the broad
AgentLed workspace read/write MCP surface authorized by that workspace API key.

## Authenticate the local AgentLed profile

The pinned stdio server runs locally and reads the active AgentLed profile from
`~/.agentled/config.json`. Use the existing AgentLed CLI flow when a profile is
missing or a different workspace is needed:

```bash
npx -y @agentled/cli@0.8.2 auth login
npx -y @agentled/cli@0.8.2 auth status
npx -y @agentled/cli@0.8.2 auth use <workspace>  # only when switching profiles
```

Then restart Hermes or use `/reload-mcp` so the pinned server reads the active
profile. Newly created AgentLed config files use mode `0600`; this package does not automatically tighten permissions on pre-existing config files.
Hermes running as the same OS user can read and use the mode-0600 credential.
Stdio/API-key calls are not narrowed by hosted OAuth `mcp:read` today. Do not register the native remote AgentLed MCP as well, or Hermes will expose duplicate AgentLed servers and tools.

The portable package contains no API key, token, header, customer workspace, or
credential. Do not add secrets to `mcp.json` or plugin files.

## Trust and setup boundary

Enabling this plugin executes the pinned `@agentled/mcp-server@0.19.4` npm
package locally as the current OS user. It requires Node.js `>=18`, `npx`, and
first-run access to the npm registry. The server reads the active local
AgentLed workspace key through the existing CLI profile; the portable package
does not contain that key. Provider calls, spending, approval-gated publish/send
actions, and routines still follow AgentLed's separate runtime policies. The
portable package grants no authority until an active credential is available;
authenticated enablement does grant the workspace API-key authority described
above.

## Disable and remove

Disable the package while keeping its local installation:

```bash
hermes plugins disable agentled
```

Remove the local Hermes installation entirely:

```bash
hermes plugins remove agentled
```

These commands affect only the Hermes profile. They do not delete AgentLed
workspace data, connections, approvals, credits, executions, receipts,
routines, or provider state.
