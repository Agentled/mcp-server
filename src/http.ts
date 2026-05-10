#!/usr/bin/env node

/**
 * Agentled MCP Server — HTTP Entry point (for remote MCP / Claude.ai connectors)
 *
 * Exposes the MCP server over Streamable HTTP transport with OAuth 2.1 support.
 * Creates a new transport+server per session (MCP SDK requirement).
 *
 * Environment variables:
 *   AGENTLED_URL       — Base URL (default: https://www.agentled.app)
 *   OAUTH_JWT_SECRET   — JWT secret for verifying OAuth Bearer tokens
 *   PORT               — HTTP port (default: 3001)
 */

import { createServer as createHttpServer, IncomingMessage, ServerResponse } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { createRequire } from 'node:module';
import { createServer } from './server.js';
import { verifyMcpToken } from './auth.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const AGENTLED_URL = process.env.AGENTLED_URL || 'https://www.agentled.app';
const MCP_BASE_URL = process.env.MCP_BASE_URL || 'https://mcp.agentled.app';
const require = createRequire(import.meta.url);
const mcpPackage = require('../package.json') as { version: string };
const corePackage = require('@agentled/core/package.json') as { version: string };

// Per-session transport map
const transports: Record<string, StreamableHTTPServerTransport> = {};

function sendJson(res: ServerResponse, status: number, body: unknown, extraHeaders?: Record<string, string>) {
    res.writeHead(status, { 'Content-Type': 'application/json', ...extraHeaders });
    res.end(JSON.stringify(body));
}

/**
 * Parse a request URL to extract a workspace prefix.
 * Routes: /{workspaceId}/mcp, /{workspaceId}/.well-known/..., etc.
 * Only /health has no prefix.
 */
function parseWorkspacePath(url: string): { workspaceId: string | null; path: string } {
    if (url === '/health') {
        return { workspaceId: null, path: url };
    }

    const match = url.match(/^\/([^/]+)(\/.*)/);
    if (match) {
        return { workspaceId: match[1], path: match[2] };
    }

    return { workspaceId: null, path: url };
}

/** Read full request body as a Buffer. */
async function readBody(req: IncomingMessage): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
}

