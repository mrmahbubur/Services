// MRS Core — Types & Data Contracts per API.md and HOW-IT-WORKS.md

export interface ServiceIntakeField {
  key: string;
  label: string;
  type: 'text' | 'longtext' | 'choice' | 'url' | 'email' | 'domain' | 'file';
  required: boolean;
  help?: string;
  choices?: string[];
  accept?: string;
  group?: string;
  maxLength?: number;
}

export interface CatalogServiceItem {
  id: string;
  serviceId: string;
  slug: string;
  name: string;
  category: string;
  priceType: 'fixed' | 'hourly' | 'quote' | 'plan';
  rateUSD: number;
  maxPriceUSD?: number;
  rateBDT: number;
  rateLabelUSD: string;
  rateLabelBDT: string;
  turnaroundDays: number;
  typicalTurnaround: string;
  description: string;
  features: string[];
  howItIsDone: string;
  fulfilmentMode: 'camellia_complete' | 'camellia_prep_you_act' | 'you_act_camellia_writeup' | 'manual';
  intake: ServiceIntakeField[];
  deliverablesLockedUntilPaid?: boolean;
  paymentTimingNewClient: 'A' | 'B' | 'C';
  paymentTimingTrustedClient: 'A' | 'B' | 'C';
}

export interface ClientRecord {
  clientId: string; // e.g. MRS-2611-XXXX
  name: string;
  email: string;
  whatsapp?: string;
  country?: string;
  pinHash: string;
  loginFailures: number;
  lockedUntil?: string;
  tokenVersion?: number;
  trustTier?: 'new' | 'trusted' | 'prepay_only' | 'blocked';
  blocked?: boolean;
  createdAt: string;
}

export type OrderState =
  | 'quote_pending'
  | 'awaiting_payment'
  | 'intake_pending'
  | 'in_progress'
  | 'owner_review'
  | 'delivered'
  | 'revision'
  | 'closed'
  | 'cancelled';

