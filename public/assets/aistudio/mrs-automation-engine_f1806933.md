# M R S — Automation Engine Update (Follow-up Prompt for Google AI Studio)

Paste everything below the line into the same AI Studio project as a follow-up prompt. It builds on the earlier prompts (site + portal, service work systems, links/IDs + pay-after-delivery, completion additions). **Do not remove existing features.** Where this update conflicts with earlier rules (for example "only the owner verifies payments"), **this update wins**, as described in section 0.

**Implementation tip:** build in the phases listed in section 12 and test each phase before starting the next.

---

Add an **Automation Engine** so the owner runs the business with minimal manual steps: **order → quote → payment → work → delivery → follow-up**. Automation must be safe by default: every automation has a mode (off, suggest only, auto with approval, fully automatic), clear limits, full logs, and a kill switch.

# 0. Changes to earlier rules
- A payment is `paid_verified` when **the owner OR an enabled, rule-based automation** verifies it. Verification by automation must satisfy every condition of its rule (section 4) and is logged as "by automation". Anything that does not pass is sent to the owner's manual queue exactly as before.
- Final files unlock automatically when an invoice becomes `paid_verified`, whichever way that happened.
- AI-generated drafts are never delivered to a client unless the owner approved them, or the owner has switched a specific service to "auto-deliver after QA checks" (section 6).

