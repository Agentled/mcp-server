/**
 * Minimal JSON shape examples for the handful of step shapes that are common
 * enough to warrant an in-tool reference but too specific to belong in the
 * create_workflow tool description (which would bloat past 6KB).
 *
 * Agents reach these via `get_step_schema({ stepType, shape? })`. The shapes
 * are pure JS objects (not template strings) so they can be:
 *   - serialized into the tool response as valid JSON,
 *   - asserted against in tests for field correctness,
 *   - mirrored into the CLI package without drift.
 *
 * Keep each shape MINIMAL — only the fields an agent can't guess from
 * `get_step_schema`'s field list. If a field value is a placeholder, make
 * that obvious (e.g. "{{input.recipientEmail}}", "your-prompt-here").
 */

export type StepShapeKey =
    // aiAction shapes
    | 'aiAction:standard'
    | 'aiAction:report'
    | 'aiAction:email'
    // aiActionWithTools shapes
    | 'aiActionWithTools:standard'
    | 'aiActionWithTools:agentic-search'
    // appAction shapes
    | 'appAction:source-from-platform'
    | 'appAction:kg-read-text'
    | 'appAction:kg-read-list-by-status'
    | 'appAction:kg-upsert-rows-sourcing'
    | 'appAction:kg-update-rows-status-advance'
    | 'appAction:kg-traverse-edges'
    // agentOrchestrator shapes
    | 'agentOrchestrator:supervisor'
    // code step
    | 'code:standard'
    // share step
    | 'share:public'
    // knowledgeSync
    | 'knowledgeSync:standard'
    // workflow-level page schemas (NOT pipeline steps — they live under
    // workflow.context.outputPages / .inputPages, edited via update_workflow_context)
    | 'outputPage:standard'
    | 'inputPage:standard';

export interface StepShape {
    key: StepShapeKey;
    stepType: string;
    shape: string;
    description: string;
    example: Record<string, unknown>;
    notes?: string[];
}

const AI_ACTION_STANDARD: StepShape = {
    key: 'aiAction:standard',
    stepType: 'aiAction',
    shape: 'standard',
    description: 'LLM prompt → structured JSON output. The most common aiAction shape.',
    example: {
        id: 'analyze',
        type: 'aiAction',
        name: 'Analyze',
        pipelineStepPrompt: {
            template: 'Analyze {{steps.previous.output}} and return structured findings.',
            responseStructure: {
                summary: 'string',
                score: 'number (0-100)',
            },
        },
        creditCost: 10,
        next: { stepId: 'next-step' },
    },
};

const AI_ACTION_REPORT: StepShape = {
    key: 'aiAction:report',
    stepType: 'aiAction',
    shape: 'report',
    description:
        'aiAction that produces a report/summary. MUST include a Config renderer so the output renders as a rich visual card instead of raw JSON.',
    example: {
        id: 'generate-report',
        type: 'aiAction',
        name: 'Generate Report',
        pipelineStepPrompt: {
            template: 'Analyze the data and produce a structured report...',
            responseStructure: {
                summary: 'string',
                kpis: 'object',
                items: 'array',
            },
        },
        renderer: {
            type: 'Config',
            config: {
                layout: {
                    title: 'Report',
                    blocks: [
                        { blockType: 'kpiRow', kpis: [{ label: 'Total', valuePath: 'kpis.total' }] },
                        { blockType: 'markdown', contentPath: 'summary' },
                        {
                            blockType: 'table',
                            arrayPath: 'items',
                            columns: [{ header: 'Name', field: 'name' }],
                        },
                    ],
                },
            },
        },
        creditCost: 10,
        next: { stepId: 'share-report' },
    },
    notes: [
        'Use `kpiRow`, `markdown`, `table`, `signalList` block types for common layouts.',
        'Pair with a `share` step downstream for a public URL (get_step_schema({ stepType: "share" })).',
        'For "gather/show information and email it" requests, use: report aiAction with Config renderer → share step → aiAction:email notification. The email should summarize and link to the report URL instead of embedding the full report.',
    ],
};

