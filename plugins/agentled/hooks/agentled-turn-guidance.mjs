#!/usr/bin/env node
import {
  additionalContext,
  guidanceForCategory,
  euHighImpactLegalReviewGuidance,
  readHookInput,
  shortToolText,
  shouldCapture,
  signalCategory,
  truncate,
} from './agentled-hook-lib.mjs';

function argValue(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const source = argValue('--source', 'unknown');
const input = await readHookInput();
const hookEventName = input.hook_event_name || (source === 'prompt' ? 'UserPromptSubmit' : 'PostToolUse');
const text = source === 'prompt'
  ? truncate(input.prompt || '', 900)
  : shortToolText(input);

const legalReviewGuidance = euHighImpactLegalReviewGuidance(text);

if (!shouldCapture(text) && !legalReviewGuidance) process.exit(0);

const category = signalCategory(text);
const guidance = guidanceForCategory(category);

const context = [
  category ? `Agentled ${category} signal noticed in this Codex session; no local feedback file was written.` : null,
  guidance || null,
  legalReviewGuidance || null,
  'If this changes client needs, product priorities, or follow-up work, mention it in the final handoff.',
].filter(Boolean).join(' ');

additionalContext(hookEventName, context);
