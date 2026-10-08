# Job: Prepare a LinkedIn organization post

This implemented Social Media Management Job prepares, optionally publishes, and proves one organization-page post through existing AgentLed services. A Job is a named Markdown playbook, not a new record or runtime.

## Sequence

1. **Ground one useful idea.** Start from a verified source or product insight and the available workspace or public context. Revalidate drift-prone claims before final copy. Do not use stale pricing, revenue, customer, adoption, or performance numbers, expose private customer or deal data, or turn an inference into a fact.
2. **Fix the organization destination.** Record the exact organization actor, organization ID, Page URL, current human administrator identity, and proposed publication time and timezone. Never substitute a personal-profile actor when the organization actor is unavailable or ambiguous.
3. **Ask at most one question.** Ask one concise question only when a missing source, offer, audience, organization destination, or brand input blocks a grounded packet. Otherwise continue. If the answer is unavailable, return an honest partial with the missing evidence and stop.
4. **Create value before connection.** Return the useful approval packet before asking for a LinkedIn connection. Include final copy, source URLs and claim review, exact tag targets if any, the proposed publication time/timezone, a 1200x627 image asset or exact image brief, an alt text companion draft, duplicate-topic and duplicate-image evidence or an explicit limitation, and the exact approval boundary. Keep the copy native to LinkedIn: one concrete idea, mobile-readable paragraphs or restrained bullets, a supported call to action, and no more than three relevant hashtags.
5. **Use the brand supplied by the workspace.** Reuse approved brand assets and visual rules instead of inventing a new identity. Prefer a fitting existing asset. If a new image is required, invoke `openai.generate-image` only after explicit authorization for the exact brief and credit boundary, make at most one attempt, verify the returned artifact and visible words, and stop rather than retrying automatically. A local-only path is useful review evidence but is not a runtime-ready `mediaUrl` until an existing service returns an accessible URL.
6. **Keep alt text evidence honest.** Draft useful alt text for the reviewed image. The active `linkedin.create-post-organization` schema uses `organizationId`, `text`, and optional `mediaUrl`; it does not accept or transmit the companion alt text draft. Do not claim that alt text was published. If accessibility-complete media publication is required, report the capability gap instead of hiding it.
7. **Connect only after the packet is useful.** The organization connection and current human administrator identity must both be verified before any public write. Require the exact organization actor and organization ID, a current LinkedIn connection with organization authority, the active strict action schema, and existing AgentLed permission and approval surfaces. If any of those are missing or mismatched, preserve the packet, report the exact blocker, and stop. Do not substitute a personal-profile actor.
8. **Freeze the exact approval.** Bind the exact organization actor, organization ID, Page URL, exact copy, exact media, alt text companion draft, publication time and timezone, active connection selector, and normalized executable input containing `organizationId`, `text`, and optional `mediaUrl`. Any payload, actor, destination, media, or time change invalidates approval and requires a new exact review.
9. **Make one approved attempt.** Invoking `linkedin.create-post-organization` can publish. Require existing AgentLed connection, approval, authority, billing policy, and due-time evidence before one bounded public-write attempt. Do not retry automatically if the provider result or durable receipt is ambiguous; reconcile the existing attempt first.
10. **Prove the organization result.** Call the post published only when one unambiguous existing execution/audit result contains `postUrl`, `postId`, `actorUrn`, and matching organization ID. Publication proof requires a public permalink and organization identity from the same exact attempt. Missing or mismatched proof is partial or unproven.
11. **Review optional metrics after proof.** `linkedin.get-post-metrics` is an optional owner-only read after public proof. Use one bounded read for the proven post and organization. Missing metrics do not erase publication proof; report the gap and never invent reach or engagement.
12. **Offer recurrence after proof.** Offer **Make this twice weekly** only after one proven organization result and only when a durable content ledger can prevent duplicate topics, images, and writes. Claim **Paused recurrence** only from an authoritative existing paused routine record. A proposed cadence remains paused until separately reviewed and activated; every occurrence still needs its exact destination, copy, media, and time authority.

## Approval packet

Return these fields before any connection or public write:

- `status`: `approval-ready`, `partial`, or `no strong post due`;
- exact organization actor, organization ID, Page URL, and current administrator identity to verify;
- proposed publication date, time, and timezone;
- final post copy;
- source URLs, claim review, and caveats;
- exact tag targets and URLs, if any;
- exact existing image asset or one approved image brief, dimensions, and alt text companion draft;
- duplicate-topic and duplicate-image check, or the exact ledger limitation;
- the exact approval boundary and a statement that no connection or public action occurred.

If no directly relevant and well-supported idea is available, return `no strong post due`. Do not fill a calendar quota with weak content.

## Honest result contract

- **LinkedIn draft ready:** the full approval packet is present; no connection, image generation, scheduling, or publication is implied.
- **Awaiting LinkedIn connection:** the useful packet exists, but the exact organization connection or current administrator identity is missing or unverified.
- **Awaiting exact LinkedIn approval:** the actor, organization, destination, copy, media, companion alt text, time/timezone, connection selector, and executable action input are frozen; the public write still requires exact approval and existing authority.
- **LinkedIn receipt in progress or unresolved:** an attempt exists but proof is incomplete or ambiguous; reconcile it and do not retry automatically.
- **LinkedIn published proof:** one exact result contains `postUrl`, `postId`, `actorUrn`, and matching organization ID. Do not claim that the companion alt text was published.
- **Paused recurrence:** an authoritative existing routine record is paused; a cadence suggestion or approved post does not prove this state.
- **Partial or unproven:** useful work exists, but missing source, identity, connection, approval, due-time, action, receipt, permalink, or organization evidence prevents a stronger claim.

Never claim that a source was checked, an image was generated or uploaded, an account was connected, an administrator was verified, approval was granted, a post was scheduled or published, alt text was transmitted, metrics were read, or a routine was created or activated unless the existing service returned evidence for that exact fact.
