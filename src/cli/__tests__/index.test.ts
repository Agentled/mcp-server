/**
 * Tests for the CLI entry point — argument parsing, command routing, and error handling.
 *
 * Uses Node's built-in test runner (node:test) to stay dependency-free.
 * Run via: npx tsx --test agentled-mcp-server/src/cli/__tests__/index.test.ts
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_PATH = path.resolve(__dirname, '../index.ts');

// ---------------------------------------------------------------------------
// Helper: run the CLI as a child process via tsx
// ---------------------------------------------------------------------------

interface CliResult {
    stdout: string;
    stderr: string;
    exitCode: number | null;
}

function runCli(args: string[], env?: Record<string, string>): Promise<CliResult> {
    return new Promise((resolve) => {
        const child: ChildProcess = spawn(
            'npx',
            ['tsx', CLI_PATH, ...args],
            {
                env: {
                    ...process.env,
                    NO_COLOR: '1', // Disable ANSI codes for clean assertions
                    ...env,
                },
                timeout: 10_000,
            },
        );

        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
        child.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

        child.on('close', (code) => {
            resolve({ stdout, stderr, exitCode: code });
        });

        child.on('error', () => {
            resolve({ stdout, stderr, exitCode: 1 });
        });
    });
}

// Strips ANSI escape sequences for clean matching.
function stripAnsi(str: string): string {
    return str.replace(/\x1b\[[0-9;]*m/g, '');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('agentled CLI', () => {
    describe('help command', () => {
        it('shows help when no command is given', async () => {
            const result = await runCli([]);
            assert.equal(result.exitCode, 0);
            const output = stripAnsi(result.stdout);
            assert.ok(output.includes('agentled CLI'), 'Should show CLI name');
            assert.ok(
                output.includes('npx @agentled/mcp-server create'),
                'Should show create command',
            );
            assert.ok(output.includes('AGENTLED_API_KEY'), 'Should mention API key env var');
        });

        it('shows help with "help" command', async () => {
            const result = await runCli(['help']);
            assert.equal(result.exitCode, 0);
            assert.ok(stripAnsi(result.stdout).includes('npx @agentled/mcp-server create'));
        });

        it('shows help with --help flag', async () => {
            const result = await runCli(['--help']);
            assert.equal(result.exitCode, 0);
            assert.ok(stripAnsi(result.stdout).includes('npx @agentled/mcp-server create'));
        });

        it('shows help with -h flag', async () => {
            const result = await runCli(['-h']);
            assert.equal(result.exitCode, 0);
            assert.ok(stripAnsi(result.stdout).includes('npx @agentled/mcp-server create'));
        });

        it('shows help when command + --help flag', async () => {
            const result = await runCli(['create', '--help']);
            assert.equal(result.exitCode, 0);
            assert.ok(stripAnsi(result.stdout).includes('agentled CLI'));
        });

        it('help output includes all documented options', async () => {
            const result = await runCli(['help']);
            const output = stripAnsi(result.stdout);
            assert.ok(output.includes('--publish'), 'Should list --publish');
            assert.ok(output.includes('--dry-run'), 'Should list --dry-run');
            assert.ok(output.includes('--schedule'), 'Should list --schedule');
            assert.ok(output.includes('--verbose'), 'Should list --verbose');
        });

        it('help output includes examples', async () => {
            const result = await runCli(['help']);
            const output = stripAnsi(result.stdout);
            assert.ok(output.includes('Outbound to fintech CTOs'), 'Should show example');
        });
    });

    describe('version command', () => {
        it('prints version string', async () => {
            const result = await runCli(['version']);
            assert.equal(result.exitCode, 0);
            const output = result.stdout.trim();
            // Should match "agentled X.Y.Z"
            assert.ok(/^agentled \d+\.\d+\.\d+/.test(output), `Expected "agentled X.Y.Z", got: "${output}"`);
        });
    });

    describe('unknown command', () => {
        it('exits with code 1 for unknown commands', async () => {
            const result = await runCli(['foobar']);
            assert.equal(result.exitCode, 1);
            const output = stripAnsi(result.stdout);
            assert.ok(output.includes('Unknown command: foobar'));
            assert.ok(output.includes('npx @agentled/mcp-server help'));
        });
    });

    describe('unknown option', () => {
        it('exits with code 1 for unknown flags', async () => {
            const result = await runCli(['create', '--unknown-flag', 'desc'], {
                AGENTLED_API_KEY: 'wsk_test_fake_key',
            });
            assert.equal(result.exitCode, 1);
            const output = stripAnsi(result.stdout);
            assert.ok(output.includes('Unknown option: --unknown-flag'));
        });
    });

    describe('create command — validation', () => {
        it('exits with code 1 when AGENTLED_API_KEY is missing', async () => {
            // Explicitly unset the key
            const result = await runCli(['create', 'test description'], {
                AGENTLED_API_KEY: '',
            });
            assert.equal(result.exitCode, 1);
            const output = stripAnsi(result.stdout);
            assert.ok(output.includes('Missing AGENTLED_API_KEY'), 'Should mention missing API key');
            assert.ok(output.includes('Workspace Settings'), 'Should tell user where to get key');
        });

        it('exits with code 1 when description is empty', async () => {
            const result = await runCli(['create'], {
                AGENTLED_API_KEY: 'wsk_test_fake_key',
            });
            assert.equal(result.exitCode, 1);
            const output = stripAnsi(result.stdout);
            assert.ok(output.includes('Missing workflow description'));
        });
    });

    describe('--schedule flag parsing', () => {
        it('rejects --schedule without a value', async () => {
            const result = await runCli(['create', '--schedule'], {
                AGENTLED_API_KEY: 'wsk_test_fake_key',
            });
            assert.equal(result.exitCode, 1);
            const combined = stripAnsi(result.stdout + result.stderr);
            assert.ok(combined.includes('--schedule requires a value'));
        });
    });
});
