/**
 * Step-level CLI commands: move-step, add-step, remove-step, update-step
 *
 * These are thin wrappers around the external API — no AI planning involved.
 * Each command validates its arguments, calls the relevant client method,
 * and prints a concise result.
 */

import { AgentledClient } from '../client.js';
import { success, error, keyValue, writeln, c } from './ui.js';

// ---------------------------------------------------------------------------
// move-step
// ---------------------------------------------------------------------------

export interface MoveStepOptions {
    workflowId: string;
    stepId: string;
    insertAfter?: string;
    position?: 'first' | 'last';
}

export async function moveStepCommand(opts: MoveStepOptions): Promise<void> {
    const client = new AgentledClient();

    if (!opts.insertAfter && !opts.position) {
        error('move-step requires --after <stepId> or --position first|last');
        process.exitCode = 1;
        return;
    }
    if (opts.insertAfter && opts.position) {
        error('move-step accepts either --after or --position, not both');
        process.exitCode = 1;
        return;
    }

    try {
        const target = opts.position ? { position: opts.position } : { insertAfter: opts.insertAfter! };
        const result = await client.moveStep(opts.workflowId, opts.stepId, target);

        const label = opts.position
            ? `to ${c.bold}${opts.position}${c.reset} position`
            : `to after ${c.bold}${opts.insertAfter}${c.reset}`;
        success(`Moved step ${c.bold}${opts.stepId}${c.reset} ${label}`);
        keyValue('Workflow', result.name ?? opts.workflowId);
        if (result.editingDraft) {
            keyValue('Draft', 'Changes saved to draft snapshot (workflow is live)');
        }
        keyValue('Valid', result.validation?.valid ? 'yes' : `no — ${result.validation?.errorCount ?? 0} error(s)`);
        if (result.validation?.warnings?.length > 0) {
            for (const w of result.validation.warnings) {
                writeln(`  ${c.yellow}warn${c.reset} ${w.message}`);
            }
        }
        writeln('');
    } catch (err: any) {
        error(err.message ?? String(err));
        process.exitCode = 1;
    }
}

// ---------------------------------------------------------------------------
// add-step
// ---------------------------------------------------------------------------

export interface AddStepOptions {
    workflowId: string;
    stepJson: string;
    insertAfter?: string;
    rewireNext?: boolean;
}

export async function addStepCommand(opts: AddStepOptions): Promise<void> {
    const client = new AgentledClient();

    let step: Record<string, any>;
    try {
        step = JSON.parse(opts.stepJson);
    } catch {
        error('--step value must be valid JSON');
        process.exitCode = 1;
        return;
    }

    if (!step.id || !step.type) {
        error('Step JSON must include id and type fields');
        process.exitCode = 1;
        return;
    }

    try {
        const result = await client.addStep(opts.workflowId, step, opts.insertAfter, opts.rewireNext);

        success(`Added step ${c.bold}${step.id}${c.reset}`);
        keyValue('Workflow', result.name ?? opts.workflowId);
        if (result.editingDraft) {
            keyValue('Draft', 'Changes saved to draft snapshot (workflow is live)');
        }
        keyValue('Valid', result.validation?.valid ? 'yes' : `no — ${result.validation?.errorCount ?? 0} error(s)`);
        writeln('');
    } catch (err: any) {
        error(err.message ?? String(err));
        process.exitCode = 1;
    }
}

// ---------------------------------------------------------------------------
// remove-step
// ---------------------------------------------------------------------------

export interface RemoveStepOptions {
    workflowId: string;
    stepId: string;
    rewireNext?: boolean;
}

export async function removeStepCommand(opts: RemoveStepOptions): Promise<void> {
    const client = new AgentledClient();

    try {
        const result = await client.removeStep(opts.workflowId, opts.stepId, opts.rewireNext);

        success(`Removed step ${c.bold}${opts.stepId}${c.reset}`);
        keyValue('Workflow', result.name ?? opts.workflowId);
        if (result.editingDraft) {
            keyValue('Draft', 'Changes saved to draft snapshot (workflow is live)');
        }
        keyValue('Valid', result.validation?.valid ? 'yes' : `no — ${result.validation?.errorCount ?? 0} error(s)`);
        writeln('');
    } catch (err: any) {
        error(err.message ?? String(err));
        process.exitCode = 1;
    }
}

// ---------------------------------------------------------------------------
// update-step
// ---------------------------------------------------------------------------

export interface UpdateStepOptions {
    workflowId: string;
    stepId: string;
    updatesJson?: string;
    replace?: string[];
    unset?: string[];
}

export async function updateStepCommand(opts: UpdateStepOptions): Promise<void> {
    const client = new AgentledClient();

    let updates: Record<string, any> | undefined;
    if (opts.updatesJson !== undefined && opts.updatesJson !== '') {
        try {
            updates = JSON.parse(opts.updatesJson);
        } catch {
            error('--updates value must be valid JSON');
            process.exitCode = 1;
            return;
        }
    }

    const replace = opts.replace && opts.replace.length > 0 ? opts.replace : undefined;
    const unset = opts.unset && opts.unset.length > 0 ? opts.unset : undefined;

    if (!updates && !replace && !unset) {
        error('At least one of --updates, --replace, or --unset must be provided');
        process.exitCode = 1;
        return;
    }

    try {
        const result = await client.updateStep(opts.workflowId, opts.stepId, { updates, replace, unset });

        success(`Updated step ${c.bold}${opts.stepId}${c.reset}`);
        keyValue('Workflow', result.name ?? opts.workflowId);
        if (result.editingDraft) {
            keyValue('Draft', 'Changes saved to draft snapshot (workflow is live)');
        }
        if (result.diff) {
            const { addedPaths = [], changedPaths = [], removedPaths = [] } = result.diff;
            keyValue('Diff', `+${addedPaths.length} ~${changedPaths.length} -${removedPaths.length}`);
        }
        if (Array.isArray(result.warnings) && result.warnings.length > 0) {
            for (const w of result.warnings) {
                writeln(`  ${c.yellow}warn${c.reset} ${w}`);
            }
        }
        keyValue('Valid', result.validation?.valid ? 'yes' : `no — ${result.validation?.errorCount ?? 0} error(s)`);
        writeln('');
    } catch (err: any) {
        error(err.message ?? String(err));
        process.exitCode = 1;
    }
}

// ---------------------------------------------------------------------------
// get-step
// ---------------------------------------------------------------------------

export interface GetStepOptions {
    workflowId: string;
    stepId: string;
    source?: 'auto' | 'live' | 'draft';
}

export async function getStepCommand(opts: GetStepOptions): Promise<void> {
    const client = new AgentledClient();

    try {
        const result = await client.getStep(opts.workflowId, opts.stepId, opts.source ?? 'auto');
        // CLI prints the raw JSON response — easy to pipe into jq or copy into update_step.
        writeln(JSON.stringify(result, null, 2));
    } catch (err: any) {
        error(err.message ?? String(err));
        process.exitCode = 1;
    }
}
