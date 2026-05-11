/**
 * `agentled schema` — print step shape examples from step-shapes.ts
 *
 * schema --step-type <type> [--shape <shape>]   print matching step shape(s)
 * schema --context                              print valid input-page field types
 */

import { STEP_SHAPES, findStepShape, listShapesForStepType } from '../step-shapes.js';
import { c, writeln, info, warn } from './ui.js';

// ---------------------------------------------------------------------------
// Valid input-page context field types
// ---------------------------------------------------------------------------

export const CONTEXT_FIELD_TYPES = [
    { type: 'text', description: 'Single-line text input' },
    { type: 'textarea', description: 'Multi-line text input' },
    { type: 'number', description: 'Numeric input' },
    { type: 'boolean', description: 'Toggle / checkbox (true/false)' },
    { type: 'select', description: 'Dropdown — requires options[]' },
    { type: 'multiselect', description: 'Multi-select dropdown — requires options[]' },
    { type: 'url', description: 'URL text input (validated)' },
    { type: 'email', description: 'Email address input (validated)' },
    { type: 'date', description: 'Date picker' },
    { type: 'datetime', description: 'Date + time picker' },
    { type: 'json', description: 'Raw JSON editor' },
    { type: 'connected_emails_selector_single', description: 'Single-select from user\'s connected email accounts (default for outreachProfile.fromEmail)' },
    { type: 'connected_emails_selector_multiple', description: 'Multi-select from user\'s connected email accounts (use for outreachProfile.fromEmail only when sender rotation is requested)' },
    { type: 'workflow_selector', description: 'Workflow picker (returns workflowId)' },
    { type: 'knowledge_list_selector', description: 'Knowledge list picker (returns listKey)' },
];

// ---------------------------------------------------------------------------
// schema --context
// ---------------------------------------------------------------------------

export function schemaContextCommand(json: boolean): void {
    if (json) {
        process.stdout.write(JSON.stringify(CONTEXT_FIELD_TYPES, null, 2) + '\n');
        return;
    }

    writeln('');
    info('Valid input-page field types for context.inputPages / context.executionInputConfig.fields:');
    writeln('');

    const typeW = Math.max(...CONTEXT_FIELD_TYPES.map((f) => f.type.length));
    for (const field of CONTEXT_FIELD_TYPES) {
        writeln(`  ${c.cyan}${field.type.padEnd(typeW)}${c.reset}  ${c.dim}${field.description}${c.reset}`);
    }

    writeln('');
    writeln(`  ${c.bold}Usage example:${c.reset}`);
    writeln(`  ${c.gray}{ "name": "company_url", "label": "Company URL", "type": "url", "required": true }${c.reset}`);
    writeln('');
    writeln(`  ${c.dim}Note: "multi-select", "checkbox", "phone" are NOT valid — they are silently stripped at runtime.${c.reset}`);
    writeln('');
}

// ---------------------------------------------------------------------------
// schema --step-type <type> [--shape <shape>]
// ---------------------------------------------------------------------------

export function schemaStepTypeCommand(stepType: string, shape: string | undefined, json: boolean): void {
    if (!stepType) {
        writeln('');
        warn('--step-type is required');
        writeln('');
        writeln(`  ${c.bold}Available step types:${c.reset}`);
        const types = [...new Set(STEP_SHAPES.map((s) => s.stepType))];
        for (const t of types) {
            writeln(`    ${c.cyan}${t}${c.reset}`);
        }
        writeln('');
        writeln(`  ${c.bold}Example:${c.reset}`);
        writeln(`  ${c.dim}agentled schema --step-type aiAction${c.reset}`);
        writeln(`  ${c.dim}agentled schema --step-type aiActionWithTools --shape agentic-search${c.reset}`);
        writeln('');
        process.exit(1);
    }

    if (shape) {
        const found = findStepShape(stepType, shape);
        if (!found) {
            writeln('');
            warn(`No shape "${shape}" found for step type "${stepType}"`);
            writeln('');
            const available = listShapesForStepType(stepType);
            if (available.length > 0) {
                writeln(`  Available shapes for ${c.cyan}${stepType}${c.reset}:`);
                for (const s of available) {
                    writeln(`    ${c.cyan}${s.shape}${c.reset}  ${c.dim}${s.description}${c.reset}`);
                }
            } else {
                writeln(`  No shapes registered for step type "${stepType}".`);
                writeln(`  Known step types: ${[...new Set(STEP_SHAPES.map((s) => s.stepType))].join(', ')}`);
            }
            writeln('');
            process.exit(1);
        }

        if (json) {
            process.stdout.write(JSON.stringify(found, null, 2) + '\n');
            return;
        }

        printShape(found);
        return;
    }

    // No shape specified — list all shapes for the step type
    const shapes = listShapesForStepType(stepType);
    if (shapes.length === 0) {
        writeln('');
        warn(`No shapes registered for step type "${stepType}"`);
        writeln('');
        writeln(`  Known step types: ${[...new Set(STEP_SHAPES.map((s) => s.stepType))].join(', ')}`);
        writeln('');
        process.exit(1);
    }

    if (json) {
        process.stdout.write(JSON.stringify(shapes, null, 2) + '\n');
        return;
    }

    for (const s of shapes) {
        printShape(s);
    }
}

function printShape(shape: ReturnType<typeof findStepShape>): void {
    if (!shape) return;
    writeln('');
    writeln(`  ${c.magenta}◆${c.reset} ${c.bold}${shape.stepType}:${shape.shape}${c.reset}`);
    writeln(`  ${c.dim}${shape.description}${c.reset}`);
    writeln('');
    writeln(`  ${c.bold}Example:${c.reset}`);
    const json = JSON.stringify(shape.example, null, 4);
    for (const line of json.split('\n')) {
        writeln(`  ${c.gray}${line}${c.reset}`);
    }
    if (shape.notes && shape.notes.length > 0) {
        writeln('');
        writeln(`  ${c.bold}Notes:${c.reset}`);
        for (const note of shape.notes) {
            writeln(`  ${c.yellow}⚠${c.reset}  ${note}`);
        }
    }
    writeln('');
}
