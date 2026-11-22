// Payment Verification Service - Business Logic, Parsing, Scoring, and Verification
import {
  PaymentMethodConfigV2,
  PaymentAccountV2,
  PaymentIntentV2,
  PaymentSubmissionV2,
  LedgerEntryV2,
  MatchCandidateV2,
  VerificationDecisionV2,
  PaymentVerificationSettingsV2,
  AuditLogItemV2,
} from '../types/paymentVerification';

export const DEFAULT_PAYMENT_VERIFICATION_SETTINGS: PaymentVerificationSettingsV2 = {
  ledgerWaitWindowHours: 6,
  reviewWindowDays: 7,
  intentExpiryHours: 48,
  slaHours: 4,
  amountToleranceBps: 100, // 1%
  amountToleranceFixedMinor: 0,
  timeToleranceMinutes: 15,
  autoVerifyLimitsUsd: {
    sms: 50,
    email: 50,
    chain: 500,
    statement: 999999,
    manual: 999999,
  },
  riskThresholdAuto: 30,
  riskThresholdReview: 60,
  minConfirmations: {
    trc20: 19,
    bep20: 15,
    erc20: 12,
    btc: 2,
  },
  stepUpAmountUsd: 200,
  smsStaleHours: 6,
  maxSubmissionsPerInvoice: 5,
  autoVerifySources: {
    sms: true,
    email: true,
    chain: true,
    statement: true,
    manual: true,
  },
  killSwitch: false,
  smsSecret: 'mrs_live_bridge_secret_2026',
};

export const SEEDED_PAYMENT_METHODS: PaymentMethodConfigV2[] = [
  {
    key: 'bkash',
    label: 'bKash Personal',
    type: 'mobile_banking',
    currency: 'BDT',
    active: true,
    instructions: 'Send Money to bKash Personal 01810853282. Enter your Order ID in the reference field.',
    feeNote: 'Sender pays all bKash Send Money fees; full invoice amount must arrive.',
    trxIdPattern: '^[A-Z0-9]{8,12}$',
    senderFieldLabel: 'Sender bKash Mobile (e.g. 01711...)',
    requiresScreenshot: true,
    autoVerifySources: ['statement_import', 'manual_entry', 'sms_bridge'],
    minAmountMinor: 10000, // 100 BDT
    sortOrder: 1,
  },
  {
    key: 'nagad',
    label: 'Nagad Personal',
    type: 'mobile_banking',
    currency: 'BDT',
    active: true,
    instructions: 'Send Money to Nagad Personal 01810853282. Enter your Order ID in the note field.',
    feeNote: 'Sender covers cash-out/send-money fees; full invoice amount must arrive.',
    trxIdPattern: '^[A-Z0-9]{8,10}$',
    senderFieldLabel: 'Sender Nagad Number (e.g. 01810...)',
    requiresScreenshot: true,
    autoVerifySources: ['statement_import', 'manual_entry', 'sms_bridge'],
    minAmountMinor: 10000,
    sortOrder: 2,
  },
  {
    key: 'binance_pay',
    label: 'Binance (Binance Pay)',
    type: 'crypto',
    currency: 'USD',
    active: true,
    instructions: 'Internal Binance Pay: Send exact USDT amount to Binance UID 38927942 or Binance ID mrxshahn.',
    feeNote: 'Binance Pay internal transfers have 0 fees. Full USD/USDT invoice amount must arrive.',
    trxIdPattern: '^[A-Za-z0-9\\-]{8,32}$',
    senderFieldLabel: 'Sender Binance UID or Pay ID',
    requiresScreenshot: true,
    autoVerifySources: ['statement_import', 'manual_entry'],
    minAmountMinor: 500, // $5.00
    sortOrder: 3,
  },
  {
    key: 'payoneer',
    label: 'Payoneer (USD)',
    type: 'card',
    currency: 'USD',
    active: true,
    instructions: 'Send USD to Payoneer Customer ID 108003450 or email mr216873@gmail.com with Order ID in payment note.',
    feeNote: 'Sender covers any transfer fees; full invoice amount must arrive.',
    trxIdPattern: '^[0-9]{7,15}$',
    senderFieldLabel: 'Sender Payoneer Email or Customer ID',
    requiresScreenshot: true,
    autoVerifySources: ['statement_import', 'manual_entry'],
    minAmountMinor: 500,
    sortOrder: 4,
  },
  {
    key: 'skrill',
    label: 'Skrill (USD)',
    type: 'card',
    currency: 'USD',
    active: true,
    instructions: 'Send money to Skrill Customer ID 407108385 or email mr216873@gmail.com with Order ID in reference note.',
    feeNote: 'Sender covers Skrill transfer fees; full invoice amount must arrive.',
    trxIdPattern: '^[0-9]{8,15}$',
    senderFieldLabel: 'Sender Skrill Email or Customer ID',
    requiresScreenshot: true,
    autoVerifySources: ['statement_import', 'manual_entry'],
    minAmountMinor: 500,
    sortOrder: 5,
  },
];

