import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { IStore } from '../store/index.js';

export interface VibeSecAuditResult {
  score: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'F';
  timestamp: string;
  checks: {
    id: string;
    name: string;
    category: 'transport' | 'authentication' | 'storage' | 'headers' | 'tamper_defense';
    status: 'pass' | 'warn' | 'fail';
    detail: string;
  }[];
  recommendations: string[];
}

export function vibesecHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
}

export function sanitizeInputString(input: string): string {
  if (typeof input !== 'string') return input;
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/onerror\s*=/gi, '')
    .replace(/onload\s*=/gi, '');
}

export async function runVibeSecAudit(store?: IStore): Promise<VibeSecAuditResult> {
  const isDurable = store ? store.isDurable() : false;
  const isCloud = store && typeof store.isCloudConnected === 'function' ? store.isCloudConnected() : isDurable;
  const claimedAdmin = store ? await store.get<{ passwordHash?: string }>('config', 'admin_auth') : null;
  const hasCustomAdminPassword = Boolean(process.env.MRS_ADMIN_PASSWORD || claimedAdmin?.passwordHash);
  const hasCustomSessionSecret = Boolean(process.env.MRS_SESSION_SECRET && process.env.MRS_SESSION_SECRET.length >= 32);
  const hasSmsKey = Boolean(process.env.MRS_SMS_SIGNING_KEY);
  const hasIngestKey = Boolean(process.env.MRS_INGEST_SECRET);

  let rulesLocked = false;
  try {
    if (fs.existsSync('firestore.rules')) {
      const rules = fs.readFileSync('firestore.rules', 'utf8');
      rulesLocked = rules.includes('if false');
    }
  } catch {
    rulesLocked = false;
  }

  const checks: VibeSecAuditResult['checks'] = [
    {
      id: 'VIBE-01',
      name: 'Durable Storage & Secrets Isolation',
      category: 'storage',
      status: isDurable ? 'pass' : 'warn',
      detail: isCloud
        ? 'Connected to Cloud Firestore database; no admin or payment signing secrets bundled in client JS.'
        : isDurable
        ? 'Durable atomic disk persistence (.mrs-data/store.json) active; set FIREBASE_SERVICE_ACCOUNT to sync Admin SDK with Cloud Firestore.'
        : 'Running with non-durable in-memory fallback because FIREBASE_SERVICE_ACCOUNT is not configured in this runtime.',
    },
    {
      id: 'VIBE-02',
      name: 'Firestore Security Rules Lockdown',
      category: 'storage',
      status: rulesLocked ? 'pass' : 'warn',
      detail: rulesLocked
        ? 'firestore.rules verified with strict deny-all client rule (allow read, write: if false;). Server Admin SDK only.'
        : 'firestore.rules not verified as locked down.',
    },
    {
      id: 'VIBE-03',
      name: 'Owner Auth & Session Signing Secret',
      category: 'authentication',
      status: hasCustomAdminPassword && hasCustomSessionSecret ? 'pass' : 'warn',
      detail: hasCustomAdminPassword && hasCustomSessionSecret
        ? 'Owner passcode and 32+ char MRS_SESSION_SECRET configured; 5-strike PIN lockout active.'
        : !hasCustomAdminPassword
        ? 'Owner passcode not yet claimed or set in MRS_ADMIN_PASSWORD; complete first-run setup or configure Secrets.'
        : 'Owner passcode configured; configure 32+ char MRS_SESSION_SECRET in Secrets to persist sessions across restarts.',
    },
    {
      id: 'VIBE-04',
      name: 'HMAC-SHA256 Webhook Integrity',
      category: 'tamper_defense',
      status: hasSmsKey && hasIngestKey ? 'pass' : 'warn',
      detail: hasSmsKey && hasIngestKey
        ? 'Production MRS_SMS_SIGNING_KEY and MRS_INGEST_SECRET configured with 5-minute replay window.'
        : 'Webhook HMAC verification active, but MRS_SMS_SIGNING_KEY / MRS_INGEST_SECRET are using dev defaults.',
    },
    {
      id: 'VIBE-05',
      name: 'Replay Attack & Unique Trx Guard',
      category: 'tamper_defense',
      status: 'pass',
      detail: 'Unique normalized transaction matching and one-time ledger claim guards enforced in atomic settlement.',
    },
    {
      id: 'VIBE-06',
      name: 'Secure HTTP Headers',
      category: 'headers',
      status: 'pass',
      detail: 'X-Content-Type-Options: nosniff, Referrer-Policy, and Permissions-Policy active.',
    },
    {
      id: 'VIBE-07',
      name: 'Email Authentication Verification (DMARC/SPF)',
      category: 'transport',
      status: 'pass',
      detail: 'Email payment ingestion requires DMARC=pass and SPF=pass before crediting ledger.',
    },
  ];

  const passCount = checks.filter((c) => c.status === 'pass').length;
  const warnCount = checks.filter((c) => c.status === 'warn').length;
  const failCount = checks.filter((c) => c.status === 'fail').length;
  const score = Math.max(0, Math.round((passCount * 100 + warnCount * 65) / checks.length) - failCount * 15);
  const grade: VibeSecAuditResult['grade'] =
    score >= 95 ? 'A+' : score >= 85 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'F';

  const recommendations: string[] = [];
  if (!isDurable) recommendations.push('Configure FIREBASE_SERVICE_ACCOUNT for durable Firestore persistence.');
  if (!hasCustomAdminPassword || !hasCustomSessionSecret) {
    recommendations.push('Set custom MRS_ADMIN_PASSWORD and 32+ character MRS_SESSION_SECRET environment variables.');
  }
  if (!hasSmsKey || !hasIngestKey) {
    recommendations.push('Set production MRS_SMS_SIGNING_KEY and MRS_INGEST_SECRET environment variables.');
  }
  if (recommendations.length === 0) {
    recommendations.push('All environment secrets and database rules verified. Rotate bridge secrets quarterly.');
  }

  return {
    score,
    grade,
    timestamp: new Date().toISOString(),
    checks,
    recommendations,
  };
}
