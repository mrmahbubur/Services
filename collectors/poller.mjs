/**
 * M R S Services — Binance Pay & Skrill Poller
 * Runs on owner machine or server to read read-only Binance transactions and ingest
 * them into MRS Core /api/ingest/provider with HMAC-SHA256 signature.
 *
 * Usage:
 *   node poller.mjs --once
 *   node poller.mjs
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Load config from poller.env if present
const envPath = path.resolve(process.cwd(), 'poller.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [k, ...v] = trimmed.split('=');
    if (k && v) process.env[k.trim()] = v.join('=').trim();
  }
}

const SITE_URL = (process.env.MRS_SITE || process.env.APP_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
const INGEST_SECRET = process.env.MRS_INGEST_SECRET || '';
const BINANCE_API_KEY = process.env.BINANCE_API_KEY || '';
const BINANCE_API_SECRET = process.env.BINANCE_API_SECRET || '';

function computeSignature(payload, timestamp, secret) {
  return crypto.createHmac('sha256', secret).update(payload + timestamp).digest('hex');
}

async function sendToSite(bodyObj) {
  if (!INGEST_SECRET) {
    throw new Error('MRS_INGEST_SECRET is not configured in poller.env or environment.');
  }
  const payload = JSON.stringify(bodyObj);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = computeSignature(payload, timestamp, INGEST_SECRET);

  const res = await fetch(`${SITE_URL}/api/ingest/provider`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Timestamp': timestamp,
      'X-Signature': signature,
    },
    body: payload,
  });

  const data = await res.json();
  return { status: res.status, data };
}

async function pollBinance() {
  if (!BINANCE_API_KEY || !BINANCE_API_SECRET) {
    console.log('Binance API keys not set in poller.env. Sending heartbeat only.');
    return sendToSite({ provider: 'binance', heartbeat: true });
  }

  // Binance Pay query sample
  const timestamp = Date.now();
  const queryString = `timestamp=${timestamp}`;
  const binanceSig = crypto.createHmac('sha256', BINANCE_API_SECRET).update(queryString).digest('hex');

  try {
    const binanceRes = await fetch(`https://api.binance.com/sapi/v1/pay/transactions?${queryString}&signature=${binanceSig}`, {
      headers: {
        'X-MBX-APIKEY': BINANCE_API_KEY,
      },
    });

    if (!binanceRes.ok) {
      const err = await binanceRes.text();
      return sendToSite({ provider: 'binance', error: err });
    }

    const json = await binanceRes.json();
    const rows = (json.data || []).map((t) => ({
      trxId: t.orderId || t.transactionId,
      amount: parseFloat(t.amount || '0'),
      currency: t.currency || 'USDT',
      sender: t.payerInfo?.name || t.payerInfo?.binanceId || 'BinanceUser',
      date: new Date(t.transactionTime || Date.now()).toISOString(),
      raw: JSON.stringify(t),
    }));

    return sendToSite({ provider: 'binance', rows });
  } catch (err) {
    return sendToSite({ provider: 'binance', error: err.message });
  }
}

async function main() {
  const isOnce = process.argv.includes('--once');
  console.log(`Starting MRS Poller pointing to ${SITE_URL}...`);

  const run = async () => {
    try {
      const res = await pollBinance();
      console.log(`Ingest responded with status ${res.status}:`, res.data);
    } catch (e) {
      console.error('Poller error:', e.message);
    }
  };

  await run();
  if (!isOnce) {
    setInterval(run, 60 * 1000);
  }
}

main();