const AI_ACTION_EMAIL: StepShape = {
    key: 'aiAction:email',
    stepType: 'aiAction',
    shape: 'email',
    description:
        'Composed email with approval gate. The ONLY correct pattern for sending email — never use separate "draft" + "gmail send" steps. Requires an `outreachProfile` input page on context.inputPages.',
    example: {
        id: 'send-email',
        type: 'aiAction',
        name: 'Send Email',
        pipelineStepPrompt: {
            type: 'email',
            template:
                'Compose a professional email to {{input.recipientEmail}}. Reference {{steps.enrich.output}}.',
            responseStructure: {
                email: {
                    from: '{{context.outreachProfile.fromEmail}}',
                    to: '{{input.recipientEmail}}',
                    subject: '',
                    body: '',
                    bodyType: 'html',
                },
            },
        },
        renderer: {
            type: 'Email',
            config: { fromContextKey: 'outreachProfile' },
        },
        integrations: [
            {
                type: 'oneOf',
                label: 'Email',
                connectorType: 'email',
                options: [
                    { name: 'Gmail', url: 'https://gmail.com', isUserAccountConnectionRequired: true },
                    { name: 'Outlook', url: 'https://outlook.com', isUserAccountConnectionRequired: true },
                ],
                selectionHint: 'preferConnected',
            },
        ],
        onApproval: {
            executedText: 'Email sent by {{name}} at {{date}}',
            failedText: 'Email failed to send.',
            action: 'schedule-email',
        },
        creditCost: 5,
        next: { stepId: 'milestone', conditions: { approvalRequired: true } },
    },
    notes: [
        '`pipelineStepPrompt.type: "email"` is recommended for composed email steps, but the actual send trigger is `onApproval.action: "schedule-email"`.',
        'Always set `onApproval.action: "schedule-email"` for platform-sent approval emails — this is what triggers actual sending.',
        'Always set `next.conditions.approvalRequired: true` — blocks the workflow until the user reviews.',
        'For outreach from a user-selected connected mailbox, add an `outreachProfile` input page to context.inputPages with fields: name, fromEmailLabel, fromEmail (type: connected_emails_selector_multiple), replyToEmail, trackOpens, trackClicks.',
        'Open/click tracking only works for HTML email bodies (`bodyType: "html"`). Plain text emails cannot be tracked.',
        'For report notifications from the workspace assistant, no Gmail appAction is needed: compose a concise HTML notification and include `{{steps.<shareStepId>.shareUrl}}`.',
        'Email body must be email-safe HTML (<p>, <br>, <a>, <strong> — no CSS, no scripts).',
        'Never add Gmail/Outlook/Composio send appAction steps unless the user explicitly asks to send through that provider account.',
    ],
};

const AI_ACTION_WITH_TOOLS_STANDARD: StepShape = {
    key: 'aiActionWithTools:standard',
    stepType: 'aiActionWithTools',
    shape: 'standard',
    description: 'LLM agent with runtime tools (web_search, workspace_memory, app actions).',
    example: {
        id: 'research',
        type: 'aiActionWithTools',
        name: 'Research',
        tools: [{ builtinType: 'web_search' }, { builtinType: 'workspace_memory' }],
        pipelineStepPrompt: {
            template: 'Research {{input.topic}}. Use web_search and recall prior memories.',
            responseStructure: { findings: 'string' },
        },
        creditCost: 10,
        next: { stepId: 'next-step' },
    },
    notes: [
        'Call `get_step_schema({ stepType: "aiActionWithTools" })` then `agentled tools builtins` for the closed list of valid `builtinType` values.',
        'At least one tool is REQUIRED — place it under `step.tools` OR `step.agent.tools` (the runtime merges both). Validation rejects aiActionWithTools steps with no tools in either location (code: AI_STEP_TOOLS_REQUIRED). If the step does not need tool calls, use `aiAction` instead.',
        'If the prompt asks the AI to "search the web", "recall memory", or "query the knowledge graph", attach the matching builtin (`web_search`, `workspace_memory`, `kg_*`) — otherwise validation emits an `AI_STEP_TOOL_PROMPT_MISMATCH` warning.',
        '⚠️ DO NOT default to this shape for "find / fetch / discover / source from <platform>" steps. Run `list_apps` first — if the source has a native app (LinkedIn, Affinity, Crunchbase, Specter, Hunter, Gmail, KG, etc.), use `appAction` instead. A native action is deterministic, ~1 credit, and has typed outputs; web_search costs 10–25 credits with run-to-run variance. Validation emits `AI_STEP_PREFER_NATIVE_ACTION` when this rule is broken. Use aiActionWithTools for sourcing only when (a) no native app covers the source, (b) the source is a generic content site, or (c) you genuinely need cross-source aggregation.',
    ],
};

