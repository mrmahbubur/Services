// Automation Engine Types (M R S Platform)

export type AutomationMode = 'off' | 'suggest' | 'approval' | 'auto';

export type EventType =
  | 'order.created'
  | 'order.intake_incomplete'
  | 'quote.sent'
  | 'quote.accepted'
  | 'invoice.issued'
  | 'payment.submitted'
  | 'payment.auto_matched'
  | 'payment.verified'
  | 'payment.rejected'
  | 'invoice.overdue'
  | 'deliverable.draft_ready'
  | 'order.delivered'
  | 'order.approved'
  | 'subscription.activated'
  | 'subscription.expiring'
  | 'message.received'
  | 'ticket.opened';

export interface AutomationEvent {
  id: string;
  type: EventType;
  orderId?: string;
  clientId?: string;
  invoiceId?: string;
  paymentId?: string;
  payload: any;
  idempotencyKey: string;
  timestamp: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  category: 'intake' | 'quote' | 'payment' | 'work' | 'delivery' | 'followup' | 'iptv';
  description: string;
  triggerEvent: EventType;
  mode: AutomationMode;
  conditionsDescription: string;
  actionsDescription: string;
  limits?: {
    maxAmountUSD?: number;
    maxDailyRuns?: number;
    requireMinConfidence?: number;
  };
  runsToday: number;
  active: boolean;
  lastRunAt?: string;
}

export interface AutomationRun {
  id: string;
  ruleId: string;
  ruleName: string;
  eventType: EventType;
  inputSummary: string;
  result: 'success' | 'failed' | 'skipped' | 'pending_approval';
  actionTaken: string;
  durationMs: number;
  triggeredBy: string; // "event:order.created" | "cron" | "manual"
  error?: string;
  isDryRun?: boolean;
  createdAt: string;
}

export interface AutomationJob {
  id: string;
  type: 'reminder' | 'expiry_check' | 'reconciliation' | 'deadline_check' | 'feedback_request';
  targetId: string; // orderId, invoiceId, subId
  runAt: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  attempts: number;
  maxAttempts: number;
  lastError?: string;
  createdAt: string;
}

export interface ApprovalItem {
  id: string;
  actionType: 'verify_payment' | 'send_quote' | 'auto_deliver' | 'refund' | 'block_client';
  orderId?: string;
  invoiceId?: string;
  paymentId?: string;
  clientName: string;
  summary: string;
  suggestedAction: string;
  amountUSD?: number;
  confidenceScore?: number;
  payload: any;
  status: 'pending' | 'approved' | 'rejected' | 'edited';
  requestedBy: string; // rule ID
  decidedBy?: string;
  decidedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface IncomingPayment {
  id: string;
  source: 'sms_bridge' | 'crypto_rpc' | 'manual_paste';
  rawMasked: string;
  senderIdentifier: string; // Phone or TxHash or Wallet
  trxId: string;
  amount: number;
  currency: 'BDT' | 'USD';
  referenceCode?: string;
  matchedInvoiceId?: string;
  matchedOrderId?: string;
  status: 'unmatched' | 'matched' | 'auto_verified' | 'sent_to_approval' | 'flagged';
  failureReason?: string;
  receivedAt: string;
  reconciled: boolean;
}

export interface AiDraftItem {
  id: string;
  orderId: string;
  serviceId: string;
  serviceName: string;
  clientName: string;
  inputsRef: string;
  outputContent: string;
  summary: string;
  atsKeywordMatchReport?: {
    matchPercentage: number;
    matchedKeywords: string[];
    missingKeywords: string[];
    recommendations: string[];
  };
  confidenceScore: number;
  status: 'draft' | 'reviewed' | 'approved' | 'rejected';
  reviewedBy?: string;
  model: string;
  noAiRequested: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrderTriageResult {
  orderId: string;
  serviceId: string;
  isComplete: boolean;
  missingFields: string[];
  suggestedQuestionToClient?: string;
  complexity: 'basic' | 'standard' | 'complex' | 'urgent';
  riskFlags: string[];
  threeLineSummary: string;
  suggestedQuoteUSD?: number;
  confidenceScore: number;
}

export interface AutomationSettings {
  killSwitch: boolean;
  dryRunMode: boolean;
  maxAutoVerifyAmountUSD: number;
  maxAutoQuoteAmountUSD: number;
  aiConfidenceThreshold: number;
  dailyAiCostCapUSD: number;
  dailyAiCallsCount: number;
  maxEmailsPerClientDaily: number;
  
  // Telegram Bot
  telegramBotEnabled: boolean;
  telegramBotToken: string;
  telegramAllowedChatIds: string[];
  
  // Phone SMS Bridge (Level 2)
  smsBridgeEnabled: boolean;
  smsBridgeSecret: string;
  smsBridgeAllowedSenders: string[]; // e.g. ["bKash", "16247", "NAGAD"]
  
  // Crypto RPC (Level 3)
  cryptoRpcEnabled: boolean;
  cryptoRpcApiKey: string;
  cryptoMinConfirmations: number;
  cryptoAllowedWallets: {
    network: string;
    address: string;
  }[];

  // Webhooks
  webhookOutboundUrl?: string;

  // Quiet Hours
  quietHoursEnabled: boolean;
  quietHoursStart: string; // e.g. "22:00"
  quietHoursEnd: string;   // e.g. "08:00"
}

export interface AutomationKPIs {
  touchlessRatePct: number;
  avgTimeToQuoteHours: number;
  avgTimeToVerifyMins: number;
  avgTimeToDeliverHours: number;
  failureRatePct: number;
  estimatedHoursSavedMonth: number;
  totalAutomatedEvents: number;
}
