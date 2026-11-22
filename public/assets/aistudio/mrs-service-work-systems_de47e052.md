# M R S — Service Work Systems (Follow-up Prompt for Google AI Studio)

Paste everything below the line into the same AI Studio project as a follow-up prompt. It adds a **per-service workflow engine** to the app: every service gets its own intake form, workflow stages, deliverables, revision rules and completion checklist, and the admin and client portals run on them.

---

Extend the M R S app with a **Service Work System** module. Each service in the catalog gets a configuration with these fields, seeded from the definitions below and editable in admin without code changes:

`intakeFields[]`, `pricingRule`, `workflowStages[]`, `deliverables[]`, `turnaround`, `revisions`, `completionChecklist[]`, `clientMustProvide[]`, `notes`.

## How the module behaves in the app
1. **Dynamic intake form:** when a visitor requests a service, show that service's `intakeFields` (not a generic form). Required fields are enforced; file uploads are allowed where listed.
2. **Order workflow:** each order is created with its service's `workflowStages` as a checklist. Admin ticks stages off; the client sees a live stepper in the portal (stage names are client-friendly).
3. **Quote builder:** admin sees a suggested quote from `pricingRule` (hours × rate, complexity tier) and can adjust before sending.
4. **Delivery and approval:** when admin uploads deliverables and marks the order **Delivered**, the client gets a "Review and approve" screen with **Approve**, **Request revision** (counts against the revision allowance) and **Report a problem**. Approval completes the order; no response for 5 days auto-approves, with a reminder at day 3.
5. **Completion gate:** an order cannot be marked Completed until every item in its `completionChecklist` is ticked (admin) and the client has approved.
6. **Hourly services:** admin logs time entries (date, minutes, note). The client sees hours used vs. estimate. A warning triggers at 80% of the estimate; going past 110% requires client approval of extra hours before work continues.
7. **Closing:** on completion, send a feedback request (1–5 stars + comment), offer a repeat-order button, and archive files per the retention rule.

---

## Shared rules (apply to every service)

**Pipeline stages (shown to the client):** Request received → Details confirmed → Quote sent → Quote accepted → Payment verified → Work started → In review → Delivered → Approved → Completed.

**Response times:** first reply within 12 hours (target 2–4 hours during working hours, Asia/Dhaka time). Quote within 24 hours of a complete intake.

**Pricing within a range (for services quoted as a range):**
- Basic task, clear scope → low end of range
- Standard task → midpoint
- Complex, specialist, or deadline under 24 hours → high end of range

**Payment terms:**
- Fixed-price services and IPTV: 100% upfront before work starts or access is delivered.
- Quotes up to $100: 100% upfront.
- Quotes over $100: 50% deposit to start, 50% before final files or access are handed over.
- Hourly packages: prepay the estimated hours; unused prepaid time is credited to the next order or refunded for unstarted work.

**Revisions:** each service states its allowance. A revision means changes within the agreed scope. New requirements are a new quote.

**Access and credentials:**
- Never ask for passwords by chat or email. Use invite/role-based access (collaborator, editor, admin invite, delegated access) wherever the platform allows it.
- If a login must be shared, the client uses a temporary password and changes it after delivery.
- Remote support sessions happen only with the client present and consenting, and end when the task is done.
- Remove all access when the order closes; confirm this to the client.

**Confidentiality:** client files and data are used only for their order, stored in private storage, and deleted 90 days after completion (client can request earlier deletion).

**Backups before changes:** for any work that edits a live site, account, document or system, take a backup or copy first and note it in the order.

**Cancellation and refunds:**
- Before work starts: full refund.
- After work starts: refund the unused portion; completed work is billed.
- After delivery is approved: no refund. If a deliverable doesn't match the agreed scope, it is fixed free of charge.
- Crypto refunds are sent in the same asset and network, minus network fees.

**Communication:** one thread per order in the portal; important updates also by email. Status changes always notify the client.

---

# A. M R S SERVICES

