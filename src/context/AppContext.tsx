import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Currency,
  ThemeMode,
  Language,
  ServiceItem,
  OrderRecord,
  OrderStatus,
  PaymentRecord,
  SubscriptionRecord,
  DeliverableRecord,
  InvoiceRecord,
  MessageRecord,
  SettingsRecord,
  ClientRecord,
  AuditLogRecord,
  ReviewRecord,
  IPTVSupportTicket,
  ExpenseRecord,
  TrustTier,
} from '../types';
import {
  AutomationRule,
  AutomationMode,
  AutomationSettings,
  AutomationKPIs,
  AutomationRun,
  ApprovalItem,
  IncomingPayment,
} from '../types/automation';
import {
  INITIAL_SERVICES,
  INITIAL_SETTINGS,
} from '../data/servicesData';
import {
  INITIAL_AUTOMATION_SETTINGS,
  INITIAL_AUTOMATION_KPIS,
  INITIAL_AUTOMATION_RULES,
} from '../data/automationRulesData';
import { translations } from '../utils/i18n';

interface ToastData {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
}

interface AppContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  currency: Currency;
  toggleCurrency: () => void;
  language: Language;
  toggleLanguage: () => void;
  t: typeof translations.en;
  settings: SettingsRecord;
  updateSettings: (newSettings: SettingsRecord) => Promise<void>;
  services: ServiceItem[];
  updateService: (service: ServiceItem) => Promise<void>;
  addService: (service: ServiceItem) => Promise<void>;
  hideService: (id: string) => Promise<void>;
  formatPrice: (usdAmount: number) => string;
  convertPrice: (usdAmount: number) => { usd: number; bdt: number };

  // Client auth & portal
  currentClient: ClientRecord | null;
  clientOrders: OrderRecord[];
  clientPayments: PaymentRecord[];
  clientSubscriptions: SubscriptionRecord[];
  clientDeliverables: DeliverableRecord[];
  clientInvoices: InvoiceRecord[];
  clientMessages: MessageRecord[];
  loginClient: (clientId: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  registerClient: (payload: { name: string; email: string; whatsapp?: string; country?: string; pin?: string }) => Promise<{ success: boolean; client?: ClientRecord; plainPin?: string; error?: string }>;
  changeClientPin: (currentPin: string, newPin: string) => Promise<{ success: boolean; error?: string }>;
  logoutClient: () => Promise<void>;
  logoutAllDevices: () => Promise<void>;
  refreshPortalData: () => Promise<void>;
  createOrder: (orderPayload: {
    serviceId: string;
    details: string;
    clientName: string;
    clientEmail: string;
    clientWhatsapp: string;
    clientCountry: string;
    ref?: string;
    isRush?: boolean;
    rushDelivery?: boolean;
    couponCode?: string;
    planMonths?: string;
    noAi?: boolean;
    intake?: Record<string, any>;
    files?: { name: string; url: string; size?: string }[];
  }) => Promise<{ order: OrderRecord; client: ClientRecord; plainPin?: string; isNewClient: boolean }>;

  // Payment proof flow
  submitPaymentProof: (paymentPayload: {
    orderId: string;
    invoiceId?: string;
    method: string;
    amount: number;
    currency: Currency;
    reference: string;
    trxId: string;
    proofUrl?: string;
    proofFileName?: string;
    proofHash?: string;
    senderIdentifier?: string;
    note?: string;
  }) => Promise<PaymentRecord>;

  // Locked Previews & Delivery
  approvePreview: (orderId: string) => Promise<void>;
  requestRevision: (orderId: string, notes: string) => Promise<void>;
  reportProblem: (orderId: string, issue: string) => Promise<void>;

  // Admin access & operations
  isAdmin: boolean;
  loginAdmin: (pass: string) => Promise<boolean>;
  logoutAdmin: () => Promise<void>;
  refreshAdminData: () => Promise<void>;
  allOrders: OrderRecord[];
  allPayments: PaymentRecord[];
  allClients: ClientRecord[];
  allSubscriptions: SubscriptionRecord[];
  allDeliverables: DeliverableRecord[];
  allInvoices: InvoiceRecord[];
  allAuditLogs: AuditLogRecord[];
  allMessages: MessageRecord[];
  verifyPayment: (paymentId: string, notes?: string) => Promise<void>;
  verifyPartialPayment: (paymentId: string, amountReceived: number, notes?: string) => Promise<void>;
  rejectPayment: (paymentId: string, reason: string) => Promise<void>;
  updateOrderStatus: (orderId: string, status: OrderStatus, quoteAmount?: number, hours?: number) => Promise<void>;
  deliverOrder: (
    orderId: string,
    title: string,
    summary: string,
    content: string,
    format?: 'txt' | 'md' | 'json' | 'pdf' | 'link',
    downloadUrl?: string,
    deliveryNote?: { whatWasDone: string; howToUse: string; whatsIncluded: string; nextSteps: string }
  ) => Promise<void>;
  createClientAccount: (payload: { name: string; email: string; whatsapp?: string; country?: string; trustTier?: TrustTier; pin?: string }) => Promise<{ client: ClientRecord; plainPin: string }>;
  resetClientPin: (clientId: string, customPin?: string) => Promise<string>;
  updateClientTrustTier: (clientId: string, tier: TrustTier) => Promise<void>;
  toggleClientBlock: (clientId: string) => Promise<void>;

  // Reviews, Tickets, Expenses
  reviews: ReviewRecord[];
  addReview: (serviceId: string, rating: number, comment: string, orderId?: string) => Promise<void>;
  supportTickets: IPTVSupportTicket[];
  createSupportTicket: (device: string, issueType: string, description: string) => Promise<string>;
  updateTicketStatus: (ticketId: string, status: 'open' | 'investigating' | 'resolved') => Promise<void>;
  expenses: ExpenseRecord[];
  addExpense: (title: string, category: 'tools' | 'hosting' | 'fees' | 'other', amountUSD: number, date: string, notes?: string) => Promise<void>;

  // Deterministic SMS parser
  parsePaymentSms: (smsText: string) => { trxId?: string; amount?: number; sender?: string; matchedInvoice?: InvoiceRecord };

  // Messaging & UI
  sendMessage: (text: string, orderId?: string, asAdmin?: boolean, isInternalNote?: boolean, targetClientId?: string) => Promise<void>;
  isConciergeOpen: boolean;
  openConcierge: (prefillService?: string) => void;
  closeConcierge: () => void;
  conciergePrefillService: string | null;
  toast: ToastData | null;
  showToast: (title: string, message: string, type?: ToastData['type']) => void;

  // Automation Engine
  automationSettings: AutomationSettings;
  updateAutomationSettings: (partial: Partial<AutomationSettings>) => Promise<void>;
  automationRules: AutomationRule[];
  updateAutomationRuleMode: (ruleId: string, mode: AutomationMode) => Promise<void>;
  automationRuns: AutomationRun[];
  approvals: ApprovalItem[];
  decideApproval: (approvalId: string, decision: 'approved' | 'rejected', notes?: string) => Promise<void>;
  automationKpis: AutomationKPIs;
  incomingPayments: IncomingPayment[];
  telegramLogs: any[];
}