const AI_ACTION_WITH_TOOLS_AGENTIC_SEARCH: StepShape = {
    key: 'aiActionWithTools:agentic-search',
    stepType: 'aiActionWithTools',
    shape: 'agentic-search',
    description:
        'Agentic web research pattern — web_search + workspace_memory so the agent can discover AND remember. Matches the `ai-with-tools` scaffold. Use for open-ended research where no native app covers the source.',
    example: {
        id: 'agentic-research',
        type: 'aiActionWithTools',
        name: 'Agentic Research',
        tools: [{ builtinType: 'web_search' }, { builtinType: 'workspace_memory' }],
        pipelineStepPrompt: {
            template:
                'Research {{input.topic}}. First recall any prior memories about it, then web_search for updates, then store new facts. Return a concise synthesis.',
            responseStructure: {
                synthesis: 'string',
                newFacts: 'array of strings',
            },
        },
        creditCost: 15,
        next: { stepId: 'next-step' },
    },
    notes: [
        '⚠️ Before using this for sourcing from a named platform, run `list_apps({ grep: "<platform>" })`. If a native app exists, prefer `appAction` — deterministic, ~1 credit, typed outputs. If a known URL exists for the source, prefer `web-scraping.scrape` upstream → `aiAction`. This shape is the right default ONLY when (a) no native app covers the source, (b) you do not have a specific URL/feed to scrape, or (c) cross-source aggregation in one step is genuinely required.',
        'Document the reason in the step `description` so the next maintainer does not repeat the discovery work — e.g. "No native <platform> app and no canonical URL — using web_search."',
    ],
};

const AGENT_ORCHESTRATOR_SUPERVISOR: StepShape = {
    key: 'agentOrchestrator:supervisor',
    stepType: 'agentOrchestrator',
    shape: 'supervisor',
    description: 'Agent Team with a supervisor coordinating multiple workers.',
    example: {
        id: 'analyze',
        type: 'agentOrchestrator',
        name: 'Agent Team',
        orchestratorConfig: {
            pattern: 'supervisor',
            workers: [
                {
                    id: 'researcher',
                    name: 'Researcher',
                    systemPrompt: 'Find and summarize key information about {{input.topic}}',
                },
                {
                    id: 'analyst',
                    name: 'Analyst',
                    systemPrompt: 'Analyze the research and identify key insights and risks',
                },
            ],
        },
        metadata: {
            agentTeamPreset: 'research-and-summarize',
            agentTeamMode: 'simple',
            agentTeamUxVersion: 1,
        },
        next: { stepId: 'milestone' },
    },
    notes: [
        'Available presets: research-and-summarize, analyze-and-recommend, generate-then-review, compare-options, investigate-in-parallel, review-and-improve.',
        'Set `metadata.agentTeamMode` to `"simple"` for preset-backed steps or `"advanced"` for custom configurations.',
        'Omit the metadata fields to create a raw orchestratorConfig step that opens in advanced mode.',
    ],
};

