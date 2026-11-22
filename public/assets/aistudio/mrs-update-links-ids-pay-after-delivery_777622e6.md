# M R S — Update: Service Links and IDs + Manual Pay-After-Delivery (Follow-up Prompt for Google AI Studio)

Paste everything below the line into the same AI Studio project as a follow-up prompt. It builds on the earlier prompts (site, Client ID portal, service work systems). **Do not remove existing features.** Where this update conflicts with the earlier "pay before work starts" rules, **this update wins**.

---

Update the M R S app with two changes:

1. Every service gets its own permanent **ID and links**.
2. Payments stay **manual** (no payment gateway), and the system supports **payment after each project delivery**, with the final files locked until the owner verifies the payment.

---

# PART 1 — Service IDs and links

## 1.1 Service IDs (seed these exactly; admin can add more)
| Service ID | Slug | Service |
|---|---|---|
| S-MRS-01 | ai-digital-productivity | AI & Digital Productivity |
| S-MRS-02 | technical-writing-proofreading | Technical Writing & Proofreading |
| S-MRS-03 | website-management | Website Management (Blogger/WordPress) |
| S-MRS-04 | it-support-troubleshooting | IT Support & Troubleshooting |
| S-MRS-05 | app-store-publishing | App Store Publishing |
| S-MRS-06 | ats-cv-resume | Advanced ATS CV & Resume |
| S-MRS-07 | web-setup | Web Setup Services |
| S-MRS-08 | tutoring | Peer & Subject Tutoring |
| S-MRS-09 | graphics-design | Graphics Design |
| S-MRS-10 | virtual-assistance | Virtual Assistance & Admin Support |
| S-MRS-11 | data-entry | Data Entry |
| S-MRS-12 | online-learning-resources | Online Learning Resources |
| S-GRV-01 | gravatar-identity-consultation | Professional Identity Consultation |
| S-GRV-02 | gravatar-profile-personalization | Profile Personalization |
| S-GRV-03 | gravatar-custom-domain-mapping | Custom Domain Mapping |
| S-IPTV-01 | iptv-vip-pass | M R S IPTV VIP Pass |

IPTV plan variants get their own IDs: `S-IPTV-01-1M`, `S-IPTV-01-2M`, `S-IPTV-01-6M`, `S-IPTV-01-12M`.

IDs are permanent: never reused or renumbered, even if a service is hidden.

## 1.2 Links for every service
Add a `siteBaseUrl` setting (admin) and generate these automatically from it. Never hard-code the domain.

- **Service page:** `{siteBaseUrl}/services/{slug}` — the canonical link to share
- **Short link:** `{siteBaseUrl}/s/{serviceId}` (e.g. `/s/S-MRS-06`) — redirects to the service page
- **Direct order link:** `{siteBaseUrl}/order/{serviceId}` — opens the service's intake form (from section 3 of the work-systems prompt)
- **Category pages:** `/services/category/mrs`, `/services/category/gravatar`, `/services/category/iptv`
- **Tracking:** any link accepts `?ref=` (e.g. `?ref=linkedin`, `?ref=whatsapp`) stored on the order so the owner can see where clients come from

Every service page and service card shows: the **Service ID** (monospace badge), a **Copy link** button, a **Share** button (WhatsApp, LinkedIn, email, copy), and a **QR code** for the page link.

The Services search box accepts a Service ID (typing `S-MRS-06` jumps straight to that service). Clients can also paste a Service ID in the AI concierge chat.

## 1.3 Other IDs (generated server-side, unique, never editable)
- Client ID: `MRS-YYMM-XXXX` (already specified)
- Order ID: `ORD-YYMM-NNNN` — the order also stores the Service ID it came from
- Invoice ID: `INV-YYMM-NNNN` (one invoice per delivery, see Part 2)
- Payment reference code: `PAY-YYMM-NNNN` — shown to the client to write in the payment note
- Receipt ID: `RCP-YYMM-NNNN`

Show the Service ID, Order ID and Invoice ID on every order, invoice, receipt, email and portal screen so both sides can refer to them.

## 1.4 Admin "Share Kit" page
A page listing all services in a table: Service ID, name, short link, page link, order link, QR download, **Copy** buttons, view count, orders count. A **Copy all links** button exports the list as text and CSV, ready to paste into a profile, proposal or message.

---

# PART 2 — Manual payments and pay-after-delivery

## 2.1 Principle
There is no automatic payment gateway. The client sends money to one of the owner's listed accounts or wallets, then submits proof. **A payment is "paid" only after the owner verifies it.** Final deliverables are released only after that verification.

