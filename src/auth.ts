/**
 * JWT verification for OAuth Bearer tokens.
 *
 * Verifies tokens issued by the Agentled OAuth token endpoint.
 * Used by the HTTP transport to authenticate MCP requests.
 */

import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.OAUTH_JWT_SECRET || '');

export interface McpTokenPayload {
    sub: string;         // clientId
    workspaceId: string;
    userId: string;
    scope: string;
}

/**
 * Verify a Bearer JWT token and extract the payload.
 * Throws on invalid/expired tokens.
 */
export async function verifyMcpToken(token: string): Promise<McpTokenPayload> {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
        audience: 'mcp.agentled.app',
    });

    return {
        sub: payload.sub || '',
        workspaceId: payload.workspaceId as string,
        userId: payload.userId as string,
        scope: payload.scope as string || 'mcp:full',
    };
}
