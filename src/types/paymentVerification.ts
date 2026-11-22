// Payment Verification System - Types & Data Models
// Based on M R S Payment Verification Specification

export type PaymentMethodType = 'mobile_banking' | 'bank' | 'paypal_wise' | 'card' | 'crypto';

export type LedgerSource =
  | 'statement_import'
  | 'manual_entry'
  | 'sms_bridge'
  | 'email_bridge'
  | 'crypto_watcher';

export type PaymentSubmissionStatus =
  | 'submitted'
  | 'evidence_checking'
  | 'awaiting_ledger'
  | 'matched_exact'
  | 'matched_probable'
  | 'needs_review'
  | 'manual_review'
  | 'verified'
  | 'partially_verified'
  | 'rejected'
  | 'withdrawn'
  | 'expired'
  | 'info_requested';

export type LedgerEntryStatus = 'unmatched' | 'matched' | 'consumed' | 'disputed' | 'ignored';

export interface PaymentMethodConfigV2 {
  key: string;
  label: string;
  type: PaymentMethodType;
  currency: 'BDT' | 'USD';
  active: boolean;
  instructions: string;
  feeNote: string;
  trxIdPattern: string; // regex string
  senderFieldLabel: string;
  requiresScreenshot: boolean;
  autoVerifySources: LedgerSource[];
  minAmountMinor: number;
  sortOrder: number;
}

export interface PaymentAccountV2 {
  id: string;
  methodKey: string;
  accountName: string;
  displayValue: string; // masked in public logs
  accountType: 'Personal' | 'Agent' | 'Merchant' | 'Checking' | 'Savings' | 'CryptoWallet';
  qrImage?: string;
  network?: string; // TRC20, BEP20, ERC20, etc.
  tokenContract?: string; // USDT, USDC contract address
  providerSenderIds: string[]; // e.g. ["bKash", "16247", "Nagad"]
  active: boolean;
  weight: number;
}

export interface PaymentIntentV2 {
  id: string; // INT-YYMM-NNNN
  invoiceId: string;
  method: string;
  accountId: string;
  amountDueMinor: number; // in cents or paisa
  uniqueAmountMinor?: number; // for crypto: small unique suffix
  currency: 'USD' | 'BDT';
  referenceCode: string; // PAY-YYMM-NNNN
  expiresAt: string; // ISO UTC
  rateSnapshot: number; // exchange rate at issue
  createdAt: string;
}

export interface PaymentEvidenceV2 {
  id: string;
  paymentId: string;
  fileName: string;
  sha256: string;
  phash?: string; // perceptual difference hash
  previewUrl: string;
  extractedFields?: {
    trxId?: string;
    amountMinor?: number;
    currency?: string;
    sender?: string;
    recipient?: string;
    dateTime?: string;
    statusText?: string;
  };
  mismatches: string[];
  duplicateDetectedWithInvoiceId?: string;
  aiProcessedAt?: string;
}

export interface PaymentSubmissionV2 {
  id: string; // SUB-YYMM-NNNN
  intentId: string;
  invoiceId: string;
  clientId: string;
  clientName?: string;
  clientEmail?: string;
  method: string;
  accountId: string;
  trxKey: string; // `${method}:${normalizedTrxId}`
  normalizedTrxId: string;
  amountMinor: number;
  currency: 'USD' | 'BDT';
  paidAt: string; // ISO
  senderMask: string; // last 4 digits or wallet slice
  status: PaymentSubmissionStatus;
  riskScore: number; // 0 - 100
  flags: string[];
  idempotencyKey: string;
  note?: string;
  evidenceId?: string;
  evidence?: PaymentEvidenceV2;
  matchedLedgerEntryId?: string;
  createdAt: string;
  updatedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  infoRequestMessage?: string;
  ownerConfirmationStatus?: 'RECEIVED' | 'NOT RECEIVED' | 'CHECK' | 'PENDING';
  ownerConfirmedAt?: string;
}

export interface LedgerEntryV2 {
  id: string; // LDG-YYMM-NNNN
  source: LedgerSource;
  method: string;
  accountId: string;
  trxKey: string; // unique per method
  trxId: string;
  amountMinor: number;
  currency: 'USD' | 'BDT';
  senderMask?: string;
  receivedAt: string; // ISO UTC
  rawMasked: string;
  status: LedgerEntryStatus;
  matchedPaymentId?: string;
  ingestedAt: string;
  integrityFlags: string[];
  metadata?: Record<string, any>;
}

export interface MatchCandidateV2 {
  ledgerEntry: LedgerEntryV2;
  score: number; // 0 - 100
  reasons: string[];
  outcome: 'matched_exact' | 'matched_probable' | 'needs_review';
}

export interface VerificationDecisionV2 {
  id: string;
  paymentId: string;
  ledgerEntryId?: string;
  rulesPassed: string[];
  rulesFailed: string[];
  riskScore: number;
  decision: 'verified' | 'partially_verified' | 'rejected' | 'needs_review';
  decidedBy: 'automation' | 'owner';
  stepUpVerified?: boolean;
  decidedAt: string;
  reason?: string;
  actorEmail?: string;
}

export interface StatementImportRecord {
  id: string;
  method: string;
  fileName: string;
  rowCount: number;
  importedCount: number;
  skippedCount: number;
  importedAt: string;
  importedBy: string;
  mappings: Record<string, string>;
}

export interface BridgeStatusRecord {
  source: LedgerSource;
  lastSeenAt: string;
  health: 'healthy' | 'stale' | 'error';
  messageCount: number;
  errorCount: number;
  lastError?: string;
  autoVerifyDisabledAutomatically?: boolean;
}

export interface PaymentVerificationSettingsV2 {
  ledgerWaitWindowHours: number; // default 6
  reviewWindowDays: number; // default 7
  intentExpiryHours: number; // default 48
  slaHours: number; // default 4
  amountToleranceBps: number; // default 100 (1%)
  amountToleranceFixedMinor: number; // default 0
  timeToleranceMinutes: number; // default 15
  autoVerifyLimitsUsd: {
    sms: number; // default 50
    email: number; // default 50
    chain: number; // default 500
    statement: number; // default 999999
    manual: number; // default 999999
  };
  riskThresholdAuto: number; // default 30
  riskThresholdReview: number; // default 60
  minConfirmations: {
    trc20: number; // default 19
    bep20: number; // default 15
    erc20: number; // default 12
    btc: number; // default 2
  };
  stepUpAmountUsd: number; // default 200
  smsStaleHours: number; // default 6
  maxSubmissionsPerInvoice: number; // default 5
  autoVerifySources: {
    sms: boolean;
    email: boolean;
    chain: boolean;
    statement: boolean;
    manual: boolean;
  };
  killSwitch: boolean; // global pause on all auto-verify
  smsSecret: string;
}

export interface AuditLogItemV2 {
  id: string;
  action: string;
  actor: string;
  targetType: 'payment' | 'ledger' | 'invoice' | 'settings';
  targetId: string;
  details: string;
  evidenceHash?: string;
  timestamp: string;
}