## 2.2 Payment timing modes (per service, admin-editable)
- **Mode A — Pay after delivery (locked):** work is delivered as a locked preview; the client approves the preview and pays; final files unlock after the owner verifies the payment.
- **Mode B — Deposit, then balance after delivery:** a deposit (`depositPercent`, default 50) is paid and verified before work starts; the balance is paid after delivery to unlock the final files.
- **Mode C — Prepay:** full payment verified before work or access begins.

Each service has `paymentTimingNewClient` and `paymentTimingTrustedClient`. Seed defaults:

| Service ID | New client | Trusted client | Reason |
|---|---|---|---|
| S-MRS-01 | B | A | build and handover can be locked at the handover stage |
| S-MRS-02 | A (B if quote > $100) | A | file-based |
| S-MRS-03 | B | A (per task batch) | live site changes can't be locked |
| S-MRS-04 | C | A | live fixes can't be locked |
| S-MRS-05 | C | A | live store changes can't be locked |
| S-MRS-06 | A | A | file-based, locked preview |
| S-MRS-07 | B | A | live site; handover is the lock |
| S-MRS-08 | C | A (pay after each session) | live sessions |
| S-MRS-09 | A (B if quote > $100) | A | watermarked previews |
| S-MRS-10 | C (weekly blocks) | A (invoice weekly) | ongoing work |
| S-MRS-11 | A (B if quote > $50) | A | partial delivery lock |
| S-MRS-12 | A | A | watermarked previews |
| S-GRV-01 | C | A | live call; written plan locked |
| S-GRV-02 | C | A | live profile changes |
| S-GRV-03 | C | A | live DNS changes |
| S-IPTV-01 (all plans) | C | C | access can't be recalled, so always prepaid |

Admin can override the mode on any single order. A global switch **"Pay after delivery for everyone"** sets Mode A for all services except IPTV; show a warning when it is turned on that live-change services can't be locked.

## 2.3 Client trust tiers
- **New:** uses the `New client` mode.
- **Trusted:** after 2 completed orders paid within the due date (setting), with no disputes, the client is promoted automatically and uses the `Trusted client` mode. Admin can promote or demote manually.
- **Prepay only:** set automatically when an invoice is 7+ days overdue; all new orders need Mode C until the balance is cleared and admin restores the tier.
- **Blocked:** set manually, or automatically at 30+ days overdue. Blocked clients cannot place new orders.

## 2.4 Order agreement (shown before submitting any order)
Show a short summary: Service ID, scope, price or quote, payment mode, due date rule, revision allowance. Require a checkbox: **"I agree to pay within {dueDays} days of delivery. Final files are released after my payment is verified."** Store the acceptance (Client ID, timestamp, text version, IP) on the order. This accepted summary is the agreed scope.

## 2.5 Delivery lock (server-enforced)
When a deliverable is marked **Delivered** on an unpaid order:
- Client sees a **preview**, not the final file: watermarked pages/images ("PREVIEW — UNPAID — {Order ID}") for documents and designs, a partial sample for data (first 25 rows), screenshots or a screen recording for builds, and a read-only link for sites.
- **Final files are stored privately** and the download button stays disabled. Downloads are generated by a secured server function that returns a short-lived signed link **only if the invoice status is `paid_verified`**. Hiding the button in the UI is not enough; storage and database rules must block direct access.
- The client can still **Approve preview**, **Request revision** (counts against the allowance) or **Report a problem**.
- Previews are watermarked server-side; keep the original text unselectable in preview PDFs.

For live-change services (site changes, DNS, store submissions, IT fixes, profile changes) the "preview" is a delivery report with before/after screenshots and a short walkthrough; the lock applies to the written report, source files and handover documents, and access is removed or handed over only after payment. This is why new clients use Mode B or C for these.

