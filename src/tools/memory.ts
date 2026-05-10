/**
 * MCP Tools — Persistent Memory
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

export function registerMemoryTools(server: McpServer, clientFactory: ClientFactory) {

    server.tool(
        'recall_memory',
        `Recall a specific memory by key. Returns the stored value if found.
Use this to retrieve previously stored facts, insights, preferences, or outcomes.

**KG-First:** Call this BEFORE generating AI-step prompts that reference workspace-specific strategy (ICP, thesis, rubric). If the content exists as a memory, reference it at runtime via the workspace_memory builtin tool rather than pasting it into the prompt template.`,
        {
            key: z.string().describe('The memory key to recall'),
            scope: z.enum(['workspace', 'workflow']).optional().describe('Memory scope (default: workflow)'),
            workflowId: z.string().optional().describe('Workflow ID (required for workflow scope)'),
        },
        async ({ key, scope, workflowId }, extra) => {
            const client = clientFactory(extra);
            const result = await client.recallMemory({ key, scope, pipelineId: workflowId });
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'search_memories',
        `Search memories by natural language query and/or category.
Returns matching memories sorted by confidence. Use to find relevant stored knowledge.

**KG-First:** Call this BEFORE generating AI-step prompts with business-specific content to check whether workspace strategy (ICP, thesis, rubric) is already stored. Reference found memories at runtime instead of inlining them in prompt strings.`,
        {
            query: z.string().optional().describe('Natural language search query'),
            category: z.enum(['fact', 'insight', 'preference', 'outcome']).optional().describe('Filter by category'),
            scope: z.enum(['workspace', 'workflow']).optional().describe('Memory scope'),
            workflowId: z.string().optional().describe('Workflow ID for workflow-scoped search'),
            limit: z.number().optional().describe('Max results (default 20)'),
        },
        async ({ query, category, scope, workflowId, limit }, extra) => {
            const client = clientFactory(extra);
            const result = await client.searchMemories({ query, category, scope, pipelineId: workflowId, limit });
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'store_memory',
        `Store a persistent memory. Memories survive across workflow executions and can be recalled later.
Categories: fact (known truth), insight (pattern/learning), preference (user preference), outcome (result to track).

**KG-First:** Use this to seed workspace-specific strategy content (ICP criteria, scoring rubric definitions, investment thesis, brand voice) BEFORE building the workflow steps that need it. Once stored, the AI step references it at runtime via the workspace_memory builtin tool — never hardcoded in the prompt template.`,
        {
            key: z.string().describe('Memory key (unique identifier)'),
            value: z.any().describe('Value to store (any JSON type)'),
            category: z.enum(['fact', 'insight', 'preference', 'outcome']).optional().describe('Memory category (default: insight)'),
            scope: z.enum(['workspace', 'workflow']).optional().describe('Memory scope (default: workflow)'),
            workflowId: z.string().optional().describe('Workflow ID for workflow-scoped memories'),
            confidence: z.number().optional().describe('Confidence score 0-100 (default: 80)'),
            merge: z.enum(['overwrite', 'append', 'max', 'min', 'increment']).optional().describe('Merge strategy if key exists (default: overwrite)'),
        },
        async ({ key, value, category, scope, workflowId, confidence, merge }, extra) => {
            const client = clientFactory(extra);
            const result = await client.storeMemory({ key, value, category, scope, pipelineId: workflowId, confidence, merge });
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'list_memories',
        `List all memories in a given scope. Returns memories sorted by confidence.`,
        {
            scope: z.enum(['workspace', 'workflow']).optional().describe('Memory scope (default: workflow)'),
            workflowId: z.string().optional().describe('Workflow ID for workflow-scoped list'),
            category: z.enum(['fact', 'insight', 'preference', 'outcome']).optional().describe('Filter by category'),
            limit: z.number().optional().describe('Max results (default 50)'),
        },
        async ({ scope, workflowId, category, limit }, extra) => {
            const client = clientFactory(extra);
            const result = await client.listMemories({ scope, pipelineId: workflowId, category, limit });
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'delete_memory',
        `Delete a specific memory by key.`,
        {
            key: z.string().describe('Memory key to delete'),
            scope: z.enum(['workspace', 'workflow']).optional().describe('Memory scope'),
            workflowId: z.string().optional().describe('Workflow ID for workflow-scoped memory'),
        },
        async ({ key, scope, workflowId }, extra) => {
            const client = clientFactory(extra);
            const result = await client.deleteMemory({ key, scope, pipelineId: workflowId });
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );
}
