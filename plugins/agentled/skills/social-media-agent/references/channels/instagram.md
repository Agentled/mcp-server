# Channel: Instagram

Instagram v0 is one bounded image-post Job for one exact Business or Creator account, with a bounded post-connection evidence review. The channel reference narrows the draft and proof requirements; it does not add provider behavior or permission. If an active action, schema, or durable receipt capability is unavailable or incompatible, return a partial result, identify the missing runtime evidence, and stop.

## Before connection

- Use public business context and available workspace knowledge to ground the post.
- Produce one public `image/jpeg` artifact at exactly 1080x1350, one Instagram-native caption, an alt text draft, and a short rationale before asking for an Instagram connection. A concept, prompt, storyboard, or unverified-size image is not Draft ready.
- Verify that the active `openai.generate-image` action returns the required exact derivative for this Job. Verify the returned public artifact is 1080x1350 JPEG; if that evidence is absent, keep the result partial and do not ask for connection.
- Make exactly one `openai.generate-image` attempt before connection. Do not retry automatically; another generation attempt requires explicit user authorization.
- Keep the caption natural for Instagram: a clear hook, useful body copy, and a restrained call to action when supported by the source context. Do not invent product claims, audience details, testimonials, or results.
- Write alt text that describes the actual returned image content and purpose. If the image is not available, say so instead of inventing visual details. The existing Instagram action accepts the alt text as part of the frozen approval input and forwards it with the image post.
- Ask at most one missing-input question, limited to the offer or audience that blocks a grounded draft.

## Connection and evidence review

- Use the existing AgentLed Instagram connection surface to connect and select one exact Business or Creator account. Require reconnect, exact-account, and scope proof when the stored connection is stale, ambiguous, or missing the required Instagram scopes. Listing or recommending an app or action grants no permission or authority. Invoking `openai.generate-image` can spend credits. Invoking `instagram.create-media-post` can publish. Both remain governed by existing AgentLed credit/spend and approval policies.
- After connection, call `instagram.list-recent-media` once for one bounded recent-media page for the selected owned account. Choose an explicit sample of at most three returned media IDs or permalinks, then call `instagram.get-media-insights` only for that sample and its supported media-product insights. Revise the candidate only when that evidence changes the recommendation; otherwise preserve the grounded candidate. Do not fall back to public, unowned, or unbounded data.
- If `instagram_manage_insights` or analytics evidence is unavailable, preserve the grounded draft, report the gap, and do not block the first approved static post or request comments/moderation scope solely for analytics.
- The existing AgentLed approval input freezes the full strict normalized `instagram.create-media-post` input: `accountId`, `mediaUrl`, `caption`, `altText`, `imageProfile=instagram_post_portrait`, `mediaType=IMAGE`, and any connection selector present. Any input or destination change invalidates approval. Do not fall back to legacy non-strict input. Require existing AgentLed approval and authority before one bounded public write.
- Durable receipt states record the attempt through `pending`, `claimed`, `container_dispatching`, `container_created`, `publish_dispatching`, `published`, `complete`, `permalink_pending`, `failed`, or `outcome_unknown`. An ambiguous provider outcome is partial/unproven and must never invite an automatic retry; reconcile the durable receipt instead.
- Full comments and moderation permissions are deferred and are not a first-post dependency. Do not request those scopes solely to cover missing analytics evidence.

## Proof

After the active action and receipt capability return evidence, a post is proven only when one unambiguous execution/audit result includes the external media ID and a public permalink. A successful request without those values, or an ambiguous provider outcome, is not public proof. Keep the result partial or unproven and identify the missing runtime evidence.
