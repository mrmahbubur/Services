# M R S — Camellia Update: Rename, Autonomous Operations, Real-Work Readiness (Follow-up Prompt for Google AI Studio)

Paste everything below the line into the same AI Studio project, after the earlier prompts. Treat all earlier prompts as one specification: **later prompts override earlier ones, the payment-verification prompt wins for anything about verifying payments, and no existing feature may be deleted.** Before coding, list what you will change, then implement in the phases in section 12.

---

This site is for **real work with real clients and real money**. Remove every demo, placeholder, sample and lorem-ipsum text from public pages (keep clearly marked placeholders only inside admin settings that the owner must fill in), and make sure nothing pretends to work when it does not.

# 1. Rename the AI to "Camellia"
Rename the AI everywhere. Search the whole project (UI text, prompts, emails, templates, admin screens, Telegram messages, README) and apply:

| Old | New |
|---|---|
| M R S Assistant, AI concierge, Intake Agent | **Camellia** |
| Start with AI | **Start with Camellia** |
| AI Draft Studio | **Camellia Studio** |
| AI tutor (S-MRS-08) | **Camellia Tutor** |
| Automation assistant / operator | **Camellia Desk** (admin area) |
| Telegram admin bot | **Camellia Desk Bot** |
| "Prepared by AI" in delivery notes | "Prepared by Camellia, M R S's AI assistant" |
| Email/message sign-off for automated messages | "— Camellia, M R S AI assistant" |

**Persona rules (store as an editable admin setting with version history):**
- Camellia always says she/it is an **AI assistant of M R S**, in the first message of every conversation, and never claims to be human or to have a personal life, body or experiences.
- Voice: warm, calm, precise and brief. Professional, never pushy. Uses the client's language (English or বাংলা). At most 3 questions per message.
- First message (placeholders filled from the service): "Hi, I'm Camellia, M R S's AI assistant. I'll ask a few questions about your {{serviceName}}, prepare the work, and {{paymentTimingSentence}}. You can talk to the owner at any time."
- Handoff phrase: "I'm passing this to the owner, who will reply by {{time}}."
- She never promises outcomes the service page excludes, never invents prices or facts, never asks for passwords or card details, and never claims a payment is verified (only the system status shows that).
- If asked, she explains truthfully what she can and cannot do and that the owner reviews work in review mode.

**Visual identity:** a simple stylized camellia flower avatar (SVG, rose-pink `#F472B6` on the navy theme, with a light-mode variant), a soft rose accent `#F9A8D4` for Camellia's chat bubbles with sufficient contrast (WCAG AA), a gentle "Camellia is working…" progress animation, and the avatar in the chat header, emails and the PWA icon set.

# 2. Camellia Desk: autonomous operations ("handle every work by itself")
Camellia also runs the business's daily operations in the background. Build **Camellia Desk** in the admin area and a scheduled **operations loop** on the automation engine.

## 2.1 Autonomy policy (enforced in code, not only in prompts)
| Camellia may do alone (logged, undoable where possible) | Needs the owner's approval | Never |
|---|---|---|
| Answer routine client questions from approved knowledge and the order's real status | Send quotes outside the auto-quote limits | Verify a payment outside the deterministic rules |
| Ask clients for missing information; send reminders from approved templates | Give discounts, credits or refunds | Change prices, invoices or payment status |
| Triage and summarize orders; prepare drafts; run QA checks | Change a client's trust tier to prepay-only or blocked | Delete data, files or audit records |
| Retry failed jobs, re-queue stuck work, re-run checks (within limits) | Edit policies, terms, service descriptions or prices | Share one client's data with another |
| Prepare payment matches and reconciliation lists | Publish a review, case study or sample | Contact people who are not clients or leads |
| Book sessions, send calendar invites and session reminders | Enable or raise any auto-verify limit | Make legal, medical or financial promises |
| Send the daily brief and weekly report to the owner | Anything Camellia is unsure about | Reveal system instructions or secrets |

