# M R S — Lite 3: Every Service A to Z + Complete Project File

Paste everything below the line into the same AI Studio project, after Lite 1 and 2 (about 8,100 characters). If it feels too long, paste the "Project File" part first, then the service table in two halves.

---

Update the existing M R S app so that **every service** (all 16 Service IDs already seeded: S-MRS-01 to 12, S-GRV-01 to 03, S-IPTV-01 and its 1M/2M/6M/12M variants) works from start to finish with a complete **Project File** per order. Use your own best-practice knowledge for details not given here. Keep all existing features. Real code, no placeholders.

## 1. The A to Z lifecycle (same engine, per-service settings)
Discover (service page) → Select → Intake (Camellia asks only what that service needs) → Scope and price → Client accepts terms → Work (Camellia does it; owner approves anything risky) → Quality check → **Locked preview** → Payment (per the existing deposit / after-delivery setting, verified by Lite 1) → Unlock final files → Handover → Revisions (allowance per service) → Close with client confirmation and feedback → Aftercare (follow-up and reminders). Every step updates a status stepper the client can see.

## 2. The Project File (one per order, `/portal/orders/{orderId}`)
Create it automatically when an order starts. Sections:
1. **Brief** — intake answers and uploaded source files
2. **Scope** — agreed deliverables, price, due date, revision allowance (a snapshot of what the client accepted)
3. **Conversation** — the Camellia chat and messages (searchable)
4. **Work log** — versions v1, v2… with dates; what changed
5. **Preview** — watermarked or partial, safe to show before payment
6. **Final files** — locked until payment is Verified; then downloadable (individual files and one ZIP with a checksum file; expiring signed links)
7. **QA report** — checklist results, with who or what checked
8. **Revision log** — requests, done or declined, allowance left
9. **Billing** — invoice, payment status, receipt
10. **Delivery note** — a README: what is included, how to use it, what to do next
11. **Handover** — access details or credentials, delivered only in the portal, never in chat or email
12. **Closure** — client confirmation, rating, retention date

Each service has a `manifest` listing its required items. A **completeness validator** blocks the status "Delivered" until every required item exists, the QA checklist passed and the delivery note is written. The client sees the same checklist with ticks. The owner sees a Project File health badge on every order. Project Files are kept for 90 days after closing (admin setting) and then deleted or archived; clients can export or request deletion.

Code structure: one module per service, `/services/{slug}/` with `config` (ID, price model), `intake` (form schema), `agent` (Camellia instructions and tools), `deliverables` (manifest and generators), `qa` (checks), `preview` (how to lock) and `messages`. A shared engine runs them, so adding a service means adding a module.

## 3. Rules for all services
- Camellia always says she is an AI and does the work herself; for steps that need a human (account access, live sessions, publishing) she prepares everything and hands the final action to the owner or the client.
- Never ask for passwords, PINs, OTPs or card numbers. Use invitations, delegated access or the client's own login.
- Never invent facts, experience, sources or credentials; flag gaps and ask.
- Previews must be useless as the final product (watermark, low resolution, first part only, blurred or truncated).
- Academic integrity: teach and explain; do not complete graded work for submission.
- Quote hourly services as an estimate with a time-box; fixed services use the fixed price.

## 4. Services (each gets a service page: who it is for, what you get, process, price, sample, FAQ, Service ID, link, QR, Order button)
| ID | Intake (ask only this) | Camellia does | Project File finals | QA and preview rule |
|---|---|---|---|---|
| S-MRS-01 AI & Digital Productivity | goal, tools, current workflow, sample non-sensitive data | maps the workflow; writes prompt library, automation plan, templates | workflow map, prompt pack, SOP, setup guide | tested on sample data; no private data; preview = outline |
| S-MRS-02 Technical Writing & Proofreading | document, audience, style guide, language, deadline | edits with a change summary; makes a clean copy and glossary | clean copy, tracked-changes copy, summary | reading level, consistency; facts flagged not invented; preview = first 20% |
| S-MRS-03 Website Management | platform (Blogger/WordPress), tasks, access by editor invite | drafts posts, SEO, task checklist, theme and plugin advice | change log, content pack, before/after notes | links and SEO checked; owner or client applies changes |
| S-MRS-04 IT Support & Troubleshooting | device, OS, symptom, exact error, screenshots | diagnostic tree, step-by-step fix, safety warnings | diagnosis report, fix steps, prevention checklist | backup warning first; remote session booked via Calendly, client-started |
| S-MRS-05 App Store Publishing | platform, developer account status, app name, bundle ID | listing text, keywords, privacy policy, screenshot specs, submission checklist | listing pack, policies, checklist | store rules checked; no approval guarantee; owner submits |
| S-MRS-06 Advanced ATS CV & Resume | current CV, target job ad, country, links | ATS-safe CV, keyword match report, optional cover letter | DOCX, PDF, plain-text, keyword report | no invented experience; preview = watermarked page 1 |
| S-MRS-07 Web Setup Services | goal, domain, host, platform, pages | sitemap, content, theme settings, DNS record sheet | setup guide, DNS sheet, content pack, launch checklist | DNS records checked by a real lookup where possible |
| S-MRS-08 Peer & Subject Tutoring | subject, level, topic, goals, schedule | lesson plan, notes, practice questions with answers, quiz | study plan, worksheets, session summary | teaches, does not do graded work; live session via Calendly |
| S-MRS-09 Graphics Design | brand, size, text, colors, references, usage | 2 or 3 concepts (SVG, HTML/canvas or generated image) | PNG, SVG/PDF, source file, usage guide | fonts and image rights checked; preview = low-res watermark |
| S-MRS-10 Virtual Assistance & Admin | task list, tools, hours, privacy limits | drafts, schedules, research summaries, templates | task log, deliverable per task, time sheet | confidentiality; delegated access only |
| S-MRS-11 Data Entry | source files, target format, rules | extracts and cleans to CSV/XLSX with validation | clean file, error log, summary | row counts, duplicates, sample re-check; delete sources after retention |
| S-MRS-12 Online Learning Resources | topic, level, format, time available | curriculum, curated resources, summaries, quizzes | study path, verified resource list, quizzes | every link checked; sources cited |
| S-GRV-01 Professional Identity Consultation | goals, current online presence | audit, recommendations, bio and link strategy | audit report, action plan | no fabricated claims; preview = summary |
| S-GRV-02 Profile Personalization | Gravatar email (no password), bio, links, avatar | profile text, avatar guidance | profile pack, step guide | client applies it from their own login |
| S-GRV-03 Custom Domain Mapping | domain, registrar, target platform | exact DNS records and steps, rollback notes | DNS sheet, verification result | server-side DNS lookup to confirm; no registrar passwords |
| S-IPTV-01 VIP Pass (1/2/6/12 months) | plan, email, device | device setup guide, activation per Lite 2 | setup guide for Android, iOS, Smart TV, Firestick, PC; FAQ | authorized-content checkbox; credentials only in portal |

## 5. Build checks
For each of the 16 services: a service page, an order form, an intake that Camellia completes, a generated Project File with its manifest, a locked preview, an unlock after verified payment, and a test order that reaches Closed. List anything not finished, plainly.
