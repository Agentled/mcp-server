#!/usr/bin/env node
import { readHookInput, stopContinuation } from './agentled-hook-lib.mjs';

const input = await readHookInput();
if (input.stop_hook_active) process.exit(0);

const lastMessage = String(input.last_assistant_message || '').toLowerCase();
const looksLikeHandoff = /\b(implemented|changed|updated|fixed|ready|done|validation|validated|deployed|handoff)\b/.test(lastMessage);
const agentledRelated = /\b(agentled|workflow|routine|mcp|cli|codex|business loop|managed agent)\b/.test(lastMessage);

if (!looksLikeHandoff || !agentledRelated || lastMessage.includes('readiness:')) {
  process.exit(0);
}

stopContinuation([
  'Before your final answer, add a concise Agentled handoff.',
  'Include readiness, validation evidence, side effects/credits/writes, and the next decision.',
  'Use the business-loop split where relevant: Codex automations for outside-workspace FDE cadence; Agentled routines for workspace/runtime inspection; Agentled feedback tools for explicit product feedback.',
].join('\n'));