const CODE_STANDARD: StepShape = {
    key: 'code:standard',
    stepType: 'code',
    shape: 'standard',
    description:
        'Deterministic JavaScript script for data transformation, filtering, or computation. Use when logic is rule-based and does NOT need an LLM. Python is NOT supported — JavaScript only.',
    example: {
        id: 'transform',
        type: 'code',
        name: 'Transform Data',
        codeConfig: {
            language: 'javascript',
            code: 'const items = {{steps.previous.items}};\nreturn items.map(item => ({ name: item.fullName, score: item.score }));',
            responseStructure: { items: 'array of transformed objects' },
        },
        next: { stepId: 'next-step' },
    },
    notes: [
        'Only `language: "javascript"` is supported. Python will fail at runtime with CODE_STEP_UNSUPPORTED_LANGUAGE.',
        'Use `return` to output data — the returned value becomes the step output.',
        'Declare `codeConfig.responseStructure` when downstream steps reference this step\'s output (loops, template variables). Flat map: `{ fieldName: "type description" }`.',
        'Template variables ({{steps.X.field}}, {{input.field}}) are resolved before execution.',
        'For AI-powered transformation or summarization, use `aiAction` instead.',
    ],
};

const SHARE_PUBLIC: StepShape = {
    key: 'share:public',
    stepType: 'share',
    shape: 'public',
    description: 'Create a public share URL for prior step output. Pair with an aiAction:report upstream.',
    example: {
        id: 'share-report',
        type: 'share',
        name: 'Create Public Link',
        shareConfig: {
            outputSteps: ['generate-report'],
            expiresInDays: 30,
            visibility: 'public',
        },
        next: { stepId: 'next-step' },
    },
    notes: [
        'Outputs: `{ shareId, shareUrl, expiresAt }`. Reference `{{steps.share-report.shareUrl}}` in downstream steps.',
    ],
};

const KNOWLEDGE_SYNC_STANDARD: StepShape = {
    key: 'knowledgeSync:standard',
    stepType: 'knowledgeSync',
    shape: 'standard',
    description:
        'Deterministic KG write — map step output fields into a knowledge list. Use after a loop-evaluate pattern.',
    example: {
        id: 'save-to-kg',
        type: 'knowledgeSync',
        name: 'Save to Knowledge Graph',
        knowledgeSync: {
            source: { stepId: 'evaluate', resultsPath: 'items' },
            listKey: 'scored-leads',
            fieldMapping: {
                name: 'name',
                score: 'score',
                decision: 'decision',
            },
            mergeStrategy: 'merge',
        },
        next: { stepId: 'next-step' },
    },
    notes: [
        '`listKey` is auto-created if it doesn\'t exist. Keys map source field → target field on the KG row.',
        '`mergeStrategy` (default `"merge"`) controls how an incoming row combines with an existing one when the list has a configured `userKeyField` (or rows carry an explicit `userKey`). `"merge"` shallow-merges incoming fields onto existing rowData (downstream-added fields like scores survive). `"overwrite"` replaces rowData wholesale.',
        'Without a userKey path (no `userKeyField` on the list, no `userKey` on rows), every sync inserts a new row with a fresh UUID — `mergeStrategy` has no effect in that case.',
    ],
};

const APP_ACTION_SOURCE_FROM_PLATFORM: StepShape = {
    key: 'appAction:source-from-platform',
    stepType: 'appAction',
    shape: 'source-from-platform',
    description:
        'Sourcing pattern — call a native app action to fetch entities from a known platform (LinkedIn, Affinity, Crunchbase, Specter, Hunter, etc.). This is the DEFAULT shape for any "find / fetch / discover / source" step. Only fall back to aiActionWithTools + web_search if list_apps shows no native app for the source.',
    example: {
        id: 'source-companies',
        type: 'appAction',
        name: 'Source: <Platform>',
        app: { id: '<app-id>', actionId: '<action-id>', source: 'native' },
        stepInputData: {
            // Replace with the action\'s declared inputs — call get_app_actions(<app-id>) for the schema.
            // Example for affinity-crm.search-companies:
            //   query: '{{input.search_query}}',
            //   limit: '50',
        },
        creditCost: 1,
        next: { stepId: 'next-step' },
    },
    notes: [
        'STEP 1: `list_apps({ grep: "<platform>" })` to confirm a native app exists. Empty result = fall back to aiActionWithTools + web_search and document the reason in the step `description`.',
        'STEP 2: `get_app_actions(<app-id>)` to get the input/output schema. Set `app.id` and `app.actionId` to the exact values from that response.',
        'STEP 3: Fill `stepInputData` with template variables from upstream steps (`{{input.X}}`, `{{steps.previous.field}}`).',
        'Native action benefits over aiActionWithTools + web_search: deterministic outputs (same input → same output), typed fields (no prompt drift when adding fields), ~1 credit (vs 10–25 for an LLM tool loop), automatic per-step caching, automatic retry on transient failures.',
        'Name the step `Source: <Platform>` so the workflow shape is self-documenting. If the workflow name says "Source: <Platform>" but the underlying step is `aiActionWithTools` named "Discover via web search", that mismatch is the validator-nudge signal (`AI_STEP_PREFER_NATIVE_ACTION`) — re-check `list_apps` for a native app.',
        'For paginated sources, prefer one appAction step per page (or use the action\'s built-in pagination input) over a single aiActionWithTools that "searches and synthesizes". Pagination is deterministic; LLM extraction is not.',
    ],
};

