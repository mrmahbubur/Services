# How it works

Two parts: knowing that money really arrived, and getting the work done and delivered.

---

## Part 1 — Payment verification

### The one rule

An invoice is credited only from a **ledger record of money that actually arrived**.
Ledger records are written only from channels you control:

| Channel | Who writes it |
|---|---|
| `sms` | the operator's SMS, forwarded by your own phone |
| `api` | the provider's own transaction list, read with your read-only key |
| `email` | the provider's notice in your Gmail, proven genuine by Gmail |
| `statement` | a statement you import |
| `manual` | a line you type after looking at the provider's app |

Nothing a customer types, uploads or says creates a ledger record. A customer's
"I paid, transaction ID X" only tells the system which record to look for. The amount
credited is the amount in the record, never the amount the customer typed.

Each record can settle one payment, once. That is enforced inside a single database
transaction, and was tested with six simultaneous attempts against a real Firestore
emulator: exactly one succeeded.

### Per payment method

| Method | How the system learns money arrived | Settles by itself when | Waits for you when |
|---|---|---|---|
| **bKash Personal** `01810853282` | bKash's SMS, forwarded from your phone | Send Money; transaction ID matches the claim, or the customer wrote the invoice's `PAY-…` reference on the transfer; the balance in the SMS adds up; up to $50 | first SMS ever; balance does not add up; over $50; Cash-In instead of Send Money |
| **Nagad Personal** `01810853282` | Nagad's SMS, same phone | same as bKash | same as bKash |
| **Binance** UID `38927942` / ID `mrxshahn` | your Pay history, read with a read-only API key by a small script on your own computer | transaction ID matches; paid in USDT or USDC; up to $500 | another coin; a "crypto box" gift; ID does not match |
| **Payoneer** `108003450` | Payoneer's e-mail to your Gmail | the notice carries a payment ID that matches the claim; up to $50 | the notice carries no ID, says "pending", or shows two amounts |
| **Skrill** `407108385` | Skrill's e-mail to your Gmail (or its query interface, if your account has one) | the notice carries a transaction ID that matches the claim; up to $50 | as for Payoneer |

The limits are settings (`autoVerifyLimitsUsd`) and can be changed in the admin console.
Anything that waits for you is one tap: **Received** or **Not received**.

Why these channels: personal bKash and Nagad wallets have no API; the operator's SMS is
the only machine-readable proof. Payoneer has no API for individual accounts. Skrill's
needs a merchant-type account and a fixed IP address. Binance's does exist, but refuses
calls from Google Cloud, where the site runs, which is why its reader runs on your side.

### What is checked on every match

1. the record exists and has not been used
2. transaction ID (a mistyped `O`/`0`, `I`/`1`, `S`/`5`, `B`/`8` is recognised and noted)
3. paid to the official account for that method
4. a direct transfer, in the right currency
5. the record itself is clean (see the balance check below)
6. amount, converted at the rate frozen on the invoice
7. paid after the invoice was issued, and not long ago
8. payer, if the customer named one
9. reference on the transfer, if any, is this invoice's
10. no other order claims the same transaction
11. the receipt image was not used on another payment
12. within the automatic limit for that kind of evidence

The customer sees the result of each check; the page should show those results instead
of fixed labels.

bKash and Nagad are received on the same number, so customers sometimes choose the
wrong one on the pay page. A claim filed under either is looked up in both.

Amounts: a payment short by no more than 1% counts as paid in full. A larger shortfall
is credited as a part payment and the rest stays due. An overpayment settles the
invoice and you are told the surplus.

### Undoing a verification

A verified payment can be **reversed** by you (a wrong tap, or you sent the money back).
The invoice loses exactly what that payment gave it, files lock again where they should,
and the payment returns to your queue. It cannot verify itself again, and the provider's
record is set aside so a refunded transaction cannot pay for another order. Every
reversal is written to the audit log with your reason.

### Forged SMS

Signing proves a request came from your phone. It cannot prove the SMS was genuine: a
text can be sent to your phone with "bKash" as the sender name. So:

