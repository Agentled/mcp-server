/**
 * MCP Tools — Workflow Executions
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

export function registerExecutionTools(server: McpServer, clientFactory: ClientFactory) {

    server.tool(
        'start_workflow',
        `Start a workflow execution. Optionally provide input data that maps to the workflow's input page fields.
For example, if the workflow expects "company_url", pass: { input: { company_url: "https://..." } }`,
        {
            workflowId: z.string().describe('The workflow ID to start'),
            input: z.record(z.string(), z.any()).optional().describe('Input payload matching the workflow input page fields'),
            metadata: z.record(z.string(), z.any()).optional().describe('Optional execution metadata'),
        },
        async ({ workflowId, input, metadata }, extra) => {
            const client = clientFactory(extra);
            const result = await client.startWorkflow(workflowId, input, metadata);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'list_executions',
        'List recent executions for a workflow. Returns execution id, status, timestamps.',
        {
            workflowId: z.string().describe('The workflow ID'),
            status: z.string().optional().describe('Filter: running, completed, failed'),
            limit: z.number().optional().describe('Max results (default 50, max 500)'),
            direction: z.enum(['asc', 'desc']).optional().describe('Sort order (default: desc)'),
            nextToken: z.string().optional().describe('Pagination cursor from a previous response. Pass this to fetch the next page of results.'),
        },
        async ({ workflowId, status, limit, direction, nextToken }, extra) => {
            const client = clientFactory(extra);
            const result = await client.listExecutions(workflowId, { status, limit, direction, nextToken });
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'get_execution',
        `Get full execution details including results from each completed step.
The executionContent field maps stepId -> step output data.
Use this to inspect what a workflow produced, debug failures, or check intermediate results.`,
        {
            workflowId: z.string().describe('The workflow ID'),
            executionId: z.string().describe('The execution ID'),
        },
        async ({ workflowId, executionId }, extra) => {
            const client = clientFactory(extra);
            const result = await client.getExecution(workflowId, executionId);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'list_timelines',
        `List timelines (step execution records) for a specific execution. Each timeline represents a step that ran, with its status, output, and metadata. Use this to inspect individual step results, debug failures, or see the execution flow.`,
        {
            workflowId: z.string().describe('The workflow ID'),
            executionId: z.string().describe('The execution ID'),
            limit: z.number().optional().describe('Max results (default 50, max 500)'),
            direction: z.enum(['asc', 'desc']).optional().describe('Sort order by creation time (default: desc)'),
            nextToken: z.string().optional().describe('Pagination cursor from a previous response. Pass this to fetch the next page of results.'),
        },
        async ({ workflowId, executionId, limit, direction, nextToken }, extra) => {
            const client = clientFactory(extra);
            const result = await client.listTimelines(workflowId, executionId, { limit, direction, nextToken });
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'get_timeline',
        `Get a single timeline (step execution record) by ID. Returns the full timeline including eventContent (step output), status, metadata, and context. Use this to inspect a specific step's result in detail.`,
        {
            workflowId: z.string().describe('The workflow ID'),
            executionId: z.string().describe('The execution ID'),
            timelineId: z.string().describe('The timeline ID'),
        },
        async ({ workflowId, executionId, timelineId }, extra) => {
            const client = clientFactory(extra);
            const result = await client.getTimeline(workflowId, executionId, timelineId);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'stop_execution',
        'Stop a running or pending workflow execution. Only works on executions with status "running" or "pending".',
        {
            workflowId: z.string().describe('The workflow ID'),
            executionId: z.string().describe('The execution ID to stop'),
        },
        async ({ workflowId, executionId }, extra) => {
            const client = clientFactory(extra);
            const result = await client.stopExecution(workflowId, executionId);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'retry_execution',
        `Retry a failed step in a workflow execution. If no timelineId is provided, the most recent failed timeline is automatically detected and retried. This re-runs the failed step and continues the workflow from that point.`,
        {
            workflowId: z.string().describe('The workflow ID'),
            executionId: z.string().describe('The execution ID containing the failed step'),
            timelineId: z.string().optional().describe('Specific timeline ID to retry. If omitted, the most recent failed timeline is auto-detected.'),
            forceWithoutCache: z.boolean().optional().describe('Bypass cache when retrying the step'),
        },
        async ({ workflowId, executionId, timelineId, forceWithoutCache }, extra) => {
            const client = clientFactory(extra);
            const result = await client.retryExecution(workflowId, executionId, {
                timelineId,
                forceWithoutCache,
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
