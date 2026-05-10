/**
 * MCP Tools — App Discovery
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

/**
 * Filter the listApps response by a case-insensitive substring match against
 * app id, name, description, and action ids/names. Returns the same shape as
 * listApps with a `grep` echo and updated count.
 */
function filterAppsByGrep(result: any, grep: string | undefined): any {
    if (!grep || !grep.trim()) return result;
    const needle = grep.trim().toLowerCase();
    const apps = Array.isArray(result?.apps) ? result.apps : [];

    const matches = (s: unknown): boolean =>
        typeof s === 'string' && s.toLowerCase().includes(needle);

    const filtered = apps.filter((app: any) => {
        if (matches(app?.id) || matches(app?.name) || matches(app?.description)) return true;
        const actions = Array.isArray(app?.actions) ? app.actions : [];
        return actions.some(
            (a: any) => matches(a?.id) || matches(a?.name) || matches(a?.description),
        );
    });
    return { apps: filtered, count: filtered.length, grep: needle };
}

export function registerAppTools(server: McpServer, clientFactory: ClientFactory) {

    server.tool(
        'list_apps',
        `List available apps/integrations in Agentled. Returns app names, descriptions, and action summaries.
Use this to discover what integrations are available before building a workflow.
Common apps: agentled (LinkedIn enrichment, email finder), hunter (email), web-scraping, affinity-crm, specter, http-request.

Pass \`grep\` to filter by keyword — much cheaper than fetching the full catalog when you only want to check a single platform (e.g. \`grep: "producthunt"\` to answer "is there a ProductHunt app?"). The keyword is matched (case-insensitive) against app id, name, description, and action ids/labels. Always run this before designing any "find / fetch / discover / source" step — falling back to aiActionWithTools + web_search without checking is how agents spend 25 credits per page when a 1-credit native call exists.`,
        {
            grep: z.string().optional().describe('Optional keyword filter (case-insensitive substring match against app id, name, description, and action ids/labels). Returns only matching apps; if nothing matches, the result is an empty list — that is the answer to "is there a <X> app?".'),
        },
        async ({ grep }, extra) => {
            const client = clientFactory(extra);
            const result = await client.listApps();
            const filtered = filterAppsByGrep(result, grep);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(filtered, null, 2),
                }],
            };
        }
    );

    server.tool(
        'list_connections',
        `List all connected integrations for the workspace. Returns a unified list of connections from all sources:
- OAuth connections (via Composio)
- API key connections (e.g., Hunter, Affinity CRM) with masked key preview
- Native OAuth (social accounts)
Each connection shows appId, status, source, and for API keys a masked keyPreview (e.g., "c5a1...5532").
Use this to check which apps are configured before running workflows that depend on them.`,
        {},
        async (_args, extra) => {
            const client = clientFactory(extra);
            const result = await client.listConnections();
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'get_app_actions',
        `Get detailed action schemas for a specific app. Returns input parameters, output fields, and credit costs.
Use this to understand exactly what inputs an action needs when building workflow steps.`,
        {
            appId: z.string().describe('The app ID (e.g., "agentled", "hunter", "web-scraping", "affinity-crm")'),
        },
        async ({ appId }, extra) => {
            const client = clientFactory(extra);
            const result = await client.getAppActions(appId);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );
}
