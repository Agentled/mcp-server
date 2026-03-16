/**
 * MCP Tools — Step Testing
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { AgentledClient } from '../client.js';

export function registerTestingTools(server: McpServer, client: AgentledClient) {

    server.tool(
        'test_app_action',
        `Test an app action in isolation without creating a workflow or execution.
Pass the appId and actionId (from list_apps / get_app_actions) plus input data to run the action directly and see results immediately.
Useful for verifying inputs before wiring a step into a workflow.
Example: test_app_action("web-scraping", "scrape", { url: "https://example.com" })`,
        {
            appId: z.string().describe('App ID (e.g., "agentled", "web-scraping", "hunter")'),
            actionId: z.string().describe('Action ID (e.g., "scrape", "get-linkedin-company-from-url", "find-email-person-domain")'),
            input: z.record(z.string(), z.any()).optional().describe('Input data for the action (e.g., { url: "https://example.com" })'),
            bypassCache: z.boolean().optional().describe('Skip cache and run against the live API (default: false)'),
        },
        async ({ appId, actionId, input, bypassCache }) => {
            const result = await client.testAppAction(appId, actionId, input, bypassCache);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'test_ai_action',
        `Test an AI prompt in isolation without creating a workflow or execution.
Pass a prompt template with {{variable}} syntax and variable values to run the AI and see the response.
Useful for tuning prompts and response structures before adding an AI step to a workflow.
Example: test_ai_action("Analyze this company: {{company}}", { company: "Stripe" }, { score: "number 0-100", summary: "string" })`,
        {
            template: z.string().describe('Prompt template with {{variable}} placeholders'),
            variables: z.record(z.string(), z.any()).optional().describe('Variable values to substitute in the template'),
            responseStructure: z.record(z.string(), z.any()).optional().describe('Expected JSON output shape (e.g., { score: "number 0-100", summary: "string" })'),
            responseType: z.enum(['json', 'text']).optional().describe('Response format: "json" (default) or "text"'),
            systemPrompt: z.string().optional().describe('Optional system instructions for the AI'),
        },
        async ({ template, variables, responseStructure, responseType, systemPrompt }) => {
            const result = await client.testAiAction(template, variables, responseStructure, {
                responseType,
                systemPrompt,
            });
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );
}
