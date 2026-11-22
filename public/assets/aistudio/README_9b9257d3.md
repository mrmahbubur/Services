# mrs-core

A server module for `mrs-services.ai.studio` that makes two things real:

1. **Payment verification** for bKash, Nagad, Binance, Payoneer and Skrill, against
   evidence that money actually arrived.
2. **Fulfilment** of the listed services: Camellia (the AI model, on the server) does the
   work that software can do, code checks it, and the result is delivered through the
   client portal.

It is written to be added to the existing Express server with one call:

```ts
installMrsCore(app, { store: new FirestoreStore(db) });
```

## Read in this order

| File | What it is |
|---|---|
| [docs/SECURITY-FINDINGS.md](docs/SECURITY-FINDINGS.md) | What is wrong on the live site today. Three items are open to anyone. |
| [docs/HOW-IT-WORKS.md](docs/HOW-IT-WORKS.md) | How payments are verified and how each of the 16 services is fulfilled, including the limits. |
| [docs/INTEGRATION.md](docs/INTEGRATION.md) | Adding it to the site, with a prompt for the AI Studio agent. |
| [docs/FRONTEND-CHANGES.md](docs/FRONTEND-CHANGES.md) | What the page must change, with a prompt for the AI Studio agent. |
| [docs/GO-LIVE.md](docs/GO-LIVE.md) | Connecting your phone, Gmail and Binance, then proving each method with a small real payment. |
| [docs/API.md](docs/API.md) | Every route. |

## What is in the box

```
server/mrs-core/     the module (TypeScript; the only dependency is Express)
  payments/          ledger, matcher, settlement, SMS / e-mail / Binance / statement readers
  orders/            catalogue (16 services), clients, orders, invoices, order thread
  fulfilment/        engine, the model client, the workers, PDF / Word / Excel / zip writers
  security/          sign-in, request signing, rate limits
  store/             storage: Firestore (live), file (own machine), memory (tests)
collectors/          gmail-collector.gs (Apps Script), poller.mjs (Binance / Skrill)
bundle/              the same module as one plain-JavaScript file, if the source will not build
tests/               142 tests
tests-emulator/      7 tests against Google's Firestore emulator
tools/               mutation-check.mjs, dev-server.ts, hash-password.mjs
```

## What was verified, and how

| Check | Result |
|---|---|
| `npm test` | 142 of 142 pass (Node 20, Express 5.3) |
| Same HTTP, collector and operations tests on Express 4.22 | 24 of 24 pass |
| Storage adapter and money scenarios on Google's Firestore emulator 1.19, firebase-admin 13 | 7 of 7 pass. Six simultaneous settlements of one ledger record: exactly one succeeded. |
| `npm run mutation`: break each guarantee on purpose, expect a test to fail | 46 of 46 caught |
| Generated files opened by independent readers in strict mode (`unzip -t`, python-docx, openpyxl, pypdf) and the PDF rendered and inspected | valid |
| The compiled bundle run as plain JavaScript | order, signed SMS, automatic verification all work |
| TypeScript strict, no unused code | clean |

The mutation check matters most. On its first run five sabotages went unnoticed,
including one that disabled the signature check on session tokens. The code was right,
but no test would have caught a regression there. Those holes are closed.

## What was not verified

Nothing here has touched your accounts, your server, or a real AI model.

| Not verified | Why | Where it gets settled |
|---|---|---|
| Installing into your server | I can see the page, not the server code | INTEGRATION.md, step 7 |
| Real bKash / Nagad SMS wording | readers follow publicly documented formats and your site's own samples | GO-LIVE.md, "Read test" |
| Real Payoneer / Skrill e-mail wording | no samples; the reader is strict on purpose | GO-LIVE.md; expect one tap from you until tuned |
| Binance and Skrill APIs | no account; tested against stand-in servers | GO-LIVE.md |
| Whether Binance's receipt "Order ID" equals the API's transaction ID | cannot be known without a real payment | GO-LIVE.md, Binance step 3 |
| Gmail script inside Google | tested against a model of Apps Script with real HTTP | `selfTest` in the script |
| **Real model output** | no Gemini key; every worker was tested with scripted answers, including dishonest ones | GO-LIVE.md, "Camellia" |
| Named Firestore database, platform proxy count, preview address | the emulator and I cannot see them | self-test lines in INTEGRATION.md |
| The page | not changed; I only have its compiled script | FRONTEND-CHANGES.md |

## Decisions I made that you may want to change

- **You release work by default.** Auto-release is a per-service switch, off until real
  drafts have been through the checks.
- **Automatic payment limits** stay at the site's existing values: $50 by SMS or e-mail,
  $500 by API. Above that, you tap once.
- **Strict balance check for SMS.** After a lost or unreadable SMS, the next bKash/Nagad
  payment needs one tap from you. Setting `MRS_BALANCE_AUTOHEAL=3` trades some forgery
  resistance for fewer taps.
- **Camellia says she is an AI** when asked, and never states an account number.
- **IPTV is not automated.** See the end of HOW-IT-WORKS.md.

## Commands

```
npm install
npm test                 # 142 tests
npm run typecheck
npm run mutation         # sabotage check, about a minute
npm run test:firestore   # needs Java and firebase-tools; see tests-emulator/
npm run bundle           # rebuild bundle/mrs-core.mjs after changing the source
npm run demo             # stand-alone server on your own machine (file storage)
```

## Scale

Built for a business with hundreds to a few thousand orders. Admin lists read whole
collections; beyond that they need paging. With the collectors reporting every minute,
an idle site uses about 12,000 Firestore reads and 3,000 writes a day (the free
allowance is 50,000 and 20,000); each open order adds a few hundred reads.
