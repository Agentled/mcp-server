/**
 * MCP Tools — Knowledge, Workspace & Knowledge Graph
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

export function registerKnowledgeTools(server: McpServer, clientFactory: ClientFactory) {

    // --- Workspace Context ---

    server.tool(
        'get_workspace',
        `Get workspace company info, offerings, and knowledge schema overview.
Returns company details (name, industry, size, offerings) and a summary of all knowledge lists with their field definitions and row counts.
Use this as a first call to understand what data the workspace has.`,
        {},
        async (_args, extra) => {
            const client = clientFactory(extra);
            const result = await client.getWorkspace();
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    // --- Knowledge Data ---

    server.tool(
        'list_knowledge_lists',
        `List all knowledge list schemas with field definitions, row counts, and metadata.
Returns detailed information about each list including fields, source type, category, entity config, and KG sync status.
Use this to discover what lists exist and understand their structure before querying rows.`,
        {},
        async (_args, extra) => {
            const client = clientFactory(extra);
            const result = await client.listKnowledgeLists();
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'get_knowledge_rows',
        `Fetch sample rows from a knowledge list. Use this to inspect actual data — see example payloads from investor/deal lists.
Returns rows with their full rowData, plus count and totalCount for the list.`,
        {
            listKey: z.string().describe('The list key to fetch rows from (e.g., "investors", "deals")'),
            limit: z.number().min(1).max(50).optional().describe('Number of rows to return (default 5, max 50)'),
        },
        async ({ listKey, limit }, extra) => {
            const client = clientFactory(extra);
            const result = await client.getKnowledgeRows(listKey, limit);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'get_knowledge_text',
        `Fetch a text-type knowledge entry by key. Use this to access text-based knowledge like feedback files, notes, or configuration text stored in the workspace.`,
        {
            key: z.string().describe('The key of the text entry to fetch'),
        },
        async ({ key }, extra) => {
            const client = clientFactory(extra);
            const result = await client.getKnowledgeText(key);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    // --- Knowledge Graph ---

    server.tool(
        'query_kg_edges',
        `Traverse Knowledge Graph edges by entity name and/or relationship type.
Returns edges with source/target node IDs, relations, scores, and metadata.
Use this to explore deal relationships, investor-startup connections, and scoring edges.
Gracefully returns empty results if the Knowledge Graph is not configured.`,
        {
            entityName: z.string().optional().describe('Filter edges by entity name'),
            relationshipType: z.string().optional().describe('Filter edges by relationship type (e.g., "INVESTED_IN", "SCORED")'),
            limit: z.number().min(1).max(500).optional().describe('Max edges to return (default 100, max 500)'),
        },
        async ({ entityName, relationshipType, limit }, extra) => {
            const client = clientFactory(extra);
            const result = await client.queryKgEdges(entityName, relationshipType, limit);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'get_scoring_history',
        `Fetch scoring history for entities from the Knowledge Graph.
Returns past scoring decisions (PROCEED_TO_IC, HOLD_FOR_REVIEW, REPOSITION, SCORED) with DMF scores and dates.
Use this to see how entities were previously scored and calibrate future scoring runs.
Returns both structured records and a compact text format for prompt injection.`,
        {
            entityName: z.string().optional().describe('Filter scoring history by entity name'),
            limit: z.number().min(1).max(500).optional().describe('Max records to return (default 100, max 500)'),
        },
        async ({ entityName, limit }, extra) => {
            const client = clientFactory(extra);
            const result = await client.getScoringHistory(entityName, limit);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );
}
