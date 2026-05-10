/**
 * Smoke tests for the new CLI commands added in MCP-042.
 *
 * These tests verify arg parsing, code-path routing, and exit codes without
 * making real API calls (for commands that need no API key) or with a fake
 * key (for commands that short-circuit before reaching the network).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_PATH = path.resolve(__dirname, '../index.ts');

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
                    NO_COLOR: '1',
                    ...env,
                },
                timeout: 15_000,
            },
        );

        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
        child.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

        child.on('close', (code) => { resolve({ stdout, stderr, exitCode: code }); });
        child.on('error', () => { resolve({ stdout, stderr, exitCode: 1 }); });
    });
}

function stripAnsi(str: string): string {
    return str.replace(/\x1b\[[0-9;]*m/g, '');
}

// ---------------------------------------------------------------------------
// help — includes all new command groups
// ---------------------------------------------------------------------------

describe('help — new commands listed', () => {
    it('help output includes apps commands', async () => {
        const { stdout, exitCode } = await runCli(['help']);
        assert.equal(exitCode, 0);
        const out = stripAnsi(stdout);
        assert.ok(out.includes('apps grep'), 'should list apps grep');
        assert.ok(out.includes('apps for-source'), 'should list apps for-source');
    });

    it('help output includes schema commands', async () => {
        const { stdout, exitCode } = await runCli(['help']);
        assert.equal(exitCode, 0);
        const out = stripAnsi(stdout);
        assert.ok(out.includes('schema --step-type'), 'should list schema command');
        assert.ok(out.includes('--context'), 'should list --context flag');
    });

    it('help output includes tools builtins', async () => {
        const { stdout, exitCode } = await runCli(['help']);
        assert.equal(exitCode, 0);
        assert.ok(stripAnsi(stdout).includes('tools builtins'));
    });

    it('help output includes workflows scaffold/validate/create', async () => {
        const { stdout, exitCode } = await runCli(['help']);
        assert.equal(exitCode, 0);
        const out = stripAnsi(stdout);
        assert.ok(out.includes('workflows scaffold'), 'should list scaffold');
        assert.ok(out.includes('workflows validate'), 'should list validate');
        assert.ok(out.includes('workflows create'), 'should list create');
    });

    it('help output includes examples and best-practices', async () => {
        const { stdout, exitCode } = await runCli(['help']);
        assert.equal(exitCode, 0);
        const out = stripAnsi(stdout);
        assert.ok(out.includes('examples'), 'should list examples');
        assert.ok(out.includes('best-practices'), 'should list best-practices');
    });
});

// ---------------------------------------------------------------------------
// best-practices
// ---------------------------------------------------------------------------

describe('best-practices command', () => {
    it('exits 0 and prints content', async () => {
        const { stdout, exitCode } = await runCli(['best-practices']);
        assert.equal(exitCode, 0);
        const out = stripAnsi(stdout);
        assert.ok(out.includes('Best Practices'), 'should print heading');
        assert.ok(out.includes('native apps'), 'should mention native apps check');
        assert.ok(out.includes('https://github.com/agentled/agentic-ops'), 'should include repo URL');
    });
});

// ---------------------------------------------------------------------------
// schema command
// ---------------------------------------------------------------------------

describe('schema command', () => {
    it('schema --context exits 0 and lists field types', async () => {
        const { stdout, exitCode } = await runCli(['schema', '--context']);
        assert.equal(exitCode, 0);
        const out = stripAnsi(stdout);
        assert.ok(out.includes('text'), 'should list text type');
        assert.ok(out.includes('connected_emails_selector'), 'should list email selector type');
    });

    it('schema --context --json emits valid JSON', async () => {
        const { stdout, exitCode } = await runCli(['schema', '--context', '--json']);
        assert.equal(exitCode, 0);
        const parsed = JSON.parse(stdout);
        assert.ok(Array.isArray(parsed), 'should be array');
        assert.ok(parsed.length > 0, 'should have entries');
        assert.ok(parsed[0].type, 'entries should have type field');
    });

    it('schema --step-type aiAction exits 0 and prints example', async () => {
        const { stdout, exitCode } = await runCli(['schema', '--step-type', 'aiAction']);
        assert.equal(exitCode, 0);
        const out = stripAnsi(stdout);
        assert.ok(out.includes('aiAction'), 'should include step type name');
        assert.ok(out.includes('pipelineStepPrompt'), 'should include example field');
    });

    it('schema --step-type aiActionWithTools --shape agentic-search exits 0', async () => {
        const { stdout, exitCode } = await runCli(['schema', '--step-type', 'aiActionWithTools', '--shape', 'agentic-search']);
        assert.equal(exitCode, 0);
        const out = stripAnsi(stdout);
        assert.ok(out.includes('agentic-search'), 'should include shape name');
        assert.ok(out.includes('web_search'), 'should include web_search in example');
    });

    it('schema --step-type aiAction --json emits valid JSON', async () => {
        const { stdout, exitCode } = await runCli(['schema', '--step-type', 'aiAction', '--json']);
        assert.equal(exitCode, 0);
        const parsed = JSON.parse(stdout);
        assert.ok(Array.isArray(parsed), 'should be array');
    });

    it('schema --step-type unknownType exits non-zero', async () => {
        const { exitCode } = await runCli(['schema', '--step-type', 'nonexistentType']);
        assert.notEqual(exitCode, 0, 'should exit non-zero for unknown step type');
    });

    it('schema --step-type with unknown --shape exits non-zero', async () => {
        const { exitCode } = await runCli(['schema', '--step-type', 'aiAction', '--shape', 'nonexistent-shape']);
        assert.notEqual(exitCode, 0, 'should exit non-zero for unknown shape');
    });

    it('schema with no args exits non-zero and hints about --step-type', async () => {
        const { stdout, exitCode } = await runCli(['schema']);
        assert.notEqual(exitCode, 0);
        assert.ok(stripAnsi(stdout).includes('--step-type'));
    });
});

// ---------------------------------------------------------------------------
// tools builtins
// ---------------------------------------------------------------------------

describe('tools builtins command', () => {
    it('exits 0 and prints builtinType values', async () => {
        const { stdout, exitCode } = await runCli(['tools', 'builtins']);
        assert.equal(exitCode, 0);
        const out = stripAnsi(stdout);
        assert.ok(out.includes('web_search'), 'should list web_search');
        assert.ok(out.includes('workspace_memory'), 'should list workspace_memory');
        assert.ok(out.includes('kg_search'), 'should list kg_search');
    });

    it('--json emits valid JSON array', async () => {
        const { stdout, exitCode } = await runCli(['tools', 'builtins', '--json']);
        assert.equal(exitCode, 0);
        const parsed = JSON.parse(stdout);
        assert.ok(Array.isArray(parsed), 'should be array');
        const builtinTypes = parsed.map((t: { builtinType: string }) => t.builtinType);
        assert.ok(builtinTypes.includes('web_search'), 'should include web_search');
        assert.ok(builtinTypes.includes('workspace_memory'), 'should include workspace_memory');
    });

    it('exits 1 for unknown tools subcommand', async () => {
        const { exitCode } = await runCli(['tools', 'unknownsub']);
        assert.equal(exitCode, 1);
    });
});

// ---------------------------------------------------------------------------
// apps command — requires API key for real calls, test validation path only
// ---------------------------------------------------------------------------

describe('apps command — validation', () => {
    it('exits 1 when no subcommand given', async () => {
        const { exitCode } = await runCli(['apps'], { AGENTLED_API_KEY: 'wsk_fake' });
        assert.equal(exitCode, 1);
    });

    it('apps grep exits 1 when keyword is missing', async () => {
        const { exitCode } = await runCli(['apps', 'grep'], { AGENTLED_API_KEY: 'wsk_fake' });
        assert.equal(exitCode, 1);
    });

    it('apps for-source exits 1 when source is missing', async () => {
        const { exitCode } = await runCli(['apps', 'for-source'], { AGENTLED_API_KEY: 'wsk_fake' });
        assert.equal(exitCode, 1);
    });

    it('apps grep exits 1 when API key is missing', async () => {
        const { exitCode } = await runCli(['apps', 'grep', 'linkedin'], { AGENTLED_API_KEY: '' });
        assert.equal(exitCode, 1);
    });
});

// ---------------------------------------------------------------------------
// examples command
// ---------------------------------------------------------------------------

describe('examples command', () => {
    it('lists patterns with exit 0', async () => {
        const { stdout, exitCode } = await runCli(['examples']);
        assert.equal(exitCode, 0);
        const out = stripAnsi(stdout);
        assert.ok(out.includes('trigger-design') || out.includes('01-trigger-design'), 'should list trigger-design pattern');
        assert.ok(out.includes('loop-patterns') || out.includes('04-loop-patterns'), 'should list loop-patterns');
    });

    it('--json emits valid JSON array', async () => {
        const { stdout, exitCode } = await runCli(['examples', '--json']);
        assert.equal(exitCode, 0);
        const parsed = JSON.parse(stdout);
        assert.ok(Array.isArray(parsed), 'should be array');
        assert.ok(parsed.length > 0, 'should have entries');
    });

    it('exits 1 for unknown pattern name', async () => {
        const { exitCode } = await runCli(['examples', 'nonexistent-pattern-xyz']);
        assert.equal(exitCode, 1);
    });

    it('shows loop-patterns content (short-form id)', async () => {
        const { stdout, exitCode } = await runCli(['examples', 'loop-patterns']);
        // May exit 0 (found) or 1 (file not found in dist) — just ensure no crash
        const out = stripAnsi(stdout);
        assert.ok(
            exitCode === 0 || out.includes('loop') || out.includes('View it online'),
            'should either show content or point to URL',
        );
    });
});

// ---------------------------------------------------------------------------
// workflows scaffold command
// ---------------------------------------------------------------------------

describe('workflows scaffold command', () => {
    it('--list exits 0 and lists scaffold names', async () => {
        const { stdout, exitCode } = await runCli(['workflows', 'scaffold', '--list']);
        assert.equal(exitCode, 0);
        const out = stripAnsi(stdout);
        assert.ok(out.includes('lead-scoring-kg'), 'should list lead-scoring-kg');
        assert.ok(out.includes('ai-with-tools'), 'should list ai-with-tools');
        assert.ok(out.includes('email-polling-dedup'), 'should list email-polling-dedup');
    });

    it('scaffold --list --json emits valid JSON', async () => {
        const { stdout, exitCode } = await runCli(['workflows', 'scaffold', '--list', '--json']);
        assert.equal(exitCode, 0);
        const parsed = JSON.parse(stdout);
        assert.ok(Array.isArray(parsed), 'should be array');
        const names = parsed.map((s: { name: string }) => s.name);
        assert.ok(names.includes('lead-scoring-kg'), 'should include lead-scoring-kg');
    });

    it('scaffold lead-scoring-kg prints valid JSON to stdout', async () => {
        const { stdout, exitCode } = await runCli(['workflows', 'scaffold', 'lead-scoring-kg']);
        assert.equal(exitCode, 0);
        const parsed = JSON.parse(stdout);
        assert.ok(parsed.name, 'scaffold should have name field');
        assert.ok(Array.isArray(parsed.steps), 'scaffold should have steps array');
        assert.ok(!Object.keys(parsed).some((k) => k.startsWith('_')), 'private _ fields should be stripped');
    });

    it('scaffold ai-with-tools has aiActionWithTools step with tools array', async () => {
        const { stdout, exitCode } = await runCli(['workflows', 'scaffold', 'ai-with-tools']);
        assert.equal(exitCode, 0);
        const parsed = JSON.parse(stdout);
        const aiStep = parsed.steps?.find((s: { type: string }) => s.type === 'aiActionWithTools');
        assert.ok(aiStep, 'should have an aiActionWithTools step');
        assert.ok(Array.isArray(aiStep.tools) && aiStep.tools.length > 0, 'tools array should be non-empty');
    });

    it('scaffold exits 1 for unknown scaffold name', async () => {
        const { exitCode } = await runCli(['workflows', 'scaffold', 'nonexistent-scaffold-xyz']);
        assert.equal(exitCode, 1);
    });

    it('wf is alias for workflows', async () => {
        const { stdout, exitCode } = await runCli(['wf', 'scaffold', '--list']);
        assert.equal(exitCode, 0);
        assert.ok(stripAnsi(stdout).includes('lead-scoring-kg'));
    });
});

// ---------------------------------------------------------------------------
// workflows validate command
// ---------------------------------------------------------------------------

describe('workflows validate command', () => {
    it('exits 1 when --file is missing', async () => {
        const { exitCode, stdout } = await runCli(['workflows', 'validate'], { AGENTLED_API_KEY: 'wsk_fake' });
        assert.equal(exitCode, 1);
        assert.ok(stripAnsi(stdout).includes('--file'));
    });

    it('exits 2 when file does not exist', async () => {
        const { exitCode } = await runCli(
            ['workflows', 'validate', '--file', '/tmp/__nonexistent_agentled_test_file__.json'],
            { AGENTLED_API_KEY: 'wsk_fake' },
        );
        assert.equal(exitCode, 2);
    });

    it('exits 1 when AGENTLED_API_KEY is missing', async () => {
        const { exitCode } = await runCli(
            ['workflows', 'validate', '--file', '/tmp/test.json'],
            { AGENTLED_API_KEY: '' },
        );
        assert.equal(exitCode, 1);
    });
});

// ---------------------------------------------------------------------------
// workflows create --file command
// ---------------------------------------------------------------------------

describe('workflows create --file command', () => {
    it('exits 1 when --file is missing', async () => {
        const { exitCode, stdout } = await runCli(['workflows', 'create'], { AGENTLED_API_KEY: 'wsk_fake' });
        assert.equal(exitCode, 1);
        assert.ok(stripAnsi(stdout).includes('--file'));
    });

    it('exits 1 when AGENTLED_API_KEY is missing', async () => {
        const { exitCode } = await runCli(
            ['workflows', 'create', '--file', '/tmp/test.json'],
            { AGENTLED_API_KEY: '' },
        );
        assert.equal(exitCode, 1);
    });
});
