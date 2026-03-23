#!/usr/bin/env node

/**
 * Copies Agentled skills to the user's Claude Code skills directory.
 *
 * Usage:
 *   npx @agentled/mcp-server --setup-skills          # project-level (.claude/skills/)
 *   npx @agentled/mcp-server --setup-skills --global  # global (~/.claude/skills/)
 */

import { existsSync, mkdirSync, cpSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));

const isGlobal = process.argv.includes('--global');

const sourceDir = join(__dirname, 'skills');
const targetBase = isGlobal
    ? join(homedir(), '.claude', 'skills')
    : join(process.cwd(), '.claude', 'skills');

if (!existsSync(sourceDir)) {
    console.error('Skills directory not found at', sourceDir);
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
    const src = join(sourceDir, skill);
    const dest = join(targetBase, skill);
    mkdirSync(dest, { recursive: true });
    cpSync(src, dest, { recursive: true });
    console.log(`  Installed skill: ${skill} → ${dest}`);
}

console.log(`\nDone! ${skills.length} skill(s) installed to ${targetBase}`);
if (!isGlobal) {
    console.log('Tip: add .claude/skills/ to .gitignore if you don\'t want to commit these.');
}