const AppContext = createContext<AppContextType | null>(null);

function mapServerStateToOrderStatus(state: string, fallbackStatus?: string): OrderStatus {
  switch (state) {
    case 'awaiting_payment':
    case 'quote_pending':
      return 'Awaiting payment';
    case 'payment_submitted':
      return 'Payment submitted';
    case 'in_progress':
      return 'In progress';
    case 'delivered':
    case 'completed':
      return 'Delivered';
    case 'closed':
      return 'Completed';
    case 'cancelled':
      return 'CANCELLED';
    case 'revision':
      return 'In progress';
    default:
      return (fallbackStatus as OrderStatus) || 'Pending';
  }
}

function adaptServerOrder(o: any): OrderRecord {
  return {
    orderId: o.orderId || o.id,
    clientId: o.clientId,
    clientName: o.clientName || o.clientId,
    clientEmail: o.clientEmail || '',
    clientWhatsapp: o.clientWhatsapp || '',
    clientCountry: o.clientCountry || '',
    serviceId: o.serviceId,
    serviceSlug: o.serviceSlug || o.serviceId?.toLowerCase(),
    category: o.category || 'M R S Services',
    serviceName: o.serviceName || o.serviceId,
    details: o.details || '',
    quoteAmount: Number(o.quoteAmount || 0),
    currency: o.currency || 'USD',
    status: mapServerStateToOrderStatus(o.state, o.status),
    paymentTiming: o.paymentTiming || 'C',
    dueDays: o.dueDays || 2,
    dueDate: o.dueDate || new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    agreementAcceptedAt: o.createdAt,
    agreementVersion: 'v2.4',
    agreementIp: '127.0.0.1',
    isRush: Boolean(o.isRush),
    rushDelivery: Boolean(o.isRush),
    rushSurchargePercent: o.isRush ? 35 : 0,
    revisionsUsed: o.revisionsUsed || 0,
    revisionsTotal: o.revisionsTotal || 2,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    files: o.files || [],
  };
}

function adaptServerInvoice(inv: any): InvoiceRecord {
  const usd = Number(inv.amountUSD ?? inv.amount ?? 0);
  const fx = Number(inv.usdToBdtRate || 100);
  return {
    invoiceId: inv.invoiceId,
    invoiceNumber: inv.invoiceId,
    orderId: inv.orderId,
    clientId: inv.clientId,
    clientName: inv.clientName || 'Client',
    clientEmail: inv.clientEmail || '',
    serviceId: inv.serviceId || 'S-MRS-01',
    serviceName: inv.serviceName,
    items: [{ description: inv.serviceName || inv.serviceId || 'Service', amountUSD: usd, amountBDT: inv.amountBDT || Math.round(usd * fx) }],
    total: usd,
    amountUSD: usd,
    amountBDT: inv.amountBDT || Math.round(usd * fx),
    depositCredited: inv.totalPaid || 0,
    amountDue: inv.amountDue ?? usd,
    currency: inv.currency || 'USD',
    rateSnapshot: fx,
    dueDate: inv.dueDate || new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
    status: inv.status,
    paymentReferenceCode: inv.paymentReferenceCode,
    reference: inv.paymentReferenceCode,
    issuedAt: inv.createdAt,
    issuedDate: inv.createdAt,
  };
}

function adaptServerPayment(p: any): PaymentRecord {
  const statusMap: Record<string, PaymentRecord['status']> = {
    verified: 'Verified',
    rejected: 'Rejected',
    awaiting_ledger: 'Payment submitted',
    needs_review: 'Payment submitted',
  };
  return {
    paymentId: p.id || p.paymentId,
    orderId: p.orderId,
    invoiceId: p.invoiceId,
    clientId: p.clientId,
    clientName: p.clientName,
    clientEmail: p.clientEmail,
    method: p.methodId || p.method,
    amount: Number(p.amount || 0),
    amountReceived: Number(p.amount || 0),
    currency: p.currency || 'USD',
    reference: p.invoiceId || p.orderId,
    trxId: p.transactionId || p.trxId,
    trxKey: `${p.methodId || p.method}:${p.transactionId || p.trxId}`,
    senderMask: p.senderMask,
    status: statusMap[p.status] || (p.status as PaymentRecord['status']) || 'Payment submitted',
    rejectionReason: p.status === 'rejected' ? (p.decisionReason || p.clientMessage || 'Needs correction') : undefined,
    note: p.note || p.clientMessage || p.decisionReason,
    senderIdentifier: p.senderMask,
    createdAt: p.createdAt,
    paidAt: p.paidAt || p.createdAt,
    ...(p.clientStatusLabel ? { clientStatusLabel: p.clientStatusLabel } : {}),
    ...(p.clientMessage ? { clientMessage: p.clientMessage } : {}),
    ...(typeof p.secondProofRequested === 'boolean' ? { secondProofRequested: p.secondProofRequested } : {}),
    ...(p.secondProofPrompt ? { secondProofPrompt: p.secondProofPrompt } : {}),
    ...(p.activationCodeMask ? { activationCodeMask: p.activationCodeMask } : {}),
    ...(p.monthsPaid ? { monthsPaid: p.monthsPaid } : {}),
  };
}

