export type Currency = 'USD' | 'BDT';
export type ThemeMode = 'dark' | 'light';
export type Language = 'en' | 'bn';

export type ServiceCategory = 'M R S Services' | 'Gravatar Services' | 'M R S IPTV';
export type PriceType = 'fixed' | 'hourly' | 'quote' | 'plan';
export type PaymentTimingMode = 'A' | 'B' | 'C' | 'mode_a' | 'mode_b' | 'mode_c'; // A: Pay after delivery (locked), B: Deposit then balance, C: Prepay
export type TrustTier = 'new' | 'trusted' | 'prepay_only' | 'blocked';

export interface ServiceSampleItem {
  id: string;
  title: string;
  description: string;
  results?: string;
  watermark?: boolean;
  imageUrl?: string;
}

export interface ServiceItem {
  id: string; // legacy id or slug
  serviceId: string; // S-MRS-01, S-GRV-01, etc.
  slug: string;
  shortCode: string;
  category: ServiceCategory;
  name: string;
  shortDescription: string;
  inclusions: string[];
  typicalTurnaround: string;
  priceType: PriceType;
  minPriceUSD?: number;
  maxPriceUSD?: number;
  fixedPriceUSD?: number;
  rateUSD: string;
  rateBDT: string;
  currency: Currency;
  active: boolean;
  sortOrder: number;
  icon: string;
  paymentTimingNewClient: PaymentTimingMode;
  paymentTimingTrustedClient: PaymentTimingMode;
  paymentTimingMode?: PaymentTimingMode;
  aiDraftEnabled?: boolean;
  autoQuote?: boolean;
  autoDeliverAfterQA?: boolean;
  depositPercent: number;
  lockableDeliverables: boolean;
  viewCount: number;
  orderCount: number;
  guarantee?: string;
  clientMustProvide?: string[];
  notIncluded?: string[];
  revisionsIncluded?: number;
  samples?: ServiceSampleItem[];
  rating?: number;
  reviewCount?: number;
  faq?: { question: string; answer: string }[];
}

export type OrderStatus =
  | 'Pending'
  | 'Awaiting payment'
  | 'Payment submitted'
  | 'Verified'
  | 'In progress'
  | 'Delivered'
  | 'Completed'
  | 'Rejected'
  | 'Expired'
  | 'On hold'
  | 'In dispute'
  | 'PAID_VERIFIED'
  | 'IN_PROGRESS'
  | 'QC_CHECK'
  | 'NEEDS_INFO'
  | 'MANUAL_REVIEW'
  | 'ON_HOLD'
  | 'CLOSED'
  | 'CANCELLED'
  | 'REFUNDED';

export interface ClientRecord {
  clientId: string; // format: MRS-YYMM-XXXX
  name: string;
  email: string;
  whatsapp: string;
  country: string;
  pinHash?: string;
  status: 'active' | 'suspended';
  trustTier: TrustTier;
  completedPaidOrders: number;
  creditBalance: number;
  overdueCount: number;
  referralCode?: string;
  referredBy?: string;
  notificationPreferences?: {
    email: boolean;
    whatsapp: boolean;
    timeZone: string;
  };
  acceptedTermsVersion?: string;
  acceptedTermsAt?: string;
  createdAt: string;
  lastLogin?: string;
  failedAttempts?: number;
  lockoutUntil?: string;
}

export interface TimesheetEntry {
  id: string;
  date: string;
  minutes: number;
  note: string;
  approvedByClient?: boolean;
}

export interface KickoffChecklistItem {
  id: string;
  title: string;
  required: boolean;
  completed: boolean;
  response?: string;
  uploadedUrl?: string;
}

export interface RevisionRequest {
  id: string;
  requestedAt: string;
  notes: string;
  status: 'pending' | 'in_progress' | 'completed';
}

export interface ChangeRequest {
  id: string;
  title: string;
  hours: number;
  price: number;
  newDueDate: string;
  status: 'pending' | 'accepted' | 'declined';
  notes?: string;
}

export interface DeliveryNote {
  whatWasDone: string;
  howToUse: string;
  whatsIncluded: string;
  knownLimits?: string;
  nextSteps: string;
}