- only the operators' sender IDs count (`bKash`, `16247`, `NAGAD`, `16167`). An SMS from
  an ordinary number, including your own, is ignored;
- every operator SMS ends with your new balance. *Previous balance + this payment* must
  equal *the balance in this SMS*. A forger does not know your balance. A message that
  does not add up is never settled automatically, and you get an alert telling you to
  compare with the app;
- a genuine payment that arrives after a forged message is unaffected;
- the customer controls the "Reference" text, which is printed inside the SMS. A
  message in which a key field appears twice is set aside.

Cost of this safety: when an SMS is lost, or arrives in a wording the reader does not
know, the next bKash/Nagad payment needs one tap from you. After that the chain is
trusted again.

### Forged e-mail

"You have received money" e-mails are a common scam. An e-mail counts only if Gmail's own
verdict on it (the `Authentication-Results` header Gmail adds on receipt) says
`dmarc=pass` for the provider's domain. The sender's display name and the text prove
nothing. E-mails are read with fixed patterns, never by the AI model, because the payer's
name and note are printed inside them.

### What has not been tested against the real thing

I had no access to your accounts, so these rest on public documentation and on stand-ins:

| Item | Status |
|---|---|
| bKash / Nagad SMS wording | Read from publicly documented formats and your site's own samples. Your real messages may differ in detail. |
| Payoneer and Skrill e-mail wording | Not available to me. The reader is deliberately cautious; expect these two to need your tap until tuned with a real notice. |
| Binance: is the "Order ID" on the payer's receipt the same string as the API's `transactionId`? | Unknown. Prefixes such as `M_P_` are ignored when comparing. |
| Binance and Skrill APIs | Written to their published references; tested against stand-in servers. |
| Gmail collector | Tested against a model of Apps Script, with real HTTP to a real server. |

The admin console has a **test a message** tool that shows how a real SMS or e-mail
would be read, without recording it. GO-LIVE.md uses it before any money depends on it.

---

## Part 2 — Getting the work done

### Who does what, service by service

"Camellia" is the AI model, called from the server. She has no tools: she cannot verify a
payment, change a price or send a file. What she writes is checked by code before a
person, and then the customer, sees it.

**Camellia produces the deliverable** (you release it, or switch on auto-release):

| Service | From | Code blocks delivery if | Customer receives |
|---|---|---|---|
| S-MRS-06 ATS CV & Resume | their CV + job postings | a figure, skill, tool or name is not in their CV; a keyword was lifted from the posting | CV as PDF and Word; keyword report |
| S-MRS-02 Technical Writing & Proofreading | their document or notes | *proofreading:* a number, link or e-mail changed, code is not byte-identical, text was cut or padded. *writing:* a planned section is missing, a link was invented | PDF, Word, Markdown; change report |
| S-MRS-11 Data Entry | their file + wanted columns | the plan names a column that does not exist; a row is unaccounted for | CSV, Excel, JSON; report |
| S-MRS-12 Online Learning Resources | subject, level, outcomes | an objective is not taught or not tested; a quiz question is malformed; an exercise has no solution | learner book, answer key, Markdown package |
| S-GRV-01 Identity Consultation | their e-mail addresses, looked up live on Gravatar | the advice contains a link of its own | audit report |

For the CV, employers, job titles, dates, degrees and certifications are copied from the
customer's CV by code. The model is never asked for them, so it can neither change one
nor drop a role.

For data entry, the model sees the header and 15 sample rows and proposes a plan. Code
applies it to every row. Cells that break a rule are left as they are and listed. A scan
or photo has to be transcribed by the model and therefore always waits for a person.

**Camellia prepares and measures; you do the part that needs the customer's accounts;
the result is measured again:**

