# Putting it into the existing site

The site is an Express server plus a React page, built and hosted by Google AI Studio.
This kit is a server module, `server/mrs-core/`, that you add to that server. It has no
dependencies of its own beyond Express, which the site already has.

I could not see your server code, only what the site serves. The steps below are written
for the usual AI Studio layout (a `server.ts` that creates `const app = express()`). If
yours differs, the prompt in step 6 still tells the AI Studio agent what to do.

## 1. Add the files

Copy the folder `server/mrs-core/` into the project, unchanged, so that
`server/mrs-core/index.ts` exists next to your `server.ts` (or adjust the import path).

Ways to get it in: connect the app to GitHub from AI Studio and commit the folder to that
repository, or upload the folder in the code editor.

Do not let the agent "tidy" or rewrite these files. They are tested as they are (see the
README); a rewritten copy is untested.

## 2. Install one package

`firebase-admin`, for durable storage. Ask the agent: *"add the npm package
firebase-admin"*.

## 3. Add the secrets

AI Studio → Settings → Secrets. Make up long random values; do not reuse anything that
was in the old code.

| Secret | Needed for | Value |
|---|---|---|
| `MRS_SESSION_SECRET` | all sign-ins | 40+ random characters |
| `MRS_ADMIN_PASSWORD` | your admin sign-in | 12+ characters, new |
| `MRS_SMS_SIGNING_KEY` | bKash / Nagad SMS from your phone | 24+ random characters |
| `MRS_INGEST_SECRET` | Gmail script and Binance poller | 32+ random characters |
| `GEMINI_API_KEY` | Camellia | already provided by AI Studio |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | alerts to your phone (optional) | from BotFather |
| `MRS_PUBLIC_BASE_URL` | sign-in cookie checks | `https://mrs-services.ai.studio` |
| `FIREBASE_SERVICE_ACCOUNT` | only if step 4 reports a permission error | the service-account JSON, as one line |

Optional: `MRS_GEMINI_MODEL` (default `gemini-flash-latest`), `MRS_PAGESPEED_API_KEY`,
`MRS_CRON_SECRET`, `MRS_SMS_BEARER_TOKEN`, `MRS_DAILY_MODEL_CALLS` (default 300),
`MRS_ADMIN_PASSWORD_HASH` (from `tools/hash-password.mjs`, instead of the password).

Two that depend on how the platform routes traffic, which I could not observe:

| Secret | Set it when |
|---|---|
| `MRS_ALLOWED_ORIGINS` | you use the admin console at a second address, such as the preview inside AI Studio's editor. Put that address here (comma-separated list). Otherwise saving anything from there answers "This request did not come from the site itself". |
| `MRS_TRUSTED_PROXY_HOPS` | the self-test's `your_address` line shows an address that is not your own public IP. Then every visitor is sharing one rate limit; set this to `2` and check again. |

A missing secret switches off the feature that needs it. It never leaves a door open:
with no admin password, the admin API answers 503.

## 4. Wire it into the server

In `server.ts`, **immediately after** `const app = express();` and **before**
`app.use(express.json())` and every existing route:

```ts
import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { installMrsCore, FirestoreStore } from './server/mrs-core/index.ts';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' }; // the project's Firebase config

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
const firebaseApp = initializeApp({
  credential: serviceAccount ? cert(JSON.parse(serviceAccount)) : applicationDefault(),
  projectId: firebaseConfig.projectId,
});
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

const app = express();
installMrsCore(app, { store: new FirestoreStore(db) }); // must be the first thing added to app
```

Why first:

- Routes added first win. The earlier handlers for `/api/admin/*`, `/api/payments*` and
  the rest (which had no sign-in check) can then no longer be reached, even if the agent
  forgets to delete one. This is tested.
- Signed requests from your phone need the exact bytes that were sent, so they must
  arrive before a JSON parser changes them.

The kit owns these path prefixes; anything under them that it does not define answers
404: `/api/admin`, `/api/payments`, `/api/ingest`, `/api/orders`, `/api/portal`,
`/api/catalog`, `/api/payment-methods`, `/api/concierge`, `/api/cron`, `/api/health`,
`/api/deliverables`. Everything else in your app is untouched.

Then delete the old handlers for those paths. They are dead code after this change, and
dead code that once marked payments as verified should not stay in the project.

## 5. Lock the database to the server

