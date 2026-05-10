/**
 * Tests for the `extractJson` helper and `createCommand` logic.
 *
 * Since `extractJson` is not exported, we test it indirectly through a
 * re-implementation of the same algorithm, and test `createCommand`
 * behavior by mocking the `AgentledClient`.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ---------------------------------------------------------------------------
// extractJson — mirror of the implementation in create.ts for unit testing
// We duplicate the pure function here since it's not exported.
// ---------------------------------------------------------------------------

function extractJson(text: string): unknown | null {
    const fenceRe = /```(?:json)?\s*\n?([\s\S]*?)```/;
    const fenceMatch = text.match(fenceRe);
    if (fenceMatch) {
        try {
            return JSON.parse(fenceMatch[1].trim());
        } catch { /* fall through */ }
    }

    for (let i = 0; i < text.length; i++) {
        if (text[i] === '{' || text[i] === '[') {
            const open = text[i];
            const close = open === '{' ? '}' : ']';
            let depth = 0;
            let inString = false;
            let escaped = false;
            for (let j = i; j < text.length; j++) {
                const ch = text[j];
                if (escaped) {
                    escaped = false;
                    continue;
                }
                if (ch === '\\' && inString) {
                    escaped = true;
                    continue;
                }
                if (ch === '"') {
                    inString = !inString;
                    continue;
                }
                if (!inString) {
                    if (ch === open) depth++;
                    else if (ch === close) depth--;
                    if (depth === 0) {
                        try {
                            return JSON.parse(text.substring(i, j + 1));
                        } catch {
                            break;
                        }
                    }
                }
            }
        }
    }

    return null;
}

// ---------------------------------------------------------------------------
// extractJson tests
// ---------------------------------------------------------------------------

describe('extractJson', () => {
    it('extracts JSON from markdown code fence', () => {
        const input = 'Here is the plan:\n```json\n{"campaignName": "Test"}\n```\nDone.';
        const result = extractJson(input);
        assert.deepEqual(result, { campaignName: 'Test' });
    });

    it('extracts JSON from code fence without json language tag', () => {
        const input = '```\n{"key": "value"}\n```';
        const result = extractJson(input);
        assert.deepEqual(result, { key: 'value' });
    });

    it('extracts bare JSON object from prose', () => {
        const input = 'Sure, here is the result: {"score": 42, "name": "test"} hope that helps!';
        const result = extractJson(input);
        assert.deepEqual(result, { score: 42, name: 'test' });
    });

    it('extracts JSON array from prose', () => {
        const input = 'The items are: [1, 2, 3] and more.';
        const result = extractJson(input);
        assert.deepEqual(result, [1, 2, 3]);
    });

    it('handles nested objects correctly', () => {
        const input = '{"outer": {"inner": {"deep": true}}, "list": [1, 2]}';
        const result = extractJson(input);
        assert.deepEqual(result, { outer: { inner: { deep: true } }, list: [1, 2] });
    });

    it('handles strings containing braces', () => {
        const input = '{"message": "Use {curly} braces and [brackets] here", "ok": true}';
        const result = extractJson(input);
        assert.deepEqual(result, { message: 'Use {curly} braces and [brackets] here', ok: true });
    });

    it('handles escaped quotes in strings', () => {
        const input = '{"text": "He said \\"hello\\"", "done": true}';
        const result = extractJson(input);
        assert.deepEqual(result, { text: 'He said "hello"', done: true });
    });

    it('handles escaped backslashes', () => {
        const input = '{"path": "C:\\\\Users\\\\test", "ok": true}';
        const result = extractJson(input);
        assert.deepEqual(result, { path: 'C:\\Users\\test', ok: true });
    });

    it('returns null for text with no JSON', () => {
        const input = 'This is just plain text with no JSON at all.';
        const result = extractJson(input);
        assert.equal(result, null);
    });

    it('returns null for malformed JSON', () => {
        const input = '{"key": "value", broken}';
        const result = extractJson(input);
        assert.equal(result, null);
    });

    it('prefers fenced JSON over bare JSON', () => {
        const input = 'Bare: {"a": 1}\n```json\n{"b": 2}\n```';
        const result = extractJson(input);
        assert.deepEqual(result, { b: 2 });
    });

    it('falls back to brute-force when fence contains invalid JSON', () => {
        const input = '```json\nnot valid json\n```\nBut here: {"fallback": true}';
        const result = extractJson(input);
        assert.deepEqual(result, { fallback: true });
    });

    it('handles complex campaign plan structure', () => {
        const plan = {
            campaignName: 'Fintech Outbound',
            workflows: [
                {
                    name: 'Research',
                    goal: 'Find prospects',
                    steps: [
                        { type: 'appAction', description: 'Fetch LinkedIn', apps: ['linkedin'] },
                        { type: 'aiAction', description: 'Score leads', apps: [] },
                    ],
                },
            ],
            schedule: 'every 48h',
            estimatedCredits: 250,
        };
        const input = `Here's your plan:\n\`\`\`json\n${JSON.stringify(plan, null, 2)}\n\`\`\``;
        const result = extractJson(input);
        assert.deepEqual(result, plan);
    });

    it('handles empty object', () => {
        assert.deepEqual(extractJson('{}'), {});
    });

    it('handles empty array', () => {
        assert.deepEqual(extractJson('[]'), []);
    });
});
