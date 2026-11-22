# M R S — Lite 2: Activation Codes and Email

Paste everything below the line into the same AI Studio project, after Lite 1 (about 5,200 characters).

---

Add the **M R S IPTV VIP Pass activation system** to the existing app. After a payment is verified (Lite 1, step P), the server issues an activation code that matches the **number of months paid** and emails it. Use your own best-practice knowledge for anything not specified. Real server code only; no placeholders.

## 1. Plans and months
Plans: 1, 2, 6 and 12 months (service IDs `S-IPTV-01-1M`, `-2M`, `-6M`, `-12M`). Each invoice line item stores `planMonths`. The server reads the months from the paid invoice line, never from anything the client types. Prices come from admin settings. If one invoice has several passes, issue one code per pass.

## 2. Code format and storage
- Format `MRS-XXXX-XXXX-XXXX-XXXX` using Crockford base32 (no I, L, O, U), generated with the server's cryptographic random generator, with a check character so typos are caught before any database lookup.
- Store only an HMAC-SHA256 hash of the code (server secret), the last 4 characters, plan months, invoice ID, payment ID, client ID, status (`issued`, `redeemed`, `expired`, `void`), issue time and expiry. The full code appears only in the email and in the client's portal while status is `issued`.
- One code per verified payment (idempotent: a retry or double click never makes a second code). Resending an email rotates the code: the old one becomes `void`.
- A code must be redeemed within 30 days of issue (admin setting). Admin can extend, void or reissue it, with a reason in the audit log. A refund voids unredeemed codes and ends a redeemed subscription.

## 3. Redemption (client portal "Activate pass")
- A POST endpoint (never a GET link that activates by itself) requires the client to be signed in with their Client ID or email link, accepts the code, normalizes it (uppercase, removes spaces and dashes, maps look-alike characters) and checks the check character. Rate limit: 5 attempts per hour per client and per IP, with a generic error message and a short lock after repeated failures.
- Use a Firestore transaction to mark the code `redeemed` and create or extend the subscription. Start = redemption time. End = start + N **calendar months**, clamped to the last day of a shorter month. A renewal while still active **stacks**: it adds N months to the current end date.
- After redemption show plan, start, end and days left. The owner delivers the IPTV access details (username, password or setup link) through the portal field only after redemption. **Never email or chat the credentials.**
- Expiry reminders at 7, 3 and 1 days before the end; on the end date mark the pass `expired` and hide the access details.

## 4. Email (transactional, through a real provider)
- Use an email provider with an API (Resend, SendGrid, Brevo or similar) with the key in server secrets, or SMTP. Build an **outbox** collection: queued, sent, failed, bounced; retry with backoff; handle bounce and complaint webhooks; show delivery status in admin. If no provider key is set yet, show the owner a clear banner and keep the message queued (do not pretend it was sent).
- Send only to the email on the verified order. Sender name "M R S Services"; give the owner setup steps for SPF, DKIM and DMARC for the sending domain.
- **Activation email:** subject `Your M R S IPTV VIP Pass activation code (N months)`. Body: greeting with the client's name, the plan and months, the code in large monospace with a Copy-friendly layout, the invoice and receipt IDs, three short steps (open the site, sign in, Portal → Activate pass), the expiry date for redeeming, what happens next, support contact, and the line "M R S will never ask for your payment PIN, OTP or password." Plain-text and HTML versions, mobile friendly, dark text on a light background for readability, brand logo at the top.
- Also send: payment verified (with receipt link), needs correction, pass activated (start and end dates), expiry reminders, code voided/reissued. Keep all email copy in editable admin templates (English and Bangla).
- The portal shows the same code to the signed-in client with a Resend button limited to 3 per day.

## 5. Admin `/admin/activation`
List codes (masked), status, plan months, client, invoice, issue and redeem times, email status. Actions: resend (rotate), void, extend redemption window, reissue, manual issue for a verified offline payment (needs a reason and a fresh login). Filters, CSV export, and a test mode that sends a sample email to the owner.

## 6. Tests
Duplicate verification event creates one code; wrong or mistyped code; code reuse; code from another client; expired code; 1/2/6/12-month date math including 31 January + 1 month and 29 February; renewal stacking; refund void; email failure then retry; concurrent redemption of the same code from two tabs.

## 7. Authorized content
On the IPTV page and the order form, add a short statement and a required checkbox: the service is sold only for content M R S is authorized to provide, and the buyer agrees to the terms. Admin keeps the supplier/licence note private.
