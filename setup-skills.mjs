#!/usr/bin/env node

/**
 * Copies Agentled skills to the user's Claude Code skills directory.
 *
 * Usage:
 *   npx @agentled/mcp-server --setup-skills          # project-level (.claude/skills/)
 *   npx @agentled/mcp-server --setup-skills --global  # global (~/.claude/skills/)
 *
 * If the Agentled Claude Code plugin is installed it already bundles these
 * skills (namespaced agentled:*) — this script detects that and refuses to
 * double-register unless --force is passed.
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

// The Claude Code plugin (`/plugin install agentled@agentled`) bundles the same
// skills. Installing copies here too would register each skill twice (e.g.
// `agentled` and `agentled:agentled`) with potentially different versions.
const pluginInstallDir = join(homedir(), '.claude', 'plugins', 'cache', 'agentled', 'agentled');
if (existsSync(pluginInstallDir) && !process.argv.includes('--force')) {
    console.warn('⚠ The Agentled Claude Code plugin is already installed — it bundles these skills.');
    console.warn('  Installing them again via --setup-skills would register each skill twice.');
    console.warn('  Keep the plugin (recommended), or uninstall it first: /plugin uninstall agentled@agentled');
    console.warn('  To install copies anyway, rerun with --force.');
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