export const SEEDED_PAYMENT_ACCOUNTS: PaymentAccountV2[] = [
  {
    id: 'ACC-BKASH-01',
    methodKey: 'bkash',
    accountName: 'bKash Personal Primary',
    displayValue: '01810853282',
    accountType: 'Personal',
    qrImage: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=bkash://sendmoney?account=01810853282',
    providerSenderIds: ['bKash', '16247'],
    active: true,
    weight: 100,
  },
  {
    id: 'ACC-NAGAD-01',
    methodKey: 'nagad',
    accountName: 'Nagad Personal Primary',
    displayValue: '01810853282',
    accountType: 'Personal',
    qrImage: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=nagad://sendmoney?account=01810853282',
    providerSenderIds: ['Nagad', '16167'],
    active: true,
    weight: 100,
  },
  {
    id: 'ACC-BINANCE-01',
    methodKey: 'binance_pay',
    accountName: 'Binance Pay Primary (Internal)',
    displayValue: 'UID: 38927942 (ID: mrxshahn)',
    accountType: 'CryptoWallet',
    network: 'Internal Binance Pay (USDT)',
    providerSenderIds: ['BINANCE_PAY', 'Binance'],
    active: true,
    weight: 100,
  },
  {
    id: 'ACC-PAYONEER-01',
    methodKey: 'payoneer',
    accountName: 'Payoneer USD Operations',
    displayValue: 'Customer ID: 108003450',
    accountType: 'Checking',
    providerSenderIds: ['Payoneer'],
    active: true,
    weight: 100,
  },
  {
    id: 'ACC-SKRILL-01',
    methodKey: 'skrill',
    accountName: 'Skrill USD Primary',
    displayValue: 'Customer ID: 407108385',
    accountType: 'Checking',
    providerSenderIds: ['Skrill'],
    active: true,
    weight: 100,
  },
];

// Section 5A.4 Mandatory Receiver Rules
export interface ReceiverVerificationRule {
  methodKey: string;
  expectedReceivers: string[];
  expectedType?: string; // e.g. "Send Money"
  expectedStatus: string[];
}

export const OFFICIAL_RECEIVER_RULES: Record<string, ReceiverVerificationRule> = {
  bkash: {
    methodKey: 'bkash',
    expectedReceivers: ['01810853282', '+8801810853282'],
    expectedType: 'Send Money',
    expectedStatus: ['Successful', 'Completed'],
  },
  nagad: {
    methodKey: 'nagad',
    expectedReceivers: ['01810853282', '+8801810853282'],
    expectedType: 'Send Money',
    expectedStatus: ['Successful', 'Completed'],
  },
  binance_pay: {
    methodKey: 'binance_pay',
    expectedReceivers: ['38927942', 'mrxshahn'],
    expectedStatus: ['Successful', 'Completed'],
  },
  payoneer: {
    methodKey: 'payoneer',
    expectedReceivers: ['108003450', 'mr216873@gmail.com'],
    expectedStatus: ['Completed', 'Successful'],
  },
  skrill: {
    methodKey: 'skrill',
    expectedReceivers: ['407108385', 'mr216873@gmail.com'],
    expectedStatus: ['Processed', 'Completed', 'Successful'],
  },
};

