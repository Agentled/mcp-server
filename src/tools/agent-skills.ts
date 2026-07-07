/**
 * MCP Tools — Agent Skill Discovery
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const SKILLS = [
    {
        id: 'outcome-solver',
        version: 1,
        label: 'Business Strategist',
        description: 'Understand the business outcome, do a bounded first pass, and propose repeatable operating assets.',
        category: 'base',
        surfaces: ['general', 'routine', 'external'],
        risks: ['read'],
    },
    {
        id: 'workflow-manager',
        version: 1,
        label: 'Workflow Builder',
        description: 'Create, inspect, validate, and draft-safely edit workflows and workflow groups.',
        category: 'workflow',
        surfaces: ['general', 'pipeline-editor', 'routine', 'external'],
        risks: ['read', 'write'],
        requiresApprovalForActivation: true,
    },
    {
        id: 'agent-manager',
        version: 1,
        label: 'Agent Builder',
        description: 'Propose goal groups and create or update draft specialist owner agents with scoped access.',
        category: 'agent-admin',
        surfaces: ['general', 'external'],
        risks: ['read', 'write', 'admin', 'autonomous'],
        requiresApprovalForActivation: true,
    },
];

const RUNTIME_SKILLS = [
    {
        id: 'workflow-operator',
        version: 1,
        label: 'Workflow Operator',
        description: 'Hidden runtime bundle for guarded assigned-workflow inspection and draft-safe fixes.',
        category: 'workflow',
        surfaces: ['general', 'pipeline-editor', 'routine', 'external'],
        risks: ['read', 'write'],
        mcpVisible: false,
    },
    {
        id: 'inline-execution',
        version: 1,
        label: 'Inline Execution',
        description: 'Hidden runtime bundle for eligible app-action execution through approval, billing, and audit policy.',
        category: 'execution',
        surfaces: ['general', 'channel', 'routine', 'external'],
        risks: ['read', 'write', 'send'],
        requiresApprovalForActivation: true,
        mcpVisible: false,
    },
    {
        id: 'template-runner',
        version: 1,
        label: 'Template Runner',
        description: 'Hidden runtime bundle for workflow/template discovery, input collection, and reusable workflow starts.',
        category: 'workflow',
        surfaces: ['general', 'external'],
        risks: ['read', 'write'],
        mcpVisible: false,
    },
    {
        id: 'routine-core',
        version: 1,
        label: 'Routine Core',
        description: 'Hidden routine-surface bundle for routine memory, assigned workflow, and workspace knowledge context.',
        category: 'base',
        surfaces: ['routine'],
        risks: ['read', 'autonomous'],
        mcpVisible: false,
    },
    {
        id: 'channel-email',
        version: 1,
        label: 'Email Channel',
        description: 'Hidden channel-surface bundle for email-channel context; it does not grant sends by itself.',
        category: 'communication',
        surfaces: ['channel'],
        risks: ['read', 'send'],
        mcpVisible: false,
    },
    {
        id: 'routine-manager',
        version: 1,
        label: 'Routine Manager',
        description: 'Hidden control-plane bundle for creating paused routine drafts; activation still requires approval.',
        category: 'agent-admin',
        surfaces: ['general', 'external'],
        risks: ['read', 'write', 'autonomous', 'admin'],
        requiresApprovalForActivation: true,
        mcpVisible: false,
    },
];

export function registerAgentSkillTools(server: McpServer, clientFactory: ClientFactory) {
    server.tool(
        'list_agent_skills',
        `List supported agent skill IDs for create_agent, update_agent, create_routine, and update_routine.

Use these IDs in skillIds. They are stored internally as enabledSkills, but user-facing copy should say Skills.
By default this returns only public user-facing skills. Pass includeRuntime: true only for advanced runtime bundle configuration such as workflow-operator, template-runner, inline-execution, routine-core, or channel-email.
The agent-manager and routine-manager skills are control-plane tools for draft goal groups, owner agents, reusable assets, and paused schedules; activation or scheduled autonomy still requires explicit approval and audit.`,
        {
            includeRuntime: z.boolean().optional().describe('Include hidden runtime bundle IDs for advanced API/MCP agent configuration. Default false.'),
        },
        async ({ includeRuntime }) => ({
            content: [{
                type: 'text' as const,
                text: JSON.stringify({ skills: includeRuntime ? [...SKILLS, ...RUNTIME_SKILLS] : SKILLS }, null, 2),
            }],
        }),
    );

    server.tool(
        'list_workspace_skills',
        `List workspace-created skills. These are draft/published/archived skill records backed by AgentFile content.

Use import_workspace_skill for a one-step Markdown/SKILL.md/JSON import. Use create_workspace_skill only when you already have the backing AgentFile ID. Workspace skill allowedApps/allowedActions are recommended tools only; they do not grant app/action scope, runtime bundles, workspace connections, write access, or approval bypasses.`,
        {
            status: z.enum(['draft', 'published', 'archived']).optional().describe('Optional status filter'),
            limit: z.number().int().positive().max(500).optional().describe('Maximum rows to return'),
        },
        async ({ status, limit }, extra) => {
            const client = clientFactory(extra);
            const result = await client.listWorkspaceSkills({ status, limit });
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        },
    );

    server.tool(
        'import_workspace_skill',
        `Import a Markdown, SKILL.md, or JSON skill file into a draft workspace skill.

This creates one backing workspace AgentFile and then one draft WorkspaceSkill. Imported allowedApps/allowedActions are recommended apps/actions only. Import does not grant those tools, publish the skill, assign it to an agent, run chat/routines/workflows, write providers, send messages, bypass approvals, or spend credits. Use publish_workspace_skill and explicit agent assignment only after reviewing the draft.`,
        {
            content: z.string().optional().describe('Raw Markdown/SKILL.md/JSON skill content. Provide either content or url.'),
            url: z.string().url().optional().describe('HTTPS URL to Markdown/SKILL.md/JSON skill content. GitHub blob URLs are converted to raw URLs. Provide either content or url.'),
            sourceLabel: z.string().optional().describe('Human-readable import source stored in metadata.importSource when content is provided. Defaults to inline-skill. URL imports use the original URL.'),
        },
        async (input, extra) => {
            const client = clientFactory(extra);
            const result = await client.importWorkspaceSkill(input);

            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        },
    );

    server.tool(
        'create_workspace_skill',
        `Create a draft workspace skill backed by an existing AgentFile.

The AgentFile content should contain the skill instructions/body. The WorkspaceSkill record stores lifecycle, risk, relevance, recommended apps/actions, and approval metadata. The allowedApps/allowedActions fields are recommendations for runtime guidance; actual availability still comes from the assigned agent app/action scope, runtime bundles, workspace connections, and approval gates. Prefer import_workspace_skill for Markdown/SKILL.md/JSON imports; use this low-level tool when you already have a reviewed AgentFile ID.`,
        {
            name: z.string().min(1).describe('Skill name'),
            contentFileId: z.string().min(1).describe('AgentFile ID containing skill instructions/body'),
            description: z.string().optional().describe('Short skill description'),
            category: z.string().optional().describe('Skill category'),
            allowedApps: z.array(z.string()).optional().describe('Recommended app IDs; does not grant app access'),
            allowedActions: z.array(z.string()).optional().describe('Recommended action IDs; does not grant action access'),
            approvalPolicy: z.record(z.unknown()).optional().describe('Approval policy metadata'),
            riskProfile: z.record(z.unknown()).optional().describe('Risk profile metadata'),
            relevanceRules: z.record(z.unknown()).optional().describe('When the skill should be relevant'),
            validation: z.record(z.unknown()).optional().describe('Validation metadata'),
            metadata: z.record(z.unknown()).optional().describe('Additional metadata'),
        },
        async (input, extra) => {
            const client = clientFactory(extra);
            const result = await client.createWorkspaceSkill(input);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        },
    );

    server.tool(
        'get_workspace_skill',
        'Get a workspace-created skill by ID.',
        {
            skillId: z.string().min(1).describe('WorkspaceSkill ID'),
        },
        async ({ skillId }, extra) => {
            const client = clientFactory(extra);
            const result = await client.getWorkspaceSkill(skillId);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        },
    );

    server.tool(
        'update_workspace_skill',
        `Update a draft workspace-created skill. Published and archived workspace skills are immutable through this tool; archive and create a new version instead.`,
        {
            skillId: z.string().min(1).describe('WorkspaceSkill ID'),
            name: z.string().optional().describe('Skill name'),
            contentFileId: z.string().optional().describe('Replacement AgentFile ID for skill instructions/body'),
            description: z.string().nullable().optional().describe('Skill description; null clears it'),
            category: z.string().nullable().optional().describe('Skill category; null clears it'),
            allowedApps: z.array(z.string()).optional().describe('Recommended app IDs; does not grant app access'),
            allowedActions: z.array(z.string()).optional().describe('Recommended action IDs; does not grant action access'),
            approvalPolicy: z.record(z.unknown()).nullable().optional().describe('Approval policy metadata; null clears it'),
            riskProfile: z.record(z.unknown()).nullable().optional().describe('Risk profile metadata; null clears it'),
            relevanceRules: z.record(z.unknown()).nullable().optional().describe('Relevance rules; null clears them'),
            validation: z.record(z.unknown()).nullable().optional().describe('Validation metadata; null clears it'),
            metadata: z.record(z.unknown()).nullable().optional().describe('Additional metadata; null clears it'),
        },
        async ({ skillId, ...updates }, extra) => {
            const client = clientFactory(extra);
            const result = await client.updateWorkspaceSkill(skillId, updates);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        },
    );

    server.tool(
        'publish_workspace_skill',
        'Publish a draft workspace-created skill.',
        {
            skillId: z.string().min(1).describe('WorkspaceSkill ID'),
        },
        async ({ skillId }, extra) => {
            const client = clientFactory(extra);
            const result = await client.publishWorkspaceSkill(skillId);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        },
    );

    server.tool(
        'archive_workspace_skill',
        'Archive a workspace-created skill without deleting its backing AgentFile content.',
        {
            skillId: z.string().min(1).describe('WorkspaceSkill ID'),
        },
        async ({ skillId }, extra) => {
            const client = clientFactory(extra);
            const result = await client.archiveWorkspaceSkill(skillId);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        },
    );
}