## 2.6 Invoice lifecycle
- Statuses: `draft` → `issued` → `payment_submitted` → `paid_verified` | `rejected` | `partially_paid` | `overdue` → `cancelled` / `written_off`.
- **Automatic invoice on delivery:** when admin marks the order Delivered (Mode A) or the balance stage is reached (Mode B), the system issues an invoice: Invoice ID, Client ID, Order ID, Service ID, line items, total, deposit credited (if any), **amount due**, **due date** (= delivery date + `dueDays`, default 2 days; 7 days for quotes over $200), and a **payment link** `{siteBaseUrl}/pay/{invoiceId}` (works via the client's signed email link or portal login; shows only that invoice).
- **Reminders:** at issue, +24 hours, on the due date, +3 days overdue, +7 days overdue. Each message includes the payment link and a "Need more time? Message us" button (admin can extend the due date once with a reason).
- **Overdue handling:** status becomes `overdue` automatically after the due date; final files stay locked; the 7-day and 30-day tier changes in 2.3 apply; the admin dashboard shows an **Outstanding receivables** list with aging (0–2, 3–7, 8–30, 30+ days).
- Locked files and unpaid orders follow the 90-day retention rule from the earlier prompt; before deletion send a final notice.

## 2.7 Manual payment methods (admin Settings)
Each method has: label, type (mobile banking / bank transfer / PayPal-Wise / crypto), account name, **account number or ID or wallet address**, account type (e.g. "Send Money" or "Payment"), currency, network (crypto), minimum amount, instructions text, QR image, active flag, sort order, and a **fee-handling note** ("sender pays all fees; the full invoice amount must arrive").

Do not invent accounts or numbers. Ship with clearly labeled placeholders the owner replaces. Support multiple accounts per method.

## 2.8 Client payment page (`/pay/{invoiceId}`)
1. Header: Invoice ID, Order ID, Service ID/name, amount due, due date, status badge.
2. **Amount lock:** the BDT/other-currency equivalent is calculated at invoice issue using the admin exchange rate and saved on the invoice (the rate does not shift while the client is paying). Crypto amounts show the invoice USD value and a warning to send the exact asset and network.
3. Method cards: tap one to reveal the number/ID/address with a **Copy** button, QR (if any), step-by-step instructions, and the **payment reference code** `PAY-YYMM-NNNN` to put in the note or reference field where the method allows it.
4. **"I've paid" form:**
   - Method used and the account it was sent to
   - Transaction ID / TxHash (required)
   - Sender account (last 4 digits of the number, or first and last characters of the wallet)
   - Amount sent and currency (required)
   - Date and time of payment (required)
   - Screenshot or receipt (required for mobile banking and bank transfer; optional for crypto with a hash). Accept jpg, png, pdf up to 5 MB.
5. After submitting: status `payment_submitted`, a confirmation screen with "We'll verify within {verifySlaHours} hours during working hours (Asia/Dhaka)", and an email confirmation. The client cannot submit twice for the same Transaction ID.
6. If rejected: show the reason and let the client resubmit corrected proof.

## 2.9 Admin payment verification console
Queue sorted by oldest first; badge count in the header; one-tap alert via email and a WhatsApp deep link on every new submission.

For each submission show the invoice on the left and the proof on the right (zoomable screenshot), with an **auto-check panel**:
- Amount sent vs. amount due (match / short / over)
- Transaction ID duplicate check (same method + ID used before?) — enforce a **unique index** so one transaction can pay only one invoice
- Screenshot duplicate check (hash of the uploaded file compared with earlier uploads)
- Payment time vs. invoice issue time (flag if the payment is dated before the invoice or the order)
- Method and destination account match an active account in Settings

Owner actions:
- **Verify (full):** invoice → `paid_verified`; unlock final files; send receipt; mark order Approved/Completed if the client already approved; apply trust-tier progress.
- **Verify partial:** record the received amount; invoice → `partially_paid`; balance remains due; files stay locked until the balance clears.
- **Reject:** choose a reason template (wrong amount, transaction not found, wrong account, unclear screenshot, duplicate) or write one; client is notified and can resubmit.
- **Request info:** send a message without changing the status.
- Overpayment: record the difference as **account credit** applied to the next invoice or refunded on request.

**Optional helper — "Paste payment SMS":** the owner pastes the confirmation message received from the mobile-banking provider; the app does a best-effort extraction of transaction ID, amount, sender and time and suggests the matching invoice. Message formats differ and can change, so the owner always confirms manually. No SMS or bank account is connected automatically.

**Optional phase 2 (leave a clearly marked extension point, don't build now):** automatic crypto confirmation by checking the TxHash against a public block-explorer API, with the same manual confirm step.

All verification actions are written to the audit log (who, what, when, before/after).

## 2.10 Unlock and receipt
On `paid_verified`:
1. Final files and handover documents become downloadable (signed short-lived links) in the portal and are emailed as a link, not an attachment.
2. Receipt `RCP-YYMM-NNNN` (PDF) is generated: Invoice ID, Order ID, Service ID, Client ID, amount, method, transaction reference, date.
3. Order moves to Completed (once the client approved the delivery), the feedback request is sent, and access granted for the work is removed per the completion checklist.
4. Client's **Payments** tab shows the full history with receipts.

## 2.11 Disputes
A client can click **Report a problem** on a delivery. The order pauses its reminders for 7 days, the invoice shows `in_dispute`, and the admin gets a thread to resolve it. Admin outcomes: fix and reissue, partial credit (adjust the invoice total), or cancel. Every outcome is logged.

---

# PART 3 — Data model changes
- `services`: add `serviceId`, `slug`, `shortCode`, `paymentTimingNewClient`, `paymentTimingTrustedClient`, `depositPercent`, `lockableDeliverables` (bool), `viewCount`, `orderCount`.
- `clients`: add `trustTier` (`new` | `trusted` | `prepay_only` | `blocked`), `completedPaidOrders`, `creditBalance`, `overdueCount`.
- `orders`: add `serviceId`, `paymentTiming`, `agreementAcceptedAt`, `agreementVersion`, `agreementIp`, `ref`, `dueDays`.
- `invoices` (new): `invoiceId`, `orderId`, `clientId`, `serviceId`, `lineItems`, `total`, `depositCredited`, `amountDue`, `currency`, `rateSnapshot`, `dueDate`, `status`, `paymentReferenceCode`, `issuedAt`, `paidAt`.
- `payments`: add `trxKey` (`method:transactionId`, unique), `senderMask`, `paidAt`, `proofHash`, `amountReceived`, `autoCheckResult`, `rejectReason`.
- `deliverables`: add `previewPath`, `finalPath` (private), `locked` (bool), `unlockedAt`.
- `settings`: add `siteBaseUrl`, `paymentMethods[]` (fields in 2.7), `dueDays`, `largeQuoteDueDays`, `reminderSchedule`, `verifySlaHours`, `depositDefault`, `trustedAfterOrders`, `overdueToPrepayDays` (7), `overdueToBlockedDays` (30), `payAfterDeliveryForEveryone` (bool).
- `shareLinks` view/analytics: per Service ID view and order counts by `ref`.

# PART 4 — Client portal and admin additions
**Client portal:** invoice list with status and due dates, "Pay now" button, preview viewer for locked deliverables, approve/revision/report buttons, receipts, account credit, payment history, a badge showing payment mode ("Pay after delivery" / "Deposit required" / "Prepay").
**Admin dashboard:** Outstanding receivables with aging, "Awaiting verification" queue, "Locked deliveries" list (delivered but unpaid), client trust tier editor, revenue by service ID, Share Kit page.

# PART 5 — Notifications to add
Invoice issued · payment reminder (+24h, due, +3d, +7d) · payment submitted (to admin) · payment verified + receipt (to client) · payment rejected with reason · partial payment received · account moved to prepay-only · dispute opened/resolved · files unlocked.

# PART 6 — Security
- Final deliverables are never exposed by guessable URLs; downloads only via signed short-lived links after a server-side check of `paid_verified`.
- Clients can read only their own invoices, payments and previews; only admin can change invoice or payment status.
- Payment-link tokens are random, expire after 30 days, and show only that invoice.
- Enforce `trxKey` uniqueness server-side; validate file types and sizes; rate-limit proof submissions per invoice.
- Never display other clients' data; never log full account numbers in the audit log (mask them).

# PART 7 — Acceptance checklist
- [ ] All 16 services (and 4 IPTV plan variants) have unique Service IDs, page links, short links, order links and QR codes; Share Kit page lists and copies them
- [ ] Typing a Service ID in search opens that service; `?ref=` is stored on the order
- [ ] Order and invoice screens show Service ID, Order ID, Invoice ID
- [ ] Order agreement checkbox is required and stored
- [ ] Mode A order: deliver → locked preview → approve → invoice auto-issued with due date → client submits proof → admin verifies → final files unlock; a client cannot download the final file before verification, even with a direct URL
- [ ] Mode B and Mode C orders gate work or the balance as described
- [ ] Duplicate transaction ID and duplicate screenshot are flagged; one transaction can't pay two invoices
- [ ] Partial payment keeps files locked; overpayment becomes account credit
- [ ] Reminders and overdue handling run; clients drop to prepay-only at 7 days overdue and blocked at 30
- [ ] Exchange rate is locked per invoice
- [ ] Receipt PDF generated on verification
- [ ] Admin "Paste payment SMS" helper suggests a match but never verifies on its own
- [ ] Existing site, portal, work-system and admin features still work