// ---------------------------------------------------------------------------
// KG access shapes — mirror the patterns documented in
// docs/agents/kg-first-doctrine.md so agents can pull a canonical example via
// get_step_schema without having to read the doctrine doc.
// ---------------------------------------------------------------------------

const APP_ACTION_KG_READ_TEXT: StepShape = {
    key: 'appAction:kg-read-text',
    stepType: 'appAction',
    shape: 'kg-read-text',
    description:
        'Pull workspace-specific text content (investment thesis, ICP criteria, brand voice, scoring rubric) from the KG at runtime. The strategy MUST live in the KG, never inline in the prompt template — see docs/agents/kg-first-doctrine.md.',
    example: {
        id: 'read-thesis',
        type: 'appAction',
        name: 'Read Investment Thesis',
        app: { id: 'kg', actionId: 'kg.read-text', source: 'native' },
        stepInputData: {
            key: 'investment.thesis',
        },
        creditCost: 1,
        next: { stepId: 'analyze' },
    },
    notes: [
        'Output: `{ content: string, key: string, found: boolean }`. Reference downstream as `{{steps.read-thesis.content}}`.',
        'Seed the value once via `upsert_knowledge_text({ key: "investment.thesis", text: "..." })`. Confirm with the user before seeding new content.',
        'Use this for any content that varies between client workspaces (thesis, brand voice, ICP criteria, scoring rubric, geo focus). Never paste these strings inline in prompt templates — that creates a workspace-specific workflow that cannot be reused.',
    ],
};

const APP_ACTION_KG_READ_LIST_BY_STATUS: StepShape = {
    key: 'appAction:kg-read-list-by-status',
    stepType: 'appAction',
    shape: 'kg-read-list-by-status',
    description:
        'Read rows from a KG list filtered by `status`. **Status is DB-indexed** — single-equality reads are O(1) regardless of list size. This is the canonical entry point for any phase in a multi-phase pipeline (sourcing → scoring → reporting → outreach).',
    example: {
        id: 'read-new',
        type: 'appAction',
        name: 'Read New Candidates',
        app: { id: 'kg', actionId: 'kg.read-list', source: 'native' },
        stepInputData: {
            listKey: 'deal-candidates',
            status: 'new',
            limit: '50',
        },
        creditCost: 1,
        next: { stepId: 'process-loop' },
    },
    notes: [
        'Output: `{ listEntries: array, count: number }`. Each entry has `{ id, rowData, status, ... }`. Iterate via `loopConfig: { source: "executionContent", config: { stepId: "read-new", field: "listEntries" } }`.',
        'Always filter by a SINGLE equality value. Never filter by multiple status values in one query — run separate `kg.read-list` calls. Never scan the whole list and filter in code.',
        'Common status vocabularies (you choose what fits your pipeline phases): `new / scored / reported / send_pending / email_sent / followed-up / closed_*`, `draft / review / approved / published`, `pending / in_progress / done / failed`.',
        'Pair with `kg.update-rows` after the phase completes to advance the status (`new → scored`, `scored → reported`, etc.). Mark BEFORE side-effects, not after — see the kg-update-rows-status-advance shape.',
    ],
};

