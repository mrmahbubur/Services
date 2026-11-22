# Changes the page needs

The server now holds the truth. The page's job shrinks to: show what the server returns,
send what the user does. It keeps no business data and no secret.

I could not edit the page (I only have its compiled script), so this is the work list for
the AI Studio agent, with a prompt at the end. API.md has every route.

## Rules for the page

1. **No business data in `localStorage`.** Remove `mrs_orders`, `mrs_clients`,
   `mrs_invoices`, `mrs_payments`, `mrs_deliverables`, `mrs_messages`,
   `mrs_subscriptions`, `mrs_approvals`, `mrs_audit`, `mrs_automation_*`, `mrs_settings`,
   `mrs_services`, `mrs_current_client`, `mrs_admin_session`. Keep only `mrs_theme`,
   `mrs_language`, `mrs_currency`, `mrs_cookie_consent`.
2. **No secret in the page.** No password, bridge secret, bot token, or "automation
   settings" containing them.
3. **No pretend results.** No fixed PASS labels, no timed canned replies, no generated
   placeholder files, no demo order, no simulator.
4. **No silent fallback.** When a request fails, show the error text the server sent
   (`error`). Never save locally and show success.
5. Sign-in state comes from the server: a request answers 401 → show the sign-in form.
   Sessions are cookies the server sets; ordinary same-origin `fetch` calls carry them.
   Nothing about a session is stored by the page.

## Screen by screen

### Catalogue and prices
- Load services from `GET /api/catalog` → `{ services: [...] }`. Same fields as today
  (`id`, `serviceId`, `slug`, `name`, `rateUSD`, …) plus `howItIsDone`, `fulfilmentMode`
  and `intake`. Show `howItIsDone` on each service page.
- Load payment details from `GET /api/payment-methods` →
  `{ registry: { methods: [{ method_id, label, currency, identifiers: [{ label, value }], instructions, trx_id_hint, … }] }, usdToBdt }`.
  The page must not carry its own copy of account numbers.

### Order form (`/request/:slug`)
- Render the service's `intake` list as form fields. Types: `text`, `longtext`,
  `choice` (use `choices`), `url`, `email`, `domain`, `file` (use `accept`). Fields that
  share a `group` are alternatives ("upload **or** paste"); show `help` under the field.
- Submit `POST /api/orders`:
  `{ serviceId, details, clientName, clientEmail, clientWhatsapp, clientCountry, couponCode, isRush, noAi, planMonths, intake: { key: value } }`
- `201` → `{ order, invoice, client, isNewClient, plainPin }`. For a new client show the
  **Client ID and PIN once**, with a clear "save these now". The PIN cannot be shown
  again.
- `400` with `fields: { key: message }` → show each message at its field.
- `409 existing_client` → "This e-mail already has a Client ID. Sign in to order."
- Upload files after the order exists: `POST /api/orders/:id/files`
  `{ field, fileName, base64Data }` (5 MB each).
- The price shown is `invoice.total`; for quote services `invoice` is `null` and the
  page says the owner will confirm the price.

### Client portal (`/portal`)
- Sign in: `POST /api/portal/login { clientId, pin }`. `401` wrong, `429` locked for 15
  minutes after five wrong PINs.
- Everything shown comes from `GET /api/portal/me` →
  `{ client, orders, invoices, payments, deliverables, messages }`, or per order from
  `GET /api/orders/:id` →
  `{ order, invoice, missing, messages, payments, deliverables, work: { state, questionsForClient } }`.
- `missing` lists what Camellia still needs. Let the client supply it with
  `POST /api/orders/:id/intake { intake: {...} }` and file uploads.
- Thread: `POST /api/orders/:id/messages { text }` returns the updated `messages`,
  including Camellia's real reply. **Remove** the keyword-matched replies and the
  1.2-second timer.
- Files: list `deliverables`. Each has `locked` and `downloadable`. Download with
  `GET /api/deliverables/:id/download`. A locked file answers `402`; show "unlocks when
  your payment is confirmed" and the pay button.
- **Remove** the client-side "mark complete / generate deliverables" action. A customer
  cannot complete their own order.
- "Request revision": `POST /api/orders/:id/revision { text }`. Show
  `order.revisionsUsed` of `order.revisionsTotal`.
- Sign out: `POST /api/portal/logout`.

### Pay page
- Show `invoice.amountDue`, the amount in Taka (`invoice.amountBDT`), and
  `invoice.paymentReferenceCode` with the instruction: *"Write this reference on the
  transfer. If you do, your payment is matched automatically and you do not need to
  enter anything here."*
- Submit `POST /api/payments`:
  `{ invoiceId, methodId, transactionId, amount, currency, paidAt, senderMask, note }`
  where `methodId` is the registry `method_id` (`bkash-personal`, `nagad-personal`,
  `binance-pay`, `payoneer`, `skrill`). Today the page sends `bank_transfer` for the three
  dollar methods; the server copes, but send the real id.
- Errors to show as written: `bad_transaction_id`, `already_paid`, `trx_already_used`,
  `previously_rejected`, `too_many_submissions`.
- **Remove** the `catch` that logs "API submission offline, proceeding with local store".
- Status: poll `GET /api/payments/:invoiceId/status` (every 10–15 s while the page is
  open) → `{ submission, checkResults, invoice }`.
  - Render **each** item of `checkResults` (`label`, `detail`, `status`: `pass`, `warn`,
    `fail`, `pending`, `skip`). Delete the six fixed PASS / SIGNED / VALIDATED rows.
  - Paid when `submission.status === "verified"` (or `invoice.status ===
    "paid_verified"`). `awaiting_ledger` = "waiting for the provider's record";
    `needs_review` = "the owner is confirming it"; `rejected` = show
    `submission.decisionReason`.
