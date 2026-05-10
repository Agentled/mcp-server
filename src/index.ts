#!/usr/bin/env node

/**
 * Agentled MCP Server — Entry point
 *
 * Connects via stdio transport for use with Claude Code.
 *
 * Environment variables:
 *   AGENTLED_API_KEY  — Workspace API key (wsk_*)
 *   AGENTLED_URL      — Base URL (default: https://www.agentled.app)
 *
 * Flags:
 *   --setup-skills          — Install Claude Code skills to .claude/skills/
 *   --setup-skills --global — Install to ~/.claude/skills/
 *
 * Note: the legacy `--setup` flag has been removed. Use
 * `npx @agentled/cli setup` instead.
 */

import { existsSync, mkdirSync, cpSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Route to bundled CLI when invoked as `npx @agentled/mcp-server create|help|version` (no separate `bin.agentled` — avoids EEXIST vs `@agentled/cli`). */
function shouldDelegateToBundledCli(args: string[]): boolean {
    if (args.includes('--setup-skills')) return false;
    const primary = args.find((a) => !a.startsWith('-'));
    if (primary === 'create' || primary === 'help' || primary === 'version') return true;
    if (args.includes('--help') || args.includes('-h')) return true;
    return false;
}

if (shouldDelegateToBundledCli(process.argv.slice(2))) {
    await import('./cli/index.js');
} else if (process.argv.includes('--setup-skills')) {
    // Install skills and exit
    const isGlobal = process.argv.includes('--global');
    const isCodex = process.argv.includes('--codex');
    const sourceDir = join(__dirname, '..', 'skills');
    const targetBase = isCodex
        ? join(homedir(), '.codex', 'instructions')
        : isGlobal
            ? join(homedir(), '.claude', 'skills')
            : join(process.cwd(), '.claude', 'skills');

    if (!existsSync(sourceDir)) {
        console.error('Skills directory not found. Package may be incomplete.');
        process.exit(1);
    }

    const skills = readdirSync(sourceDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);

    if (skills.length === 0) {
        console.log('No skills found to install.');
        process.exit(0);
    }

    for (const skill of skills) {
        const dest = join(targetBase, skill);
        mkdirSync(dest, { recursive: true });
        cpSync(join(sourceDir, skill), dest, { recursive: true });
        console.log(`  Installed skill: ${skill} → ${dest}`);
    }

    console.log(`\nDone! ${skills.length} skill(s) installed to ${targetBase}`);
    if (isCodex) {
        console.log('Tip: Codex will pick up these instructions automatically from ~/.codex/instructions/.');
    } else if (!isGlobal) {
        console.log('Tip: add .claude/skills/ to .gitignore if you don\'t want to commit these.');
    }
} else {
    // Start MCP server
    const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
    const { createServer } = await import('./server.js');

    const server = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
