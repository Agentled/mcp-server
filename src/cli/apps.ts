/**
 * `agentled apps` subcommands — discover available apps/integrations.
 *
 * apps grep <keyword>       — JSON list of matching apps (exits 0 even on empty result)
 * apps for-source <source>  — table view with fallback message for agents
 */

import { AgentledClient } from '../client.js';
import { c, writeln, info, warn } from './ui.js';

// ---------------------------------------------------------------------------
// Shared grep helper (mirrors the MCP tool filter in tools/apps.ts)
// ---------------------------------------------------------------------------

interface AppAction {
    id?: string;
    name?: string;
    description?: string;
}

interface App {
    id?: string;
    name?: string;
    description?: string;
    actions?: AppAction[];
}

interface ListAppsResult {
    apps?: App[];
    count?: number;
}

export function filterAppsByGrep(result: ListAppsResult, grep: string | undefined): { apps: App[]; count: number; grep?: string } {
    if (!grep || !grep.trim()) {
        const apps = Array.isArray(result?.apps) ? result.apps : [];
        return { apps, count: apps.length };
    }
    const needle = grep.trim().toLowerCase();
    const apps = Array.isArray(result?.apps) ? result.apps : [];

    const matches = (s: unknown): boolean =>
        typeof s === 'string' && s.toLowerCase().includes(needle);

    const filtered = apps.filter((app) => {
        if (matches(app?.id) || matches(app?.name) || matches(app?.description)) return true;
        const actions = Array.isArray(app?.actions) ? app.actions : [];
        return actions.some(
            (a) => matches(a?.id) || matches(a?.name) || matches(a?.description),
        );
    });
    return { apps: filtered, count: filtered.length, grep: needle };
}

// ---------------------------------------------------------------------------
// CLI helpers
// ---------------------------------------------------------------------------

function requireApiKey(): void {
    if (!process.env.AGENTLED_API_KEY) {
        writeln('');
        writeln(`  ${c.red}✗${c.reset} Missing AGENTLED_API_KEY environment variable.`);
        writeln('');
        writeln(`  Generate an API key in ${c.bold}Workspace Settings > Developer${c.reset}`);
        writeln(`  Then export it:  ${c.cyan}export AGENTLED_API_KEY=wsk_...${c.reset}`);
        writeln('');
        process.exit(1);
    }
}

function printTable(apps: App[]): void {
    if (apps.length === 0) return;

    const idW = Math.max(4, ...apps.map((a) => (a.id ?? '').length));
    const nameW = Math.max(4, ...apps.map((a) => (a.name ?? '').length));
    const descW = 50;

    const hr = `  ${'─'.repeat(idW + nameW + descW + 10)}`;
    const row = (id: string, name: string, desc: string): string => {
        const truncDesc = desc.length > descW ? desc.slice(0, descW - 1) + '…' : desc;
        return `  ${c.cyan}${id.padEnd(idW)}${c.reset}  ${c.bold}${name.padEnd(nameW)}${c.reset}  ${c.gray}${truncDesc}${c.reset}`;
    };

    writeln(hr);
    writeln(row('APP ID', 'NAME', 'DESCRIPTION'));
    writeln(hr);
    for (const app of apps) {
        writeln(row(app.id ?? '', app.name ?? '', app.description ?? ''));
        const actions = Array.isArray(app.actions) ? app.actions : [];
        for (const act of actions) {
            writeln(`  ${' '.repeat(idW)}  ${c.dim}  → ${act.id ?? ''}${c.reset}`);
        }
    }
    writeln(hr);
}

// ---------------------------------------------------------------------------
// apps grep <keyword>
// ---------------------------------------------------------------------------

export async function appsGrepCommand(keyword: string, json: boolean): Promise<void> {
    requireApiKey();

    const client = new AgentledClient({
        apiKey: process.env.AGENTLED_API_KEY!,
        baseUrl: process.env.AGENTLED_URL,
    });

    const raw = await client.listApps() as ListAppsResult;
    const result = filterAppsByGrep(raw, keyword);

    if (json) {
        process.stdout.write(JSON.stringify(result, null, 2) + '\n');
        return;
    }

    if (result.apps.length === 0) {
        writeln('');
        warn(`No apps match "${keyword}"`);
        writeln('');
        info('Fallback options:');
        writeln(`  ${c.dim}→ web-scraping.scrape (if you have a URL)${c.reset}`);
        writeln(`  ${c.dim}→ aiActionWithTools + web_search (last resort — 10–25 credits)${c.reset}`);
        writeln('');
        return;
    }

    writeln('');
    info(`${result.count} app${result.count === 1 ? '' : 's'} matching "${keyword}"`);
    writeln('');
    printTable(result.apps);
    writeln('');
}

// ---------------------------------------------------------------------------
// apps for-source <source>  — agent-friendly alias with richer fallback message
// ---------------------------------------------------------------------------

export async function appsForSourceCommand(source: string, json: boolean): Promise<void> {
    requireApiKey();

    const client = new AgentledClient({
        apiKey: process.env.AGENTLED_API_KEY!,
        baseUrl: process.env.AGENTLED_URL,
    });

    const raw = await client.listApps() as ListAppsResult;
    const result = filterAppsByGrep(raw, source);

    if (json) {
        process.stdout.write(JSON.stringify(result, null, 2) + '\n');
        return;
    }

    writeln('');

    if (result.apps.length === 0) {
        warn(`No native app found for source: "${source}"`);
        writeln('');
        writeln(`  ${c.bold}Fallback options (in order of preference):${c.reset}`);
        writeln(`  ${c.cyan}1.${c.reset} web-scraping.scrape — if you have a known URL (free, deterministic)`);
        writeln(`  ${c.cyan}2.${c.reset} http-request.request — if there is a public JSON/RSS feed`);
        writeln(`  ${c.cyan}3.${c.reset} aiActionWithTools + web_search — no specific URL known (10–25 credits, non-deterministic)`);
        writeln('');
        writeln(`  ${c.dim}Document why in the step description so the next maintainer doesn't repeat the search.${c.reset}`);
        writeln('');
    } else {
        info(`${result.count} native app${result.count === 1 ? '' : 's'} found for "${source}" — use appAction, not aiActionWithTools:`);
        writeln('');
        printTable(result.apps);
        writeln('');
        writeln(`  ${c.dim}Run: agentled apps grep ${source} --json   for machine-readable output${c.reset}`);
        writeln('');
    }
}
