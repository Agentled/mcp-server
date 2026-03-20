/**
 * MCP Tools — Branding (Whitelabel)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

export function registerBrandingTools(server: McpServer, clientFactory: ClientFactory) {

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