async function main() {
    const httpServer = createHttpServer(async (req, res) => {
        // CORS headers for Claude.ai
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Mcp-Session-Id');
        res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');

        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return;
        }

        // Health check
        if (req.url === '/health') {
            sendJson(res, 200, {
                status: 'ok',
                transport: 'streamable-http',
                version: mcpPackage.version,
                coreVersion: corePackage.version,
            });
            return;
        }

        // Version check for deploy verification and connector debugging.
        if (req.url === '/version') {
            sendJson(res, 200, {
                status: 'ok',
                package: '@agentled/mcp-server',
                version: mcpPackage.version,
                corePackage: '@agentled/core',
                coreVersion: corePackage.version,
                transport: 'streamable-http',
            });
            return;
        }

        // Root — browser landing page with branding
        if (req.url === '/' || req.url === '') {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Agentled MCP Server</title>
  <link rel="icon" type="image/png" href="${AGENTLED_URL}/images/logos/icon-180.png" />
  <style>
    body { margin: 0; background: #030712; color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { text-align: center; padding: 2rem; }
    img { width: 64px; height: 64px; border-radius: 14px; margin-bottom: 1.5rem; }
    h1 { font-size: 1.25rem; font-weight: 600; margin: 0 0 0.5rem; }
    p { color: #9ca3af; font-size: 0.875rem; margin: 0; }
    a { color: #818cf8; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <img src="${AGENTLED_URL}/images/logos/icon-180.png" alt="Agentled" />
    <h1>Agentled MCP Server</h1>
    <p>Connect via <a href="${AGENTLED_URL}" target="_blank">agentled.app</a></p>
  </div>
</body>
</html>`);
            return;
        }

        // Favicon — proxy from main app
        if (req.url === '/favicon.ico') {
            try {
                const iconRes = await fetch(`${AGENTLED_URL}/images/logos/icon-180.png`);
                if (iconRes.ok) {
                    const buf = await iconRes.arrayBuffer();
                    res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' });
                    res.end(Buffer.from(buf));
                    return;
                }
            } catch { /* fall through to 404 */ }
        }

        // Glama server metadata (required for Glama connector health check)
        if (req.url === '/glama.json') {
            sendJson(res, 200, {
                $schema: 'https://glama.ai/mcp/schemas/server.json',
                maintainers: ['ouadie-agentled'],
            }, { 'Cache-Control': 'public, max-age=3600' });
            return;
        }

        // Parse workspace prefix from URL: /{workspaceId}/mcp
        const { workspaceId: urlWorkspaceId, path } = parseWorkspacePath(req.url || '/');
        const wsPrefix = urlWorkspaceId ? `/${urlWorkspaceId}` : '';
        const resourceUrl = urlWorkspaceId ? `${MCP_BASE_URL}/${urlWorkspaceId}` : MCP_BASE_URL;
        const wellKnownUrl = `${resourceUrl}/.well-known/oauth-protected-resource`;

        // OAuth 2.0 Protected Resource Metadata (RFC 9728)
        if (path === '/.well-known/oauth-protected-resource') {
            sendJson(res, 200, {
                resource: resourceUrl,
                authorization_servers: [`${MCP_BASE_URL}${wsPrefix}`],
                scopes_supported: ['mcp:full'],
                bearer_methods_supported: ['header'],
            }, { 'Cache-Control': 'public, max-age=3600' });
            return;
        }

        // OAuth 2.0 Authorization Server Metadata (RFC 8414)
        if (path === '/.well-known/oauth-authorization-server') {
            sendJson(res, 200, {
                issuer: `${MCP_BASE_URL}${wsPrefix}`,
                authorization_endpoint: `${MCP_BASE_URL}${wsPrefix}/authorize`,
                token_endpoint: `${MCP_BASE_URL}${wsPrefix}/token`,
                response_types_supported: ['code'],
                grant_types_supported: ['authorization_code', 'refresh_token'],
                code_challenge_methods_supported: ['S256'],
                token_endpoint_auth_methods_supported: ['client_secret_post', 'client_secret_basic'],
                scopes_supported: ['mcp:full'],
                service_documentation: AGENTLED_URL,
                logo_uri: `${AGENTLED_URL}/images/logos/icon-180.png`,
            }, { 'Cache-Control': 'public, max-age=3600' });
            return;
        }

        // OAuth authorize — redirect to main Agentled app
        if (path.startsWith('/authorize')) {
            const query = path.includes('?') ? path.slice(path.indexOf('?')) : '';
            res.writeHead(302, { 'Location': `${AGENTLED_URL}/en/oauth/authorize${query}` });
            res.end();
            return;
        }

        // OAuth token — reverse-proxy to main Agentled app (POST cannot follow 302)
        if (path.startsWith('/token')) {
            const body = await readBody(req);

            try {
                const proxyRes = await fetch(`${AGENTLED_URL}/api/external/oauth/token`, {
                    method: req.method || 'POST',
                    headers: {
                        'content-type': req.headers['content-type'] || 'application/x-www-form-urlencoded',
                        ...(req.headers.authorization ? { authorization: req.headers.authorization } : {}),
                    },
                    body: body.toString(),
                });

                const responseBody = await proxyRes.text();
                res.writeHead(proxyRes.status, {
                    'Content-Type': proxyRes.headers.get('content-type') || 'application/json',
                });
                res.end(responseBody);
            } catch (err: any) {
                console.error('Token proxy error:', err);
                sendJson(res, 502, { error: 'Failed to reach token endpoint' });
            }
            return;
        }

        // MCP endpoint — root /mcp (no workspace) for health probing by Glama / connector registries.
        // Responds to initialize + tools/list without auth so the connector shows healthy.
        // No workspace context is set — all tool calls return errors if attempted.
        if ((path === '/mcp' || path.startsWith('/mcp')) && !urlWorkspaceId) {
            if (req.method === 'OPTIONS') {
                res.writeHead(204);
                res.end();
                return;
            }

            if (req.method !== 'POST') {
                sendJson(res, 405, { error: 'Method Not Allowed' });
                return;
            }

            const body = await readBody(req);
            let parsed: any;
            try {
                parsed = JSON.parse(body.toString());
            } catch {
                sendJson(res, 400, { jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' }, id: null });
                return;
            }

            if (isInitializeRequest(parsed)) {
                const transport = new StreamableHTTPServerTransport({
                    sessionIdGenerator: () => crypto.randomUUID(),
                    onsessioninitialized: (newSessionId) => {
                        transports[newSessionId] = transport;
                    },
                });
                transport.onclose = () => {
                    const sid = transport.sessionId;
                    if (sid && transports[sid]) delete transports[sid];
                };
                const server = createServer();
                await server.connect(transport);
                await transport.handleRequest(req, res, parsed);
                return;
            }

            const sessionId = req.headers['mcp-session-id'] as string | undefined;
            if (sessionId && transports[sessionId]) {
                await transports[sessionId].handleRequest(req, res);
                return;
            }

            sendJson(res, 400, { jsonrpc: '2.0', error: { code: -32000, message: 'Bad Request: No valid session ID' }, id: null });
            return;
        }

        // MCP endpoint — requires workspace prefix and Bearer token auth
        if (path === '/mcp' || path.startsWith('/mcp')) {

            const authHeader = req.headers.authorization;

            if (!authHeader?.startsWith('Bearer ')) {
                sendJson(res, 401, { error: 'Unauthorized' }, {
                    'WWW-Authenticate': `Bearer resource_metadata="${wellKnownUrl}", scope="mcp:full"`,
                });
                return;
            }

            const token = authHeader.slice(7);

            try {
                const payload = await verifyMcpToken(token);

                // Verify JWT workspace matches URL workspace
                if (payload.workspaceId !== urlWorkspaceId) {
                    sendJson(res, 403, { error: 'Token workspace does not match URL workspace' });
                    return;
                }

                // Set auth info on the request for the SDK to propagate to tool handlers
                (req as any).auth = {
                    token,
                    clientId: payload.sub,
                    scopes: [payload.scope],
                    extra: {
                        workspaceId: payload.workspaceId,
                        userId: payload.userId,
                    },
                };
            } catch (err: any) {
                sendJson(res, 401, { error: 'Invalid or expired token' }, {
                    'WWW-Authenticate': `Bearer error="invalid_token", resource_metadata="${wellKnownUrl}", scope="mcp:full"`,
                });
                return;
            }

            // Session management: one transport per session
            const sessionId = req.headers['mcp-session-id'] as string | undefined;
            let transport: StreamableHTTPServerTransport;

            if (sessionId && transports[sessionId]) {
                // Reuse existing session transport
                transport = transports[sessionId];
            } else if (req.method === 'POST') {
                // Read body to check if this is an initialize request
                const body = await readBody(req);
                let parsed: any;
                try {
                    parsed = JSON.parse(body.toString());
                } catch {
                    sendJson(res, 400, {
                        jsonrpc: '2.0',
                        error: { code: -32700, message: 'Parse error' },
                        id: null,
                    });
                    return;
                }

                if (!sessionId && isInitializeRequest(parsed)) {
                    // New session — create transport + server
                    transport = new StreamableHTTPServerTransport({
                        sessionIdGenerator: () => crypto.randomUUID(),
                        onsessioninitialized: (newSessionId) => {
                            transports[newSessionId] = transport;
                        },
                    });

                    // Clean up on close
                    transport.onclose = () => {
                        const sid = transport.sessionId;
                        if (sid && transports[sid]) {
                            delete transports[sid];
                        }
                    };

                    const server = createServer();
                    await server.connect(transport);
                    await transport.handleRequest(req, res, parsed);
                    return;
                } else {
                    sendJson(res, 400, {
                        jsonrpc: '2.0',
                        error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
                        id: null,
                    });
                    return;
                }
            } else {
                // GET/DELETE without valid session
                sendJson(res, 400, {
                    jsonrpc: '2.0',
                    error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
                    id: null,
                });
                return;
            }

            await transport.handleRequest(req, res);
            return;
        }

        sendJson(res, 404, { error: 'Not found. Use /{workspaceId}/mcp for MCP protocol or /health for status.' });
    });

    httpServer.listen(PORT, () => {
        console.log(`Agentled MCP server (HTTP) listening on port ${PORT}`);
        console.log(`MCP endpoint: http://localhost:${PORT}/{workspaceId}/mcp`);
        console.log(`Health check: http://localhost:${PORT}/health`);
    });
}

main().catch((error) => {
    console.error('Failed to start Agentled MCP server (HTTP):', error);
    process.exit(1);
});
