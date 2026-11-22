# API reference

All bodies and answers are JSON. Every error has the shape
`{ "success": false, "error": "text for a person", "code": "machine_code" }`.

Sessions are HttpOnly cookies set by the sign-in routes; same-origin `fetch` carries them
without extra code. The sign-in routes also return a `token`, accepted as
`Authorization: Bearer <token>`, for tools and scripts. A request made with the cookie
that changes anything must come from the site itself (the browser's `Origin` header is
checked).

Money: amounts in answers are plain numbers in the stated currency (`15` = $15.00).
Fields ending in `Minor` are integers in hundredths (cents or paisa).

## Public

| Route | Purpose |
|---|---|
| `GET /api/health/liveness` | `{ status: "live", uptime }` |
| `GET /api/health/readiness` | `{ status: "ready" \| "degraded" \| "down", database, aiQuota, checks }`. `degraded` means usable but not fit for live use (for example in-memory storage). |
| `GET /api/catalog` | `{ services: [...] }`, each with `intake: [{ key, label, type, required, help, choices, accept, group, maxLength }]`, `howItIsDone`, `fulfilmentMode` |
| `GET /api/payment-methods` | `{ registry: { methods: [...], integrity_hash }, usdToBdt }` |
| `POST /api/concierge/chat` | `{ message, prefillService?, history? }` → `{ reply, recommendedService?: { id, serviceId, name }, handoffToOwner }` |
| `POST /api/orders` | Place an order. See below. No session needed for a new e-mail address. |
| `POST /api/portal/login` | `{ clientId, pin }` → `{ token, client }`. `401 bad_login`, `429 pin_locked` |
| `POST /api/portal/logout` | |

### `POST /api/orders`

```json
{ "serviceId": "ats-cv-resume", "details": "…", "clientName": "…", "clientEmail": "…",
  "clientWhatsapp": "…", "clientCountry": "…", "couponCode": "…", "isRush": false,
  "noAi": false, "planMonths": "12", "intake": { "cv_text": "…", "job_postings": "…" } }
```

`201` → `{ order, invoice | null, client, isNewClient, plainPin?, token? }`.
`plainPin` appears once, for a new client. `invoice` is `null` for quote services.

| Code | Meaning |
|---|---|
| `400 bad_intake` | `fields: { key: message }` |
| `400 secret_in_details` | a password or key was typed into the description |
| `409 existing_client` | that e-mail has an account; sign in first |
| `409 coupon_used` | |
| `429 rate_limited` | more than 10 orders an hour from one address |

## Client (signed in with Client ID + PIN)

| Route | Body → answer |
|---|---|
| `GET /api/portal/me` | → `{ client, orders, invoices, payments, deliverables, messages }` |
| `GET /api/orders/:id` | → `{ order, invoice, missing, messages, payments, deliverables, work }` |
| `POST /api/orders/:id/intake` | `{ intake: { key: value } }` → same as above |
| `POST /api/orders/:id/files` | `{ field, fileName, base64Data }` (5 MB; type must match the field's `accept` and the file's real content) |
| `POST /api/orders/:id/messages` | `{ text }` → `{ messages }` including Camellia's reply |
| `POST /api/orders/:id/revision` | `{ text }`. `409 not_delivered`, `409 no_revisions_left` |
| `GET /api/deliverables/:id/download` | the file, as a download. `402 locked` until the order is paid |
| `POST /api/payments` | `{ invoiceId, methodId, transactionId, amount, currency, paidAt?, senderMask?, note? }` → `{ submission, checkResults }`. Repeating the same claim returns the same submission. |
| `POST /api/payments/:id/evidence` | `{ fileName, base64Data }` PNG, JPG, WebP or PDF, 5 MB, at most 3. Context for the owner; never proof. |
| `GET /api/payments/:id/status` | `:id` may be a payment id, invoice id, order id or transaction id → `{ submission, checkResults, invoice }` |

`invoiceId` may also be the order id. Another client's ids answer `404`, as if they did
not exist.

`submission.status`: `awaiting_ledger` (no provider record yet), `needs_review` (the
owner is confirming), `verified`, `rejected`.

`checkResults`: `[{ id, label, status: "pass" | "warn" | "fail" | "pending" | "skip", detail }]`.

Claim errors: `400 bad_transaction_id`, `400 bad_amount`, `400 unknown_method`,
`409 already_paid`, `409 trx_already_used`, `409 previously_rejected`,
`429 too_many_submissions`.

`order.state`: `quote_pending`, `awaiting_payment`, `intake_pending`, `in_progress`,
`owner_review`, `delivered`, `revision`, `closed`, `cancelled`. `order.status` is the
wording to show. `order.deliverablesLocked` is true while delivered files wait for
payment.

## Owner (admin session)

Sign-in: `POST /api/admin/login { password }` → `{ token }`. `401 bad_login`,
`429 rate_limited`, `503 admin_not_configured`.
`GET /api/admin/session`, `POST /api/admin/logout`, `POST /api/admin/logout-everywhere`.

Without a session every route below answers `401 admin_required`.

**Payments**