export function verifyReceiverDetails(
  methodKey: string,
  parsedReceiver?: string,
  transactionType?: string,
  transactionStatus?: string
): { passed: boolean; reason?: string } {
  const rule = OFFICIAL_RECEIVER_RULES[methodKey];
  if (!rule) return { passed: true };

  if (!parsedReceiver) {
    return {
      passed: false,
      reason: 'Receiver detail missing, unreadable, or masked in evidence. Route to MANUAL VERIFICATION.',
    };
  }

  const cleanReceiver = parsedReceiver.replace(/\s+/g, '').toLowerCase();
  const receiverMatches = rule.expectedReceivers.some((r) => cleanReceiver.includes(r.toLowerCase()));
  if (!receiverMatches) {
    return {
      passed: false,
      reason: `Receiver mismatch: found "${parsedReceiver}", expected official account "${rule.expectedReceivers[0]}".`,
    };
  }

  if (rule.expectedType && transactionType) {
    const cleanType = transactionType.toLowerCase();
    if (!cleanType.includes('send') && !cleanType.includes('send money') && !cleanType.includes('transfer')) {
      return {
        passed: false,
        reason: `Invalid transaction type: "${transactionType}". Must be "${rule.expectedType}".`,
      };
    }
  }

  if (transactionStatus && rule.expectedStatus.length > 0) {
    const cleanStatus = transactionStatus.toLowerCase();
    const statusMatches = rule.expectedStatus.some((s) => cleanStatus.includes(s.toLowerCase()));
    if (!statusMatches) {
      return {
        passed: false,
        reason: `Transaction status is not confirmed: "${transactionStatus}". Must be Successful/Completed.`,
      };
    }
  }

  return { passed: true };
}

// ------------------------------------------------------------------------------
// Money & Normalization Helpers
// ------------------------------------------------------------------------------
export function toMinorUnits(majorAmount: number): number {
  return Math.round(majorAmount * 100);
}

export function toMajorUnits(minorAmount: number): number {
  return minorAmount / 100;
}

