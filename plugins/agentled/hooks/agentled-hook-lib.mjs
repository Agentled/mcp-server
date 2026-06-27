const MAX_TEXT = 700;

export async function readHookInput() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function redact(text) {
  return String(text ?? '')
    .replace(/wsk_[A-Za-z0-9._-]+/g, 'wsk_...')
    .replace(/(AGENTLED_API_KEY=)[^\s]+/g, '$1...')
    .replace(/(api[_-]?key["']?\s*[:=]\s*["']?)[A-Za-z0-9._-]+/gi, '$1...');
}

export function truncate(text, max = MAX_TEXT) {
  const normalized = redact(text).replace(/\s+/g, ' ').trim();
  return normalized.length > max ? `${normalized.slice(0, max - 1)}...` : normalized;
}

export function signalCategory(text) {
  const lower = String(text ?? '').toLowerCase();
  if (/\b(client|customer|user|prospect|lead|workspace|account)\b/.test(lower)
      && /\b(need|pain|asked|wants|priority|feedback|blocked|confused)\b/.test(lower)) {
    return 'client_need';
  }
  if (/\b(weekly|week|wbr|priority|priorities|roadmap|planning)\b/.test(lower)) return 'priority';
  if (/\b(fail|failed|failure|error|broken|regression|blocked|stuck)\b/.test(lower)) return 'failure';
  if (/\b(product gap|ux gap|missing|confusing|unclear|follow-up|follow up)\b/.test(lower)) return 'product_gap';
  if (/\b(agentled|workflow|pipeline|routine|approval|builder work|mcp|cli|knowledge graph|kg)\b/.test(lower)) {
    return 'agentled_work';
  }
  return null;
}

export function shouldCapture(text) {
  return Boolean(signalCategory(text));
}

export function additionalContext(hookEventName, additionalContextText) {
  if (!additionalContextText) return;
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName,
      additionalContext: additionalContextText,
    },
  }));
}

export function stopContinuation(reason) {
  console.log(JSON.stringify({
    decision: 'block',
    reason,
  }));
}

export function shortToolText(input) {
  const toolName = input.tool_name || '';
  const command = input.tool_input?.command || '';
  const response = typeof input.tool_response === 'string'
    ? input.tool_response
    : JSON.stringify(input.tool_response ?? '');
  return truncate(`${toolName} ${command} ${response}`, 900);
}

export function guidanceForCategory(category) {
  switch (category) {
    case 'client_need':
    case 'priority':
      return [
        'If this is outside the Agentled workspace runtime, propose a Codex automation for follow-up cadence such as client emails, vendor replies, or FDE build checks.',
        'If it is Agentled workspace/runtime state, use Agentled routines or MCP/CLI inspection instead.',
      ].join(' ');
    case 'failure':
    case 'product_gap':
      return [
        'If the user wants this reported to Agentled, use submit_feedback_to_agentled or `agentled feedback submit` with a clear title and description.',
        'Do not create a private local feedback log.',
      ].join(' ');
    case 'agentled_work':
      return [
        'Map the work to the business-loop layer it affects: use case, SOP, skill, workflow, routine, managed agent, approval gate, execution, or Knowledge Graph memory.',
        'Keep external writes and publish actions behind explicit approval.',
      ].join(' ');
    default:
      return '';
  }
}
