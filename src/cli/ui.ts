/**
 * Terminal UI rendering module for the Agentled CLI.
 *
 * Uses raw ANSI escape codes only — zero external dependencies.
 * All visible output goes through process.stdout.write (or process.stderr
 * for spinner animation) so callers have full control over newlines and
 * piping behaviour.
 */

// ---------------------------------------------------------------------------
// Color support detection (respects NO_COLOR and non-TTY pipes)
// ---------------------------------------------------------------------------

const supportsColor =
    !process.env.NO_COLOR &&
    (process.env.FORCE_COLOR === '1' || (process.stderr.isTTY ?? false));

function esc(code: string): string {
    return supportsColor ? code : '';
}

// ---------------------------------------------------------------------------
// ANSI escape-code palette
// ---------------------------------------------------------------------------

export const c = {
    reset: esc('\x1b[0m'),
    bold: esc('\x1b[1m'),
    dim: esc('\x1b[2m'),
    italic: esc('\x1b[3m'),
    underline: esc('\x1b[4m'),
    // Colors
    green: esc('\x1b[32m'),
    yellow: esc('\x1b[33m'),
    blue: esc('\x1b[34m'),
    magenta: esc('\x1b[35m'),
    cyan: esc('\x1b[36m'),
    white: esc('\x1b[37m'),
    gray: esc('\x1b[90m'),
    red: esc('\x1b[31m'),
    // Bright
    brightGreen: esc('\x1b[92m'),
    brightCyan: esc('\x1b[96m'),
    brightWhite: esc('\x1b[97m'),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const writeln = (text: string): void => {
    process.stdout.write(`${text}\n`);
};

// ---------------------------------------------------------------------------
// Message functions
// ---------------------------------------------------------------------------

/** Print a bold section header with vertical padding. */
export function header(text: string): void {
    writeln('');
    writeln(`${c.bold}${c.brightWhite}  ${text}${c.reset}`);
    writeln('');
}

/** Green check-mark prefixed message. */
export function success(text: string): void {
    writeln(`  ${c.green}\u2713${c.reset} ${text}`);
}

/** Blue diamond prefixed informational message. */
export function info(text: string): void {
    writeln(`  ${c.blue}\u2726${c.reset} ${text}`);
}

/** Yellow warning-sign prefixed message. */
export function warn(text: string): void {
    writeln(`  ${c.yellow}\u26A0${c.reset} ${text}`);
}

/** Red cross prefixed error message. */
export function error(text: string): void {
    writeln(`  ${c.red}\u2717${c.reset} ${text}`);
}

// ---------------------------------------------------------------------------
// Steps & sub-steps
// ---------------------------------------------------------------------------

/**
 * Print a workflow step heading.
 *
 * Example output: `  ━━ Workflow 1: Prospect Research`
 */
export function step(label: string, detail?: string): void {
    const suffix = detail ? ` ${c.gray}${detail}${c.reset}` : '';
    writeln(`  ${c.cyan}\u2501\u2501${c.reset} ${c.bold}${label}${c.reset}${suffix}`);
}

/**
 * Print an indented sub-step with a green check prefix.
 *
 * Example output: `     ✓ LinkedIn: CTO + fintech + EU → 189 profiles`
 */
export function substep(text: string): void {
    writeln(`     ${c.green}\u2713${c.reset} ${text}`);
}

// ---------------------------------------------------------------------------
// Spinner / progress indicator
// ---------------------------------------------------------------------------

export interface Spinner {
    /** Replace the spinner text while it keeps animating. */
    update(text: string): void;
    /** Stop the spinner and show a green check-mark line. */
    succeed(text: string): void;
    /** Stop the spinner and show a red cross line. */
    fail(text: string): void;
    /** Stop the spinner without printing a final line. */
    stop(): void;
}

const SPINNER_FRAMES = [
    '\u280B', '\u2819', '\u2839', '\u2838',
    '\u283C', '\u2834', '\u2826', '\u2827',
    '\u2807', '\u280F',
] as const;

const SPINNER_INTERVAL_MS = 80;

/**
 * Start an animated spinner on stderr (keeps stdout clean for piping).
 *
 * Returns a controller object to update, succeed, fail, or stop the spinner.
 */
export function progress(label: string): Spinner {
    let text = label;
    let frameIdx = 0;
    let stopped = false;

    const clearLine = (): void => {
        if (supportsColor) process.stderr.write('\x1b[2K\x1b[G');
    };

    const render = (): void => {
        const frame = SPINNER_FRAMES[frameIdx % SPINNER_FRAMES.length];
        clearLine();
        process.stderr.write(`  ${c.cyan}${frame}${c.reset} ${text}`);
        frameIdx++;
    };

    // Kick off the first frame immediately.
    render();
    const timer = setInterval(render, SPINNER_INTERVAL_MS);

    // Make sure the timer doesn't keep the process alive.
    if (timer.unref) {
        timer.unref();
    }

    const finish = (): void => {
        if (stopped) return;
        stopped = true;
        clearInterval(timer);
        clearLine();
    };

    return {
        update(newText: string): void {
            text = newText;
        },
        succeed(msg: string): void {
            finish();
            process.stderr.write(`  ${c.green}\u2713${c.reset} ${msg}\n`);
        },
        fail(msg: string): void {
            finish();
            process.stderr.write(`  ${c.red}\u2717${c.reset} ${msg}\n`);
        },
        stop(): void {
            finish();
        },
    };
}

// ---------------------------------------------------------------------------
// Layout helpers
// ---------------------------------------------------------------------------

/** Print a thin horizontal divider. */
export function divider(): void {
    writeln(`  ${c.gray}\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500${c.reset}`);
}

/** Print a key-value pair with the key in dim gray. */
export function keyValue(key: string, value: string): void {
    writeln(`  ${c.gray}${key}:${c.reset} ${value}`);
}

// ---------------------------------------------------------------------------
// Banner
// ---------------------------------------------------------------------------

/** Print the Agentled CLI startup banner. */
export function banner(): void {
    writeln('');
    writeln(`  ${c.cyan}\u256D\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256E${c.reset}`);
    writeln(`  ${c.cyan}\u2502${c.reset}     ${c.magenta}\u25C6${c.reset} ${c.bold}agentled CLI${c.reset}          ${c.cyan}\u2502${c.reset}`);
    writeln(`  ${c.cyan}\u2570\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u256F${c.reset}`);
    writeln('');
}

// ---------------------------------------------------------------------------
// Summary box
// ---------------------------------------------------------------------------

/**
 * Print a summary box listing key metrics.
 *
 * ```
 *   ┌──────────────────────────────────────┐
 *   │  Workflows   3                       │
 *   │  Profiles    189                     │
 *   └──────────────────────────────────────┘
 * ```
 */
export function summary(items: Array<{ label: string; value: string }>): void {
    if (items.length === 0) return;

    // Determine column widths for neat alignment.
    const labelWidth = Math.max(...items.map((i) => i.label.length));
    const valueWidth = Math.max(...items.map((i) => i.value.length));
    // Inner content: "  label   value  " — 2 padding each side + gap
    const innerWidth = Math.max(labelWidth + valueWidth + 6, 38);

    const hBar = '\u2500'.repeat(innerWidth);

    writeln('');
    writeln(`  ${c.gray}\u250C${hBar}\u2510${c.reset}`);

    for (const item of items) {
        const paddedLabel = item.label.padEnd(labelWidth);
        const paddedValue = item.value.padStart(valueWidth);
        const content = `  ${c.gray}${paddedLabel}${c.reset}   ${c.brightWhite}${paddedValue}${c.reset}`;
        // Calculate visible length (without ANSI codes) for right-padding.
        const visibleLen = paddedLabel.length + 3 + paddedValue.length + 2;
        const rightPad = ' '.repeat(Math.max(innerWidth - visibleLen, 0));
        writeln(`  ${c.gray}\u2502${c.reset}${content}${rightPad}  ${c.gray}\u2502${c.reset}`);
    }

    writeln(`  ${c.gray}\u2514${hBar}\u2518${c.reset}`);
    writeln('');
}
