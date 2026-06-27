#!/usr/bin/env node
import { additionalContext, readHookInput } from './agentled-hook-lib.mjs';

await readHookInput();

const context = [
  'Agentled Codex hooks are active.',
  'Hooks are in-session guidance only: they do not store feedback, create reminders, run automations, call Agentled APIs, spend credits, or write workspace data.',
  'Use Agentled MCP/CLI to inspect and improve business loops: use cases, SOPs, skills, workflows, routines, managed agents, approvals, executions, and Knowledge Graph memory.',
  'Use Codex automations for outside-workspace FDE cadence such as Outlook/client email follow-up, vendor replies, repo/build checks, and weekly operator reviews.',
  'Use Agentled routines for Agentled workspace/runtime checks such as workflow health, routine health, execution review, workspace summaries, and managed-agent operations.',
  'When the user explicitly wants product feedback captured, use submit_feedback_to_agentled or `agentled feedback submit`; do not invent a local feedback store.',
  'Before finishing Agentled work, include readiness, validation evidence, side effects, and the next decision.',
].filter(Boolean).join('\n');

additionalContext('SessionStart', context);
