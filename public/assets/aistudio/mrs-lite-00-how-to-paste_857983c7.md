# M R S — Lite set: how to paste (read this first, do not paste it)

The earlier long prompts were too big for the free limits. This lite set replaces them. Each file is one job, written so AI Studio finishes the details with its own knowledge. You do not need the older long files any more; features they already built stay in your project.

## Order (one file at a time, wait until the build finishes, open the site and test, then paste the next)
| Step | File | What it adds | Size |
|---|---|---|---|
| 1 | `mrs-lite-1-payments-verification.md` | your 5 payment accounts, full verification pipeline, pay page, admin queue | ~8,300 characters |
| 2 | `mrs-lite-2-activation-codes-email.md` | activation code by months paid, sent by email, redeem and expiry | ~5,200 characters |
| 3 | `mrs-lite-3-services-project-files.md` | all 16 services A to Z, a Project File for every order | ~8,100 characters |
| 4 | `mrs-lite-4-design-theme.md` | theme, layout, pages, components, Bangla and English | ~6,200 characters |
| 5 | `mrs-lite-5-logo-camellia.md` | logo, favicon, share image, Camellia rename | ~10,000 characters |
| Files | `mrs-brand-kit.zip` | ready logo, icons and share image to upload into `public/brand/` | not pasted |

Before each paste, type this one line first, in the same message:
`Keep every existing feature. Later instructions override earlier ones. First list what you will change, then do it, then list anything you could not finish.`

## If AI Studio stops halfway or says the limit is reached
1. Send: `Continue exactly where you stopped. List what is done and what is missing, then finish only the missing parts. Do not rewrite finished files.`
2. If it still stops, paste the same lite file again but only one numbered section at a time (every file is split into numbered sections).
3. Free-tier limits reset; waiting and continuing is fine. Nothing is lost.

## What only you can do (the AI cannot do these for you)
- Put secrets in AI Studio's secrets panel, never in code: the Gemini key, the email provider key (Resend, SendGrid or Brevo), the webhook signing secret, and a Binance read-only key only if you turn crypto on.
- In Payoneer and Skrill, find out what a sender can use to pay you (usually your email). Enter it in admin as `payToEmail`; until you do, those two methods stay hidden from clients.
- Export a bKash and a Nagad statement from their apps and import it in `/admin/payments` after each batch of payments. This is the proof the system matches against. For quicker matching, forward the payment SMS messages to the signed webhook from your phone.
- Make one small test payment with each method and one test IPTV order before you tell anyone the site is live.
- Verify your sending domain (SPF, DKIM, DMARC) with your email provider so activation emails do not land in spam.
- Publish the site on Cloud Run (AI Studio's Deploy button) rather than only sharing the AI Studio link, so visitors cannot browse your code.

## Three honest cautions
- bKash and Nagad personal accounts are meant for personal transfers. Ask bKash or Nagad (bKash helpline 16247) whether personal accounts may receive payments for services, or open a merchant/business account when volume grows.
- Bangladesh restricts cryptocurrency. Binance Pay stays OFF until you have taken your own legal advice.
- Sell IPTV only for content you are authorized to provide.