- Replace the text "No automated gateway… Deliverables unlock upon manual verification"
  with what is now true: *"Payments are checked automatically against the provider's own
  records. Some payments are confirmed by the owner."*

### Admin console
- Sign in: `POST /api/admin/login { password }`. Signed-in state:
  `GET /api/admin/session` (200 or 401). Sign out: `POST /api/admin/logout`.
  **Delete** the in-page password comparison.
- The existing payment screens keep working: same routes, same shapes
  (`GET /api/admin/payments?queue=`, `…/verify`, `…/owner-confirm`, `…/reject`,
  `/api/admin/ledger`, `/api/admin/ledger/import`, `/api/admin/reconcile-bulk`,
  `/api/admin/payment-settings`, `/api/admin/payment-registry`,
  `/api/admin/accountant-pack`). Two additions: when confirming a payment whose method is
  `usd_unspecified`, send `method` (`binance_pay`, `payoneer` or `skrill`); and let the
  owner enter the amount seen in the provider's app (`amount`) when it differs from the
  claim.
- Add a **Reverse** button on verified payments: `POST /api/admin/payments/:id/reverse
  { reason }`. Ask for the reason and a confirmation first.
- **Remove** the simulator tab (the route answers 410) and the local-only fallbacks in
  the confirm buttons ("Payment Confirmed (Local)").
- Add a home panel from `GET /api/admin/overview`: `needsYou` (quotes, payments, drafts,
  hands-on tasks, failed jobs, unread alerts), `bridges`, `configProblems`, `storage`.
- Add:
  - **Orders**: `GET /api/admin/orders`, `GET /api/admin/orders/:id`; set a price with
    `POST …/quote { amountUSD, note }`; message with `POST …/messages { text, internal }`;
    cancel with `POST …/cancel { reason }`.
  - **Work**: for an order's `job`, show `state`, `summary`, `qa` (each check with
    passed / failed and whether it blocks), `ownerTasks`, `questionsForClient`. Buttons:
    *Run again* `POST /api/admin/jobs/:id/run`; *Send back* `…/send-back { notes }`;
    *Hands-on step done* `…/owner-done { notes }`; *Release* `…/release { force }`
    (offer "release anyway" only after a `409 checks_failed`, showing the failed checks).
    Preview files with `GET /api/admin/deliverables/:id/download`; the customer's uploads
    with `GET /api/admin/orders/:id/files/:fileId`; add a file with
    `POST /api/admin/orders/:id/deliverables { fileName, title, base64Data }`.
  - **Wallet balance**: `GET /api/admin/balance`. When `suspectMinor` is set, ask *"Does
    your bKash app show Tk X?"* and on yes `POST /api/admin/balance { method, balance }`.
  - **Test a message**: `POST /api/admin/ledger/parse-test { kind: "sms", sender, text }`
    or `{ kind: "email", authResults, from, subject, body }`; show the result.
  - **Alerts** `GET /api/admin/alerts`; **Audit** `GET /api/admin/audit`;
    **Unread messages from providers** `GET /api/admin/quarantine`;
    **Self-test** `GET /api/admin/selftest?live=1`;
    **Auto-release switches** `GET` / `PUT /api/admin/fulfilment-settings
    { autoRelease: { "S-MRS-06": true } }`.

### Chat bubble
- `POST /api/concierge/chat` is unchanged for the page.
- Label Camellia as an AI assistant (for example "Camellia · AI assistant"). Remove "M R
  S Team" and "Verified Support" from her header.

### Wording
- Home page: the payment methods are bKash, Nagad, Binance, Payoneer and Skrill. Remove
  "Cards & Wise" and "Bank Transfer".
- Remove or replace with real figures: the per-service `viewCount`, `orderCount`,
  `rating`, `reviewCount`, the three named reviews, and the automation statistics
  ("touchless rate 42.5%" and the like). They are constants in the code.

## Prompt for the AI Studio agent (page)

> The server now provides the routes described in `docs/API.md` and
> `docs/FRONTEND-CHANGES.md`. Change the React app to follow
> `docs/FRONTEND-CHANGES.md` exactly. In summary:
>
> 1. Remove all business data from `localStorage` and all seeded demo data (orders,
>    clients, invoices, payments, deliverables, messages, approvals, audit, automation
>    rules/runs/settings, reviews, expenses). Load everything from the server.
> 2. Remove every password, secret and token from the client code, the admin password
>    comparison, the payment simulator, "Run Demo Order", the canned Camellia replies and
>    their timer, the client-side "mark complete" action, and the placeholder "AI draft"
>    generator.
> 3. Order form: build the fields from the service's `intake` list; submit to
>    `POST /api/orders`; show the Client ID and PIN once; show field errors.
> 4. Portal: sign in with `POST /api/portal/login`; read `GET /api/portal/me`; send
>    thread messages, intake answers, files and revision requests to the server; download
>    files from the server and show locked ones as locked.
> 5. Pay page: send `methodId`; delete the local-store fallback; show the server's
>    `checkResults` instead of the fixed PASS rows; show the payment reference.
> 6. Admin: sign in through the server; add the overview, orders, work, balance,
>    test-a-message, alerts, audit and self-test screens.
> 7. On any failed request show the server's `error` text. Never fall back to local
>    state and never show success for something the server did not confirm.
>
> Do not edit anything in `server/mrs-core/`.