export function formatMoney(minorAmount: number, currency: 'USD' | 'BDT'): string {
  const major = toMajorUnits(minorAmount);
  if (currency === 'USD') {
    return `$${major.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  }
  return `${major.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TK`;
}

export function normalizeTrxId(raw: string, method: string): string {
  const clean = raw.trim();
  if (method.includes('bep20') || method.includes('erc20') || clean.startsWith('0x')) {
    return clean.toLowerCase();
  }
  return clean.toUpperCase();
}

// ------------------------------------------------------------------------------
// Intent Generator
// ------------------------------------------------------------------------------
export function createPaymentIntentsForInvoice(
  invoiceId: string,
  amountUSD: number,
  rateSnapshot: number,
  openIntentsForWalletCount = 0
): PaymentIntentV2[] {
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  const refNumber = invoiceId.replace('INV-', '');
  const referenceCode = `PAY-${refNumber}`;

  return SEEDED_PAYMENT_METHODS.filter((m) => m.active).map((method) => {
    const account = SEEDED_PAYMENT_ACCOUNTS.find((a) => a.methodKey === method.key && a.active) || SEEDED_PAYMENT_ACCOUNTS[0];

    const isBDT = method.currency === 'BDT';
    const amountMajor = isBDT ? Math.round(amountUSD * rateSnapshot) : amountUSD;
    const amountDueMinor = toMinorUnits(amountMajor);

    // Crypto uniqueAmountMinor: invoice amount + tiny deterministic fractional offset (e.g. + 0.001 - 0.009 USD)
    let uniqueAmountMinor: number | undefined = undefined;
    if (method.type === 'crypto') {
      const uniqueOffset = ((openIntentsForWalletCount % 9) + 1); // +1 to +9 cents/points
      uniqueAmountMinor = amountDueMinor + uniqueOffset;
    }

    return {
      id: `INT-${Date.now().toString().slice(-6)}-${method.key.slice(0, 4)}`,
      invoiceId,
      method: method.key,
      accountId: account.id,
      amountDueMinor,
      uniqueAmountMinor,
      currency: method.currency,
      referenceCode,
      expiresAt,
      rateSnapshot,
      createdAt: new Date().toISOString(),
    };
  });
}

// ------------------------------------------------------------------------------
// Scoring Engine (Section 9 of Specification)
// ------------------------------------------------------------------------------
export function scoreMatch(
  submission: PaymentSubmissionV2,
  candidate: LedgerEntryV2,
  toleranceMinor: number = 0
): { score: number; reasons: string[]; outcome: 'matched_exact' | 'matched_probable' | 'needs_review' } {
  let score = 0;
  const reasons: string[] = [];

  // Hard filters
  if (submission.method !== candidate.method) {
    return { score: 0, reasons: ['Method mismatch'], outcome: 'needs_review' };
  }
  if (candidate.status === 'consumed') {
    return { score: 0, reasons: ['Ledger entry already consumed by another payment'], outcome: 'needs_review' };
  }
  if (submission.currency !== candidate.currency) {
    return { score: 0, reasons: ['Currency mismatch'], outcome: 'needs_review' };
  }

  // 1. trxKey exact match: +50
  if (submission.trxKey === candidate.trxKey) {
    score += 50;
    reasons.push('Transaction ID exactly matches (+50)');
  }

  // 2. Reference code found in ledger rawMasked note: +20
  const refCode = submission.idempotencyKey || submission.invoiceId.replace('INV-', 'PAY-');
  if (candidate.rawMasked.includes(refCode)) {
    score += 20;
    reasons.push(`Reference code ${refCode} found in provider raw record (+20)`);
  }

  // 3. Amount comparison
  const diff = candidate.amountMinor - submission.amountMinor;
  if (candidate.amountMinor === submission.amountMinor) {
    score += 15;
    reasons.push('Amount received exactly matches invoice amount (+15)');
  } else if (diff >= -toleranceMinor && diff < 0) {
    score += 8;
    reasons.push(`Amount received within allowed tolerance window (+8, diff: ${diff})`);
  } else if (diff > 0) {
    score += 5;
    reasons.push(`Overpayment received (+5, surplus: ${diff})`);
  } else {
    score -= 20;
    reasons.push(`Underpayment: short by ${Math.abs(diff)} minor units (-20)`);
  }

  // 4. Destination account match: +8
  if (submission.accountId === candidate.accountId) {
    score += 8;
    reasons.push('Destination account matches configured target (+8)');
  }

  // 5. Time window: receivedAt within ±15 min of submission paidAt: +5; outside: -15
  const subTime = new Date(submission.paidAt).getTime();
  const candTime = new Date(candidate.receivedAt).getTime();
  const minutesDiff = Math.abs(subTime - candTime) / (60 * 1000);

  if (minutesDiff <= 30) {
    score += 5;
    reasons.push(`Timestamp within expected window (${Math.round(minutesDiff)}m diff, +5)`);
  } else if (minutesDiff > 1440) {
    score -= 15;
    reasons.push(`Timestamp outside standard window (${Math.round(minutesDiff / 60)}h diff, -15)`);
  }

  // 6. Sender mask match: +2
  if (submission.senderMask && candidate.senderMask && candidate.senderMask.includes(submission.senderMask)) {
    score += 2;
    reasons.push('Sender account mask matches (+2)');
  }

  // Determine outcome
  let outcome: 'matched_exact' | 'matched_probable' | 'needs_review' = 'needs_review';
  if (submission.trxKey === candidate.trxKey && candidate.amountMinor >= submission.amountMinor - toleranceMinor && score >= 80) {
    outcome = 'matched_exact';
  } else if (score >= 55) {
    outcome = 'matched_probable';
  }

  return { score: Math.max(0, Math.min(100, score)), reasons, outcome };
}

// ------------------------------------------------------------------------------
// Risk Scoring Engine (Section 10)
// ------------------------------------------------------------------------------
export function computeRiskScore(params: {
  isNewClient: boolean;
  amountUSD: number;
  duplicateScreenshot: boolean;
  evidenceMismatchCount: number;
  submissionSpeedSeconds: number;
  sourceTrust: 'high' | 'medium' | 'low';
}): { riskScore: number; riskFactors: string[] } {
  let score = 0;
  const factors: string[] = [];

  if (params.isNewClient) {
    score += 15;
    factors.push('New client with no established order history (+15)');
  }
  if (params.amountUSD > 100) {
    score += 15;
    factors.push('High value payment exceeding $100 (+15)');
  }
  if (params.submissionSpeedSeconds < 30) {
    score += 5;
    factors.push('Submission within seconds of invoice issuance (+5)');
  }
  if (params.duplicateScreenshot) {
    score += 40;
    factors.push('CRITICAL: Evidence hash matches previous submission from another invoice (+40)');
  }
  if (params.evidenceMismatchCount > 0) {
    score += 20 * params.evidenceMismatchCount;
    factors.push(`AI evidence field extraction has ${params.evidenceMismatchCount} mismatch(es) (+${20 * params.evidenceMismatchCount})`);
  }
  if (params.sourceTrust === 'medium') {
    score += 10;
    factors.push('Ledger source has medium trust level (SMS/email bridge) (+10)');
  }

  return { riskScore: Math.min(100, score), riskFactors: factors };
}

// ------------------------------------------------------------------------------
// SMS Parsers & Test Panel (Section 8.3 & Section 19)
// ------------------------------------------------------------------------------
export interface ParsedSmsResult {
  provider: 'bkash' | 'nagad' | 'unknown';
  trxId: string;
  amount: number; // major units
  amountMinor: number;
  sender: string;
  balance?: number;
  time?: string;
  rawText: string;
  isValid: boolean;
}

export function parseSmsText(text: string): ParsedSmsResult {
  const clean = text.trim();

  // 1. bKash Pattern
  const bkashTrx = clean.match(/TrxID\s+([A-Z0-9]+)/i);
  const bkashAmount = clean.match(/(?:Tk|BDT)\s*([0-9,]+(?:\.[0-9]{2})?)/i);
  const bkashSender = clean.match(/from\s+([0-9A-Za-z\+\*]+)/i);
  const bkashBalance = clean.match(/Balance\s+(?:Tk|BDT)?\s*([0-9,]+(?:\.[0-9]{2})?)/i);

  if (bkashTrx && (clean.toLowerCase().includes('received') || clean.toLowerCase().includes('bkash'))) {
    const rawAmt = bkashAmount ? parseFloat(bkashAmount[1].replace(/,/g, '')) : 0;
    return {
      provider: 'bkash',
      trxId: bkashTrx[1].toUpperCase(),
      amount: rawAmt,
      amountMinor: toMinorUnits(rawAmt),
      sender: bkashSender ? bkashSender[1] : 'Unknown',
      balance: bkashBalance ? parseFloat(bkashBalance[1].replace(/,/g, '')) : undefined,
      rawText: clean,
      isValid: rawAmt > 0 && !!bkashTrx[1],
    };
  }

  // 2. Nagad Pattern
  const nagadTrx = clean.match(/(?:TxnID|Txn ID|TrxID):\s*([A-Z0-9]+)/i);
  const nagadAmount = clean.match(/Amount:\s*(?:Tk|BDT)?\s*([0-9,]+(?:\.[0-9]{2})?)/i);
  const nagadSender = clean.match(/Sender:\s*([0-9A-Za-z\+\*]+)/i);

  if (nagadTrx && (clean.toLowerCase().includes('nagad') || clean.toLowerCase().includes('money received'))) {
    const rawAmt = nagadAmount ? parseFloat(nagadAmount[1].replace(/,/g, '')) : 0;
    return {
      provider: 'nagad',
      trxId: nagadTrx[1].toUpperCase(),
      amount: rawAmt,
      amountMinor: toMinorUnits(rawAmt),
      sender: nagadSender ? nagadSender[1] : 'Unknown',
      rawText: clean,
      isValid: rawAmt > 0 && !!nagadTrx[1],
    };
  }

  return {
    provider: 'unknown',
    trxId: `RAW-${Date.now().toString(36).toUpperCase()}`,
    amount: 0,
    amountMinor: 0,
    sender: 'Unknown',
    rawText: clean,
    isValid: false,
  };
}

// ------------------------------------------------------------------------------
// Official Format Parser Test Corpus (Section 5B: bKash & Nagad Only)
// ------------------------------------------------------------------------------
export const SAMPLE_SMS_CORPUS = [
  {
    name: 'bKash Send Money Received',
    text: 'You have received Tk 2,500.00 from 01711098234. Ref PAY-2611-1044. Fee Tk 0.00. Balance Tk 14,250.00. TrxID 9K8X2M99 at 05/11/2026 14:15',
  },
  {
    name: 'Nagad Money Received',
    text: 'Money Received. Amount: Tk 4,500.00. Sender: 01810992341. TxnID: 71B89KX. Balance: Tk 28,450.00. Date: 05/11/2026 16:30',
  },
];

