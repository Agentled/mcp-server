/**
 * `agentled tools builtins` — print the closed list of valid aiActionWithTools builtinType values.
 */

import { c, writeln, info } from './ui.js';

// ---------------------------------------------------------------------------
// Closed list (mirrors the runtime executor's accepted builtinType values)
// ---------------------------------------------------------------------------

export interface BuiltinTool {
    builtinType: string;
    description: string;
    useCase: string;
}

export const BUILTIN_TOOLS: BuiltinTool[] = [
    {
        builtinType: 'web_search',
        description: 'Search the web via a search engine',
        useCase: 'Open-ended research when no native app covers the source. Last resort — prefer appAction or web-scraping.scrape for known URLs.',
    },
    {
        builtinType: 'fetch_website_content',
        description: 'Fetch and read a specific URL (AI-driven)',
        useCase: 'When the AI needs to decide the URL at runtime. If the URL is known, use web-scraping.scrape (appAction) instead.',
    },
    {
        builtinType: 'file_search',
        description: 'Search over uploaded files or knowledge documents',
        useCase: 'Retrieve relevant passages from workspace-uploaded files.',
    },
    {
        builtinType: 'code_interpreter',
        description: 'Execute code in a sandboxed runtime',
        useCase: 'Data analysis, computation, or code execution driven by the AI at runtime.',
    },
    {
        builtinType: 'kg_search',
        description: 'Full-text search across all Knowledge Graph rows',
        useCase: 'Discover relevant entities when the exact listKey is unknown.',
    },
    {
        builtinType: 'kg_traverse',
        description: 'Traverse Knowledge Graph edges (FOLLOWED_BY, MATCH_SCORE, etc.)',
        useCase: 'Walk entity relationships — e.g. find all leads that MATCHED a campaign.',
    },
    {
        builtinType: 'kg_nodes',
        description: 'Fetch specific Knowledge Graph nodes by ID',
        useCase: 'Read entity details by ID after discovering them via kg_search or kg_traverse.',
    },
    {
        builtinType: 'kg_write',
        description: 'Write new entities or edges to the Knowledge Graph',
        useCase: 'Let the AI decide what to store at runtime (vs. deterministic knowledgeSync step).',
    },
    {
        builtinType: 'workspace_memory',
        description: 'Recall, search, and store persistent memories across executions',
        useCase: 'Accumulate insights, preferences, and outcomes across workflow runs. Supports recall/search/store sub-actions.',
    },
];

// ---------------------------------------------------------------------------
// Command
// ---------------------------------------------------------------------------

export function toolsBuiltinsCommand(json: boolean): void {
    if (json) {
        process.stdout.write(JSON.stringify(BUILTIN_TOOLS, null, 2) + '\n');
        return;
    }

    writeln('');
    info('Valid builtinType values for aiActionWithTools step tools[]:');
    writeln('');

    const typeW = Math.max(...BUILTIN_TOOLS.map((t) => t.builtinType.length));
    for (const tool of BUILTIN_TOOLS) {
        writeln(`  ${c.cyan}${tool.builtinType.padEnd(typeW)}${c.reset}  ${c.dim}${tool.description}${c.reset}`);
    }

    writeln('');
    writeln(`  ${c.bold}Usage example:${c.reset}`);
    writeln(`  ${c.gray}{ "type": "aiActionWithTools", "tools": [{ "builtinType": "web_search" }, { "builtinType": "workspace_memory" }], ... }${c.reset}`);
    writeln('');
    writeln(`  ${c.yellow}⚠${c.reset}  At least one tool is REQUIRED on aiActionWithTools steps — validation rejects steps with no tools.`);
    writeln(`  ${c.yellow}⚠${c.reset}  "web-search", "memory", "web_scrape" are NOT valid builtinType values (silently stripped at runtime).`);
    writeln('');
    writeln(`  ${c.dim}Run: agentled tools builtins --json   for machine-readable output${c.reset}`);
    writeln('');
}
