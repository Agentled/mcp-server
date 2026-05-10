/**
 * MCP Tool — Semantic Intent Router
 *
 * Lets agents describe what they want in natural language and routes to the
 * best matching workflow.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

export function registerIntentTools(server: McpServer, clientFactory: ClientFactory) {

    server.tool(
        'do',
        `Semantic intent router — describe what you want to accomplish in plain English and
Agentled will find the best matching live workflow in your workspace. Optionally auto-executes the matched workflow.

Examples:
  - "find the CEO's email for stripe.com"
  - "research acme corp and score them against our ICP"
  - "scrape https://example.com and summarize it"

Returns the best match with confidence score, extracted inputs, and alternatives.
Set execute=true to also start the matched workflow immediately.`,
        {
            intent: z.string().describe('Natural language description of what you want to accomplish'),
            execute: z.boolean().optional().describe('If true, auto-execute the matched workflow (default: false)'),
            confirm: z.boolean().optional().describe('If true (default), return missing inputs for confirmation before executing. Set false to skip.'),
        },
        async ({ intent, execute, confirm }, extra) => {
            const client = clientFactory(extra);
            const result = await client.resolveIntent(intent, { execute, confirm });
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );
}
