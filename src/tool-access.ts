import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export type McpToolAccess = 'read' | 'write';

// This is deliberately an explicit registry, rather than a verb/name heuristic.
// Adding a new tool must add it here or server creation fails closed.
const READ_TOOLS = [
    'export_workflow', 'get_agent', 'get_agent_file', 'get_app_actions', 'get_branding',
    'get_builder_work_item', 'get_chat_turn_result', 'get_draft', 'get_execution', 'get_feedback',
    'get_knowledge_rows', 'get_knowledge_rows_by_ids', 'get_knowledge_text',
    'get_imap_reply_body', 'get_public_form_link', 'get_scoring_history', 'get_share', 'get_snapshot_content',
    'get_routine_run', 'get_step', 'get_step_schema', 'get_timeline', 'get_use_case', 'get_use_case_goal',
    'get_use_case_record_feedback', 'get_workflow', 'get_workflow_analytics',
    'get_workflow_credits', 'get_workspace', 'get_workspace_company_profile',
    'get_workspace_credit_cost_drivers', 'get_workspace_credits',
    'get_workspace_package_status', 'get_workspace_skill', 'get_workspace_view',
    'inspect_home_recent_tab', 'inspect_workspace_package', 'list_agent_files',
    'list_agent_skills', 'list_agents', 'list_apps', 'list_builder_work_items',
    'list_builder_work_items_for_agent', 'list_channels', 'list_connections',
    'list_executions', 'list_knowledge_lists', 'list_memories', 'list_models',
    'list_pinned_outputs', 'list_public_form_links', 'list_routines', 'list_snapshots',
    'list_timelines', 'list_tracking_events', 'list_use_case_record_feedback',
    'list_use_cases', 'list_workflows', 'list_workspace_skills', 'list_workspace_views',
    'preview_n8n_import', 'preview_use_case_kit', 'preview_workspace_package',
    'query_kg_edges', 'read_step_output', 'recall_memory', 'resolve_workspace',
    'search_memories', 'validate_workflow',
] as const;

const WRITE_TOOLS = [
    'activate_agent', 'add_step', 'append_builder_work_activity', 'append_builder_work_item_activity',
    'append_step_array_item', 'apply_workspace_package', 'archive_use_case',
    'archive_workspace_skill', 'archive_workspace_view', 'bind_use_case_goal_skill',
    'bind_use_case_goal_requirement', 'chat',
    'chat_with_agent', 'claim_builder_work_item', 'clear_use_case_record_feedback',
    'configure_channel', 'configure_home_recent_tab', 'create_agent', 'create_builder_work_item',
    'create_knowledge_list', 'create_public_form_link', 'create_routine', 'create_snapshot',
    'create_use_case', 'create_workflow', 'create_workspace', 'create_workspace_skill',
    'create_workspace_view', 'delete_agent', 'delete_agent_file', 'delete_execution',
    'delete_knowledge_list', 'delete_knowledge_rows', 'delete_knowledge_text', 'delete_memory',
    'delete_public_form_link', 'delete_routine', 'delete_snapshot', 'delete_workflow',
    'discard_draft', 'do', 'import_n8n_workflow', 'import_workflow', 'import_workspace_skill',
    'manage_agent_workflows', 'move_step', 'patch_execution_fields', 'patch_timeline_fields',
    'pause_agent', 'pause_routine', 'promote_draft', 'provision_use_case_kit', 'publish_workflow',
    'publish_workspace_skill', 'recover_workspace_package', 'reject_agent_approval',
    'remove_step', 'remove_step_array_item', 'replace_step_dictionary', 'replace_step_path', 'rerun',
    'rerun_step', 'restore_knowledge_list_snapshot', 'restore_snapshot', 'resume_routine',
    'retry_execution', 'review_builder_work_item', 'revoke_share', 'set_channel_default_agent',
    'set_channel_defaults', 'set_output_page_pin', 'set_use_case_goal_brief',
    'set_use_case_goal_finish_line', 'set_use_case_goal_policy', 'set_use_case_goal_primary_crm',
    'set_use_case_record_feedback', 'share_execution', 'snapshot_knowledge_list', 'start_workflow',
    'stop_execution', 'store_memory', 'submit_builder_work_item', 'submit_feedback_to_agentled',
    'test_ai_action', 'test_app_action', 'test_code_action', 'trigger_routine',
    'unbind_use_case_goal_requirement', 'unbind_use_case_goal_skill', 'unset_step_path', 'update_agent', 'update_agent_file',
    'update_branding', 'update_knowledge_list_schema', 'update_public_form_link', 'update_routine',
    'update_step', 'update_use_case', 'update_workflow', 'update_workflow_context',
    'update_workspace_company_profile', 'update_workspace_executive_summary',
    'update_workspace_skill', 'update_workspace_view', 'upload_agent_file', 'upsert_ai_builder_profile',
    'upsert_knowledge_rows', 'upsert_knowledge_text', 'verify_app_connection',
] as const;

export const MCP_TOOL_ACCESS: Readonly<Record<string, McpToolAccess>> = Object.freeze(
    Object.fromEntries([
        ...READ_TOOLS.map((name) => [name, 'read'] as const),
        ...WRITE_TOOLS.map((name) => [name, 'write'] as const),
    ]),
);

export const MCP_WRITE_ACCESS_ERROR_CODE = 'MCP_WRITE_ACCESS_REQUIRED';

type ToolExtra = { authInfo?: { scopes?: string[]; extra?: { workspaceId?: string } } };

export function createWriteAccessRequiredResult(extra: ToolExtra) {
    const workspaceId = extra.authInfo?.extra?.workspaceId;
    const settingsUrl = workspaceId
        ? `${process.env.AGENTLED_URL || 'https://www.agentled.app'}/en/${encodeURIComponent(workspaceId)}/settings/developer`
        : `${process.env.AGENTLED_URL || 'https://www.agentled.app'}/en/settings/developer`;
    return {
        isError: true,
        content: [{
            type: 'text' as const,
            text: JSON.stringify({
                code: MCP_WRITE_ACCESS_ERROR_CODE,
                message: 'This connection is read-only — ask a workspace admin to grant write access',
                settingsUrl,
            }),
        }],
    };
}

export function registerMcpToolAccessControl(server: McpServer): void {
    const mutableServer = server as unknown as { tool: (...args: any[]) => void };
    const registerTool = mutableServer.tool.bind(server);

    mutableServer.tool = (...args: any[]) => {
        const [name, description] = args;
        const access = MCP_TOOL_ACCESS[name];
        if (!access) {
            throw new Error(`MCP tool "${name}" is missing an explicit read/write classification`);
        }

        if (access === 'write') {
            args[1] = `${description}\n\nRequires write access when connected with OAuth.`;
            const handlerIndex = args.length - 1;
            const handler = args[handlerIndex];
            args[handlerIndex] = async (input: unknown, extra: ToolExtra) => {
                // Stdio/API-key clients have no authInfo. OAuth HTTP requests
                // always carry it, and only those clients are scope-gated.
                const scopes = extra.authInfo?.scopes;
                // Empty scope is the legacy full-access default. Only a
                // non-empty OAuth scope set can narrow an existing client.
                if (scopes && scopes.length > 0 && !scopes.includes('mcp:full')) {
                    return createWriteAccessRequiredResult(extra);
                }
                return handler(input, extra);
            };
        }

        registerTool(...args);
    };
}
