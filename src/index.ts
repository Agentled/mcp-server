#!/usr/bin/env node

/**
 * Agentled MCP Server — Entry point
 *
 * Connects via stdio transport for use with Claude Code.
 *
 * Environment variables:
 *   AGENTLED_API_KEY  — Workspace API key (wsk_*)
 *   AGENTLED_URL      — Base URL (default: http://localhost:3000)
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';

async function main() {
    const server = createServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((error) => {
    console.error('Failed to start Agentled MCP server:', error);
    process.exit(1);
});
