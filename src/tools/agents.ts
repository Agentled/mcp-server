/**
 * MCP Tools — Agent Entities
 *
 * Higher-level agents that wrap proactive agents with instructions, files, and identity.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

async function resolveAgentIdForChat(
    client: any,
    input: { id?: string; agent_slug?: string },
): Promise<string> {
    if (input.id?.trim()) return input.id.trim();

    const result = await client.listAgents({ status: 'active' });
    const agents = Array.isArray(result?.agents) ? result.agents : [];
    const target = input.agent_slug?.trim().toLowerCase() || 'assistant';
    const match = agents.find((agent: any) =>
        String(agent?.slug || '').toLowerCase() === target ||
        String(agent?.id || '').toLowerCase() === target ||
        String(agent?.id || '').toLowerCase().startsWith(`${target}@`)
    );

    if (!match?.id) {
        throw new Error(
            input.agent_slug
                ? `No active agent found for slug "${input.agent_slug}". Use list_agents to choose one.`
                : 'No active assistant agent found. Use list_agents and pass id or agent_slug.',
        );
    }

    return match.id;
}

export function registerAgentTools(server: McpServer, clientFactory: ClientFactory) {

    server.tool(
        'list_agents',
        `List all agents in the workspace. Agents are higher-level entities that wrap
proactive agents with instructions, files, and identity. They manage the lifecycle
of always-on monitoring and can be chatted with.`,
        {
            status: z.enum(['active', 'paused', 'draft']).optional().describe('Filter by status'),
        },
        async ({ status }, extra) => {
            const client = clientFactory(extra);
            const result = await client.listAgents({ status });
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'get_agent',
        `Get full details of an agent including its config, files, and linked proactive agent.`,
        {
            id: z.string().describe('Agent ID'),
        },
        async ({ id }, extra) => {
            const client = clientFactory(extra);
            const result = await client.getAgent(id);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'create_agent',
        `Create a new agent with name, instructions, tools, workflows, and optional config files.

Agents are always 'chat-only' (conversational). For scheduled/autonomous work, create the agent
first, then attach routines to it via create_routine (e.g. daily deal-sourcer, weekly digest).

Key fields:
- name: Agent display name
- agentType: Preset template — 'personal-assistant', 'competitive-researcher', 'social-media-marketer',
  'customer-support', 'content-marketer', 'lead-qualifier', 'deal-sourcer', 'custom' (default)
- instructions: System prompt / core AGENTS.md content
- enabledApps: App IDs this agent can use — get IDs from list_apps (e.g. ['web-scraping', 'kg', 'gmail'])
- appPermissions: Optional per-app permissions keyed by app ID. Use { access: 'read' } for read-only or { access: 'write', writeApprovalRequired: true } for mutating access with approval.
  Read access is implicit and never requires approval. The internal 'agentled' app is not configurable here.
- assignedWorkflowIds: Workflow IDs this agent can trigger — get IDs from list_workflows
- goals: Natural-language description of what the agent should achieve
- configFiles: Override generated config files — keys are 'SOUL.md' (persona), 'TOOLS.md' (tool routing).
  If omitted, files are auto-generated from agentType template.
  Reflection context files ('JOURNAL.md', 'OBJECTIVES.md', 'PEOPLE.md') are linked AgentFiles, not configFiles.
  Active chat-only agents auto-seed placeholders for those files. The agent decides what durable signal belongs there;
  do not write raw transcript logs or update them just because a chat turn happened.
- avatar_icon_name: Lucide icon name for the agent avatar (e.g. 'Bot', 'Radar', 'Target', 'Sparkles')
- avatar_color: Hex color for the avatar (e.g. '#6366f1', '#7C3AED', '#EA580C')
- linkedFileIds: Workspace-level AgentFile IDs to attach as knowledge (from list_agent_files — workspace scope)
- chatModel: Override the chat model (e.g. 'anthropic:claude-4-6-sonnet', 'openai:gpt-4o-mini')
- activate: Set true to activate immediately (default false = draft)

To add scheduled routines after creating the agent, use create_routine.`,
        {
            name: z.string().describe('Agent name'),
            description: z.string().optional().describe('Agent description'),
            instructions: z.string().optional().describe('System prompt / AGENTS.md content'),
            agentType: z.enum([
                'personal-assistant',
                'competitive-researcher',
                'social-media-marketer',
                'customer-support',
                'content-marketer',
                'lead-qualifier',
                'deal-sourcer',
                'custom',
            ]).optional().describe('Preset agent type template (default: custom)'),
            enabledApps: z.array(z.string()).optional().describe("App IDs the agent can use (e.g. ['web-scraping', 'kg', 'gmail'])"),
            enabledActions: z.array(z.string()).optional().describe('Specific action IDs to enable (fine-grained control within apps)'),
            appPermissions: z.record(z.string(), z.object({
                access: z.enum(['read', 'write']).describe('read exposes read-only actions; write also exposes mutating actions'),
                writeApprovalRequired: z.boolean().optional().describe('Only applies to write access. Defaults to true.'),
            })).optional().describe("Per-app permissions keyed by app ID, e.g. { linkedin: { access: 'read' }, gmail: { access: 'write', writeApprovalRequired: true } }"),
            assignedWorkflowIds: z.array(z.string()).optional().describe('Workflow IDs this agent can trigger'),
            linkedFileIds: z.array(z.string()).optional().describe('Workspace AgentFile IDs to attach as knowledge'),
            chatModel: z.string().optional().describe("Chat model override (e.g. 'anthropic:claude-4-6-sonnet', 'openai:gpt-4o-mini')"),
            goals: z.string().optional().describe('Natural-language description of what the agent should achieve'),
            configFiles: z.object({
                'SOUL.md': z.string().optional().describe('Persona and communication style'),
                'TOOLS.md': z.string().optional().describe('Tool routing and usage rules'),
            }).optional().describe('Override auto-generated config files. Omit to use agentType template defaults.'),
            avatar_icon_name: z.string().optional().describe("Lucide icon name for the avatar (e.g. 'Bot', 'Radar', 'Target', 'Sparkles', 'TrendingUp')"),
            avatar_color: z.string().optional().describe("Hex color for the avatar (e.g. '#6366f1', '#7C3AED', '#EA580C')"),
            activate: z.boolean().optional().describe('Activate immediately (default false = draft)'),
            status: z.enum(['active', 'paused', 'draft']).optional().describe('Initial status (default: draft; use activate: true instead)'),
            modelTier: z.enum(['mini', 'standard']).optional().describe('AI evaluation model tier'),
            maxCreditsPerDay: z.number().optional().describe('Daily credit limit'),
        },
        async ({
            name, description, instructions, agentType,
            enabledApps, enabledActions, appPermissions, assignedWorkflowIds, linkedFileIds, chatModel,
            goals, configFiles,
            avatar_icon_name, avatar_color,
            activate, status, modelTier, maxCreditsPerDay,
        }, extra) => {
            const client = clientFactory(extra);
            const result = await client.createAgent({
                name, description, instructions, agentType,
                enabledApps, enabledActions, appPermissions, assignedWorkflowIds, linkedFileIds, chatModel,
                goals, configFiles,
                iconName: avatar_icon_name,
                iconColor: avatar_color,
                activate, status, modelTier, maxCreditsPerDay,
            });
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'update_agent',
        `Surgical update of one agent. **Preferred path for any single-field edit on an existing agent** — only the fields in \`updates\` / \`replace\` / \`unset\` are touched, every other field is left as-is. Same merge model as \`update_step\`.

## Merge semantics

\`update_agent\` accepts three independent operations on the same call. At least one must be non-empty.

- **\`updates\`** — partial agent patch. Top-level fields (\`name\`, \`description\`, \`instructions\`, \`status\`, \`goals\`, \`chatModel\`, \`enabledApps\`, etc.) are shallow-replaced. Nested objects (\`configFiles\`, \`avatar\`, \`appPermissions\`) are deep-merged ONE LEVEL — keys you don't mention are preserved. Arrays (\`enabledApps\`, \`enabledActions\`, \`assignedWorkflowIds\`, \`linkedFileIds\`) are replaced wholesale.
- **\`replace: string[]\`** — dot-paths whose values from \`updates\` are assigned WHOLESALE, skipping deep-merge. Use this when you genuinely want to wipe a dictionary (e.g. \`replace: ["configFiles"]\` swaps the whole configFiles dict instead of merging key-by-key).
- **\`unset: string[]\`** — dot-paths to DELETE (e.g. \`["goals"]\`, \`["configFiles.SOUL.md"]\`). Each must currently exist on the agent.
- **\`null\` in updates** — shortcut for unset (e.g. \`updates: { goals: null }\`).

## Common edit recipes

| Goal | Call |
|---|---|
| Update one config file (preserve others) | \`updates: { configFiles: { "SOUL.md": "new persona…" } }\` |
| Replace all instructions | \`updates: { instructions: "new system prompt" }\` |
| Rename agent slug/email address | \`updates: { slug: "pitchnight" }\` |
| Assign workflows (full replace) | \`updates: { assignedWorkflowIds: ["wf-1", "wf-2"] }\` |
| Add to assigned workflows | fetch via \`get_agent\`, modify locally, send full new array (or use \`manage_agent_workflows\`) |
| Allow an app to write with approval | \`updates: { enabledApps: ["linkedin"], appPermissions: { linkedin: { access: "write", writeApprovalRequired: true } } }\` |
| Keep an app read-only | \`updates: { enabledApps: ["linkedin"], appPermissions: { linkedin: { access: "read" } } }\` |
| Change avatar color only | \`updates: { avatar: { color: "#7C3AED" } }\` (iconName preserved) |
| Activate (fail-fast on missing fields) | \`updates: { status: "active" }\` |
| Deactivate / pause | \`updates: { status: "paused" }\` or \`updates: { status: "draft" }\` |
| Unset a scalar field | \`updates: { goals: null }\` or \`unset: ["goals"]\` |
| Wipe + reset configFiles wholesale | \`updates: { configFiles: { "SOUL.md": "…", "TOOLS.md": "…" } }, replace: ["configFiles"]\` |
| Remove just one config file | \`unset: ["configFiles.SOUL.md"]\` |

**The trap.** Default deep-merge for \`configFiles\` and \`avatar\` is one level — sending a partial dict preserves siblings. To force a full wipe, use \`replace: ["configFiles"]\`.

## Activation requirements (fail-fast on \`status: "active"\`)

When transitioning to \`active\`, the agent is validated:
- \`instructions\` must be non-empty
- \`configFiles["SOUL.md"]\` must be present, > 200 chars, and not contain the placeholder marker
- \`configFiles["TOOLS.md"]\` must be present, > 200 chars, and not contain the placeholder marker

If any check fails, the agent is NOT updated. The response is \`{ ok: false, errors: ["…"] }\` (HTTP 400). Fix the missing fields and retry.

For scheduled / autonomous behaviour, attach routines via \`create_routine\` AFTER activation. Routines are first-class entities — they are NOT a field on the agent.

## What update_agent will NOT do

- Cannot change \`agent.id\` (immutable, 400)
- Changing \`agent.slug\` moves the AgentEntity to a new \`{slug}@{workspace}\` id, rebinds routines/file links/channel sessions/chat sessions where available, and updates the agent email address derived from the slug.
- Slug convention: \`slug\` is the short role ID used in URLs/email. Keep "Agent" in the display name when useful, but do not append \`-agent\` to the slug just because the display name includes it; e.g. \`Deal Sourcing Agent\` should use \`deal-sourcing\`, not \`deal-sourcing-agent\`.
- Cannot create new agents (use \`create_agent\`)
- Cannot delete agents (use \`delete_agent\`)
- Does not edit routines (use \`update_routine\` / \`create_routine\` / \`pause_routine\`)
- Does not validate the merged result is internally consistent — only the activation guard runs. Other invariants are caller's responsibility.

## Diff + warnings

Response includes \`diff: { addedPaths, changedPaths, removedPaths }\` and \`warnings[]\`. ≥6 fields removed without explicit \`unset\` triggers a warning — usually a "you wiped a dictionary" signal.`,
        {
            id: z.string().describe('Agent ID (immutable)'),
            updates: z.record(z.string(), z.any()).optional().describe('Partial agent patch. Top-level fields shallow-replace; configFiles & avatar deep-merge one level; arrays full-replace; null = unset. Optional if `replace` or `unset` is provided.'),
            replace: z.array(z.string()).optional().describe('Dot-paths (e.g. "configFiles") whose values in `updates` should be assigned wholesale, skipping deep-merge. Use to wipe + reset dictionary fields.'),
            unset: z.array(z.string()).optional().describe('Dot-paths to delete from the agent (e.g. "goals", "configFiles.SOUL.md"). Each must currently exist on the agent.'),
        },
        async ({ id, updates, replace, unset }, extra) => {
            const client = clientFactory(extra);
            const result = await client.updateAgent(id, { updates, replace, unset });
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'delete_agent',
        `Permanently delete an agent and all its files. Also deletes the linked proactive agent.`,
        {
            id: z.string().describe('Agent ID'),
        },
        async ({ id }, extra) => {
            const client = clientFactory(extra);
            const result = await client.deleteAgent(id);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'activate_agent',
        `Activate an agent, changing its status from draft or paused to active.
Active agents respond to chat messages; active agents with routines will run those routines on schedule.`,
        {
            id: z.string().describe('Agent ID'),
        },
        async ({ id }, extra) => {
            const client = clientFactory(extra);
            const result = await client.activateAgent(id);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'pause_agent',
        `Pause an active agent. Routines attached to the agent stop running until the agent is resumed via activate_agent.`,
        {
            id: z.string().describe('Agent ID'),
        },
        async ({ id }, extra) => {
            const client = clientFactory(extra);
            const result = await client.pauseAgent(id);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'manage_agent_workflows',
        `Add, remove, or replace the workflows assigned to an agent without passing the full agent config.

- operation 'add': append workflowIds to the existing list (no-op for IDs already present)
- operation 'remove': remove specific workflowIds from the list
- operation 'set': replace the entire list with the given workflowIds

Use 'set' with an empty array to clear all assigned workflows.`,
        {
            id: z.string().describe('Agent ID'),
            workflow_ids: z.array(z.string()).describe('Workflow IDs to add, remove, or set'),
            operation: z.enum(['add', 'remove', 'set']).describe("'add', 'remove', or 'set' (replace all)"),
        },
        async ({ id, workflow_ids, operation }, extra) => {
            const client = clientFactory(extra);

            // Fetch current assignedWorkflowIds
            const agentResult = await client.getAgent(id);
            const current: string[] = agentResult?.agent?.assignedWorkflowIds ?? [];

            let updated: string[];
            if (operation === 'add') {
                const toAdd = workflow_ids.filter((wid) => !current.includes(wid));
                updated = [...current, ...toAdd];
            } else if (operation === 'remove') {
                const toRemove = new Set(workflow_ids);
                updated = current.filter((wid) => !toRemove.has(wid));
            } else {
                // 'set'
                updated = workflow_ids;
            }

            const result = await client.updateAgent(id, { updates: { assignedWorkflowIds: updated } });
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify({ ...result, assignedWorkflowIds: updated }, null, 2),
                }],
            };
        }
    );

    server.tool(
        'chat_with_agent',
        `Send a message to an agent. Defaults to the active workspace assistant (assistant@...) when no id or agent_slug is provided.
Use list_agents first when you want to choose a different agent. The agent's instructions are used as the system prompt.
Supports multi-turn conversations via session_id.`,
        {
            id: z.string().optional().describe('Agent ID. If omitted, defaults to the active assistant@... agent.'),
            agent_slug: z.string().optional().describe('Agent slug to chat with, e.g. assistant, pitch-night, lead-qualifier. Ignored when id is provided.'),
            message: z.string().describe('Message to send to the agent'),
            session_id: z.string().optional().describe('Session ID for multi-turn conversations'),
        },
        async ({ id, agent_slug, message, session_id }, extra) => {
            const client = clientFactory(extra);
            try {
                const resolvedAgentId = await resolveAgentIdForChat(client, { id, agent_slug });
                const result = await client.chatWithAgent(resolvedAgentId, message, session_id);

                if (result.error) {
                    return {
                        content: [{
                            type: 'text' as const,
                            text: `Chat error: ${result.error}`,
                        }],
                        isError: true,
                    };
                }

                const parts: string[] = [];
                if (result.response) parts.push(result.response);
                parts.push(`\n---\nagent_id: ${resolvedAgentId}`);
                if (result.sessionId) parts.push(`\n---\nsession_id: ${result.sessionId}`);

                return {
                    content: [{
                        type: 'text' as const,
                        text: parts.join('') || JSON.stringify(result, null, 2),
                    }],
                };
            } catch (err: any) {
                return {
                    content: [{
                        type: 'text' as const,
                        text: `Chat failed: ${err.message}`,
                    }],
                    isError: true,
                };
            }
        }
    );

    server.tool(
        'list_agent_files',
        `List all files attached to an agent. These include reference documents, knowledge files,
and any other files uploaded to provide the agent with context.`,
        {
            agent_id: z.string().describe('Agent ID'),
        },
        async ({ agent_id }, extra) => {
            const client = clientFactory(extra);
            const result = await client.listAgentFiles(agent_id);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'get_agent_file',
        `Get the content of a specific file attached to an agent.`,
        {
            agent_id: z.string().describe('Agent ID'),
            file_id: z.string().describe('File ID (from list_agent_files)'),
        },
        async ({ agent_id, file_id }, extra) => {
            const client = clientFactory(extra);
            const result = await client.getAgentFile(agent_id, file_id);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'upload_agent_file',
        `Upload a file to an agent. Files provide the agent with additional context such as
reference documents, knowledge bases, or configuration data.

- name: Filename (e.g. 'thesis.md', 'company-context.txt')
- content: Raw text or markdown content (max 400KB)
- mime_type: MIME type (default: 'text/plain', use 'text/markdown' for .md files)
- role: Optional label describing the file's purpose (e.g. 'knowledge', 'context')`,
        {
            agent_id: z.string().describe('Agent ID'),
            name: z.string().describe('Filename (e.g. "context.md")'),
            content: z.string().describe('File content (raw text or markdown, max 400KB)'),
            mime_type: z.string().optional().describe("MIME type (default: 'text/plain')"),
            role: z.string().optional().describe('File role / purpose label'),
        },
        async ({ agent_id, name, content, mime_type, role }, extra) => {
            const client = clientFactory(extra);
            const result = await client.uploadAgentFile(agent_id, {
                name,
                content,
                mimeType: mime_type,
                role,
            });
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'update_agent_file',
        `Update a file that is already attached to an agent.

Use this for durable reflection context such as JOURNAL.md, OBJECTIVES.md, and PEOPLE.md:
read the current file first with get_agent_file, then send the full updated content. Update
only when there is durable signal (decisions, corrections, objectives, people context, or
useful learning), not for every chat turn. The file must already be linked to the agent, so
this tool cannot accidentally edit an unrelated workspace file.`,
        {
            agent_id: z.string().describe('Agent ID'),
            file_id: z.string().describe('File ID (from list_agent_files)'),
            name: z.string().optional().describe('New filename'),
            content: z.string().optional().describe('Full replacement file content'),
            mime_type: z.string().optional().describe("MIME type/content type (e.g. 'markdown' or 'text/markdown')"),
        },
        async ({ agent_id, file_id, name, content, mime_type }, extra) => {
            const client = clientFactory(extra);
            const result = await client.updateAgentFile(agent_id, file_id, {
                name,
                content,
                mimeType: mime_type,
            });
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'delete_agent_file',
        `Permanently delete a file attached to an agent.`,
        {
            agent_id: z.string().describe('Agent ID'),
            file_id: z.string().describe('File ID (from list_agent_files)'),
        },
        async ({ agent_id, file_id }, extra) => {
            const client = clientFactory(extra);
            const result = await client.deleteAgentFile(agent_id, file_id);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );
}
