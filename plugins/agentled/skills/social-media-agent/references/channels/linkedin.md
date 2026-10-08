# Channel: LinkedIn organization Page

This channel reference narrows Social Media Management to one exact LinkedIn organization actor. It does not add provider behavior, account authority, connection, approval, scheduling, publication, analytics, or recurrence.

## Before connection

- Start from one verified source or product insight. Revalidate drift-prone claims and omit stale pricing, revenue, customer, adoption, or performance numbers, private customer data, and private deal data.
- Fix the intended organization actor, organization ID, Page URL, current human administrator identity, and proposed publication time/timezone in the packet. Never fall back to a personal-profile actor when the organization actor is unavailable.
- Produce final mobile-readable copy plus source/claim review, tags if useful, duplicate-topic and duplicate-image evidence or an explicit limitation, and one exact approval boundary.
- Reuse the workspace brand brief and approved assets. For a landscape Page post, default to a 1200x627 PNG with one strong headline, minimal supporting text, generous safe margins, and a composition distinct from recent images.
- Prefer an approved existing image. If generation is needed, use exactly one authorized `openai.generate-image` attempt for the approved brief and credit boundary, verify the actual artifact and visible words, and do not retry automatically.
- Include an alt text companion draft that describes the actual reviewed asset. The current organization-post action does not accept or transmit the companion alt text draft. Do not claim that alt text was published.
- Ask at most one question only when the missing source, offer, audience, organization destination, or brand input prevents a grounded packet.

## Connection, approval, and write

- Return the useful packet before asking for a connection. A useful draft does not imply that LinkedIn is connected or that the administrator or organization identity has been verified.
- Use one exact LinkedIn organization connection with authority for the requested organization ID. The organization connection and current human administrator identity must both be verified before any public write. Never fall back to a personal-profile actor when the organization actor is unavailable.
- Verify the active `linkedin.create-post-organization` schema before approval. Its normalized executable input contains `organizationId`, `text`, optional `mediaUrl`, and any active connection selector. A local asset path is not a runtime-ready media URL.
- Freeze the exact organization actor, organization ID, Page URL, exact copy, exact media, alt text companion draft, publication time and timezone, connection selector, and executable input. Any payload, actor, destination, media, or time change invalidates approval.
- Invoking `linkedin.create-post-organization` can publish. Require existing AgentLed connection, permission, explicit approval, billing policy, and due-time evidence before one bounded public-write attempt.
- Do not retry automatically after an ambiguous provider result. Reconcile the existing durable action/execution state first.

## Proof, metrics, and recurrence

- Prove one organization post only from an unambiguous existing execution/audit result containing `postUrl`, `postId`, `actorUrn`, and matching organization ID. A public permalink without matching organization identity, or organization identity without the public permalink, is partial.
- Do not claim that alt text was published; the current action does not transmit the companion draft.
- After public proof, `linkedin.get-post-metrics` may make one bounded owner-only read for the exact proven post and organization. Missing or delayed metrics are reported, not invented, and do not erase publication proof.
- Offer **Make this twice weekly** only after one proven result and a durable content ledger can deduplicate topics, images, approvals, and attempts. Claim **Paused recurrence** only from an authoritative existing paused routine record. Activation remains a separate existing routine action and approval boundary.