function adaptServerDeliverable(d: any): DeliverableRecord {
  return {
    id: d.id,
    orderId: d.orderId,
    clientId: d.clientId,
    serviceId: d.serviceId,
    title: d.title,
    summary: d.summary || '',
    content: d.summary || 'Download deliverable archive using the button above.',
    locked: Boolean(d.locked),
    previewWatermark: d.locked ? `PREVIEW — UNPAID — ${d.orderId}` : undefined,
    format: (d.format as DeliverableRecord['format']) || 'md',
    deliveredAt: d.createdAt,
    unlockedAt: d.locked ? undefined : d.createdAt,
  };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // User UI Preferences Only — Dark is default per Theme rules
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mrs_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });

  const [currency, setCurrency] = useState<Currency>(() => {
    const saved = localStorage.getItem('mrs_currency');
    return saved === 'BDT' ? 'BDT' : 'USD';
  });

  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('mrs_language');
    return saved === 'bn' ? 'bn' : 'en';
  });

  // Authoritative Server-Backed State (Zero dummy seeds)
  const [settings, setSettings] = useState<SettingsRecord>(INITIAL_SETTINGS);
  const [services, setServices] = useState<ServiceItem[]>(INITIAL_SERVICES);
  const [allClients, setAllClients] = useState<ClientRecord[]>([]);
  const [allOrders, setAllOrders] = useState<OrderRecord[]>([]);
  const [allInvoices, setAllInvoices] = useState<InvoiceRecord[]>([]);
  const [allPayments, setAllPayments] = useState<PaymentRecord[]>([]);
  const [allSubscriptions, setAllSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [allDeliverables, setAllDeliverables] = useState<DeliverableRecord[]>([]);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [supportTickets, setSupportTickets] = useState<IPTVSupportTicket[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [allMessages, setAllMessages] = useState<MessageRecord[]>([]);
  const [allAuditLogs, setAllAuditLogs] = useState<AuditLogRecord[]>([]);

  const [automationSettings, setAutomationSettings] = useState<AutomationSettings>(INITIAL_AUTOMATION_SETTINGS);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>(INITIAL_AUTOMATION_RULES);
  const [automationRuns, setAutomationRuns] = useState<AutomationRun[]>([]);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [incomingPayments, setIncomingPayments] = useState<IncomingPayment[]>([]);
  const [telegramLogs] = useState<any[]>([]);
  const [automationKpis, setAutomationKpis] = useState<AutomationKPIs>(INITIAL_AUTOMATION_KPIS);

  const [currentClient, setCurrentClient] = useState<ClientRecord | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isConciergeOpen, setIsConciergeOpen] = useState(false);
  const [conciergePrefillService, setConciergePrefillService] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastData | null>(null);

  const showToast = useCallback((title: string, message: string, type: ToastData['type'] = 'info') => {
    const id = Date.now().toString();
    setToast({ id, title, message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.id === id ? null : curr));
    }, 4500);
  }, []);

  // Purge any legacy business keys from localStorage on startup
  useEffect(() => {
    const keysToPurge = [
      'mrs_orders',
      'mrs_clients',
      'mrs_invoices',
      'mrs_payments',
      'mrs_deliverables',
      'mrs_messages',
      'mrs_subscriptions',
      'mrs_approvals',
      'mrs_audit',
      'mrs_automation_settings',
      'mrs_automation_rules',
      'mrs_automation_runs',
      'mrs_settings',
      'mrs_services',
      'mrs_current_client',
      'mrs_reviews',
      'mrs_expenses',
      'mrs_support_tickets',
      'mrs_admin_session',
      'mrs_admin_token',
      'mrs_go_live_checks',
    ];
    for (const key of keysToPurge) {
      localStorage.removeItem(key);
    }
  }, []);

  // Sync UI preferences to DOM and localStorage
  useEffect(() => {
    localStorage.setItem('mrs_theme', theme);
    const root = document.documentElement;
    const metaThemeColor = document.getElementById('theme-color-meta') || document.querySelector('meta[name="theme-color"]');

    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
      document.body.classList.add('dark');
      document.body.classList.remove('light');
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#0B1220');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
      document.body.classList.remove('dark');
      document.body.classList.add('light');
      if (metaThemeColor) metaThemeColor.setAttribute('content', '#F6F8FC');
    }
  }, [theme]);

  useEffect(() => { localStorage.setItem('mrs_currency', currency); }, [currency]);
  useEffect(() => { localStorage.setItem('mrs_language', language); }, [language]);

  const refreshPortalData = useCallback(async () => {
    try {
      const res = await fetch('/api/portal/me');
      if (res.ok) {
        const data = await res.json();
        if (data.client) setCurrentClient(data.client);
        if (Array.isArray(data.orders)) {
          const adapted = data.orders.map(adaptServerOrder);
          setAllOrders((prev) => {
            const others = prev.filter((o) => !adapted.some((co: OrderRecord) => co.orderId === o.orderId));
            return [...adapted, ...others];
          });
        }
        if (Array.isArray(data.invoices)) {
          const adaptedInv = data.invoices.map(adaptServerInvoice);
          setAllInvoices((prev) => {
            const others = prev.filter((i) => !adaptedInv.some((ci: InvoiceRecord) => ci.invoiceId === i.invoiceId));
            return [...adaptedInv, ...others];
          });
        }
        if (Array.isArray(data.payments)) {
          const adaptedPay = data.payments.map(adaptServerPayment);
          setAllPayments((prev) => {
            const others = prev.filter((p) => !adaptedPay.some((cp: PaymentRecord) => cp.paymentId === p.paymentId));
            return [...adaptedPay, ...others];
          });
        }
        if (Array.isArray(data.deliverables)) {
          setAllDeliverables(data.deliverables.map(adaptServerDeliverable));
        }
        if (Array.isArray(data.subscriptions)) {
          setAllSubscriptions((prev) => {
            const others = prev.filter((s) => !data.subscriptions.some((cs: SubscriptionRecord) => cs.subscriptionId === s.subscriptionId));
            return [...data.subscriptions, ...others];
          });
        }
        if (Array.isArray(data.supportTickets)) {
          setSupportTickets((prev) => {
            const others = prev.filter((t) => !data.supportTickets.some((ct: IPTVSupportTicket) => ct.id === t.id));
            return [...data.supportTickets, ...others];
          });
        }
        if (Array.isArray(data.messages)) {
          setAllMessages(
            data.messages.map((m: any) => ({
              id: m.id,
              clientId: m.clientId || data.client?.clientId || '',
              orderId: m.orderId,
              sender: m.author === 'client' ? 'client' : 'admin',
              senderName: m.author === 'camellia' ? 'Camellia · AI assistant' : m.author === 'owner' ? 'M R S Owner Desk' : data.client?.name || 'Client',
              text: m.text,
              isInternalNote: Boolean(m.internal),
              timestamp: m.timestamp,
            }))
          );
        }
      } else if (res.status === 401) {
        setCurrentClient(null);
      }
    } catch (err) {
      console.warn('Failed to refresh portal data:', err);
    }
  }, []);

  const refreshAdminData = useCallback(async () => {
    try {
      const [ordersRes, clientsRes, paymentsRes, auditRes, fulfilRes, ticketsRes, expensesRes, subsRes, rulesRes] = await Promise.all([
        fetch('/api/admin/orders'),
        fetch('/api/admin/clients'),
        fetch('/api/admin/payments'),
        fetch('/api/admin/audit'),
        fetch('/api/admin/fulfilment-settings'),
        fetch('/api/admin/support-tickets'),
        fetch('/api/admin/expenses'),
        fetch('/api/admin/subscriptions'),
        fetch('/api/admin/automation-rules'),
      ]);

      if (ordersRes.ok) {
        const d = await ordersRes.json();
        if (Array.isArray(d.orders)) setAllOrders(d.orders.map(adaptServerOrder));
        if (Array.isArray(d.invoices)) setAllInvoices(d.invoices.map(adaptServerInvoice));
        if (Array.isArray(d.deliverables)) setAllDeliverables(d.deliverables.map(adaptServerDeliverable));
        if (Array.isArray(d.jobs)) {
          const derivedRuns: AutomationRun[] = d.jobs.map((j: any) => ({
            id: j.id,
            ruleId: 'RULE-05',
            ruleName: `Fulfilment Job (${j.serviceId})`,
            eventType: 'order.created',
            inputSummary: `Order ${j.orderId} · State: ${j.state}`,
            result: j.state === 'failed' ? 'failed' : j.state === 'released' ? 'success' : 'pending_approval',
            actionTaken: j.summary || `Job state: ${j.state}`,
            durationMs: 0,
            triggeredBy: 'fulfilment_engine',
            createdAt: j.updatedAt || j.createdAt,
          }));
          setAutomationRuns(derivedRuns);
          const pendingJobs: ApprovalItem[] = d.jobs
            .filter((j: any) => j.state === 'owner_review' || j.state === 'owner_task')
            .map((j: any) => ({
              id: j.id,
              actionType: 'deliver_draft',
              orderId: j.orderId,
              clientName: j.orderId,
              summary: j.summary || `Order ${j.orderId} ready for owner review & release`,
              suggestedAction: j.state === 'owner_review' ? 'Inspect QA gates and release deliverable' : 'Complete manual owner execution',
              confidenceScore: 0.9,
              payload: { jobId: j.id, orderId: j.orderId },
              status: 'pending',
              requestedBy: 'FULFILMENT-ENGINE',
              createdAt: j.updatedAt || j.createdAt,
            }));
          setApprovals(pendingJobs);
        }
      }

      if (clientsRes.ok) {
        const d = await clientsRes.json();
        if (Array.isArray(d.clients)) {
          setAllClients(
            d.clients.map((c: any) => ({
              clientId: c.clientId,
              name: c.name,
              email: c.email,
              whatsapp: c.whatsapp || '',
              country: c.country || '',
              status: c.blocked ? 'suspended' : 'active',
              trustTier: c.trustTier || 'new',
              completedPaidOrders: c.orderCount || 0,
              creditBalance: 0,
              overdueCount: 0,
              createdAt: c.createdAt,
            }))
          );
        }
      }

      if (paymentsRes.ok) {
        const d = await paymentsRes.json();
        if (Array.isArray(d.payments)) setAllPayments(d.payments.map(adaptServerPayment));
        if (Array.isArray(d.ledgerEntries)) {
          setIncomingPayments(
            d.ledgerEntries.map((l: any) => ({
              id: l.id,
              source: l.channel === 'sms' ? 'sms_bridge' : l.channel === 'email' ? 'email_collector' : 'manual_import',
              rawMasked: l.rawPayload || `${l.methodId} ${l.trxId}`,
              senderIdentifier: l.sender || l.methodId,
              trxId: l.trxId,
              amount: l.amount,
              currency: l.currency || 'BDT',
              matchedInvoiceId: l.claimedByPaymentId,
              status: l.used ? 'auto_verified' : 'unmatched',
              receivedAt: l.receivedAt || l.createdAt,
              reconciled: Boolean(l.used),
            }))
          );
        }
        if (d.settings) {
          setSettings((prev) => ({
            ...prev,
            exchangeRate: d.settings.usdToBdt || d.settings.exchangeRate || prev.exchangeRate,
            ownerEmail: d.settings.ownerEmail || prev.ownerEmail,
            whatsappNumber: d.settings.whatsappNumber || prev.whatsappNumber,
            phoneNumber: d.settings.phoneNumber || prev.phoneNumber,
            calendlyUrl: d.settings.calendlyUrl || prev.calendlyUrl,
            telegramUrl: d.settings.telegramUrl || prev.telegramUrl,
            cryptoEnabled: Boolean(d.settings.cryptoEnabled),
            allowBDClientsInternationalMethods: Boolean(d.settings.allowBDClientsInternationalMethods),
            maintenanceMode: typeof d.settings.maintenanceMode === 'boolean' ? d.settings.maintenanceMode : prev.maintenanceMode,
            payAfterDeliveryForEveryone: typeof d.settings.payAfterDeliveryForEveryone === 'boolean' ? d.settings.payAfterDeliveryForEveryone : prev.payAfterDeliveryForEveryone,
            outOfOffice: d.settings.outOfOffice || prev.outOfOffice,
            iptvOutageBanner: d.settings.iptvOutageBanner || prev.iptvOutageBanner,
            workingHours: d.settings.workingHours || prev.workingHours,
            coupons: Array.isArray(d.settings.coupons) ? d.settings.coupons : prev.coupons,
          }));
          setAutomationSettings((prev) => ({
            ...prev,
            killSwitch: Boolean(d.settings.fulfilmentPaused),
            maxAutoVerifyAmountUSD: d.settings.autoVerifyMaxAmountUSD || prev.maxAutoVerifyAmountUSD,
            dailyAiCallsCount: d.settings.dailyAiCallCap || prev.dailyAiCallsCount,
          }));
        }
      }

      if (auditRes.ok) {
        const d = await auditRes.json();
        if (Array.isArray(d.entries)) {
          setAllAuditLogs(
            d.entries.map((e: any) => ({
              id: e.id,
              action: e.action,
              performedBy: e.actor,
              targetId: e.targetId || '',
              details: e.details || e.detail || '',
              timestamp: e.timestamp,
            }))
          );
        }
      }

      if (fulfilRes.ok) {
        const f = await fulfilRes.json();
        setAutomationSettings((prev) => ({
          ...prev,
          killSwitch: Boolean(f.fulfilmentPaused),
        }));
      }

      if (ticketsRes.ok) {
        const d = await ticketsRes.json();
        if (Array.isArray(d.tickets)) setSupportTickets(d.tickets);
      }
      if (expensesRes.ok) {
        const d = await expensesRes.json();
        if (Array.isArray(d.expenses)) setExpenses(d.expenses);
      }
      if (subsRes.ok) {
        const d = await subsRes.json();
        if (Array.isArray(d.subscriptions)) setAllSubscriptions(d.subscriptions);
      }
      if (rulesRes.ok) {
        const d = await rulesRes.json();
        if (d.modes && typeof d.modes === 'object') {
          setAutomationRules((prev) =>
            prev.map((r) => (d.modes[r.id] ? { ...r, mode: d.modes[r.id] as AutomationMode } : r))
          );
        }
      }
    } catch (err) {
      console.warn('Admin data refresh warning:', err);
    }
  }, []);

  // Hydrate public settings, catalog overrides, reviews, and active sessions on mount
  useEffect(() => {
    fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.settings) {
          setSettings((prev) => ({
            ...prev,
            ...data.settings,
            exchangeRate: data.settings.usdToBdt || data.settings.exchangeRate || prev.exchangeRate,
          }));
        }
      })
      .catch(() => {});

    fetch('/api/catalog')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        const hiddenSet = new Set<string>(Array.isArray(data.hiddenServices) ? data.hiddenServices : []);
        const overrides = Array.isArray(data.overrides) ? data.overrides : [];
        const overrideMap = new Map<string, any>();
        for (const ov of overrides) {
          if (ov?.id) overrideMap.set(ov.id, ov);
          if (ov?.serviceId) overrideMap.set(ov.serviceId, ov);
        }
        setServices((prev) => {
          const merged = prev.map((svc) => {
            const ov = overrideMap.get(svc.id) || overrideMap.get(svc.serviceId);
            const hidden = hiddenSet.has(svc.id) || hiddenSet.has(svc.serviceId) || ov?.active === false;
            return ov ? { ...svc, ...ov, active: !hidden } : { ...svc, active: !hidden };
          });
          const known = new Set<string>([...prev.map((s) => s.id), ...prev.map((s) => s.serviceId)]);
          const customAdded = overrides.filter((ov: any) => ov && ov.name && !known.has(ov.id) && !known.has(ov.serviceId));
          return [...merged, ...customAdded];
        });
      })
      .catch(() => {});

    fetch('/api/payment-methods')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setSettings((prev) => ({
            ...prev,
            exchangeRate: data.usdToBdt || prev.exchangeRate,
            cryptoEnabled: Boolean(data.cryptoEnabled),
          }));
        }
      })
      .catch(() => {});

    fetch('/api/reviews')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.reviews)) setReviews(data.reviews);
      })
      .catch(() => {});

    fetch('/api/admin/session')
      .then((res) => {
        if (res.ok) {
          setIsAdmin(true);
          refreshAdminData();
        }
      })
      .catch(() => {});

    refreshPortalData();
  }, [refreshAdminData, refreshPortalData]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  const toggleCurrency = () => setCurrency((prev) => (prev === 'USD' ? 'BDT' : 'USD'));
  const toggleLanguage = () => setLanguage((prev) => (prev === 'en' ? 'bn' : 'en'));

  const convertPrice = (usdAmount: number) => {
    const rate = settings.exchangeRate || 100;
    return { usd: usdAmount, bdt: Math.round(usdAmount * rate) };
  };

  const formatPrice = (usdAmount: number): string => {
    const { usd, bdt } = convertPrice(usdAmount);
    return currency === 'BDT' ? `${bdt.toLocaleString()} ৳` : `$${usd.toLocaleString()} USD`;
  };

  const updateSettings = async (newSettings: SettingsRecord) => {
    if (isAdmin) {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteBaseUrl: newSettings.siteBaseUrl,
          usdToBdt: newSettings.exchangeRate,
          ownerEmail: newSettings.ownerEmail,
          whatsappNumber: newSettings.whatsappNumber,
          phoneNumber: newSettings.phoneNumber,
          calendlyUrl: newSettings.calendlyUrl,
          telegramUrl: newSettings.telegramUrl,
          cryptoEnabled: Boolean(newSettings.cryptoEnabled),
          allowBDClientsInternationalMethods: Boolean(newSettings.allowBDClientsInternationalMethods),
          dueDays: newSettings.dueDays,
          largeQuoteDueDays: newSettings.largeQuoteDueDays,
          verifySlaHours: newSettings.verifySlaHours,
          depositDefault: newSettings.depositDefault,
          trustedAfterOrders: newSettings.trustedAfterOrders,
          payAfterDeliveryForEveryone: Boolean(newSettings.payAfterDeliveryForEveryone),
          maintenanceMode: Boolean(newSettings.maintenanceMode),
          outOfOffice: newSettings.outOfOffice,
          iptvOutageBanner: newSettings.iptvOutageBanner,
          workingHours: newSettings.workingHours,
          coupons: newSettings.coupons,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        showToast('Save Failed', d.error || 'Could not persist settings to server.', 'error');
        return;
      }
      setSettings(newSettings);
      showToast('Settings Updated', 'Platform configurations saved to server.', 'success');
      return;
    }
    showToast('Admin Sign-In Required', 'Settings changes require an active Owner session.', 'error');
  };

  const updateService = async (updated: ServiceItem) => {
    const res = await fetch(`/api/admin/services/${updated.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      showToast('Catalog Save Failed', d.error || 'Could not save service update to server.', 'error');
      return;
    }
    setServices((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
    showToast('Catalog Updated', `${updated.name} saved on server.`, 'success');
  };

  const addService = async (newService: ServiceItem) => {
    const res = await fetch('/api/admin/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newService),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      showToast('Create Failed', d.error || 'Could not persist new service to server.', 'error');
      return;
    }
    setServices((prev) => [...prev, newService]);
    showToast('Service Created', `${newService.name} saved to server catalog.`, 'success');
  };

  const hideService = async (id: string) => {
    const target = services.find((s) => s.id === id);
    const nextActive = target ? !target.active : false;
    const res = await fetch(`/api/admin/services/${id}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: nextActive }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      showToast('Update Failed', d.error || 'Could not toggle service visibility on server.', 'error');
      return;
    }
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, active: nextActive } : s)));
    showToast('Catalog Updated', 'Service visibility persisted on server.', 'info');
  };

  const loginClient = async (clientId: string, pin: string) => {
    try {
      const res = await fetch('/api/portal/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: clientId.trim().toUpperCase(), pin: pin.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          success: false,
          error: data.error || (res.status === 429 ? 'Account locked for 15 minutes after 5 failed attempts.' : 'Invalid credentials.'),
        };
      }
      await refreshPortalData();
      showToast('Workspace Unlocked', `Welcome back, ${data.client?.name || clientId}`, 'success');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection error' };
    }
  };

  const registerClient = async (payload: { name: string; email: string; whatsapp?: string; country?: string; pin?: string }) => {
    try {
      const res = await fetch('/api/portal/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data.error || 'Could not register Client ID.' };
      }
      await refreshPortalData();
      showToast('Client ID Issued', `Account ${data.client?.clientId} saved on server.`, 'success');
      return { success: true, client: data.client, plainPin: data.plainPin };
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection error' };
    }
  };

  const changeClientPin = async (currentPin: string, newPin: string) => {
    try {
      const res = await fetch('/api/portal/change-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin, newPin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { success: false, error: data.error || 'Could not update PIN.' };
      }
      showToast('PIN Updated', 'Your 6-digit PIN has been rotated on the server.', 'success');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Connection error' };
    }
  };

  const logoutClient = async () => {
    try {
      await fetch('/api/portal/logout', { method: 'POST' });
    } catch {}
    setCurrentClient(null);
    showToast('Logged Out', 'Your client workspace has been secured.', 'info');
  };

  const logoutAllDevices = async () => {
    try {
      await fetch('/api/portal/logout-all', { method: 'POST' });
    } catch {}
    setCurrentClient(null);
    showToast('All Sessions Revoked', 'Every active device token has been invalidated on server.', 'info');
  };

  const createOrder = async (payload: {
    serviceId: string;
    details: string;
    clientName: string;
    clientEmail: string;
    clientWhatsapp: string;
    clientCountry: string;
    ref?: string;
    isRush?: boolean;
    rushDelivery?: boolean;
    couponCode?: string;
    planMonths?: string;
    noAi?: boolean;
    intake?: Record<string, any>;
    files?: { name: string; url: string; size?: string }[];
  }) => {
    const isRushOrder = Boolean(payload.isRush || payload.rushDelivery);
    const service =
      services.find((s) => s.id === payload.serviceId || s.serviceId === payload.serviceId || s.slug === payload.serviceId) ||
      services[0];

    const serverRes = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceId: service.serviceId || service.id,
        details: payload.details,
        clientName: payload.clientName.trim(),
        clientEmail: payload.clientEmail.trim(),
        clientWhatsapp: payload.clientWhatsapp.trim(),
        clientCountry: payload.clientCountry.trim(),
        couponCode: payload.couponCode,
        isRush: isRushOrder,
        planMonths: payload.planMonths,
        noAi: Boolean(payload.noAi),
        intake: payload.intake || {},
      }),
    });

    const resData = await serverRes.json().catch(() => ({}));
    if (!serverRes.ok) {
      const errMsg = resData.error || 'Failed to place order';
      showToast('Order Placement Failed', errMsg, 'error');
      throw new Error(errMsg);
    }

    const { order: serverOrder, invoice: serverInvoice, client: serverClient, isNewClient, plainPin } = resData;
    const orderId = serverOrder.orderId || serverOrder.id;

    if (payload.files && payload.files.length > 0) {
      for (const f of payload.files) {
        if (!f.url) continue;
        await fetch(`/api/orders/${orderId}/files`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ field: 'attachment', fileName: f.name, base64Data: f.url }),
        }).catch(() => {});
      }
    }

    const adaptedOrder = adaptServerOrder({ ...serverOrder, serviceSlug: service.slug, category: service.category, serviceName: service.name });
    if (serverInvoice) {
      const adaptedInvoice = adaptServerInvoice({ ...serverInvoice, serviceName: service.name });
      setAllInvoices((prev) => [adaptedInvoice, ...prev]);
    }

    const adaptedClient: ClientRecord = {
      clientId: serverClient.clientId,
      name: serverClient.name,
      email: serverClient.email,
      whatsapp: serverClient.whatsapp || payload.clientWhatsapp,
      country: serverClient.country || payload.clientCountry,
      status: 'active',
      trustTier: 'new',
      completedPaidOrders: 0,
      creditBalance: 0,
      overdueCount: 0,
      createdAt: serverClient.createdAt || new Date().toISOString(),
    };

    setAllOrders((prev) => [adaptedOrder, ...prev]);
    setAllClients((prev) => (prev.some((c) => c.clientId === adaptedClient.clientId) ? prev : [adaptedClient, ...prev]));
    setCurrentClient(adaptedClient);
    showToast('Order Created', `Order ${orderId} registered on server.`, 'success');

    return { order: adaptedOrder, client: adaptedClient, plainPin, isNewClient };
  };

  const submitPaymentProof = async (payload: {
    orderId: string;
    invoiceId?: string;
    method: string;
    amount: number;
    currency: Currency;
    reference: string;
    trxId: string;
    proofUrl?: string;
    proofFileName?: string;
    proofHash?: string;
    senderIdentifier?: string;
    note?: string;
  }) => {
    const res = await fetch('/api/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': `PAY-${payload.invoiceId || payload.orderId}-${payload.trxId.trim().toUpperCase()}`,
      },
      body: JSON.stringify({
        invoiceId: payload.invoiceId || payload.orderId,
        methodId: payload.method,
        transactionId: payload.trxId.trim(),
        amount: Number(payload.amount),
        currency: payload.currency,
        senderMask: payload.senderIdentifier?.trim() || '****',
        note: payload.note?.trim(),
        receiptFileName: payload.proofFileName,
        receiptBase64Data: payload.proofUrl,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errMsg = data.error || 'Payment submission failed';
      showToast('Payment Error', errMsg, 'error');
      throw new Error(errMsg);
    }

    const submission = data.submission;
    const adapted = adaptServerPayment(submission);
    setAllPayments((prev) => [adapted, ...prev]);
    await refreshPortalData();
    showToast(
      submission?.status === 'verified' ? 'Payment Verified by AI' : 'Payment Submitted',
      submission?.status === 'verified'
        ? `Submission ${adapted.paymentId} verified automatically.`
        : `Submission ${adapted.paymentId} recorded on server.`,
      submission?.status === 'verified' ? 'success' : 'info'
    );
    return adapted;
  };

  const approvePreview = async (orderId: string) => {
    const res = await fetch(`/api/orders/${orderId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Client approved the preview deliverable and is ready for final release.' }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      showToast('Approval Failed', d.error || 'Could not record approval on server.', 'error');
      return;
    }
    showToast('Preview Approved', 'Thank you! Final files unlock automatically once payment is verified.', 'success');
    await refreshPortalData();
  };

  const requestRevision = async (orderId: string, notes: string) => {
    const res = await fetch(`/api/orders/${orderId}/revision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast('Revision Error', data.error || 'Failed to submit revision', 'error');
      return;
    }
    showToast('Revision Requested', `Revision recorded (${data.revisionsRemaining ?? 0} remaining).`, 'info');
    await refreshPortalData();
  };

  const reportProblem = async (orderId: string, issue: string) => {
    const res = await fetch(`/api/orders/${orderId}/problem`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: 'complaint', summary: issue.slice(0, 140), description: issue }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast('Report Failed', data.error || 'Could not submit issue report.', 'error');
      return;
    }
    showToast('Incident Logged', 'Your report has been escalated to the owner operations queue.', 'warning');
    await refreshPortalData();
  };

  const verifyPayment = async (paymentId: string, notes?: string) => {
    const res = await fetch(`/api/admin/payments/${paymentId}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: notes || 'Owner verified.' }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast('Verification Failed', data.error || 'Server rejected verification.', 'error');
      return;
    }
    showToast('Payment Verified', 'Payment verified atomically and deliverables unlocked.', 'success');
    await refreshAdminData();
  };

  const verifyPartialPayment = async (paymentId: string, amountReceived: number, notes?: string) => {
    const res = await fetch(`/api/admin/payments/${paymentId}/owner-confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'CHECK',
        amount: amountReceived,
        note: notes || `Partial settlement received ($${amountReceived}). Balance remains due.`,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast('Update Failed', data.error || 'Failed to record partial payment.', 'error');
      return;
    }
    showToast('Partial Settlement Logged', 'Deliverables remain locked until full invoice balance clears.', 'warning');
    await refreshAdminData();
  };

  const rejectPayment = async (paymentId: string, reason: string) => {
    const res = await fetch(`/api/admin/payments/${paymentId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast('Rejection Failed', data.error || 'Failed to reject payment.', 'error');
      return;
    }
    showToast('Payment Rejected', reason, 'error');
    await refreshAdminData();
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus, quoteAmount?: number) => {
    if (quoteAmount && quoteAmount > 0) {
      const res = await fetch(`/api/admin/orders/${orderId}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountUSD: quoteAmount }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        showToast('Quote Update Failed', d.error || 'Server error updating quote.', 'error');
        return;
      }
    } else if (status === 'CANCELLED') {
      await fetch(`/api/admin/orders/${orderId}/cancel`, { method: 'POST' });
    } else {
      await fetch(`/api/admin/jobs/JOB-${orderId}/owner-done`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: `Owner set status to ${status}` }),
      });
    }
    showToast('Order Updated', `Order ${orderId} updated (${status}).`, 'info');
    await refreshAdminData();
  };

  const deliverOrder = async (
    orderId: string,
    title: string,
    summary: string,
    content: string,
    format: 'txt' | 'md' | 'json' | 'pdf' | 'link' = 'md'
  ) => {
    const res = await fetch(`/api/admin/orders/${orderId}/deliverables`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, summary, content, format }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast('Delivery Failed', data.error || 'Could not publish deliverable to server.', 'error');
      return;
    }
    showToast(
      'Work Delivered',
      data.deliverable?.locked ? 'Deliverable published (Locked preview until paid).' : 'Deliverable published and unlocked.',
      'success'
    );
    await refreshAdminData();
  };

  const createClientAccount = async (payload: {
    name: string;
    email: string;
    whatsapp?: string;
    country?: string;
    trustTier?: TrustTier;
    pin?: string;
  }) => {
    const res = await fetch('/api/admin/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast('Client Creation Failed', data.error || 'Could not create Client ID on server.', 'error');
      throw new Error(data.error || 'Creation failed');
    }
    await refreshAdminData();
    showToast('Client Created on Server', `${data.client.clientId} (PIN: ${data.plainPin})`, 'success');
    return { client: data.client as ClientRecord, plainPin: data.plainPin as string };
  };

  const resetClientPin = async (clientId: string, customPin?: string) => {
    const res = await fetch(`/api/admin/clients/${clientId}/reset-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customPin ? { pin: customPin } : {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast('Reset Failed', data.error || 'Could not reset PIN.', 'error');
      throw new Error(data.error || 'Reset failed');
    }
    showToast('PIN Reset on Server', `New one-time PIN for ${clientId}: ${data.plainPin}`, 'success');
    return data.plainPin as string;
  };

  const updateClientTrustTier = async (clientId: string, tier: TrustTier) => {
    const res = await fetch(`/api/admin/clients/${clientId}/tier`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trustTier: tier }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      showToast('Update Failed', d.error || 'Failed to update trust tier.', 'error');
      return;
    }
    showToast('Trust Tier Updated', `Client tier changed to ${tier}.`, 'info');
    await refreshAdminData();
  };

  const toggleClientBlock = async (clientId: string) => {
    const res = await fetch(`/api/admin/clients/${clientId}/block`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      showToast('Action Failed', d.error || 'Failed to toggle client block.', 'error');
      return;
    }
    showToast('Client Updated', 'Client access status updated on server.', 'info');
    await refreshAdminData();
  };

  const addReview = async (serviceId: string, rating: number, comment: string, orderId?: string) => {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceId, rating, comment, orderId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast('Review Error', data.error || 'Please sign into the Client Portal to post a verified review.', 'error');
      return;
    }
    if (data.review) setReviews((prev) => [data.review, ...prev]);
    showToast('Review Submitted', 'Thank you for your verified feedback!', 'success');
  };

  const createSupportTicket = async (device: string, issueType: string, description: string) => {
    const res = await fetch('/api/support-tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device, issueType, description }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast('Ticket Failed', data.error || 'Could not save support ticket to server.', 'error');
      throw new Error(data.error || 'Ticket creation failed');
    }
    setSupportTickets((prev) => [data.ticket, ...prev]);
    showToast('Ticket Submitted', `Support ticket ${data.ticket.id} saved on server.`, 'success');
    return data.ticket.id as string;
  };

  const updateTicketStatus = async (ticketId: string, status: 'open' | 'investigating' | 'resolved') => {
    const res = await fetch(`/api/admin/support-tickets/${ticketId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      showToast('Update Failed', d.error || 'Could not update ticket on server.', 'error');
      return;
    }
    setSupportTickets((prev) => prev.map((t) => (t.id === ticketId ? { ...t, status, updatedAt: new Date().toISOString() } : t)));
    showToast('Ticket Updated', `${ticketId} status saved as ${status}.`, 'info');
  };

  const addExpense = async (title: string, category: 'tools' | 'hosting' | 'fees' | 'other', amountUSD: number, date: string, notes?: string) => {
    const res = await fetch('/api/admin/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, category, amountUSD, date, notes }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast('Save Failed', data.error || 'Could not save expense to server.', 'error');
      return;
    }
    setExpenses((prev) => [data.expense, ...prev]);
    showToast('Expense Recorded', `$${amountUSD} saved to server.`, 'info');
  };

  const parsePaymentSms = (smsText: string) => {
    let trxId: string | undefined;
    let amount: number | undefined;
    let sender: string | undefined;

    const trxMatch =
      smsText.match(/TrxID\s+([A-Z0-9]+)/i) ||
      smsText.match(/TxnID\s*:\s*([A-Z0-9]+)/i) ||
      smsText.match(/Txn\s*#?\s*([A-Z0-9]+)/i);
    if (trxMatch) trxId = trxMatch[1].trim();

    const amtMatch = smsText.match(/Tk\s*([\d,.]+)/i) || smsText.match(/BDT\s*([\d,.]+)/i) || smsText.match(/\$([\d,.]+)/i);
    if (amtMatch) amount = parseFloat(amtMatch[1].replace(/,/g, ''));

    const senderMatch = smsText.match(/from\s+([+0-9]+)/i) || smsText.match(/sender\s+([+0-9]+)/i);
    if (senderMatch) sender = senderMatch[1].trim();

    let matchedInvoice: InvoiceRecord | undefined;
    if (amount) {
      matchedInvoice = allInvoices.find(
        (i) => (i.amountUSD === amount || i.amountBDT === amount || Math.abs(i.amountBDT - amount!) < 50) && i.status !== 'paid_verified'
      );
    }
    return { trxId, amount, sender, matchedInvoice };
  };

  const sendMessage = async (text: string, orderId?: string, asAdmin = false, isInternalNote = false, targetClientId?: string) => {
    const resolvedOrderId = orderId || allOrders.find((o) => o.clientId === (targetClientId || currentClient?.clientId))?.orderId;
    if (!resolvedOrderId) {
      showToast('No Active Order', 'Messages must be attached to an order thread.', 'warning');
      return;
    }

    const endpoint = asAdmin ? `/api/admin/orders/${resolvedOrderId}/messages` : `/api/orders/${resolvedOrderId}/messages`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, internal: isInternalNote }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      showToast('Message Failed', data.error || 'Could not dispatch message.', 'error');
      return;
    }

    if (asAdmin) {
      const m = data.message;
      if (m) {
        setAllMessages((prev) => [
          ...prev,
          {
            id: m.id,
            clientId: m.clientId || targetClientId || '',
            orderId: m.orderId,
            sender: 'admin',
            senderName: 'M R S Owner Desk',
            text: m.text,
            isInternalNote: Boolean(m.internal),
            timestamp: m.timestamp,
          },
        ]);
      }
    } else if (Array.isArray(data.messages)) {
      setAllMessages((prev) => {
        const others = prev.filter((m) => m.orderId !== resolvedOrderId);
        return [
          ...others,
          ...data.messages.map((m: any) => ({
            id: m.id,
            clientId: m.clientId || currentClient?.clientId || '',
            orderId: m.orderId,
            sender: m.author === 'client' ? 'client' : 'admin',
            senderName: m.author === 'camellia' ? 'Camellia · AI assistant' : m.author === 'owner' ? 'M R S Owner Desk' : currentClient?.name || 'Client',
            text: m.text,
            timestamp: m.timestamp,
          })),
        ];
      });
    }
  };

  const loginAdmin = async (pass: string) => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pass }),
      });
      if (res.ok) {
        setIsAdmin(true);
        await refreshAdminData();
        showToast('Admin Access Granted', 'Owner operations unlocked.', 'success');
        return true;
      }
      const err = await res.json().catch(() => ({}));
      showToast('Access Denied', err.error || 'Invalid master administrator password.', 'error');
      return false;
    } catch (e: any) {
      showToast('Connection Error', e.message, 'error');
      return false;
    }
  };

  const logoutAdmin = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {}
    setIsAdmin(false);
    showToast('Admin Logged Out', 'Admin session terminated.', 'info');
  };

  const updateAutomationSettings = async (partial: Partial<AutomationSettings>) => {
    const next = { ...automationSettings, ...partial };
    setAutomationSettings(next);
    if (isAdmin) {
      await fetch('/api/admin/fulfilment-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fulfilmentPaused: next.killSwitch,
          dailyAiCallCap: next.dailyAiCallsCount,
        }),
      });
    }
  };

  const updateAutomationRuleMode = async (ruleId: string, mode: AutomationMode) => {
    const res = await fetch(`/api/admin/automation-rules/${ruleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      showToast('Save Failed', d.error || 'Could not update automation rule on server.', 'error');
      return;
    }
    setAutomationRules((prev) => prev.map((r) => (r.id === ruleId ? { ...r, mode } : r)));
    showToast('Rule Updated', `${ruleId} mode saved to server (${mode}).`, 'info');
  };

  const decideApproval = async (approvalId: string, decision: 'approved' | 'rejected', notes?: string) => {
    const item = approvals.find((a) => a.id === approvalId);
    if (!item) return;

    if (decision === 'approved') {
      if (item.actionType === 'verify_payment' && item.paymentId) {
        await verifyPayment(item.paymentId, notes);
      } else if (item.payload?.jobId) {
        const res = await fetch(`/api/admin/jobs/${item.payload.jobId}/release`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force: Boolean(notes) }),
        });
        if (!res.ok) {
          const d = await res.json().catch(() => ({}));
          showToast('Release Blocked', d.error || 'Blocking QA checks failed.', 'error');
          return;
        }
      }
    } else if (item.payload?.jobId) {
      await fetch(`/api/admin/jobs/${item.payload.jobId}/send-back`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: notes || 'Returned by owner review' }),
      });
    }

    await refreshAdminData();
    showToast('Decision Recorded', `${approvalId} marked ${decision}.`, decision === 'approved' ? 'success' : 'info');
  };

  useEffect(() => {
    const verifiedCount = allPayments.filter((p) => p.status === 'Verified').length;
    setAutomationKpis({
      touchlessRatePct: allPayments.length ? Math.round((verifiedCount / allPayments.length) * 100) : 0,
      avgTimeToQuoteHours: 0,
      avgTimeToVerifyMins: 0,
      avgTimeToDeliverHours: 0,
      failureRatePct: 0,
      estimatedHoursSavedMonth: 0,
      totalAutomatedEvents: allAuditLogs.length,
    });
  }, [allPayments, allAuditLogs]);

  const openConcierge = (prefillService?: string) => {
    setConciergePrefillService(prefillService || null);
    setIsConciergeOpen(true);
  };

  const closeConcierge = () => {
    setIsConciergeOpen(false);
    setConciergePrefillService(null);
  };

  const clientOrders = currentClient ? allOrders.filter((o) => o.clientId === currentClient.clientId) : [];
  const clientPayments = currentClient ? allPayments.filter((p) => p.clientId === currentClient.clientId) : [];
  const clientSubscriptions = currentClient ? allSubscriptions.filter((s) => s.clientId === currentClient.clientId) : [];
  const clientDeliverables = currentClient ? allDeliverables.filter((d) => d.clientId === currentClient.clientId) : [];
  const clientInvoices = currentClient ? allInvoices.filter((i) => i.clientId === currentClient.clientId) : [];
  const clientMessages = currentClient ? allMessages.filter((m) => m.clientId === currentClient.clientId && !m.isInternalNote) : [];

  return (
    <AppContext.Provider
      value={{
        theme,
        toggleTheme,
        currency,
        toggleCurrency,
        language,
        toggleLanguage,
        t: translations[language],
        settings,
        updateSettings,
        services,
        updateService,
        addService,
        hideService,
        formatPrice,
        convertPrice,
        currentClient,
        clientOrders,
        clientPayments,
        clientSubscriptions,
        clientDeliverables,
        clientInvoices,
        clientMessages,
        loginClient,
        registerClient,
        changeClientPin,
        logoutClient,
        logoutAllDevices,
        refreshPortalData,
        createOrder,
        submitPaymentProof,
        approvePreview,
        requestRevision,
        reportProblem,
        isAdmin,
        loginAdmin,
        logoutAdmin,
        refreshAdminData,
        allOrders,
        allPayments,
        allClients,
        allSubscriptions,
        allDeliverables,
        allInvoices,
        allAuditLogs,
        allMessages,
        verifyPayment,
        verifyPartialPayment,
        rejectPayment,
        updateOrderStatus,
        deliverOrder,
        createClientAccount,
        resetClientPin,
        updateClientTrustTier,
        toggleClientBlock,
        reviews,
        addReview,
        supportTickets,
        createSupportTicket,
        updateTicketStatus,
        expenses,
        addExpense,
        parsePaymentSms,
        sendMessage,
        isConciergeOpen,
        openConcierge,
        closeConcierge,
        conciergePrefillService,
        toast,
        showToast,
        automationSettings,
        updateAutomationSettings,
        automationRules,
        updateAutomationRuleMode,
        automationRuns,
        approvals,
        decideApproval,
        automationKpis,
        incomingPayments,
        telegramLogs,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