const APP_ACTION_KG_UPSERT_ROWS_SOURCING: StepShape = {
    key: 'appAction:kg-upsert-rows-sourcing',
    stepType: 'appAction',
    shape: 'kg-upsert-rows-sourcing',
    description:
        'Sourcing-workflow write: persist newly-discovered entities to a KG list with `userKey` (for O(1) dedup across runs), `mergeStrategy: "merge"` (so downstream-added fields like scores survive re-upserts), and `status: "new"` (so the next phase finds them via DB-indexed reads).',
    example: {
        id: 'save-candidates',
        type: 'appAction',
        name: 'Save Candidates to KG',
        app: { id: 'kg', actionId: 'kg.upsert-rows', source: 'native' },
        stepInputData: {
            listKey: 'deal-candidates',
            // rows shape: [{ userKey: <stable id like url/domain/email>, rowData: {...} }]
            rows: '{{steps.extract.items}}',
            mergeStrategy: 'merge',
            status: 'new',
        },
        creditCost: 1,
        next: { stepId: 'milestone' },
    },
    notes: [
        '**`userKey` is required** for cross-run dedup. Use a stable caller-defined id: company URL, domain, LinkedIn URL, email address. Same `userKey` = same row, O(1) lookup.',
        '**`mergeStrategy: "merge"` is required** when other workflows add fields downstream (scores, outreach state). Without it, re-upserting from the source wipes those fields.',
        '**`status: "new"`** marks the row for the next phase. Sourcing workflows write `new`; scoring workflows read `new`, score, then advance to `scored`. Multiple sourcing workflows can write to the same `listKey` — they converge into one canonical list.',
        'Output: `{ inserted, updated, rows: [{ userKey, rowId, action }], errors }`. Use `kg.add-rows` only for one-shot writes that never re-run (duplicates acceptable).',
    ],
};

const APP_ACTION_KG_UPDATE_ROWS_STATUS_ADVANCE: StepShape = {
    key: 'appAction:kg-update-rows-status-advance',
    stepType: 'appAction',
    shape: 'kg-update-rows-status-advance',
    description:
        'Advance the `status` of KG rows from one phase to the next (`new → scored`, `scored → reported`, `reported → email_sent`, …). **Always mark BEFORE the side-effect step**, not after — if the side-effect fails, retried rows stay in the new status and aren\'t double-processed.',
    example: {
        id: 'mark-reported',
        type: 'appAction',
        name: 'Mark as Reported',
        app: { id: 'kg', actionId: 'kg.update-rows', source: 'native' },
        stepInputData: {
            listKey: 'deal-candidates',
            rowIds: '{{steps.read-scored.rowIds}}',
            fieldUpdates: {},
            status: 'reported',
        },
        creditCost: 1,
        // For phases that follow an async loop, gate this step on loop_completion:
        entryConditions: {
            onCriteriaFail: 'wait',
            conditionText: 'Wait for the scoring loop to finish before advancing status.',
            criteria: [{ type: 'loop_completion', stepId: 'score-loop', operator: '==', value: true }],
        },
        next: { stepId: 'generate-report' },
    },
    notes: [
        '**Order matters.** Sequence: `kg.read-list({ status: "scored" })` → `kg.update-rows({ status: "reported" })` → side-effect step (share/email/Slack). If the email step fails, the row is already "reported" and won\'t be re-included on retry — but the email never sent. That is the right tradeoff: prefer "missed once" over "sent twice".',
        'For phases following a loop (scoring loop, enrichment loop), gate this step on `loop_completion` so async fan-out completes before the status advances.',
        '`fieldUpdates` can also write phase-specific data (e.g. `{ score, decision }` when advancing `new → scored`). Pass `{}` if you\'re only flipping the status flag.',
        'Output: `{ updatedCount, failedCount }`. Use `mergeStrategy: "merge"` semantics — sibling fields not in `fieldUpdates` are preserved.',
    ],
};

