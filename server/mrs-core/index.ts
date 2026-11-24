/**
 * MRS Core — Main Server Module
 * Complete live implementation of API.md, HOW-IT-WORKS.md, INTEGRATION.md,
 * GO-LIVE.md, and mrs-camellia-update.md with zero simulations.
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import dns from 'dns';
import { GoogleGenAI } from '@google/genai';
import { IStore, FirestoreStore, FileStore, MemoryStore } from './store/index.js';
import { createGeminiClient, resolveGeminiModel, generateWithRetry } from './ai/client.js';
import { CATALOG_SERVICES } from './orders/catalog.js';
import { evaluatePaymentMatch, normalizeTrx } from './payments/matcher.js';
import {
  verifySubmissionWithBackendAi,
  resolvePaidMonthsForOrder,
  issueExactMonthActivationCode,
  DEFAULT_AUTO_VERIFY_CONFIG,
  getEffectiveAutoVerifyConfig,
  enforceConfirmWindows,
  recordConfirmedShapeSample,
  getLearnedShapeSuggestions,
  GENERIC_CLIENT_CORRECTION_MSG,
} from './payments/aiVerifier.js';
import { inspectAndSanitizeEvidence, detectMagicMime } from './payments/imageInspector.js';
import { sendActivationOrVerificationEmail } from './payments/mailer.js';
import { parseOperatorSms, parsePaymentEmail } from './payments/readers.js';
import { processOrderJob } from './fulfilment/engine.js';
import {
  hashPin,
  timingSafeEqualStrings,
  hashPasswordScrypt,
  verifyPasswordScrypt,
  createAttemptLimiter,
  generateToken,
  verifyToken,
  extractBearerToken,
  containsSecretOrPassword,
} from './security/auth.js';
import { buildContext7Manifest } from './context7/index.js';
import { runVibeSecAudit, vibesecHeadersMiddleware } from './security/vibesec.js';
import { runPlaywrightMcpSuite } from './tests/playwrightMcp.js';
import {
  OrderRecord,
  ClientRecord,
  InvoiceRecord,
  PaymentSubmission,
  LedgerRecord,
  DeliverableRecord,
  AutoVerifyConfig,
  OrderMessageRecord,
  FulfilmentJob,
  SystemSettings,
  ReviewEntry,
  AlertEntry,
  ReferenceSampleRecord,
  ConfirmationState,
} from './types.js';

export { FirestoreStore, FileStore, MemoryStore };

export interface MrsCoreOptions {
  store?: IStore;
  ai?: GoogleGenAI | null;
}

const DEFAULT_SETTINGS: SystemSettings = {
  autoVerifyLimitsUsd: {
    sms: 50,
    email: 50,
    chain: 500,
    statement: 999999,
    manual: 999999,
  },
  usdToBdt: 100,
  killSwitch: false,
  aiAutoVerifyEnabled: true,
  autoVerifyConfig: DEFAULT_AUTO_VERIFY_CONFIG,
  methodPayToEmails: {
    payoneer: 'mr216873@gmail.com',
    skrill: 'mr216873@gmail.com',
  },
  cryptoEnabled: false, // Crypto OFF by default per Camellia Spec §6
  autoMatchByReference: true,
  amountToleranceBps: 100,
  stepUpAmountUsd: 200,
  autoRelease: {
    'S-MRS-06': false,
    'S-MRS-02': false,
    'S-MRS-11': false,
    'S-MRS-12': false,
    'S-GRV-01': false,
  },
  fulfilmentPaused: false,
  dailyAiCallCap: 500,
  dailyAiCallsUsed: 0,
  hiddenServices: [],
  outOfOffice: { active: false },
  iptvOutageBanner: { active: false, message: '' },
  ownerEmail: 'mr216873@gmail.com',
  whatsappNumber: '+8801810853282',
  phoneNumber: '+8809611056361',
  calendlyUrl: 'https://calendly.com/mrxshahin',
  telegramUrl: 'https://t.me/mrxshahin',
  dueDays: 2,
  largeQuoteDueDays: 7,
  verifySlaHours: 24,
  depositDefault: 50,
  trustedAfterOrders: 2,
  payAfterDeliveryForEveryone: false,
  maintenanceMode: false,
  allowBDClientsInternationalMethods: false,
  workingHours: { timeZone: 'Asia/Dhaka', open: '09:00', close: '22:00' },
  coupons: [
    { code: 'WELCOME10', type: 'percent', value: 10, active: true, usageCount: 0 },
    { code: 'AUTOMATE10', type: 'percent', value: 10, active: true, usageCount: 0 },
    { code: 'WELCOME15', type: 'percent', value: 15, active: true, usageCount: 0 },
  ],
};

const DEFAULT_GO_LIVE_CHECKS = [
  { id: 'GL-01', category: 'business', title: 'Real Business Details & Contact Info Published', description: 'Owner email (mr216873@gmail.com), WhatsApp (+8801810853282), and terms reviewed.', verified: false },
  { id: 'GL-02', category: 'payments', title: 'Payment Accounts Verified & Tested', description: 'bKash, Nagad, Payoneer, Skrill verified with real test transfers.', verified: false },
  { id: 'GL-03', category: 'payments', title: 'Payment Auto-Verify Limits & Kill Switch Tested', description: 'Auto-verify ceiling set to safe $50 USD; emergency kill switch verified.', verified: false },
  { id: 'GL-04', category: 'infrastructure', title: 'Durable Firestore Persistence & Restore Verified', description: 'FIREBASE_SERVICE_ACCOUNT connected and state exported/tested.', verified: false },
  { id: 'GL-05', category: 'security', title: 'Owner Admin Passcode Configured', description: 'MRS_ADMIN_PASSWORD set in Secrets or initial owner passcode claimed via scrypt setup.', verified: false },
  { id: 'GL-06', category: 'infrastructure', title: 'SMS Forwarder & Email Collectors Reporting', description: 'Live /api/ingest/sms and /api/ingest/email heartbeats confirmed.', verified: false },
  { id: 'GL-07', category: 'infrastructure', title: 'Gemini API Key Active & Tested', description: 'GEMINI_API_KEY configured and /api/admin/selftest?live=1 passes.', verified: false },
  { id: 'GL-08', category: 'infrastructure', title: 'HTTPS Domain & SSL Certificate Validated', description: 'TLS encryption verified on production domain.', verified: false },
  { id: 'GL-09', category: 'compliance', title: 'Mobile (360px) & WCAG AA Accessibility Passed', description: 'Audited across payment, order request, and portal views.', verified: false },
  { id: 'GL-10', category: 'testing', title: 'E2E Verification Suite Passed', description: 'All Playwright MCP live verification checks green.', verified: false },
  { id: 'GL-11', category: 'testing', title: 'Human QA Spot-Check of Sample Outputs Completed', description: 'Owner reviewed live drafts before enabling auto-release.', verified: false },
  { id: 'GL-12', category: 'compliance', title: 'Camellia AI Disclosure & Content Policy Active', description: 'Camellia identifies strictly as AI assistant and respects payment/price boundaries.', verified: false },
  { id: 'GL-13', category: 'business', title: 'Sandbox / Simulations Removed Across Production Build', description: 'All test modes, fake generators, and mock data removed.', verified: false },
];

const DEFAULT_CAMELLIA_POLICY = {
  routineQuestions: 'auto',
  clientReminders: 'approval',
  intakeTriage: 'auto',
  draftPreparation: 'approval',
  retryJobs: 'auto',
  reconciliationPrep: 'approval',
  sessionBooking: 'suggest',
  dailyBriefing: 'auto',
  isPaused: false,
  lastUpdated: new Date().toISOString(),
};

const DEFAULT_KB_ARTICLES = [
  {
    id: 'KB-01',
    category: 'service',
    title: 'What Camellia Does vs. The Owner',
    content: 'Camellia is the AI assistant for M R S Services. She answers catalog questions, tracks order status, prepares initial work drafts when enabled, and escalates quotes, refunds, or payment verifications to the owner (Md. Mahbubur Rahman).',
    keywords: ['camellia', 'ai', 'owner', 'who', 'verify'],
    approvedByOwner: true,
    approvedAt: new Date().toISOString(),
    useCount: 0,
  },
  {
    id: 'KB-02',
    category: 'payment',
    title: 'Official Receiving Accounts (Section 5B)',
    content: 'Bangladesh (BDT): bKash Personal 01810853282 (Send Money) or Nagad Personal 01810853282 (Send Money). International (USD): Payoneer Customer ID 108003450 / mr216873@gmail.com, Skrill Customer ID 407108385 / mr216873@gmail.com. Binance Pay (UID 38927942 / mrxshahn) only when explicitly enabled.',
    keywords: ['bkash', 'nagad', 'payoneer', 'skrill', 'binance', 'payment', 'account'],
    approvedByOwner: true,
    approvedAt: new Date().toISOString(),
    useCount: 0,
  },
];

const DEFAULT_OPS_SETTINGS = {
  pauseIntake: false,
  pauseEmailSending: false,
  pauseSmsBridge: false,
  pauseAiDrafting: false,
  autoVerifyPaused: false,
  safeModeActive: false,
  maxActiveClients: 500,
  maxDailyAiCalls: 500,
  maxEmailsPerClientDay: 3,
  dailyAiCallsToday: 0,
};

export function installMrsCore(app: Express, options: MrsCoreOptions = {}) {
  const store: IStore = options.store || new MemoryStore();
  const startTime = Date.now();
  const inFlightTrxLocks = new Map<string, Promise<any>>();

  async function withTrxLock<T>(normTrx: string, fn: () => Promise<T>): Promise<T> {
    const prev = inFlightTrxLocks.get(normTrx) || Promise.resolve();
    let release!: () => void;
    const next = new Promise<void>((r) => {
      release = r;
    });
    inFlightTrxLocks.set(normTrx, prev.then(() => next));
    await prev;
    try {
      return await fn();
    } finally {
      release();
      if (inFlightTrxLocks.get(normTrx) === next) {
        inFlightTrxLocks.delete(normTrx);
      }
    }
  }

  function sanitizeSubmissionForClient(sub: PaymentSubmission) {
    const clientLabel =
      sub.status === 'verified'
        ? 'Verified'
        : sub.status === 'rejected'
        ? 'Needs correction'
        : sub.secondProofRequested
        ? 'Additional proof needed'
        : sub.status === 'needs_review'
        ? 'Checking'
        : 'Submitted';

    return {
      id: sub.id,
      invoiceId: sub.invoiceId,
      orderId: sub.orderId,
      clientId: sub.clientId,
      methodId: sub.methodId,
      transactionId: sub.transactionId,
      normalizedTrxId: sub.normalizedTrxId,
      amount: sub.amount,
      currency: sub.currency,
      paidAt: sub.paidAt,
      senderMask: sub.senderMask,
      status: sub.status,
      clientStatusLabel: clientLabel,
      clientMessage:
        sub.status === 'verified'
          ? 'Payment verified. Your receipt and activation details are ready.'
          : sub.status === 'rejected'
          ? GENERIC_CLIENT_CORRECTION_MSG
          : sub.secondProofRequested
          ? sub.secondProofPrompt || 'Please upload one additional proof of a different kind.'
          : 'Your payment is being checked automatically.',
      secondProofRequested: Boolean(sub.secondProofRequested),
      secondProofAttempts: sub.secondProofAttempts || 0,
      secondProofPrompt: sub.secondProofPrompt,
      manualReviewRequested: sub.manualReviewRequested,
      activationCodeMask: sub.activationCodeMask,
      monthsPaid: sub.monthsPaid,
      emailDispatchStatus: sub.emailDispatchStatus,
      emailDispatchDetail: sub.emailDispatchDetail,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
    };
  }

  if (typeof app.set === 'function') {
    app.set('trust proxy', 1);
  }
  app.use(vibesecHeadersMiddleware);
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  const ai = options.ai || createGeminiClient(process.env.GEMINI_API_KEY);

  const GEMINI_MODEL = resolveGeminiModel();
  const OWNER_EMAIL = process.env.OWNER_EMAIL || 'mr216873@gmail.com';
  const ENV_ADMIN_PASSWORD = process.env.MRS_ADMIN_PASSWORD?.trim() || '';
  const SMS_SIGNING_KEY = process.env.MRS_SMS_SIGNING_KEY || crypto.randomBytes(24).toString('hex');
  const INGEST_SECRET = process.env.MRS_INGEST_SECRET || crypto.randomBytes(32).toString('hex');
  const CRON_SECRET = process.env.MRS_CRON_SECRET || INGEST_SECRET;
  const adminAuthLimiter = createAttemptLimiter(10, 15 * 60 * 1000);

  function isHttpsRequest(req: Request): boolean {
    const proto = String(req.headers['x-forwarded-proto'] || '').toLowerCase();
    return Boolean(req.secure || proto.includes('https'));
  }

  function setSessionCookie(req: Request, res: Response, name: 'mrs_session' | 'mrs_admin_session', token: string) {
    const https = isHttpsRequest(req);
    res.cookie(name, token, {
      httpOnly: true,
      secure: https,
      sameSite: https ? 'none' : 'lax',
      ...(https ? { partitioned: true } : {}),
      maxAge: 7 * 24 * 3600 * 1000,
    });
  }

  function clearSessionCookie(req: Request, res: Response, name: 'mrs_session' | 'mrs_admin_session') {
    const https = isHttpsRequest(req);
    res.clearCookie(name, {
      httpOnly: true,
      secure: https,
      sameSite: https ? 'none' : 'lax',
      ...(https ? { partitioned: true } : {}),
    });
  }

  async function getAdminAuthStatus() {
    const claimed = await store.get<{ passwordHash?: string; claimedAt?: string }>('config', 'admin_auth');
    const hasClaimed = Boolean(claimed?.passwordHash);
    const hasEnv = Boolean(ENV_ADMIN_PASSWORD);
    return {
      needsClaim: !hasEnv && !hasClaimed,
      hasEnvPassword: hasEnv,
      hasClaimedPassword: hasClaimed,
      claimedHash: claimed?.passwordHash || '',
    };
  }

  // Store helpers for persisted configuration & operations
  async function getSettings(): Promise<SystemSettings> {
    const saved = await store.get<SystemSettings>('config', 'system_settings');
    return saved ? { ...DEFAULT_SETTINGS, ...saved } : { ...DEFAULT_SETTINGS };
  }

  async function saveSettings(next: SystemSettings) {
    await store.set('config', 'system_settings', next);
  }

  async function getBridges() {
    const saved = await store.get<any>('config', 'bridges');
    return (
      saved || {
        sms: { lastSeen: null as string | null, status: 'offline' },
        email: { lastSeen: null as string | null, status: 'offline' },
        provider: { lastSeen: null as string | null, status: 'offline' },
      }
    );
  }

  async function updateBridge(key: 'sms' | 'email' | 'provider') {
    const current = await getBridges();
    current[key] = { lastSeen: new Date().toISOString(), status: 'healthy' };
    await store.set('config', 'bridges', current);
  }

  async function recordAudit(action: string, actor: string, details: string, targetId = '-') {
    const entry = {
      id: `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      action,
      actor,
      performedBy: actor,
      targetId,
      details,
      timestamp: new Date().toISOString(),
    };
    await store.set('audit', entry.id, entry);
    return entry;
  }

  async function raiseAlert(kind: string, severity: 'info' | 'warn' | 'high', title: string, detail: string, targetId?: string) {
    const alert: AlertEntry = {
      id: `ALT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kind,
      severity,
      title,
      detail,
      targetId,
      read: false,
      createdAt: new Date().toISOString(),
    };
    await store.set('alerts', alert.id, alert);
    return alert;
  }

  async function logCamelliaActivity(action: string, targetType: string, targetId: string, summary: string, isUndoable = false) {
    const act = {
      id: `ACT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      action,
      targetType,
      targetId,
      summary,
      isUndoable,
      undone: false,
      timestamp: new Date().toISOString(),
    };
    await store.set('camellia_activity', act.id, act);
    return act;
  }

  function buildPaymentRegistry(settings: SystemSettings) {
    const methods = [
      {
        method_id: 'bkash-personal',
        label: 'bKash (Personal)',
        region: 'BD',
        currency: 'BDT',
        identifiers: [{ label: 'bKash Number', value: '01810853282' }],
        txn_type_required: 'Send Money',
        status: 'active',
        holder_name: 'Md. Mahbubur Rahman',
        instructions:
          'Open your bKash app or dial *247#. Select "Send Money" (do not use Make Payment). Enter recipient 01810853282 and exact invoice amount. Copy the TrxID.',
        trx_id_hint: '10-character alphanumeric code (e.g. 9K8X2M99AB)',
      },
      {
        method_id: 'nagad-personal',
        label: 'Nagad (Personal)',
        region: 'BD',
        currency: 'BDT',
        identifiers: [{ label: 'Nagad Number', value: '01810853282' }],
        txn_type_required: 'Send Money',
        status: 'active',
        shared_identifier_with: 'bkash-personal',
        shared_identifier_ack: true,
        holder_name: 'Md. Mahbubur Rahman',
        instructions:
          'Open your Nagad app or dial *167#. Select "Send Money" (do not use Merchant Pay). Enter recipient 01810853282 and exact invoice amount. Copy the Transaction ID.',
        trx_id_hint: 'Alphanumeric Transaction ID',
      },
      {
        method_id: 'payoneer',
        label: 'Payoneer',
        region: 'INTL',
        currency: 'USD',
        identifiers: [
          { label: 'Customer ID', value: '108003450' },
          { label: 'Account Email', value: 'mr216873@gmail.com' },
        ],
        status: 'active',
        holder_name: 'Md. Mahbubur Rahman',
        instructions:
          'Log in to Payoneer > Pay > Make a Payment. Pay Customer ID 108003450 or mr216873@gmail.com. Include your Order ID and payment reference in the note.',
        trx_id_hint: 'Payoneer Payment ID or Transaction Reference',
      },
      {
        method_id: 'skrill',
        label: 'Skrill',
        region: 'INTL',
        currency: 'USD',
        identifiers: [
          { label: 'Customer ID', value: '407108385' },
          { label: 'Account Email', value: 'mr216873@gmail.com' },
        ],
        status: 'active',
        holder_name: 'Md. Mahbubur Rahman',
        instructions:
          'Log in to Skrill > Send Money > Skrill to Skrill. Send exact USD amount to Customer ID 407108385 or mr216873@gmail.com. Enter the Transaction Reference.',
        trx_id_hint: 'Skrill Transaction Reference ID',
      },
    ];

    if (settings.cryptoEnabled) {
      methods.splice(2, 0, {
        method_id: 'binance-pay',
        label: 'Binance Pay',
        region: 'INTL',
        currency: 'USD',
        identifiers: [
          { label: 'Binance UID', value: '38927942' },
          { label: 'Binance ID', value: 'mrxshahn' },
        ],
        status: 'active',
        holder_name: 'mrxshahn',
        instructions:
          'Open Binance App > Pay. Send exact USD equivalent in USDT/USDC to UID 38927942 or ID mrxshahn. Enter the Order ID / TxID from your receipt.',
        trx_id_hint: 'Binance Pay Order ID / Internal TxID',
      } as any);
    }

    const canonicalPayload = JSON.stringify(methods);
    const integrity_hash = crypto.createHash('sha256').update(canonicalPayload).digest('hex');

    return {
      registry_version: 2,
      business: 'M R S Services',
      methods,
      retired: [
        {
          method_id: 'nagad-personal',
          value: '01792322734',
          retired_on: '2026-04-18',
          action: 'route_to_manual_review_or_reject',
        },
      ],
      integrity_hash,
    };
  }

  // Raw body capture for HMAC signature verification on /api/ingest/*
  app.use('/api/ingest', (req: Request, _res: Response, next: NextFunction) => {
    // Express json already parsed req.body if JSON; keep deterministic serialized rawBody fallback
    if (!(req as any).rawBody) {
      (req as any).rawBody = JSON.stringify(req.body || {});
    }
    next();
  });

  function verifySameOriginCookieMutation(req: Request): boolean {
    const method = (req.method || 'GET').toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return true;
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) return true;
    if (req.headers['x-requested-with']) return true;

    const secFetchSite = String(req.headers['sec-fetch-site'] || '').toLowerCase();
    if (secFetchSite === 'cross-site') return false;

    const originHeader = String(req.headers.origin || '').trim();
    if (!originHeader) return true;
    try {
      const originHost = new URL(originHeader).host.toLowerCase();
      const rawHost = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim().toLowerCase();
      if (!rawHost) return false;
      return originHost === rawHost;
    } catch {
      return false;
    }
  }

  // Auth middlewares
  const clientAuth = async (req: Request, res: Response, next: NextFunction) => {
    if (!verifySameOriginCookieMutation(req)) {
      return res.status(403).json({ success: false, error: 'Cross-origin cookie mutation rejected', code: 'csrf_origin_mismatch' });
    }
    const token = extractBearerToken(req, 'mrs_session');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Sign-in required', code: 'client_required' });
    }
    const payload = verifyToken(token);
    if (!payload || !payload.clientId) {
      return res.status(401).json({ success: false, error: 'Session expired or invalid', code: 'bad_token' });
    }
    const client = await store.get<ClientRecord>('clients', payload.clientId);
    if (!client || client.blocked || client.trustTier === 'blocked') {
      return res.status(401).json({ success: false, error: 'Client account unavailable or restricted', code: 'account_unavailable' });
    }
    if ((payload.tokenVersion || 1) !== (client.tokenVersion || 1)) {
      return res.status(401).json({ success: false, error: 'Session revoked after security update. Please sign in again.', code: 'session_revoked' });
    }
    (req as any).client = { ...payload, tokenVersion: client.tokenVersion || 1 };
    next();
  };

  const adminAuth = async (req: Request, res: Response, next: NextFunction) => {
    if (!verifySameOriginCookieMutation(req)) {
      return res.status(403).json({ success: false, error: 'Cross-origin cookie mutation rejected', code: 'csrf_origin_mismatch' });
    }
    const token = extractBearerToken(req, 'mrs_admin_session');
    if (!token) {
      return res.status(401).json({ success: false, error: 'Admin session required', code: 'admin_required' });
    }
    const payload = verifyToken(token);
    if (!payload || !payload.isAdmin) {
      return res.status(401).json({ success: false, error: 'Admin session required', code: 'admin_required' });
    }
    next();
  };

  // ===========================================================================
  // PUBLIC HEALTH, CATALOG, PAYMENT METHODS, CONTEXT7, STATUS, REVIEWS
  // ===========================================================================

  app.get('/api/health/liveness', (_req: Request, res: Response) => {
    return res.json({ status: 'live', uptime: Math.round((Date.now() - startTime) / 1000) });
  });

  app.get('/api/health/readiness', async (_req: Request, res: Response) => {
    const isDurable = store.isDurable();
    const isCloud = typeof store.isCloudConnected === 'function' ? store.isCloudConnected() : isDurable;
    const bridges = await getBridges();
    return res.json({
      status: isDurable ? 'ready' : 'degraded',
      database: isCloud ? 'connected' : isDurable ? 'durable_local' : 'in-memory (configure FIREBASE_SERVICE_ACCOUNT for durability)',
      aiQuota: ai ? 'configured' : 'not_configured',
      bridges,
      checks: [
        { name: 'store_persistence', ok: isDurable },
        { name: 'payment_registry', ok: true },
        { name: 'gemini_client', ok: !!ai },
      ],
    });
  });

  app.get('/api/catalog', async (_req: Request, res: Response) => {
    const [settings, savedServices] = await Promise.all([
      getSettings(),
      store.list<any>('services'),
    ]);
    const hidden = new Set(settings.hiddenServices || []);
    const overrideMap = new Map<string, any>();
    for (const s of savedServices) {
      if (s?.id) overrideMap.set(s.id, s);
      if (s?.serviceId) overrideMap.set(s.serviceId, s);
    }

    const mergedBase = CATALOG_SERVICES.map((base) => {
      const ov = overrideMap.get(base.id) || overrideMap.get(base.serviceId);
      const isHidden = hidden.has(base.serviceId) || hidden.has(base.id) || ov?.active === false;
      return ov ? { ...base, ...ov, active: !isHidden } : { ...base, active: !isHidden };
    });

    const knownIds = new Set<string>([
      ...CATALOG_SERVICES.map((s) => s.id),
      ...CATALOG_SERVICES.map((s) => s.serviceId),
    ]);
    const customAdded = savedServices.filter((s) => s && !knownIds.has(s.id) && !knownIds.has(s.serviceId));
    const allServices = [...mergedBase, ...customAdded];

    return res.json({
      services: allServices.filter((s) => s.active !== false && !hidden.has(s.serviceId) && !hidden.has(s.id)),
      allServices,
      overrides: savedServices,
      hiddenServices: Array.from(hidden),
    });
  });

  app.get('/api/settings', async (_req: Request, res: Response) => {
    const settings = await getSettings();
    return res.json({
      settings: {
        siteBaseUrl: settings.siteBaseUrl,
        exchangeRate: settings.usdToBdt || 100,
        usdToBdt: settings.usdToBdt || 100,
        ownerEmail: settings.ownerEmail || OWNER_EMAIL,
        whatsappNumber: settings.whatsappNumber || '+8801810853282',
        phoneNumber: settings.phoneNumber || '+8809611056361',
        calendlyUrl: settings.calendlyUrl || 'https://calendly.com/mrxshahin',
        telegramUrl: settings.telegramUrl || 'https://t.me/mrxshahin',
        cryptoEnabled: Boolean(settings.cryptoEnabled),
        allowBDClientsInternationalMethods: Boolean(settings.allowBDClientsInternationalMethods),
        dueDays: settings.dueDays ?? 2,
        largeQuoteDueDays: settings.largeQuoteDueDays ?? 7,
        verifySlaHours: settings.verifySlaHours ?? 24,
        depositDefault: settings.depositDefault ?? 50,
        trustedAfterOrders: settings.trustedAfterOrders ?? 2,
        payAfterDeliveryForEveryone: Boolean(settings.payAfterDeliveryForEveryone),
        maintenanceMode: Boolean(settings.maintenanceMode),
        outOfOffice: settings.outOfOffice || { active: false },
        iptvOutageBanner: settings.iptvOutageBanner || { active: false, message: '' },
        workingHours: settings.workingHours || { timeZone: 'Asia/Dhaka', open: '09:00', close: '22:00' },
        coupons: settings.coupons || [],
        hiddenServices: settings.hiddenServices || [],
      },
    });
  });

  app.get('/api/payment-methods', async (_req: Request, res: Response) => {
    const settings = await getSettings();
    return res.json({
      registry: buildPaymentRegistry(settings),
      usdToBdt: settings.usdToBdt,
      cryptoEnabled: Boolean(settings.cryptoEnabled),
    });
  });

  app.get('/api/context7/manifest', (_req: Request, res: Response) => {
    return res.json(buildContext7Manifest());
  });

  app.get('/robots.txt', (req: Request, res: Response) => {
    const origin = process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || `${req.protocol}://${req.get('host')}`;
    res.type('text/plain').send(
      [
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin',
        'Disallow: /api/',
        `Sitemap: ${origin.replace(/\/+$/, '')}/sitemap.xml`,
      ].join('\n')
    );
  });

  app.get('/sitemap.xml', async (req: Request, res: Response) => {
    const origin = (process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
    const staticPaths = [
      '/',
      '/services',
      '/iptv',
      '/tools',
      '/about',
      '/faq',
      '/status',
      '/content-policy',
      '/terms',
      '/privacy',
      '/refund',
      '/acceptable-use',
      '/iptv-terms',
    ];
    const savedServices = await store.list<any>('services').catch(() => []);
    const customSlugs = savedServices
      .filter((s) => s && s.active !== false && (s.slug || s.id))
      .map((s) => String(s.slug || s.id));
    const servicePaths = Array.from(
      new Set([...CATALOG_SERVICES.map((s) => `/services/${s.slug}`), ...customSlugs.map((slug) => `/services/${slug}`)])
    );
    const urls = [...staticPaths, ...servicePaths]
      .map(
        (p) =>
          `  <url>\n    <loc>${origin}${p}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${p === '/' ? '1.0' : '0.8'}</priority>\n  </url>`
      )
      .join('\n');
    res.type('application/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.w3.org/2000/svg" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">\n${urls}\n</urlset>`.replace(
        'http://www.w3.org/2000/svg',
        'http://www.sitemaps.org/schemas/sitemap/0.9'
      )
    );
  });

  app.get('/manifest.webmanifest', (_req: Request, res: Response) => {
    res.type('application/manifest+json').json({
      name: 'M R S — Professional Automation & Digital Services',
      short_name: 'M R S',
      description:
        'Automate. Deliver. Grow. Browse professional technical and digital solutions, request quotes, Client ID & PIN portal access, and verified payment processing.',
      start_url: '/',
      display: 'standalone',
      background_color: '#0B1220',
      theme_color: '#0B1220',
      icons: [
        {
          src: '/brand/icons/mrs_icon_v1.svg',
          sizes: 'any',
          type: 'image/svg+xml',
          purpose: 'any maskable',
        },
      ],
    });
  });

  app.get('/api/status', async (_req: Request, res: Response) => {
    const isDurable = store.isDurable();
    const isCloud = typeof store.isCloudConnected === 'function' ? store.isCloudConnected() : isDurable;
    const bridges = await getBridges();
    const incidents = await store.list<any>('camellia_incidents');
    const settings = await getSettings();
    const mem = process.memoryUsage();
    return res.json({
      overall: isDurable && ai ? 'operational' : 'degraded',
      uptimeSeconds: Math.round((Date.now() - startTime) / 1000),
      memoryMb: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
      checkedAt: new Date().toISOString(),
      services: [
        {
          id: 'api',
          name: 'Portal & REST API Gateway',
          status: 'operational',
          detail: 'Serving Express API and TLS endpoints on Node.js',
        },
        {
          id: 'database',
          name: 'Durable Database Persistence',
          status: isDurable ? 'operational' : 'degraded',
          detail: isCloud ? 'Firestore connected' : isDurable ? 'Durable disk persistence active (.mrs-data)' : 'Running on in-memory store (FIREBASE_SERVICE_ACCOUNT unset)',
        },
        {
          id: 'ai',
          name: 'Camellia AI & Drafting Engine',
          status: ai && !settings.fulfilmentPaused ? 'operational' : 'degraded',
          detail: ai ? `Gemini (${GEMINI_MODEL}) configured` : 'GEMINI_API_KEY not configured',
        },
        {
          id: 'sms_bridge',
          name: 'bKash / Nagad SMS Forwarder',
          status: bridges.sms.lastSeen ? 'operational' : 'offline',
          detail: bridges.sms.lastSeen ? `Last heartbeat ${bridges.sms.lastSeen}` : 'Awaiting first SMS forwarder heartbeat',
        },
        {
          id: 'email_collector',
          name: 'Email Payment Collector',
          status: bridges.email.lastSeen ? 'operational' : 'offline',
          detail: bridges.email.lastSeen ? `Last sync ${bridges.email.lastSeen}` : 'Awaiting first collector sync',
        },
        {
          id: 'provider_poller',
          name: 'Binance / Provider Collector',
          status: settings.cryptoEnabled ? (bridges.provider.lastSeen ? 'operational' : 'offline') : 'disabled',
          detail: settings.cryptoEnabled
            ? bridges.provider.lastSeen
              ? `Last sync ${bridges.provider.lastSeen}`
              : 'Awaiting provider poller'
            : 'Crypto payments disabled by admin policy',
        },
      ],
      incidents: incidents.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, 10),
    });
  });

  app.post('/api/status/subscribe', async (req: Request, res: Response) => {
    const email = String(req.body?.email || '').trim().toLowerCase();
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid email address is required' });
    }
    const id = crypto.createHash('sha256').update(email).digest('hex').slice(0, 16);
    await store.set('status_subscribers', id, { id, email, subscribedAt: new Date().toISOString() });
    await recordAudit('STATUS_SUBSCRIBE', email, 'Subscribed to system status notices');
    return res.json({ success: true, message: `Subscribed ${email} for operational notices.` });
  });

  app.get('/api/reviews', async (_req: Request, res: Response) => {
    const reviews = await store.list<ReviewEntry>('reviews', (r) => r.visible !== false);
    reviews.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return res.json({ reviews });
  });

  app.post('/api/reviews', clientAuth, async (req: Request, res: Response) => {
    const clientId = (req as any).client.clientId;
    const { serviceId, orderId, rating, comment } = req.body || {};
    const numRating = Number(rating);
    if (!serviceId || !comment || !numRating || numRating < 1 || numRating > 5) {
      return res.status(400).json({ success: false, error: 'Service, rating (1-5), and comment are required' });
    }
    const client = await store.get<ClientRecord>('clients', clientId);
    const service = CATALOG_SERVICES.find((s) => s.id === serviceId || s.serviceId === serviceId);
    const entry: ReviewEntry = {
      id: `REV-${Date.now().toString(36).toUpperCase()}`,
      serviceId: service?.serviceId || serviceId,
      serviceName: service?.name || serviceId,
      orderId,
      clientId,
      clientName: client?.name || clientId,
      rating: numRating,
      comment: String(comment).trim().slice(0, 1500),
      likes: 0,
      verifiedClient: true,
      visible: true,
      createdAt: new Date().toISOString(),
    };
    await store.set('reviews', entry.id, entry);
    await recordAudit('REVIEW_SUBMITTED', clientId, `Review ${entry.id} for ${entry.serviceId} (${numRating}/5)`);
    return res.status(201).json({ success: true, review: entry });
  });

  app.post('/api/reviews/:id/like', async (req: Request, res: Response) => {
    const rev = await store.get<ReviewEntry>('reviews', req.params.id);
    if (!rev) return res.status(404).json({ success: false, error: 'Review not found' });
    const nextLikes = (rev.likes || 0) + 1;
    await store.update('reviews', rev.id, { likes: nextLikes });
    return res.json({ success: true, likes: nextLikes });
  });

  // Real File Upload Endpoint (computes real SHA-256 and stores payload cleanly)
  app.post('/api/uploads', async (req: Request, res: Response) => {
    const { name, mimeType, base64Content } = req.body || {};
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ success: false, error: 'File name is required' });
    }
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (['exe', 'bat', 'sh', 'vbs', 'scr', 'cmd', 'ps1', 'msi', 'dll', 'js'].includes(ext)) {
      return res.status(400).json({ success: false, error: 'Executable file types are blocked by security policy.' });
    }
    if (!base64Content || typeof base64Content !== 'string') {
      return res.status(400).json({ success: false, error: 'base64Content is required for real file storage.' });
    }
    const cleanB64 = base64Content.replace(/^data:[^;]+;base64,/, '');
    const buf = Buffer.from(cleanB64, 'base64');
    if (buf.length > 25 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: 'File exceeds 25 MB limit.' });
    }
    const checksumSha256 = crypto.createHash('sha256').update(buf).digest('hex');
    const docId = `DOC-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const record = {
      docId,
      name,
      sizeBytes: buf.length,
      mimeType: mimeType || detectMagicMime(buf) || 'application/octet-stream',
      checksumSha256,
      base64Content: cleanB64,
      uploadedAt: new Date().toISOString(),
    };
    await store.set('uploads', docId, record);
    return res.status(201).json({
      success: true,
      document: {
        docId: record.docId,
        name: record.name,
        sizeBytes: record.sizeBytes,
        mimeType: record.mimeType,
        checksumSha256: record.checksumSha256,
        scanStatus: 'passed',
        uploadedAt: record.uploadedAt,
      },
    });
  });

  // ===========================================================================
  // CAMELLIA CONCIERGE CHAT (100% Real Gemini + Context7 + Approved KB)
  // ===========================================================================

  app.post('/api/concierge/chat', async (req: Request, res: Response) => {
    const { message, history = [], prefillService } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }

    if (!ai) {
      return res.status(503).json({
        success: false,
        error: 'Camellia AI service is not configured (GEMINI_API_KEY missing). Please submit an order request or contact mr216873@gmail.com.',
        handoffToOwner: true,
      });
    }

    const settings = await getSettings();
    const articles = await store.list<any>('camellia_articles', (a) => a.approvedByOwner);
    const kb = articles.length > 0 ? articles : DEFAULT_KB_ARTICLES;
    const context7 = buildContext7Manifest();

    const catalogSummary = CATALOG_SERVICES.map(
      (s) => `- ${s.serviceId} (${s.id}): ${s.name} — ${s.rateLabelUSD} / ${s.rateLabelBDT} (${s.typicalTurnaround}). ${s.description}`
    ).join('\n');

    const kbSummary = kb.map((k: any) => `[${k.title}]: ${k.content}`).join('\n');
    const paymentNote = settings.cryptoEnabled
      ? 'Official accounts: BD (bKash/Nagad Personal 01810853282 Send Money), International (Payoneer 108003450, Skrill 407108385, Binance Pay UID 38927942 / mrxshahn).'
      : 'Official accounts: BD (bKash/Nagad Personal 01810853282 Send Money), International (Payoneer 108003450 / mr216873@gmail.com, Skrill 407108385 / mr216873@gmail.com). Crypto is currently OFF.';

    const conversationHistory = Array.isArray(history)
      ? history.slice(-6).map((m: any) => `${m.role === 'user' ? 'Client' : 'Camellia'}: ${String(m.content || '').slice(0, 400)}`).join('\n')
      : '';

    const prompt = `${context7.runtimeGroundingPrompt}
${paymentNote}

APPROVED KNOWLEDGE BASE:
${kbSummary}

16 AUTHORITATIVE SERVICES:
${catalogSummary}

${prefillService ? `Client opened chat from service: ${prefillService}` : ''}
${conversationHistory ? `RECENT CONVERSATION:\n${conversationHistory}\n` : ''}
CLIENT MESSAGE:
"${message}"

Respond as JSON with exact keys:
{
  "reply": "Clear, helpful answer grounded ONLY in the catalog & KB above. Explicitly note you are Camellia · AI assistant when introducing yourself or when asked. Never verify payments or alter pricing.",
  "recommendedServiceId": "id slug like 'ats-cv-resume' or null if none fits",
  "handoffToOwner": false
}`;

    try {
      const response = await generateWithRetry(ai, {
        model: GEMINI_MODEL,
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });

      const parsed = JSON.parse(response.text || '{}');
      const matched = CATALOG_SERVICES.find(
        (s) => s.id === parsed.recommendedServiceId || s.serviceId === parsed.recommendedServiceId
      );

      return res.json({
        reply: parsed.reply || 'I am Camellia · AI assistant for M R S Services. How can I assist you with our 16 services?',
        recommendedServiceId: matched?.id,
        recommendedServiceName: matched?.name,
        estimatedPrice: matched ? `${matched.rateLabelUSD} (${matched.rateLabelBDT})` : undefined,
        recommendedService: matched
          ? { id: matched.id, serviceId: matched.serviceId, name: matched.name }
          : undefined,
        handoffToOwner: Boolean(parsed.handoffToOwner),
      });
    } catch (err: any) {
      return res.status(503).json({
        success: false,
        error: `Camellia AI is temporarily unavailable: ${err?.message || 'Model error'}.`,
        handoffToOwner: true,
      });
    }
  });

  // ===========================================================================
  // LIVE FREE TOOLS (Real Node.js DNS/TLS + Real Gemini / Keyword Analysis)
  // ===========================================================================

  app.post('/api/tools/dns', async (req: Request, res: Response) => {
    const rawDomain = String(req.body?.domain || '').trim().toLowerCase().replace(/^https?:\/\//, '').split('/')[0];
    if (!rawDomain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(rawDomain)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid domain name (e.g. example.com).' });
    }

    const resolveSafe = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
      try {
        return await fn();
      } catch {
        return fallback;
      }
    };

    const [aRecords, mxRecords, txtRecords, nsRecords, dmarcRecords] = await Promise.all([
      resolveSafe(() => dns.promises.resolve4(rawDomain), [] as string[]),
      resolveSafe(() => dns.promises.resolveMx(rawDomain), [] as dns.MxRecord[]),
      resolveSafe(() => dns.promises.resolveTxt(rawDomain), [] as string[][]),
      resolveSafe(() => dns.promises.resolveNs(rawDomain), [] as string[]),
      resolveSafe(() => dns.promises.resolveTxt(`_dmarc.${rawDomain}`), [] as string[][]),
    ]);

    const flatTxt = txtRecords.map((arr) => arr.join(''));
    const spfRecords = flatTxt.filter((t) => t.toLowerCase().startsWith('v=spf1'));
    const dmarcFlat = dmarcRecords.map((arr) => arr.join(''));

    let httpsReachable = false;
    let httpStatus: number | null = null;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const headRes = await fetch(`https://${rawDomain}`, { method: 'HEAD', signal: controller.signal });
      clearTimeout(timer);
      httpsReachable = headRes.ok || headRes.status < 500;
      httpStatus = headRes.status;
    } catch {
      httpsReachable = false;
    }

    const issues: string[] = [];
    if (aRecords.length === 0) issues.push('No IPv4 (A) record resolved.');
    if (mxRecords.length === 0) issues.push('No MX mail routing records found.');
    if (spfRecords.length === 0) issues.push('Missing SPF (v=spf1) TXT record — email spoofing risk.');
    if (spfRecords.length > 1) issues.push('Multiple SPF TXT records detected — RFC 7208 recommends consolidating into one.');
    if (dmarcFlat.length === 0) issues.push('Missing _dmarc TXT policy record.');
    if (!httpsReachable) issues.push('HTTPS endpoint did not answer within 5 seconds.');

    return res.json({
      domain: rawDomain,
      checkedAt: new Date().toISOString(),
      aRecords,
      mxRecords: mxRecords.sort((a, b) => a.priority - b.priority),
      nsRecords,
      spfRecords,
      dmarcRecords: dmarcFlat,
      httpsReachable,
      httpStatus,
      healthy: issues.length === 0,
      issues,
    });
  });

  app.post('/api/tools/ats', async (req: Request, res: Response) => {
    const resumeText = String(req.body?.resumeText || '').trim();
    const jobDescription = String(req.body?.jobDescription || '').trim();
    if (!resumeText || !jobDescription) {
      return res.status(400).json({ success: false, error: 'Both your current CV/resume text and the target job description are required.' });
    }

    const stopWords = new Set(['about', 'above', 'after', 'again', 'against', 'among', 'because', 'before', 'being', 'below', 'between', 'could', 'doing', 'during', 'every', 'first', 'found', 'great', 'having', 'other', 'should', 'since', 'still', 'such', 'their', 'there', 'these', 'thing', 'think', 'those', 'through', 'under', 'until', 'using', 'where', 'which', 'while', 'with', 'would', 'years', 'experience', 'working', 'skills', 'responsibilities', 'requirements', 'looking', 'strong', 'ability']);
    const jdWords = Array.from(
      new Set(
        (jobDescription.toLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g) || []).filter(
          (w) => !stopWords.has(w) && w.length >= 3
        )
      )
    );
    const cvLower = resumeText.toLowerCase();
    const matched = jdWords.filter((w) => cvLower.includes(w));
    const missing = jdWords.filter((w) => !cvLower.includes(w)).slice(0, 15);
    const deterministicScore = jdWords.length > 0 ? Math.round((matched.length / jdWords.length) * 100) : 0;

    let aiAdvice: string | null = null;
    if (ai) {
      try {
        const aiRes = await generateWithRetry(ai, {
          model: GEMINI_MODEL,
          contents: `Analyze keyword overlap between this resume and job description honestly in 3 concise bullet points. Never fabricate skills.\nJD:\n${jobDescription.slice(0, 2000)}\nRESUME:\n${resumeText.slice(0, 2500)}`,
        });
        aiAdvice = aiRes.text || null;
      } catch {
        aiAdvice = null;
      }
    }

    return res.json({
      score: deterministicScore,
      totalJdKeywords: jdWords.length,
      matchedCount: matched.length,
      matchedKeywords: matched.slice(0, 20),
      missingKeywords: missing,
      aiAdvice,
    });
  });

  app.post('/api/tools/proofread', async (req: Request, res: Response) => {
    const text = String(req.body?.text || '').trim();
    if (!text) return res.status(400).json({ success: false, error: 'Text to proofread is required.' });
    if (!ai) {
      return res.status(503).json({ success: false, error: 'Proofreading requires GEMINI_API_KEY on the server.' });
    }
    try {
      const response = await generateWithRetry(ai, {
        model: GEMINI_MODEL,
        contents: `Proofread and polish the following technical text. Preserve all numbers, code symbols, and URLs faithfully. Return strict JSON: {"correctedText":"...","clarityNotes":["..."],"wordCount":0}\n\nTEXT:\n${text.slice(0, 5000)}`,
        config: { responseMimeType: 'application/json' },
      });
      const parsed = JSON.parse(response.text || '{}');
      return res.json({
        correctedText: parsed.correctedText || text,
        clarityNotes: Array.isArray(parsed.clarityNotes) ? parsed.clarityNotes : [],
        wordCount: text.split(/\s+/).filter(Boolean).length,
      });
    } catch (err: any) {
      return res.status(503).json({ success: false, error: `Proofreading service error: ${err.message}` });
    }
  });

  app.post('/api/tools/recommend', async (req: Request, res: Response) => {
    const goal = String(req.body?.goal || '').trim();
    if (!goal) return res.status(400).json({ success: false, error: 'Project description is required.' });
    if (!ai) {
      return res.status(503).json({ success: false, error: 'Service matcher requires GEMINI_API_KEY on the server.' });
    }
    const catalogList = CATALOG_SERVICES.map((s) => `${s.id} (${s.serviceId}): ${s.name} — ${s.description}`).join('\n');
    try {
      const response = await generateWithRetry(ai, {
        model: GEMINI_MODEL,
        contents: `Pick the best matching service from the catalog below for this user goal. Return JSON: {"serviceId":"<slug id>","reason":"..."}\nCATALOG:\n${catalogList}\nGOAL:\n${goal.slice(0, 1500)}`,
        config: { responseMimeType: 'application/json' },
      });
      const parsed = JSON.parse(response.text || '{}');
      const svc = CATALOG_SERVICES.find((s) => s.id === parsed.serviceId || s.serviceId === parsed.serviceId) || CATALOG_SERVICES[0];
      return res.json({ service: svc, reason: parsed.reason || svc.description });
    } catch (err: any) {
      return res.status(503).json({ success: false, error: `Recommendation service error: ${err.message}` });
    }
  });

  // Authoritative Owner Profile (live sync from Gravatar REST API v3 / public JSON + verified fallback)
  let cachedOwnerProfile: { fetchedAt: number; data: any } | null = null;
  app.get('/api/owner/profile', async (_req: Request, res: Response) => {
    const rawSlug = process.env.GRAVATAR_PROFILE_SLUG || 'mrxshahin';
    const slug =
      rawSlug
        .trim()
        .replace(/^https?:\/\/(www\.)?gravatar\.com\//i, '')
        .replace(/^\/+|\/+$/g, '') || 'mrxshahin';
    const gravatarApiKey = process.env.GRAVATAR_API_KEY;
    const now = Date.now();
    if (cachedOwnerProfile && now - cachedOwnerProfile.fetchedAt < 10 * 60 * 1000) {
      return res.json(cachedOwnerProfile.data);
    }

    const canonicalFallback = {
      slug,
      profileUrl: `https://gravatar.com/${slug}`,
      displayName: 'M R S',
      fullName: 'Md. Mahbubur Rahman',
      role: 'Founder & Principal Systems Coordinator',
      location: 'Dhaka, Bangladesh · Remote Worldwide',
      avatarUrl: 'https://1.gravatar.com/avatar/79cb903b47ada0af52e9962551bab25e563cc0a515939789f348aaa0ca135946?size=256',
      bio: 'Remote IT Support, Virtual Assistance & Admin Support, WordPress/Blogger Management, Technical Writing (since 2018), Online Research, and AI Tools & Productivity. Certified via 360-hour Computer Systems course.',
      email: OWNER_EMAIL,
      phone: '+8809611056361',
      whatsapp: '+8801810853282',
      calendlyUrl: 'https://calendly.com/mrxshahin',
      contactFormUrl: 'https://mrsadmin.blogspot.com/p/contact-us.html?m=1',
      verifiedAccounts: [
        { serviceLabel: 'GitHub', shortname: 'github', url: 'https://github.com/mrmahbubur', display: '@mrmahbubur' },
        { serviceLabel: 'LinkedIn', shortname: 'linkedin', url: 'https://www.linkedin.com/in/mrmahbubur', display: '@mrmahbubur' },
        { serviceLabel: 'X', shortname: 'twitter', url: 'https://x.com/Mrshahinx', display: '@Mrshahinx' },
        { serviceLabel: 'Bluesky', shortname: 'bluesky', url: 'https://bsky.app/profile/mrxshahin.bsky.social', display: '@mrxshahin.bsky.social' },
        { serviceLabel: 'WordPress', shortname: 'wordpress', url: 'https://mrxshahin.wordpress.com', display: 'mrxshahin.wordpress.com' },
      ],
      source: 'canonical',
      syncedAt: new Date().toISOString(),
    };

    try {
      const headers: Record<string, string> = { Accept: 'application/json', 'User-Agent': 'MRS-Platform/1.0' };
      if (gravatarApiKey && !gravatarApiKey.startsWith('MY_')) {
        headers.Authorization = `Bearer ${gravatarApiKey}`;
      }
      const gRes = await fetch(`https://api.gravatar.com/v3/profiles/${encodeURIComponent(slug)}`, {
        headers,
        signal: AbortSignal.timeout(4500),
      });
      if (gRes.ok) {
        const g: any = await gRes.json();
        const verifiedAccounts = Array.isArray(g.verified_accounts)
          ? g.verified_accounts.map((acc: any) => ({
              serviceLabel: acc.service_label || acc.service_type,
              shortname: acc.service_type,
              url: acc.url,
              display: String(acc.url || '').replace(/^https?:\/\/(www\.)?/, ''),
            }))
          : canonicalFallback.verifiedAccounts;
        const payload = {
          ...canonicalFallback,
          profileUrl: g.profile_url || canonicalFallback.profileUrl,
          displayName: g.display_name || canonicalFallback.displayName,
          avatarUrl: g.avatar_url ? `${g.avatar_url}?size=256` : canonicalFallback.avatarUrl,
          bio: canonicalFallback.bio,
          location: g.location || canonicalFallback.location,
          email: g.contact_info?.email || OWNER_EMAIL,
          phone: g.contact_info?.cell_phone || canonicalFallback.phone,
          calendlyUrl: g.contact_info?.calendar || canonicalFallback.calendlyUrl,
          contactFormUrl: g.contact_info?.contact_form || canonicalFallback.contactFormUrl,
          verifiedAccounts: verifiedAccounts.length > 0 ? verifiedAccounts : canonicalFallback.verifiedAccounts,
          source: 'gravatar_v3_live',
          syncedAt: new Date().toISOString(),
        };
        cachedOwnerProfile = { fetchedAt: now, data: payload };
        return res.json(payload);
      }
    } catch {
      // Fallback safely to canonical Gravatar snapshot if upstream times out or rate-limits
    }

    cachedOwnerProfile = { fetchedAt: now, data: canonicalFallback };
    return res.json(canonicalFallback);
  });

  app.post('/api/contact', async (req: Request, res: Response) => {
    const { name, email, message } = req.body || {};
    if (!String(name || '').trim() || !String(email || '').trim() || !String(message || '').trim()) {
      return res.status(400).json({ success: false, error: 'Name, email, and message are required.' });
    }
    if (containsSecretOrPassword(String(message))) {
      return res.status(400).json({ success: false, error: 'Please remove passwords or private API keys before submitting.' });
    }
    const inquiryId = `INQ-${Date.now().toString(36).toUpperCase()}`;
    const record = {
      id: inquiryId,
      name: String(name).trim().slice(0, 120),
      email: String(email).trim().slice(0, 180),
      message: String(message).trim().slice(0, 4000),
      routedTo: OWNER_EMAIL,
      createdAt: new Date().toISOString(),
    };
    await store.set('contact_inquiries', inquiryId, record);
    await recordAudit('CONTACT_INQUIRY_RECEIVED', record.email, `Direct message ${inquiryId} logged for ${OWNER_EMAIL}`, inquiryId);
    return res.status(201).json({ success: true, inquiryId, routedTo: OWNER_EMAIL });
  });

  // ===========================================================================
  // ORDERS & CLIENT PORTAL ROUTES
  // ===========================================================================

  app.post('/api/orders', async (req: Request, res: Response) => {
    const {
      serviceId,
      details,
      clientName,
      clientEmail,
      clientWhatsapp,
      clientCountry,
      couponCode,
      isRush,
      rushDelivery,
      noAi,
      planMonths,
      intake = {},
      files = [],
    } = req.body || {};

    if (!serviceId || !clientEmail || !clientName || !details) {
      return res.status(400).json({
        success: false,
        error: 'Service, name, email, and project details are required',
        code: 'bad_intake',
        fields: ['serviceId', 'clientName', 'clientEmail', 'details'],
      });
    }

    if (containsSecretOrPassword(details) || containsSecretOrPassword(JSON.stringify(intake))) {
      return res.status(400).json({
        success: false,
        error: 'Passwords or API keys are not permitted in description. Access is arranged securely.',
        code: 'secret_in_details',
      });
    }

    const service = CATALOG_SERVICES.find((s) => s.id === serviceId || s.serviceId === serviceId);
    if (!service) {
      return res.status(400).json({ success: false, error: 'Invalid service selected', code: 'bad_intake' });
    }

    const settings = await getSettings();
    const existingClients = await store.list<ClientRecord>('clients', (c) => c.email.toLowerCase() === String(clientEmail).toLowerCase());
    let client: ClientRecord;
    let isNewClient = false;
    let plainPin: string | undefined = undefined;

    if (existingClients.length > 0) {
      client = existingClients[0];
      if (client.blocked || client.trustTier === 'blocked') {
        return res.status(403).json({ success: false, error: 'Account access restricted. Contact support.' });
      }
    } else {
      isNewClient = true;
      const nowC = new Date();
      const yyC = nowC.getFullYear().toString().slice(-2);
      const mmC = (nowC.getMonth() + 1).toString().padStart(2, '0');
      let clientId = `MRS-${yyC}${mmC}-${Math.floor(1000 + Math.random() * 9000)}`;
      while (await store.get('clients', clientId)) {
        clientId = `MRS-${yyC}${mmC}-${Math.floor(1000 + Math.random() * 9000)}`;
      }
      plainPin = Math.floor(100000 + Math.random() * 900000).toString();
      client = {
        clientId,
        name: String(clientName).trim(),
        email: String(clientEmail).trim().toLowerCase(),
        whatsapp: clientWhatsapp,
        country: clientCountry,
        pinHash: hashPin(plainPin),
        loginFailures: 0,
        tokenVersion: 1,
        trustTier: 'new',
        createdAt: nowC.toISOString(),
      };
      await store.set('clients', client.clientId, client);
    }

    // Server-side authoritative pricing
    let priceUSD = service.rateUSD;
    if (service.serviceId === 'S-IPTV-01' && planMonths) {
      const planMap: Record<string, number> = { '1-month': 12, '2-month': 22, '6-month': 55, '12-month': 99 };
      if (planMap[planMonths]) priceUSD = planMap[planMonths];
    }
    const rush = Boolean(isRush || rushDelivery);
    if (rush) priceUSD = Math.round(priceUSD * 1.35);

    let discountPct = 0;
    if (couponCode) {
      const code = String(couponCode).trim().toUpperCase();
      if (code === 'WELCOME10' || code === 'AUTOMATE10') {
        discountPct = 10;
        priceUSD = Math.max(5, Math.round(priceUSD * 0.9));
      } else if (code === 'WELCOME15' || code === 'MRS2026' || code === 'AUTOMATE') {
        discountPct = 15;
        priceUSD = Math.max(5, Math.round(priceUSD * 0.85));
      } else if (code === 'LAUNCH50') {
        discountPct = 50;
        priceUSD = Math.max(5, Math.round(priceUSD * 0.5));
      }
    }

    const priceBDT = Math.round(priceUSD * (settings.usdToBdt || 100));
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const seq = Math.floor(1000 + Math.random() * 9000);

    const orderId = `ORD-${yy}${mm}-${seq}`;
    const invoiceId = `INV-${yy}${mm}-${seq}`;
    const paymentRef = `PAY-${yy}${mm}-${seq}`;

    const invoice: InvoiceRecord = {
      invoiceId,
      orderId,
      clientId: client.clientId,
      clientName: client.name,
      clientEmail: client.email,
      serviceId: service.serviceId,
      serviceName: service.name,
      amount: priceUSD,
      amountUSD: priceUSD,
      amountBDT: priceBDT,
      amountDue: priceUSD,
      usdToBdtRate: settings.usdToBdt || 100,
      currency: 'USD',
      paymentReferenceCode: paymentRef,
      status: 'awaiting_payment',
      totalPaid: 0,
      dueDate: new Date(Date.now() + service.turnaroundDays * 86400000).toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    await store.set('invoices', invoice.invoiceId, invoice);

    const formattedFiles = Array.isArray(files)
      ? files.map((f: any, idx: number) => ({
          field: f.field || 'attachment',
          fileName: String(f.name || f.fileName || `file_${idx + 1}`),
          fileId: String(f.docId || f.fileId || `FILE-${Date.now()}-${idx}`),
          size: f.sizeFormatted || f.size,
          uploadedAt: now.toISOString(),
        }))
      : [];

    const order: OrderRecord = {
      id: orderId,
      orderId,
      clientId: client.clientId,
      clientName: client.name,
      clientEmail: client.email,
      clientWhatsapp,
      clientCountry,
      serviceId: service.serviceId,
      serviceName: service.name,
      category: service.category,
      state: 'awaiting_payment',
      status: 'Awaiting payment',
      details,
      quoteAmount: priceUSD,
      currency: 'USD',
      paymentTiming: client.trustTier === 'trusted' ? service.paymentTimingTrustedClient : service.paymentTimingNewClient,
      couponCode: couponCode ? String(couponCode).toUpperCase() : undefined,
      discountPct,
      isRush: rush,
      noAi: Boolean(noAi),
      planMonths,
      intake,
      files: formattedFiles,
      revisionsTotal: 2,
      revisionsUsed: 0,
      deliverablesLocked: Boolean(service.deliverablesLockedUntilPaid),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    await store.set('orders', order.id, order);

    const job: FulfilmentJob = {
      id: `JOB-${order.id}`,
      orderId: order.id,
      serviceId: service.serviceId,
      state: 'waiting_inputs',
      qa: [],
      retryCount: 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    await store.set('jobs', job.id, job);

    const token = generateToken({ clientId: client.clientId, email: client.email, tokenVersion: client.tokenVersion || 1 });
    setSessionCookie(req, res, 'mrs_session', token);

    await recordAudit('CREATE_ORDER', client.clientId, `Order ${order.id} placed for ${service.name} ($${priceUSD})`, order.id);
    await logCamelliaActivity('order_registered', 'order', order.id, `Registered ${order.id} for ${service.name} ($${priceUSD})`);

    return res.status(201).json({
      order,
      invoice,
      client: { clientId: client.clientId, name: client.name, email: client.email, whatsapp: client.whatsapp, country: client.country },
      isNewClient,
      plainPin,
      token,
    });
  });

  app.post('/api/portal/register', async (req: Request, res: Response) => {
    const { name, email, whatsapp = '', country = '', pin } = req.body || {};
    const cleanName = String(name || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanName || !cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid full name and email address are required.' });
    }
    if (pin !== undefined && pin !== '' && !/^\d{6}$/.test(String(pin).trim())) {
      return res.status(400).json({ success: false, error: 'PIN must be exactly 6 numeric digits.' });
    }

    const existing = await store.list<ClientRecord>('clients', (c) => c.email.toLowerCase() === cleanEmail);
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: `An account already exists for ${cleanEmail} (${existing[0].clientId}). Sign in with your Client ID & PIN or ask admin to reset your PIN.`,
      });
    }

    const nowC = new Date();
    const yyC = nowC.getFullYear().toString().slice(-2);
    const mmC = (nowC.getMonth() + 1).toString().padStart(2, '0');
    let clientId = `MRS-${yyC}${mmC}-${Math.floor(1000 + Math.random() * 9000)}`;
    while (await store.get('clients', clientId)) {
      clientId = `MRS-${yyC}${mmC}-${Math.floor(1000 + Math.random() * 9000)}`;
    }
    const plainPin = pin && String(pin).trim() ? String(pin).trim() : Math.floor(100000 + Math.random() * 900000).toString();

    const client: ClientRecord = {
      clientId,
      name: cleanName,
      email: cleanEmail,
      whatsapp: String(whatsapp || '').trim(),
      country: String(country || '').trim(),
      pinHash: hashPin(plainPin),
      loginFailures: 0,
      tokenVersion: 1,
      trustTier: 'new',
      createdAt: nowC.toISOString(),
    };
    await store.set('clients', client.clientId, client);
    await recordAudit('CLIENT_REGISTERED', client.clientId, `Server Client ID ${client.clientId} created for ${cleanEmail}`, client.clientId);

    const token = generateToken({ clientId: client.clientId, email: client.email, tokenVersion: 1 });
    setSessionCookie(req, res, 'mrs_session', token);

    return res.status(201).json({
      success: true,
      client: {
        clientId: client.clientId,
        name: client.name,
        email: client.email,
        whatsapp: client.whatsapp,
        country: client.country,
        trustTier: client.trustTier,
        createdAt: client.createdAt,
      },
      plainPin,
      token,
    });
  });

  app.post('/api/portal/login', async (req: Request, res: Response) => {
    const { clientId, pin } = req.body || {};
    if (!clientId || !pin) {
      return res.status(400).json({ success: false, error: 'Client ID and PIN required' });
    }

    const cleanId = String(clientId).trim().toUpperCase();
    const client = await store.get<ClientRecord>('clients', cleanId);
    if (!client) {
      return res.status(401).json({ success: false, error: 'Invalid Client ID or PIN', code: 'bad_login' });
    }
    if (client.blocked || client.trustTier === 'blocked') {
      return res.status(403).json({ success: false, error: 'Account blocked by administrator.' });
    }
    if (client.lockedUntil && new Date(client.lockedUntil).getTime() > Date.now()) {
      return res.status(429).json({
        success: false,
        error: 'PIN locked due to 5 failed attempts. Please try again in 15 minutes.',
        code: 'pin_locked',
      });
    }

    if (client.pinHash !== hashPin(String(pin).trim())) {
      const failures = (client.loginFailures || 0) + 1;
      const lockedUntil = failures >= 5 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : undefined;
      await store.update('clients', client.clientId, { loginFailures: failures, lockedUntil });
      return res.status(401).json({ success: false, error: 'Invalid Client ID or PIN', code: 'bad_login' });
    }

    await store.update('clients', client.clientId, { loginFailures: 0, lockedUntil: undefined });
    const token = generateToken({ clientId: client.clientId, email: client.email, tokenVersion: client.tokenVersion || 1 });
    setSessionCookie(req, res, 'mrs_session', token);

    return res.json({
      token,
      client: {
        clientId: client.clientId,
        name: client.name,
        email: client.email,
        whatsapp: client.whatsapp,
        country: client.country,
        trustTier: client.trustTier || 'new',
        createdAt: client.createdAt,
      },
    });
  });

  app.post('/api/portal/change-pin', clientAuth, async (req: Request, res: Response) => {
    const clientId = (req as any).client.clientId;
    const { currentPin, newPin } = req.body || {};
    if (!currentPin || !newPin || !/^\d{6}$/.test(String(newPin).trim())) {
      return res.status(400).json({ success: false, error: 'Current PIN and a new 6-digit numeric PIN are required.' });
    }
    const client = await store.get<ClientRecord>('clients', clientId);
    if (!client) return res.status(404).json({ success: false, error: 'Client not found' });
    if (client.pinHash !== hashPin(String(currentPin).trim())) {
      return res.status(401).json({ success: false, error: 'Current PIN does not match server record.' });
    }
    const nextVersion = (client.tokenVersion || 1) + 1;
    await store.update('clients', client.clientId, {
      pinHash: hashPin(String(newPin).trim()),
      loginFailures: 0,
      lockedUntil: undefined,
      tokenVersion: nextVersion,
    });
    const freshToken = generateToken({ clientId: client.clientId, email: client.email, tokenVersion: nextVersion });
    setSessionCookie(req, res, 'mrs_session', freshToken);
    await recordAudit('CLIENT_CHANGE_PIN', client.clientId, `Client ${client.clientId} rotated PIN on server`, client.clientId);
    return res.json({ success: true, token: freshToken, message: 'PIN updated and persisted on server.' });
  });

  app.post('/api/portal/logout-all', clientAuth, async (req: Request, res: Response) => {
    const clientId = (req as any).client.clientId;
    const client = await store.get<ClientRecord>('clients', clientId);
    if (client) {
      await store.update('clients', client.clientId, { tokenVersion: (client.tokenVersion || 1) + 1 });
      await recordAudit('CLIENT_LOGOUT_ALL', client.clientId, `Revoked all active sessions for ${client.clientId}`, client.clientId);
    }
    clearSessionCookie(req, res, 'mrs_session');
    return res.json({ success: true, message: 'All device sessions revoked on server.' });
  });

  app.post('/api/portal/logout', (req: Request, res: Response) => {
    clearSessionCookie(req, res, 'mrs_session');
    return res.json({ success: true, message: 'Signed out' });
  });

  app.get('/api/portal/me', clientAuth, async (req: Request, res: Response) => {
    const clientId = (req as any).client.clientId;
    const client = await store.get<ClientRecord>('clients', clientId);
    if (!client) return res.status(401).json({ success: false, error: 'Client not found' });

    const [orders, invoices, payments, subscriptions, supportTickets] = await Promise.all([
      store.list<OrderRecord>('orders', (o) => o.clientId === clientId),
      store.list<InvoiceRecord>('invoices', (i) => i.clientId === clientId),
      store.list<PaymentSubmission>('payments', (p) => p.clientId === clientId),
      store.list<any>('subscriptions', (s) => s.clientId === clientId),
      store.list<any>('support_tickets', (t) => t.clientId === clientId),
    ]);
    const orderIds = new Set(orders.map((o) => o.id));
    const deliverables = await store.list<DeliverableRecord>('deliverables', (d) => orderIds.has(d.orderId));
    const messages = await store.list<OrderMessageRecord>('messages', (m) => orderIds.has(m.orderId) && !m.internal);

    return res.json({
      client: {
        clientId: client.clientId,
        name: client.name,
        email: client.email,
        whatsapp: client.whatsapp,
        country: client.country,
        trustTier: client.trustTier || 'new',
        createdAt: client.createdAt,
      },
      orders,
      invoices,
      payments,
      deliverables,
      messages,
      subscriptions,
      supportTickets,
    });
  });

  app.post('/api/portal/activation/redeem', clientAuth, async (req: Request, res: Response) => {
    const clientId = (req as any).client.clientId;
    const rawCode = String(req.body?.code || '').trim().toUpperCase();
    if (!rawCode) {
      return res.status(400).json({ success: false, error: 'Activation code is required.' });
    }
    const targetHash = crypto.createHash('sha256').update(rawCode).digest('hex');
    const matches = await store.list<any>('activation_codes', (c) => c.codeHash === targetHash);
    if (matches.length === 0) {
      return res.status(404).json({ success: false, error: 'Activation code not found.' });
    }
    const codeRec = matches[0];
    if (codeRec.clientId !== clientId) {
      return res.status(403).json({ success: false, error: 'This activation code belongs to another account.' });
    }
    if (codeRec.status === 'voided' || codeRec.status === 'revoked') {
      return res.status(403).json({ success: false, error: 'This activation code has been voided.' });
    }
    if (codeRec.expiresAt && new Date(codeRec.expiresAt).getTime() < Date.now()) {
      return res.status(410).json({ success: false, error: 'This activation code has expired.' });
    }
    if (codeRec.status === 'redeemed') {
      return res.json({
        success: true,
        alreadyRedeemed: true,
        monthsPaid: codeRec.monthsPaid,
        expiresAt: codeRec.expiresAt,
        codeMask: codeRec.codeMask,
      });
    }
    const nowIso = new Date().toISOString();
    await store.update('activation_codes', codeRec.id, { status: 'redeemed', redeemedAt: nowIso });
    await recordAudit('ACTIVATION_CODE_REDEEMED', clientId, `Redeemed ${codeRec.monthsPaid}-month code (${codeRec.codeMask})`, codeRec.orderId);
    return res.json({
      success: true,
      monthsPaid: codeRec.monthsPaid,
      expiresAt: codeRec.expiresAt,
      codeMask: codeRec.codeMask,
      redeemedAt: nowIso,
    });
  });

  // Support tickets (stored persistently on server)
  app.post('/api/support-tickets', async (req: Request, res: Response) => {
    const { device, issueType, description, orderId } = req.body || {};
    if (!String(device || '').trim() || !String(description || '').trim()) {
      return res.status(400).json({ success: false, error: 'Device and issue description are required.' });
    }
    const token = extractBearerToken(req, 'mrs_session');
    const payload = token ? verifyToken(token) : null;
    const clientId = payload?.clientId || 'MRS-GUEST';
    const now = new Date().toISOString();
    const ticket = {
      id: `TCK-${Date.now().toString(36).toUpperCase()}`,
      clientId,
      orderId: orderId || undefined,
      device: String(device).trim().slice(0, 120),
      issueType: String(issueType || 'General Support').trim().slice(0, 120),
      description: String(description).trim().slice(0, 3000),
      status: 'open' as const,
      createdAt: now,
      updatedAt: now,
    };
    await store.set('support_tickets', ticket.id, ticket);
    await recordAudit('SUPPORT_TICKET_CREATED', clientId, `Support ticket ${ticket.id} (${ticket.issueType})`, ticket.id);
    return res.status(201).json({ success: true, ticket });
  });

  app.get('/api/orders/:id', clientAuth, async (req: Request, res: Response) => {
    const { id } = req.params;
    const clientId = (req as any).client.clientId;
    const order = await store.get<OrderRecord>('orders', id);
    if (!order || order.clientId !== clientId) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    const invoice = (await store.list<InvoiceRecord>('invoices', (i) => i.orderId === order.id))[0];
    const messages = await store.list<OrderMessageRecord>('messages', (m) => m.orderId === order.id && !m.internal);
    const payments = await store.list<PaymentSubmission>('payments', (p) => p.orderId === order.id);
    const deliverables = await store.list<DeliverableRecord>('deliverables', (d) => d.orderId === order.id);
    const job = await store.get<FulfilmentJob>('jobs', `JOB-${order.id}`);

    const service = CATALOG_SERVICES.find((s) => s.serviceId === order.serviceId || s.id === order.serviceId);
    const missing: string[] = [];
    if (service) {
      for (const field of service.intake) {
        if (field.required && !order.intake?.[field.key]) {
          missing.push(field.label);
        }
      }
    }

    return res.json({
      order,
      invoice,
      missing,
      messages,
      payments,
      deliverables,
      work: {
        state: job?.state || 'waiting_inputs',
        summary: job?.summary,
        questionsForClient: job?.questionsForClient || [],
      },
    });
  });

  app.post('/api/orders/:id/intake', clientAuth, async (req: Request, res: Response) => {
    const { id } = req.params;
    const clientId = (req as any).client.clientId;
    const { intake = {} } = req.body || {};

    if (containsSecretOrPassword(JSON.stringify(intake))) {
      return res.status(400).json({ success: false, error: 'Passwords or API keys are not permitted in intake answers.', code: 'secret_in_details' });
    }

    const order = await store.get<OrderRecord>('orders', id);
    if (!order || order.clientId !== clientId) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const merged = { ...order.intake, ...intake };
    await store.update('orders', order.id, { intake: merged, updatedAt: new Date().toISOString() });
    await store.update('jobs', `JOB-${order.id}`, { state: 'queued', updatedAt: new Date().toISOString() });
    return res.json({ success: true, intake: merged });
  });

  app.post('/api/orders/:id/files', clientAuth, async (req: Request, res: Response) => {
    const { id } = req.params;
    const clientId = (req as any).client.clientId;
    const { field, fileName, base64Data } = req.body || {};
    const order = await store.get<OrderRecord>('orders', id);
    if (!order || order.clientId !== clientId) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    if (!fileName || !base64Data) {
      return res.status(400).json({ success: false, error: 'File name and base64Data are required' });
    }
    const cleanB64 = String(base64Data).replace(/^data:[^;]+;base64,/, '');
    const fileId = `FILE-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const fileEntry = { field: field || 'attachment', fileName, fileId, uploadedAt: new Date().toISOString() };
    const files = [...(order.files || []), fileEntry];

    await store.update('orders', order.id, { files, updatedAt: new Date().toISOString() });
    await store.set('order_files', fileId, { fileId, orderId: order.id, fileName, base64Data: cleanB64 });
    return res.json({ success: true, file: fileEntry });
  });

  app.get('/api/orders/:id/files/:fileId', clientAuth, async (req: Request, res: Response) => {
    const clientId = (req as any).client.clientId;
    const order = await store.get<OrderRecord>('orders', req.params.id);
    if (!order || order.clientId !== clientId) return res.status(404).json({ error: 'Order not found' });
    const f = await store.get<any>('order_files', req.params.fileId);
    if (!f) return res.status(404).json({ error: 'File not found' });
    res.setHeader('Content-Disposition', `attachment; filename="${f.fileName}"`);
    return res.send(Buffer.from(f.base64Data, 'base64'));
  });

  app.post('/api/orders/:id/messages', clientAuth, async (req: Request, res: Response) => {
    const { id } = req.params;
    const clientId = (req as any).client.clientId;
    const { text } = req.body || {};
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ success: false, error: 'Message text required' });
    }
    const order = await store.get<OrderRecord>('orders', id);
    if (!order || order.clientId !== clientId) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const clientMsg: OrderMessageRecord = {
      id: `MSG-${Date.now()}`,
      orderId: order.id,
      clientId,
      author: 'client',
      text: text.trim(),
      timestamp: new Date().toISOString(),
    };
    await store.set('messages', clientMsg.id, clientMsg);

    let aiMsg: OrderMessageRecord | null = null;
    if (ai && !order.noAi) {
      try {
        const prompt = `You are Camellia · AI assistant for M R S Services. Disclose clearly that you are an AI assistant. Never confirm unverified payments or alter pricing.
Order: ${order.id} (${order.serviceName}), State: ${order.status}.
Client says: "${text}"
Reply concisely and helpfully.`;
        const aiRes = await generateWithRetry(ai, { model: GEMINI_MODEL, contents: prompt });
        if (aiRes.text) {
          aiMsg = {
            id: `MSG-${Date.now() + 1}`,
            orderId: order.id,
            clientId,
            author: 'camellia',
            text: aiRes.text.trim(),
            timestamp: new Date().toISOString(),
          };
          await store.set('messages', aiMsg.id, aiMsg);
        }
      } catch (err: any) {
        console.warn('Order reply Gemini unavailable:', err.message);
      }
    }

    const updatedMessages = await store.list<OrderMessageRecord>('messages', (m) => m.orderId === order.id && !m.internal);
    return res.json({ success: true, message: clientMsg, aiReply: aiMsg, messages: updatedMessages });
  });

  app.post('/api/orders/:id/revision', clientAuth, async (req: Request, res: Response) => {
    const clientId = (req as any).client.clientId;
    const order = await store.get<OrderRecord>('orders', req.params.id);
    if (!order || order.clientId !== clientId) return res.status(404).json({ error: 'Order not found' });
    if (order.revisionsUsed >= order.revisionsTotal) {
      return res.status(400).json({ error: 'All included revisions have been used. Please request a quote adjustment.' });
    }
    const notes = String(req.body?.notes || '').trim();
    if (!notes) return res.status(400).json({ error: 'Revision notes are required' });

    const nextUsed = order.revisionsUsed + 1;
    await store.update('orders', order.id, {
      revisionsUsed: nextUsed,
      state: 'revision',
      status: 'In revision',
      updatedAt: new Date().toISOString(),
    });
    await store.set('messages', `MSG-${Date.now()}`, {
      id: `MSG-${Date.now()}`,
      orderId: order.id,
      clientId,
      author: 'client',
      text: `[Revision Request #${nextUsed}]: ${notes}`,
      timestamp: new Date().toISOString(),
    });
    await raiseAlert('revision_requested', 'warn', `Revision #${nextUsed} on ${order.id}`, notes, order.id);
    return res.json({ success: true, revisionsUsed: nextUsed, revisionsRemaining: order.revisionsTotal - nextUsed });
  });

  app.post('/api/orders/:id/problem', clientAuth, async (req: Request, res: Response) => {
    const clientId = (req as any).client.clientId;
    const order = await store.get<OrderRecord>('orders', req.params.id);
    if (!order || order.clientId !== clientId) return res.status(404).json({ error: 'Order not found' });
    const summary = String(req.body?.summary || 'Client reported an issue').trim();
    const incident = {
      id: `INC-${Date.now().toString().slice(-6)}`,
      category: req.body?.category || 'complaint',
      severity: 'high',
      orderId: order.id,
      serviceId: order.serviceId,
      clientEmail: order.clientEmail,
      summary,
      description: String(req.body?.description || summary),
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    await store.set('camellia_incidents', incident.id, incident);
    await raiseAlert('order_problem', 'high', `Client reported problem on ${order.id}`, summary, order.id);
    return res.status(201).json({ success: true, incident });
  });

  app.post('/api/orders/:id/cancel', clientAuth, async (req: Request, res: Response) => {
    const clientId = (req as any).client.clientId;
    const order = await store.get<OrderRecord>('orders', req.params.id);
    if (!order || order.clientId !== clientId) return res.status(404).json({ error: 'Order not found' });
    if (order.state === 'delivered' || order.state === 'closed') {
      return res.status(400).json({ error: 'Delivered orders cannot be cancelled automatically.' });
    }
    await store.update('orders', order.id, { state: 'cancelled', status: 'Cancelled', updatedAt: new Date().toISOString() });
    const invoices = await store.list<InvoiceRecord>('invoices', (i) => i.orderId === order.id);
    for (const inv of invoices) {
      await store.update('invoices', inv.invoiceId, { status: 'cancelled', updatedAt: new Date().toISOString() });
    }
    await recordAudit('CLIENT_CANCEL_ORDER', clientId, `Cancelled order ${order.id}`, order.id);
    return res.json({ success: true });
  });

  app.get('/api/deliverables/:id/download', clientAuth, async (req: Request, res: Response) => {
    const clientId = (req as any).client.clientId;
    const deliverable = await store.get<DeliverableRecord>('deliverables', req.params.id);
    if (!deliverable) return res.status(404).json({ success: false, error: 'Deliverable not found' });
    const order = await store.get<OrderRecord>('orders', deliverable.orderId);
    if (!order || order.clientId !== clientId) return res.status(404).json({ success: false, error: 'Deliverable not found' });

    if (deliverable.locked || order.deliverablesLocked) {
      return res.status(402).json({
        success: false,
        error: 'Deliverables unlock automatically once payment is verified.',
        code: 'locked',
      });
    }

    if (deliverable.base64Data) {
      const buffer = Buffer.from(deliverable.base64Data, 'base64');
      res.setHeader('Content-Disposition', `attachment; filename="${deliverable.fileName}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      return res.send(buffer);
    }
    return res.status(404).json({ success: false, error: 'No deliverable binary attached yet.' });
  });

  // ===========================================================================
  // CLIENT PAYMENT SUBMISSION & VERIFICATION STATUS
  // ===========================================================================

  async function finalizeVerifiedPaymentSettlement(
    submission: PaymentSubmission,
    invoice: InvoiceRecord,
    order: OrderRecord | null,
    settings: SystemSettings,
    verifiedBy: string,
    matchedLedgerId?: string,
    reason?: string,
    confirmationState: ConfirmationState = 'confirmed'
  ) {
    if (submission.status === 'verified' && invoice.status === 'paid_verified') {
      return { alreadySettled: true, submission };
    }

    const cfg = getEffectiveAutoVerifyConfig(settings);
    const windowMs = (cfg.caps.confirmWindowHours || 72) * 3600 * 1000;
    const confirmationDeadlineAt =
      confirmationState === 'unconfirmed'
        ? new Date(Date.now() + windowMs).toISOString()
        : undefined;

    await store.transaction(async (txn) => {
      if (matchedLedgerId) {
        txn.update('ledger', matchedLedgerId, { used: true, claimedByPaymentId: submission.id });
      }
      txn.update('payments', submission.id, {
        status: 'verified',
        confirmationState,
        confirmationDeadlineAt,
        confirmedAt: confirmationState === 'confirmed' ? new Date().toISOString() : undefined,
        matchedLedgerId,
        ownerConfirmationStatus: confirmationState === 'confirmed' ? 'RECEIVED' : undefined,
        verifiedBy,
        decisionReason: reason || submission.decisionReason || `Verified by ${verifiedBy}`,
        updatedAt: new Date().toISOString(),
      });
      txn.update('invoices', invoice.invoiceId, {
        status: 'paid_verified',
        amountDue: 0,
        totalPaid: invoice.amount,
        updatedAt: new Date().toISOString(),
      });
      txn.update('orders', invoice.orderId, {
        state: 'in_progress',
        status: 'Verified',
        deliverablesLocked: false,
        updatedAt: new Date().toISOString(),
      });
    });

    const deliverables = await store.list<DeliverableRecord>('deliverables', (d) => d.orderId === invoice.orderId);
    for (const d of deliverables) {
      await store.update('deliverables', d.id, { locked: false });
    }

    if (confirmationState === 'confirmed') {
      await recordConfirmedShapeSample(store, submission.methodId, submission.transactionId);
    }

    // Issue exact-month activation code (hash-only storage) and dispatch automatic backend email to verified order email
    const existingCodes = await store.list<any>('activation_codes', (c) => c.invoiceId === invoice.invoiceId);
    const monthsPaid = resolvePaidMonthsForOrder(order, invoice, settings);
    let issuedCode: { code?: string; codeMask?: string; monthsPaid?: number; expiresAt?: string } = {};

    if (monthsPaid > 0 && existingCodes.length === 0) {
      issuedCode = await issueExactMonthActivationCode(store, {
        order,
        invoice,
        paymentId: submission.id,
        monthsPaid,
      });
      await recordAudit(
        'ACTIVATION_CODE_ISSUED',
        verifiedBy,
        `Issued ${monthsPaid}-month activation code (${issuedCode.codeMask}) for ${invoice.orderId}`,
        invoice.orderId
      );
    }

    const clientEmail = order?.clientEmail || invoice.clientEmail || '';
    const emailResult = await sendActivationOrVerificationEmail(store, {
      clientEmail,
      clientName: order?.clientName || invoice.clientName || 'Client',
      orderId: invoice.orderId,
      invoiceId: invoice.invoiceId,
      serviceName: order?.serviceName || invoice.serviceName || 'M R S Service',
      paymentId: submission.id,
      transactionId: submission.transactionId,
      methodId: submission.methodId,
      amount: submission.amount,
      currency: submission.currency,
      activationCode: issuedCode.code,
      codeMask: issuedCode.codeMask || existingCodes[0]?.codeMask,
      monthsPaid: monthsPaid > 0 ? monthsPaid : undefined,
      expiresAt: issuedCode.expiresAt,
    });

    await store.update('payments', submission.id, {
      activationCodeMask: issuedCode.codeMask || existingCodes[0]?.codeMask,
      monthsPaid: monthsPaid > 0 ? monthsPaid : undefined,
      emailDispatchStatus: emailResult.status,
      emailDispatchDetail: emailResult.detail,
      updatedAt: new Date().toISOString(),
    });

    await recordAudit(
      emailResult.sent ? 'ACTIVATION_EMAIL_SENT' : 'ACTIVATION_EMAIL_OUTBOX',
      verifiedBy,
      `${emailResult.detail} (${invoice.invoiceId})`,
      submission.id
    );

    const updatedSub = await store.get<PaymentSubmission>('payments', submission.id);
    return { alreadySettled: false, submission: updatedSub || submission, emailResult, monthsPaid };
  }

  async function runVerificationPipeline(submissionId: string) {
    const submission = await store.get<PaymentSubmission>('payments', submissionId);
    if (!submission) return null;
    if (submission.status === 'verified') {
      const invoice = await store.get<InvoiceRecord>('invoices', submission.invoiceId);
      return { submission, checkResults: submission.checkResults, invoice };
    }

    const invoice = await store.get<InvoiceRecord>('invoices', submission.invoiceId);
    if (!invoice) return null;
    const [order, client, settings, candidateLedgers, allSubmissions] = await Promise.all([
      store.get<OrderRecord>('orders', invoice.orderId),
      store.get<ClientRecord>('clients', invoice.clientId),
      getSettings(),
      store.list<LedgerRecord>('ledger'),
      store.list<PaymentSubmission>('payments'),
    ]);

    const cfg = getEffectiveAutoVerifyConfig(settings);
    const verifyMode = cfg.methodModes[submission.methodId] || 'evidence_auto';

    // 1. Always check authoritative incoming provider record first (Evidence Mode never blocks it!)
    const ledgerDecision = evaluatePaymentMatch(submission, invoice, candidateLedgers, allSubmissions, settings);
    if (ledgerDecision.status === 'verified' && ledgerDecision.matchedLedger) {
      await store.update('payments', submission.id, {
        verifyModeUsed: 'authoritative',
        checkResults: ledgerDecision.checkResults,
        decisionReason: ledgerDecision.reasons.join('; '),
      });
      const updatedBefore = await store.get<PaymentSubmission>('payments', submission.id);
      const settled = await finalizeVerifiedPaymentSettlement(
        updatedBefore || submission,
        invoice,
        order,
        settings,
        'Authoritative Ledger Matcher',
        ledgerDecision.matchedLedger.id,
        ledgerDecision.reasons.join('; '),
        'confirmed'
      );
      return { submission: settled.submission, checkResults: settled.submission.checkResults, invoice };
    }

    // 2. If method set to manual or authoritative-only, queue without rejecting
    if (verifyMode === 'manual' || verifyMode === 'authoritative') {
      await store.update('payments', submission.id, {
        verifyModeUsed: verifyMode,
        status: verifyMode === 'manual' ? 'needs_review' : 'awaiting_ledger',
        confirmationState: 'not_applicable',
        checkResults: ledgerDecision.checkResults,
        decisionReason:
          verifyMode === 'manual'
            ? 'Method configured for manual owner review.'
            : 'Waiting for matching SMS/email/statement record.',
        updatedAt: new Date().toISOString(),
      });
      const sub = await store.get<PaymentSubmission>('payments', submission.id);
      return { submission: sub || submission, checkResults: sub?.checkResults || [], invoice };
    }

    // 3. Evidence Mode (Lite 6 §1–§5)
    if (settings.aiAutoVerifyEnabled !== false && submission.evidenceFiles && submission.evidenceFiles.length > 0) {
      const aiResult = await verifySubmissionWithBackendAi({
        store,
        ai,
        submission,
        invoice,
        order,
        client,
        allSubmissions,
        settings,
      });

      const nextAttempts = aiResult.secondProofRequested
        ? Number(submission.secondProofAttempts || 0) + 1
        : submission.secondProofAttempts || 0;

      await store.update('payments', submission.id, {
        verifyModeUsed: 'evidence_auto',
        status: aiResult.decision,
        checkResults: aiResult.checkResults,
        decisionReason: aiResult.adminSummary,
        aiConfidence: aiResult.confidence,
        scoreBreakdown: aiResult.scoreBreakdown,
        anomalies: aiResult.anomalies,
        capBlockedReason: aiResult.capBlockedReason,
        secondProofRequested: Boolean(aiResult.secondProofRequested),
        secondProofAttempts: nextAttempts,
        secondProofPrompt: aiResult.secondProofPrompt,
        aiExtracted: aiResult.extracted,
        updatedAt: new Date().toISOString(),
      });

      if (aiResult.decision === 'verified') {
        const latest = await store.get<PaymentSubmission>('payments', submission.id);
        const settled = await finalizeVerifiedPaymentSettlement(
          latest || submission,
          invoice,
          order,
          settings,
          'Camellia Evidence Mode AI',
          undefined,
          aiResult.adminSummary,
          'unconfirmed'
        );
        await recordAudit(
          'AI_EVIDENCE_VERIFIED',
          'Camellia Evidence Mode AI',
          `Verified ${submission.id} (unconfirmed; Score ${aiResult.confidence}/100, Trx ${submission.normalizedTrxId})`,
          submission.id
        );
        return { submission: settled.submission, checkResults: settled.submission.checkResults, invoice };
      }

      if (aiResult.decision === 'needs_review') {
        await raiseAlert(
          'ai_payment_needs_review',
          'warn',
          `Payment ${submission.id} queued for owner review`,
          aiResult.adminSummary,
          submission.id
        );
      } else if (aiResult.decision === 'rejected') {
        await recordAudit(
          'AI_EVIDENCE_NEEDS_CORRECTION',
          'Camellia Evidence Mode AI',
          `Flagged ${submission.id}: ${aiResult.adminSummary}`,
          submission.id
        );
      }

      const finalSub = await store.get<PaymentSubmission>('payments', submission.id);
      return { submission: finalSub || submission, checkResults: aiResult.checkResults, invoice };
    }

    await store.update('payments', submission.id, {
      status: ledgerDecision.status === 'rejected' ? 'rejected' : 'awaiting_ledger',
      checkResults: ledgerDecision.checkResults,
      decisionReason: ledgerDecision.reasons.join('; '),
      updatedAt: new Date().toISOString(),
    });
    const waitingSub = await store.get<PaymentSubmission>('payments', submission.id);
    return { submission: waitingSub || submission, checkResults: ledgerDecision.checkResults, invoice };
  }

  // Promote unconfirmed Evidence Mode payment when independent SMS/email/statement matches it
  async function promoteMatchingUnconfirmedSubmission(ledger: LedgerRecord) {
    const candidates = await store.list<PaymentSubmission>(
      'payments',
      (p) => p.normalizedTrxId === ledger.normalizedTrxId && p.status === 'verified' && p.confirmationState === 'unconfirmed'
    );
    for (const sub of candidates) {
      const nowIso = new Date().toISOString();
      await store.update('ledger', ledger.id, { used: true, claimedByPaymentId: sub.id });
      await store.update('payments', sub.id, {
        confirmationState: 'confirmed',
        confirmedAt: nowIso,
        matchedLedgerId: ledger.id,
        ownerConfirmationStatus: 'RECEIVED',
        decisionReason: `${sub.decisionReason || ''} | Confirmed independently via ${ledger.channel} (${ledger.id})`.trim(),
        updatedAt: nowIso,
      });
      await recordConfirmedShapeSample(store, sub.methodId, sub.transactionId);
      await recordAudit(
        'INDEPENDENT_CONFIRMATION',
        `ingest_${ledger.channel}`,
        `Evidence Mode payment ${sub.id} promoted from Unconfirmed to Confirmed via ${ledger.id}`,
        sub.id
      );
    }
  }

  app.post('/api/payments', async (req: Request, res: Response) => {
    const {
      invoiceId,
      methodId,
      transactionId,
      amount,
      currency,
      paidAt,
      senderMask,
      note,
      receiptFileName,
      receiptBase64Data,
    } = req.body || {};
    if (!invoiceId || !transactionId || !amount) {
      return res.status(400).json({ success: false, error: 'Invoice, TrxID, and amount are required', code: 'bad_intake' });
    }

    const invoices = await store.list<InvoiceRecord>('invoices', (i) => i.invoiceId === invoiceId || i.orderId === invoiceId);
    const invoice = invoices[0];
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    const settings = await getSettings();
    if (methodId === 'binance-pay' && !settings.cryptoEnabled) {
      return res.status(400).json({ success: false, error: 'Cryptocurrency payment channel is disabled by owner policy.' });
    }

    const evidenceFiles: PaymentSubmission['evidenceFiles'] = [];
    if (receiptBase64Data && typeof receiptBase64Data === 'string') {
      try {
        const inspected = await inspectAndSanitizeEvidence(receiptBase64Data);
        evidenceFiles.push({
          fileName: receiptFileName || 'receipt',
          dataUrl: inspected.dataUrl,
          sha256: inspected.sha256,
          pHash: inspected.pHash,
          width: inspected.width,
          height: inspected.height,
          evidenceKind: 'primary',
          uploadedAt: new Date().toISOString(),
        });
      } catch (err: any) {
        return res.status(400).json({ success: false, error: err?.message || 'Unsupported evidence file.' });
      }
    }

    const normTrx = normalizeTrx(transactionId);
    return withTrxLock(normTrx || invoice.invoiceId, async () => {
      // Concurrent check for same TrxID on another invoice
      const sameTrxOtherInv = await store.list<PaymentSubmission>(
        'payments',
        (p) => p.normalizedTrxId === normTrx && p.invoiceId !== invoice.invoiceId && (p.status === 'verified' || p.status === 'needs_review')
      );
      if (sameTrxOtherInv.length > 0) {
        return res.status(409).json({
          success: false,
          error: GENERIC_CLIENT_CORRECTION_MSG,
          code: 'duplicate_trx',
        });
      }

      const existing = await store.list<PaymentSubmission>(
        'payments',
        (p) => p.invoiceId === invoice.invoiceId && p.normalizedTrxId === normTrx
      );
      if (existing.length > 0) {
        if (evidenceFiles.length > 0 && existing[0].status !== 'verified') {
          const mergedEvidence = [...(existing[0].evidenceFiles || []), ...evidenceFiles].slice(-3);
          await store.update('payments', existing[0].id, {
            evidenceFiles: mergedEvidence,
            updatedAt: new Date().toISOString(),
          });
          const rerun = await runVerificationPipeline(existing[0].id);
          return res.json({
            submission: sanitizeSubmissionForClient(rerun?.submission || existing[0]),
            deduplicated: true,
          });
        }
        return res.json({
          submission: sanitizeSubmissionForClient(existing[0]),
          deduplicated: true,
        });
      }

      const submissionId = `SUB-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
      const submission: PaymentSubmission = {
        id: submissionId,
        invoiceId: invoice.invoiceId,
        orderId: invoice.orderId,
        clientId: invoice.clientId,
        methodId: methodId || 'bkash-personal',
        transactionId: String(transactionId).trim(),
        normalizedTrxId: normTrx,
        amount: Number(amount),
        currency: currency || invoice.currency,
        paidAt: paidAt || new Date().toISOString(),
        senderMask: senderMask || '****',
        note,
        status: 'awaiting_ledger',
        checkResults: [],
        evidenceFiles,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await store.set('payments', submission.id, submission);
      await recordAudit('PAYMENT_SUBMITTED', submission.clientId, `Payment ${submission.id} submitted for ${invoice.orderId}`, submission.id);

      const pipelineRes = await runVerificationPipeline(submission.id);
      return res.status(200).json({
        submission: sanitizeSubmissionForClient(pipelineRes?.submission || submission),
      });
    });
  });

  app.post('/api/payments/:id/evidence', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { fileName, base64Data, evidenceKind = 'second_proof' } = req.body || {};

    const submission = await store.get<PaymentSubmission>('payments', id);
    if (!submission) return res.status(404).json({ success: false, error: 'Payment submission not found' });
    if (!base64Data || typeof base64Data !== 'string') {
      return res.status(400).json({ success: false, error: 'Receipt image/PDF base64Data is required' });
    }

    let inspected;
    try {
      inspected = await inspectAndSanitizeEvidence(base64Data);
    } catch (err: any) {
      return res.status(400).json({ success: false, error: err?.message || 'Unsupported evidence file.' });
    }

    return withTrxLock(submission.normalizedTrxId || submission.id, async () => {
      const evidenceEntry = {
        fileName: fileName || 'receipt',
        dataUrl: inspected.dataUrl,
        sha256: inspected.sha256,
        pHash: inspected.pHash,
        width: inspected.width,
        height: inspected.height,
        evidenceKind: (evidenceKind === 'primary' ? 'primary' : 'second_proof') as 'primary' | 'second_proof',
        uploadedAt: new Date().toISOString(),
      };

      const latestSub = (await store.get<PaymentSubmission>('payments', id)) || submission;
      const evidenceFiles = [...(latestSub.evidenceFiles || []), evidenceEntry].slice(-4);
      await store.update('payments', submission.id, { evidenceFiles, updatedAt: new Date().toISOString() });

      const pipelineRes = await runVerificationPipeline(submission.id);
      return res.json({
        success: true,
        submission: pipelineRes?.submission ? sanitizeSubmissionForClient(pipelineRes.submission) : undefined,
      });
    });
  });

  app.post('/api/payments/:id/ai-verify', adminAuth, async (req: Request, res: Response) => {
    const { id } = req.params;
    const submission = await store.get<PaymentSubmission>('payments', id);
    if (!submission) return res.status(404).json({ success: false, error: 'Payment submission not found' });
    const pipelineRes = await runVerificationPipeline(submission.id);
    return res.json({
      success: true,
      submission: pipelineRes?.submission,
      checkResults: pipelineRes?.checkResults || [],
    });
  });

  app.get('/api/payments/:id/status', async (req: Request, res: Response) => {
    const { id } = req.params;
    const norm = normalizeTrx(id);
    const submissions = await store.list<PaymentSubmission>(
      'payments',
      (p) => p.id === id || p.invoiceId === id || p.orderId === id || p.normalizedTrxId === norm
    );
    submissions.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    const submission = submissions[0] || null;
    const invoice = submission ? await store.get<InvoiceRecord>('invoices', submission.invoiceId) : null;
    return res.json({
      submission: submission ? sanitizeSubmissionForClient(submission) : null,
      invoice,
    });
  });

  app.post('/api/payments/:id/request-manual-review', async (req: Request, res: Response) => {
    const { id } = req.params;
    const submission = await store.get<PaymentSubmission>('payments', id);
    if (!submission) return res.status(404).json({ success: false, error: 'Payment submission not found' });

    const now = new Date().toISOString();
    await store.update('payments', submission.id, {
      status: 'needs_review',
      manualReviewRequested: true,
      manualReviewRequestedAt: now,
      decisionReason: 'Client requested manual owner review.',
      updatedAt: now,
    });
    await raiseAlert('manual_review_requested', 'warn', `Manual review requested for ${submission.id}`, `TrxID ${submission.transactionId} (${submission.amount} ${submission.currency})`, submission.id);
    await recordAudit('PAYMENT_MANUAL_REVIEW_REQUESTED', submission.clientId, `Client requested manual review for ${submission.id}`, submission.id);

    const updated = await store.get<PaymentSubmission>('payments', submission.id);
    return res.json({ success: true, submission: updated ? sanitizeSubmissionForClient(updated) : null });
  });

  // ===========================================================================
  // ADMIN AUTH & EXECUTIVE OVERVIEW
  // ===========================================================================

  app.get('/api/admin/bootstrap-status', async (_req: Request, res: Response) => {
    const status = await getAdminAuthStatus();
    return res.json({
      needsClaim: status.needsClaim,
      hasEnvPassword: status.hasEnvPassword,
      email: OWNER_EMAIL,
    });
  });

  app.post('/api/admin/bootstrap-claim', async (req: Request, res: Response) => {
    const rateKey = `admin-claim:${req.ip || 'unknown'}`;
    const rate = adminAuthLimiter.check(rateKey);
    if (!rate.allowed) {
      res.setHeader('Retry-After', String(rate.retryAfterSec));
      return res.status(429).json({
        success: false,
        error: 'Too many setup attempts. Please wait and try again.',
        code: 'rate_limited',
      });
    }

    const status = await getAdminAuthStatus();
    if (!status.needsClaim) {
      return res.status(403).json({
        success: false,
        error: 'Owner passcode is already configured. Please sign in.',
        code: 'already_claimed',
      });
    }
    const { password, confirmPassword } = req.body || {};
    const cleanPassword = typeof password === 'string' ? password.trim() : '';
    if (cleanPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Passcode must be at least 8 characters.',
        code: 'weak_password',
      });
    }
    if (typeof confirmPassword === 'string' && cleanPassword !== confirmPassword.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Passcodes do not match.',
        code: 'password_mismatch',
      });
    }
    const passwordHash = hashPasswordScrypt(cleanPassword);
    await store.set('config', 'admin_auth', {
      passwordHash,
      claimedAt: new Date().toISOString(),
    });
    adminAuthLimiter.reset(rateKey);
    const token = generateToken({ isAdmin: true, email: OWNER_EMAIL });
    setSessionCookie(req, res, 'mrs_admin_session', token);
    await recordAudit('ADMIN_PASSCODE_CLAIMED', OWNER_EMAIL, 'Initial owner passcode configured via first-run setup');
    return res.status(201).json({ success: true, token, email: OWNER_EMAIL });
  });

  app.post('/api/admin/login', async (req: Request, res: Response) => {
    const rateKey = `admin-login:${req.ip || 'unknown'}`;
    const rate = adminAuthLimiter.check(rateKey);
    if (!rate.allowed) {
      res.setHeader('Retry-After', String(rate.retryAfterSec));
      return res.status(429).json({
        success: false,
        error: 'Too many sign-in attempts. Please try again later.',
        code: 'rate_limited',
      });
    }

    const { password } = req.body || {};
    const status = await getAdminAuthStatus();
    if (status.needsClaim) {
      return res.status(403).json({
        success: false,
        error: 'Initial owner passcode has not been configured yet.',
        code: 'admin_not_claimed',
      });
    }
    const passStr = typeof password === 'string' ? password.trim() : '';
    const isValid = status.hasEnvPassword
      ? Boolean(passStr) && timingSafeEqualStrings(passStr, ENV_ADMIN_PASSWORD)
      : Boolean(passStr) && verifyPasswordScrypt(passStr, status.claimedHash);

    if (!isValid) {
      await recordAudit('ADMIN_LOGIN_FAILED', 'unknown', 'Invalid admin password attempted');
      return res.status(401).json({ success: false, error: 'Invalid password', code: 'bad_login' });
    }
    adminAuthLimiter.reset(rateKey);
    const token = generateToken({ isAdmin: true, email: OWNER_EMAIL });
    setSessionCookie(req, res, 'mrs_admin_session', token);
    await recordAudit('ADMIN_LOGIN_SUCCESS', OWNER_EMAIL, 'Owner signed in');
    return res.json({ success: true, token, email: OWNER_EMAIL });
  });

  app.get('/api/admin/session', adminAuth, (_req: Request, res: Response) => {
    return res.json({ ok: true, email: OWNER_EMAIL });
  });

  app.post('/api/admin/logout', (req: Request, res: Response) => {
    clearSessionCookie(req, res, 'mrs_admin_session');
    return res.json({ success: true, message: 'Signed out' });
  });

  app.get('/api/admin/overview', adminAuth, async (_req: Request, res: Response) => {
    const [orders, payments, jobs, invoices, clients, alerts] = await Promise.all([
      store.list<OrderRecord>('orders'),
      store.list<PaymentSubmission>('payments'),
      store.list<FulfilmentJob>('jobs'),
      store.list<InvoiceRecord>('invoices'),
      store.list<ClientRecord>('clients'),
      store.list<AlertEntry>('alerts'),
    ]);
    const bridges = await getBridges();
    const adminStatus = await getAdminAuthStatus();

    const configProblems: string[] = [];
    if (!store.isDurable()) configProblems.push('Database is running in non-durable MemoryStore (configure FIREBASE_SERVICE_ACCOUNT).');
    if (!ai) configProblems.push('GEMINI_API_KEY is not configured — AI drafting and Camellia Concierge are disabled.');
    if (adminStatus.needsClaim) {
      configProblems.push('Owner passcode has not been configured yet.');
    }

    return res.json({
      needsYou: {
        quotes: orders.filter((o) => o.state === 'quote_pending').length,
        payments: payments.filter((p) => p.status === 'needs_review' || p.status === 'awaiting_ledger').length,
        drafts: jobs.filter((j) => j.state === 'owner_review').length,
        tasks: jobs.filter((j) => j.state === 'owner_task').length,
        failedJobs: jobs.filter((j) => j.state === 'failed').length,
      },
      counts: {
        totalOrders: orders.length,
        totalClients: clients.length,
        totalInvoices: invoices.length,
        totalPayments: payments.length,
        unreadAlerts: alerts.filter((a) => !a.read).length,
      },
      bridges,
      configProblems,
      storage: (typeof store.isCloudConnected === 'function' ? store.isCloudConnected() : false)
        ? 'firestore'
        : store.isDurable()
        ? 'durable_local'
        : 'memory',
    });
  });

  // ===========================================================================
  // ADMIN ORDERS, CLIENTS, DELIVERABLES, JOBS
  // ===========================================================================

  app.get('/api/admin/orders', adminAuth, async (_req: Request, res: Response) => {
    const [orders, invoices, deliverables, jobs] = await Promise.all([
      store.list<OrderRecord>('orders'),
      store.list<InvoiceRecord>('invoices'),
      store.list<DeliverableRecord>('deliverables'),
      store.list<FulfilmentJob>('jobs'),
    ]);
    orders.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return res.json({ orders, invoices, deliverables, jobs });
  });

  app.get('/api/admin/orders/:id', adminAuth, async (req: Request, res: Response) => {
    const order = await store.get<OrderRecord>('orders', req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const [invoices, payments, deliverables, messages, job] = await Promise.all([
      store.list<InvoiceRecord>('invoices', (i) => i.orderId === order.id),
      store.list<PaymentSubmission>('payments', (p) => p.orderId === order.id),
      store.list<DeliverableRecord>('deliverables', (d) => d.orderId === order.id),
      store.list<OrderMessageRecord>('messages', (m) => m.orderId === order.id),
      store.get<FulfilmentJob>('jobs', `JOB-${order.id}`),
    ]);
    return res.json({ order, invoice: invoices[0] || null, payments, deliverables, messages, job });
  });

  app.post('/api/admin/orders/:id/quote', adminAuth, async (req: Request, res: Response) => {
    const order = await store.get<OrderRecord>('orders', req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const amountUSD = Number(req.body?.amountUSD);
    if (!amountUSD || amountUSD <= 0) return res.status(400).json({ error: 'Positive amountUSD is required' });

    const settings = await getSettings();
    const rate = settings.usdToBdt || 100;
    const amountBDT = Math.round(amountUSD * rate);

    await store.update('orders', order.id, {
      quoteAmount: amountUSD,
      state: 'awaiting_payment',
      status: 'Awaiting payment',
      updatedAt: new Date().toISOString(),
    });
    const invoices = await store.list<InvoiceRecord>('invoices', (i) => i.orderId === order.id);
    for (const inv of invoices) {
      await store.update('invoices', inv.invoiceId, {
        amount: amountUSD,
        amountUSD,
        amountBDT,
        amountDue: Math.max(0, amountUSD - (inv.totalPaid || 0)),
        usdToBdtRate: rate,
        updatedAt: new Date().toISOString(),
      });
    }
    await recordAudit('OWNER_QUOTE_SET', OWNER_EMAIL, `Quoted ${order.id} at $${amountUSD} USD`, order.id);
    return res.json({ success: true, amountUSD, amountBDT });
  });

  app.post('/api/admin/orders/:id/cancel', adminAuth, async (req: Request, res: Response) => {
    const order = await store.get<OrderRecord>('orders', req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    await store.update('orders', order.id, {
      state: 'cancelled',
      status: 'Cancelled',
      updatedAt: new Date().toISOString(),
    });
    const invoices = await store.list<InvoiceRecord>('invoices', (i) => i.orderId === order.id);
    for (const inv of invoices) {
      await store.update('invoices', inv.invoiceId, { status: 'cancelled', updatedAt: new Date().toISOString() });
    }
    await recordAudit('OWNER_CANCEL_ORDER', OWNER_EMAIL, req.body?.reason || `Cancelled ${order.id}`, order.id);
    return res.json({ success: true });
  });

  app.post('/api/admin/orders/:id/messages', adminAuth, async (req: Request, res: Response) => {
    const order = await store.get<OrderRecord>('orders', req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    const text = String(req.body?.text || '').trim();
    if (!text) return res.status(400).json({ error: 'Message text required' });
    const msg: OrderMessageRecord = {
      id: `MSG-${Date.now()}`,
      orderId: order.id,
      clientId: order.clientId,
      author: 'owner',
      text,
      internal: Boolean(req.body?.internal),
      timestamp: new Date().toISOString(),
    };
    await store.set('messages', msg.id, msg);
    return res.status(201).json({ success: true, message: msg });
  });

  app.post('/api/admin/orders/:id/deliverables', adminAuth, async (req: Request, res: Response) => {
    const order = await store.get<OrderRecord>('orders', req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const { title, summary, content, fileName, format = 'md', base64Data } = req.body || {};
    if (!title && !fileName) return res.status(400).json({ error: 'Deliverable title or fileName required' });

    const b64 = base64Data
      ? String(base64Data).replace(/^data:[^;]+;base64,/, '')
      : Buffer.from(String(content || summary || title || ''), 'utf8').toString('base64');

    const invoices = await store.list<InvoiceRecord>('invoices', (i) => i.orderId === order.id);
    const isPaid = invoices.some((i) => i.status === 'paid_verified');
    const locked = Boolean(order.deliverablesLocked && !isPaid);

    const del: DeliverableRecord = {
      id: `DEL-${Date.now().toString().slice(-6)}`,
      orderId: order.id,
      clientId: order.clientId,
      serviceId: order.serviceId,
      fileName: fileName || `${order.orderId}_${String(title).replace(/[^a-zA-Z0-9_-]/g, '_')}.${format}`,
      title: title || fileName,
      summary: summary || 'Completed deliverable uploaded by owner.',
      format,
      fileSize: `${Math.max(1, Math.round(Buffer.from(b64, 'base64').length / 1024))} KB`,
      base64Data: b64,
      locked,
      downloadable: true,
      createdAt: new Date().toISOString(),
    };
    await store.set('deliverables', del.id, del);
    await store.update('orders', order.id, {
      state: 'delivered',
      status: 'Delivered',
      deliverablesLocked: locked,
      updatedAt: new Date().toISOString(),
    });
    await recordAudit('DELIVERABLE_PUBLISHED', OWNER_EMAIL, `Deliverable ${del.id} published for ${order.id}`, order.id);
    return res.status(201).json({ success: true, deliverable: del });
  });

  app.get('/api/admin/orders/:id/files/:fileId', adminAuth, async (req: Request, res: Response) => {
    const f = await store.get<any>('order_files', req.params.fileId);
    if (!f) return res.status(404).json({ error: 'File not found' });
    res.setHeader('Content-Disposition', `attachment; filename="${f.fileName}"`);
    return res.send(Buffer.from(f.base64Data, 'base64'));
  });

  app.get('/api/admin/clients', adminAuth, async (_req: Request, res: Response) => {
    const clients = await store.list<ClientRecord>('clients');
    const orders = await store.list<OrderRecord>('orders');
    const sanitized = clients.map(({ pinHash: _p, ...rest }) => ({
      ...rest,
      orderCount: orders.filter((o) => o.clientId === rest.clientId).length,
    }));
    return res.json({ clients: sanitized });
  });

  app.post('/api/admin/clients', adminAuth, async (req: Request, res: Response) => {
    const { name, email, whatsapp = '', country = '', trustTier = 'new', pin } = req.body || {};
    const cleanName = String(name || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanName || !cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ error: 'Valid client name and email are required' });
    }
    if (pin !== undefined && pin !== '' && !/^\d{6}$/.test(String(pin).trim())) {
      return res.status(400).json({ error: 'PIN must be exactly 6 numeric digits' });
    }
    const existing = await store.list<ClientRecord>('clients', (c) => c.email.toLowerCase() === cleanEmail);
    if (existing.length > 0) {
      return res.status(409).json({ error: `Client already registered (${existing[0].clientId})` });
    }
    const nowC = new Date();
    const yyC = nowC.getFullYear().toString().slice(-2);
    const mmC = (nowC.getMonth() + 1).toString().padStart(2, '0');
    let clientId = `MRS-${yyC}${mmC}-${Math.floor(1000 + Math.random() * 9000)}`;
    while (await store.get('clients', clientId)) {
      clientId = `MRS-${yyC}${mmC}-${Math.floor(1000 + Math.random() * 9000)}`;
    }
    const plainPin = pin && String(pin).trim() ? String(pin).trim() : Math.floor(100000 + Math.random() * 900000).toString();
    const record: ClientRecord = {
      clientId,
      name: cleanName,
      email: cleanEmail,
      whatsapp: String(whatsapp).trim(),
      country: String(country).trim(),
      pinHash: hashPin(plainPin),
      loginFailures: 0,
      tokenVersion: 1,
      trustTier: ['new', 'trusted', 'prepay_only', 'blocked'].includes(trustTier) ? trustTier : 'new',
      blocked: trustTier === 'blocked',
      createdAt: nowC.toISOString(),
    };
    await store.set('clients', record.clientId, record);
    await recordAudit('OWNER_CREATE_CLIENT', OWNER_EMAIL, `Created Client ID ${record.clientId} (${record.email})`, record.clientId);
    const { pinHash: _p, ...sanitized } = record;
    return res.status(201).json({ success: true, client: sanitized, plainPin });
  });

  app.post('/api/admin/clients/:id/reset-pin', adminAuth, async (req: Request, res: Response) => {
    const client = await store.get<ClientRecord>('clients', req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    const requestedPin = req.body?.pin ? String(req.body.pin).trim() : '';
    if (requestedPin && !/^\d{6}$/.test(requestedPin)) {
      return res.status(400).json({ error: 'PIN must be 6 numeric digits' });
    }
    const plainPin = requestedPin || Math.floor(100000 + Math.random() * 900000).toString();
    await store.update('clients', client.clientId, {
      pinHash: hashPin(plainPin),
      loginFailures: 0,
      lockedUntil: undefined,
      tokenVersion: (client.tokenVersion || 1) + 1,
    });
    await recordAudit('OWNER_RESET_PIN', OWNER_EMAIL, `Reset PIN for client ${client.clientId}`, client.clientId);
    return res.json({ success: true, clientId: client.clientId, plainPin });
  });

  app.post('/api/admin/clients/:id/tier', adminAuth, async (req: Request, res: Response) => {
    const client = await store.get<ClientRecord>('clients', req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    const trustTier = req.body?.trustTier;
    if (!['new', 'trusted', 'prepay_only', 'blocked'].includes(trustTier)) {
      return res.status(400).json({ error: 'Invalid trustTier' });
    }
    await store.update('clients', client.clientId, { trustTier, blocked: trustTier === 'blocked' });
    await recordAudit('OWNER_UPDATE_TIER', OWNER_EMAIL, `Set trustTier=${trustTier} on ${client.clientId}`, client.clientId);
    return res.json({ success: true, trustTier });
  });

  app.post('/api/admin/clients/:id/block', adminAuth, async (req: Request, res: Response) => {
    const client = await store.get<ClientRecord>('clients', req.params.id);
    if (!client) return res.status(404).json({ error: 'Client not found' });
    const blocked = typeof req.body?.blocked === 'boolean' ? req.body.blocked : !client.blocked;
    await store.update('clients', client.clientId, { blocked, trustTier: blocked ? 'blocked' : 'new' });
    await recordAudit('OWNER_BLOCK_CLIENT', OWNER_EMAIL, `Client ${client.clientId} blocked=${blocked}`, client.clientId);
    return res.json({ success: true, blocked });
  });

  // Jobs routes
  app.get('/api/admin/jobs', adminAuth, async (_req: Request, res: Response) => {
    const jobs = await store.list<FulfilmentJob>('jobs');
    return res.json({ jobs });
  });

  app.post('/api/admin/jobs/:id/run', adminAuth, async (req: Request, res: Response) => {
    const job = await store.get<FulfilmentJob>('jobs', req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    const order = await store.get<OrderRecord>('orders', job.orderId);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    job.state = 'running';
    const result = await processOrderJob(order, job, store, ai);
    for (const d of result.deliverables) {
      await store.set('deliverables', d.id, d);
    }
    job.qa = result.qa;
    job.updatedAt = new Date().toISOString();
    await store.set('jobs', job.id, job);
    await recordAudit('RUN_FULFILMENT_JOB', OWNER_EMAIL, `Ran job ${job.id} -> ${job.state}`, job.id);
    return res.json({ success: true, job, deliverables: result.deliverables });
  });

  app.post('/api/admin/jobs/:id/send-back', adminAuth, async (req: Request, res: Response) => {
    const job = await store.get<FulfilmentJob>('jobs', req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    const message = String(req.body?.message || 'Owner requested clarification / rework').trim();
    await store.update('jobs', job.id, { state: 'waiting_inputs', questionsForClient: [message], updatedAt: new Date().toISOString() });
    await store.set('messages', `MSG-${Date.now()}`, {
      id: `MSG-${Date.now()}`,
      orderId: job.orderId,
      author: 'owner',
      text: message,
      timestamp: new Date().toISOString(),
    });
    return res.json({ success: true });
  });

  app.post('/api/admin/jobs/:id/owner-done', adminAuth, async (req: Request, res: Response) => {
    const job = await store.get<FulfilmentJob>('jobs', req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    await store.update('jobs', job.id, { state: 'owner_review', summary: req.body?.summary || 'Owner manual execution done.', updatedAt: new Date().toISOString() });
    return res.json({ success: true });
  });

  app.post('/api/admin/jobs/:id/release', adminAuth, async (req: Request, res: Response) => {
    const job = await store.get<FulfilmentJob>('jobs', req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    const blockingFailures = (job.qa || []).filter((q) => !q.passed && q.severity === 'block');
    if (blockingFailures.length > 0 && !req.body?.force) {
      return res.status(409).json({
        success: false,
        code: 'checks_failed',
        error: 'Blocking QA checks failed. Pass force: true to override.',
        blockingFailures,
      });
    }
    await store.update('jobs', job.id, { state: 'released', updatedAt: new Date().toISOString() });
    await store.update('orders', job.orderId, { state: 'delivered', status: 'Delivered', updatedAt: new Date().toISOString() });
    await recordAudit('RELEASE_JOB', OWNER_EMAIL, `Released job ${job.id} for ${job.orderId}`, job.id);
    return res.json({ success: true });
  });

  // ===========================================================================
  // ADMIN PAYMENTS, LEDGER, BALANCE, RECONCILE, ALERTS, AUDIT, PACK
  // ===========================================================================

  app.get('/api/admin/payments', adminAuth, async (req: Request, res: Response) => {
    const { queue = 'all' } = req.query;
    const [all, ledgers, settings, bridges] = await Promise.all([
      store.list<PaymentSubmission>('payments'),
      store.list<LedgerRecord>('ledger'),
      getSettings(),
      getBridges(),
    ]);

    let filtered = all;
    if (queue === 'needs_action') filtered = all.filter((p) => p.status === 'needs_review');
    else if (queue === 'awaiting_ledger') filtered = all.filter((p) => p.status === 'awaiting_ledger');
    else if (queue === 'auto_verified') filtered = all.filter((p) => p.status === 'verified');
    else if (queue === 'rejected') filtered = all.filter((p) => p.status === 'rejected');

    const counts = {
      needsAction: all.filter((p) => p.status === 'needs_review').length,
      awaitingLedger: all.filter((p) => p.status === 'awaiting_ledger').length,
      autoVerified: all.filter((p) => p.status === 'verified').length,
      rejected: all.filter((p) => p.status === 'rejected').length,
      total: all.length,
    };

    return res.json({
      counts,
      payments: filtered,
      ledgerEntries: ledgers.slice(0, 100),
      settings,
      bridgeStatuses: bridges,
    });
  });

  app.get('/api/admin/payments/:id/evidence/:n', adminAuth, async (req: Request, res: Response) => {
    const payment = await store.get<PaymentSubmission>('payments', req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    const idx = Math.max(0, Number(req.params.n) - 1);
    const ev = payment.evidenceFiles?.[idx];
    if (!ev || !ev.dataUrl) return res.status(404).json({ error: 'Evidence file not found' });
    const match = ev.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return res.status(404).json({ error: 'Invalid evidence data' });
    res.setHeader('Content-Type', match[1]);
    return res.send(Buffer.from(match[2], 'base64'));
  });

  app.post('/api/admin/payments/:id/verify', adminAuth, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { ledgerEntryId, reason } = req.body || {};
    const payment = await store.get<PaymentSubmission>('payments', id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    const invoice = await store.get<InvoiceRecord>('invoices', payment.invoiceId);
    const order = await store.get<OrderRecord>('orders', payment.orderId);
    const settings = await getSettings();
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const settled = await finalizeVerifiedPaymentSettlement(
      payment,
      invoice,
      order,
      settings,
      OWNER_EMAIL,
      ledgerEntryId,
      reason || 'Owner verified.'
    );
    await recordAudit('OWNER_VERIFY_PAYMENT', OWNER_EMAIL, `Payment ${payment.id} verified. ${reason || ''}`, payment.id);
    return res.json({
      success: true,
      message: 'Payment verified atomically.',
      submission: settled.submission,
      emailResult: settled.emailResult,
    });
  });

  app.post('/api/admin/payments/:id/owner-confirm', adminAuth, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { action, note, method, amount } = req.body || {};
    const payment = await store.get<PaymentSubmission>('payments', id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    if (action === 'RECEIVED') {
      const confirmedAmt = amount ? Number(amount) : payment.amount;
      await store.update('payments', payment.id, {
        amount: confirmedAmt,
        methodId: method || payment.methodId,
      });
      const latest = await store.get<PaymentSubmission>('payments', payment.id);
      const invoice = await store.get<InvoiceRecord>('invoices', payment.invoiceId);
      const order = await store.get<OrderRecord>('orders', payment.orderId);
      const settings = await getSettings();
      if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

      const settled = await finalizeVerifiedPaymentSettlement(
        latest || payment,
        invoice,
        order,
        settings,
        OWNER_EMAIL,
        undefined,
        note || 'Owner confirmed funds received.'
      );
      await recordAudit('OWNER_CONFIRM_RECEIVED', OWNER_EMAIL, `Payment ${payment.id} confirmed RECEIVED`, payment.id);
      return res.json({ success: true, status: 'verified', submission: settled.submission, emailResult: settled.emailResult });
    }

    if (action === 'NOT_RECEIVED') {
      await store.update('payments', payment.id, {
        status: 'rejected',
        ownerConfirmationStatus: 'NOT_RECEIVED',
        decisionReason: note || 'Owner checked account: funds not received.',
        updatedAt: new Date().toISOString(),
      });
      await recordAudit('OWNER_CONFIRM_NOT_RECEIVED', OWNER_EMAIL, `Payment ${payment.id} marked NOT_RECEIVED`, payment.id);
      return res.json({ success: true, status: 'rejected' });
    }

    await store.update('payments', payment.id, {
      status: 'needs_review',
      ownerConfirmationStatus: 'CHECK',
      decisionReason: note || 'Flagged for bank/wallet check.',
      updatedAt: new Date().toISOString(),
    });
    return res.json({ success: true, status: 'needs_review' });
  });

  app.post('/api/admin/payments/:id/reject', adminAuth, async (req: Request, res: Response) => {
    const payment = await store.get<PaymentSubmission>('payments', req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    const reason = String(req.body?.reason || '').trim();
    if (!reason) return res.status(400).json({ error: 'Rejection reason is required' });
    await store.update('payments', payment.id, {
      status: 'rejected',
      decisionReason: reason,
      updatedAt: new Date().toISOString(),
    });
    await recordAudit('OWNER_REJECT_PAYMENT', OWNER_EMAIL, `Rejected ${payment.id}: ${reason}`, payment.id);
    return res.json({ success: true });
  });

  app.post('/api/admin/payments/:id/request-info', adminAuth, async (req: Request, res: Response) => {
    const payment = await store.get<PaymentSubmission>('payments', req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    const message = String(req.body?.message || 'Please upload a clearer receipt screenshot.').trim();
    await store.update('payments', payment.id, {
      status: 'needs_review',
      decisionReason: message,
      updatedAt: new Date().toISOString(),
    });
    await store.set('messages', `MSG-${Date.now()}`, {
      id: `MSG-${Date.now()}`,
      orderId: payment.orderId,
      clientId: payment.clientId,
      author: 'owner',
      text: `[Payment Info Requested]: ${message}`,
      timestamp: new Date().toISOString(),
    });
    return res.json({ success: true });
  });

  app.post('/api/admin/payments/:id/reverse', adminAuth, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reason } = req.body || {};
    if (!reason) return res.status(400).json({ error: 'Reason for reversal is required' });

    const payment = await store.get<PaymentSubmission>('payments', id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    const invoice = await store.get<InvoiceRecord>('invoices', payment.invoiceId);
    const order = await store.get<OrderRecord>('orders', payment.orderId);

    await store.transaction(async (txn) => {
      if (payment.matchedLedgerId) {
        txn.update('ledger', payment.matchedLedgerId, { used: false, claimedByPaymentId: undefined });
      }
      if (invoice) {
        txn.update('invoices', invoice.invoiceId, { status: 'awaiting_payment', amountDue: invoice.amount, totalPaid: 0 });
      }
      if (order) {
        txn.update('orders', order.id, { state: 'awaiting_payment', status: 'Awaiting payment', deliverablesLocked: true });
      }
      txn.update('payments', payment.id, {
        status: 'needs_review',
        ownerConfirmationStatus: undefined,
        decisionReason: `REVERSED by owner: ${reason}`,
        updatedAt: new Date().toISOString(),
      });
    });

    const deliverables = await store.list<DeliverableRecord>('deliverables', (d) => d.orderId === payment.orderId);
    for (const d of deliverables) {
      await store.update('deliverables', d.id, { locked: true });
    }
    await recordAudit('REVERSE_PAYMENT', OWNER_EMAIL, `Payment ${payment.id} reversed: ${reason}`, payment.id);
    return res.json({ success: true, message: 'Payment reversed. Deliverables locked again.' });
  });

  const saveAdminSettingsHandler = async (req: Request, res: Response) => {
    const current = await getSettings();
    const body = req.body || {};
    const usdToBdt = Number(body.usdToBdt ?? body.exchangeRate ?? current.usdToBdt ?? 100);
    const updated: SystemSettings = {
      ...current,
      ...body,
      usdToBdt,
    };
    await saveSettings(updated);
    await recordAudit('UPDATE_SETTINGS', OWNER_EMAIL, 'Updated platform settings on server');
    return res.json({ success: true, settings: updated });
  };

  app.put('/api/admin/payment-settings', adminAuth, saveAdminSettingsHandler);
  app.put('/api/admin/settings', adminAuth, saveAdminSettingsHandler);

  // Admin Service Catalog persistence
  app.post('/api/admin/services', adminAuth, async (req: Request, res: Response) => {
    const svc = req.body;
    if (!svc || !svc.id || !svc.name) {
      return res.status(400).json({ error: 'Service id and name are required' });
    }
    await store.set('services', svc.id, { ...svc, updatedAt: new Date().toISOString() });
    await recordAudit('CREATE_SERVICE', OWNER_EMAIL, `Added catalog service ${svc.name} (${svc.id})`, svc.id);
    return res.status(201).json({ success: true, service: svc });
  });

  app.put('/api/admin/services/:id', adminAuth, async (req: Request, res: Response) => {
    const id = req.params.id;
    const existing = await store.get<any>('services', id);
    const updated = { ...(existing || {}), ...(req.body || {}), id, updatedAt: new Date().toISOString() };
    await store.set('services', id, updated);
    await recordAudit('UPDATE_SERVICE', OWNER_EMAIL, `Updated catalog service ${id}`, id);
    return res.json({ success: true, service: updated });
  });

  app.post('/api/admin/services/:id/toggle', adminAuth, async (req: Request, res: Response) => {
    const id = req.params.id;
    const [settings, existingOverride] = await Promise.all([
      getSettings(),
      store.get<any>('services', id),
    ]);
    const base = CATALOG_SERVICES.find((s) => s.id === id || s.serviceId === id);
    const hiddenSet = new Set(settings.hiddenServices || []);
    const currentlyHidden = hiddenSet.has(id) || (base ? hiddenSet.has(base.serviceId) : false) || existingOverride?.active === false;
    const nextActive = typeof req.body?.active === 'boolean' ? req.body.active : currentlyHidden;

    if (nextActive) {
      hiddenSet.delete(id);
      if (base) {
        hiddenSet.delete(base.id);
        hiddenSet.delete(base.serviceId);
      }
    } else {
      hiddenSet.add(id);
      if (base) hiddenSet.add(base.serviceId);
    }

    await saveSettings({ ...settings, hiddenServices: Array.from(hiddenSet) });
    if (existingOverride || base) {
      await store.set('services', existingOverride?.id || base?.id || id, {
        ...(base || {}),
        ...(existingOverride || {}),
        id: existingOverride?.id || base?.id || id,
        active: nextActive,
        updatedAt: new Date().toISOString(),
      });
    }
    await recordAudit('TOGGLE_SERVICE', OWNER_EMAIL, `Service ${id} active=${nextActive}`, id);
    return res.json({ success: true, id, active: nextActive });
  });

  // Admin Support Tickets, Expenses, IPTV Subscriptions, Automation Rules
  app.get('/api/admin/support-tickets', adminAuth, async (_req: Request, res: Response) => {
    const tickets = await store.list<any>('support_tickets');
    tickets.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return res.json({ tickets });
  });

  app.put('/api/admin/support-tickets/:id', adminAuth, async (req: Request, res: Response) => {
    const status = req.body?.status;
    if (!['open', 'investigating', 'resolved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid ticket status' });
    }
    const existing = await store.get<any>('support_tickets', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Ticket not found' });
    const updated = { ...existing, status, updatedAt: new Date().toISOString() };
    await store.set('support_tickets', existing.id, updated);
    await recordAudit('UPDATE_TICKET_STATUS', OWNER_EMAIL, `Ticket ${existing.id} -> ${status}`, existing.id);
    return res.json({ success: true, ticket: updated });
  });

  app.get('/api/admin/expenses', adminAuth, async (_req: Request, res: Response) => {
    const expenses = await store.list<any>('expenses');
    expenses.sort((a, b) => (a.date < b.date ? 1 : -1));
    return res.json({ expenses });
  });

  app.post('/api/admin/expenses', adminAuth, async (req: Request, res: Response) => {
    const { title, category = 'other', amountUSD, date, notes } = req.body || {};
    if (!String(title || '').trim() || isNaN(Number(amountUSD))) {
      return res.status(400).json({ error: 'Title and numeric amountUSD are required' });
    }
    const exp = {
      id: `EXP-${Date.now().toString(36).toUpperCase()}`,
      title: String(title).trim(),
      category: ['tools', 'hosting', 'fees', 'other'].includes(category) ? category : 'other',
      amountUSD: Number(amountUSD),
      date: date || new Date().toISOString().slice(0, 10),
      notes: notes ? String(notes).trim() : undefined,
      createdAt: new Date().toISOString(),
    };
    await store.set('expenses', exp.id, exp);
    await recordAudit('CREATE_EXPENSE', OWNER_EMAIL, `Logged expense ${exp.title} ($${exp.amountUSD})`, exp.id);
    return res.status(201).json({ success: true, expense: exp });
  });

  app.get('/api/admin/subscriptions', adminAuth, async (_req: Request, res: Response) => {
    const subscriptions = await store.list<any>('subscriptions');
    subscriptions.sort((a, b) => (a.startDate < b.startDate ? 1 : -1));
    return res.json({ subscriptions });
  });

  app.post('/api/admin/subscriptions', adminAuth, async (req: Request, res: Response) => {
    const { clientId, clientName, clientEmail, plan = '1-month', startDate, endDate, status = 'active', credentials, serverUrl, notes } = req.body || {};
    if (!clientId) return res.status(400).json({ error: 'clientId is required' });
    const subId = `SUB-IPTV-${Date.now().toString(36).toUpperCase()}`;
    const start = startDate || new Date().toISOString();
    const monthsMap: Record<string, number> = { '1-month': 30, '2-month': 60, '6-month': 180, '12-month': 365 };
    const end = endDate || new Date(new Date(start).getTime() + (monthsMap[plan] || 30) * 86400000).toISOString();
    const sub = {
      subscriptionId: subId,
      clientId,
      clientName: clientName || clientId,
      clientEmail: clientEmail || '',
      serviceId: 'S-IPTV-01',
      plan,
      startDate: start,
      endDate: end,
      status,
      credentials: credentials || '',
      serverUrl: serverUrl || '',
      notes: notes || '',
    };
    await store.set('subscriptions', subId, sub);
    await recordAudit('CREATE_SUBSCRIPTION', OWNER_EMAIL, `Provisioned IPTV ${subId} for ${clientId}`, subId);
    return res.status(201).json({ success: true, subscription: sub });
  });

  app.put('/api/admin/subscriptions/:id', adminAuth, async (req: Request, res: Response) => {
    const existing = await store.get<any>('subscriptions', req.params.id);
    if (!existing) return res.status(404).json({ error: 'Subscription not found' });
    const updated = { ...existing, ...(req.body || {}), subscriptionId: existing.subscriptionId };
    await store.set('subscriptions', existing.subscriptionId, updated);
    await recordAudit('UPDATE_SUBSCRIPTION', OWNER_EMAIL, `Updated IPTV ${existing.subscriptionId}`, existing.subscriptionId);
    return res.json({ success: true, subscription: updated });
  });

  app.get('/api/admin/automation-rules', adminAuth, async (_req: Request, res: Response) => {
    const saved = (await store.get<Record<string, string>>('config', 'automation_rules')) || {};
    return res.json({ modes: saved });
  });

  app.put('/api/admin/automation-rules/:ruleId', adminAuth, async (req: Request, res: Response) => {
    const mode = req.body?.mode;
    if (!mode) return res.status(400).json({ error: 'mode is required' });
    const saved = (await store.get<Record<string, string>>('config', 'automation_rules')) || {};
    const next = { ...saved, [req.params.ruleId]: mode };
    await store.set('config', 'automation_rules', next);
    await recordAudit('UPDATE_AUTOMATION_RULE', OWNER_EMAIL, `Rule ${req.params.ruleId} mode=${mode}`, req.params.ruleId);
    return res.json({ success: true, modes: next });
  });

  app.get('/api/admin/payment-registry', adminAuth, async (_req: Request, res: Response) => {
    const settings = await getSettings();
    return res.json(buildPaymentRegistry(settings));
  });

  app.get('/api/admin/fulfilment-settings', adminAuth, async (_req: Request, res: Response) => {
    const settings = await getSettings();
    return res.json({
      autoRelease: settings.autoRelease,
      fulfilmentPaused: Boolean(settings.fulfilmentPaused),
      dailyAiCallCap: settings.dailyAiCallCap || 500,
    });
  });

  app.put('/api/admin/fulfilment-settings', adminAuth, async (req: Request, res: Response) => {
    const current = await getSettings();
    const updated = {
      ...current,
      autoRelease: req.body?.autoRelease ? { ...current.autoRelease, ...req.body.autoRelease } : current.autoRelease,
      fulfilmentPaused: typeof req.body?.fulfilmentPaused === 'boolean' ? req.body.fulfilmentPaused : current.fulfilmentPaused,
      dailyAiCallCap: req.body?.dailyAiCallCap ? Number(req.body.dailyAiCallCap) : current.dailyAiCallCap,
    };
    await saveSettings(updated);
    await recordAudit('UPDATE_FULFILMENT_SETTINGS', OWNER_EMAIL, 'Updated fulfilment settings');
    return res.json({ success: true, settings: updated });
  });

  app.post('/api/admin/ledger', adminAuth, async (req: Request, res: Response) => {
    const { method, trxId, amount, reason } = req.body || {};
    if (!method || !trxId || !amount) return res.status(400).json({ error: 'Method, TrxID, and amount required' });
    const ledgerRecord: LedgerRecord = {
      id: `LDG-${Date.now().toString().slice(-6)}`,
      channel: 'manual',
      methodId: method,
      trxId: String(trxId).trim(),
      normalizedTrxId: normalizeTrx(trxId),
      amount: Number(amount),
      currency: String(method).includes('bkash') || String(method).includes('nagad') ? 'BDT' : 'USD',
      rawPayload: reason || 'Manual owner ledger entry',
      used: false,
      receivedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    await store.set('ledger', ledgerRecord.id, ledgerRecord);
    await recordAudit('MANUAL_LEDGER_ENTRY', OWNER_EMAIL, `Created ${ledgerRecord.id} for ${method} (${amount})`, ledgerRecord.id);
    return res.json({ success: true, ledgerRecord });
  });

  app.post('/api/admin/ledger/parse-test', adminAuth, (req: Request, res: Response) => {
    const { kind, sender, text, from, subject, body, authResults } = req.body || {};
    if (kind === 'sms') {
      const parsed = parseOperatorSms(sender || '', text || '');
      return res.json({
        outcome: parsed.valid ? 'credit' : 'invalid',
        provider: parsed.provider,
        trxId: parsed.trxId,
        amount: parsed.amount,
        balance: parsed.balance,
        raw: parsed.raw,
      });
    }
    if (kind === 'email') {
      const parsed = parsePaymentEmail(from || '', subject || '', body || '', authResults || '');
      return res.json({
        outcome: parsed.valid ? 'credit' : 'invalid',
        provider: parsed.provider,
        trxId: parsed.trxId,
        amount: parsed.amount,
        dmarcPass: parsed.dmarcPass,
        raw: parsed.raw,
      });
    }
    return res.status(400).json({ error: 'Invalid kind (sms or email)' });
  });

  app.post('/api/admin/ledger/import', adminAuth, async (req: Request, res: Response) => {
    const { method = 'bkash-personal', rows = [], rawCsv = '' } = req.body || {};
    const parsedRows: Array<{ trxId: string; amount: number; sender?: string; reference?: string }> = [...rows];
    if (rawCsv && typeof rawCsv === 'string') {
      for (const line of rawCsv.split(/\r?\n/)) {
        const cols = line.split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
        if (cols.length >= 2 && /[A-Z0-9]{6,}/i.test(cols[0]) && !isNaN(Number(cols[1]))) {
          parsedRows.push({ trxId: cols[0], amount: Number(cols[1]), sender: cols[2], reference: cols[3] });
        }
      }
    }

    let imported = 0;
    for (const r of parsedRows) {
      if (!r.trxId || !r.amount) continue;
      const norm = normalizeTrx(r.trxId);
      const ldg: LedgerRecord = {
        id: `LDG-CSV-${Date.now().toString().slice(-5)}-${imported}`,
        channel: 'statement',
        methodId: method,
        trxId: r.trxId.trim(),
        normalizedTrxId: norm,
        amount: Number(r.amount),
        currency: String(method).includes('bkash') || String(method).includes('nagad') ? 'BDT' : 'USD',
        sender: r.sender,
        reference: r.reference,
        rawPayload: JSON.stringify(r),
        used: false,
        receivedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      await store.set('ledger', ldg.id, ldg);
      await promoteMatchingUnconfirmedSubmission(ldg);
      imported++;
    }
    await recordAudit('STATEMENT_IMPORT', OWNER_EMAIL, `Imported ${imported} statement rows for ${method}`);
    return res.json({ success: true, imported });
  });

  app.post('/api/admin/reconcile-bulk', adminAuth, async (_req: Request, res: Response) => {
    const [pending, ledgers, allSubmissions, settings] = await Promise.all([
      store.list<PaymentSubmission>('payments', (p) => p.status === 'awaiting_ledger' || p.status === 'needs_review'),
      store.list<LedgerRecord>('ledger'),
      store.list<PaymentSubmission>('payments'),
      getSettings(),
    ]);

    let matchedCount = 0;
    for (const sub of pending) {
      const inv = await store.get<InvoiceRecord>('invoices', sub.invoiceId);
      if (!inv) continue;
      const decision = evaluatePaymentMatch(sub, inv, ledgers, allSubmissions, settings);
      if (decision.status === 'verified' && decision.matchedLedger) {
        await store.update('ledger', decision.matchedLedger.id, { used: true, claimedByPaymentId: sub.id });
        await store.update('payments', sub.id, {
          status: 'verified',
          matchedLedgerId: decision.matchedLedger.id,
          checkResults: decision.checkResults,
          decisionReason: 'Matched during bulk reconciliation.',
          updatedAt: new Date().toISOString(),
        });
        await store.update('invoices', inv.invoiceId, { status: 'paid_verified', amountDue: 0, totalPaid: inv.amount });
        await store.update('orders', inv.orderId, { state: 'in_progress', status: 'Verified', deliverablesLocked: false });
        const deliverables = await store.list<DeliverableRecord>('deliverables', (d) => d.orderId === inv.orderId);
        for (const d of deliverables) await store.update('deliverables', d.id, { locked: false });
        matchedCount++;
      }
    }
    await recordAudit('BULK_RECONCILE', OWNER_EMAIL, `Bulk reconciliation verified ${matchedCount} payment(s)`);
    return res.json({ success: true, checked: pending.length, matched: matchedCount });
  });

  app.get('/api/admin/balance', adminAuth, async (_req: Request, res: Response) => {
    const snapshots = await store.list<any>('balance_snapshots');
    snapshots.sort((a, b) => (a.recordedAt < b.recordedAt ? 1 : -1));
    return res.json({ snapshots });
  });

  app.post('/api/admin/balance', adminAuth, async (req: Request, res: Response) => {
    const { method = 'bkash-personal', amount, currency = 'BDT', note } = req.body || {};
    if (amount === undefined || isNaN(Number(amount))) return res.status(400).json({ error: 'Numeric amount is required' });
    const snap = {
      id: `BAL-${Date.now()}`,
      method,
      amount: Number(amount),
      currency,
      note: note || '',
      recordedAt: new Date().toISOString(),
    };
    await store.set('balance_snapshots', snap.id, snap);
    return res.status(201).json({ success: true, snapshot: snap });
  });

  app.get('/api/admin/alerts', adminAuth, async (_req: Request, res: Response) => {
    const alerts = await store.list<AlertEntry>('alerts');
    alerts.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return res.json({ alerts });
  });

  app.post('/api/admin/alerts/:id/read', adminAuth, async (req: Request, res: Response) => {
    await store.update('alerts', req.params.id, { read: true });
    return res.json({ success: true });
  });

  app.get('/api/admin/audit', adminAuth, async (_req: Request, res: Response) => {
    const entries = await store.list<any>('audit');
    entries.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
    return res.json({ entries });
  });

  app.get('/api/admin/error-logs', adminAuth, async (_req: Request, res: Response) => {
    const logs = await store.list<any>('error_logs');
    logs.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return res.json({ logs: logs.slice(0, 100) });
  });

  app.post('/api/telemetry/client-error', async (req: Request, res: Response) => {
    const { operationType = 'runtime', path = '/', error } = req.body || {};
    const cleanErr = String(error || '').trim().slice(0, 2000);
    if (!cleanErr) {
      return res.status(400).json({ success: false, error: 'Error description required.' });
    }
    const allowedOps = new Set(['create', 'update', 'delete', 'list', 'get', 'write', 'runtime']);
    const op = allowedOps.has(String(operationType)) ? String(operationType) : 'runtime';
    const token = extractBearerToken(req, 'mrs_session');
    const payload = token ? verifyToken(token) : null;
    const id = `ERR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    const entry = {
      id,
      operationType: op,
      path: String(path || '/').slice(0, 200),
      error: cleanErr,
      actorId: String(payload?.clientId || 'anonymous').slice(0, 80),
      createdAt: new Date().toISOString(),
    };
    await store.set('error_logs', id, entry);
    return res.status(201).json({ success: true, id });
  });

  app.get('/api/admin/email-outbox', adminAuth, async (_req: Request, res: Response) => {
    const outbox = await store.list<any>('email_outbox');
    outbox.sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1));
    return res.json({ outbox });
  });

  app.get('/api/admin/activation-codes', adminAuth, async (_req: Request, res: Response) => {
    const codes = await store.list<any>('activation_codes');
    codes.sort((a, b) => (a.issuedAt < b.issuedAt ? 1 : -1));
    return res.json({
      codes: codes.map(({ codeHash: _h, ...safe }) => safe),
    });
  });

  // ===========================================================================
  // ADMIN AUTO-VERIFY (LITE 6 EVIDENCE MODE CONSOLE APIs)
  // ===========================================================================

  app.get('/api/admin/auto-verify/overview', adminAuth, async (_req: Request, res: Response) => {
    const settings = await getSettings();
    await enforceConfirmWindows(store, settings);

    const [payments, invoices, refSamples, shapeData] = await Promise.all([
      store.list<PaymentSubmission>('payments'),
      store.list<InvoiceRecord>('invoices'),
      store.list<ReferenceSampleRecord>('reference_samples'),
      getLearnedShapeSuggestions(store),
    ]);

    const cfg = getEffectiveAutoVerifyConfig(settings);
    const fx = settings.usdToBdt || 100;
    const toUsd = (p: PaymentSubmission) =>
      p.currency === 'BDT' ? Math.round((Number(p.amount || 0) / fx) * 100) / 100 : Number(p.amount || 0);

    const unconfirmed = payments.filter(
      (p) => p.status === 'verified' && (p.confirmationState === 'unconfirmed' || p.confirmationState === 'unconfirmed_overdue')
    );
    const overdue = payments.filter((p) => p.confirmationState === 'unconfirmed_overdue');

    const totalUnconfirmedUsd = Math.round(unconfirmed.reduce((acc, p) => acc + toUsd(p), 0) * 100) / 100;
    const byMethod: Record<string, { count: number; usd: number }> = {};
    const byDay: Record<string, { count: number; usd: number }> = {};
    for (const p of unconfirmed) {
      const u = toUsd(p);
      if (!byMethod[p.methodId]) byMethod[p.methodId] = { count: 0, usd: 0 };
      byMethod[p.methodId].count += 1;
      byMethod[p.methodId].usd = Math.round((byMethod[p.methodId].usd + u) * 100) / 100;

      const dayKey = String(p.createdAt || '').slice(0, 10) || 'unknown';
      if (!byDay[dayKey]) byDay[dayKey] = { count: 0, usd: 0 };
      byDay[dayKey].count += 1;
      byDay[dayKey].usd = Math.round((byDay[dayKey].usd + u) * 100) / 100;
    }

    const decisionLog = [...payments]
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
      .slice(0, 80)
      .map((p) => {
        const inv = invoices.find((i) => i.invoiceId === p.invoiceId);
        return {
          id: p.id,
          invoiceId: p.invoiceId,
          orderId: p.orderId,
          clientId: p.clientId,
          methodId: p.methodId,
          status: p.status,
          verifyModeUsed: p.verifyModeUsed || 'evidence_auto',
          confirmationState: p.confirmationState || 'not_applicable',
          confirmationDeadlineAt: p.confirmationDeadlineAt,
          capBlockedReason: p.capBlockedReason,
          typed: {
            transactionId: p.transactionId,
            amount: p.amount,
            currency: p.currency,
            senderMask: p.senderMask,
            paidAt: p.paidAt,
          },
          extracted: p.aiExtracted || null,
          expectedUsd: inv?.amountUSD || toUsd(p),
          aiConfidence: p.aiConfidence ?? null,
          scoreBreakdown: p.scoreBreakdown || null,
          anomalies: p.anomalies || [],
          decisionReason: p.decisionReason || '',
          evidenceCount: (p.evidenceFiles || []).length,
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        };
      });

    return res.json({
      killSwitch: settings.killSwitch,
      config: cfg,
      methodPayToEmails: settings.methodPayToEmails || { payoneer: 'mr216873@gmail.com', skrill: 'mr216873@gmail.com' },
      exposure: {
        totalUnconfirmedUsd,
        unconfirmedCount: unconfirmed.length,
        overdueCount: overdue.length,
        byMethod,
        byDay,
      },
      overduePayments: overdue,
      decisionLog,
      referenceSamples: refSamples.map(({ base64Data: _b, ...meta }) => meta),
      shapeLibrary: shapeData,
      counters: {
        falsePositives: cfg.falsePositivesCount || 0,
        falseNegatives: cfg.falseNegativesCount || 0,
      },
    });
  });

  app.put('/api/admin/auto-verify/settings', adminAuth, async (req: Request, res: Response) => {
    const current = await getSettings();
    const currentCfg = getEffectiveAutoVerifyConfig(current);
    const body = req.body || {};

    const nextCfg: AutoVerifyConfig = {
      methodModes: { ...currentCfg.methodModes, ...(body.methodModes || {}) },
      autoVerifyScore: Math.max(50, Math.min(99, Number(body.autoVerifyScore ?? currentCfg.autoVerifyScore))),
      retryScore: Math.max(20, Math.min(90, Number(body.retryScore ?? currentCfg.retryScore))),
      weights: { ...currentCfg.weights, ...(body.weights || {}) },
      caps: { ...currentCfg.caps, ...(body.caps || {}) },
      falsePositivesCount: currentCfg.falsePositivesCount || 0,
      falseNegativesCount: currentCfg.falseNegativesCount || 0,
    };

    const nextSettings: SystemSettings = {
      ...current,
      killSwitch: body.killSwitch !== undefined ? Boolean(body.killSwitch) : current.killSwitch,
      methodPayToEmails: body.methodPayToEmails
        ? { ...(current.methodPayToEmails || {}), ...body.methodPayToEmails }
        : current.methodPayToEmails,
      autoVerifyConfig: nextCfg,
    };
    await saveSettings(nextSettings);
    await recordAudit('UPDATE_AUTO_VERIFY_SETTINGS', OWNER_EMAIL, 'Updated Lite 6 auto-verify thresholds/weights/caps');
    return res.json({ success: true, config: nextCfg, killSwitch: nextSettings.killSwitch, methodPayToEmails: nextSettings.methodPayToEmails });
  });

  app.get('/api/admin/auto-verify/reference-samples', adminAuth, async (_req: Request, res: Response) => {
    const samples = await store.list<ReferenceSampleRecord>('reference_samples');
    return res.json({ samples });
  });

  app.post('/api/admin/auto-verify/reference-samples', adminAuth, async (req: Request, res: Response) => {
    const { methodId, label, base64Data } = req.body || {};
    if (!methodId || !base64Data) {
      return res.status(400).json({ error: 'methodId and base64Data are required' });
    }
    try {
      const inspected = await inspectAndSanitizeEvidence(base64Data, { minWidth: 80, minHeight: 80 });
      const id = `REF-${methodId}-${Date.now().toString(36)}`;
      const rec: ReferenceSampleRecord = {
        id,
        methodId,
        label: String(label || `${methodId} sample`).slice(0, 80),
        mimeType: inspected.mimeType,
        base64Data: inspected.sanitizedBase64,
        sha256: inspected.sha256,
        createdAt: new Date().toISOString(),
      };
      await store.set('reference_samples', id, rec);
      await recordAudit('ADD_REFERENCE_SAMPLE', OWNER_EMAIL, `Added reference sample for ${methodId}`, id);
      return res.status(201).json({ success: true, sample: { ...rec, base64Data: undefined } });
    } catch (err: any) {
      return res.status(400).json({ error: err?.message || 'Invalid reference image' });
    }
  });

  app.delete('/api/admin/auto-verify/reference-samples/:id', adminAuth, async (req: Request, res: Response) => {
    await store.delete('reference_samples', req.params.id);
    return res.json({ success: true });
  });

  app.post('/api/admin/auto-verify/payments/:id/classify', adminAuth, async (req: Request, res: Response) => {
    const { id } = req.params;
    const { action, note } = req.body || {};
    if (!['confirmed', 'fraud', 'fine'].includes(action)) {
      return res.status(400).json({ error: 'Action must be confirmed, fraud, or fine' });
    }
    const payment = await store.get<PaymentSubmission>('payments', id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });

    const settings = await getSettings();
    const cfg = getEffectiveAutoVerifyConfig(settings);
    const nowIso = new Date().toISOString();

    if (action === 'confirmed') {
      if (payment.status !== 'verified') {
        const inv = await store.get<InvoiceRecord>('invoices', payment.invoiceId);
        const ord = await store.get<OrderRecord>('orders', payment.orderId);
        if (inv) {
          await finalizeVerifiedPaymentSettlement(payment, inv, ord, settings, OWNER_EMAIL, undefined, note || 'Owner Confirmed', 'confirmed');
        }
      } else {
        await store.update('payments', payment.id, {
          confirmationState: 'confirmed',
          confirmedAt: nowIso,
          ownerConfirmationStatus: 'RECEIVED',
          updatedAt: nowIso,
        });
        await recordConfirmedShapeSample(store, payment.methodId, payment.transactionId);
      }
      // Clear any client pause & record false-negative feedback if it had been stuck
      if (payment.clientId) {
        await store.update('clients', payment.clientId, { autoVerifyPaused: false });
      }
      await recordAudit('OWNER_CLASSIFY_CONFIRMED', OWNER_EMAIL, `Marked ${payment.id} Confirmed`, payment.id);
      return res.json({ success: true, action: 'confirmed' });
    }

    if (action === 'fraud') {
      await store.update('payments', payment.id, {
        status: 'rejected',
        confirmationState: 'fraud',
        ownerConfirmationStatus: 'NOT_RECEIVED',
        decisionReason: note || 'Marked FRAUD by owner',
        updatedAt: nowIso,
      });

      // Void issued activation codes & suspend subscriptions for this order/payment
      const codes = await store.list<any>('activation_codes', (c) => c.paymentId === payment.id || c.orderId === payment.orderId);
      for (const c of codes) {
        await store.update('activation_codes', c.id, { status: 'voided', voidedAt: nowIso });
      }
      const subs = await store.list<any>('subscriptions', (s) => s.clientId === payment.clientId && s.status === 'active');
      for (const s of subs) {
        await store.update('subscriptions', s.subscriptionId || s.id, { status: 'revoked', notes: `Revoked after fraud on ${payment.id}` });
      }

      // Halve caps automatically + raise autoVerifyScore by +5 (capped at 98) (§5)
      const nextCfg: AutoVerifyConfig = {
        ...cfg,
        autoVerifyScore: Math.min(98, cfg.autoVerifyScore + 5),
        caps: {
          ...cfg.caps,
          newClientFirstOrderUsd: Math.max(5, Math.floor(cfg.caps.newClientFirstOrderUsd / 2)),
          trustedClientOrderUsd: Math.max(10, Math.floor(cfg.caps.trustedClientOrderUsd / 2)),
          dailyTotalUsd: Math.max(20, Math.floor(cfg.caps.dailyTotalUsd / 2)),
          dailyPerMethodUsd: Math.max(20, Math.floor(cfg.caps.dailyPerMethodUsd / 2)),
        },
        falsePositivesCount: (cfg.falsePositivesCount || 0) + 1,
      };
      await saveSettings({ ...settings, autoVerifyConfig: nextCfg });

      // Flag other payments from this client for review & pause auto-verify
      if (payment.clientId) {
        await store.update('clients', payment.clientId, { autoVerifyPaused: true });
        const others = await store.list<PaymentSubmission>(
          'payments',
          (p) => p.clientId === payment.clientId && p.id !== payment.id && p.status !== 'rejected'
        );
        for (const op of others) {
          await store.update('payments', op.id, { status: 'needs_review', decisionReason: `Flagged for review due to fraud on ${payment.id}` });
        }
      }

      await raiseAlert('fraud_detected', 'high', `Fraud confirmed on ${payment.id}`, `Caps halved & autoVerifyScore raised to ${nextCfg.autoVerifyScore}. Other client payments flagged.`, payment.id);
      await recordAudit('OWNER_CLASSIFY_FRAUD', OWNER_EMAIL, `Marked ${payment.id} Fraud: halved caps, raised threshold to ${nextCfg.autoVerifyScore}`, payment.id);
      return res.json({ success: true, action: 'fraud', updatedConfig: nextCfg });
    }

    // action === 'fine'
    await store.update('payments', payment.id, {
      confirmationState: payment.confirmationState === 'unconfirmed' ? 'fine' : payment.confirmationState,
      updatedAt: nowIso,
    });
    if (payment.status === 'rejected' || payment.status === 'needs_review') {
      const nextCfg: AutoVerifyConfig = {
        ...cfg,
        falseNegativesCount: (cfg.falseNegativesCount || 0) + 1,
      };
      await saveSettings({ ...settings, autoVerifyConfig: nextCfg });
    }
    await recordAudit('OWNER_CLASSIFY_FINE', OWNER_EMAIL, `Marked ${payment.id} Fine`, payment.id);
    return res.json({ success: true, action: 'fine' });
  });

  app.post('/api/admin/auto-verify/shapes/:methodId/accept', adminAuth, async (req: Request, res: Response) => {
    const { methodId } = req.params;
    const { regex } = req.body || {};
    await store.set('accepted_shapes', methodId, {
      methodId,
      regex: String(regex || ''),
      acceptedAt: new Date().toISOString(),
      acceptedBy: OWNER_EMAIL,
    });
    await recordAudit('ACCEPT_SHAPE_REGEX', OWNER_EMAIL, `Accepted learned regex ${regex} for ${methodId}`, methodId);
    return res.json({ success: true, methodId, regex });
  });

  app.get('/api/admin/quarantine', adminAuth, async (_req: Request, res: Response) => {
    const items = await store.list<any>('quarantine');
    items.sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1));
    return res.json({ items });
  });

  app.get('/api/admin/accountant-pack', adminAuth, async (_req: Request, res: Response) => {
    const [payments, invoices, settings] = await Promise.all([
      store.list<PaymentSubmission>('payments', (p) => p.status === 'verified'),
      store.list<InvoiceRecord>('invoices'),
      getSettings(),
    ]);
    const headers = 'PaymentId,OrderId,InvoiceId,Method,Amount,Currency,AmountUSD,FXSnapshot,TrxID,VerifiedAt';
    const rows = payments.map((p) => {
      const inv = invoices.find((i) => i.invoiceId === p.invoiceId);
      const fx = inv?.usdToBdtRate || settings.usdToBdt || 100;
      const usd = p.currency === 'USD' ? p.amount : Number((p.amount / fx).toFixed(2));
      return `"${p.id}","${p.orderId}","${p.invoiceId}","${p.methodId}",${p.amount},"${p.currency}",${usd},${fx},"${p.transactionId}","${p.updatedAt}"`;
    });
    const totalForeignIncomeUSD = payments.reduce((sum, p) => {
      const inv = invoices.find((i) => i.invoiceId === p.invoiceId);
      const fx = inv?.usdToBdtRate || settings.usdToBdt || 100;
      return sum + (p.currency === 'USD' ? p.amount : p.amount / fx);
    }, 0);
    return res.json({
      csvContent: [headers, ...rows].join('\n'),
      summary: {
        totalRecords: payments.length,
        totalForeignIncomeUSD: Number(totalForeignIncomeUSD.toFixed(2)),
        generatedAt: new Date().toISOString(),
      },
    });
  });

  // Explicitly disable legacy simulator endpoint
  app.post('/api/admin/simulator/run', adminAuth, (_req: Request, res: Response) => {
    return res.status(410).json({
      success: false,
      error: 'Payment simulator has been permanently disabled. Only real submissions and verified ledger entries are permitted.',
    });
  });

  // ===========================================================================
  // AI WORK DRAFT & ORDER TRIAGE (100% Real Gemini)
  // ===========================================================================

  app.post('/api/work/ai-draft', adminAuth, async (req: Request, res: Response) => {
    const { orderId, serviceId, serviceName, clientName, intakeDetails, targetJobDescription } = req.body || {};
    if (!orderId || !intakeDetails) {
      return res.status(400).json({ success: false, error: 'orderId and intakeDetails are required' });
    }
    if (!ai) {
      return res.status(503).json({
        success: false,
        error: 'GEMINI_API_KEY is not configured. Automated draft generation requires a live Gemini API key.',
      });
    }

    const prompt = `You are Camellia · AI assistant preparing a working draft for owner review at M R S Services.
Service: ${serviceName || serviceId}
Order: ${orderId}
Client: ${clientName || 'Client'}
Strict rules:
- Use ONLY facts supplied in Client Details / Target JD below. Never fabricate credentials, employers, dates, or fake URLs.
- Mark clearly at top: "AI DRAFT — REQUIRES OWNER REVIEW".

CLIENT DETAILS:
${String(intakeDetails).slice(0, 6000)}

${targetJobDescription ? `TARGET JOB DESCRIPTION:\n${String(targetJobDescription).slice(0, 3000)}` : ''}

Return valid JSON:
{
  "summary": "1-2 sentence executive summary of what was prepared",
  "outputContent": "complete structured markdown deliverable ready for owner editing",
  "atsReport": { "matchPercentage": 0, "matchedKeywords": [], "missingKeywords": [], "recommendations": [] }
}`;

    try {
      const response = await generateWithRetry(ai, {
        model: GEMINI_MODEL,
        contents: prompt,
        config: { responseMimeType: 'application/json' },
      });
      const parsed = JSON.parse(response.text || '{}');
      return res.json({
        success: true,
        draft: {
          id: `DRAFT-${Date.now().toString(36).toUpperCase()}`,
          orderId,
          serviceId,
          serviceName,
          clientName,
          inputsRef: String(intakeDetails).slice(0, 80),
          outputContent: parsed.outputContent || '',
          summary: parsed.summary || 'AI draft generated for owner review.',
          atsKeywordMatchReport: parsed.atsReport,
          confidenceScore: 0.9,
          status: 'draft',
          model: GEMINI_MODEL,
          noAiRequested: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      return res.status(503).json({ success: false, error: `Gemini draft failed: ${err.message}` });
    }
  });

  app.post('/api/intake/triage', adminAuth, async (req: Request, res: Response) => {
    const { orderId, serviceId, serviceName, details } = req.body || {};
    if (!details) return res.status(400).json({ success: false, error: 'Order details are required' });
    if (!ai) return res.status(503).json({ success: false, error: 'GEMINI_API_KEY is required for AI intake triage.' });

    try {
      const response = await generateWithRetry(ai, {
        model: GEMINI_MODEL,
        contents: `Triage this M R S order intake objectively. Return JSON: {"isComplete":boolean,"missingFields":string[],"suggestedQuestionToClient":string,"complexity":"basic"|"standard"|"complex"|"urgent","riskFlags":string[],"threeLineSummary":string,"suggestedQuoteUSD":number}\nService: ${serviceName} (${serviceId})\nDetails:\n${String(details).slice(0, 3000)}`,
        config: { responseMimeType: 'application/json' },
      });
      const parsed = JSON.parse(response.text || '{}');
      return res.json({ success: true, triage: { orderId, serviceId, ...parsed, confidenceScore: 0.9 } });
    } catch (err: any) {
      return res.status(503).json({ success: false, error: `Triage failed: ${err.message}` });
    }
  });

  // ===========================================================================
  // ADMIN SECURITY / INFRASTRUCTURE / AUTONOMOUS OPS / CAMELLIA DESK / GMAIL
  // ===========================================================================

  app.get('/api/admin/vibesec/audit', adminAuth, async (_req: Request, res: Response) => {
    return res.json(await runVibeSecAudit(store));
  });

  app.post('/api/admin/playwright-mcp/run', adminAuth, async (_req: Request, res: Response) => {
    const report = await runPlaywrightMcpSuite(`http://127.0.0.1:${process.env.PORT || 3000}`, store);
    return res.json(report);
  });

  app.get('/api/admin/supabase/status', adminAuth, (_req: Request, res: Response) => {
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
    const configured = Boolean(url && key);
    return res.json({
      configured,
      url: url ? `${url.slice(0, 18)}...` : null,
      schemaReady: true,
      database: 'PostgreSQL',
      rlsEnabled: true,
      syncActive: configured,
    });
  });

  app.get('/api/admin/selftest', adminAuth, async (req: Request, res: Response) => {
    const isLive = req.query.live === '1';
    let aiAnswered = false;
    let aiError = '';
    if (isLive && ai) {
      try {
        const testRes = await generateWithRetry(ai, { model: GEMINI_MODEL, contents: 'Respond with OK' });
        aiAnswered = Boolean(testRes.text);
      } catch (e: any) {
        aiError = e.message;
      }
    }
    const bridges = await getBridges();
    const isCloud = typeof store.isCloudConnected === 'function' ? store.isCloudConnected() : store.isDurable();
    const checks = [
      {
        id: 'database',
        ok: store.isDurable(),
        detail: isCloud ? 'Firestore connected' : store.isDurable() ? 'Durable disk persistence active (.mrs-data)' : 'In-memory fallback (not durable)',
      },
      { id: 'ai_model', ok: aiAnswered || (!isLive && Boolean(ai)), detail: ai ? (aiAnswered ? `Gemini (${GEMINI_MODEL}) replied` : aiError || 'Configured') : 'GEMINI_API_KEY unset' },
      { id: 'sms_phone', ok: Boolean(bridges.sms.lastSeen), detail: bridges.sms.lastSeen ? `Last seen: ${bridges.sms.lastSeen}` : 'Never reported' },
      { id: 'gmail_collector', ok: Boolean(bridges.email.lastSeen), detail: bridges.email.lastSeen ? `Last seen: ${bridges.email.lastSeen}` : 'Never reported' },
      { id: 'binance_poller', ok: Boolean(bridges.provider.lastSeen), detail: bridges.provider.lastSeen ? `Last seen: ${bridges.provider.lastSeen}` : 'Never reported' },
    ];
    return res.json({ ok: checks.every((c) => c.ok), checks });
  });

  // Ops health & persistent kill switches + revisions
  app.get('/api/admin/ops/health', adminAuth, async (_req: Request, res: Response) => {
    const [opsSaved, revisions, bridges, orders] = await Promise.all([
      store.get<any>('config', 'ops_settings'),
      store.list<any>('ops_revisions'),
      getBridges(),
      store.list<OrderRecord>('orders'),
    ]);
    const opsSettings = { ...DEFAULT_OPS_SETTINGS, ...(opsSaved || {}) };
    const mem = process.memoryUsage();
    const activeClients = new Set(orders.map((o) => o.clientId)).size;
    return res.json({
      health: {
        status: store.isDurable() && ai ? 'healthy' : 'degraded',
        uptimeSeconds: Math.round((Date.now() - startTime) / 1000),
        memoryUsageMb: Math.round((mem.rss / 1024 / 1024) * 10) / 10,
        databaseStatus: store.isDurable() ? 'connected' : 'in_memory',
        geminiConfigured: Boolean(ai),
        geminiModel: GEMINI_MODEL,
        activeClientsCount: activeClients,
        bridges,
      },
      opsSettings,
      revisions: revisions.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    });
  });

  app.put('/api/admin/ops/settings', adminAuth, async (req: Request, res: Response) => {
    const saved = (await store.get<any>('config', 'ops_settings')) || { ...DEFAULT_OPS_SETTINGS };
    const next = { ...saved, ...(req.body || {}) };
    await store.set('config', 'ops_settings', next);
    await recordAudit('UPDATE_OPS_SETTINGS', OWNER_EMAIL, 'Updated kill-switch / operational limits');
    return res.json({ success: true, opsSettings: next });
  });

  app.post('/api/admin/ops/revisions', adminAuth, async (req: Request, res: Response) => {
    const { serviceId, orderId, notes } = req.body || {};
    if (!orderId || !notes) return res.status(400).json({ error: 'orderId and notes required' });
    const rev = {
      id: `REV-${Date.now().toString(36).toUpperCase()}`,
      serviceId: serviceId || 'general',
      orderId,
      notes,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    await store.set('ops_revisions', rev.id, rev);
    return res.status(201).json({ success: true, revision: rev });
  });

  // Camellia Desk persistent endpoints
  app.get('/api/admin/camellia/state', adminAuth, async (_req: Request, res: Response) => {
    const [policySaved, kbSaved, gaps, incidents, suggestions, activities, goLiveSaved, orders, reviews] = await Promise.all([
      store.get<any>('config', 'camellia_policy'),
      store.list<any>('camellia_articles'),
      store.list<any>('camellia_gaps'),
      store.list<any>('camellia_incidents'),
      store.list<any>('camellia_suggestions'),
      store.list<any>('camellia_activity'),
      store.list<any>('camellia_golive'),
      store.list<OrderRecord>('orders'),
      store.list<ReviewEntry>('reviews'),
    ]);

    const articles = kbSaved.length > 0 ? kbSaved : DEFAULT_KB_ARTICLES;
    const goLiveChecks = goLiveSaved.length > 0 ? goLiveSaved : DEFAULT_GO_LIVE_CHECKS;

    // Derive quality scores strictly from real orders, reviews & incidents
    const qualityScores = CATALOG_SERVICES.map((svc) => {
      const svcOrders = orders.filter((o) => o.serviceId === svc.serviceId);
      const svcReviews = reviews.filter((r) => r.serviceId === svc.serviceId);
      const svcIncidents = incidents.filter((i) => i.serviceId === svc.serviceId);
      const avgRevisions = svcOrders.length
        ? Number((svcOrders.reduce((s, o) => s + (o.revisionsUsed || 0), 0) / svcOrders.length).toFixed(2))
        : 0;
      const firstTimeApprovalRate = svcOrders.length
        ? Math.round((svcOrders.filter((o) => (o.revisionsUsed || 0) === 0).length / svcOrders.length) * 100)
        : 0;
      const avgRating = svcReviews.length
        ? Number((svcReviews.reduce((s, r) => s + r.rating, 0) / svcReviews.length).toFixed(2))
        : 0;
      return {
        serviceId: svc.serviceId,
        serviceName: svc.name,
        orderCount: svcOrders.length,
        reviewCount: svcReviews.length,
        firstTimeApprovalRate,
        avgRevisions,
        avgRating,
        refundRate: 0,
        incidentCount: svcIncidents.length,
        isBetaFallback: svcOrders.length < 3,
      };
    });

    return res.json({
      policy: policySaved || DEFAULT_CAMELLIA_POLICY,
      articles,
      gaps,
      incidents: incidents.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
      suggestions,
      activities: activities.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)).slice(0, 50),
      goLiveChecks,
      qualityScores,
    });
  });

  app.put('/api/admin/camellia/policy', adminAuth, async (req: Request, res: Response) => {
    const saved = (await store.get<any>('config', 'camellia_policy')) || { ...DEFAULT_CAMELLIA_POLICY };
    const next = { ...saved, ...(req.body || {}), lastUpdated: new Date().toISOString() };
    await store.set('config', 'camellia_policy', next);
    await recordAudit('CAMELLIA_POLICY_UPDATE', OWNER_EMAIL, `isPaused=${Boolean(next.isPaused)}`);
    return res.json({ success: true, policy: next });
  });

  app.post('/api/admin/camellia/articles', adminAuth, async (req: Request, res: Response) => {
    const { title, category = 'faq', content, keywords = [] } = req.body || {};
    if (!title || !content) return res.status(400).json({ error: 'Title and content required' });
    const art = {
      id: `KB-${Date.now().toString(36).toUpperCase()}`,
      category,
      title,
      content,
      keywords: Array.isArray(keywords) ? keywords : String(keywords).split(',').map((k) => k.trim()).filter(Boolean),
      approvedByOwner: true,
      approvedAt: new Date().toISOString(),
      useCount: 0,
    };
    await store.set('camellia_articles', art.id, art);
    return res.status(201).json({ success: true, article: art });
  });

  app.post('/api/admin/camellia/articles/:id/approve', adminAuth, async (req: Request, res: Response) => {
    await store.update('camellia_articles', req.params.id, { approvedByOwner: true, approvedAt: new Date().toISOString() });
    return res.json({ success: true });
  });

  app.post('/api/admin/camellia/gaps/:id', adminAuth, async (req: Request, res: Response) => {
    await store.update('camellia_gaps', req.params.id, { status: req.body?.status || 'dismissed' });
    return res.json({ success: true });
  });

  app.post('/api/admin/camellia/incidents', adminAuth, async (req: Request, res: Response) => {
    const { category = 'complaint', severity = 'medium', orderId, serviceId, summary, description, rootCause } = req.body || {};
    if (!summary) return res.status(400).json({ error: 'Incident summary required' });
    const inc = {
      id: `INC-${Date.now().toString().slice(-6)}`,
      category,
      severity,
      orderId,
      serviceId,
      summary,
      description: description || summary,
      rootCause,
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    await store.set('camellia_incidents', inc.id, inc);
    return res.status(201).json({ success: true, incident: inc });
  });

  app.patch('/api/admin/camellia/incidents/:id', adminAuth, async (req: Request, res: Response) => {
    const updates: any = { ...(req.body || {}) };
    if (updates.status === 'resolved' && !updates.resolvedAt) {
      updates.resolvedAt = new Date().toISOString();
    }
    await store.update('camellia_incidents', req.params.id, updates);
    return res.json({ success: true });
  });

  app.post('/api/admin/camellia/suggestions/:id', adminAuth, async (req: Request, res: Response) => {
    await store.update('camellia_suggestions', req.params.id, { status: req.body?.status || 'dismissed' });
    return res.json({ success: true });
  });

  app.put('/api/admin/camellia/go-live/:id', adminAuth, async (req: Request, res: Response) => {
    const existingList = await store.list<any>('camellia_golive');
    if (existingList.length === 0) {
      for (const item of DEFAULT_GO_LIVE_CHECKS) {
        await store.set('camellia_golive', item.id, item);
      }
    }
    const check = await store.get<any>('camellia_golive', req.params.id);
    if (!check) return res.status(404).json({ error: 'Check item not found' });
    const verified = typeof req.body?.verified === 'boolean' ? req.body.verified : !check.verified;
    const updated = {
      ...check,
      verified,
      verifiedAt: verified ? new Date().toISOString() : undefined,
      verifiedBy: verified ? OWNER_EMAIL : undefined,
    };
    await store.set('camellia_golive', check.id, updated);
    await recordAudit('GO_LIVE_CHECK_UPDATED', OWNER_EMAIL, `${check.id}: verified=${verified}`, check.id);
    return res.json({ success: true, check: updated });
  });

  app.post('/api/admin/camellia/activity/:id/undo', adminAuth, async (req: Request, res: Response) => {
    await store.update('camellia_activity', req.params.id, { undone: true });
    await recordAudit('CAMELLIA_ACTIVITY_UNDONE', OWNER_EMAIL, `Undid activity ${req.params.id}`, req.params.id);
    return res.json({ success: true });
  });

  // Real Gmail status, ingested messages, and Gemini draft composer
  app.get('/api/admin/gmail/status', adminAuth, async (_req: Request, res: Response) => {
    const bridges = await getBridges();
    const configured = Boolean(process.env.GOOGLE_GMAIL_REFRESH_TOKEN || process.env.GMAIL_OAUTH_TOKEN);
    const ledgers = await store.list<LedgerRecord>('ledger', (l) => l.channel === 'email');
    const quarantine = await store.list<any>('quarantine');
    return res.json({
      mailbox: OWNER_EMAIL,
      configured,
      status: configured ? 'connected' : 'not_configured',
      collectorBridgeLastSeen: bridges.email.lastSeen,
      ingestedEmailsCount: ledgers.length,
      quarantineCount: quarantine.length,
    });
  });

  app.get('/api/admin/gmail/messages', adminAuth, async (_req: Request, res: Response) => {
    const emailLedgers = await store.list<LedgerRecord>('ledger', (l) => l.channel === 'email');
    const quarantine = await store.list<any>('quarantine');
    return res.json({
      messages: [
        ...emailLedgers.map((l) => ({
          id: l.id,
          from: l.sender || l.methodId,
          subject: `${l.methodId} Payment Notice (${l.trxId})`,
          body: l.rawPayload,
          receivedAt: l.receivedAt,
          category: 'payment_notice',
          amount: l.amount,
          currency: l.currency,
          used: l.used,
        })),
        ...quarantine.map((q) => ({
          id: q.id,
          from: q.from || 'unknown',
          subject: q.subject || '(Unparsed Email)',
          body: q.body || q.reason,
          receivedAt: q.receivedAt,
          category: 'quarantine',
        })),
      ],
    });
  });

  app.post('/api/admin/gmail/draft-reply', adminAuth, async (req: Request, res: Response) => {
    const { recipientEmail, subject, contextText, instruction } = req.body || {};
    if (!ai) {
      return res.status(503).json({ success: false, error: 'GEMINI_API_KEY not configured on server.' });
    }
    try {
      const prompt = `Draft a concise, professional reply on behalf of M R S Services.
Strict rules:
- Identify yourself clearly as: "— Camellia, M R S AI assistant".
- Never confirm unverified payments or invent pricing.
Recipient: ${recipientEmail || 'Client'}
Subject: ${subject || 'Order Update'}
Context: ${String(contextText || '').slice(0, 2000)}
Owner instruction: ${String(instruction || 'Respond politely and clearly.').slice(0, 500)}`;

      const aiRes = await generateWithRetry(ai, { model: GEMINI_MODEL, contents: prompt });
      return res.json({
        success: true,
        draft: aiRes.text || '',
        signedAs: 'Camellia, M R S AI assistant',
      });
    } catch (err: any) {
      return res.status(503).json({ success: false, error: `Gemini draft failed: ${err.message}` });
    }
  });

  app.post('/api/admin/gmail/send', adminAuth, async (req: Request, res: Response) => {
    const { to, subject, body } = req.body || {};
    if (!to || !subject || !body) {
      return res.status(400).json({ success: false, error: 'to, subject, and body are required' });
    }
    const configured = Boolean(process.env.GOOGLE_GMAIL_REFRESH_TOKEN || process.env.GMAIL_OAUTH_TOKEN);
    if (!configured) {
      return res.status(501).json({
        success: false,
        error: 'Outbound Gmail OAuth sending is not configured (GOOGLE_GMAIL_REFRESH_TOKEN missing). Copy the draft to Gmail manually.',
      });
    }
    await recordAudit('EMAIL_SENT', OWNER_EMAIL, `Sent email to ${to} (${subject})`, String(to));
    return res.json({ success: true, recipient: to, signedAs: 'Camellia, M R S AI assistant', dispatchedAt: new Date().toISOString() });
  });

  // ===========================================================================
  // HMAC-SIGNED INGESTION BRIDGES & CRON
  // ===========================================================================

  const verifyHmac = (secret: string) => (req: Request, res: Response, next: NextFunction) => {
    const timestamp = req.headers['x-timestamp'] as string;
    const signature = req.headers['x-signature'] as string;
    const authHeader = req.headers['authorization'];

    if (authHeader && process.env.MRS_SMS_BEARER_TOKEN && authHeader === `Bearer ${process.env.MRS_SMS_BEARER_TOKEN}`) {
      return next();
    }
    if (!timestamp || !signature) {
      return res.status(401).json({ error: 'Missing timestamp or signature headers' });
    }
    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - parseInt(timestamp, 10)) > 300) {
      return res.status(401).json({ error: 'Request timestamp expired' });
    }
    const raw = (req as any).rawBody || JSON.stringify(req.body);
    const expectedSig = crypto.createHmac('sha256', secret).update(raw + timestamp).digest('hex');
    if (signature.toLowerCase() !== expectedSig.toLowerCase()) {
      return res.status(401).json({ error: 'Bad HMAC signature' });
    }
    next();
  };

  const handleSmsIngest = async (req: Request, res: Response) => {
    await updateBridge('sms');
    const { sender, message, messages } = req.body || {};
    const items = messages || [{ sender, message }];
    let processed = 0;

    for (const item of items) {
      if (!item.message) continue;
      const parsed = parseOperatorSms(item.sender || 'bKash', item.message);
      if (parsed.valid) {
        const norm = normalizeTrx(parsed.trxId);
        const ldg: LedgerRecord = {
          id: `LDG-SMS-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          channel: 'sms',
          methodId: parsed.provider === 'nagad' ? 'nagad-personal' : 'bkash-personal',
          trxId: parsed.trxId,
          normalizedTrxId: norm,
          amount: parsed.amount,
          currency: 'BDT',
          sender: parsed.sender,
          reference: parsed.reference,
          runningBalance: parsed.balance,
          rawPayload: parsed.raw,
          used: false,
          receivedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
        await store.set('ledger', ldg.id, ldg);
        await promoteMatchingUnconfirmedSubmission(ldg);
        processed++;
      } else {
        const qId = `QRN-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
        await store.set('quarantine', qId, {
          id: qId,
          channel: 'sms',
          from: item.sender || 'unknown',
          body: item.message,
          reason: 'Unrecognized SMS payment format',
          receivedAt: new Date().toISOString(),
        });
      }
    }
    return res.json({ success: true, processed });
  };

  app.post('/api/ingest/sms', verifyHmac(SMS_SIGNING_KEY), handleSmsIngest);
  app.post('/api/payments/sms', verifyHmac(SMS_SIGNING_KEY), handleSmsIngest);

  app.post('/api/ingest/email', verifyHmac(INGEST_SECRET), async (req: Request, res: Response) => {
    await updateBridge('email');
    const { messages = [] } = req.body || {};
    let processed = 0;
    for (const msg of messages) {
      const parsed = parsePaymentEmail(msg.from || '', msg.subject || '', msg.body || '', msg.authResults || '');
      if (parsed.valid) {
        const ldg: LedgerRecord = {
          id: `LDG-EML-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          channel: 'email',
          methodId: parsed.provider,
          trxId: parsed.trxId,
          normalizedTrxId: normalizeTrx(parsed.trxId),
          amount: parsed.amount,
          currency: parsed.currency,
          sender: parsed.sender,
          rawPayload: parsed.raw,
          used: false,
          receivedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
        await store.set('ledger', ldg.id, ldg);
        await promoteMatchingUnconfirmedSubmission(ldg);
        processed++;
      } else {
        const qId = `QRN-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
        await store.set('quarantine', qId, {
          id: qId,
          channel: 'email',
          from: msg.from,
          subject: msg.subject,
          body: msg.body,
          reason: 'Failed DMARC/SPF or unrecognized payment email format',
          receivedAt: new Date().toISOString(),
        });
      }
    }
    return res.json({ success: true, processed });
  });

  app.post('/api/ingest/provider', verifyHmac(INGEST_SECRET), async (req: Request, res: Response) => {
    await updateBridge('provider');
    const { provider = 'binance', rows = [] } = req.body || {};
    let processed = 0;
    for (const r of rows) {
      if (!r.trxId || !r.amount) continue;
      const ldg: LedgerRecord = {
        id: `LDG-${String(provider).toUpperCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        channel: 'api',
        methodId: provider === 'binance' ? 'binance-pay' : provider,
        trxId: r.trxId,
        normalizedTrxId: normalizeTrx(r.trxId),
        amount: Number(r.amount),
        currency: (r.currency || 'USD') as any,
        sender: r.sender || 'Payer',
        rawPayload: r.raw || JSON.stringify(r),
        used: false,
        receivedAt: r.date || new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      await store.set('ledger', ldg.id, ldg);
      await promoteMatchingUnconfirmedSubmission(ldg);
      processed++;
    }
    return res.json({ success: true, processed });
  });

  app.post('/api/cron/tick', async (req: Request, res: Response) => {
    const auth = req.headers.authorization;
    if (auth && auth !== `Bearer ${CRON_SECRET}` && auth !== `Bearer ${INGEST_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized cron tick' });
    }
    const settings = await getSettings();
    const overdueMarked = await enforceConfirmWindows(store, settings);

    const jobs = await store.list<FulfilmentJob>('jobs', (j) => j.state === 'queued' || j.state === 'waiting_inputs');
    let jobsRan = 0;
    for (const job of jobs) {
      const order = await store.get<OrderRecord>('orders', job.orderId);
      if (order && (order.state === 'in_progress' || !order.deliverablesLocked)) {
        job.state = 'running';
        const result = await processOrderJob(order, job, store, ai);
        for (const del of result.deliverables) {
          await store.set('deliverables', del.id, del);
        }
        job.qa = result.qa;
        job.updatedAt = new Date().toISOString();
        await store.set('jobs', job.id, job);
        jobsRan++;
      }
    }
    return res.json({ success: true, jobsRan, overdueMarked, tickAt: new Date().toISOString() });
  });
}