| Route | Notes |
|---|---|
| `GET /api/admin/payments?queue=` | `needs_action`, `awaiting_ledger`, `auto_verified`, `rejected`, `all` → `{ counts, payments, ledgerEntries, settings, bridgeStatuses }` |
| `POST /api/admin/payments/:id/verify` | `{ ledgerEntryId, reason }` settle against a chosen ledger record |
| `POST /api/admin/payments/:id/owner-confirm` | `{ action: "RECEIVED" \| "NOT_RECEIVED" \| "CHECK", note, method?, amount? }` |
| `POST /api/admin/payments/:id/reject` | `{ reason }` |
| `POST /api/admin/payments/:id/reverse` | `{ reason }` undo a **verified** payment (wrong tap, or money sent back). The invoice loses the credit, files lock again if they should, and the payment returns to the queue for you to decide again. It never re-verifies by itself. |
| `GET /api/admin/payments/:id/evidence/:n` | the customer's receipt image |
| `PUT /api/admin/payment-settings` | limits, tolerance, kill switch, `usdToBdt` → `{ settings }` |
| `GET /api/admin/payment-registry` | the five official accounts |
| `POST /api/admin/ledger` | `{ method, trxId, amount, reason }` a line you saw in the provider's app |
| `POST /api/admin/ledger/import` | `{ method, rows: [{ trxId, amount, sender, date }], fileName }` or `{ method, csv }` |
| `POST /api/admin/ledger/parse-test` | shows how a message would be read; records nothing |
| `GET` / `POST /api/admin/balance` | wallet running balance; `POST { method: "bkash" \| "nagad", balance }` |
| `POST /api/admin/reconcile-bulk` | re-check every undecided claim → `{ checked, verifiedCount }` |
| `GET /api/admin/accountant-pack` | `{ csvContent, summary }` |
| `GET /api/admin/quarantine` | provider messages that could not be read |

**Orders and work**

| Route | Notes |
|---|---|
| `GET /api/admin/orders?state=` | |
| `GET /api/admin/orders/:id` | order, invoice, client, messages (with internal notes), payments, deliverables, `job` |
| `POST /api/admin/orders/:id/quote` | `{ amountUSD, note }` sets the price and issues the invoice |
| `POST /api/admin/orders/:id/cancel` | `{ reason }`. Refused once money was received. |
| `POST /api/admin/orders/:id/messages` | `{ text, internal? }` |
| `GET /api/admin/orders/:id/files/:fileId` | a file the customer uploaded |
| `POST /api/admin/orders/:id/deliverables` | `{ fileName, title, base64Data }` (7.5 MB) or `{ fileName, title, externalUrl }` |
| `GET /api/admin/deliverables/:id/download` | any file, released or not |
| `GET /api/admin/jobs?state=` | |
| `POST /api/admin/jobs/:id/run` | run again now |
| `POST /api/admin/jobs/:id/send-back` | `{ notes }` Camellia redoes it with your note |
| `POST /api/admin/jobs/:id/owner-done` | `{ notes }` after your hands-on step; triggers the verification / write-up pass |
| `POST /api/admin/jobs/:id/release` | `{ force? }`. `409 checks_failed` lists the failed checks; `force: true` releases anyway and is audited |
| `GET` / `PUT /api/admin/fulfilment-settings` | `{ autoRelease: { "S-MRS-06": true } }` |

`job.state`: `waiting_inputs`, `queued`, `running`, `owner_review`, `owner_task`,
`released`, `failed`. `job.qa`: `[{ id, label, passed, severity: "block" | "warn", detail }]`.

**Oversight**

| Route | Notes |
|---|---|
| `GET /api/admin/overview` | `needsYou`, counts, `bridges`, `configProblems`, `storage` |
| `GET /api/admin/alerts`, `POST /api/admin/alerts/:id/read` | |
| `GET /api/admin/audit` | `{ chain: { ok, entries, brokenAt? }, entries }` |
| `GET /api/admin/selftest?live=1` | `{ ok, checks: [{ id, ok, detail }] }` |

## Collectors (signed)

Every request carries `X-Timestamp` (Unix seconds) and
`X-Signature` = hex HMAC-SHA256(secret, raw body + timestamp). Requests older than five
minutes are refused.

| Route | Secret | Body |
|---|---|---|
| `POST /api/ingest/sms` (also `/api/payments/sms`) | `MRS_SMS_SIGNING_KEY`, or header `Authorization: Bearer <MRS_SMS_BEARER_TOKEN>` | *SMS Gateway for Android* `sms:received` event, or `{ sender, message }`, or `{ messages: [...] }` |
| `POST /api/ingest/email` | `MRS_INGEST_SECRET` | `{ messages: [{ id, authResults, from, subject, body, date }] }` |
| `POST /api/ingest/provider` | `MRS_INGEST_SECRET` | `{ provider: "binance", rows }`, `{ provider: "skrill", csv }`, `{ provider, error }` or `{ heartbeat: true }` |
| `POST /api/cron/tick?budget=&jobs=` | header `Authorization: Bearer <MRS_CRON_SECRET or MRS_INGEST_SECRET>` | `{}` → what the tick did |

An empty, correctly signed request counts as "the collector is alive".