export interface OrderRecord {
  orderId: string; // ORD-YYMM-NNNN
  clientId: string;
  clientName?: string;
  clientEmail?: string;
  clientWhatsapp?: string;
  clientCountry?: string;
  serviceId: string; // S-MRS-06, etc.
  serviceSlug?: string;
  category: ServiceCategory;
  serviceName: string;
  details: string;
  quoteAmount: number;
  currency: Currency;
  status: OrderStatus;
  paymentTiming: PaymentTimingMode;
  dueDays: number;
  dueDate?: string;
  ref?: string; // Tracking ref (?ref=linkedin, etc.)
  agreementAcceptedAt?: string;
  agreementVersion?: string;
  agreementIp?: string;
  isRush?: boolean;
  rushDelivery?: boolean;
  rushSurchargePercent?: number;
  couponCode?: string;
  couponDiscount?: number;
  timesheet?: TimesheetEntry[];
  kickoffChecklist?: KickoffChecklistItem[];
  revisionsUsed: number;
  revisionsTotal: number;
  revisions?: RevisionRequest[];
  changeRequests?: ChangeRequest[];
  isClockPaused?: boolean;
  clockPauseReason?: string;
  inactivityStatus?: 'active' | 'nudge_sent' | 'on_hold' | 'closed';
  internalNotes?: string[];
  qaChecklistCompleted?: boolean;
  qaSelfCheckNote?: string;
  deliveryNote?: DeliveryNote;
  createdAt: string;
  updatedAt: string;
  hoursEstimated?: number;
  quoteExpiresAt?: string;
  deliverableNotes?: string;
  files?: { name: string; url: string; size?: string }[];
}

export type InvoiceStatus =
  | 'draft'
  | 'issued'
  | 'payment_submitted'
  | 'paid_verified'
  | 'rejected'
  | 'partially_paid'
  | 'overdue'
  | 'in_dispute'
  | 'cancelled'
  | 'written_off'
  | 'Pending'
  | 'Paid'
  | 'Overdue'
  | 'Cancelled'
  | 'disputed';

export interface InvoiceItem {
  description: string;
  amountUSD: number;
  amountBDT: number;
}

export interface InvoiceRecord {
  invoiceId: string; // INV-YYMM-NNNN
  invoiceNumber?: string; // alias for invoiceId
  orderId: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  serviceId: string;
  serviceName?: string;
  items: InvoiceItem[];
  total: number;
  amountUSD: number;
  amountBDT: number;
  depositCredited: number;
  amountDue: number;
  currency: Currency;
  rateSnapshot: number; // exchange rate at issuance
  dueDate: string;
  status: InvoiceStatus;
  paymentReferenceCode: string; // PAY-YYMM-NNNN
  reference?: string; // alias for paymentReferenceCode
  trxId?: string;
  method?: string;
  issuedAt: string;
  issuedDate?: string; // alias
  paidAt?: string;
  remindersSent?: string[];
  notes?: string;
}

export type PaymentStatus = 'Payment submitted' | 'Verified' | 'Rejected' | 'Partially paid';

export interface PaymentAutoCheckResult {
  amountMatch: boolean;
  isTrxUnique: boolean;
  isProofUnique: boolean;
  paymentTimeValid: boolean;
  notes?: string;
}

export interface PaymentRecord {
  paymentId: string;
  orderId: string;
  invoiceId?: string;
  clientId: string;
  clientName?: string;
  clientEmail?: string;
  method: string;
  amount: number;
  amountReceived?: number;
  currency: Currency;
  reference: string;
  trxId: string;
  trxKey?: string; // method:trxId (unique index)
  senderMask?: string;
  proofUrl?: string;
  proofFileName?: string;
  proofHash?: string;
  status: PaymentStatus;
  autoCheckResult?: PaymentAutoCheckResult;
  verifiedBy?: string;
  verifiedAt?: string;
  rejectionReason?: string;
  receiptId?: string; // RCP-YYMM-NNNN
  note?: string;
  senderIdentifier?: string;
  ownerConfirmationStatus?: 'RECEIVED' | 'NOT RECEIVED' | 'CHECK' | 'PENDING';
  ownerConfirmedAt?: string;
  submissionAttempts?: number;
  isLargeOrder?: boolean;
  createdAt: string;
  paidAt?: string;
}

export interface SubscriptionRecord {
  subscriptionId: string;
  clientId: string;
  clientName?: string;
  clientEmail?: string;
  serviceId?: string; // S-IPTV-01-1M etc.
  plan: '1-month' | '2-month' | '6-month' | '12-month';
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'suspended';
  credentials?: string;
  serverUrl?: string;
  notes?: string;
}