| Service | Camellia + code | You | Then |
|---|---|---|---|
| S-MRS-03 Website Management | Google PageSpeed measurement; fix plan | apply the fixes with admin access | measured again; before/after report |
| S-MRS-07 Web Setup | live DNS read; faults (duplicate SPF, no DMARC…); change plan | make the DNS changes | DNS read again; "done" is refused if nothing changed |
| S-GRV-03 Custom Domain Mapping | live DNS read; Gravatar profile check | add the record | DNS read again |
| S-MRS-05 App Store Publishing | listing text inside each store's character limits; data-safety answers; checklist | submit the build | submission report |
| S-MRS-01 AI & Digital Productivity | design, prompts, test cases, build checklist | build it in the customer's tools | hand-over document |
| S-MRS-09 Graphics Design | creative brief; palette with valid colour codes and computed contrast; exact text | design and upload the artwork | hand-over document |
| S-GRV-02 Profile Personalization | three bios of at most 160 characters; link order | apply it with the customer | update report |

**You do the work; Camellia prepares it and writes it up:**

| Service | Before | After |
|---|---|---|
| S-MRS-04 IT Support | diagnosis and session plan (no destructive instruction may reach the customer) | session report, from your notes only |
| S-MRS-08 Tutoring | lesson plan, worked examples, practice set. Graded work is flagged: teach the method, do not hand over a solution | session notes |
| S-MRS-10 Virtual Assistance | operating procedure and log format | work summary, from your log only |

A hand-over or report may state only what is in your notes; a figure you did not write
blocks it.

**Not automated:** S-IPTV-01. See the note at the end.

### The path of an order

```
order placed ──► price known? ──► deposit / prepayment in? ──► details complete? ──► work ──► your release ──► delivered
                  (you set it for      (verified payment)        (Camellia asks       (checks)                  (locked until paid,
                   quote services)                                 for what's missing)                           where that applies)
```

The state is recomputed from facts each time, so a restart or a repeated call cannot
leave an order half-moved.

- **Pay after delivery** (for example the CV, for new clients): work starts at once; the
  files are delivered locked with a preview; they unlock the moment the payment is
  verified.
- **Deposit**: work starts when the deposit is verified.
- **Prepaid**: nothing is generated or looked up before the payment is verified.

### Release

By default nothing reaches a customer until you press **Release**. A draft whose
blocking checks failed cannot be released by accident: you send it back with a note, or
choose "release anyway", which is written to the audit log.

For the five services Camellia completes herself you can switch on **auto-release**, one
service at a time. Then a draft that passes every blocking check is delivered without
you. A draft that fails one still waits. I left it off by default: the checks catch
invention, not poor judgement, and no real model output has been through them yet.

### Other behaviour

- If the customer ticked "no AI on this order", the model is not called.
- If no model is configured, the order becomes a task for you. If the model, or a
  lookup service (Gravatar, PageSpeed, DNS), is briefly unreachable, the job waits and
  tries again, up to four times; after that you are told. Nothing is faked.
- Revisions: the customer can ask up to the number included; the new files replace the
  old ones.
- Passwords typed into an order form are refused. Access to a customer's accounts is
  arranged directly, never through the site.
- The server never opens an address a customer supplies. Their site or domain is only
  named to Google's PageSpeed tester and Google's public DNS.

### Limits you should know

- **No real model output has been tested.** No Gemini key was available. The pipeline
  and every check were tested with scripted model answers, including dishonest ones.
- PDFs print Latin text only. Bengali and other scripts appear as "?" in the PDF; the
  Word file is correct, and the check says so.
- A CV or document that arrives as a PDF or image is transcribed by the model first.
  That step cannot be cross-checked by code; the draft is marked for you to compare.
- The learning package is Markdown, not SCORM, although the site promises SCORM.
- The checks catch fabricated facts, changed numbers, invented links and broken
  structure. They do not judge whether the writing is good.

### S-IPTV-01

I did not build automatic delivery for the IPTV pass. "15,000+ channels including live
sports and cinema" from $12 a month is the usual shape of unlicensed stream resale, and
I will not build the part that issues access to it. Payments for it are verified like
any other, and the order then waits for you. If you hold redistribution licences for
those channels, tell me and I will add a delivery step.
