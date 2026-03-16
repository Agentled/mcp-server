/**
 * MCP Tools — Workflow Executions
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { AgentledClient } from '../client.js';

export function registerExecutionTools(server: McpServer, client: AgentledClient) {

    server.tool(
        'start_workflow',
        `Start a workflow execution. Optionally provide input data that maps to the workflow's input page fields.
For example, if the workflow expects "company_url", pass: { input: { company_url: "https://..." } }`,
        {
            workflowId: z.string().describe('The workflow ID to start'),
            input: z.record(z.string(), z.any()).optional().describe('Input payload matching the workflow input page fields'),
            metadata: z.record(z.string(), z.any()).optional().describe('Optional execution metadata'),
        },
        async ({ workflowId, input, metadata }) => {
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
        },
        async ({ workflowId, status, limit, direction }) => {
            const result = await client.listExecutions(workflowId, { status, limit, direction });
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
        async ({ workflowId, executionId }) => {
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
        'stop_execution',
        'Stop a running or pending workflow execution. Only works on executions with status "running" or "pending".',
        {
            workflowId: z.string().describe('The workflow ID'),
            executionId: z.string().describe('The execution ID to stop'),
        },
        async ({ workflowId, executionId }) => {
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
            rerunMode: z.enum(['single-step', 'from-step', 'selected-steps']).optional().describe('Rerun mode: single-step (retry only this step), from-step (retry from this step onward), selected-steps'),
        },
        async ({ workflowId, executionId, timelineId, forceWithoutCache, rerunMode }) => {
            const result = await client.retryExecution(workflowId, executionId, {
                timelineId,
                forceWithoutCache,
                rerunMode,
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
