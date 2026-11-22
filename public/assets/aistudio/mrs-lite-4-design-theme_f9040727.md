# M R S — Lite 4: Theme, Layout and Interface (real, clean, usable)

Paste everything below the line into the same AI Studio project (about 6,200 characters). It overrides earlier design text where they differ.

---

Redesign the whole M R S interface so it looks like a real, trustworthy service business and is easy to use on a phone. Use your own design knowledge to finish every screen. Keep all features and data. Clean, calm, precise: a control-panel feeling, not a gaming look. **No fake content anywhere:** no invented testimonials, client counts, ratings, logos or "as seen on". Empty states are honest ("No reviews yet").

## 1. Color tokens (CSS variables; dark is the default, light has a toggle and follows the system setting)
| Token | Dark | Light |
|---|---|---|
| bg | #0B1220 | #F6F8FC |
| surface | #111B2E | #FFFFFF |
| elevated | #16233B | #FFFFFF with a soft shadow |
| border (decorative) | #22314D | #D5DDEA |
| border-input (needs 3:1) | #5B6F8F | #64748B |
| text | #E6EDF7 (15.9:1 on bg) | #0B1220 (17.6:1) |
| muted text | #8FA3C0 (7.3:1) | #475569 (7.1:1) |
| accent / links | #22D3EE (10.4:1) | #0E7490 (5.0:1 on bg, 5.4:1 on white) |
| accent graphic only | #22D3EE | #0891B2 (3.5:1, never for small text) |
| success | #34D399 | #047857 |
| warning | #F59E0B | #B45309 |
| danger (text) | #FB7185 (5.8:1 on elevated) | #BE123C |
| info | #60A5FA | #1D4ED8 |
| violet (submitted) | #A78BFA | #6D28D9 |
The dark danger #F43F5E is for icons and fills only. Primary button: accent fill with navy text (10.4:1). Focus ring: 2 px accent plus 2 px offset, always visible. Never use color alone: every status has an icon and a text label.

## 2. Type, spacing, shape, motion
- Fonts (self-host or Google Fonts, `font-display: swap`): headings Space Grotesk 600/700; body Inter 400/500; IDs, codes, references, amounts in JetBrains Mono; Bangla text in Noto Sans Bengali. Scale 12 / 14 / 16 / 18 / 20 / 28 / 40 / 56, body 16 px (never smaller than 14), line height 1.5, line length 65 characters.
- 4 px spacing grid (4, 8, 12, 16, 24, 32, 48, 64). Cards radius 16, inputs and buttons 10, 1 px borders, one soft shadow level. Touch targets at least 44 px.
- Motion 150 to 250 ms, only opacity and transform. Respect `prefers-reduced-motion`. Skeleton loaders instead of spinners for page content. A very faint circuit-grid background in the hero only.

## 3. Layout
- Container max 1200 px, 16 px side gutters on phones, 12-column grid on desktop. Breakpoints 360, 768, 1024, 1280. Mobile first.
- Header: logo left (use the brand kit in Lite 5), nav (Services, IPTV, Pricing, How it works, Contact), language switch (English / বাংলা), theme toggle, Sign in with Client ID. On phones: a hamburger drawer plus a bottom bar (Home, Services, Chat with Camellia, Portal).
- Footer: logo, one-line description, service categories, legal pages (Terms, Privacy, Refunds, Cookies), contact email and WhatsApp, payment methods list, "Camellia is an AI assistant" note, copyright.

## 4. Page templates
1. **Home:** hero (one sentence of value, two buttons: Start with Camellia / Browse services), how it works in 4 steps (Choose, Tell Camellia, Preview, Pay and download), the three categories as cards, "Preview before you pay" trust strip, payment methods, FAQ, contact.
2. **Services:** category tabs, search (also accepts a Service ID), filters, cards with Service ID badge, price ("From $X/hour" or fixed), and Order button.
3. **Service detail:** title and Service ID, who it is for, what you get, process steps, price and turnaround, sample of the deliverable, FAQ, sticky Order button (bottom bar on phones), Copy link, Share, QR.
4. **Order + Camellia chat:** left, the chat with quick-reply chips and file upload; right on desktop (a collapsible sheet on phones), the live Project File checklist, status stepper and price. Camellia introduces herself as an AI. Show typing, retry and error states.
5. **Pay `/pay/{invoiceId}`:** method cards with the account details and Copy buttons, a numbered steps list, the upload area, a status tracker, and the "we never ask for your PIN or OTP" notice.
6. **Client portal:** Orders, Project Files, Quotes, Payments, Deliverables, IPTV pass (Activate pass), Profile. Each order shows the stepper and what is needed from the client next.
7. **IPTV page:** plan comparison for 1/2/6/12 months, device setup steps, activation steps, support, authorized-content statement.
8. **Receipt verify page:** minimal and public. **Admin:** left sidebar, dense tables, filters, bulk actions, keyboard shortcuts, the payments queue and the audit log. **404, offline and error pages** in the same style, with a way back.

## 5. Components (build once, reuse)
Button (primary, secondary, ghost, danger; loading and disabled), input, textarea, select, file drop zone with progress, copy-to-clipboard field with a "Copied" confirmation, badge, status stepper, toast, modal and bottom sheet, tabs, accordion, table (sortable, mobile as stacked cards), skeleton, empty state, QR, chat bubble, banner. Every form shows a label above the field, a hint, an inline error that says what to do, and keeps typed data after an error.

## 6. Copy and language
Plain, friendly, specific. Primary buttons are verbs ("Start with Camellia", "Submit payment"). Money as `$25.00` and `৳3,125.00`; dates in Asia/Dhaka with the time zone shown; IDs in monospace. Provide English and Bangla for all interface text from a single translation file; remember the choice. Example errors: "That transaction ID looks too short. bKash IDs are usually 10 characters." / "ট্রানজেকশন আইডিটি খুব ছোট মনে হচ্ছে।"

## 7. Quality bar (check before you say it is finished)
Keyboard-only use works for every page; screen-reader labels and landmarks; headings in order; forms with real labels; contrast as in the table; reduced-motion respected; no horizontal scroll at 360 px; Lighthouse mobile at least 90 for performance, accessibility and SEO; images lazy-loaded with dimensions set; each page has its own title, description, Open Graph tags and canonical link; a sitemap and robots file. Add a hidden `/style-guide` page (admin only) showing tokens, components and states in both themes.
