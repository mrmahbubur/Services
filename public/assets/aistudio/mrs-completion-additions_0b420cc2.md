# M R S — Completion Additions: Launch-Ready Site and Finished Client Work (Follow-up Prompt for Google AI Studio)

Paste everything below the line into the same AI Studio project as a follow-up prompt. It builds on the earlier prompts (site + portal, service work systems, links/IDs + manual pay-after-delivery). **Do not remove or rewrite existing features.**

**Tip:** this is a large update. Ask AI Studio to implement it in phases and test after each phase: Phase 1 = sections 1–3, Phase 2 = sections 4–6, Phase 3 = sections 7–9, Phase 4 = section 10.

---

Extend the M R S app with the features below so the site is trustworthy, secure and complete for the whole client journey, from first visit to finished, paid and reviewed work.

# 1. Trust and credibility
- **About page:** photo, short bio, skills, years of experience, working hours with time zone (Asia/Dhaka) shown with the visitor's local time, languages spoken, tools used.
- **Portfolio / sample work** per service (linked from each service page): admin uploads items with title, description, results, and a watermark option; shown as a gallery. Every item has a "Request something like this" button that opens the order form for that Service ID.
- **Verified reviews:** after an order is completed, the client is invited to rate (1–5) and comment. Show reviews only with the client's permission (checkbox on the form), labeled **"Verified client"** and with the Service ID. Average rating and review count appear on each service card. Admin can hide a review but cannot edit its text.
- **Guarantee box** on service pages (editable): "Work matches the agreed scope or we fix it free."
- **Transparent pricing block:** shows price rule, turnaround, revisions included, payment timing (from the service's payment mode) and what is not included.
- **Trust strip** in the footer and on the payment page: private files, manual payment verification, no password sharing, data deletion on request.

# 2. Legal pages, consent and policies
- Pages with editable text (starter text in section 12): **Terms of Service, Refund & Cancellation, Privacy Policy, Acceptable Use, IPTV Terms**. Each has a version number and "last updated" date. When a version changes, clients must re-accept it at their next login.
- **Order agreement** already exists; link it to the current Terms version.
- **Cookie notice** with Accept / Reject for non-essential cookies (analytics only); the site works fully if rejected.
- **Data requests:** a form in the portal "Download my data" and "Delete my data". Deletion removes files and personal data but keeps invoices and payment records required for accounting (anonymized where possible).
- **Business details** (admin settings, shown on invoices and receipts): business name, owner name, address (optional), email, phone/WhatsApp, tax or registration ID (optional).

# 3. Communication and notifications
- **Per-order messaging:** one thread per order with text, file attachments, timestamps, read receipts and an internal-notes tab visible only to admin. Clients get email on new messages; admin gets the alert described below.
- **Saved replies (admin):** library of canned replies and the email templates in section 12, editable, with placeholders like `{{clientName}}`, `{{orderId}}`, `{{serviceName}}`, `{{dueDate}}`, `{{paymentLink}}`.
- **Notification preferences (client):** email on/off per event type (essential payment and delivery emails cannot be turned off), preferred contact channel (email / WhatsApp), time zone.
- **Support hours banner:** shows current availability based on working hours and an expected reply time; shows "Back on {date}" when out-of-office mode is on.
- **Out-of-office mode (admin):** pause new orders or accept them with a note, set return date, auto-reply to new messages, extend due dates automatically for open invoices during the pause.
- **Contact channels:** floating contact button with email, WhatsApp link, Telegram link (links set in admin), and Calendly booking.

# 4. Owner mobile experience and alerts
The owner mainly uses a phone.
- Make the **entire admin dashboard fully usable at 360px width**: stacked cards, large tap targets, sticky action bar for Verify / Reject / Deliver.
- Make the site an installable **PWA** (manifest, icons, offline fallback page).
- **Push notifications** to the admin device for: new order, new message, payment submitted, invoice overdue, deadline within 24 hours. Fall back to email and WhatsApp deep link if push permission is denied.
- **Today view** on the admin home: tasks due today, deliveries awaiting QA, payments awaiting verification, overdue invoices, upcoming sessions — one scrollable page.

# 5. Security and anti-abuse
- **Bot protection** (Cloudflare Turnstile or reCAPTCHA) on order, contact, login and proof-submission forms.
- **Admin sign-in:** Google sign-in restricted to the owner's email, plus 2-step verification required; session timeout after 30 minutes idle; list of recent admin sign-ins.
- **Client login:** Client ID + PIN with lockout (already specified); PIN reset by emailed one-time code; "log out all devices".
- **Uploads:** allowlist of types, size limits, virus/malware scanning if available, rename files server-side, store privately, and block executable files.
- **Headers and rules:** strict Content-Security-Policy, HTTPS only, secure cookies, Firestore and Storage rules reviewed for each collection, no secrets in client code.
- **Rate limits** on login, PIN reset, proof submissions, messages and file uploads.
- **Backups:** scheduled daily export of the database and files to a separate storage location; admin button "Restore guide" and a visible "last backup" timestamp.
- **Error monitoring** and an admin "System health" page (last errors, failed emails, failed uploads).
- **Audit log** for all admin actions (already specified) plus client sign-ins and file downloads.

# 6. Test mode and launch safety
- **Test mode switch (admin):** when on, orders/payments are flagged "TEST", excluded from revenue and reports, emails go only to the admin, and a visible banner shows on the site. Include a **"Run demo order"** button that walks through order → quote → payment proof → verify → delivery → unlock with sample data.
- **Maintenance mode:** shows a friendly page while the owner works on the site; admin still gets in.
- **Seed/demo data** can be cleared in one click before launch.
- **Launch checklist** page in admin (from section 13) with checkboxes; "Go live" is a final confirmation.

# 7. Completing client work — onboarding and files
- **Client brief and kickoff checklist:** after payment (or order acceptance in pay-after-delivery mode) show a "What we need from you" checklist per service (taken from `clientMustProvide`). Each item can be completed by upload, link or text. Status: Waiting on client / Received. Work cannot be marked Started until required items are received or admin overrides with a note.
- **Saved briefs:** clients can save their details and reuse them for repeat orders ("Reorder" button copies the previous order's brief).
- **File management per order:** folders (Client uploads / Work in progress / Deliverables / Receipts), versions (v1, v2, final) with timestamps and who uploaded, size limits (e.g. 25 MB per file; for larger files accept a shared-folder link), preview for images and PDFs, download all as ZIP (final files only after unlock).
- **Delivery note:** when marking an order Delivered, admin fills a short template: what was done, how to use it, what's included, known limits, recommended next steps. The client sees it above the files.
- **QA gate:** before Delivered can be clicked, the service's completion checklist must be ticked and a "self-check" note added (kept internal).

# 8. Completing client work — revisions, change requests, deadlines
- **Revision request form:** the client lists changes as numbered items (text + optional marked-up screenshot or file). Shows "Revisions used: 1 of 2". Each request is a task list the admin ticks off; the client then re-reviews.
- **Change request (scope creep):** if a request goes beyond the agreed scope, admin clicks **"Convert to change request"**: it creates an add-on quote (hours, price, new due date) that the client accepts or declines. Accepted add-ons are added to the same order's invoice.
- **Deadline rules:** each order has an agreed delivery date. Time spent waiting on the client (missing items, unanswered questions) **pauses the clock** and the date shifts automatically; the client sees why.
- **Client inactivity:** if a client doesn't respond for 5 days, send a nudge; at 10 days mark the order **On hold**; at 21 days offer to close it with billing for completed work.
- **Rush option:** at order time the client can choose **Rush** (delivery in less than the standard turnaround) with an admin-defined surcharge percentage and the high end of the price range.
- **Capacity control:** admin sets a maximum number of active orders; when full, new orders go to a **waitlist** with an estimated start date shown to the client.
- **Holiday calendar:** admin can mark unavailable dates; delivery estimates skip them.

# 9. Completing client work — time tracking, scheduling, IPTV support
- **Time tracking (hourly services):** admin timer (start/stop) and manual entry per order with a note; running total vs. estimate; client sees a **timesheet** (date, minutes, note) with an approve/question button; export timesheet as PDF and CSV; the 80% and 110% estimate rules from the work-systems prompt apply.
- **Scheduling:** embed the owner's Calendly (calendly.com/mrxshahin) or a built-in availability picker for discovery calls, tutoring, IT sessions and consultations. Show times in the client's time zone, send calendar invites (.ics) and reminders at 24 hours and 1 hour, and allow reschedule with the notice rule (12 hours). Each booking is linked to an Order ID.
- **IPTV support center (public + portal):** device setup guides (Android phone/TV box, smart TV, Fire Stick, iPhone/iPad, Windows/Mac) each with step lists and screenshot placeholders; troubleshooting FAQ (buffering, login problems, no channels, wrong time); **support tickets** with category, device, screenshot and status; **service notice banner** the admin can switch on during outages; renew button and subscription status in the portal; refund rule shown from the IPTV terms.
- **Bundles and coupons:** admin can create coupon codes (percentage or fixed, expiry, usage limit, per-service or all) and simple bundles (e.g. CV + LinkedIn rewrite). Coupons apply to the quote total and show on the invoice.
- **Referrals:** each client gets a referral code; when a referred client's first order is paid and verified, both receive account credit (amount set in admin).

# 10. Running the business — finance, CRM, analytics, SEO
- **Finance dashboard:** income by month, by service ID, by payment method; outstanding receivables with aging (already specified); expected income from open orders; optional **expense log** (tools, subscriptions, fees) and net income; **CSV export** of invoices, payments and expenses for the accountant; invoice template customization (logo, footer text, terms line).
- **Monthly report (PDF, auto-generated on the 1st):** orders, revenue, top services, average delivery time, on-time rate, average rating, overdue invoices, new vs. repeat clients.
- **CRM:** client notes, tags (VIP, slow payer, agency, student), lifetime value, orders count, last order date, source (`?ref=`), and a **"Follow up"** list of clients with no order in 60 days (with a prefilled message).
- **Analytics:** privacy-friendly page and funnel analytics (service view → order started → order submitted → paid), only after cookie consent where required; admin view of the funnel per Service ID.
- **SEO:** unique title and meta description per page and service, Open Graph image per service (auto-generated card with name and Service ID), `sitemap.xml`, `robots.txt`, `Service` and `Review` structured data (reviews only when real), clean 404 and 301-redirect manager, fast loading (lazy-load images, modern formats).
- **Optional blog/resources** section (admin-editable posts with images and categories) for guides such as CV tips, website care checklist, IPTV setup help.
- **Accessibility and language:** WCAG AA contrast, keyboard navigation, alt text fields on uploaded images, and an English / বাংলা toggle for the main interface text (admin can edit translations).

# 11. Deployment and technical operations
- Put all configuration in an admin **Settings** page and environment secrets (email provider key, Gemini key, Turnstile key); show "missing configuration" warnings.
- Provide a **staging vs. production** note in the README and a step-by-step guide for publishing from AI Studio and for connecting the site's own custom domain with HTTPS.
- **Email deliverability:** document how to verify the sending domain (SPF, DKIM, DMARC) for the chosen email provider so client emails don't land in spam; add a "Send test email" button in admin.
- **Environment checks** page: shows which integrations are connected (database, storage, email, push, Calendly, analytics, Gemini) with green/red status.
- Generate a README with setup steps, data model summary, backup/restore steps and the owner's daily workflow.

# 12. Starter content (seed as editable text)
Replace placeholders with the owner's details. These are starting drafts and should be reviewed before launch.

## Terms of Service (starter)
1. **Services:** M R S provides the services listed on this site. Each order is governed by its accepted order summary (scope, price, deliverables, turnaround, revisions).
2. **Payments:** payments are made manually to the accounts shown on the payment page. A payment is confirmed only after M R S verifies it. Payment timing depends on the order's payment mode (after delivery, deposit plus balance, or prepaid).
3. **Delivery and release:** final files and access are released after payment is verified. Previews are for review only and may not be used, published or redistributed.
4. **Client responsibilities:** provide accurate information, requested materials and timely feedback; share access only through invitation or temporary credentials; only submit content you have the right to use.
5. **Revisions:** each service includes the revisions stated on its page. New requirements are quoted separately.
6. **Delays:** delivery dates move when required client input is late. Inactive orders may be put on hold and closed.
7. **Confidentiality:** client materials are used only to complete the order and deleted after the retention period or on request.
8. **Limits:** results such as store approvals, search rankings, job offers or streaming quality depend on third parties and cannot be guaranteed.
9. **Liability:** liability is limited to the amount paid for the affected order.
10. **Changes and contact:** terms may be updated with a new version number; contact details are in the footer.

## Refund & Cancellation (starter)
- Before work starts: full refund of verified payments.
- After work starts: refund of the unused portion; completed work is billed.
- After delivery is approved: no refund. Work that doesn't match the agreed scope is corrected free of charge.
- Refunds are sent by the original method where possible; crypto refunds are sent in the same asset and network minus network fees.
- IPTV: if the service cannot be made to work after support attempts within the first 24 hours, a refund is available; after that, unused months are not refunded.
- Disputes: use **Report a problem** within 5 days of delivery.

## Privacy Policy (starter)
- **What we collect:** name, email, WhatsApp number, country, order details, uploaded files, payment proof, messages, technical data needed to run the site (and analytics only with consent).
- **Why:** to deliver services, verify payments, provide support, send notifications, prevent fraud and keep accounting records.
- **Sharing:** only with service providers needed to run the site (hosting, email, storage, analytics); never sold.
- **Retention:** order files deleted 90 days after completion (earlier on request); invoices and payment records kept as required for accounting.
- **Your rights:** download or delete your data from the portal or by email.
- **Security:** private storage, access controls, locked deliverables; payment account numbers are never stored in logs.

## Acceptable Use (starter)
No illegal, deceptive, abusive or infringing content or requests; no sharing of accounts or credentials outside the agreed process; no attempts to bypass preview locks or access other clients' data; no resale of delivered access (IPTV or accounts) unless agreed in writing. Violations may lead to order cancellation and account blocking.

## IPTV Terms (starter)
The subscription is personal and for the plan length purchased. Quality depends on the client's internet and device. Credentials are not to be shared or resold. Renewal reminders are sent before expiry; access locks automatically after the end date. Refund rule as in the Refund policy. The owner states that the content offered is used only where authorized (editable statement).

## Email and message templates (seed into saved replies)
1. **Order received** — "Hi {{clientName}}, thanks for your request for {{serviceName}} ({{serviceId}}). Your Order ID is {{orderId}}. I'll review the details and send your quote within 24 hours."
2. **Quote ready** — "Your quote for order {{orderId}} is ready: {{amount}}, delivery in {{turnaround}}. Review and accept it here: {{portalLink}}."
3. **Kickoff / what we need** — "To start order {{orderId}}, please add the items on your checklist: {{portalLink}}. Work begins once they're in."
4. **Preview ready** — "Your work for order {{orderId}} is ready to review. You can approve it, request changes or report a problem here: {{portalLink}}. Final files unlock after payment is verified."
5. **Invoice issued** — "Invoice {{invoiceId}} for {{amount}} is due on {{dueDate}}. Pay here: {{paymentLink}}. After you pay, submit your transaction ID so I can verify it."
6. **Payment reminder** — "A friendly reminder: invoice {{invoiceId}} ({{amount}}) is due {{dueDate}}. If you've paid, please submit your proof here: {{paymentLink}}. If you need more time, message me."
7. **Payment verified** — "Payment for {{invoiceId}} is verified. Your final files are unlocked: {{portalLink}}. Receipt {{receiptId}} is attached in your portal."
8. **Payment rejected** — "I couldn't verify your payment for {{invoiceId}}: {{reason}}. Please resubmit the correct details here: {{paymentLink}}."
9. **Revision received** — "I received your revision request for {{orderId}} ({{revisionsUsed}} of {{revisionsTotal}} used). I'll update you by {{newDate}}."
10. **Need your input** — "I'm waiting for {{item}} to continue order {{orderId}}. The delivery date is paused until I receive it: {{portalLink}}."
11. **Completed + feedback** — "Order {{orderId}} is complete. Thank you! If you have a minute, a short review helps others: {{reviewLink}}. Reorder anytime with one click."
12. **IPTV expiry** — "Your {{planName}} ends on {{endDate}} ({{daysLeft}} days left). Renew here: {{portalLink}}."

## FAQ seeds (10)
How do I order? · How long does a quote take? · How does payment work? (manual accounts, verification) · What is a Client ID and PIN? · When do I pay — before or after delivery? · How are my files protected? · How many revisions are included? · What if I'm not satisfied? · Which countries do you work with? · How do I contact support / book a call?

# 13. Launch checklist (seed into admin; owner ticks each)
**In the app:** all 16 services seeded with IDs, links and correct prices · payment accounts replaced with real details · payment verification tested end to end with a small real payment · emails delivering to inbox (not spam) · backups running and one restore tested · admin 2-step verification on · policies and FAQ edited and reviewed · test mode off and demo data cleared · analytics consent works · mobile layout checked at 360px · PWA install and push alerts tested on the owner's phone · IPTV device guides filled in.
**Outside the app (owner tasks):** register or choose the business name and domain · set up a dedicated email for the site · keep business payment accounts separate from personal · have the policies reviewed by a professional familiar with local law · confirm the rules of any freelance platform you also work on before directing clients to the site · write down how to recover the admin account · keep a secure copy of API keys.

# 14. Acceptance checklist for this update
- [ ] About, portfolio, verified reviews and guarantee blocks appear on the site
- [ ] Policy pages with versioning, re-acceptance and cookie consent work
- [ ] Per-order messaging, saved replies, notification preferences and out-of-office mode work
- [ ] Admin dashboard usable on a phone; PWA installs; push alerts arrive
- [ ] Bot protection, admin 2-step sign-in, upload checks, rate limits and scheduled backups are active
- [ ] Test mode and demo order run the full flow without affecting real reports
- [ ] Kickoff checklist, file versions, delivery note and QA gate work per order
- [ ] Revision requests, change requests, clock-pause, inactivity rules, rush, waitlist and holidays work
- [ ] Time tracking and timesheets export; bookings show correct time zones with reminders
- [ ] IPTV support center, tickets and outage banner work
- [ ] Coupons, bundles and referral credits apply correctly on invoices
- [ ] Finance dashboard, CSV exports, monthly report, CRM and funnel analytics show correct data
- [ ] SEO files, structured data, 404 and redirects are in place; English/বাংলা toggle works
- [ ] Email test, environment checks page and README are present
- [ ] All earlier features still work
