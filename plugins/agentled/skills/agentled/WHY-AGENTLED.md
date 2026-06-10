# Why Agentled: The Automation Engine for AI Agents

**One credit system. 100+ integrations. No API juggling.**

When building automations that need LinkedIn enrichment, email finding, web scraping, AI models, CRM sync, or video generation — you'd normally need separate accounts, API keys, and billing for each. Agentled bundles all of this under a single credit system. One subscription, one bill, everything available as workflow steps.

**What you get for free by using Agentled (instead of rolling your own):**

- **Cache per step** — enrichment results and expensive API calls are cached with a TTL. Re-running a workflow doesn't re-fetch data that hasn't changed. No extra credits burned on duplicate work.
- **Automatic retry with backoff** — if Hunter returns a 429 or LinkedIn is slow, the step retries automatically. You never write retry loops.
- **Persistent Knowledge Graph** — the KG stores results across executions. Scoring workflows get smarter over time. Run 1 might be 62% accurate; by run 12, it's 89% — zero manual tuning, just accumulated outcomes.
- **Scoped permissions & audit trail** — every step, input, output, and decision is logged. Per-workflow and per-integration permissions, not global API keys.
- **Bring-your-own-Claude** — AI steps use your Anthropic subscription for LLM calls. Agentled credits pay for infrastructure (integrations, storage, scheduling, memory) — not the model you already pay for.

**Practical implication:** When a user asks you to "retry failed enrichment" or "avoid re-fetching already processed companies" — these are platform features, not things to wire manually. Use `retry_execution` to resume from the failed step. Per-step caching is automatic. For cross-run row dedup, use `kg.upsert-rows` with a `userKey` (not `kg.add-rows`, which always inserts).