## 1. AI & Digital Productivity — $50–$100 / hour (quote)
**What it is:** designing and building AI-assisted workflows and automations that save the client time (prompt systems, automations, templates, dashboards).

**intakeFields:** business or personal use; the process to improve (describe the current steps); tools already used (Google Workspace, Microsoft 365, Notion, Slack, CRM, etc.); desired outcome and how success is measured; how often the process runs; volume (items per week); any sensitive data involved (yes/no); deadline; example files (optional).

**pricingRule:** estimated hours × rate. Single simple automation = low end; multi-tool workflow = midpoint; custom logic, integrations, or rush = high end. Quote shows the hour estimate range.

**workflowStages:**
1. Discovery call or written brief (15–30 min)
2. Process map: current steps → proposed automated steps, sent to client for approval
3. Tool and data-privacy check (what data goes to which service)
4. Build in a test environment
5. Test with the client's sample data, fix issues
6. Live setup and handover training (recorded or written)
7. 7-day support window

**deliverables:** working automation or workflow, process map, step-by-step user guide, prompt library or templates (if used), list of accounts and tools involved, maintenance notes.

**turnaround:** simple 2–4 days; multi-tool 5–10 days.
**revisions:** 2 rounds of adjustments after testing; bug fixes within the 7-day window are free.
**completionChecklist:** tested with real sample data · no secrets or API keys left in shared documents · client trained · guide delivered · access to tools transferred to the client · client approved results.
**clientMustProvide:** tool access (invited role), sample data, a point of contact who can approve decisions.

## 2. Technical Writing & Proofreading — $40–$80 / hour (quote)
**intakeFields:** type (manual, user guide, API doc, SOP, report, whitepaper, academic paper, website copy, other); service needed (write from scratch / edit / proofread only); audience and reading level; word or page count; source material or draft (upload); style guide or tone; language and spelling variant (US/UK); deadline; citation style if needed.

**pricingRule:** hours estimated from length and difficulty. Proofread only = low end; editing for clarity and structure = midpoint; writing from scratch or highly technical subject = high end. A rough guide for the quote: proofreading ~2,000–3,000 words/hour; substantive editing ~800–1,200; original writing ~300–500.

**workflowStages:**
1. Review brief and source material, confirm scope
2. Outline (for new writing) approved by client
3. Draft or first edit
4. Self-review pass: facts, consistency, terminology, formatting
5. Delivery with changes visible
6. Client review and revision
7. Final clean files

**deliverables:** clean final document (DOCX and PDF) · tracked-changes version for edits · short change summary or glossary of terms used · style notes (if requested).

**turnaround:** proofreading up to 5,000 words in 24–48h; editing or writing 3–7 days depending on length.
**revisions:** 2 rounds. Rewrites that change the brief are re-quoted.
**completionChecklist:** spelling and grammar verified · terminology consistent · numbers, names and links checked · formatting matches the style guide · both clean and tracked versions delivered · client approved.
**notes:** no plagiarism: all writing is original; citations only to real sources the client supplies or that are verifiable. Does not write graded student coursework to be submitted as the student's own; can edit and give feedback.

## 3. Website Management (Blogger / WordPress) — $30–$60 / hour (quote)
**intakeFields:** platform (Blogger / WordPress / other); site URL; type of work (content updates, design tweaks, plugin/theme updates, security, speed, SEO, bug fixing, ongoing monthly care); list of tasks; one-time or monthly; hours per month if ongoing; hosting provider (for WordPress); any recent problems; deadline.

**pricingRule:** hours estimated per task list. Content updates = low end; theme/plugin/SEO work = midpoint; troubleshooting broken sites, security cleanup, custom code = high end. Monthly care: prepaid hours bucket (e.g. 5, 10, 20 hours) with rollover for one month.

**workflowStages:**
1. Access via collaborator/admin invite
2. Site audit (health check: backups, updates, speed, broken links, security basics)
3. Full backup before any change
4. Perform tasks on a staging copy where possible, otherwise in low-traffic time
5. Check on desktop and mobile; test forms, links and checkout if applicable
6. Report of work done with before/after notes
7. Remove access (or keep monthly access if ongoing)