# 1. Automation Engine architecture
Implement a simple, reliable engine on the server side (use the platform's server functions and scheduled jobs; if scheduled jobs are not available, create the endpoints and document how to trigger them from an external scheduler or n8n/Make webhooks).

- **Events:** every important thing writes an event to an `events` collection: `order.created`, `order.intake_incomplete`, `quote.sent`, `quote.accepted`, `invoice.issued`, `payment.submitted`, `payment.auto_matched`, `payment.verified`, `payment.rejected`, `invoice.overdue`, `deliverable.draft_ready`, `order.delivered`, `order.approved`, `subscription.activated`, `subscription.expiring`, `message.received`, `ticket.opened`, and similar.
- **Rules:** an `automations` collection. Each rule has: name, trigger event, conditions, actions, mode, limits, active flag.
- **Actions library:** send email, send in-app notification, send Telegram alert, create task, create/update records, generate document, call Gemini, call webhook, schedule a job, change status, issue invoice, unlock files.
- **Jobs:** a `jobs` collection for scheduled and delayed work (reminders, expiry checks, daily reconciliation) with `runAt`, `status`, `attempts`, `lastError`.
- **Reliability:** idempotency keys (the same event never triggers the same action twice), retries with exponential backoff (max 5), dead-letter list for jobs that keep failing, and a failure alert to the owner.
- **Webhooks:** inbound endpoints with a shared secret and signature check; outbound webhooks to n8n/Make/Zapier (URL set in admin) for any event the owner chooses.
- **Secrets:** API keys and tokens live in server environment secrets, never in the database or client code.
- **Logs:** an `automationRuns` collection: rule, event, input summary, result, duration, who/what triggered it, errors. Mask personal and payment data in logs.

# 2. Automation Control Center (admin page)
- List of all automations with **mode selector**: Off · Suggest only · Auto with approval · Fully automatic.
- **Global kill switch:** pauses all automations instantly; a banner shows when it's on.
- **Dry-run mode:** shows what each automation would have done without doing it.
- Thresholds and limits: maximum amount that can be auto-verified, maximum auto-quote value, AI confidence thresholds, daily AI-call and cost cap, maximum automatic emails per client per day.
- Run history with filters (success / failed / skipped), "Retry" and "Replay" buttons, and failure alerts.
- **Approval inbox:** every "Auto with approval" action waits here with Approve / Edit / Reject buttons (also reachable from the Telegram bot).
- **Automation KPIs:** touchless rate (orders completed with no manual step), time to quote, time to verify payment, time to deliver, failure rate, estimated hours saved this month.
- Every automated change shows "by automation" in the order timeline and audit log.

# 3. Order intake automation (service ID aware)
1. **Completeness check:** on submit, validate the service's required intake fields. If something is missing or unclear (checked by rules, and by Gemini for free-text), the system automatically asks the client for exactly what's missing in the order thread and pauses the clock.
2. **AI triage (Gemini):** classify the request, extract key facts, estimate complexity (basic / standard / complex / urgent), flag risks (unclear scope, unrealistic deadline, request outside the catalog, sensitive data), and write a 3-line internal summary. Show it at the top of the order for the owner.
3. **Auto-quote:**
   - Fixed-price services (S-MRS-05, S-MRS-06, S-GRV-01, S-IPTV-01 plans) → quote and invoice are generated instantly from the price.
   - Hourly and range-priced services → compute a suggested quote from the service's `pricingRule` and the triage complexity. If the amount is below the owner's auto-quote limit and AI confidence is above the threshold, send automatically (or "auto with approval" if the owner prefers). Otherwise place it in the Approval inbox.
4. **Auto-setup after acceptance:** create the client record and Client ID + PIN (if new), assign the trust tier and payment mode, create the kickoff checklist, schedule the first reminders, create the order folder, and send the portal login details.
5. **Spam and abuse filter:** bot protection score, duplicate submissions, disposable email detection, nonsense text; suspicious orders go to a review list and don't notify the owner.
6. **Auto-booking:** for services with sessions or calls, show the booking picker straight after acceptance and attach the booking to the order.

# 4. Payment automation ladder
Payments are currently manual. Build this ladder so the owner can move up gradually, switching each level on only when ready. Each level uses the same invoice, `trxKey` uniqueness and fraud checks as before.

**Level 1 — Assisted manual (build first)**
- "Paste payment SMS" helper already specified; improve it: after parsing, the system finds the matching open invoice by payment reference code, amount and time, shows a green match card, and the owner confirms with **one tap** (also available as a button in the Telegram alert).

**Level 2 — Phone SMS bridge (optional, for mobile banking)**
- Endpoint `/api/payments/sms-webhook` that accepts messages forwarded from the owner's Android phone (using an SMS-forwarding app configured by the owner to post to the webhook with a secret token).
- Accept only messages from configured **sender IDs** (e.g. the mobile-banking provider's sender name, set in admin), parse the transaction ID, amount, sender number and time (best-effort parsers per provider; the owner can edit patterns in admin), and store them in a `incomingPayments` collection.
- **Auto-match** to an open invoice when ALL are true: the transaction ID is unique, the amount ≥ amount due (tolerance set in admin), the message arrived after the invoice was issued, and the client submitted proof with the same transaction ID **or** the payment reference code is in the message.
- **Auto-verify** only if the invoice amount is **below the auto-verify limit** (admin setting, default $50), every condition above passes, and the client is not flagged. Otherwise show the match in the Approval inbox for one-tap confirmation.
- Daily **reconciliation job:** lists forwarded payments that matched no invoice, and invoices marked verified by automation, for the owner to glance through.
- Safeguards to show in admin help: forwarded messages could be forged or delayed, so keep the limit low, use the daily reconciliation, and check the provider's own app regularly. The phone must stay powered and online.

**Level 3 — Crypto auto-verification (optional)**
- When the client submits a TxHash for a crypto method, the server checks a public block-explorer API (provider and key set in admin) for: recipient address equals the configured wallet, asset and network match, amount ≥ invoice amount (after stablecoin decimals), confirmations ≥ the admin-set minimum, the transaction time is after the invoice was issued, and the hash is unused.
- If everything passes → auto-verify (up to the crypto auto-verify limit); otherwise → Approval inbox with the reasons.

**Level 4 — Payment gateway (extension point only)**
- Define a `PaymentProvider` interface: `createCheckout(invoice)`, `handleWebhook(request)` with signature verification and idempotency, `refund()`. Ship it with a stub implementation and instructions, so that a gateway can be connected later if the owner gets a merchant account. Do not hard-code any gateway.

**All levels:** partial payments, overpayments and duplicate transaction IDs follow the earlier rules; failed auto-verification never rejects automatically — it sends the item to the owner.

# 5. Work automation: AI draft pipelines
Add an **AI Draft Studio** inside each order. It only runs for services that allow it (`aiDraftEnabled` per service; seed the ones below). Every draft is labeled **"AI draft — requires owner review"**, keeps the inputs it used, and is never visible to the client until approved.

| Service ID | Automated draft |
|---|---|
| S-MRS-06 ATS CV | Reads intake + target job descriptions; builds a structured CV with keywords; renders DOCX and PDF from a template; produces an ATS keyword match report |
| S-MRS-02 Technical Writing & Proofreading | Proofreading pass with suggested edits and a change summary (tracked-change style); outline and first draft for writing tasks |
| S-MRS-11 Data Entry | Extracts fields from uploaded PDFs/images into the client's template with a per-row confidence score; low-confidence rows are highlighted for the owner |
| S-MRS-12 Online Learning Resources | Draft notes, quizzes with answer keys, flashcards, source list (sources must be verified links) |
| S-GRV-01 / S-GRV-02 | Bio options, display-name ideas, a short consistency checklist from the client's public links |
| S-MRS-09 Graphics Design | Copy and layout text options, color/font suggestions from the brand notes (the design itself is made by the owner) |
| S-MRS-07 Web Setup / S-MRS-03 Website Management | Setup checklist, page content drafts, SEO titles and descriptions, a monthly care report from the time log |
| S-MRS-01 AI & Digital Productivity | Process map draft and workflow spec from the intake answers |
| S-MRS-04 IT Support | Troubleshooting runbook suggestions and a fix-log draft from the owner's notes |

For services not listed (tutoring, virtual assistance, domain mapping, IPTV, app store publishing), automate the surroundings: checklists, scheduling, reminders, time logs, reports and templates.

Rules for AI work:
- A per-order switch **"Do not use AI on this order"** (client can request it at order time; the order agreement and Privacy Policy explain that AI tools may assist with drafts, and that the owner reviews all work).
- Do not send sensitive data (IDs, passwords, payment details) to the model; redact before calling it.
- No invented facts: drafts must not add experience, credentials, quotes or sources that are not supplied or verifiable; unknowns are marked `[CHECK]` for the owner.
- A daily cap on AI usage; show the usage count in the Control Center.

# 6. Delivery automation
1. **Owner review screen:** side by side — the draft, the client's inputs, and the service's QA checklist. Owner edits and ticks the checklist.
2. **One-click Deliver** (or automatic when the owner has enabled "auto-deliver after QA" for that service and the QA checklist, AI-confidence and plagiarism/blank-field checks pass): generates final files, the **watermarked preview**, and the delivery note (AI-filled from the template, editable); sets `Delivered`; issues the invoice (or the balance invoice); emails the client the preview and payment link.
3. **On `paid_verified`:** unlock files, generate the receipt, send the final-files email, schedule the 5-day auto-approve and the feedback request.
4. **After completion:** automatic access-removal reminders to the owner for services where access was granted; auto-archive; schedule "reorder" and re-engagement messages (e.g. CV refresh at 6 months, website care at 30 days).
5. **Deadline tracking:** a job watches each order's delivery date; at 24 hours before and on the due date it alerts the owner and shows risk on the Today view.

# 7. IPTV automation
- Define an `IptvProvider` interface: `createSubscription`, `renew`, `suspend`, `getStatus`, with a **manual implementation** by default (the owner enters credentials in the admin panel and they appear only in the client's portal) and a clearly documented place to plug in a provider API if one exists. Do not invent any provider API.
- Automatic flow: payment verified → create the subscription record with dates → if a provider integration is configured, activate it; otherwise create a task for the owner "Activate subscription {Order ID}" with the credentials form and a one-tap Telegram link.
- Jobs: expiry reminders at 7/3/1 days, auto-lock on expiry, renewal invoice generation 7 days before expiry with a one-tap renew button.
- **Support auto-reply:** a Gemini assistant answers setup and troubleshooting questions strictly from the device guides and FAQ; if it can't answer or the client asks twice, it opens a support ticket and alerts the owner. It never promises refunds, outages or channel availability.

# 8. Communication automation
- **Event → message map** (admin-editable): each event sends the email/template listed in the earlier prompt, plus an in-app notification.
- **Telegram admin bot (recommended):** the owner connects a Telegram bot (created through BotFather; token stored as a secret; allowed chat ID(s) stored in settings). It sends alerts for: new order, quote needing approval, payment submitted/matched, draft ready, overdue invoice, deadline risk, failed automation. Inline buttons: **Approve**, **Reject**, **Open in app**. Only the allowed chat IDs can act; actions that move money (verify payment) always show the full details first and require a tap on **Confirm**.
- **WhatsApp:** by default generate click-to-chat links with prefilled text; leave a clearly marked extension point for the WhatsApp Business Cloud API if the owner qualifies later.
- **Smart follow-ups (jobs):** quote not accepted after 48h → reminder; kickoff items missing → reminder at 24h/72h; unpaid invoice ladder (already specified); no response 5/10/21 days (already specified); review request 2 days after completion; referral prompt after a 5-star review.
- **Quiet hours:** automatic messages to clients respect their time zone (no sends between 22:00 and 08:00 local time except urgent payment and delivery notices).

# 9. Data model additions
`events`, `automations`, `automationRuns`, `jobs`, `incomingPayments` (source, rawMasked, parsed fields, matchedInvoiceId, status), `aiDrafts` (orderId, serviceId, inputsRef, output, status: `draft` | `reviewed` | `approved` | `rejected`, reviewedBy, model, createdAt), `integrations` (type, status, config non-secret), `approvals` (action, payload, requestedBy, status, decidedBy, decidedAt), `settings.automation` (limits, thresholds, modes, quiet hours, kill switch), service fields `aiDraftEnabled`, `autoQuote`, `autoDeliverAfterQA`.

# 10. Security and guardrails
- Automations run with least privilege; payment verification, refunds, tier changes to Blocked, deleting data and sending final files require either a rule that passes every condition or the owner's approval — never Gemini's decision alone.
- AI output is treated as untrusted text: sanitize before display, never execute it, never let it change invoice amounts or payment status.
- Verify webhook signatures and secret tokens; reject replays (timestamp + nonce); rate-limit all inbound endpoints.
- Telegram and webhook actions are authenticated and logged; allowed chat IDs only.
- Mask account numbers, transaction IDs (show only the last 4) and personal data in logs and alerts to third parties.
- Every automation can be switched to Off or Suggest-only instantly; the kill switch always works.

# 11. Honest limits to show in the admin help text
- Services that are human work (IT support, tutoring, virtual assistance, live website changes, design) cannot be fully touchless; the engine automates intake, quoting, scheduling, reminders, documents, invoicing, verification and follow-ups around them.
- Automatic payment confirmation without a gateway depends on your phone forwarding messages or on the crypto explorer check; keep limits low and review the daily reconciliation.
- AI drafts need a quick human review before delivery.

# 12. Rollout phases (build and test in this order)
1. **Foundation + quick wins:** event/job engine, Control Center, Approval inbox, kill switch, Telegram bot alerts, intake completeness check, AI triage, auto-quote for fixed-price services, smart follow-up jobs.
2. **Payments:** Level 1 one-tap matching, then the Level 2 SMS bridge (with a $50 default limit), reconciliation job, then Level 3 crypto verification.
3. **AI Draft Studio and delivery:** start with S-MRS-06 (CV), S-MRS-02 (proofreading) and S-MRS-11 (data entry); owner review screen; one-click Deliver; auto-unlock, receipts, completion jobs.
4. **IPTV and extensions:** IPTV provider interface and support auto-reply, payment-provider and WhatsApp extension points, automation KPIs, remaining AI drafts.

# 13. Acceptance checklist
- [ ] Kill switch, dry-run mode and per-automation modes work; every automated action is logged "by automation"
- [ ] Incomplete intake triggers an automatic question to the client; triage summary appears on the order
- [ ] Fixed-price services auto-quote and auto-invoice; range-priced quotes land in the Approval inbox or send automatically within the owner's limits
- [ ] Telegram alerts arrive with working Approve/Reject/Confirm buttons; only allowed chat IDs can act
- [ ] Pasted or forwarded payment messages match the right invoice; a payment under the auto-verify limit with all conditions passing verifies automatically; any failed condition goes to the owner
- [ ] Crypto TxHash checks verify recipient, asset, network, amount, confirmations and uniqueness before auto-verifying
- [ ] Duplicate transaction IDs are never accepted twice; daily reconciliation lists unmatched payments
- [ ] AI Draft Studio produces drafts for the seeded services, marks them "requires owner review", respects the "no AI on this order" switch, and never shows drafts to clients before approval
- [ ] One-click Deliver generates the files, watermarked preview, delivery note and invoice, and emails the client
- [ ] On verified payment: files unlock, receipt is generated, final-files email is sent, feedback request is scheduled
- [ ] IPTV: payment verified creates the subscription and an activation task (or activates through a configured provider); expiry reminders, auto-lock and renewal invoices run
- [ ] Failed jobs retry, then alert the owner; nothing runs twice for the same event
- [ ] Automation KPIs show touchless rate and time metrics
- [ ] All earlier features still work

# 14. Owner setup list (not for AI Studio — do these yourself)
Create the Telegram bot with BotFather and note your chat ID · install an SMS-forwarding app on your Android phone and set the webhook URL and secret (after checking your mobile-banking provider's terms) · test with small real payments before raising any auto-verify limit · get a block-explorer API key if you accept crypto · set your Gemini usage cap · keep your phone charged and online · review the daily reconciliation for the first month · add a line to your Terms and Privacy Policy that AI tools may assist with drafts and that you review all work.