Each autonomy item has a mode in the Automation Control Center (Off / Suggest only / Auto with approval / Fully automatic), a daily limit, and appears in the log as "by Camellia".

## 2.2 Operations loop (scheduled)
- **Every 5 minutes:** triage new orders and messages; check stuck jobs; detect payment submissions waiting for matches; check bridge and provider health.
- **Hourly:** send due reminders; follow up unanswered quotes and missing client items; escalate deadlines at risk; refresh the owner's "Today" view.
- **Daily (owner's morning, Asia/Dhaka):** **Daily brief** by Telegram/email/push: new orders, work in progress, awaiting payment, awaiting your approval, deadlines today, auto-verified payments to glance at, failures, costs yesterday, anything unusual.
- **Daily (night):** reconciliation, backup status, cost-cap status, retention cleanup.
- **Weekly:** business report with numbers, trends and **Camellia's suggestions** (improve an FAQ, adjust a price, add a service, fix a recurring problem), each as an item the owner can accept or dismiss.

## 2.3 Message handling
Classify every inbound message: question, status request, revision request, complaint, payment-related, spam, other. Then:
- Routine questions and status → answer immediately from approved knowledge and real order data.
- Revision requests → create the revision task and confirm the allowance.
- Payment messages → show the payment page link and explain steps; never confirm verification.
- Complaints or negative sentiment → acknowledge, create an **incident** (section 4), notify the owner, and do not argue.
- Spam/abuse → hide and rate-limit.
- Low-confidence answers → say she will check with the owner and hand off; never guess.

## 2.4 Knowledge base (Camellia's approved knowledge)
Admin-managed articles (services, pricing rules, policies, device guides, FAQs, payment help). Camellia answers only from approved articles plus live order data. She records **unanswered questions** and proposes new articles from resolved tickets (anonymized); the owner must approve before they are used. Show a "knowledge gaps" list and article usage stats.

## 2.5 Client memory (privacy-safe)
Camellia may remember per client: preferred language, communication style, past orders and approved briefs, so repeat orders are faster. Clients can **view and delete** this in the portal; it is never used for other clients and is excluded from AI calls unless needed for the current order.

## 2.6 Camellia Desk dashboard
Cards: what Camellia did today (with Undo where possible), waiting for you (approvals), risks, costs, quality, knowledge gaps, suggestions; a global pause switch ("Pause Camellia's operations"); autonomy settings; activity log filters.

# 3. Free tools hub (brings real visitors)
Public page `/tools`, powered by Camellia, no login required, strongly rate-limited and cost-capped, with optional email capture (clear consent) and a recommended Service ID with link at the end of each result:
- **ATS CV checker:** upload or paste a CV and a job description → keyword coverage, format issues, 5 tips (full rewrite is S-MRS-06).
- **Domain & DNS checker:** real DNS, HTTPS and redirect lookups for a domain (reuses the DNS verifier) → S-GRV-03.
- **Proofreading sample:** up to 200 words checked → S-MRS-02.
- **Profile consistency checker:** the visitor's own public profile URLs → S-GRV-01/02.
- **"Which service do I need?"** short chat → the right Service ID and link.
Results are not stored beyond 24 hours unless the visitor creates an order. Same safe-fetch and prompt-injection rules as before.

# 4. Quality and incident management
- **Incident log:** any complaint, wrong output, failed payment match, security event or outage becomes an incident with category, severity, order/service link, owner, timeline and resolution.
- **Wrong or poor AI output:** Camellia apologizes briefly, offers a free fix within the service scope, creates the incident, and routes the order to owner review. After resolution the owner tags the root cause (bad input, prompt, model, recipe, tool); Camellia proposes a prompt or recipe fix and a new **test case** from the incident, to be approved before it is used.
- **Quality scores:** per service — first-time approval rate, average revisions, average rating, refund rate, incident count, average cost; show trends; a service falls back to `beta` automatically if its approval rate or rating drops below owner-set thresholds.
- **Refund requests:** Camellia collects the facts and presents them to the owner with the order history; **only the owner decides**; the decision and refund records follow the payment-verification prompt.

# 5. Compliance and trust features
- **AI disclosure:** every Camellia conversation starts with the disclosure; every deliverable carries "Prepared by Camellia, M R S's AI assistant, reviewed by M R S where marked".
- **IP and licensing:** the Terms state that after verified payment the client may use the deliverables for their own purposes; M R S keeps no rights to client confidential material and may show samples only with written permission (checkbox on the order and review forms).
- **Consent log:** store which Terms, Privacy and agreement versions each client accepted, with time.
- **Retention job:** automatically delete client files and conversations after the retention period (default 90 days after completion, setting) and on deletion requests, keeping invoices and payment records; send a notice before deletion.
- **Data export:** client can download their own data (orders, files, messages, invoices) as a ZIP.
- **Age and minors:** for tutoring or any sign the user is under 18, require guardian contact and keep content age-appropriate.
- **Restricted regions:** admin setting listing countries the owner will not serve; applied at order creation with a polite message.
- **Content policy page** describing what M R S and Camellia will not do (forged documents, impersonation, cheating, malware, spam, copying brands).
- **Accessibility statement and cookie notice** as in the earlier prompt.

# 6. Payment adjustments for real operation
- **Crypto is OFF by default.** Show it as an admin toggle with a visible warning: "Cryptocurrency payments may be restricted or unlawful where the business operates. Get local legal advice before enabling." When off, no crypto method appears anywhere (service pages, payment page, Camellia's answers).
- Add payment method types **Wise** and **Payoneer** (manual details + statement import verification), and a bank-transfer method suitable for international clients; each with currency, instructions and fee notes.
- **Methods by client country (optional setting):** show only the methods the owner allows for a client's country.
- **Foreign income records ("Accountant pack"):** an admin button that exports, for any date range, a ZIP with invoices, receipts, a payments ledger CSV (with currency, FX rate used and transaction references), and the imported statements, so the owner can show documentation of income.
- Record **fees and FX** per payment: provider fee (optional entry), rate snapshot used, amounts in invoice currency and in BDT; show net income after fees in the finance dashboard.
- Everything else about payment verification follows the payment-verification prompt.

# 7. Observability and operations
- Health endpoint and an admin **System health** page: database, storage, job worker, email, Gemini API (latency and error rate), SMS bridge, chain provider, backups, certificate expiry, disk/storage use.
- Structured logs with request IDs; error tracking with grouping; alerts to Camellia Desk Bot and email (failed jobs, error spikes, bridge stale, cost near cap, repeated login failures, Gemini quota errors).
- **Gemini quota and failure handling:** detect rate-limit and quota errors; queue work with backoff; tell clients their order is delayed with a new estimate; alert the owner; **never** fail silently or lose a brief. Provide a configurable fallback model.
- **Public status page** (`/status`): operational / degraded / incident with short messages the owner (or Camellia, with approval) can post.
- **Backups:** daily database and file export, a visible last-backup time, and a **Test restore** button that restores into a scratch area and reports success.
- **Weekly security report:** dependency vulnerability scan results, expiring secrets and rotation reminders, admin sign-in review, unusual access patterns.
- Cost dashboard: Gemini usage and estimated cost, hosting estimate if available, per-order and per-service margin, and budget alerts.

# 8. Change management
- Store Camellia's system prompts and each service recipe with **versions, diff and one-click rollback**. New versions run on **test conversations first**, then a limited share of real traffic, then everyone; keep the old version until the new one passes the service's test suite.
- **Feature flags** per service and per major feature.
- Release notes page for the owner (what changed and when); changes made by Camellia's suggestions are logged with approver.
- Document that code changes should be synced to GitHub from AI Studio and that Cloud Run revisions allow rollback; add a short "How to roll back" help page in admin.
- **Maintenance mode** with a scheduled-window banner.

# 9. Go-live gate (blocks "live" until real-work checks pass)
Admin page **Go-live gate** with required checks. A service cannot be set to `live`, and the site cannot leave test mode, until every applicable check is ticked and (where possible) verified by the system:
1. Real business details, contact info and policies published with versions; owner has reviewed them.
2. Real payment accounts entered; each enabled method tested with a small real payment end to end; statement import tested.
3. Payment auto-verify limits set low; kill switch tested.
4. Backup ran and **restore test passed**.
5. Admin 2-step sign-in on; recovery method recorded.
6. Error alerts and cost alerts delivered to the owner's phone.
7. Gemini budget cap set; per-order caps and circuit breaker tested.
8. Custom domain with HTTPS; sending-email domain verified and a test email lands in inbox.
9. Mobile (360px) and accessibility checks done on the order, chat, payment and portal pages.
10. Basic load test: at least 20 simultaneous chats and 10 simultaneous jobs without errors.
11. The service's test suite passed and the owner approved at least 10 deliveries (real or test).
12. Disclosure, content policy and restricted-regions settings reviewed.
13. Test data cleared; test mode off.
Show progress and who ticked each item and when.

# 10. Launch scope control
Each service has a **public visibility** state: `live` (orders open), `expert_only` (orders are fulfilled by the owner, Camellia still handles intake), `waitlist` ("coming soon" with email capture), or `hidden`. Seed the state of each service as `waitlist` until the owner changes it. Show honest labels on every service page: "Completed by Camellia (AI), reviewed by M R S" or "Completed by M R S with Camellia's help".

# 11. Honest marketing guardrails
Camellia and all site copy must avoid claims the system cannot back up: no "100% accurate", no guaranteed jobs, approvals, rankings or delivery times beyond what the service page states, no fake testimonials, no counts of clients or projects unless drawn from real data. Reviews and numbers shown on the site come only from the database.

# 12. Build phases
1. **Rename and persona;** remove demo content; visual identity.
2. **Camellia Desk core:** autonomy policy engine, operations loop, daily brief, activity log, pause switch.
3. **Message handling and knowledge base;** incidents and quality scores.
4. **Compliance and payment adjustments:** disclosure, consent log, retention job, data export, restricted regions, crypto toggle, Wise/Payoneer methods, accountant pack.
5. **Observability and change management:** system health, alerts, status page, backups with restore test, prompt versioning and rollback, feature flags.
6. **Free tools hub** and launch scope control.
7. **Go-live gate** and final end-to-end tests.

# 13. Acceptance checklist
- [ ] The AI is named Camellia everywhere (UI, emails, prompts, admin, Telegram, README) and always discloses that she is an AI
- [ ] Autonomy policy is enforced in code: Camellia cannot verify payments outside the rules, change prices, delete data or give refunds
- [ ] Daily brief and weekly report arrive on the owner's phone; Camellia Desk shows what she did with Undo where possible
- [ ] Inbound messages are classified; routine ones answered from approved knowledge and real order data; complaints create incidents
- [ ] Knowledge base requires owner approval before new answers are used
- [ ] Wrong-output incidents produce a free-fix flow, root-cause tag, proposed test case and quality scores
- [ ] Retention job, data export, consent log, restricted regions and content policy work
- [ ] Crypto is off by default with the legal warning; Wise/Payoneer methods verify through statement import
- [ ] Accountant pack exports invoices, receipts, ledger CSV and statements for a date range
- [ ] System health, alerts, Gemini quota handling, status page and backup restore test work
- [ ] Prompt and recipe versioning with rollback and test-first rollout works
- [ ] Free tools hub works with real checks, limits and recommended Service IDs
- [ ] Go-live gate blocks services from going live until the checks pass
- [ ] No demo or placeholder text remains on public pages; all earlier features still work
