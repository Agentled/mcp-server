# Proof and approval

This reference keeps native AgentLed state separate from Markdown guidance. If an active action, schema, or durable receipt capability is unavailable or incompatible, return a partial result, identify the missing runtime evidence, and stop. Existing AgentLed records remain authoritative for permissions, connections, approvals, execution, receipts, credits, and routines.

## State contract

| State | Minimum evidence | Safe claim |
| --- | --- | --- |
| Draft ready | Public 1080x1350 JPEG, Instagram-native caption, alt text draft, rationale, and source context | A useful draft is ready; no connection or publication occurred. An unverified artifact remains partial. |
| Awaiting connection | Draft-ready artifact plus one exact Business or Creator account connection request | The user can connect/select the exact account; no account is connected by the skill. |
| Owned evidence reviewed | One bounded recent-media page and an explicit sample of at most three returned media IDs or permalinks, with supported media-product insights when available | The candidate is revised only when that evidence changes the recommendation. If insights or analytics evidence is unavailable, preserve the grounded draft and report the gap. |
| Awaiting exact approval | Full strict normalized `instagram.create-media-post` input: `accountId`, `mediaUrl`, `caption`, `altText`, `imageProfile=instagram_post_portrait`, `mediaType=IMAGE`, and any connection selector present | The exact public write is waiting for explicit approval and existing authority. Any input or destination change invalidates approval. |
| Receipt in progress or unresolved | Durable receipt state such as `pending`, `claimed`, `container_dispatching`, `container_created`, `publish_dispatching`, `published`, `complete`, `permalink_pending`, `failed`, or `outcome_unknown` | Reconcile the state; an ambiguous result is not an automatic retry. |
| Published proof | One unambiguous existing execution/audit record with external media ID and public permalink | One observed attempt has public proof. |
| LinkedIn draft ready | Final organization-page copy, verified source and claim review, exact organization destination, proposed publication time, 1200x627 image asset or exact brief, alt text companion draft, and duplicate-check evidence or limitation | A useful LinkedIn approval packet is ready; no connection or public write is implied. |
| Awaiting LinkedIn connection | LinkedIn draft-ready packet plus the exact organization actor, organization ID, Page URL, and current human administrator identity | The exact organization connection can be selected and verified; no personal-profile fallback is allowed. |
| Awaiting exact LinkedIn approval | Exact organization actor, organization ID, Page URL, copy, media, alt text companion draft, publication time/timezone, active connection selector, and normalized `linkedin.create-post-organization` input | The exact organization write is waiting for explicit approval and existing authority. Any payload, actor, destination, media, or time change invalidates approval. |
| LinkedIn receipt in progress or unresolved | Existing action/execution state for the exact approved organization write, without complete proof fields | Reconcile the state; an ambiguous provider outcome is not an automatic retry. |
| LinkedIn published proof | One unambiguous existing execution/audit result with `postUrl`, `postId`, `actorUrn`, and matching organization ID | One exact organization-page publication is proven. Do not claim that the companion alt text was published. |
| Partial or unproven | One or more required inputs, artifacts, approval, execution values, media ID, or permalink is missing | Report only the facts evidenced and identify the next safe step. |
| Paused recurrence | Channel-specific public proof exists and an authoritative existing routine record says the cadence is paused | The paused channel cadence may be reported; it is not active. |

## Approval rules

- Listing or recommending an app or action grants no permission or authority. Invoking `openai.generate-image` can spend credits. Invoking `instagram.create-media-post` can publish. Both remain governed by existing AgentLed credit/spend and approval policies.
- A concept, prompt, storyboard, or unverified-size image is not Draft ready. No public 1080x1350 JPEG evidence means a partial result and no connection request.
- Verify the active `openai.generate-image` schema and returned public artifact before calling the draft ready; if the action or schema is unavailable, return partial and stop.
- The existing approval surface binds the full strict normalized `instagram.create-media-post` input: `accountId`, `mediaUrl`, `caption`, `altText`, `imageProfile=instagram_post_portrait`, `mediaType=IMAGE`, and any connection selector present. Missing approval or existing authority is a hard stop for public writes. Any input or destination change invalidates approval. Do not fall back to legacy non-strict input.
- Do not reuse approval for a changed artifact, another account, or another publication. A durable receipt state is authoritative for the attempt.
- An ambiguous provider outcome is partial/unproven and must never invite an automatic retry from Markdown guidance.
- A draft, provider response, task ID, container ID, or optimistic status is not publication proof by itself.
- For LinkedIn, prepare the useful approval packet before requesting a connection. Verify the exact organization actor, organization ID, Page URL, current human administrator identity, source review, final copy, media, alt text companion draft, and publication time/timezone. Do not substitute a personal-profile actor.
- The active `linkedin.create-post-organization` write input contains `organizationId`, `text`, `mediaUrl`, and any active connection selector. The current action does not accept or transmit the companion alt text draft, so do not claim that alt text was published. Any payload, actor, destination, media, or time change invalidates approval.
- Invoking `linkedin.create-post-organization` can publish. Require existing AgentLed connection, approval, authority, and billing policy before one bounded public-write attempt. Do not retry automatically after an ambiguous provider outcome.

## Publication proof and recurrence

Require both an external media ID and a public permalink from one unambiguous existing execution/audit result before using the word published or offering **Make this weekly**. If either is absent or the provider outcome is ambiguous, report partial or unproven and do not offer recurrence as if the post succeeded.

For LinkedIn organization posts, require `postUrl`, `postId`, `actorUrn`, and matching organization identity from one unambiguous existing execution/audit result before using the word published or offering **Make this twice weekly**. `linkedin.get-post-metrics` is an optional bounded owner-only read after public proof; missing metrics do not erase publication proof and must not be invented. Keep the content ledger and every recurring occurrence destination-bound, duplicate-checked, and separately approved under the existing routine runtime.

## Readiness boundary

An individual result is Draft ready only after the public 1080x1350 JPEG, caption, alt text draft, rationale, and sources are present. Reconnect, exact-account, and scope proof remain operational gates. If `instagram_manage_insights` or analytics evidence is unavailable, preserve the grounded draft and do not block the first approved static post or request comments/moderation scope solely for analytics. Full comments and moderation permissions are deferred and are not a first-post dependency.

Only after that public proof may the agent offer **Make this weekly**. Claim **Paused recurrence** only from an authoritative existing paused routine record. Generic paused-routine infrastructure exists, but this Job does not automatically configure a routine; keep any routine paused until the user separately reviews and activates it through the existing routine runtime.

Only after LinkedIn public proof may the agent offer **Make this twice weekly**. Claim **Paused recurrence** only from an authoritative existing paused routine record. Preparing or approving one post does not activate recurrence; keep a proposed LinkedIn routine paused until the user separately reviews and activates it through the existing routine runtime.
