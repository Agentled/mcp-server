/**
 * MCP Tools — Agent Skill Discovery
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ClientFactory } from '../server.js';

const SKILLS = [
    {
        id: 'outcome-solver',
        version: 1,
        label: 'Outcome Solver',
        description: 'Understand the client outcome, do a bounded first pass, and propose repeatable operating assets.',
        category: 'base',
        surfaces: ['general', 'routine', 'external'],
        risks: ['read'],
    },
    {
        id: 'workflow-manager',
        version: 1,
        label: 'Workflow Manager',
        description: 'Create, inspect, validate, and draft-safely edit workflows and workflow groups.',
        category: 'workflow',
        surfaces: ['general', 'pipeline-editor', 'routine', 'external'],
        risks: ['read', 'write'],
        requiresApprovalForActivation: true,
    },
    {
        id: 'agent-manager',
        version: 1,
        label: 'Agent Manager',
        description: 'Propose goal groups and create or update draft specialist owner agents with scoped access.',
        category: 'agent-admin',
        surfaces: ['general', 'external'],
        risks: ['read', 'write', 'admin', 'autonomous'],
        requiresApprovalForActivation: true,
    },
];

export function registerAgentSkillTools(server: McpServer, _clientFactory: ClientFactory) {
    server.tool(
        'list_agent_skills',
        `List supported agent skill IDs for create_agent, update_agent, create_routine, and update_routine.

Use these IDs in skillIds. They are stored internally as enabledSkills, but user-facing copy should say Skills.
The agent-manager and routine-manager skills are control-plane tools for draft goal groups, owner agents, reusable assets, and paused schedules; activation or scheduled autonomy still requires explicit approval and audit.`,
        {},
        async () => ({
            content: [{
                type: 'text' as const,
                text: JSON.stringify({ skills: SKILLS }, null, 2),
            }],
        }),
    );
}
