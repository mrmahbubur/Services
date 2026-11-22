import { CATALOG_SERVICES } from '../orders/catalog.ts';

export interface Context7Dimension {
  dimensionNumber: number;
  id: string;
  title: string;
  summary: string;
  status: 'active' | 'enforced' | 'synced';
  attributes: Record<string, any>;
  lastValidated: string;
}

export interface Context7Manifest {
  version: '2.0.0';
  systemName: 'M R S Autonomous Platform';
  framework: 'Context7';
  dimensions: Context7Dimension[];
  runtimeGroundingPrompt: string;
  generatedAt: string;
}

export function buildContext7Manifest(): Context7Manifest {
  const now = new Date().toISOString();

  const dimensions: Context7Dimension[] = [
    {
      dimensionNumber: 1,
      id: 'dim1_identity_constitution',
      title: 'Identity & Operating Constitution',
      summary: 'Legal identity, direct owner authority, and anti-hallucination boundaries for M R S Services.',
      status: 'enforced',
      attributes: {
        businessName: 'M R S Services',
        ownerName: 'Md. Mahbubur Rahman',
        ownerEmail: 'mr216873@gmail.com',
        ownerWhatsApp: '+8801810853282',
        aiAssistant: 'Camellia · AI assistant (Concierge & Technical Guidance)',
        strictBoundary: 'No fictitious pricing, no mock confirmations, no human impersonation.',
      },
      lastValidated: now,
    },
    {
      dimensionNumber: 2,
      id: 'dim2_authoritative_catalog',
      title: 'Authoritative Service Catalog',
      summary: '16 production services across Career, Infrastructure, Growth, and IPTV with structured intake specifications.',
      status: 'active',
      attributes: {
        totalServices: CATALOG_SERVICES.length,
        services: CATALOG_SERVICES.map((s) => ({
          code: s.serviceId,
          name: s.name,
          category: s.category,
          rateUSD: s.rateUSD,
          turnaroundDays: s.turnaroundDays,
        })),
      },
      lastValidated: now,
    },
    {
      dimensionNumber: 3,
      id: 'dim3_payment_registry_5b',
      title: 'Section 5B Authoritative Payment Registry',
      summary: 'Signed receiving accounts. Clients receive country-specific routing (BD: BDT, International: USD).',
      status: 'enforced',
      attributes: {
        localBD: [
          { method: 'bKash (Personal)', number: '01810853282' },
          { method: 'Nagad (Personal)', number: '01810853282' },
        ],
        internationalUSD: [
          { method: 'Binance Pay', uid: '38927942', id: 'mrxshahn' },
          { method: 'Payoneer', customerId: '108003450' },
          { method: 'Skrill', customerId: '407108385' },
        ],
        retiredBlacklist: ['01792322734'],
        hashAlgorithm: 'SHA-256',
      },
      lastValidated: now,
    },
    {
      dimensionNumber: 4,
      id: 'dim4_security_vibe_sec',
      title: 'VibeSec Cryptographic Invariants',
      summary: 'Zero client-side secrets, HMAC webhook validation, and 5-strike PIN lockout security.',
      status: 'enforced',
      attributes: {
        firestoreSecurityRules: 'Locked (read/write false)',
        clientAuth: '6-digit PIN with PBKDF2/SHA-256 hash',
        maxLoginAttempts: 5,
        lockoutDurationMinutes: 15,
        webhookSignatures: 'HMAC-SHA256 with timestamp replay window',
      },
      lastValidated: now,
    },
    {
      dimensionNumber: 5,
      id: 'dim5_fulfillment_engine',
      title: 'Deterministic Work & QA Engine',
      summary: 'Automated fulfillment pipelines (S-MRS-06 CV ATS, S-MRS-02 Writing, S-MRS-11 Data Entry).',
      status: 'active',
      attributes: {
        model: process.env.MRS_GEMINI_MODEL || 'gemini-2.5-flash',
        qaChecks: ['ATS Format Integrity', 'Spell & Grammar', 'Credential Fidelity', 'Deliverable Format'],
        deliverablesLockedUntilPaid: true,
      },
      lastValidated: now,
    },
    {
      dimensionNumber: 6,
      id: 'dim6_telemetry_ledger',
      title: 'Real-Time Statement Ledger',
      summary: 'Automated statement matching from SIM SMS forwarders, Binance API, and DMARC Gmail collector.',
      status: 'synced',
      attributes: {
        supportedParsers: ['bKash SMS', 'Nagad SMS', 'Binance Pay IPN', 'Gmail DMARC Collector'],
        reconciliationToleranceUSD: 0.05,
        deduplicationKey: 'method:transactionId',
      },
      lastValidated: now,
    },
    {
      dimensionNumber: 7,
      id: 'dim7_autonomy_safeguards',
      title: 'Autonomous Policy & Owner Safeguards',
      summary: 'Autonomous operations handed to Camellia · AI assistant with owner circuit breakers, reversal buttons, and large-order gates.',
      status: 'active',
      attributes: {
        largeOrderHoldThresholdUSD: 50,
        killSwitches: ['Auto-Verify Kill Switch', 'Fulfillment Queue Pause', 'Crypto Payments Default OFF'],
        reversalsSupported: true,
      },
      lastValidated: now,
    },
  ];

  const runtimeGroundingPrompt = `System Operating Context (Context7 v2.0):
You are Camellia · AI assistant for M R S Services (Concierge & Technical Guidance). Always disclose that you are an AI assistant for M R S Services and never impersonate a human.
- Business Owner & Account Holder: Md. Mahbubur Rahman (mr216873@gmail.com, WhatsApp: +8801810853282).
- Official Payments: BD uses bKash Personal / Nagad Personal (01810853282). International uses Payoneer (108003450 / mr216873@gmail.com), Skrill (407108385 / mr216873@gmail.com), and Binance Pay only when enabled (UID 38927942 / mrxshahn).
- Never claim a payment is verified unless confirmed in the database. Never request passwords or API keys in public chat.
- Locked deliverables unlock only when payment is verified in the statement ledger.`;

  return {
    version: '2.0.0',
    systemName: 'M R S Autonomous Platform',
    framework: 'Context7',
    dimensions,
    runtimeGroundingPrompt,
    generatedAt: now,
  };
}
