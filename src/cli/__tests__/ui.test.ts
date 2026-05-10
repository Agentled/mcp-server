/**
 * Tests for the terminal UI module.
 *
 * Validates color detection, message formatting, summary box layout,
 * and spinner lifecycle.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// We need to test the UI module under NO_COLOR conditions.
// Since the module reads env at import time, we set NO_COLOR before importing.
// ---------------------------------------------------------------------------

// Force NO_COLOR so all esc() calls return empty strings — deterministic output.
process.env.NO_COLOR = '1';

const ui = await import('../ui.js');

// Helper: capture stdout writes
function captureStdout(fn: () => void): string {
    const original = process.stdout.write;
    let captured = '';
    process.stdout.write = ((chunk: any) => {
        captured += String(chunk);
        return true;
    }) as typeof process.stdout.write;
    try {
        fn();
    } finally {
        process.stdout.write = original;
    }
    return captured;
}

// Helper: capture stderr writes
function captureStderr(fn: () => void): string {
    const original = process.stderr.write;
    let captured = '';
    process.stderr.write = ((chunk: any) => {
        captured += String(chunk);
        return true;
    }) as typeof process.stderr.write;
    try {
        fn();
    } finally {
        process.stderr.write = original;
    }
    return captured;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ui module', () => {
    describe('color palette (c)', () => {
        it('returns empty strings when NO_COLOR is set', () => {
            assert.equal(ui.c.reset, '');
            assert.equal(ui.c.bold, '');
            assert.equal(ui.c.green, '');
            assert.equal(ui.c.red, '');
            assert.equal(ui.c.cyan, '');
        });
    });

    describe('writeln', () => {
        it('writes text with a trailing newline to stdout', () => {
            const output = captureStdout(() => ui.writeln('hello'));
            assert.equal(output, 'hello\n');
        });
    });

    describe('message functions', () => {
        it('header() outputs bold text with padding', () => {
            const output = captureStdout(() => ui.header('Section Title'));
            assert.ok(output.includes('Section Title'));
            // Should have blank lines for padding
            assert.ok(output.startsWith('\n'));
        });

        it('success() outputs with checkmark', () => {
            const output = captureStdout(() => ui.success('Done'));
            assert.ok(output.includes('\u2713')); // ✓
            assert.ok(output.includes('Done'));
        });

        it('info() outputs with diamond', () => {
            const output = captureStdout(() => ui.info('Note'));
            assert.ok(output.includes('\u2726')); // ✦
            assert.ok(output.includes('Note'));
        });

        it('warn() outputs with warning sign', () => {
            const output = captureStdout(() => ui.warn('Careful'));
            assert.ok(output.includes('\u26A0')); // ⚠
            assert.ok(output.includes('Careful'));
        });

        it('error() outputs with cross', () => {
            const output = captureStdout(() => ui.error('Failed'));
            assert.ok(output.includes('\u2717')); // ✗
            assert.ok(output.includes('Failed'));
        });
    });

    describe('step()', () => {
        it('renders step label with bar prefix', () => {
            const output = captureStdout(() => ui.step('Workflow 1: Research'));
            assert.ok(output.includes('\u2501\u2501')); // ━━
            assert.ok(output.includes('Workflow 1: Research'));
        });

        it('renders optional detail in gray', () => {
            const output = captureStdout(() => ui.step('Step', 'detail'));
            assert.ok(output.includes('Step'));
            assert.ok(output.includes('detail'));
        });
    });

    describe('substep()', () => {
        it('renders indented line with checkmark', () => {
            const output = captureStdout(() => ui.substep('Fetched 42 profiles'));
            assert.ok(output.includes('\u2713'));
            assert.ok(output.includes('Fetched 42 profiles'));
            // Should be indented (starts with spaces)
            assert.ok(output.trimStart() !== output);
        });
    });

    describe('divider()', () => {
        it('renders a horizontal line', () => {
            const output = captureStdout(() => ui.divider());
            // Should contain repeated ─ characters
            assert.ok(output.includes('\u2500\u2500\u2500'));
        });
    });

    describe('keyValue()', () => {
        it('renders key: value pair', () => {
            const output = captureStdout(() => ui.keyValue('Status', 'live'));
            assert.ok(output.includes('Status:'));
            assert.ok(output.includes('live'));
        });
    });

    describe('banner()', () => {
        it('renders the CLI banner box', () => {
            const output = captureStdout(() => ui.banner());
            assert.ok(output.includes('agentled CLI'));
            assert.ok(output.includes('\u25C6')); // ◆
            // Should have box drawing characters
            assert.ok(output.includes('\u256D')); // ╭
            assert.ok(output.includes('\u256F')); // ╯
        });
    });

    describe('summary()', () => {
        it('renders a summary box with items', () => {
            const output = captureStdout(() =>
                ui.summary([
                    { label: 'Workflows', value: '3' },
                    { label: 'Credits', value: '~120' },
                    { label: 'Status', value: 'draft' },
                ]),
            );
            assert.ok(output.includes('Workflows'));
            assert.ok(output.includes('3'));
            assert.ok(output.includes('Credits'));
            assert.ok(output.includes('~120'));
            assert.ok(output.includes('Status'));
            assert.ok(output.includes('draft'));
            // Box drawing characters
            assert.ok(output.includes('\u250C')); // ┌
            assert.ok(output.includes('\u2514')); // └
            assert.ok(output.includes('\u2502')); // │
        });

        it('does nothing for empty items', () => {
            const output = captureStdout(() => ui.summary([]));
            assert.equal(output, '');
        });

        it('handles single item', () => {
            const output = captureStdout(() =>
                ui.summary([{ label: 'Count', value: '1' }]),
            );
            assert.ok(output.includes('Count'));
            assert.ok(output.includes('1'));
        });

        it('aligns columns for varying label/value lengths', () => {
            const output = captureStdout(() =>
                ui.summary([
                    { label: 'A', value: '1' },
                    { label: 'Long Label', value: '99999' },
                ]),
            );
            // Both rows should have the box border on the right
            const lines = output.split('\n').filter((l) => l.includes('\u2502'));
            assert.equal(lines.length, 2, 'Should have 2 content rows');
        });
    });

    describe('progress() spinner', () => {
        it('returns a Spinner object with update/succeed/fail/stop', () => {
            const spinner = ui.progress('Loading...');
            assert.equal(typeof spinner.update, 'function');
            assert.equal(typeof spinner.succeed, 'function');
            assert.equal(typeof spinner.fail, 'function');
            assert.equal(typeof spinner.stop, 'function');
            spinner.stop(); // Clean up
        });

        it('succeed() prints a checkmark line to stderr', () => {
            const spinner = ui.progress('Working...');
            const output = captureStderr(() => spinner.succeed('All done'));
            assert.ok(output.includes('\u2713')); // ✓
            assert.ok(output.includes('All done'));
        });

        it('fail() prints a cross line to stderr', () => {
            const spinner = ui.progress('Trying...');
            const output = captureStderr(() => spinner.fail('Broke'));
            assert.ok(output.includes('\u2717')); // ✗
            assert.ok(output.includes('Broke'));
        });

        it('stop() can be called multiple times safely', () => {
            const spinner = ui.progress('test');
            spinner.stop();
            spinner.stop(); // Should not throw
            spinner.succeed('late'); // Should be a no-op after stop
        });
    });
});
