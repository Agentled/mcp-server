/**
 * MCP Tools — Branding (Whitelabel)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

export function registerBrandingTools(server: McpServer, clientFactory: ClientFactory) {

    server.tool(
        'get_workspace_credits',
        `Get the workspace's current credit balance and usage statistics.

Returns:
- currentBalance: remaining credits on the subscription plan
- planType: subscription tier (e.g., "pro", "teams")
- period: exact labelled window for every total (label, display, start, end)
- periodDays: lookback window for usage stats when applicable
- usedThisPeriod: total credits consumed in the labelled period
- totalExecutions: number of unique workflow executions in the period
- averageCreditsPerExecution: average cost per run
- recentUsage: last 20 credit deductions with execution/step context unless includeRecentUsage=false
- costDrivers: optional bounded top workflows, steps, models, and apps when includeCostDrivers=true

Every usage total is ledger-derived and must be shown with its period label. Use this to check if the workspace has enough credits before starting expensive workflows,
or to report balance and burn rate to stakeholders.`,
        {
            period: z.enum(['rolling-30-days', 'rolling-7-days', 'current-month', 'previous-month', 'month-to-date', 'all-time'])
                .optional()
                .describe('Labelled reporting period. Default: rolling-30-days.'),
            includeCostDrivers: z.boolean().optional().describe('Opt in to bounded workflow/step/model/app cost-driver groups.'),
            includeRecentUsage: z.boolean().optional().describe('Include recent ledger rows. Defaults to true.'),
            limit: z.number().int().positive().max(25).optional().describe('Max cost-driver rows per group, capped at 25.'),
        },
        async ({ period, includeCostDrivers, includeRecentUsage, limit }, extra) => {
            const client = clientFactory(extra);
            const result = await client.getWorkspaceCredits({ period, includeCostDrivers, includeRecentUsage, limit });
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'get_workspace_credit_cost_drivers',
        `Get a concise, ledger-derived workspace credit cost-driver report.

Defaults to period=rolling-30-days and includeCostDrivers=true. Returned totals are period-labelled; always show the period.label/display/start/end alongside credit totals.

Cost drivers include bounded top workflows, steps, models, and apps. Use all-time intentionally because it can scan more ledger rows.`,
        {
            period: z.enum(['rolling-30-days', 'rolling-7-days', 'current-month', 'previous-month', 'month-to-date', 'all-time'])
                .optional()
                .describe('Labelled reporting period. Default: rolling-30-days.'),
            includeRecentUsage: z.boolean().optional().describe('Include recent ledger rows. Defaults to true.'),
            limit: z.number().int().positive().max(25).optional().describe('Max cost-driver rows per group, capped at 25.'),
        },
        async ({ period, includeRecentUsage, limit }, extra) => {
            const client = clientFactory(extra);
            const result = await client.getWorkspaceCredits({
                period,
                includeCostDrivers: true,
                includeRecentUsage,
                limit,
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
        'get_branding',
        `Get the workspace's whitelabel branding configuration.
Returns the current branding settings: displayName, logoUrl, tagline, primaryColor, primaryColorDark, faviconUrl, and hideBadge.
Use this to inspect the current client portal branding before making changes.`,
        {},
        async (_args, extra) => {
            const client = clientFactory(extra);
            const result = await client.getBranding();
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'update_branding',
        `Update the workspace's whitelabel branding configuration.
Set any combination of branding fields. Pass null or empty string to clear a field.

Fields:
- displayName: Brand name shown to clients (e.g., "Acme Corp")
- logoUrl: URL to brand logo image
- tagline: Short tagline under the brand name
- primaryColor: Hex color for light mode (e.g., "#6366f1")
- primaryColorDark: Hex color for dark mode (e.g., "#818cf8")
- faviconUrl: URL to custom favicon
- hideBadge: Boolean — hide the "Built with Agentled" badge (requires teams/enterprise plan)`,
        {
            displayName: z.string().optional().describe('Brand name shown to clients'),
            logoUrl: z.string().optional().describe('URL to brand logo image'),
            tagline: z.string().optional().describe('Short tagline under the brand name'),
            primaryColor: z.string().optional().describe('Hex color for light mode (e.g., "#6366f1")'),
            primaryColorDark: z.string().optional().describe('Hex color for dark mode (e.g., "#818cf8")'),
            faviconUrl: z.string().optional().describe('URL to custom favicon'),
            hideBadge: z.boolean().optional().describe('Hide "Built with Agentled" badge (requires teams/enterprise plan)'),
        },
        async (args, extra) => {
            const client = clientFactory(extra);
            // Only send fields that were actually provided
            const branding: Record<string, any> = {};
            if (args.displayName !== undefined) branding.displayName = args.displayName;
            if (args.logoUrl !== undefined) branding.logoUrl = args.logoUrl;
            if (args.tagline !== undefined) branding.tagline = args.tagline;
            if (args.primaryColor !== undefined) branding.primaryColor = args.primaryColor;
            if (args.primaryColorDark !== undefined) branding.primaryColorDark = args.primaryColorDark;
            if (args.faviconUrl !== undefined) branding.faviconUrl = args.faviconUrl;
            if (args.hideBadge !== undefined) branding.hideBadge = args.hideBadge;

            const result = await client.updateBranding(branding);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );
}
