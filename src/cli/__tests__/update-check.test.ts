/**
 * Tests for the dependency-free update notifier.
 *
 * Uses node:test so the suite stays on the same runner as the other CLI
 * tests. No external mocks — cache I/O is pointed at a tmp dir, the fetcher
 * is passed in as an option.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

// Force disabled=false for the check by pretending stderr is a TTY.
// The module reads env at call time, not import time, so we can flip these
// per-test.
process.env.NO_COLOR = '1';

const {
    cachePath,
    readCache,
    writeCache,
    isDisabled,
    semverCompare,
    checkForUpdate,
} = await import('../update-check.js');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let tmpDir: string;
let originalXdg: string | undefined;
let originalIsTty: boolean | undefined;

function makeTtyTrue(): void {
    originalIsTty = process.stderr.isTTY;
    Object.defineProperty(process.stderr, 'isTTY', { value: true, configurable: true });
}

function restoreTty(): void {
    Object.defineProperty(process.stderr, 'isTTY', { value: originalIsTty, configurable: true });
}

function clearDisableEnv(): void {
    delete process.env.AGENTLED_NO_UPDATE_CHECK;
    delete process.env.NO_UPDATE_NOTIFIER;
    delete process.env.CI;
    delete process.env.CONTINUOUS_INTEGRATION;
}

// ---------------------------------------------------------------------------
// semverCompare
// ---------------------------------------------------------------------------

describe('semverCompare', () => {
    it('returns 0 for equal versions', () => {
        assert.equal(semverCompare('1.2.3', '1.2.3'), 0);
    });

    it('returns positive when a > b on major', () => {
        assert.ok(semverCompare('2.0.0', '1.9.9') > 0);
    });

    it('returns positive when a > b on minor', () => {
        assert.ok(semverCompare('1.10.0', '1.9.9') > 0);
    });

    it('returns positive when a > b on patch', () => {
        assert.ok(semverCompare('0.13.1', '0.13.0') > 0);
    });

    it('returns negative when a < b', () => {
        assert.ok(semverCompare('0.12.5', '0.13.0') < 0);
    });

    it('strips pre-release tags before comparing', () => {
        // 0.13.0-beta.1 is treated as 0.13.0, so equal to 0.13.0.
        assert.equal(semverCompare('0.13.0-beta.1', '0.13.0'), 0);
    });

    it('treats non-numeric segments as 0', () => {
        // "1.x.0" → [1, 0, 0] — matches "1.0.0".
        assert.equal(semverCompare('1.x.0', '1.0.0'), 0);
    });

    it('handles shorter versions by padding with 0s', () => {
        assert.equal(semverCompare('1.0', '1.0.0'), 0);
    });
});

// ---------------------------------------------------------------------------
// isDisabled
// ---------------------------------------------------------------------------

describe('isDisabled', () => {
    beforeEach(() => {
        clearDisableEnv();
        makeTtyTrue();
    });

    afterEach(() => {
        clearDisableEnv();
        restoreTty();
    });

    it('returns false when TTY is true and no env vars set', () => {
        assert.equal(isDisabled(), false);
    });

    it('returns true when AGENTLED_NO_UPDATE_CHECK is set', () => {
        process.env.AGENTLED_NO_UPDATE_CHECK = '1';
        assert.equal(isDisabled(), true);
    });

    it('returns true when NO_UPDATE_NOTIFIER is set', () => {
        process.env.NO_UPDATE_NOTIFIER = '1';
        assert.equal(isDisabled(), true);
    });

    it('returns true when CI is set', () => {
        process.env.CI = 'true';
        assert.equal(isDisabled(), true);
    });

    it('returns true when stderr is not a TTY', () => {
        Object.defineProperty(process.stderr, 'isTTY', { value: false, configurable: true });
        assert.equal(isDisabled(), true);
    });
});

// ---------------------------------------------------------------------------
// Cache I/O
// ---------------------------------------------------------------------------

describe('readCache / writeCache', () => {
    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentled-upd-'));
        originalXdg = process.env.XDG_CONFIG_HOME;
        process.env.XDG_CONFIG_HOME = tmpDir;
    });

    afterEach(() => {
        if (originalXdg === undefined) delete process.env.XDG_CONFIG_HOME;
        else process.env.XDG_CONFIG_HOME = originalXdg;
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('returns null when no cache file exists', () => {
        assert.equal(readCache('@agentled/mcp-server'), null);
    });

    it('round-trips a valid entry', () => {
        const entry = { checked: 1_700_000_000_000, latest: '0.13.0' };
        writeCache('@agentled/mcp-server', entry);
        assert.deepEqual(readCache('@agentled/mcp-server'), entry);
    });

    it('flattens scoped package names into safe filenames', () => {
        const p = cachePath('@agentled/mcp-server');
        assert.ok(p.includes('_agentled_mcp-server'));
        assert.ok(!p.includes('@'));
        assert.ok(!p.endsWith('.json/'));
    });

    it('returns null when cache is malformed JSON', () => {
        const file = cachePath('@agentled/mcp-server');
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, 'not json');
        assert.equal(readCache('@agentled/mcp-server'), null);
    });

    it('returns null when cache is missing required fields', () => {
        writeCache('@agentled/mcp-server', { checked: 1, latest: '0.1.0' });
        const file = cachePath('@agentled/mcp-server');
        fs.writeFileSync(file, JSON.stringify({ checked: 'not-a-number' }));
        assert.equal(readCache('@agentled/mcp-server'), null);
    });
});

// ---------------------------------------------------------------------------
// checkForUpdate (end-to-end with mocked fetcher)
// ---------------------------------------------------------------------------

describe('checkForUpdate', () => {
    beforeEach(() => {
        tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentled-upd-'));
        originalXdg = process.env.XDG_CONFIG_HOME;
        process.env.XDG_CONFIG_HOME = tmpDir;
        clearDisableEnv();
        makeTtyTrue();
    });

    afterEach(() => {
        if (originalXdg === undefined) delete process.env.XDG_CONFIG_HOME;
        else process.env.XDG_CONFIG_HOME = originalXdg;
        clearDisableEnv();
        restoreTty();
        fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('returns null when disabled via env', async () => {
        process.env.AGENTLED_NO_UPDATE_CHECK = '1';
        const fetcher = async () => '99.0.0';
        const result = await checkForUpdate('@agentled/mcp-server', '0.13.0', { fetcher });
        assert.equal(result, null);
    });

    it('fetches on cache miss and returns newer version', async () => {
        const fetcher = async () => '0.14.0';
        const result = await checkForUpdate('@agentled/mcp-server', '0.13.0', { fetcher });
        assert.equal(result, '0.14.0');

        // Cache was written.
        const cached = readCache('@agentled/mcp-server');
        assert.equal(cached?.latest, '0.14.0');
    });

    it('returns null when current version is up to date', async () => {
        const fetcher = async () => '0.13.0';
        const result = await checkForUpdate('@agentled/mcp-server', '0.13.0', { fetcher });
        assert.equal(result, null);
    });

    it('trusts fresh cache without hitting the network', async () => {
        writeCache('@agentled/mcp-server', { checked: Date.now(), latest: '0.14.0' });

        let fetched = false;
        const fetcher = async () => {
            fetched = true;
            return '0.15.0';
        };
        const result = await checkForUpdate('@agentled/mcp-server', '0.13.0', { fetcher });
        assert.equal(result, '0.14.0');
        assert.equal(fetched, false);
    });

    it('re-fetches when cache is older than TTL', async () => {
        // Cache from 10 days ago — well past the 24h TTL.
        const tenDaysAgo = Date.now() - 10 * 24 * 60 * 60 * 1000;
        writeCache('@agentled/mcp-server', { checked: tenDaysAgo, latest: '0.14.0' });

        let fetched = false;
        const fetcher = async () => {
            fetched = true;
            return '0.15.0';
        };
        const result = await checkForUpdate('@agentled/mcp-server', '0.13.0', { fetcher });
        assert.equal(fetched, true);
        assert.equal(result, '0.15.0');
    });

    it('falls back to stale cache when fetch fails', async () => {
        const tenDaysAgo = Date.now() - 10 * 24 * 60 * 60 * 1000;
        writeCache('@agentled/mcp-server', { checked: tenDaysAgo, latest: '0.14.0' });

        const fetcher = async () => null;
        const result = await checkForUpdate('@agentled/mcp-server', '0.13.0', { fetcher });
        assert.equal(result, '0.14.0');
    });

    it('refreshes checked timestamp on stale-cache fallback to avoid per-invocation retries', async () => {
        const tenDaysAgo = Date.now() - 10 * 24 * 60 * 60 * 1000;
        writeCache('@agentled/mcp-server', { checked: tenDaysAgo, latest: '0.14.0' });

        const fetcher = async () => null;
        await checkForUpdate('@agentled/mcp-server', '0.13.0', { fetcher });

        // Cache checked timestamp should now be recent (within last 5s),
        // so the next invocation won't attempt another network fetch.
        const after = readCache('@agentled/mcp-server');
        assert.ok(after !== null);
        assert.equal(after?.latest, '0.14.0');
        assert.ok(Date.now() - after!.checked < 5_000);
    });

    it('returns null when fetch fails and there is no cache', async () => {
        const fetcher = async () => null;
        const result = await checkForUpdate('@agentled/mcp-server', '0.13.0', { fetcher });
        assert.equal(result, null);
    });

    it('writes a backoff cache entry when fetch fails with no prior cache', async () => {
        const fetcher = async () => null;
        await checkForUpdate('@agentled/mcp-server', '0.13.0', { fetcher });

        // A cache entry with checked=now and latest=currentVersion must be
        // written so the next invocation skips the network for a full TTL.
        const after = readCache('@agentled/mcp-server');
        assert.ok(after !== null);
        assert.equal(after?.latest, '0.13.0');
        assert.ok(Date.now() - after!.checked < 5_000);
    });
});