const APP_ACTION_KG_TRAVERSE_EDGES: StepShape = {
    key: 'appAction:kg-traverse-edges',
    stepType: 'appAction',
    shape: 'kg-traverse-edges',
    description:
        'Query KG **edges** (entity → relation → entity, with payload) instead of rows. Use when the relationship itself carries meaning — "which investors has this startup been pitched to?", "what is this lead\'s score against this campaign?", "which sourcing run found this company?" — and chain into `get-rows-by-ids` to resolve the target entities.',
    example: {
        id: 'read-prior-scores',
        type: 'appAction',
        name: 'Find prior MATCH_SCORE edges',
        app: { id: 'kg', actionId: 'kg.traverse-edges', source: 'native' },
        stepInputData: {
            entityName: '{{input.startup_name}}',
            relationshipType: 'MATCH_SCORE',
            limit: '100',
        },
        creditCost: 1,
        next: { stepId: 'fetch-related-rows' },
    },
    notes: [
        'Output: `{ edges: [...], targetNodeIds: string[], sourceNodeIds: string[], count }`. Chain into `kg.get-rows-by-ids({ rowIds: <targetNodeIds> })` to resolve full row data for each related entity.',
        'Common edge types: `COMMITTED`, `MATCH_SCORE`, `QUALIFIED_FOR`, `SOURCED_FROM`, `RESPONDED_TO`, `FOLLOWED_BY`. Edges carry payload (score, amount, runId, timestamps) that rows do not.',
        'Plain rows (`kg.upsert-rows`, `kg.read-list`) are for entity data on its own. Edges are for relationships between two entities. If the question is "what does this entity look like?" use rows; if it\'s "how does this entity relate to others?" use edges.',
        'Workspace-scoped — no cross-workspace leakage. Combine with `query_kg_edges` (MCP tool) for ad-hoc reads outside a workflow.',
    ],
};

const OUTPUT_PAGE_STANDARD: StepShape = {
    key: 'outputPage:standard',
    stepType: 'outputPage',
    shape: 'standard',
    description:
        'Workflow-level output page schema. NOT a pipeline step — entries live under `workflow.context.outputPages` (an array). Edit via `update_workflow_context`, not `add_step`. The workflow detail UI crashes on load if `outputSteps` is missing or non-array.',
    example: {
        id: 'report',
        title: 'Report',
        pathname: 'report',
        outputSteps: ['<id-of-step-whose-output-renders-on-this-page>'],
        description: 'Optional human-readable description shown in the UI.',
        displayConfig: {
            showExecutionsList: true,
        },
    },
    notes: [
        'Required fields: `id` (string, unique within outputPages), `title` (string), `pathname` (string, URL-safe slug), `outputSteps` (string[] of step IDs that exist in workflow.steps).',
        'Optional fields: `description` (string), `iconName` (string), `displayConfig.showExecutionsList` (boolean), `displayConfig.executionNameTemplate` (string), `displayConfig.filterStatuses` (Array<"completed"|"pending"|"scheduled">), `displayConfig.defaultFilterStatus`, `displayConfig.sortField`, `displayConfig.sortDirection`.',
        'SEO for public artifact shares of this page: `pageTitleTemplate` (string) and `pageDescriptionTemplate` (string) — resolved against the execution payload at metadata-generation time. Support `{{steps.<stepId>.<field>}}` and `{{input.<field>}}` (the trigger step output is exposed as `input`). Falls back to the static `title` / `description` above when empty or when any variable is unresolved. Example: `pageTitleTemplate: "{{input.companyName}} weekly report — {{steps.report.weekLabel}}"`.',
        'To add/replace: `update_workflow_context({ workflowId, updates: { context: { outputPages: [...] } }, replace: ["context.outputPages"] })`.',
        'Each `outputSteps[]` entry MUST match an existing step `id` in `workflow.steps` — orphan IDs render an empty page.',
        'Workspace sidebar pins are separate from `context.outputPages`: only pin an output page at workspace level when it is relevant as a direct cross-workspace shortcut (recurring report, dashboard, canonical results list). Do not pin every output page, approval surface, or one-off execution artifact.',
    ],
};

