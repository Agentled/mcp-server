/**
 * Dependency-free update notifier for the agentled CLI.
 *
 * Checks the npm registry for a newer version of the given package and
 * prints a one-line notice to stderr before the process exits. Design
 * constraints (matching the rest of the CLI):
 *   - Zero external dependencies (uses Node 18+ `fetch`).
 *   - Silent on failure — a missing network, registry hiccup, or malformed
 *     cache must never break the user's command.
 *   - Cached: one HTTP round-trip per 24h (cache miss adds ≤1.2s latency),
 *     cache hits are free.
 *   - Opt-out: honors `AGENTLED_NO_UPDATE_CHECK=1`, `NO_UPDATE_NOTIFIER=1`,
 *     and standard CI env vars. Also skips when stderr is not a TTY.
 *
 * Why awaited fetch instead of fire-and-forget: `process.exit()` in the CLI
 * terminates the event loop immediately, so an un-awaited fetch's response
 * handler never runs and the cache never gets written. Awaiting with a
 * hard timeout guarantees the first-run fetch isn't wasted.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { c } from './ui.js';

export const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
export const DEFAULT_TIMEOUT_MS = 1200;

export interface CacheEntry {
    /** Millisecond timestamp of the check. */
    checked: number;
    /** Latest version string fetched from the registry (e.g. "0.13.0"). */
    latest: string;
}

// ---------------------------------------------------------------------------
// Cache file I/O
// ---------------------------------------------------------------------------

export function cachePath(pkgName: string): string {
    const base = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
    // Flatten scoped names so the filename stays simple: @agentled/mcp-server → _agentled_mcp-server
    const safe = pkgName.replace(/[\/@]/g, '_');
    return path.join(base, 'agentled', `update-check-${safe}.json`);
}

export function readCache(pkgName: string): CacheEntry | null {
    try {
        const raw = fs.readFileSync(cachePath(pkgName), 'utf-8');
        const parsed = JSON.parse(raw) as Partial<CacheEntry>;
        if (typeof parsed.checked !== 'number' || typeof parsed.latest !== 'string') return null;
        return { checked: parsed.checked, latest: parsed.latest };
    } catch {
        return null;
    }
}

export function writeCache(pkgName: string, entry: CacheEntry): void {
    try {
        const file = cachePath(pkgName);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, JSON.stringify(entry));
    } catch {
        // Best-effort; update checks must never block the CLI on disk issues.
    }
}

// ---------------------------------------------------------------------------
// Disable logic
// ---------------------------------------------------------------------------

export function isDisabled(): boolean {
    return Boolean(
        process.env.AGENTLED_NO_UPDATE_CHECK ||
            process.env.NO_UPDATE_NOTIFIER ||
            process.env.CI ||
            process.env.CONTINUOUS_INTEGRATION ||
            !(process.stderr.isTTY ?? false)
    );
}

// ---------------------------------------------------------------------------
// Semver comparison (X.Y.Z only — pre-release tags are ignored)
// ---------------------------------------------------------------------------

/**
 * Compare two `X.Y.Z` semver strings. Returns:
 *   > 0 if `a` is newer than `b`
 *   < 0 if `a` is older than `b`
 *     0 if equal
 * Pre-release tags (e.g. `0.13.0-beta.1`) are stripped — we only notify on
 * stable releases. Non-numeric segments are treated as 0.
 */
export function semverCompare(a: string, b: string): number {
    const parse = (v: string): number[] =>
        v.split('-')[0]
            .split('.')
            .slice(0, 3)
            .map((n) => {
                const parsed = parseInt(n, 10);
                return Number.isFinite(parsed) ? parsed : 0;
            });
    const pa = parse(a);
    const pb = parse(b);
    for (let i = 0; i < 3; i++) {
        const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
        if (diff !== 0) return diff;
    }
    return 0;
}

// ---------------------------------------------------------------------------
// Registry fetch
// ---------------------------------------------------------------------------

/**
 * Fetch the `latest` dist-tag version for a package. Uses the compact
 * install-v1 JSON response for minimum payload. Returns null on any failure
 * (network, HTTP non-200, malformed JSON, timeout).
 */
export async function fetchLatestVersion(pkgName: string, timeoutMs: number): Promise<string | null> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
        const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(pkgName).replace('%40', '@')}/latest`, {
            headers: { Accept: 'application/vnd.npm.install-v1+json' },
            signal: ctrl.signal,
        });
        if (!res.ok) return null;
        const data = (await res.json()) as { version?: string };
        return typeof data.version === 'string' ? data.version : null;
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
    }
}

// ---------------------------------------------------------------------------
// Top-level check
// ---------------------------------------------------------------------------

export interface CheckOptions {
    /** Cache TTL in ms. Default: 24h. */
    ttlMs?: number;
    /** Fetch timeout in ms. Default: 1200. */
    timeoutMs?: number;
    /** Override the fetch function for tests. */
    fetcher?: (pkg: string, timeoutMs: number) => Promise<string | null>;
}

/**
 * Resolve whether a newer version is available for `pkgName` vs `currentVersion`.
 *
 * Cache-first: a fresh cache entry (<TTL) is trusted without hitting the
 * network. Stale or missing cache triggers a single fetch with a hard
 * timeout; the result is written back to cache. Returns the latest version
 * string when an update is available, else null.
 */
export async function checkForUpdate(
    pkgName: string,
    currentVersion: string,
    opts: CheckOptions = {}
): Promise<string | null> {
    if (isDisabled()) return null;

    const ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const fetcher = opts.fetcher ?? fetchLatestVersion;

    const cached = readCache(pkgName);
    const now = Date.now();
    const hasFreshCache = cached && now - cached.checked < ttlMs;

    let latest: string | null = null;

    if (hasFreshCache) {
        latest = cached!.latest;
    } else {
        latest = await fetcher(pkgName, timeoutMs);
        if (latest) {
            writeCache(pkgName, { checked: now, latest });
        } else if (cached) {
            // Fetch failed — fall back to stale cache rather than silently
            // suppressing a known update. Refresh `checked` so we don't
            // retry on every invocation in offline / registry-blocked
            // environments (back off for a full TTL).
            latest = cached.latest;
            writeCache(pkgName, { checked: now, latest: cached.latest });
        } else {
            // Fetch failed and no prior cache — record the attempt so the
            // next invocation backs off for a full TTL instead of paying the
            // timeout on every run. Store currentVersion so no false notice
            // is shown (we have no idea what's on npm).
            writeCache(pkgName, { checked: now, latest: currentVersion });
        }
    }

    if (latest && semverCompare(latest, currentVersion) > 0) {
        return latest;
    }
    return null;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/**
 * Render a single-line update notice for stderr. Matches the CLI's existing
 * UI palette (dim gray dividers, cyan for runnable commands).
 */
export function renderUpdateNotice(pkgName: string, current: string, latest: string): string {
    return [
        '',
        `  ${c.gray}───${c.reset} ${c.yellow}◆${c.reset} Update available: ${c.gray}${current}${c.reset} → ${c.cyan}${latest}${c.reset}`,
        `      Run ${c.cyan}npx ${pkgName}@latest${c.reset} to update.`,
        '',
    ].join('\n');
}

/**
 * Print the update notice to stderr (so it doesn't contaminate piped stdout).
 */
export function printUpdateNotice(pkgName: string, current: string, latest: string): void {
    process.stderr.write(renderUpdateNotice(pkgName, current, latest));
}
