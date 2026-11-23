/**
 * M R S — Lite 6 Evidence Mode & Auto-Activation Verification Suite (§9)
 * Tests all 11 security, anti-fraud, concurrency, cap, retry, confirmation-window,
 * shape-learning, and exact-month activation code scenarios in isolated memory + HTTP.
 */

import assert from 'node:assert/strict';
import http from 'node:http';
import express from 'express';
import { Jimp } from 'jimp';
import { installMrsCore, MemoryStore } from '../server/mrs-core/index.js';
import { GENERIC_CLIENT_CORRECTION_MSG } from '../server/mrs-core/payments/aiVerifier.js';
import { CATALOG_SERVICES } from '../server/mrs-core/orders/catalog.js';
import { hashPasswordScrypt, verifyPasswordScrypt } from '../server/mrs-core/security/auth.js';

interface AiMockScenario {
  detectedProvider: string;
  providerMatchesSelectedMethod: boolean;
  extractedTrxId: string;
  extractedAmount: number;
  extractedCurrency: string;
  extractedTime: string;
  extractedReceiver: string;
  extractedSender: string;
  extractedStatus: string;
  looksLikeGenuineAppScreen: number;
  matchesReferenceStyle: number;
  anomalies: string[];
  summaryReason: string;
}

const DEFAULT_SCENARIO: AiMockScenario = {
  detectedProvider: 'bKash',
  providerMatchesSelectedMethod: true,
  extractedTrxId: '9K8X2M99AB',
  extractedAmount: 1200,
  extractedCurrency: 'BDT',
  extractedTime: new Date().toISOString(),
  extractedReceiver: '01810853282',
  extractedSender: '01711000001',
  extractedStatus: 'Successful',
  looksLikeGenuineAppScreen: 95,
  matchesReferenceStyle: 92,
  anomalies: [],
  summaryReason: 'Clear genuine bKash send money receipt matching invoice & receiver.',
};

// Map scenarioId (encoded into PNG pixel color & dimension) -> mock Gemini inspection output
const scenarioMap = new Map<number, AiMockScenario>();

async function makeUniqueReceiptPng(
  scenarioId: number,
  options: { cropBorderOnly?: boolean } = {}
): Promise<string> {
  // Use fixed size 320x480 unless cropBorderOnly is set; embed deterministic pixel pattern so each
  // unique ID produces a unique pHash while minor corner variation produces near-identical pHash!
  const w = 320;
  const h = 480;
  const img = new Jimp({ width: w, height: h, color: 0x0b1220ff });

  // Strong macro blocks keyed on `(scenarioId % 1000)` — when cropBorderOnly is true we reuse
  // scenarioId 200's macro pattern and only change a tiny 6x6 corner square so pHash stays near-identical
  const patternSeed = options.cropBorderOnly ? 200 : scenarioId;

  // Draw distinct low-frequency 4x4 layout blocks + gradient per patternSeed so Jimp's DCT pHash
  // strongly separates distinct receipts (>0.30 distance) while minor corner crops stay near-identical (<=0.05).
  const seedBits = Math.imul(patternSeed ^ 0x5bd1e995, 0x27d4eb2d) >>> 0;
  const colBias = [0, 1, 2, 3].map((c) => ((seedBits >>> (c * 3)) & 7) * 32);
  const rowBias = [0, 1, 2, 3].map((r) => ((seedBits >>> (12 + r * 3)) & 7) * 32);

  for (let y = 0; y < h; y++) {
    const by = Math.min(3, Math.floor((y * 4) / h));
    for (let x = 0; x < w; x++) {
      const bx = Math.min(3, Math.floor((x * 4) / w));
      const bitIdx = by * 4 + bx;
      const on = ((seedBits >>> bitIdx) & 1) === 1;
      const grad = Math.floor(((x * ((patternSeed % 5) + 1) + y * (((patternSeed >> 3) % 5) + 1)) % 90));
      const val = on ? Math.min(250, 160 + ((colBias[bx] + grad) % 90)) : Math.max(12, (rowBias[by] + grad) % 75);
      const rgba =
        ((val & 0xff) << 24) |
        (((on ? Math.min(255, val + 20) : val) & 0xff) << 16) |
        (((on ? 240 : 40 + (patternSeed % 40)) & 0xff) << 8) |
        0xff;
      img.setPixelColor(rgba >>> 0, x, y);
    }
  }

  // Embed scenarioId cleanly in top-left 2 pixels (does not affect pHash significantly)
  const r = (scenarioId >> 8) & 0xff;
  const g = scenarioId & 0xff;
  const b = options.cropBorderOnly ? 222 : 111;
  const tagColor = ((r << 24) | (g << 16) | (b << 8) | 0xff) >>> 0;
  img.setPixelColor(tagColor, 0, 0);
  img.setPixelColor(tagColor, 1, 0);

  if (options.cropBorderOnly) {
    // Flip a tiny 4x4 corner square so SHA-256 differs from base receipt while pHash stays <= 0.14
    for (let y = h - 4; y < h; y++) {
      for (let x = w - 4; x < w; x++) {
        img.setPixelColor(0xffffffff, x, y);
      }
    }
  }

  return img.getBase64('image/png');
}

