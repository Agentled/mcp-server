/**
 * AgentledClient — MCP-facing wrapper around the shared Agentled external API client.
 *
 * Reads credentials from:
 *   1. explicit constructor options (HTTP bearer token / API key)
 *   2. AGENTLED_API_KEY env var
 *   3. ~/.agentled/config.json (active workspace, or AGENTLED_WORKSPACE selector)
 *
 * Base URL comes from explicit options, AGENTLED_URL, or the selected workspace profile.
 */

import {
    AgentledApiClient,
    DEFAULT_AGENTLED_URL,
    getAgentledBaseUrl,
    loadAgentledConfig,
    resolveAgentledWorkspaceProfile,
    type AgentledApiClientOptions,
} from '@agentled/core';

export { DEFAULT_AGENTLED_URL };

export interface AgentledClientOptions extends AgentledApiClientOptions {}

const MISSING_AUTH_ERROR =
    'Not authenticated. Run "agentled auth login", choose a saved workspace with "agentled auth use <workspace>", or set AGENTLED_API_KEY.';

function getWorkspaceSelector(): string | undefined {
    const workspace = process.env.AGENTLED_WORKSPACE?.trim();
    return workspace || undefined;
}

function resolveStdioAuthContext(): { apiKey: string; baseUrl: string } {
    const config = loadAgentledConfig();
    const workspaceSelector = getWorkspaceSelector();
    const workspace = resolveAgentledWorkspaceProfile(config, workspaceSelector);
    const baseUrl = getAgentledBaseUrl({
        baseUrl: process.env.AGENTLED_URL,
        config,
        workspace: workspaceSelector,
    });

    return {
        apiKey: process.env.AGENTLED_API_KEY || workspace?.apiKey || '',
        baseUrl,
    };
}

export class AgentledClient extends AgentledApiClient {
    constructor(options: AgentledClientOptions = {}) {
        const stdioAuthContext = resolveStdioAuthContext();
        const apiKey = options.apiKey || stdioAuthContext.apiKey;
        const bearerToken = options.bearerToken || '';

        if (!apiKey && !bearerToken) {
            throw new Error(MISSING_AUTH_ERROR);
        }

        super({
            apiKey,
            bearerToken,
            baseUrl: options.baseUrl || stdioAuthContext.baseUrl || DEFAULT_AGENTLED_URL,
            missingAuthMessage: MISSING_AUTH_ERROR,
        });
    }
}
