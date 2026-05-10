/**
 * `agentled best-practices` — print a one-page summary and agentic-ops repo URL.
 */

import { c, writeln, info, divider } from './ui.js';

export function bestPracticesCommand(): void {
    writeln('');
    writeln(`  ${c.magenta}◆${c.reset} ${c.bold}Agentled Best Practices${c.reset}`);
    writeln(`  ${c.dim}Quick reference for building reliable, credit-efficient workflows${c.reset}`);
    writeln('');
    divider();

    writeln('');
    writeln(`  ${c.bold}1. Always check native apps before building AI steps${c.reset}`);
    writeln(`  ${c.dim}Run: agentled apps for-source <platform>${c.reset}`);
    writeln(`  ${c.dim}A native appAction is ~1 credit. aiActionWithTools + web_search is 10–25.${c.reset}`);
    writeln('');

    writeln(`  ${c.bold}2. Build incrementally — one step at a time${c.reset}`);
    writeln(`  ${c.dim}create_workflow({ name, goal }) → add_step per step → validate_workflow${c.reset}`);
    writeln(`  ${c.dim}Bulk JSON authoring hides errors. Incremental catches them per-step.${c.reset}`);
    writeln('');

    writeln(`  ${c.bold}3. Never hardcode business content in prompts — use the KG${c.reset}`);
    writeln(`  ${c.dim}Investment thesis, ICP criteria, scoring rubrics → store in knowledge text.${c.reset}`);
    writeln(`  ${c.dim}Reference at runtime via {{steps.read-kg.content}} or workspace_memory.${c.reset}`);
    writeln('');

    writeln(`  ${c.bold}4. Use status fields + upsert-rows for multi-run dedup${c.reset}`);
    writeln(`  ${c.dim}kg.upsert-rows with userKey + status:"new". Processing reads status:"new",${c.reset}`);
    writeln(`  ${c.dim}advances to "processed". Each row is touched exactly once per phase.${c.reset}`);
    writeln('');

    writeln(`  ${c.bold}5. Email = composed aiAction, not provider send appAction${c.reset}`);
    writeln(`  ${c.dim}NEVER separate "draft" + "gmail send" appAction steps. The composed email${c.reset}`);
    writeln(`  ${c.dim}step uses pipelineStepPrompt.type:"email", approval, and schedule-email.${c.reset}`);
    writeln(`  ${c.dim}For report delivery: Config report → share URL → short HTML notification email.${c.reset}`);
    writeln(`  ${c.dim}Run: agentled schema --step-type aiAction --shape email${c.reset}`);
    writeln('');

    writeln(`  ${c.bold}6. Retry, don't restart — executions are resumable${c.reset}`);
    writeln(`  ${c.dim}retry_execution continues from the failed step. Restarting burns credits${c.reset}`);
    writeln(`  ${c.dim}re-running expensive upstream steps (LinkedIn, Crunchbase, AI).${c.reset}`);
    writeln('');

    writeln(`  ${c.bold}7. Validate before publishing${c.reset}`);
    writeln(`  ${c.dim}agentled workflows validate --file pipeline.json${c.reset}`);
    writeln(`  ${c.dim}Exit 0 = clean, 1 = warnings, 2 = blockers. Fix blockers before deploy.${c.reset}`);
    writeln('');

    writeln(`  ${c.bold}8. Default to schedule triggers for email intake${c.reset}`);
    writeln(`  ${c.dim}Polling + label dedup is idempotent, backfill-able, and debuggable.${c.reset}`);
    writeln(`  ${c.dim}App events only for sub-minute latency requirements.${c.reset}`);
    writeln(`  ${c.dim}Run: agentled workflows scaffold email-polling-dedup --out pipeline.json${c.reset}`);
    writeln('');

    writeln(`  ${c.bold}9. entryConditions use criteria (not conditions), variable (not field)${c.reset}`);
    writeln(`  ${c.dim}entryConditions: { criteria: [{ variable: "{{...}}", operator, value }] }${c.reset}`);
    writeln(`  ${c.dim}Using the wrong keys causes conditions to be silently ignored.${c.reset}`);
    writeln('');

    writeln(`  ${c.bold}10. Read-before-write for dictionary fields${c.reset}`);
    writeln(`  ${c.dim}Before editing stepInputData.fieldUpdates, pipelineStepPrompt.responseStructure,${c.reset}`);
    writeln(`  ${c.dim}or knowledgeSync.fieldMapping: call get_step first, modify locally,${c.reset}`);
    writeln(`  ${c.dim}send the full new object back via replace[].${c.reset}`);
    writeln('');

    divider();
    writeln('');
    writeln(`  ${c.bold}Pattern library:${c.reset}`);
    writeln(`  ${c.cyan}https://github.com/agentled/agentic-ops${c.reset}`);
    writeln('');
    writeln(`  ${c.bold}Explore locally:${c.reset}`);
    writeln(`  ${c.dim}agentled examples                          # list all patterns${c.reset}`);
    writeln(`  ${c.dim}agentled examples trigger-design            # print a pattern${c.reset}`);
    writeln(`  ${c.dim}agentled workflows scaffold --list          # list scaffolds${c.reset}`);
    writeln(`  ${c.dim}agentled schema --step-type aiAction        # step field reference${c.reset}`);
    writeln(`  ${c.dim}agentled tools builtins                     # valid builtinType values${c.reset}`);
    writeln('');
}
