/**
 * MCP Tools — Channels
 *
 * Channels are workspace-level integrations (email, Slack, WhatsApp, Signal)
 * that route inbound messages to a specific agent. Each channel has a
 * `defaultAgentId` that decides which agent handles incoming conversations.
 *
 * Secret credentials (Slack tokens, WhatsApp access tokens, etc.) must be
 * configured via the UI — the external API intentionally does not accept them.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { ClientFactory } from '../server.js';

const CHANNEL_TYPES = ['email', 'slack', 'whatsapp', 'signal'] as const;

export function registerChannelTools(server: McpServer, clientFactory: ClientFactory) {

    server.tool(
        'list_channels',
        `List the workspace's channel integrations and their configuration.

Returns each configured channel (email, slack, whatsapp, signal) with:
- enabled: whether the channel is active
- defaultAgentId: the agent handling inbound conversations on this channel
- inboundAddress (email): auto-generated inbound email address
- Other non-secret config (team names, channel IDs, phone numbers)

Secret credentials (bot tokens, access tokens, signing secrets) are REDACTED in the response.
Use this to discover which channels exist before assigning agents to them.`,
        {},
        async (_args, extra) => {
            const client = clientFactory(extra);
            const result = await client.listChannels();
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'set_channel_default_agent',
        `Assign the agent that handles inbound conversations on a given channel.

When a message arrives on the channel (email, Slack DM, WhatsApp message, Signal message),
it is routed to this agent's chat endpoint. The agent's instructions and tools are used
to compose a reply, which is sent back through the originating channel.

Use list_channels to inspect current assignments and list_agents to find valid agent IDs.
Use configure_channel for more granular updates (enable/disable, allowedSenders, etc.).`,
        {
            channel_type: z.enum(CHANNEL_TYPES).describe("Channel type: 'email', 'slack', 'whatsapp', or 'signal'"),
            agent_id: z.string().describe('Agent ID to handle inbound messages on this channel'),
        },
        async ({ channel_type, agent_id }, extra) => {
            const client = clientFactory(extra);
            const result = await client.updateChannel({
                channelType: channel_type,
                updates: { defaultAgentId: agent_id },
            });
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'configure_channel',
        `Update non-secret channel configuration — enable/disable, default agent, allowed senders, etc.

Allowed fields per channel:
- email: enabled, defaultAgentId, allowedSenders (string[]), inboundAddress
- slack: enabled, defaultAgentId, defaultChannelId (Slack channel ID used to route inbound mentions when one Slack team is shared)
- whatsapp: enabled, defaultAgentId
- signal: enabled, defaultAgentId

Secret fields (botToken, signingSecret, accessToken, webhookSecret) are REJECTED by the
external API — connect those via the Settings → Channels UI (OAuth flows encrypt at rest).`,
        {
            channel_type: z.enum(CHANNEL_TYPES).describe("Channel type: 'email', 'slack', 'whatsapp', or 'signal'"),
            enabled: z.boolean().optional().describe('Enable or disable the channel'),
            default_agent_id: z.string().optional().describe('Agent ID to handle inbound messages'),
            allowed_senders: z.array(z.string()).optional().describe('Sender whitelist (email only; empty = allow all)'),
            inbound_address: z.string().optional().describe('Inbound email address (email only; usually auto-generated)'),
            default_channel_id: z.string().optional().describe('Slack channel ID to bind this workspace to, used for inbound mention routing when one Slack team is shared'),
        },
        async ({ channel_type, enabled, default_agent_id, allowed_senders, inbound_address, default_channel_id }, extra) => {
            const client = clientFactory(extra);
            const updates: Record<string, any> = {};
            if (enabled !== undefined) updates.enabled = enabled;
            if (default_agent_id !== undefined) updates.defaultAgentId = default_agent_id;
            if (allowed_senders !== undefined) updates.allowedSenders = allowed_senders;
            if (inbound_address !== undefined) updates.inboundAddress = inbound_address;
            if (default_channel_id !== undefined) updates.defaultChannelId = default_channel_id;

            if (Object.keys(updates).length === 0) {
                return {
                    content: [{
                        type: 'text' as const,
                        text: 'No updates provided — pass at least one field to change.',
                    }],
                    isError: true,
                };
            }

            const result = await client.updateChannel({
                channelType: channel_type,
                updates,
            });
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    server.tool(
        'set_channel_defaults',
        `Update workspace-wide channel defaults (rate limits, timeouts, tool mode).

These settings apply across all enabled channels:
- maxSessionsPerDay: Cap on inbound chat sessions per day (default 100)
- sessionTimeoutMinutes: Auto-close sessions after inactivity (default 60)
- toolMode: 'all' (all tools available) or 'mcp' (MCP-only tools)`,
        {
            max_sessions_per_day: z.number().optional().describe('Max inbound chat sessions per day (default 100)'),
            session_timeout_minutes: z.number().optional().describe('Auto-close session after inactivity in minutes (default 60)'),
            tool_mode: z.enum(['all', 'mcp']).optional().describe("Default tool mode for channel chats: 'all' or 'mcp'"),
        },
        async ({ max_sessions_per_day, session_timeout_minutes, tool_mode }, extra) => {
            const client = clientFactory(extra);
            const channelDefaults: Record<string, any> = {};
            if (max_sessions_per_day !== undefined) channelDefaults.maxSessionsPerDay = max_sessions_per_day;
            if (session_timeout_minutes !== undefined) channelDefaults.sessionTimeoutMinutes = session_timeout_minutes;
            if (tool_mode !== undefined) channelDefaults.toolMode = tool_mode;

            if (Object.keys(channelDefaults).length === 0) {
                return {
                    content: [{
                        type: 'text' as const,
                        text: 'No updates provided — pass at least one field to change.',
                    }],
                    isError: true,
                };
            }

            const result = await client.updateChannelDefaults(channelDefaults);
            return {
                content: [{
                    type: 'text' as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );
}
