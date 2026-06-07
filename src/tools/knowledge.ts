/**
 * MCP Tools — Knowledge, Workspace & Knowledge Graph
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const companyUrlsSchema = z.array(z.string()).optional();

export function registerKnowledgeTools(server: McpServer, clientFactory: ClientFactory) {

    // --- Workspace Context ---

    server.tool(
        'get_workspace',
        `Get workspace company info, team visibility, and knowledge schema overview.
Returns company details, active team members, pending team invitations, and a summary of all knowledge lists with their field definitions and row counts.
Use this as a first call to understand what data the workspace has.`,
        {},
        async (_args, extra) => {
            const client = clientFactory(extra);
            const result = await client.getWorkspace();
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'get_workspace_company_profile',
        `Get the workspace company profile and company knowledge text.
Returns the company record used for workspace setup plus markdown from knowledge keys company.profile and company.products.
Use this when you need the editable company profile rather than the broader workspace context.`,
        {},
        async (_args, extra) => {
            const client = clientFactory(extra);
            const result = await client.getWorkspaceCompanyProfile();
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'update_workspace_company_profile',
        `Update top-level workspace company profile fields.
Use this for company identity and summary information such as name, industry, size, logo, website URLs, and company description.
Products and services live in the company.products knowledge text, not in this structured profile.`,
        {
            name: z.string().optional().describe('Company name.'),
            industry: z.string().optional().describe('Industry sector or category.'),
            size: z.string().optional().describe('Company size label, for example "1-10" or "1-50".'),
            logoUrl: z.string().optional().describe('Public URL of the company logo.'),
            urls: companyUrlsSchema.describe('List of company-related URLs such as the website or social profiles.'),
            additionalInformation: z.string().optional().describe('Additional company context, positioning, or notes.'),
            description: z.string().optional().describe('Short company description or bio.'),
        },
        async (args, extra) => {
            const company = Object.fromEntries(
                Object.entries(args).filter(([, value]) => value !== undefined)
            );

            if (Object.keys(company).length === 0) {
                throw new Error('At least one company profile field must be provided.');
            }

            const client = clientFactory(extra);
            const result = await client.updateWorkspaceCompanyProfile(company);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'update_workspace_executive_summary',
        `Write the workspace-wide executive summary shown on the Workspace Assistant card.
Uses the same summary signature as cluster executive summaries: body, optional bullets, and optional author.
The API writes only Workspace.metadata.executiveSummary and preserves other workspace metadata keys.`,
        {
            body: z.string().describe('One non-empty workspace executive-summary paragraph.'),
            bullets: z.array(z.string()).max(5).optional().describe('Optional concise bullets. Empty strings are ignored by the API.'),
            author: z.string().optional().describe('Optional author display name, e.g. "Workspace Assistant". Do not include a leading "by".'),
        },
        async (args, extra) => {
            const client = clientFactory(extra);
            const result = await client.updateWorkspaceExecutiveSummary(args);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'list_pinned_outputs',
        `List output pages currently pinned to the workspace home/sidebar.
Pinned outputs are workspace-level shortcuts to workflow output pages, stored on Workspace.metadata.pinnedOutputs.
Use this before changing pins so you can avoid duplicating or removing the wrong shortcut.`,
        {},
        async (_args, extra) => {
            const client = clientFactory(extra);
            const result = await client.listPinnedOutputs();
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'set_output_page_pin',
        `Pin or unpin a workflow output page on the workspace home/sidebar.
The API validates that the workflow belongs to this workspace and that the output page pathname exists on the workflow.
Pin sparingly: only use workspace-level pins for recurring reports, dashboards, canonical results lists, or other pages users should reach directly from the workspace home/sidebar.`,
        {
            workflowId: z.string().describe('Workflow ID that owns the output page.'),
            outputPagePathname: z.string().describe('Output page pathname/slug, for example "weekly-report".'),
            pinned: z.boolean().describe('true to pin the output page, false to unpin it.'),
            label: z.string().optional().describe('Optional custom sidebar label. Defaults to the output page title.'),
            iconName: z.string().optional().describe('Optional lucide icon name. Defaults to the output page iconName.'),
        },
        async (args, extra) => {
            const client = clientFactory(extra);
            const result = await client.setOutputPagePin(args);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    // --- Knowledge Data ---

    server.tool(
        'list_knowledge_lists',
        `List all knowledge list schemas with field definitions, row counts, and metadata.
Returns detailed information about each list including fields, source type, category, entity config, and KG sync status.
Use this to discover what lists exist and understand their structure before querying rows.

**KG-First:** Call this BEFORE generating any AI-step prompt that references business-specific personalization (ICP criteria, scoring rubrics, sector lists, seed lists, etc.) to check whether the content already lives in workspace knowledge. If it does, reference it at runtime via kg.read-list rather than hardcoding it in the prompt template.`,
        {},
        async (_args, extra) => {
            const client = clientFactory(extra);
            const result = await client.listKnowledgeLists();
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'get_knowledge_rows',
        `Fetch rows from a knowledge list (paginated, up to 200 per call).
Use this to inspect actual data or scan a small list end-to-end.
Returns rows with their full rowData, count, totalCount for unfiltered list reads, and nextToken. Pass nextToken from the previous response to fetch the next page. nextToken is null when there are no more rows.

For targeted lookups by ID use \`get_knowledge_rows_by_ids\` — it fetches specific rows in a single call (max 200) without scanning the whole list.
For entity-relationship queries (e.g. "all deals scored by this investor") start with \`query_kg_edges\`, then pass the returned node IDs to \`get_knowledge_rows_by_ids\`.`,
        {
            listKey: z.string().describe('The list key to fetch rows from (e.g., "investors", "deals")'),
            limit: z.number().min(1).max(200).optional().describe('Number of rows to return (default 5, max 200)'),
            nextToken: z.string().optional().describe('Pagination cursor from a previous response. Pass this to fetch the next page of results.'),
            status: z.string().optional().describe('Optional top-level row status filter (e.g., "new", "active", "scored"). When set, filtering is applied server-side.'),
        },
        async ({ listKey, limit, nextToken, status }, extra) => {
            const client = clientFactory(extra);
            const result = await client.getKnowledgeRows(listKey, limit, status, nextToken);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'get_knowledge_rows_by_ids',
        `Fetch specific knowledge rows by their IDs. Returns full row data for each requested ID (max 200 per call).

Use this after \`query_kg_edges\` to load full row data for node IDs returned by the Knowledge Graph.
The canonical chain for entity-scoped queries (e.g. "best deals for Teresa Abecasis") is:
  1. \`query_kg_edges({ entityName: "Teresa Abecasis", relationshipType: "SCORED" })\`
  2. \`get_knowledge_rows_by_ids({ rowIds: <targetNodeIds from step 1> })\`

This is O(edges for that entity) — independent of total list size — and scales to 10k+ rows without paginating.

Note: \`source_node_id\` and \`target_node_id\` values from \`query_kg_edges\` correspond directly to knowledge row IDs for investor/deal entity nodes. Rows not belonging to the workspace are silently excluded from results.`,
        {
            rowIds: z.array(z.string()).min(1).max(200).describe('Array of knowledge row IDs to fetch (max 200). Use node IDs from query_kg_edges results.'),
        },
        async ({ rowIds }, extra) => {
            const client = clientFactory(extra);
            const result = await client.getKnowledgeRowsByIds(rowIds);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'get_knowledge_text',
        `Fetch a text-type knowledge entry by key. Use this to access text-based knowledge like feedback files, notes, or configuration text stored in the workspace.

**KG-First:** Call this BEFORE generating any AI-step prompt that references workspace-specific content (investment thesis, brand voice, ICP description, scoring rubric, etc.) to check whether it already exists. If found, pass it via a runtime read step rather than hardcoding the text inline in the prompt template.`,
        {
            key: z.string().describe('The key of the text entry to fetch'),
        },
        async ({ key }, extra) => {
            const client = clientFactory(extra);
            const result = await client.getKnowledgeText(key);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    // --- Knowledge List Write ---

    server.tool(
        'create_knowledge_list',
        `Create a new knowledge list with a typed schema.
Idempotent on key collision — returns the existing list with a warning instead of erroring, so AI agents can safely re-run setup steps.
Use this before inserting rows to ensure the list schema exists.
Returns: { listKey, fieldCount, kgSyncEnabled, alreadyExisted? }.`,
        {
            key: z.string().describe('Unique list key (e.g. "prospects", "investors"). Used as the stable identifier — cannot be changed later.'),
            name: z.string().describe('Human-readable display name for the list.'),
            fields: z.array(z.object({
                id: z.string().describe('Internal field identifier used in schema operations such as removeFieldIds (snake_case recommended). Not used as a rowData key.'),
                name: z.string().describe('Storage and query key — rowData is keyed by this value (e.g. rowData[field.name]). Must be unique within the list.'),
                label: z.string().optional().describe('Human-friendly display label shown in the UI. Defaults to name if omitted.'),
                type: z.string().describe('Field type: text | number | date | boolean | url | email | select'),
                required: z.boolean().optional().describe('Whether the field is required'),
                options: z.array(z.string()).optional().describe('Options for select fields'),
            })).optional().describe('Field definitions for the list schema. Empty list creates a schema-less list.'),
            listCategory: z.enum(['data', 'entity']).optional().describe('Category: "data" (plain storage, default) or "entity" (graph-connected, supports KG edges).'),
            syncToKg: z.boolean().optional().describe('When true, rows are synced to the Knowledge Graph for semantic search and edge traversal. Default: false.'),
            entityConfig: z.object({
                entityType: z.string().optional(),
                displayNameField: z.string().optional(),
                identityFields: z.array(z.string()).optional(),
            }).optional().describe('Entity resolution config for entity-type lists.'),
            userKeyField: z.string().optional().describe('Which field name to use as the deterministic userKey for upsert dedup. When set, kg.upsert-rows will automatically derive userKey = row[userKeyField] for incoming rows, enabling O(1) cross-run dedup without the caller needing to supply userKey explicitly. Pick a stable field (e.g. "affinity_person_id", "email", "domain"). Omit for lists where rows are always supplied with explicit userKeys or where dedup is not needed.'),
        },
        async (args, extra) => {
            const client = clientFactory(extra);
            const result = await client.createKnowledgeList(args);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'update_knowledge_list_schema',
        `Add or remove fields on an existing knowledge list schema.
Use this to evolve a list's schema — add new columns or remove unused ones.
Existing rows are not modified; new fields will be missing from old rows until updated.
Returns: { listKey, fieldCount }.`,
        {
            listKey: z.string().describe('The list key to update.'),
            name: z.string().optional().describe('New display name for the list.'),
            addFields: z.array(z.object({
                id: z.string().describe('Internal field identifier used in schema operations such as removeFieldIds (snake_case recommended). Not used as a rowData key.'),
                name: z.string().describe('Storage and query key — rowData is keyed by this value (e.g. rowData[field.name]). Must be unique within the list.'),
                label: z.string().optional().describe('Human-friendly display label shown in the UI. Defaults to name if omitted.'),
                type: z.string().describe('Field type: text | number | date | boolean | url | email | select'),
                required: z.boolean().optional(),
                options: z.array(z.string()).optional(),
            })).optional().describe('Fields to add. Each field needs id (internal schema identifier), name (the rowData key used for storage and queries), type, and optionally label (human-friendly display; defaults to name if omitted). Fields with IDs already in the schema are skipped.'),
            removeFieldIds: z.array(z.string()).optional().describe('IDs of fields to remove from the schema. Does not modify existing row data.'),
            syncToKg: z.boolean().optional().describe('Update the KG sync setting.'),
            userKeyField: z.string().nullable().optional().describe('Set or update the row identifier field. Pass a field name (e.g. "affinity_person_id") to enable automatic userKey derivation in kg.upsert-rows. Pass null or empty string to clear (revert to auto-UUID behaviour).'),
        },
        async (args, extra) => {
            const client = clientFactory(extra);
            const result = await client.updateKnowledgeListSchema(args);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'delete_knowledge_list',
        `Permanently delete a knowledge list and ALL its rows. This action is irreversible.
Pass the listKey of the list to delete. The API requires confirm: true — this tool sends it automatically.
Returns: { success, listKey }.`,
        {
            listKey: z.string().describe('The list key to delete.'),
        },
        async ({ listKey }, extra) => {
            const client = clientFactory(extra);
            const result = await client.deleteKnowledgeList(listKey);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'upsert_knowledge_rows',
        `Create or update rows in a knowledge list. Maximum 500 rows per call — paginate for larger datasets.

Resolution order per row:
  - rows with \`id\` → update existing row by id
  - rows with \`userKey\` → O(1) upsert (same userKey in the same list always maps to the same row, across calls and runs — ideal for idempotent sourcing/enrichment workflows)
  - rows with neither → plain insert with a fresh UUID (no dedup)

Pick one stable key per row. \`userKey\` is caller-defined: a candidateId, a normalized URL, a domain, etc. Whatever string uniquely identifies the entity within the list for your use case.

mergeStrategy controls how updates are applied to existing rows:
  - "overwrite" (default): replace existing rowData entirely with the new values
  - "merge": shallow-merge new values into existing rowData (preserves downstream-added fields like scores or notes)

Returns: { inserted, updated, errors[] } — errors are per-row and do not abort the batch.`,
        {
            listKey: z.string().describe('The list key to write rows into.'),
            rows: z.array(z.object({
                id: z.string().optional().describe('Row ID. Provide to update an existing row by id.'),
                userKey: z.string().optional().describe('Stable caller-defined dedup key. Same userKey in the same list always maps to the same row across runs (O(1) upsert, no scan). Use when you want idempotent writes.'),
                rowData: z.record(z.any()).describe('The row data as a key-value object matching the list schema fields.'),
            })).min(1).max(500).describe('Rows to upsert. Max 500 per call.'),
            mergeStrategy: z.enum(['overwrite', 'merge']).optional().describe('"overwrite" (default) replaces rowData; "merge" shallow-merges into existing data.'),
            status: z.string().optional().describe('Optional status label to apply to all inserted/updated rows (e.g. "new", "scored", "active"). Enables status-based filtering when reading rows.'),
        },
        async (args, extra) => {
            const client = clientFactory(extra);
            const result = await client.upsertKnowledgeRows(args);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'delete_knowledge_rows',
        `Delete specific rows from a knowledge list by their IDs. This action is irreversible.
For more than 10 rows the API requires confirm: true — this tool sends it automatically.
Returns: { deleted, errors[] } where each error includes a structured code field:
  - foreign_key_constraint: row is referenced by KG edges (scoring predictions, outcomes, relations) and cannot be hard-deleted
  - not_found: row ID does not exist
  - permission_denied: insufficient workspace permissions
  - delete_failed: unclassified failure

IMPORTANT: Rows referenced by KG edges cannot be hard-deleted. If you receive foreign_key_constraint errors,
use soft-delete instead: call upsert_knowledge_rows with mergeStrategy "merge" and rowData { _dropped: true, _dropReason: "..." }.
Workflow readers typically filter on _dropped or status != "noise", so soft-deleted rows are excluded from downstream reads.`,
        {
            listKey: z.string().describe('The list key the rows belong to.'),
            rowIds: z.array(z.string()).min(1).describe('IDs of the rows to delete.'),
        },
        async ({ listKey, rowIds }, extra) => {
            const client = clientFactory(extra);
            const result = await client.deleteKnowledgeRows({ listKey, rowIds, confirm: true });
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'upsert_knowledge_text',
        `Create or update a text-based knowledge entry. Use this to store free-form text (notes, prompts, ICP descriptions, etc.) that can be retrieved by key.
Returns: { key, upserted, created }.`,
        {
            key: z.string().describe('Unique key for the text entry (e.g. "icp_description", "outreach_template").'),
            content: z.string().describe('The text content to store.'),
            title: z.string().optional().describe('Optional human-readable title stored in metadata.'),
            tags: z.array(z.string()).optional().describe('Optional tags stored in metadata for organisation.'),
        },
        async (args, extra) => {
            const client = clientFactory(extra);
            const result = await client.upsertKnowledgeText(args);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'delete_knowledge_text',
        `Delete a text-based knowledge entry by key. This action is irreversible.
Returns: { success, key }.`,
        {
            key: z.string().describe('The key of the text entry to delete.'),
        },
        async ({ key }, extra) => {
            const client = clientFactory(extra);
            const result = await client.deleteKnowledgeText(key);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    // --- Snapshot / Restore ---

    server.tool(
        'snapshot_knowledge_list',
        `Capture a full point-in-time backup of a Knowledge Data list.
Returns all rows with their IDs, rowData, status, createdAt, and updatedAt as inline JSON.
Also includes the list schema (fields, userKeyField) so the snapshot is self-contained.

Use before any risky migration, canonical-key reshuffle, or schema change.
The returned snapshot object can be passed directly to \`restore_knowledge_list_snapshot\` to roll back.

Supports lists up to 5 000 rows (inline JSON). Larger lists are not yet supported.`,
        {
            listKey: z.string().describe('The list key to snapshot (e.g. "deal-candidates")'),
            includeArchived: z.boolean().optional().describe('Include rows with archived status (default false)'),
        },
        async ({ listKey, includeArchived }, extra) => {
            const client = clientFactory(extra);
            let result: unknown;
            try {
                result = await client.snapshotKnowledgeList({ listKey, includeArchived });
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                throw new Error(`snapshot_knowledge_list failed for list "${listKey}": ${message}`);
            }
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'restore_knowledge_list_snapshot',
        `Restore rows from a snapshot into a Knowledge Data list without wiping computed fields.

Modes (computed fields like scores and enrichment are always preserved):
  - "merge-restore" (default) — for rows that already exist: shallow-merges snapshot fields back in
    (existing computed fields survive; snapshot fields win on conflict). New rows are inserted.
    Use this as the rollback path — it undoes a bad migration without destroying downstream work.
  - "append" — inserts only rows not already present; never touches existing rows.
    Use this when restoring into a new list or when you want to add missing rows without altering anything.

The target listKey may differ from the snapshot's source listKey — this enables cross-list cloning.
If the target list doesn't exist it will be auto-created using the snapshot's schema.

Returns: { restored (new rows inserted), merged (existing rows updated), skipped, errors[] }.`,
        {
            listKey: z.string().describe('The target list key to restore into. May differ from the snapshot source list.'),
            snapshotData: z.record(z.any()).describe('The snapshot object from snapshot_knowledge_list. Must contain a rows array.'),
            mode: z.enum(['merge-restore', 'append']).optional().describe('"merge-restore" (default) merges snapshot fields into existing rows preserving computed fields; "append" only inserts missing rows.'),
        },
        async ({ listKey, snapshotData, mode }, extra) => {
            const client = clientFactory(extra);
            let result: unknown;
            try {
                result = await client.restoreKnowledgeListSnapshot({ listKey, snapshotData, mode });
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                throw new Error(`restore_knowledge_list_snapshot failed for list "${listKey}": ${message}`);
            }
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    // --- Knowledge Graph ---

    server.tool(
        'query_kg_edges',
        `Traverse Knowledge Graph edges by entity name and/or relationship type.
Returns edges with source/target node IDs, relations, scores, and metadata.
Use this to explore deal relationships, investor-startup connections, and scoring edges.
Gracefully returns empty results if the Knowledge Graph is not configured.

The \`source_node_id\` and \`target_node_id\` values correspond to knowledge row IDs.
Use \`get_knowledge_rows_by_ids\` as the follow-up call to fetch full row data for those IDs.
Example: \`query_kg_edges({ entityName: "Teresa Abecasis", relationshipType: "SCORED" })\` → collect \`targetNodeIds\` → \`get_knowledge_rows_by_ids({ rowIds: targetNodeIds })\`.`,
        {
            entityName: z.string().optional().describe('Filter edges by entity name'),
            relationshipType: z.string().optional().describe('Filter edges by relationship type (e.g., "INVESTED_IN", "SCORED")'),
            limit: z.number().min(1).max(500).optional().describe('Max edges to return (default 100, max 500)'),
        },
        async ({ entityName, relationshipType, limit }, extra) => {
            const client = clientFactory(extra);
            const result = await client.queryKgEdges(entityName, relationshipType, limit);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'get_scoring_history',
        `Fetch global scoring history for entities from the Knowledge Graph.
Returns past scoring decisions (PROCEED_TO_IC, HOLD_FOR_REVIEW, REPOSITION, SCORED) with DMF scores and dates.
Use this for manual exploration and legacy calibration. Workflow scoring prompts should prefer row-level scoring_profile fields or the kg.retrieve-scoring-memory app action when bounded target IDs are available.
Returns both structured records and a compact text format for prompt injection.`,
        {
            entityName: z.string().optional().describe('Filter scoring history by entity name'),
            limit: z.number().min(1).max(500).optional().describe('Max records to return (default 100, max 500)'),
        },
        async ({ entityName, limit }, extra) => {
            const client = clientFactory(extra);
            const result = await client.getScoringHistory(entityName, limit);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );
}
