# Selective context loading

Load only context relevant to the explicit goal.

## AgentLed host

Use the authenticated workspace context, knowledge, and files AgentLed exposes for the current workspace. Load only the company facts, brand guidance, editorial rules, or named brief needed for the request. Do not require or infer a local root.

## Hermes host

Use only the caller-selected root.

1. Read `AGENTS.md` for local operating rules.
2. Read `company.md` only when company or product facts matter.
3. Read the selected brand's `brand.md` only when voice or explicitly requested durable preferences matter.
4. Read `content/guidelines.md` only for relevant editorial constraints.
5. Read `first-task.md` or another named brief only when it scopes the request.

Do not discover another root, load global context, select a nested root, search sibling roots, or borrow facts, preferences, or audience claims from another brand.

If needed context is absent, begin with `Partial result:`, state the gap, make only a bounded assumption when safe, and give one recovery step.