export interface OrderRecord {
  id: string; // ORD-YYMM-NNNN
  orderId: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  clientWhatsapp?: string;
  clientCountry?: string;
  serviceId: string;
  serviceName: string;
  category?: string;
  state: OrderState;
  status: string;
  details: string;
  quoteAmount: number;
  currency?: 'USD' | 'BDT';
  paymentTiming?: 'A' | 'B' | 'C';
  couponCode?: string;
  discountPct?: number;
  isRush?: boolean;
  noAi?: boolean;
  planMonths?: string;
  intake: Record<string, any>;
  files: Array<{ field: string; fileName: string; fileId: string; size?: string; uploadedAt: string }>;
  revisionsTotal: number;
  revisionsUsed: number;
  deliverablesLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceRecord {
  invoiceId: string; // INV-YYMM-NNNN
  orderId: string;
  clientId: string;
  clientName?: string;
  clientEmail?: string;
  serviceId?: string;
  serviceName?: string;
  amount: number; // in USD
  amountUSD: number;
  amountBDT: number;
  amountDue: number;
  usdToBdtRate: number;
  currency: 'USD' | 'BDT';
  paymentReferenceCode: string; // PAY-YYMM-NNNN
  status: 'draft' | 'awaiting_payment' | 'paid_verified' | 'partially_paid' | 'cancelled';
  totalPaid: number;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentSubmissionStatus = 'awaiting_ledger' | 'needs_review' | 'verified' | 'rejected';

export interface PaymentCheckResult {
  id: string;
  label: string;
  status: 'pass' | 'warn' | 'fail' | 'pending' | 'skip';
  detail: string;
}

export type VerifyMode = 'evidence_auto' | 'authoritative' | 'manual';
export type UnconfirmedAction = 'alert_only' | 'suspend_pass' | 'void_code';
export type ConfirmationState =
  | 'not_applicable'
  | 'unconfirmed'
  | 'confirmed'
  | 'unconfirmed_overdue'
  | 'fraud'
  | 'fine';

export interface AutoVerifyWeights {
  format: number;
  documents: number;
  geminiScreen: number;
  referenceStyle: number;
  crossCheck: number;
  duplicates: number;
  plausibility: number;
}

export interface AutoVerifyCaps {
  newClientFirstOrderUsd: number;
  trustedClientOrderUsd: number;
  dailyTotalUsd: number;
  dailyPerMethodUsd: number;
  confirmWindowHours: number;
  onUnconfirmed: UnconfirmedAction;
}

export interface AutoVerifyConfig {
  methodModes: Record<string, VerifyMode>;
  autoVerifyScore: number;
  retryScore: number;
  weights: AutoVerifyWeights;
  caps: AutoVerifyCaps;
  falsePositivesCount?: number;
  falseNegativesCount?: number;
}

export interface EvidenceScoreBreakdown {
  format: number;
  documents: number;
  geminiScreen: number;
  referenceStyle: number;
  crossCheck: number;
  duplicates: number;
  plausibility: number;
  totalScore: number;
}

export interface ReferenceSampleRecord {
  id: string;
  methodId: string;
  label: string;
  mimeType: string;
  base64Data: string;
  sha256: string;
  createdAt: string;
}

export interface ShapePatternRecord {
  id: string;
  methodId: string;
  sampleTrxId: string;
  shapeSignature: string; // e.g. 'AA99AA99AA'
  createdAt: string;
}

export interface PaymentSubmission {
  id: string; // SUB-YYMM-NNNN
  invoiceId: string;
  orderId: string;
  clientId: string;
  methodId: string;
  transactionId: string;
  normalizedTrxId: string;
  amount: number;
  currency: 'USD' | 'BDT';
  paidAt: string;
  senderMask?: string;
  note?: string;
  status: PaymentSubmissionStatus;
  verifyModeUsed?: VerifyMode;
  confirmationState?: ConfirmationState;
  confirmationDeadlineAt?: string;
  confirmedAt?: string;
  overdueMarkedAt?: string;
  capBlockedReason?: string;
  secondProofRequested?: boolean;
  secondProofAttempts?: number;
  secondProofPrompt?: string;
  scoreBreakdown?: EvidenceScoreBreakdown;
  anomalies?: string[];
  matchedLedgerId?: string;
  decisionReason?: string;
  manualReviewRequested?: boolean;
  manualReviewRequestedAt?: string;
  ownerConfirmationStatus?: 'RECEIVED' | 'NOT_RECEIVED' | 'CHECK';
  verifiedBy?: string;
  aiConfidence?: number;
  aiExtracted?: Record<string, any>;
  activationCodeMask?: string;
  monthsPaid?: number;
  emailDispatchStatus?: 'sent' | 'pending_mailer_config' | 'failed';
  emailDispatchDetail?: string;
  checkResults: PaymentCheckResult[];
  evidenceFiles: Array<{
    fileName: string;
    dataUrl: string;
    sha256: string;
    pHash?: string;
    width?: number;
    height?: number;
    evidenceKind?: 'primary' | 'second_proof';
    uploadedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface LedgerRecord {
  id: string; // LDG-YYMM-NNNN
  channel: 'sms' | 'api' | 'email' | 'statement' | 'manual';
  methodId: string;
  trxId: string;
  normalizedTrxId: string;
  amount: number;
  currency: 'USD' | 'BDT';
  sender?: string;
  reference?: string;
  runningBalance?: number;
  rawPayload: string;
  claimedByPaymentId?: string;
  used: boolean;
  receivedAt: string;
  createdAt: string;
}

export interface DeliverableRecord {
  id: string;
  orderId: string;
  clientId?: string;
  serviceId?: string;
  fileName: string;
  title: string;
  summary?: string;
  format: string;
  fileSize: string;
  base64Data?: string;
  externalUrl?: string;
  locked: boolean;
  downloadable: boolean;
  createdAt: string;
}

export interface OrderMessageRecord {
  id: string;
  orderId: string;
  clientId?: string;
  author: 'client' | 'camellia' | 'owner';
  text: string;
  internal?: boolean;
  timestamp: string;
}

export interface FulfilmentJob {
  id: string;
  orderId: string;
  serviceId: string;
  state: 'waiting_inputs' | 'queued' | 'running' | 'owner_review' | 'owner_task' | 'released' | 'failed';
  summary?: string;
  error?: string;
  qa: Array<{ id: string; label: string; passed: boolean; severity: 'block' | 'warn'; detail: string }>;
  ownerTasks?: string[];
  questionsForClient?: string[];
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SystemSettings {
  autoVerifyLimitsUsd: {
    sms: number;
    email: number;
    chain: number;
    statement: number;
    manual: number;
  };
  usdToBdt: number;
  killSwitch: boolean;
  aiAutoVerifyEnabled?: boolean;
  autoVerifyConfig?: AutoVerifyConfig;
  methodPayToEmails?: Record<string, string>;
  cryptoEnabled: boolean;
  autoMatchByReference: boolean;
  amountToleranceBps: number;
  stepUpAmountUsd: number;
  autoRelease: Record<string, boolean>;
  fulfilmentPaused?: boolean;
  dailyAiCallCap?: number;
  dailyAiCallsUsed?: number;
  hiddenServices?: string[];
  outOfOffice?: { active: boolean; returnDate?: string; note?: string };
  iptvOutageBanner?: { active: boolean; message: string };
  siteBaseUrl?: string;
  ownerEmail?: string;
  whatsappNumber?: string;
  phoneNumber?: string;
  calendlyUrl?: string;
  telegramUrl?: string;
  dueDays?: number;
  largeQuoteDueDays?: number;
  verifySlaHours?: number;
  depositDefault?: number;
  trustedAfterOrders?: number;
  payAfterDeliveryForEveryone?: boolean;
  maintenanceMode?: boolean;
  allowBDClientsInternationalMethods?: boolean;
  workingHours?: { timeZone: 'Asia/Dhaka'; open: string; close: string };
  coupons?: Array<{ code: string; type: 'percent' | 'fixed'; value: number; active: boolean; usageCount: number }>;
}

export interface ReviewEntry {
  id: string;
  serviceId: string;
  serviceName: string;
  orderId?: string;
  clientId: string;
  clientName: string;
  rating: number;
  comment: string;
  likes: number;
  verifiedClient: boolean;
  visible: boolean;
  createdAt: string;
}

export interface AlertEntry {
  id: string;
  kind: string;
  severity: 'info' | 'warn' | 'high';
  title: string;
  detail: string;
  targetId?: string;
  read: boolean;
  createdAt: string;
}
