/**
 * AgentledClient — MCP-facing wrapper around the shared Agentled external API client.
 *
 * Reads AGENTLED_API_KEY and AGENTLED_URL from environment variables.
 */

import {
    AgentledApiClient,
    DEFAULT_AGENTLED_URL,
    type AgentledApiClientOptions,
} from '@agentled/core';

export { DEFAULT_AGENTLED_URL };

export interface AgentledClientOptions extends AgentledApiClientOptions {}

const MISSING_AUTH_ERROR =
    'AGENTLED_API_KEY is not set. Generate one in Workspace Settings > Developer.';

export class AgentledClient extends AgentledApiClient {
    constructor(options: AgentledClientOptions = {}) {
        const apiKey = options.apiKey || process.env.AGENTLED_API_KEY || '';
        const bearerToken = options.bearerToken || '';

        if (!apiKey && !bearerToken) {
            throw new Error(MISSING_AUTH_ERROR);
        }

        super({
            apiKey,
            bearerToken,
            baseUrl: options.baseUrl || process.env.AGENTLED_URL || DEFAULT_AGENTLED_URL,
            missingAuthMessage: MISSING_AUTH_ERROR,
        });
    }
}