**deliverables:** completed tasks · backup confirmation · work log with hours · short report with recommendations · login and settings notes (stored securely).

**turnaround:** small tasks 1–2 days; larger improvements 3–7 days; monthly care reported on the same date each month.
**revisions:** 1 round of adjustments per task batch; anything broken by our change is fixed free.
**completionChecklist:** backup taken and verified · all listed tasks done and checked on mobile and desktop · site loads and key pages work · no leftover test content · report delivered · access removed or confirmed for ongoing work.

## 4. IT Support & Troubleshooting — $25–$50 / hour (quote)
**intakeFields:** device and OS (Windows / macOS / Linux / Android / iOS); problem category (slow PC, malware, network/Wi-Fi, email, printer, software install, account recovery, data backup, other); what happens and when it started; error messages (screenshot upload); urgency (normal / urgent); remote access tool available (Chrome Remote Desktop, AnyDesk, TeamViewer, etc.); preferred time slot (calendar picker, Asia/Dhaka shown with client's local time).

**pricingRule:** standard issue = low end; multi-step or networking = midpoint; urgent same-day, data recovery, or malware cleanup = high end. First 30 minutes can be a fixed diagnosis fee (admin setting) credited if the client proceeds.

**workflowStages:**
1. Triage and severity (Urgent: system down; High: blocked work; Normal)
2. Ask the client to back up important files if possible
3. Remote session (client present and consenting) or step-by-step guidance
4. Diagnose, then explain the fix and any risk before changing anything
5. Apply fix and test
6. Written fix summary and prevention tips
7. 48-hour follow-up check

**deliverables:** issue fixed · short written fix log · prevention checklist · recommendations (updates, backups, security) if relevant.

**turnaround:** urgent response within 2 hours during working hours; normal within 24 hours.
**revisions:** if the same problem returns within 7 days from the same cause, it is re-fixed free.
**completionChecklist:** problem reproduced and then confirmed gone · client tested it · fix log written · remote session closed and remote tool access removed · client confirmed.
**notes:** never installs unlicensed software; never bypasses security on devices the client doesn't own; no passwords stored.

## 5. App Store Publishing — $25 USD / Crypto (fixed, per submission)
**What it is:** preparing and submitting the client's app to the App Store and/or Google Play. Store fees (Apple Developer Program, Google Play registration) are paid by the client directly to the stores and are not included.

**intakeFields:** store(s) (Apple / Google / both); app name; platform build status (finished and tested? built how: Flutter / React Native / native / web wrapper / AI Studio / other); developer account status (have one / need help creating); app category and age rating answers; privacy policy URL (or need one); support URL and email; app description, keywords, screenshots (upload or need help); in-app purchases or subscriptions (yes/no); login required to use the app (yes/no, and a test account to give reviewers); target countries.

**pricingRule:** fixed $25 per store submission (or per the price set in admin). Extra items (creating a privacy policy, screenshots, store listing copy, rejection fixes after the first resubmission) are quoted separately.

**workflowStages:**
1. Readiness check of the build against current store requirements (icons, sizes, permissions, privacy)
2. Developer account setup guidance; client adds us by role invite (App Store Connect / Play Console) — no passwords
3. Prepare store listing: name, subtitle, description, keywords, screenshots, category, age rating
4. Prepare privacy details (data-collection answers), privacy policy link, and review notes with a test login
5. Upload the build and complete all store forms
6. Submit for review
7. Monitor review; respond to reviewer questions
8. If rejected: explain the reason, apply fixes within scope, resubmit
9. Confirm the app is live; hand over

**deliverables:** submitted (and, when approved, live) store listing · listing text and asset files · submission checklist · rejection report and fixes (if any) · store links.

**turnaround:** 1–2 days to submit once the client provides all items; review times are set by the stores, not by us, and Apple/Google processes and requirements change — check the current requirements for new developer accounts before promising dates.
**revisions:** one resubmission after a rejection is included when the cause is a listing or form issue; code changes to the app are quoted separately.
**completionChecklist:** build uploaded and processed · all store forms complete and consistent · privacy policy URL live · review notes and test login added · submitted · outcome recorded (approved / rejected with reason) · client has store links · role access removed or reduced.
**clientMustProvide:** the app build or project, developer account (or purchase), app assets, privacy policy details.
**notes:** no guarantee of approval; store decisions are final.

## 6. Advanced ATS CV & Resume — $15 / 1,500 TK (fixed)
**intakeFields:** current CV (upload, optional); target role and industry; target country; 1–3 job descriptions to match (paste links or text); work history, education, certifications; key achievements with numbers (sales, time saved, projects); skills and tools; languages; CV format preference (one page / two pages); optional add-on interest (cover letter, LinkedIn headline and summary).

**pricingRule:** fixed $15 or 1,500 TK per CV. Extra versions for different job targets, cover letters and LinkedIn rewrites are quoted as add-ons.

**workflowStages:**
1. Review current CV and target jobs; identify gaps
2. Extract keywords from job descriptions (skills, tools, titles)
3. Quick client Q&A for missing achievements (async, within the portal)
4. Write CV: summary, skills, experience (achievement-focused bullets), education
5. ATS check: single-column layout, standard headings, no tables or text boxes, readable fonts, keywords placed naturally
6. Deliver DOCX and PDF
7. One revision round

**deliverables:** ATS-friendly CV in DOCX and PDF · keyword list used · short improvement notes (what changed and why).

**turnaround:** 24–48 hours after receiving all information.
**revisions:** 1 round included; further rounds or a new target role are a new fixed fee (or 50% for minor changes — admin setting).
**completionChecklist:** all dates, titles, employers and numbers confirmed with the client · no invented experience or achievements · spelling checked in the target country's English · file opens correctly and text is selectable in the PDF · client approved.
**notes:** only truthful information goes into the CV; the client confirms every claim.

## 7. Web Setup Services — ~$18 / hour (hourly)
**intakeFields:** type of site (blog, business, portfolio, store, landing page, other); platform preference (WordPress / Blogger / other / not sure); domain (own / need one); hosting (own / need guidance); pages needed; content ready (yes/no); design references (links); features needed (contact form, booking, shop, newsletter, multilingual); email accounts needed; launch date.

**pricingRule:** ~$18/hour × estimated hours. Typical estimates for the quote: basic blog or 3–5 page site 4–8 hours; business site with forms and SEO basics 8–15 hours; online store 15–30 hours. Domain, hosting, premium themes and plugins are paid by the client separately.

**workflowStages:**
1. Plan: sitemap, pages, features, design direction approved by client
2. Domain and hosting setup (in the client's own accounts)
3. Install platform, theme, essential plugins; configure security and backups
4. Build pages and add content provided by the client
5. Set up contact forms, analytics, search-engine basics (titles, descriptions, sitemap), SSL
6. Test on mobile and desktop; test forms and speed
7. Launch, then handover guide and a short walkthrough
8. 7-day post-launch support

**deliverables:** live website · admin login handed over (client-owned) · setup document (accounts, renewals, plugins) · how-to guide for editing content · backup configured.

**turnaround:** basic 3–5 days; larger 7–14 days.
**revisions:** 2 rounds on design/content before launch; 7 days of bug fixes after.
**completionChecklist:** site on the client's own domain and accounts · SSL working · forms deliver email · mobile layout checked · analytics connected · backup running · admin credentials changed to the client's own · handover guide delivered · client approved.

## 8. Peer & Subject Tutoring — ~$16 / hour (hourly)
**intakeFields:** student name and age/level; subject and topic; goals (exam, homework understanding, skill building); upcoming exam or deadline; current difficulty; preferred language of instruction; preferred days and times (calendar picker); session length (45/60 min); materials (syllabus, past papers, uploads); online tool the student can use.

**pricingRule:** ~$16/hour. Packages of 4, 8 or 12 sessions can be offered at a discount set in admin; prepaid.

**workflowStages:**
1. Free short intro or diagnostic (10–15 min, optional)
2. Learning plan: goals, topics order, schedule
3. Sessions (online) with agenda and examples
4. Practice tasks between sessions
5. Session notes sent after every session
6. Progress review every 4 sessions
7. Closing summary and next-step recommendations

**deliverables:** session notes · practice sets with answers · study plan · progress summary.

**turnaround:** first session within 3 days of payment, depending on availability.
**revisions/rescheduling:** free reschedule with 12 hours' notice; later cancellations are charged.
**completionChecklist:** all paid sessions delivered (or credited) · notes sent for each session · progress summary shared · feedback collected.
**notes:** teaches and explains so the student can do it; does not complete graded assignments or exams on the student's behalf. Sessions with minors need a parent or guardian's contact.

## 9. Graphics Design — ~$15 / hour (hourly)
**intakeFields:** what to design (logo, social media posts, banner, flyer, business card, thumbnail, infographic, presentation graphics, other); brand name and tagline; colors, fonts, logo files (upload); style references (links or uploads); text content to include; sizes and formats needed; where it will be used (print / web / social); deadline; number of variations wanted.

**pricingRule:** ~$15/hour × estimated hours. Typical estimates: social post 0.5–1; banner/thumbnail 1–2; flyer 2–3; logo concept set 4–8; business card 2–3.

**workflowStages:**
1. Brief confirmed and references reviewed
2. Rough concepts (2 options) shown for approval
3. Chosen concept developed
4. Revision rounds
5. Final files exported in all required formats and sizes
6. Source files handed over after final payment

**deliverables:** final designs in PNG/JPG and PDF (print-ready with bleed if needed) · SVG for logos · source files (e.g. editable file) · short usage notes (colors, fonts).

**turnaround:** simple graphics 24–48h; logos or sets 3–7 days.
**revisions:** 2 rounds included; a different concept after approval is a new estimate.
**completionChecklist:** sizes and formats match the brief · text proofread · fonts and images licensed for the intended use · print files at correct resolution · all files delivered · client approved.
**notes:** original work only; uses licensed or free-to-use fonts and stock; does not copy other brands' logos or characters.

## 10. Virtual Assistance & Admin Support — $15–$25 / hour (quote)
**intakeFields:** tasks needed (email management, calendar, scheduling, research, document formatting, travel booking, CRM updates, social media posting, customer replies, other); tools used; hours per week; start date and duration (one-off / ongoing); working hours and time zone; response-time expectations; templates or SOPs available; confidentiality needs.

**pricingRule:** routine tasks = low end; tasks needing judgment, client communication or multiple tools = midpoint; executive-level support, urgent coverage or specialist tools = high end. Ongoing: weekly hour blocks, prepaid monthly.

**workflowStages:**
1. Onboarding call: tasks, priorities, preferences, escalation rules
2. Access via delegated roles (e.g. delegate access, shared inbox, team invite)
3. Trial week with daily summary
4. Regular work with time log
5. Weekly report: tasks done, hours, pending items
6. Monthly review and priorities update
7. Offboarding: access removal and handover notes

**deliverables:** completed tasks · daily or weekly summary · time log · updated SOP notes · handover document.

**turnaround:** onboarding within 2 days of payment; tasks completed as agreed per the priority list.
**revisions:** corrections to completed tasks are free within 3 days.
**completionChecklist:** weekly report sent · open items listed with owners · all delegated access reviewed · confidential files kept in the client's own drive · client confirmed.

## 11. Data Entry — ~$10 / hour (hourly)
**intakeFields:** type of data (from PDFs, images, handwritten forms, websites, existing spreadsheet cleanup); source files (upload or shared folder link); target format (Excel, Google Sheets, CSV, database import file); fields and column names or a template; volume (rows or pages); accuracy requirements; confidentiality level; deadline.

**pricingRule:** ~$10/hour × estimated hours; estimate from a test batch (e.g. time for 50 rows × total volume). Large jobs can be offered at a fixed per-1,000-rows price set in admin.

**workflowStages:**
1. Sample check: first 25–50 records entered and approved by the client
2. Create or confirm the template, validation rules and naming rules
3. Main entry in batches
4. Quality control: 100% spot check on a sample plus duplicate and format checks
5. Deliver batch reports (rows done, issues found)
6. Final file delivery

**deliverables:** completed spreadsheet or file in the requested format · issues log (unclear or missing data) · QC summary.

**turnaround:** 1,000 rows typically 1–3 days depending on complexity; large jobs delivered in batches.
**revisions:** corrections of entry errors are free; changes to the format after approval are re-estimated.
**completionChecklist:** sample approved · all records entered · duplicates and blanks checked · QC target met (aim for 99%+ accuracy on the sample check) · issues log delivered · source files deleted or returned per the client's choice.

## 12. Online Learning Resources — $20–$40 / hour (quote)
**What it is:** creating or curating learning materials: study guides, notes, quizzes, learning paths, course outlines and resource lists.

**intakeFields:** subject and level; purpose (self-study, class, training, course business); learner profile; format wanted (PDF guide, slides outline, quiz set, flashcards, curated resource list, learning path); length or number of modules; language; sources to use (optional); deadline; free or paid distribution.

**pricingRule:** curating existing resources = low end; creating original notes and quizzes = midpoint; full course outline or complex technical content = high end.

**workflowStages:**
1. Define learning outcomes and structure, approved by the client
2. Research and gather reliable sources (links are checked and saved)
3. Draft materials in the agreed format
4. Add practice: quizzes, exercises or flashcards with answers
5. Review for accuracy and clarity
6. Deliver and revise

**deliverables:** the materials in the agreed format(s) · answer keys · source list · optional editable versions.

**turnaround:** small packs 2–4 days; full course outlines 5–10 days.
**revisions:** 2 rounds.
**completionChecklist:** outcomes covered · facts and sources checked · answer keys correct · links working · original wording (no copied text) · files delivered · client approved.
**notes:** all content is original or properly credited; does not copy paid course content.

---

# B. GRAVATAR SERVICES

## 13. Professional Identity Consultation — $25 (fixed)
**intakeFields:** your goal (job search, freelancing, business, personal brand); the email address(es) you use online; current Gravatar or profile links (if any); public profiles you have (LinkedIn, GitHub, portfolio, social); target audience; concerns (privacy, consistency, impersonation); preferred call time.

**pricingRule:** fixed $25 for one consultation with written plan.

**workflowStages:**
1. Review of the client's public profiles and Gravatar presence (what a visitor sees today)
2. Consultation call (30–45 min)
3. Written identity plan: photo, display name, bio, links, consistency across platforms, privacy settings
4. Walkthrough of the plan; client questions
5. Optional upsell: Profile Personalization to implement the plan

**deliverables:** written identity plan (PDF) with a priority checklist · bio options (2–3) · recommended avatar guidelines · privacy checklist.

**turnaround:** call within 3 days; written plan within 24 hours after the call.
**revisions:** 1 round of changes to the written plan.
**completionChecklist:** call completed · plan delivered · bio options included · client questions answered · client approved.

## 14. Profile Personalization — $10–$20 (quote)
**intakeFields:** email address linked to the Gravatar; avatar (upload or request design help); display name; short bio or draft; links to show (website, social, portfolio); verified accounts to connect; privacy preferences (what to show or hide); style (professional / creative / minimal).

**pricingRule:** $10 = avatar + bio + links; $15 = plus connected accounts and layout polish; $20 = plus avatar edit or design, multiple email addresses, or rewritten bio.

**workflowStages:**
1. Client invites or provides access through the platform's supported method (no password sharing; client signs in themselves during a short call if needed)
2. Prepare avatar, name, bio, links, accounts
3. Preview approved by client
4. Apply changes and check how the profile appears
5. Confirm on a public profile page and where the avatar shows

**deliverables:** updated profile · before/after screenshots · summary of settings.

**turnaround:** 24 hours after receiving all content.
**revisions:** 2 minor revisions.
**completionChecklist:** avatar crops correctly · bio proofread · links work · connected accounts verified · privacy settings applied as agreed · client approved.

## 15. Custom Domain Mapping — $15–$30 (quote)
**intakeFields:** domain name; registrar or DNS provider (e.g. GoDaddy, Namecheap, Cloudflare); the profile or site the domain should point to; root domain or subdomain; current DNS records (screenshot); email addresses on the domain (so nothing breaks); who has access to the DNS panel.

**pricingRule:** $15 = one subdomain with standard records; $20–$25 = root domain or redirect rules; $30 = existing email/DNS complexity, multiple records or troubleshooting. Domain registration cost is not included.

**workflowStages:**
1. Review current DNS and list every existing record to avoid breaking email or other services
2. Export or screenshot current DNS (backup)
3. Add or change records following the target platform's current instructions
4. Wait for propagation and verify (checks from more than one location)
5. Confirm SSL/HTTPS and redirects work
6. Hand over a record of the final settings

**deliverables:** working custom domain · DNS change report (before/after) · short renewal and ownership notes.

**turnaround:** setup 1 day; propagation can take from minutes to 48 hours.
**revisions:** fixes for anything caused by the change are free for 7 days.
**completionChecklist:** DNS backup saved · email still works · domain resolves from several locations · HTTPS valid · www/non-www behavior tested · report delivered · delegated DNS access removed.

---

# C. M R S IPTV

## 16. VIP Pass (1, 2, 6 or 12 months)
**intakeFields:** plan length (1 / 2 / 6 / 12 months); device(s) to use (smart TV brand and model, Android box, phone, tablet, PC, Fire Stick, other); app already installed or needs guidance; country and internet provider; internet speed (approximate); preferred language for support; preferred channels or regions (optional, for the support team to guide).

**pricingRule:** price per plan as set in admin (seeded as "Set price"). Optional multi-month discounts and renewal discounts are admin settings.

**workflowStages:**
1. Plan selected and payment submitted
2. Admin verifies payment
3. Subscription record created automatically (start date = activation, end date = plan length)
4. Credentials or activation details delivered **only inside the client portal** (not in public chat or email)
5. Setup guide shown for the client's device, with screenshots
6. Test: client confirms channels play
7. Support window for setup issues (first 48 hours priority)
8. Reminders at 7, 3 and 1 days before expiry with one-tap renew
9. Auto-lock to Expired after the end date unless renewed

**deliverables:** active subscription · device setup guide · portal access to subscription details (plan, dates, days left) · support contact.

**turnaround:** activation within 1 hour of verified payment during working hours (target), otherwise within 12 hours.
**revisions/support:** setup help and troubleshooting during the plan; if the service cannot be made to work after support attempts within the first 24 hours, refund is available by agreement.
**completionChecklist:** payment verified · subscription dates correct · credentials delivered in the portal · client confirmed playback · device guide viewed · expiry reminders scheduled.
**notes:** streaming quality depends on the client's internet and device. Admin must only offer content and sources that the business is authorized to distribute; the Terms page should state acceptable use, no resale by clients, and the refund rule above.

---

## Admin presets for the seeds
- Add a global setting: **default revision allowance**, **deposit threshold ($100)**, **working hours**, **auto-approve days (5)**, **data retention days (90)**.
- Each service's configuration should be duplicable (e.g. "Logo design" as a variant of Graphics Design).
- Show an **estimated time** and **what you'll get** summary on every service card, taken from `turnaround` and `deliverables`.
- Include a printable **order summary** (scope, deliverables, turnaround, revisions, price) that the client accepts with one click before paying; that accepted summary is the agreed scope for the order.