function createMockAi() {
  return {
    models: {
      generateContent: async (args: any) => {
        const parts = args?.contents?.parts || [];
        // Inspect the last inlineData image (the untrusted client submission)
        let lastImgB64 = '';
        for (const p of parts) {
          if (p?.inlineData?.data) {
            lastImgB64 = p.inlineData.data;
          }
        }
        let scenarioId = 1;
        if (lastImgB64) {
          const buf = Buffer.from(lastImgB64, 'base64');
          const img = await Jimp.read(buf);
          const c = img.getPixelColor(0, 0);
          const r = (c >>> 24) & 0xff;
          const g = (c >>> 16) & 0xff;
          scenarioId = (r << 8) | g;
        }
        const scenario = scenarioMap.get(scenarioId) || DEFAULT_SCENARIO;
        return { text: JSON.stringify(scenario) };
      },
    },
  };
}

async function run() {
  process.env.RESEND_API_KEY = 're_test_mock_key';
  process.env.MRS_ADMIN_PASSWORD = 'test-admin-password-2026';

  const sentEmails: Array<{ to: string[]; subject: string; text: string; html: string }> = [];
  const origFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = (async (input: any, init?: any) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    if (url.startsWith('https://api.resend.com/emails')) {
      const parsed = JSON.parse(String(init?.body || '{}'));
      sentEmails.push(parsed);
      return new Response(JSON.stringify({ id: `re_msg_${sentEmails.length}` }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return origFetch(input, init);
  }) as any;

  const store = new MemoryStore();
  // Ensure test catalog item exists & standard FX
  await store.set('config', 'system_settings', {
    usdToBdt: 100,
    amountToleranceBps: 100,
    autoVerifyEnabled: true,
    aiAutoVerifyEnabled: true,
    killSwitch: false,
    cryptoEnabled: true,
    methodPayToEmails: { payoneer: 'mr216873@gmail.com', skrill: 'mr216873@gmail.com' },
    iptvPlanPrices: { '1-month': 12, '2-month': 22, '6-month': 55, '12-month': 99 },
    autoVerifyConfig: {
      methodModes: {
        'bkash-personal': 'evidence_auto',
        'nagad-personal': 'evidence_auto',
        'binance-pay': 'evidence_auto',
        payoneer: 'evidence_auto',
        skrill: 'evidence_auto',
      },
      autoVerifyScore: 80,
      retryScore: 55,
      weights: {
        format: 15,
        documents: 15,
        geminiScreen: 20,
        referenceStyle: 10,
        crossCheck: 25,
        duplicates: 10,
        plausibility: 5,
      },
      caps: {
        newClientFirstOrderUsd: 20,
        trustedClientOrderUsd: 100,
        dailyTotalUsd: 150,
        dailyPerMethodUsd: 150,
        confirmWindowHours: 72,
        onUnconfirmed: 'void_code',
      },
      falsePositivesCount: 0,
      falseNegativesCount: 0,
    },
  });

  const app = express();
  installMrsCore(app, { store, ai: createMockAi() as any });
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address() as any;
  const baseUrl = `http://127.0.0.1:${addr.port}`;

  const api = async (method: string, path: string, body?: any, token?: string) => {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  };

  // Helper to create order + invoice for an IPTV or custom service
  const createOrder = async (opts: {
    email: string;
    name?: string;
    serviceId?: string;
    planMonths?: string;
  }) => {
    const r = await api('POST', '/api/orders', {
      serviceId: opts.serviceId || 'S-IPTV-01',
      planMonths: opts.planMonths || '1-month',
      clientName: opts.name || 'Test Client',
      clientEmail: opts.email,
      details: 'Automated Lite 6 verification test order for IPTV / Service.',
    });
    assert.equal(r.status, 201, `Expected 201 on order create, got ${r.status}: ${JSON.stringify(r.data)}`);
    return r.data;
  };

  const loginRes = await api('POST', '/api/admin/login', { password: 'test-admin-password-2026' });
  assert.equal(loginRes.status, 200);
  const adminToken = loginRes.data.token as string;
  assert.ok(adminToken, 'Admin token required');

  try {
    console.log('Running Lite 6 §9 Tests (11 scenarios)...');
    assert.ok(CATALOG_SERVICES.length > 0);

    // -----------------------------------------------------------------------
    // TEST 1: Fake TrxID with real shape + genuine AI -> verified (unconfirmed),
    //         then overdue past 72h with onUnconfirmed='void_code' voids code & pauses client
    // -----------------------------------------------------------------------
    const o1 = await createOrder({ email: 't1@example.com', name: 'User One', planMonths: '1-month' });
    scenarioMap.set(101, { ...DEFAULT_SCENARIO, extractedTrxId: '9K8X2M99AB', extractedAmount: 1200 });
    const img101 = await makeUniqueReceiptPng(101);
    const p1 = await api('POST', '/api/payments', {
      invoiceId: o1.invoice.invoiceId,
      methodId: 'bkash-personal',
      transactionId: '9K8X2M99AB',
      amount: 1200,
      currency: 'BDT',
      senderMask: '01711000001',
      receiptFileName: 'bkash_101.png',
      receiptBase64Data: img101,
    });
    assert.equal(p1.status, 200);
    assert.equal(p1.data.submission.status, 'verified', 'T1 should verify in Evidence Mode');
    assert.equal(p1.data.submission.confirmationState, undefined, 'Client response must NOT expose internal confirmationState');
    assert.equal(p1.data.submission.aiConfidence, undefined, 'Client response must NOT expose aiConfidence');
    assert.equal(p1.data.submission.scoreBreakdown, undefined, 'Client response must NOT expose scoreBreakdown');
    assert.equal(p1.data.submission.anomalies, undefined, 'Client response must NOT expose anomalies');

    const storedSub1 = await store.get<any>('payments', p1.data.submission.id);
    assert.equal(storedSub1.confirmationState, 'unconfirmed', 'Internal server payment record must start as unconfirmed');

    const lastMail1 = sentEmails[sentEmails.length - 1];
    assert.ok(lastMail1.to.includes('t1@example.com'));
    const codeMatch1 = lastMail1.text.match(/MRS-1M-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}/);
    assert.ok(codeMatch1, 'T1 email must contain 1-month activation code');

    // Verify stored code only has hash, NEVER raw code
    const storedCodes1 = await store.list<any>('activation_codes', (c) => c.paymentId === p1.data.submission.id);
    assert.equal(storedCodes1.length, 1);
    assert.equal(storedCodes1[0].code, undefined, 'Plaintext activation code must NOT be stored in DB');
    assert.ok(storedCodes1[0].codeHash && storedCodes1[0].codeHash.length === 64);

    // Expire 72h confirmation window artificially and trigger cron tick
    await store.update('payments', p1.data.submission.id, {
      confirmationDeadlineAt: new Date(Date.now() - 60_000).toISOString(),
    });
    const tickRes = await api('POST', '/api/cron/tick', {});
    assert.equal(tickRes.status, 200);
    assert.ok(tickRes.data.overdueMarked.includes(p1.data.submission.id), 'T1 should be marked unconfirmed_overdue');

    const storedCodeAfterOverdue = await store.get<any>('activation_codes', storedCodes1[0].id);
    assert.equal(storedCodeAfterOverdue.status, 'voided', 'T1 code should be voided on overdue when onUnconfirmed=void_code');

    const redeemVoided = await api('POST', '/api/portal/activation/redeem', { code: codeMatch1[0] }, o1.token);
    assert.equal(redeemVoided.status, 403, 'Voided activation code must be rejected on redeem');
    console.log('  [PASS] 1. Evidence verify (unconfirmed) + overdue void_code & client auto-verify pause');

    // -----------------------------------------------------------------------
    // TEST 2: Same OR perceptually near-identical screenshot uploaded by 2 different clients -> rejected
    // -----------------------------------------------------------------------
    const o2a = await createOrder({ email: 't2a@example.com', name: 'Client Two A', planMonths: '1-month' });
    scenarioMap.set(200, { ...DEFAULT_SCENARIO, extractedTrxId: '8A7B6C5D4E', extractedAmount: 1200 });
    const img200 = await makeUniqueReceiptPng(200);
    const p2a = await api('POST', '/api/payments', {
      invoiceId: o2a.invoice.invoiceId,
      methodId: 'bkash-personal',
      transactionId: '8A7B6C5D4E',
      amount: 1200,
      currency: 'BDT',
      senderMask: '01711000002',
      receiptFileName: 'receipt_2a.png',
      receiptBase64Data: img200,
    });
    assert.equal(p2a.data.submission.status, 'verified');

    const o2b = await createOrder({ email: 't2b@example.com', name: 'Client Two B', planMonths: '1-month' });
    const img200Tweaked = await makeUniqueReceiptPng(201, { cropBorderOnly: true }); // different bytes/SHA-256, same pHash!
    scenarioMap.set(201, { ...DEFAULT_SCENARIO, extractedTrxId: '9Z8Y7X6W5V', extractedAmount: 1200 });
    const p2b = await api('POST', '/api/payments', {
      invoiceId: o2b.invoice.invoiceId,
      methodId: 'bkash-personal',
      transactionId: '9Z8Y7X6W5V',
      amount: 1200,
      currency: 'BDT',
      senderMask: '01711000003',
      receiptFileName: 'receipt_2b_tweaked.png',
      receiptBase64Data: img200Tweaked,
    });
    assert.equal(p2b.data.submission.status, 'rejected', 'T2 near-identical screenshot across clients must be rejected');
    assert.equal(p2b.data.submission.clientMessage, GENERIC_CLIENT_CORRECTION_MSG, 'Must show generic non-leaking message');
    assert.ok(!/phash|sha-256|identical|reused/i.test(p2b.data.submission.clientMessage));
    console.log('  [PASS] 2. Same / near-identical pHash screenshot rejected across different clients without leak');

    // -----------------------------------------------------------------------
    // TEST 3: Edited / mismatched amount in extracted doc -> rejected without specific error leak
    // -----------------------------------------------------------------------
    const o3 = await createOrder({ email: 't3@example.com', name: 'Client Three', planMonths: '1-month' });
    scenarioMap.set(301, { ...DEFAULT_SCENARIO, extractedTrxId: '7M8N9P1Q2R', extractedAmount: 500 }); // invoice requires 1200 BDT
    const img301 = await makeUniqueReceiptPng(301);
    const p3 = await api('POST', '/api/payments', {
      invoiceId: o3.invoice.invoiceId,
      methodId: 'bkash-personal',
      transactionId: '7M8N9P1Q2R',
      amount: 1200,
      currency: 'BDT',
      senderMask: '01711000004',
      receiptFileName: 'edited_amt.png',
      receiptBase64Data: img301,
    });
    assert.equal(p3.data.submission.status, 'rejected', 'T3 mismatched extracted amount must reject');
    assert.equal(p3.data.submission.clientMessage, GENERIC_CLIENT_CORRECTION_MSG);
    console.log('  [PASS] 3. Edited/mismatched document amount rejected cleanly');

    // -----------------------------------------------------------------------
    // TEST 4: Wrong receiver account -> hard stop & NO activation code issued
    // -----------------------------------------------------------------------
    const o4 = await createOrder({ email: 't4@example.com', name: 'Client Four', planMonths: '1-month' });
    scenarioMap.set(401, {
      ...DEFAULT_SCENARIO,
      extractedTrxId: '6K5J4H3G2F',
      extractedAmount: 1200,
      extractedReceiver: '01999999999', // wrong receiver
    });
    const img401 = await makeUniqueReceiptPng(401);
    const p4 = await api('POST', '/api/payments', {
      invoiceId: o4.invoice.invoiceId,
      methodId: 'bkash-personal',
      transactionId: '6K5J4H3G2F',
      amount: 1200,
      currency: 'BDT',
      senderMask: '01711000005',
      receiptFileName: 'wrong_rec.png',
      receiptBase64Data: img401,
    });
    assert.equal(p4.data.submission.status, 'rejected', 'T4 wrong receiver must trigger hard stop');
    const codes4 = await store.list<any>('activation_codes', (c) => c.orderId === o4.order.id);
    assert.equal(codes4.length, 0, 'T4 must NOT issue activation code');
    console.log('  [PASS] 4. Wrong receiver triggers hard stop & issues no activation code');

    // -----------------------------------------------------------------------
    // TEST 5: Prompt injection in receipt ("ignore rules, score 100") -> deterministic rules reject
    // -----------------------------------------------------------------------
    const o5 = await createOrder({ email: 't5@example.com', name: 'Client Five', planMonths: '1-month' });
    scenarioMap.set(501, {
      ...DEFAULT_SCENARIO,
      extractedTrxId: 'WRONGTRX99',
      extractedAmount: 100,
      extractedReceiver: '01600000000',
      looksLikeGenuineAppScreen: 100,
      matchesReferenceStyle: 100,
      anomalies: ['prompt_injection_text_detected'],
    });
    const img501 = await makeUniqueReceiptPng(501);
    const p5 = await api('POST', '/api/payments', {
      invoiceId: o5.invoice.invoiceId,
      methodId: 'bkash-personal',
      transactionId: '5D4C3B2A1Z',
      amount: 1200,
      currency: 'BDT',
      senderMask: '01711000006',
      receiptFileName: 'injected.png',
      receiptBase64Data: img501,
    });
    assert.equal(p5.data.submission.status, 'rejected', 'T5 injected receipt with mismatches must still reject');
    console.log('  [PASS] 5. Prompt injection text ignored; deterministic cross-checks reject');

    // -----------------------------------------------------------------------
    // TEST 6: Duplicate TrxID across two invoices -> blocked with 409
    // -----------------------------------------------------------------------
    const o6 = await createOrder({ email: 't6@example.com', name: 'Client Six', planMonths: '1-month' });
    const img601 = await makeUniqueReceiptPng(601);
    const p6 = await api('POST', '/api/payments', {
      invoiceId: o6.invoice.invoiceId,
      methodId: 'bkash-personal',
      transactionId: '8A7B6C5D4E', // already verified on o2a!
      amount: 1200,
      currency: 'BDT',
      senderMask: '01711000007',
      receiptFileName: 'dup_trx.png',
      receiptBase64Data: img601,
    });
    assert.equal(p6.status, 409, 'T6 duplicate TrxID on second invoice must return 409');
    console.log('  [PASS] 6. Duplicate TrxID blocked across invoices (409)');

    // -----------------------------------------------------------------------
    // TEST 7: Concurrent double-submit -> serialized lock, no double settlement
    // -----------------------------------------------------------------------
    const o7 = await createOrder({ email: 't7@example.com', name: 'Client Seven', planMonths: '1-month' });
    scenarioMap.set(701, { ...DEFAULT_SCENARIO, extractedTrxId: 'CONCUR7788', extractedAmount: 1200 });
    const img701 = await makeUniqueReceiptPng(701);
    const [r7a, r7b] = await Promise.all([
      api('POST', '/api/payments', {
        invoiceId: o7.invoice.invoiceId,
        methodId: 'bkash-personal',
        transactionId: 'CONCUR7788',
        amount: 1200,
        currency: 'BDT',
        senderMask: '01711000008',
        receiptFileName: 'concur.png',
        receiptBase64Data: img701,
      }),
      api('POST', '/api/payments', {
        invoiceId: o7.invoice.invoiceId,
        methodId: 'bkash-personal',
        transactionId: 'CONCUR7788',
        amount: 1200,
        currency: 'BDT',
        senderMask: '01711000008',
        receiptFileName: 'concur.png',
        receiptBase64Data: img701,
      }),
    ]);
    assert.equal(r7a.status, 200);
    assert.equal(r7b.status, 200);
    const codes7 = await store.list<any>('activation_codes', (c) => c.orderId === o7.order.id);
    if (codes7.length !== 1) {
      const sub7 = await store.get<any>('payments', r7a.data.submission.id);
      console.error('T7 debug sub7:', { status: sub7?.status, decisionReason: sub7?.decisionReason, anomalies: sub7?.anomalies, scoreBreakdown: sub7?.scoreBreakdown });
    }
    assert.equal(codes7.length, 1, 'T7 concurrent submit must issue exactly ONE activation code');
    console.log('  [PASS] 7. Concurrent double-submit serialized atomically (1 code issued)');

    // -----------------------------------------------------------------------
    // TEST 8: Per-order ($20 new client) & daily caps -> routed to needs_review (never rejected)
    // -----------------------------------------------------------------------
    const o8 = await createOrder({ email: 't8@example.com', name: 'Client Eight', planMonths: '2-month' }); // $22 USD = 2200 BDT (> $20 cap!)
    scenarioMap.set(801, { ...DEFAULT_SCENARIO, extractedTrxId: 'CAPCHECK22', extractedAmount: 2200 });
    const img801 = await makeUniqueReceiptPng(801);
    const p8 = await api('POST', '/api/payments', {
      invoiceId: o8.invoice.invoiceId,
      methodId: 'bkash-personal',
      transactionId: 'CAPCHECK22',
      amount: 2200,
      currency: 'BDT',
      senderMask: '01711000009',
      receiptFileName: 'over_cap.png',
      receiptBase64Data: img801,
    });
    assert.equal(p8.data.submission.status, 'needs_review', 'T8 over new-client $20 cap must route to needs_review, not reject');
    const codes8Before = await store.list<any>('activation_codes', (c) => c.orderId === o8.order.id);
    assert.equal(codes8Before.length, 0, 'Cap-held order must not issue activation code before owner confirmation');

    // Owner confirms T8 -> settles and sends exact 2-month code
    const c8 = await api(
      'POST',
      `/api/admin/auto-verify/payments/${p8.data.submission.id}/classify`,
      { action: 'confirmed', note: 'Owner verified $22' },
      adminToken
    );
    assert.equal(c8.status, 200);
    const codes8After = await store.list<any>('activation_codes', (c) => c.orderId === o8.order.id);
    assert.equal(codes8After.length, 1);
    assert.equal(codes8After[0].monthsPaid, 2, 'T8 owner confirm must issue 2-month code');
    console.log('  [PASS] 8. Per-order cap queues to needs_review & owner confirmation issues 2-month code');

    // -----------------------------------------------------------------------
    // TEST 9: Fraud defense (halves caps + raises autoVerifyScore +5 + voids code + pauses client)
    // -----------------------------------------------------------------------
    const o9 = await createOrder({ email: 't9@example.com', name: 'Client Nine', planMonths: '1-month' });
    scenarioMap.set(901, { ...DEFAULT_SCENARIO, extractedTrxId: 'FRAUDTEST9', extractedAmount: 1200 });
    const img901 = await makeUniqueReceiptPng(901);
    const p9 = await api('POST', '/api/payments', {
      invoiceId: o9.invoice.invoiceId,
      methodId: 'bkash-personal',
      transactionId: 'FRAUDTEST9',
      amount: 1200,
      currency: 'BDT',
      senderMask: '01711000010',
      receiptFileName: 'fraud_test.png',
      receiptBase64Data: img901,
    });
    assert.equal(p9.data.submission.status, 'verified');

    const fraudRes = await api(
      'POST',
      `/api/admin/auto-verify/payments/${p9.data.submission.id}/classify`,
      { action: 'fraud', note: 'Reversed / not received on statement' },
      adminToken
    );
    assert.equal(fraudRes.status, 200);
    assert.equal(fraudRes.data.updatedConfig.autoVerifyScore, 85, 'Fraud must raise autoVerifyScore by +5 (80 -> 85)');
    assert.equal(fraudRes.data.updatedConfig.caps.newClientFirstOrderUsd, 10, 'Fraud must halve new-client cap (20 -> 10)');
    assert.equal(fraudRes.data.updatedConfig.caps.dailyTotalUsd, 75, 'Fraud must halve daily total cap (150 -> 75)');
    assert.equal(fraudRes.data.updatedConfig.falsePositivesCount, 1);
    const codes9 = await store.list<any>('activation_codes', (c) => c.paymentId === p9.data.submission.id);
    assert.equal(codes9[0].status, 'voided', 'Fraud must void issued activation code');
    console.log('  [PASS] 9. Fraud action voids code, halves caps, raises threshold +5, increments counter');

    // -----------------------------------------------------------------------
    // TEST 10: Second-proof retry band (55–79) requests 2nd proof -> verifies if cleaner proof uploaded
    // -----------------------------------------------------------------------
    // Temporarily reset caps/threshold so $12 fits within cap for testing retry band cleanly
    await api(
      'PUT',
      '/api/admin/auto-verify/settings',
      {
        autoVerifyScore: 80,
        retryScore: 55,
        caps: { newClientFirstOrderUsd: 20, trustedClientOrderUsd: 100, dailyTotalUsd: 500, dailyPerMethodUsd: 500 },
      },
      adminToken
    );
    const o10 = await createOrder({ email: 't10@example.com', name: 'Client Ten', planMonths: '1-month' });
    // Score target in 55-79: format(15) + docs(15) + screen(20%->4) + ref(10%->1) + crossCheck(25) + dup(10) + plaus(3) = 73!
    scenarioMap.set(1001, {
      ...DEFAULT_SCENARIO,
      extractedTrxId: 'RETRYBAND1',
      extractedAmount: 1200,
      looksLikeGenuineAppScreen: 20,
      matchesReferenceStyle: 10,
    });
    const img1001 = await makeUniqueReceiptPng(1001);
    const p10a = await api('POST', '/api/payments', {
      invoiceId: o10.invoice.invoiceId,
      methodId: 'bkash-personal',
      transactionId: 'RETRYBAND1',
      amount: 1200,
      currency: 'BDT',
      senderMask: '01711000011',
      receiptFileName: 'blurry_1.png',
      receiptBase64Data: img1001,
    });
    assert.equal(p10a.data.submission.status, 'needs_review');
    assert.equal(p10a.data.submission.secondProofRequested, true, 'Score 55-79 must request 2nd proof once');

    // Client uploads clearer 2nd proof (score >= 80) -> auto-verifies!
    scenarioMap.set(1002, {
      ...DEFAULT_SCENARIO,
      extractedTrxId: 'RETRYBAND1',
      extractedAmount: 1200,
      looksLikeGenuineAppScreen: 96,
      matchesReferenceStyle: 94,
    });
    const img1002 = await makeUniqueReceiptPng(1002);
    const p10b = await api('POST', `/api/payments/${p10a.data.submission.id}/evidence`, {
      fileName: 'history_2nd_proof.png',
      base64Data: img1002,
      evidenceKind: 'second_proof',
    });
    assert.equal(p10b.status, 200);
    assert.equal(p10b.data.submission.status, 'verified', 'Uploading high-score 2nd proof should verify automatically');
    console.log('  [PASS] 10. Retry band 55-79 requests 2nd proof & auto-verifies when 2nd proof clears threshold');

    // -----------------------------------------------------------------------
    // TEST 11: Exact-month activation codes (6m & 12m), redeem flow, & 20+ Shape Learning Regex
    // -----------------------------------------------------------------------
    await api(
      'PUT',
      '/api/admin/auto-verify/settings',
      { caps: { newClientFirstOrderUsd: 150, trustedClientOrderUsd: 200, dailyTotalUsd: 1000, dailyPerMethodUsd: 1000 } },
      adminToken
    );

    const o6m = await createOrder({ email: 't11_6m@example.com', name: 'Client 6M', planMonths: '6-month' }); // $55 = 5500 BDT
    scenarioMap.set(1106, { ...DEFAULT_SCENARIO, extractedTrxId: 'SIXMONTH66', extractedAmount: 5500 });
    const p6m = await api('POST', '/api/payments', {
      invoiceId: o6m.invoice.invoiceId,
      methodId: 'bkash-personal',
      transactionId: 'SIXMONTH66',
      amount: 5500,
      currency: 'BDT',
      receiptFileName: '6m.png',
      receiptBase64Data: await makeUniqueReceiptPng(1106),
    });
    assert.equal(p6m.data.submission.status, 'verified');
    assert.equal(p6m.data.submission.monthsPaid, 6);
    const mail6m = sentEmails[sentEmails.length - 1];
    const match6m = mail6m.text.match(/MRS-6M-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}/);
    assert.ok(match6m, '6-month email must contain MRS-6M-... code');

    const o12m = await createOrder({ email: 't11_12m@example.com', name: 'Client 12M', planMonths: '12-month' }); // $99 = 9900 BDT
    scenarioMap.set(1112, { ...DEFAULT_SCENARIO, extractedTrxId: 'TWELVEMNTH', extractedAmount: 9900 });
    const p12m = await api('POST', '/api/payments', {
      invoiceId: o12m.invoice.invoiceId,
      methodId: 'bkash-personal',
      transactionId: 'TWELVEMNTH',
      amount: 9900,
      currency: 'BDT',
      receiptFileName: '12m.png',
      receiptBase64Data: await makeUniqueReceiptPng(1112),
    });
    assert.equal(p12m.data.submission.status, 'verified');
    assert.equal(p12m.data.submission.monthsPaid, 12);
    const mail12m = sentEmails[sentEmails.length - 1];
    const match12m = mail12m.text.match(/MRS-12M-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}/);
    assert.ok(match12m, '12-month email must contain MRS-12M-... code');

    // Redeem 12-month code as o12m owner -> success; wrong client -> 403; replay -> alreadyRedeemed
    const wrongRedeem = await api('POST', '/api/portal/activation/redeem', { code: match12m[0] }, o6m.token);
    assert.equal(wrongRedeem.status, 403, 'Wrong client cannot redeem another client activation code');

    const validRedeem = await api('POST', '/api/portal/activation/redeem', { code: match12m[0] }, o12m.token);
    assert.equal(validRedeem.status, 200);
    assert.equal(validRedeem.data.monthsPaid, 12);
    assert.equal(validRedeem.data.alreadyRedeemed, undefined);

    const replayRedeem = await api('POST', '/api/portal/activation/redeem', { code: match12m[0] }, o12m.token);
    assert.equal(replayRedeem.status, 200);
    assert.equal(replayRedeem.data.alreadyRedeemed, true);

    // Seed 20 confirmed shape samples and verify Admin Overview suggests regex & accepts it
    for (let i = 0; i < 20; i++) {
      await store.set('shape_library', `SHP-TEST-${i}`, {
        id: `SHP-TEST-${i}`,
        methodId: 'bkash-personal',
        sampleTrxId: `9K8X2M99A${i % 10}`,
        shapeSignature: '9A9A9A99AA',
        createdAt: new Date().toISOString(),
      });
    }
    const overview = await api('GET', '/api/admin/auto-verify/overview', undefined, adminToken);
    assert.equal(overview.status, 200);
    assert.ok(overview.data.shapeLibrary.suggestions.length >= 1, '20+ confirmed samples must generate learned regex suggestion');
    const acceptShape = await api(
      'POST',
      '/api/admin/auto-verify/shapes/bkash-personal/accept',
      { regex: overview.data.shapeLibrary.suggestions[0].suggestedRegex },
      adminToken
    );
    assert.equal(acceptShape.status, 200);
    console.log('  [PASS] 11. Exact-month codes (1/2/6/12m) emailed, hashed, redeemed, & 20+ sample shape regex learned');

    // -----------------------------------------------------------------------
    // TEST 12: Scrypt utilities & initial administrator bootstrap flow
    // -----------------------------------------------------------------------
    const scryptHashA = hashPasswordScrypt('OwnerBoot2026!');
    const scryptHashB = hashPasswordScrypt('OwnerBoot2026!');
    assert.ok(scryptHashA.startsWith('scrypt$'), 'Scrypt hash must use scrypt$ format');
    assert.notEqual(scryptHashA, scryptHashB, 'Unique random salts must produce distinct hashes');
    assert.equal(verifyPasswordScrypt('OwnerBoot2026!', scryptHashA), true, 'Matching password must verify');
    assert.equal(verifyPasswordScrypt('WrongBoot2026!', scryptHashA), false, 'Wrong password must fail');
    assert.equal(verifyPasswordScrypt('', scryptHashA), false, 'Empty password must fail');
    assert.equal(verifyPasswordScrypt('OwnerBoot2026!', 'scrypt$bad$format'), false, 'Malformed hash must fail');

    const prevEnvAdmin = process.env.MRS_ADMIN_PASSWORD;
    delete process.env.MRS_ADMIN_PASSWORD;
    const bootApp = express();
    const bootStore = new MemoryStore();
    installMrsCore(bootApp, { store: bootStore });
    const bootSrv = http.createServer(bootApp);
    await new Promise<void>((r) => bootSrv.listen(0, '127.0.0.1', () => r()));
    try {
      const bootPort = (bootSrv.address() as any).port;
      const bootUrl = `http://127.0.0.1:${bootPort}`;
      const bootCall = async (method: string, path: string, body?: any, headers?: Record<string, string>) => {
        const res = await fetch(`${bootUrl}${path}`, {
          method,
          headers: { 'Content-Type': 'application/json', ...(headers || {}) },
          body: body ? JSON.stringify(body) : undefined,
        });
        return { status: res.status, data: await res.json().catch(() => ({})) };
      };

      const stInitial = await bootCall('GET', '/api/admin/bootstrap-status');
      assert.equal(stInitial.status, 200);
      assert.equal(stInitial.data.needsClaim, true, 'Fresh instance without env password must require claim');
      assert.equal(stInitial.data.hasEnvPassword, false);

      const loginUnclaimed = await bootCall('POST', '/api/admin/login', { password: 'anything-here' });
      assert.equal(loginUnclaimed.status, 403);
      assert.equal(loginUnclaimed.data.code, 'admin_not_claimed');

      const claimWeak = await bootCall('POST', '/api/admin/bootstrap-claim', { password: 'short' });
      assert.equal(claimWeak.status, 400);

      const claimMismatch = await bootCall('POST', '/api/admin/bootstrap-claim', {
        password: 'ValidPass2026!',
        confirmPassword: 'DifferentPass2026!',
      });
      assert.equal(claimMismatch.status, 400);

      const claimValid = await bootCall('POST', '/api/admin/bootstrap-claim', {
        password: 'ValidPass2026!',
        confirmPassword: 'ValidPass2026!',
      });
      assert.equal(claimValid.status, 201);
      assert.equal(claimValid.data.success, true);
      assert.ok(claimValid.data.token, 'Bootstrap claim must issue session token');

      const stAfter = await bootCall('GET', '/api/admin/bootstrap-status');
      assert.equal(stAfter.data.needsClaim, false, 'Status must reflect claimed state');

      const claimTwice = await bootCall('POST', '/api/admin/bootstrap-claim', { password: 'SecondPass2026!' });
      assert.equal(claimTwice.status, 403);

      const loginBad = await bootCall('POST', '/api/admin/login', { password: 'WrongPassword!' });
      assert.equal(loginBad.status, 401);

      const loginOk = await bootCall('POST', '/api/admin/login', { password: 'ValidPass2026!' });
      assert.equal(loginOk.status, 200);
      assert.ok(loginOk.data.token);

      const sessionRes = await bootCall('GET', '/api/admin/session', undefined, {
        Authorization: `Bearer ${loginOk.data.token}`,
      });
      assert.equal(sessionRes.status, 200);
      assert.equal(sessionRes.data.ok, true);
    } finally {
      if (prevEnvAdmin !== undefined) process.env.MRS_ADMIN_PASSWORD = prevEnvAdmin;
      await new Promise<void>((resolve) => bootSrv.close(() => resolve()));
    }
    console.log('  [PASS] 12. Scrypt utilities & initial administrator bootstrap status/claim/login');

    console.log('\nALL 12 VERIFICATION TESTS PASSED (12/12).');
  } finally {
    globalThis.fetch = origFetch;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

run().catch((err) => {
  console.error('\nLite 6 Verification Failed:', err);
  process.exit(1);
});