The kit stores everything in Firestore collections whose names start with `mrs_`. Only
the server may read or write them. Your page currently uses Firestore for one
connectivity check, so the simplest correct rules are:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read, write: if false; }
  }
}
```

(The server uses the Admin SDK, which is not subject to these rules.) If the page ever
needs its own Firestore data, allow only those collections, never `mrs_*`.

## 6. Prompt for the AI Studio agent (server)

Paste this once the folder is in the project:

> In this project there is a new folder `server/mrs-core/`. It is finished and tested.
> Do not edit, reformat or rewrite any file inside it.
>
> 1. Add the npm package `firebase-admin`.
> 2. In the Express server file, immediately after `const app = express()` and before
>    `app.use(express.json())` or any route, initialise firebase-admin (use
>    `FIREBASE_SERVICE_ACCOUNT` if that environment variable is set, otherwise
>    application default credentials), get Firestore for this project's
>    `firestoreDatabaseId`, and call
>    `installMrsCore(app, { store: new FirestoreStore(db) })`, imported from
>    `./server/mrs-core/index.ts`.
> 3. Delete every existing route handler whose path starts with `/api/admin`,
>    `/api/payments`, `/api/concierge` or `/api/health`, and any in-memory payment,
>    ledger, simulator or "bridge secret" code that only those handlers used.
> 4. Remove every secret, password and token from client-side code. In particular remove
>    the strings `mrs2026admin`, `mrs_bridge_secret_998124`,
>    `mrs_live_bridge_secret_2026` and the Telegram token, and the fields that held them.
> 5. Set the Firestore security rules to deny all client reads and writes.
> 6. Do not change the page yet; that is the next task.
>
> When done, show me the server file and confirm that `installMrsCore` is the first
> thing registered on `app`.

## 7. Check it

After deploying, from any computer:

```
curl -s -o /dev/null -w "%{http_code}\n" https://mrs-services.ai.studio/api/admin/payments
curl -s https://mrs-services.ai.studio/api/health/readiness
```

The first must print `401` (it printed `200` before). The second must say
`"database":"connected"`. If it says `in-memory (NOT durable…)`, the store was not
passed in. If it reports the database unreachable, the server has no permission to use
Firestore: create a service account with the *Cloud Datastore User* role in the Firebase
project, download its JSON key, put it in the `FIREBASE_SERVICE_ACCOUNT` secret, redeploy.

Then sign in and run the self-test (the page change in FRONTEND-CHANGES.md adds a
button; until then, from a terminal):

```
TOKEN=$(curl -s https://mrs-services.ai.studio/api/admin/login \
  -H 'Content-Type: application/json' -d '{"password":"YOUR NEW PASSWORD"}' \
  | sed -E 's/.*"token":"([^"]+)".*/\1/')
curl -s "https://mrs-services.ai.studio/api/admin/selftest?live=1" -H "Authorization: Bearer $TOKEN"
```

It lists each part and what is still missing. Bridges will show "never reported" until
GO-LIVE.md is done; that is expected.

## 8. Something must call the tick

Cloud Run gives the server processor time only while it is answering a request, so
queued work is moved along by `POST /api/cron/tick`. The Gmail script in GO-LIVE.md
calls it every minute. If you do not use that script, create a Cloud Scheduler job:
every minute, `POST https://mrs-services.ai.studio/api/cron/tick`, header
`Authorization: Bearer <MRS_INGEST_SECRET>`, deadline 5 minutes.

## If the TypeScript source will not build

The source imports files with `.ts` endings, which works when the server is run with
`tsx` or bundled by esbuild/Vite, and with Node's own TypeScript support. If your build
compiles with plain `tsc` and rejects that, use the pre-built single file instead:

```ts
import { installMrsCore, FirestoreStore } from './bundle/mrs-core.mjs';
```

It is the same code compiled to plain JavaScript (`npm run bundle` regenerates it).

## Not verified

- I have not seen or run your server, so step 4 has not been tried on it.
- The site's database is a *named* Firestore database. The emulator I tested against
  does not support named databases, so `getFirestore(app, databaseId)` with your ID is
  untested. It is the documented call.
- Whether AI Studio's hosted server has permission to reach Firestore with default
  credentials. Step 7 tells you which case you are in.
- How many proxies AI Studio's hosting puts in front of the server, and what address
  the preview runs at. Both have a setting above and a self-test line that shows what
  the server actually sees.
- Queries use equality filters only, which Firestore serves from its automatic indexes.
  If Firestore ever answers "this query requires an index", the error contains a link
  that creates it.

Tested: the module on Express 4.22 and 5.3, Node 20; the Firestore adapter against
Google's Firestore emulator with firebase-admin 13.