export interface MessageRecord {
  id: string;
  clientId: string;
  orderId?: string;
  sender: 'client' | 'admin' | 'system';
  senderName: string;
  text: string;
  isInternalNote?: boolean;
  attachmentUrl?: string;
  attachmentName?: string;
  timestamp: string;
  readAt?: string;
}

export interface DeliverableRecord {
  id: string;
  orderId: string;
  clientId: string;
  serviceId?: string;
  title: string;
  summary: string;
  content: string;
  locked: boolean;
  watermarkText?: string;
  previewWatermark?: string;
  previewUrl?: string;
  finalDownloadUrl?: string;
  unlockedAt?: string;
  downloadUrl?: string;
  format: 'txt' | 'md' | 'json' | 'pdf' | 'link';
  deliveredAt: string;
}

export interface ReviewRecord {
  id: string;
  serviceId: string;
  serviceName: string;
  orderId?: string;
  clientId: string;
  clientName: string;
  rating: number; // 1-5
  comment: string;
  verifiedClient: boolean;
  visible: boolean;
  createdAt: string;
}

export interface IPTVSupportTicket {
  id: string;
  clientId: string;
  orderId?: string;
  device: string;
  issueType: string;
  description: string;
  status: 'open' | 'investigating' | 'resolved';
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseRecord {
  id: string;
  title: string;
  category: 'tools' | 'hosting' | 'fees' | 'other';
  amountUSD: number;
  date: string;
  notes?: string;
}

export interface PaymentMethodConfig {
  id: string;
  name: string;
  category: 'mobile_banking' | 'bank' | 'card' | 'crypto';
  accountNumber: string;
  accountHolder?: string;
  network?: string;
  currency?: string;
  instructions: string;
  warning?: string;
  feeNote?: string;
  qrCodeUrl?: string;
  active: boolean;
  sortOrder?: number;
  region?: 'local' | 'international' | 'both';
  binanceUid?: string;
  binancePayId?: string;
  customerId?: string;
  allowedTransactionType?: string;
  exactReceiver?: string;
}

export interface BusinessDetails {
  name: string;
  ownerName: string;
  address?: string;
  email: string;
  phone: string;
  taxId?: string;
}

export interface CouponCode {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  active: boolean;
  expiry?: string;
  usageLimit?: number;
  usageCount: number;
  applicableServiceId?: string; // optional restriction
}

export interface SettingsRecord {
  siteBaseUrl: string;
  exchangeRate: number; // default 100 BDT = $1 USD
  ownerEmail: string;
  whatsappNumber: string;
  phoneNumber?: string;
  telegramUrl?: string;
  calendlyUrl: string;
  githubUrl: string;
  linkedinUrl: string;
  xUrl?: string;
  blueskyUrl?: string;
  wordpressUrl?: string;
  gravatarUrl?: string;
  avatarUrl?: string;
  paymentMethods: PaymentMethodConfig[];
  iptvPlanPrices: {
    '1-month': number;
    '2-month': number;
    '6-month': number;
    '12-month': number;
  };
  dueDays: number; // default 2
  largeQuoteDueDays: number; // default 7
  verifySlaHours: number; // default 24
  depositDefault: number; // default 50%
  trustedAfterOrders: number; // default 2
  overdueToPrepayDays: number; // default 7
  overdueToBlockedDays: number; // default 30
  payAfterDeliveryForEveryone: boolean; // global switch
  maintenanceMode: boolean;
  cryptoEnabled?: boolean; // Crypto is OFF by default with mandatory legal warning
  restrictedRegions?: string[]; // Prohibited/sanctioned regions list
  allowBDClientsInternationalMethods?: boolean; // Section 5A.2 owner setting
  largeOrderThresholdUSD?: number; // Section 5A.5: $50 threshold
  largeOrderThresholdBDT?: number; // Section 5A.5: 5,000 TK threshold
  paymentRegistryVersion?: string; // e.g. "Section 5A v2.0"
  paymentRegistryLastUpdated?: string;
  outOfOffice: {
    active: boolean;
    returnDate?: string;
    note?: string;
  };
  outOfOfficeNotice?: string;
  businessDetails: BusinessDetails;
  workingHours: {
    timeZone: 'Asia/Dhaka';
    open: string;
    close: string;
  };
  termsVersion: string;
  termsLastUpdated: string;
  coupons: CouponCode[];
  referralRewardAmount: number;
  iptvOutageBanner?: {
    active: boolean;
    message: string;
  };
}

export interface AuditLogRecord {
  id: string;
  action: string;
  performedBy: string;
  targetId: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}