const INPUT_PAGE_STANDARD: StepShape = {
    key: 'inputPage:standard',
    stepType: 'inputPage',
    shape: 'standard',
    description:
        'Workflow-level configuration input page schema. NOT a pipeline step — entries live under `workflow.context.inputPages`. User-saved values land at `workflow.context.<contextKey>` and are read at runtime via `{{context.<contextKey>.<field>}}`.',
    example: {
        title: 'Outreach Profile',
        description: 'Sender identity used for composed-email steps.',
        pathname: 'outreach-profile',
        configuration: {
            contextKey: 'outreachProfile',
            fields: [
                { name: 'name', label: 'Sender name', type: 'text', required: true },
                { name: 'fromEmailLabel', label: 'From name', type: 'text', required: true },
                { name: 'fromEmail', label: 'From email', type: 'connected_emails_selector_multiple', required: true },
                { name: 'replyToEmail', label: 'Reply-To email (optional)', type: 'text' },
                { name: 'trackOpens', label: 'Track email opens', type: 'boolean', defaultValue: true },
                { name: 'trackClicks', label: 'Track link clicks', type: 'boolean', defaultValue: true },
                { name: 'signature', label: 'Email signature', type: 'textarea' },
            ],
        },
    },
    notes: [
        'Required: `title`, `pathname`, `configuration.contextKey`, `configuration.fields[]`. Saved values are written to `context.<contextKey>` (e.g. `context.outreachProfile`).',
        'For sender/outreach pages used by `schedule-email`, include `trackOpens` and `trackClicks` booleans so users can control email tracking. Tracking only applies when the email body is HTML.',
        'To add/replace: `update_workflow_context({ workflowId, updates: { context: { inputPages: [...] } }, replace: ["context.inputPages"] })`.',
        'To pre-fill saved values without touching the schema: `update_workflow_context({ workflowId, updates: { context: { <contextKey>: { ... } } } })`.',
    ],
};

export const STEP_SHAPES: StepShape[] = [
    AI_ACTION_STANDARD,
    AI_ACTION_REPORT,
    AI_ACTION_EMAIL,
    AI_ACTION_WITH_TOOLS_STANDARD,
    AI_ACTION_WITH_TOOLS_AGENTIC_SEARCH,
    APP_ACTION_SOURCE_FROM_PLATFORM,
    APP_ACTION_KG_READ_TEXT,
    APP_ACTION_KG_READ_LIST_BY_STATUS,
    APP_ACTION_KG_UPSERT_ROWS_SOURCING,
    APP_ACTION_KG_UPDATE_ROWS_STATUS_ADVANCE,
    APP_ACTION_KG_TRAVERSE_EDGES,
    AGENT_ORCHESTRATOR_SUPERVISOR,
    CODE_STANDARD,
    SHARE_PUBLIC,
    KNOWLEDGE_SYNC_STANDARD,
];

/**
 * Page schemas live under `workflow.context.outputPages` / `.inputPages`.
 * They are NOT pipeline steps (no `id`/`type` runtime contract), so they
 * are kept out of STEP_SHAPES — but `get_step_schema({ stepType: "outputPage" })`
 * still surfaces them via the lookup helpers below.
 */
export const PAGE_SHAPES: StepShape[] = [
    OUTPUT_PAGE_STANDARD,
    INPUT_PAGE_STANDARD,
];

const ALL_SHAPES: StepShape[] = [...STEP_SHAPES, ...PAGE_SHAPES];

export function findStepShape(stepType: string, shape?: string): StepShape | undefined {
    if (shape) {
        return ALL_SHAPES.find((s) => s.stepType === stepType && s.shape === shape);
    }
    // Default: first shape for the step type (usually "standard")
    return ALL_SHAPES.find((s) => s.stepType === stepType);
}

export function listShapesForStepType(stepType: string): StepShape[] {
    return ALL_SHAPES.filter((s) => s.stepType === stepType);
}
