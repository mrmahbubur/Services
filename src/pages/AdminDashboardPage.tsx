import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldAlert,
  SlidersHorizontal,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CreditCard,
  Package,
  Users,
  Tv,
  MessageSquare,
  Settings,
  History,
  Download,
  Eye,
  Lock,
  Search,
  PlusCircle,
  RefreshCw,
  Edit2,
  Check,
  Send,
  ExternalLink,
  Wrench,
  Receipt,
} from 'lucide-react';
import { OrderStatus, ServiceItem, PaymentRecord, OrderRecord } from '../types';
import { AutomationControlCenter } from '../components/AutomationControlCenter';
import { OrderAiDraftStudio } from '../components/AiDraftStudio';
import { ShareKitTab } from '../components/ShareKitTab';
import { PaymentVerificationConsole } from '../components/PaymentVerificationConsole';
import { CamelliaDesk } from '../components/CamelliaDesk';
import { GoLiveGate } from '../components/GoLiveGate';
import { CamelliaAvatar } from '../services/camelliaService';
import { Zap, Sparkles, ShieldCheck, Layers } from 'lucide-react';
import { WorkCompletionModal } from '../components/WorkCompletionModal';
import { BrandLogo } from '../components/BrandLogo';
import { BRAND_KIT } from '../services/workEngineService';
import { DesignSystemAuditModal } from '../components/DesignSystemAuditModal';
import { GmailIntegrationConsole } from '../components/GmailIntegrationConsole';
import { AutonomousOperationsConsole } from '../components/AutonomousOperationsConsole';
import { SupabaseConsole } from '../components/SupabaseConsole';
import { Context7Console } from '../components/Context7Console';
import { VibeSecConsole } from '../components/VibeSecConsole';
import { PlaywrightMcpConsole } from '../components/PlaywrightMcpConsole';
import { AdminAutoVerifyConsole } from '../components/AdminAutoVerifyConsole';
import { Mail, Server, Database, Terminal } from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const {
    isAdmin,
    loginAdmin,
    logoutAdmin,
    allOrders,
    allPayments,
    allClients,
    allSubscriptions,
    allAuditLogs,
    verifyPayment,
    rejectPayment,
    updateOrderStatus,
    deliverOrder,
    createClientAccount,
    resetClientPin,
    toggleClientBlock,
    services,
    updateService,
    addService,
    hideService,
    settings,
    updateSettings,
    allMessages,
    sendMessage,
    supportTickets,
    updateTicketStatus,
    expenses,
    addExpense,
    refreshAdminData,
    theme,
    showToast,
  } = useApp();
  const isDark = theme === 'dark';

  // Admin login form
  const [adminPass, setAdminPass] = useState('');

  // Active admin tab
  const [adminTab, setAdminTab] = useState<
    'overview' | 'auto-verify' | 'camellia' | 'automation' | 'autonomous' | 'supabase' | 'context7' | 'vibesec' | 'playwright' | 'email' | 'golive' | 'payments' | 'orders' | 'clients' | 'iptv' | 'catalog' | 'sharekit' | 'messages' | 'tickets' | 'expenses' | 'settings' | 'audit'
  >(() => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname.includes('/auto-verify')) return 'auto-verify';
      if (window.location.pathname.includes('/payments')) return 'payments';
    }
    return 'overview';
  });

  // AI Draft Studio selected order modal
  const [draftStudioOrder, setDraftStudioOrder] = useState<OrderRecord | null>(null);
  const [workEngineOrder, setWorkEngineOrder] = useState<OrderRecord | null>(null);
  const [isDesignAuditOpen, setIsDesignAuditOpen] = useState(false);

  // Search & filter states
  const [clientSearch, setClientSearch] = useState('');
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientWhatsapp, setNewClientWhatsapp] = useState('');
  const [newClientCountry, setNewClientCountry] = useState('Bangladesh');
  const [newClientPin, setNewClientPin] = useState('');
  const [creatingClient, setCreatingClient] = useState(false);
  const [issuedClientCreds, setIssuedClientCreds] = useState<{ clientId: string; pin: string; label: string } | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'submitted' | 'verified' | 'rejected'>('submitted');
  const [orderFilter, setOrderFilter] = useState<'all' | 'pending' | 'inprogress' | 'delivered'>('all');

  // Modals state
  const [proofModalUrl, setProofModalUrl] = useState<string | null>(null);
  const [rejectModalPayment, setRejectModalPayment] = useState<PaymentRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('Amount not found on bank statement ending in 3282');
  const [deliverModalOrderId, setDeliverModalOrderId] = useState<string | null>(null);
  const [deliverTitle, setDeliverTitle] = useState('');
  const [deliverSummary, setDeliverSummary] = useState('');
  const [deliverContent, setDeliverContent] = useState('');
  const [deliverFormat, setDeliverFormat] = useState<'txt' | 'md' | 'json'>('txt');

  // Settings form (synced with hydrated settings)
  const [exchangeRateInput, setExchangeRateInput] = useState(settings.exchangeRate);
  const [ownerEmailInput, setOwnerEmailInput] = useState(settings.ownerEmail);
  const [whatsappInput, setWhatsappInput] = useState(settings.whatsappNumber);
  const [calendlyInput, setCalendlyInput] = useState(settings.calendlyUrl);

  useEffect(() => {
    setExchangeRateInput(settings.exchangeRate);
    setOwnerEmailInput(settings.ownerEmail);
    setWhatsappInput(settings.whatsappNumber);
    setCalendlyInput(settings.calendlyUrl);
  }, [settings.exchangeRate, settings.ownerEmail, settings.whatsappNumber, settings.calendlyUrl]);

  // Message reply
  const [replyText, setReplyText] = useState('');
  const [selectedClientForMsg, setSelectedClientForMsg] = useState<string>(allClients[0]?.clientId || '');
  const [selectedOrderForMsg, setSelectedOrderForMsg] = useState<string>('');
  const [isInternalNoteMsg, setIsInternalNoteMsg] = useState(false);

  useEffect(() => {
    if (!selectedClientForMsg && allClients.length > 0) {
      setSelectedClientForMsg(allClients[0].clientId);
    }
  }, [allClients, selectedClientForMsg]);

  useEffect(() => {
    const clientOrders = allOrders.filter((o) => o.clientId === selectedClientForMsg);
    if (clientOrders.length > 0 && !clientOrders.some((o) => o.orderId === selectedOrderForMsg)) {
      setSelectedOrderForMsg(clientOrders[0].orderId);
    } else if (clientOrders.length === 0) {
      setSelectedOrderForMsg('');
    }
  }, [selectedClientForMsg, allOrders, selectedOrderForMsg]);

  // IPTV provision / edit states
  const [showIptvForm, setShowIptvForm] = useState(false);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [iptvClientId, setIptvClientId] = useState('');
  const [iptvPlan, setIptvPlan] = useState<'1-month' | '2-month' | '6-month' | '12-month'>('1-month');
  const [iptvServerUrl, setIptvServerUrl] = useState('');
  const [iptvCredentials, setIptvCredentials] = useState('');
  const [iptvStatus, setIptvStatus] = useState<'active' | 'expired' | 'suspended'>('active');
  const [savingIptv, setSavingIptv] = useState(false);

  // Catalog add / edit states
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [svcName, setSvcName] = useState('');
  const [svcCategory, setSvcCategory] = useState<ServiceItem['category']>('M R S Services');
  const [svcRateUSD, setSvcRateUSD] = useState('');
  const [svcRateBDT, setSvcRateBDT] = useState('');
  const [svcFixedPriceUSD, setSvcFixedPriceUSD] = useState('');
  const [svcTurnaround, setSvcTurnaround] = useState('24–48 hours');
  const [svcShortDesc, setSvcShortDesc] = useState('');

  // Expense form states
  const [expTitle, setExpTitle] = useState('');
  const [expCategory, setExpCategory] = useState<'tools' | 'hosting' | 'fees' | 'other'>('tools');
  const [expAmountUSD, setExpAmountUSD] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().slice(0, 10));
  const [expNotes, setExpNotes] = useState('');

  // Revenue metrics calculation
  const verifiedPayments = allPayments.filter((p) => p.status === 'Verified');
  const totalRevenueUSD = verifiedPayments.reduce((acc, p) => {
    return acc + (p.currency === 'USD' ? p.amount : Math.round(p.amount / (settings.exchangeRate || 100)));
  }, 0);
  const totalRevenueBDT = Math.round(totalRevenueUSD * (settings.exchangeRate || 100));

  const pendingPaymentsCount = allPayments.filter((p) => p.status === 'Payment submitted').length;
  const activeOrdersCount = allOrders.filter((o) => o.status !== 'Delivered' && o.status !== 'Rejected').length;

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginAdmin(adminPass);
    setAdminPass('');
  };

  // CSV Exporters
  const exportOrdersCSV = () => {
    const headers = ['OrderId,ClientId,ClientName,Service,AmountUSD,Status,CreatedAt\n'];
    const rows = allOrders.map((o) =>
      `"${o.orderId}","${o.clientId}","${o.clientName}","${o.serviceName}","${o.quoteAmount}","${o.status}","${o.createdAt}"\n`
    );
    const blob = new Blob([...headers, ...rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MRS_Orders_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Export Complete', 'Orders exported to CSV', 'success');
  };

  const exportPaymentsCSV = () => {
    const headers = ['PaymentId,OrderId,ClientId,Method,Amount,Currency,TrxId,Status,CreatedAt\n'];
    const rows = allPayments.map((p) =>
      `"${p.paymentId}","${p.orderId}","${p.clientId}","${p.method}","${p.amount}","${p.currency}","${p.trxId}","${p.status}","${p.createdAt}"\n`
    );
    const blob = new Blob([...headers, ...rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MRS_Payments_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Export Complete', 'Payments exported to CSV', 'success');
  };

  const downloadAccountantPack = async () => {
    try {
      const res = await fetch('/api/admin/accountant-pack');
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast('Export Failed', err.error || 'Could not generate accountant pack from server.', 'error');
        return;
      }
      const data = await res.json();
      const blob = new Blob([data.csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `MRS_Foreign_Income_Accountant_Pack_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Accountant Pack Downloaded', `Exported ${data.summary.totalRecords} records. Foreign Income: $${data.summary.totalForeignIncomeUSD}`, 'success');
    } catch (err: any) {
      showToast('Export Error', err?.message || 'Network error while downloading accountant pack.', 'error');
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModalPayment) return;
    await rejectPayment(rejectModalPayment.paymentId, rejectReason);
    setRejectModalPayment(null);
  };

  const handleConfirmDeliver = () => {
    if (!deliverModalOrderId || !deliverTitle.trim() || !deliverContent.trim()) return;
    deliverOrder(deliverModalOrderId, deliverTitle, deliverSummary, deliverContent, deliverFormat);
    setDeliverModalOrderId(null);
    setDeliverTitle('');
    setDeliverSummary('');
    setDeliverContent('');
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({
      ...settings,
      exchangeRate: Number(exchangeRateInput),
      ownerEmail: ownerEmailInput,
      whatsappNumber: whatsappInput,
      calendlyUrl: calendlyInput,
    });
  };

  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedClientForMsg) return;
    const targetOrderId =
      selectedOrderForMsg ||
      allOrders.find((o) => o.clientId === selectedClientForMsg)?.orderId;
    if (!targetOrderId) {
      showToast('No Order Thread', 'Select a client with at least one order thread to dispatch a reply.', 'warning');
      return;
    }
    await sendMessage(replyText.trim(), targetOrderId, true, isInternalNoteMsg, selectedClientForMsg);
    setReplyText('');
    setIsInternalNoteMsg(false);
    showToast('Reply Sent', `Message saved on order ${targetOrderId}`, 'success');
  };

  // IF NOT ADMIN: Show Owner Login Gate
  if (!isAdmin) {
    return (
      <div className={`min-h-[80vh] flex flex-col items-center justify-center px-4 py-12 ${isDark ? 'text-[#E6EDF7]' : 'text-[#0B1220]'}`}>
        <div
          className={`w-full max-w-md p-8 rounded-2xl border shadow-2xl space-y-6 ${
            isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200'
          }`}
        >
          <div className="text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="font-heading font-extrabold text-2xl tracking-tight">
              Executive Owner Console
            </h2>
            <p className="text-xs text-slate-400">
              Restricted to authorized owner email: <strong>mr216873@gmail.com</strong>
            </p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                Owner Security Key / Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input
                  type="password"
                  required
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                  placeholder="Enter owner authorization key"
                  className={`w-full rounded-xl pl-9 pr-3 py-2.5 font-mono text-sm border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                    isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-heading font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-md"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Authorize Executive Access</span>
            </button>
          </form>

        </div>
      </div>
    );
  }

  // IF ADMIN AUTHENTICATED: Show Complete Command Center
  return (
    <div className={`min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 ${isDark ? 'text-[#E6EDF7]' : 'text-[#0B1220]'}`}>
      
      {/* Top Banner */}
      <div
        className={`p-6 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
            <SlidersHorizontal className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading font-bold text-lg text-inherit">Owner Executive Command Desk</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                mr216873@gmail.com
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live payment audits, SLA task tracking, client registry, and automated dispatch.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={exportOrdersCSV}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              isDark
                ? 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
                : 'border-slate-300 bg-slate-100 text-slate-700 hover:text-slate-950'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-cyan-500" />
            <span>Export Orders CSV</span>
          </button>

          <button
            onClick={exportPaymentsCSV}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              isDark
                ? 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
                : 'border-slate-300 bg-slate-100 text-slate-700 hover:text-slate-950'
            }`}
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" />
            <span>Export Payments CSV</span>
          </button>

          <button
            onClick={downloadAccountantPack}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm ${
              isDark
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
            title="Foreign Income Documentation & Ledger (Section 6)"
          >
            <Download className="w-3.5 h-3.5 text-amber-500" />
            <span>Accountant Pack</span>
          </button>

          <button
            onClick={logoutAdmin}
            className={`p-2 rounded-xl border text-xs ${
              isDark
                ? 'border-slate-700 bg-slate-900 text-slate-400 hover:text-rose-400'
                : 'border-slate-300 bg-white text-slate-600 hover:text-rose-600'
            }`}
            title="Log Out Admin"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Admin Nav Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
        <button
          onClick={() => setAdminTab('overview')}
          className={`px-3.5 py-2 rounded-xl border transition-colors ${
            adminTab === 'overview'
              ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
              : isDark
              ? 'bg-[#111B2E] border-[#22314D] text-slate-400 hover:text-white'
              : 'bg-white border-slate-300 text-slate-700 hover:text-slate-950'
          }`}
        >
          Overview & Metrics
        </button>

        <button
          onClick={() => setAdminTab('camellia')}
          className={`px-3.5 py-2 rounded-xl border flex items-center gap-1.5 transition-colors ${
            adminTab === 'camellia'
              ? 'bg-pink-500 text-slate-950 font-bold border-pink-400 shadow-md ring-1 ring-pink-500/30'
              : isDark
              ? 'bg-[#111B2E] border-[#22314D] text-pink-300 hover:text-white'
              : 'bg-white border-slate-300 text-pink-600 hover:text-slate-950'
          }`}
        >
          <CamelliaAvatar size={16} />
          <span>Camellia Desk</span>
        </button>

        <button
          onClick={() => setAdminTab('golive')}
          className={`px-3.5 py-2 rounded-xl border flex items-center gap-1.5 transition-colors ${
            adminTab === 'golive'
              ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md'
              : isDark
              ? 'bg-[#111B2E] border-[#22314D] text-amber-400 hover:text-white'
              : 'bg-white border-slate-300 text-amber-600 hover:text-slate-950'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Go-Live Gate</span>
        </button>

        <button
          onClick={() => setAdminTab('automation')}
          className={`px-3.5 py-2 rounded-xl border flex items-center gap-1.5 transition-colors ${
            adminTab === 'automation'
              ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-md ring-1 ring-cyan-500/30'
              : isDark
              ? 'bg-[#111B2E] border-[#22314D] text-cyan-400 hover:text-white'
              : 'bg-white border-slate-300 text-cyan-600 hover:text-slate-950'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>⚡ Automation Engine</span>
        </button>

        <button
          onClick={() => setAdminTab('autonomous')}
          className={`px-3.5 py-2 rounded-xl border flex items-center gap-1.5 transition-colors ${
            adminTab === 'autonomous'
              ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md ring-1 ring-amber-500/30'
              : isDark
              ? 'bg-[#111B2E] border-[#22314D] text-amber-400 hover:text-white'
              : 'bg-white border-slate-300 text-amber-600 hover:text-slate-950'
          }`}
        >
          <Server className="w-3.5 h-3.5" />
          <span>Autonomous Ops (Sec. 16)</span>
        </button>

        <button
          onClick={() => setAdminTab('supabase')}
          className={`px-3.5 py-2 rounded-xl border flex items-center gap-1.5 transition-colors ${
            adminTab === 'supabase'
              ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-md ring-1 ring-emerald-500/30'
              : isDark
              ? 'bg-[#111B2E] border-[#22314D] text-emerald-400 hover:text-white'
              : 'bg-white border-slate-300 text-emerald-600 hover:text-slate-950'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Supabase DB</span>
        </button>

        <button
          onClick={() => setAdminTab('context7')}
          className={`px-3.5 py-2 rounded-xl border flex items-center gap-1.5 transition-colors ${
            adminTab === 'context7'
              ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-md ring-1 ring-cyan-500/30'
              : isDark
              ? 'bg-[#111B2E] border-[#22314D] text-cyan-300 hover:text-white'
              : 'bg-white border-slate-300 text-cyan-600 hover:text-slate-950'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Context7 (7D)</span>
        </button>

        <button
          onClick={() => setAdminTab('vibesec')}
          className={`px-3.5 py-2 rounded-xl border flex items-center gap-1.5 transition-colors ${
            adminTab === 'vibesec'
              ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400 shadow-md ring-1 ring-emerald-500/30'
              : isDark
              ? 'bg-[#111B2E] border-[#22314D] text-emerald-400 hover:text-white'
              : 'bg-white border-slate-300 text-emerald-600 hover:text-slate-950'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>VibeSec Audit</span>
        </button>

        <button
          onClick={() => setAdminTab('playwright')}
          className={`px-3.5 py-2 rounded-xl border flex items-center gap-1.5 transition-colors ${
            adminTab === 'playwright'
              ? 'bg-violet-500 text-slate-950 font-bold border-violet-400 shadow-md ring-1 ring-violet-500/30'
              : isDark
              ? 'bg-[#111B2E] border-[#22314D] text-violet-300 hover:text-white'
              : 'bg-white border-slate-300 text-violet-600 hover:text-slate-950'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Playwright MCP</span>
        </button>

        <button
          onClick={() => setAdminTab('email')}
          className={`px-3.5 py-2 rounded-xl border flex items-center gap-1.5 transition-colors ${
            adminTab === 'email'
              ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-md ring-1 ring-cyan-500/30'
              : isDark
              ? 'bg-[#111B2E] border-[#22314D] text-cyan-300 hover:text-white'
              : 'bg-white border-slate-300 text-cyan-600 hover:text-slate-950'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Gmail Inbox (Sec. 15)</span>
        </button>

        <button
          onClick={() => setAdminTab('auto-verify')}
          className={`px-3.5 py-2 rounded-xl border flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
            adminTab === 'auto-verify'
              ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
              : isDark
              ? 'bg-[#111B2E] border-[#22314D] text-cyan-300 hover:text-white'
              : 'bg-white border-slate-300 text-cyan-700 hover:text-slate-950'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Auto-Verify (Lite 6)</span>
        </button>

        <button
          onClick={() => setAdminTab('payments')}
          className={`px-3.5 py-2 rounded-xl border flex items-center gap-1.5 transition-colors ${
            adminTab === 'payments'
              ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
              : isDark
              ? 'bg-[#111B2E] border-[#22314D] text-slate-400 hover:text-white'
              : 'bg-white border-slate-300 text-slate-700 hover:text-slate-950'
          }`}
        >
          <span>Payments Queue</span>
          {pendingPaymentsCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 font-mono text-[10px] font-bold flex items-center justify-center">
              {pendingPaymentsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setAdminTab('orders')}
          className={`px-3.5 py-2 rounded-xl border transition-colors ${
            adminTab === 'orders'
              ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
              : isDark
              ? 'bg-[#111B2E] border-[#22314D] text-slate-400 hover:text-white'
              : 'bg-white border-slate-300 text-slate-700 hover:text-slate-950'
          }`}
        >
          Orders ({allOrders.length})
        </button>

        <button
          onClick={() => setAdminTab('clients')}
          className={`px-3.5 py-2 rounded-xl border transition-colors ${
            adminTab === 'clients'
              ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
              : isDark
              ? 'bg-[#111B2E] border-[#22314D] text-slate-400 hover:text-white'
              : 'bg-white border-slate-300 text-slate-700 hover:text-slate-950'
          }`}
        >
          Clients ({allClients.length})
        </button>

        <button
          onClick={() => setAdminTab('iptv')}
          className={`px-3.5 py-2 rounded-xl border transition-colors ${
            adminTab === 'iptv'
              ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
              : isDark
              ? 'bg-[#111B2E] border-[#22314D] text-slate-400 hover:text-white'
              : 'bg-white border-slate-300 text-slate-700 hover:text-slate-950'
          }`}
        >
          IPTV Subscriptions ({allSubscriptions.length})
        </button>

        <button
          onClick={() => setAdminTab('catalog')}
          className={`px-3.5 py-2 rounded-xl border transition-colors ${
            adminTab === 'catalog'
              ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
              : isDark
              ? 'bg-[#111B2E] border-[#22314D] text-slate-400 hover:text-white'
              : 'bg-white border-slate-300 text-slate-700 hover:text-slate-950'
          }`}
        >
          Catalog Manager ({services.length})
        </button>

        <button
          onClick={() => setAdminTab('sharekit')}
          className={`px-3.5 py-2 rounded-xl border transition-colors ${
            adminTab === 'sharekit'
              ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
              : isDark
              ? 'bg-[#111B2E] border-[#22314D] text-slate-400 hover:text-white'
              : 'bg-white border-slate-300 text-slate-700 hover:text-slate-950'
          }`}
        >
          Share Kit & Links
        </button>

        <button
          onClick={() => setAdminTab('messages')}
          className={`px-3.5 py-2 rounded-xl border shrink-0 transition-colors ${
            adminTab === 'messages'
              ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
              : isDark
              ? 'bg-[#111B2E] border-[#22314D] text-slate-400 hover:text-white'
              : 'bg-white border-slate-300 text-slate-700 hover:text-slate-950'
          }`}
        >
          Messages ({allMessages.length})
        </button>

        <button
          onClick={() => setAdminTab('tickets')}
          className={`px-3.5 py-2 rounded-xl border shrink-0 flex items-center gap-1.5 transition-colors ${
            adminTab === 'tickets'
              ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
              : isDark
              ? 'bg-[#111B2E] border-[#22314D] text-slate-400 hover:text-white'
              : 'bg-white border-slate-300 text-slate-700 hover:text-slate-950'
          }`}
        >
          <span>Support Tickets</span>
          {supportTickets.filter((t) => t.status !== 'resolved').length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-mono text-[10px] font-bold">
              {supportTickets.filter((t) => t.status !== 'resolved').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setAdminTab('expenses')}
          className={`px-3.5 py-2 rounded-xl border shrink-0 transition-colors ${
            adminTab === 'expenses'
              ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
              : isDark
              ? 'bg-[#111B2E] border-[#22314D] text-slate-400 hover:text-white'
              : 'bg-white border-slate-300 text-slate-700 hover:text-slate-950'
          }`}
        >
          Expenses ({expenses.length})
        </button>

        <button
          onClick={() => setAdminTab('settings')}
          className={`px-3.5 py-2 rounded-xl border shrink-0 transition-colors ${
            adminTab === 'settings'
              ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
              : isDark
              ? 'bg-[#111B2E] border-[#22314D] text-slate-400 hover:text-white'
              : 'bg-white border-slate-300 text-slate-700 hover:text-slate-950'
          }`}
        >
          Settings
        </button>

        <button
          onClick={() => setAdminTab('audit')}
          className={`px-3.5 py-2 rounded-xl border shrink-0 transition-colors ${
            adminTab === 'audit'
              ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
              : isDark
              ? 'bg-[#111B2E] border-[#22314D] text-slate-400 hover:text-white'
              : 'bg-white border-slate-300 text-slate-700 hover:text-slate-950'
          }`}
        >
          Audit Ledger
        </button>
      </div>

      {/* ===================================================================== */}
      {/* 1. OVERVIEW TAB */}
      {/* ===================================================================== */}
      {adminTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200'}`}>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Settled Revenue
              </span>
              <div className="font-mono font-extrabold text-2xl text-emerald-400">
                ${totalRevenueUSD} USD
              </div>
              <span className="text-[11px] text-slate-500 font-mono mt-0.5 block">
                (~{totalRevenueBDT.toLocaleString()} TK)
              </span>
            </div>

            <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200'}`}>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Pending Verification
              </span>
              <div className="font-mono font-extrabold text-2xl text-amber-400">
                {pendingPaymentsCount} Proofs
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Awaiting statement audit
              </span>
            </div>

            <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200'}`}>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Active Projects
              </span>
              <div className="font-mono font-extrabold text-2xl text-cyan-400">
                {activeOrdersCount} Orders
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Across 16 catalog services
              </span>
            </div>

            <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200'}`}>
              <span className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Registered Clients
              </span>
              <div className={`font-mono font-extrabold text-2xl ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                {allClients.length} Profiles
              </div>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Isolated Client IDs
              </span>
            </div>

          </div>

          {/* Quick Action Alerts */}
          {pendingPaymentsCount > 0 && (
            <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
              isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-300'
            }`}>
              <div className={`flex items-center gap-2.5 ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                <span>
                  You have <strong>{pendingPaymentsCount} payment remittance(s)</strong> awaiting audit against your bKash / Payoneer / Binance statement.
                </span>
              </div>
              <button
                onClick={() => setAdminTab('payments')}
                className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shrink-0"
              >
                Open Payments Queue
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* CAMELLIA AUTONOMOUS OPERATIONS DESK */}
      {/* ===================================================================== */}
      {adminTab === 'camellia' && <CamelliaDesk />}

      {/* ===================================================================== */}
      {/* PRODUCTION GO-LIVE GATE (13 CHECKS) */}
      {/* ===================================================================== */}
      {adminTab === 'golive' && <GoLiveGate />}

      {/* ===================================================================== */}
      {/* AUTOMATION ENGINE CONTROL CENTER */}
      {/* ===================================================================== */}
      {adminTab === 'automation' && <AutomationControlCenter />}

      {/* ===================================================================== */}
      {/* SECTION 16: AUTONOMOUS OPERATIONS & SELF-HEALING CONSOLE */}
      {/* ===================================================================== */}
      {adminTab === 'autonomous' && <AutonomousOperationsConsole />}

      {/* ===================================================================== */}
      {/* SUPABASE POSTGRESQL ARCHITECTURE & CONNECTION CONSOLE */}
      {/* ===================================================================== */}
      {adminTab === 'supabase' && <SupabaseConsole />}

      {/* ===================================================================== */}
      {/* CONTEXT7: 7-DIMENSION OPERATIONAL GROUNDING MANIFEST */}
      {/* ===================================================================== */}
      {adminTab === 'context7' && <Context7Console />}

      {/* ===================================================================== */}
      {/* VIBESEC: ENTERPRISE SECURITY AUDIT & HEADERS CONSOLE */}
      {/* ===================================================================== */}
      {adminTab === 'vibesec' && <VibeSecConsole />}

      {/* ===================================================================== */}
      {/* PLAYWRIGHT MCP: SYNTHETIC E2E TEST RUNNER CONSOLE */}
      {/* ===================================================================== */}
      {adminTab === 'playwright' && <PlaywrightMcpConsole />}

      {/* ===================================================================== */}
      {/* SECTION 15: GMAIL INTEGRATION & UNIFIED EMAIL INBOX */}
      {/* ===================================================================== */}
      {adminTab === 'email' && <GmailIntegrationConsole />}

      {/* ===================================================================== */}
      {/* ===================================================================== */}
      {/* LITE 6 EVIDENCE MODE AUTO-VERIFY CONSOLE */}
      {/* ===================================================================== */}
      {adminTab === 'auto-verify' && <AdminAutoVerifyConsole />}

      {/* ===================================================================== */}
      {/* 2. PAYMENTS QUEUE - AUTHORITATIVE VERIFICATION CONSOLE */}
      {/* ===================================================================== */}
      {adminTab === 'payments' && <PaymentVerificationConsole />}

      {/* ===================================================================== */}
      {/* 3. ORDERS QUEUE */}
      {/* ===================================================================== */}
      {adminTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-base">Client Orders & SOW Scopes</h3>
          </div>

          <div className={`rounded-2xl border overflow-x-auto ${isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200'}`}>
            <table className="w-full text-xs text-left">
              <thead className={`border-b font-mono ${isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
                <tr>
                  <th className="p-3.5">OrderId</th>
                  <th className="p-3.5">Client</th>
                  <th className="p-3.5">Service</th>
                  <th className="p-3.5">Details</th>
                  <th className="p-3.5">Quote</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800/40' : 'divide-slate-100'}`}>
                {allOrders.map((o) => (
                  <tr key={o.orderId} className={`transition-colors ${isDark ? 'hover:bg-slate-900/30' : 'hover:bg-slate-50'}`}>
                    <td className="p-3.5 font-mono font-bold text-cyan-500 whitespace-nowrap">{o.orderId}</td>
                    <td className="p-3.5">
                      <div className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{o.clientName}</div>
                      <div className="font-mono text-[10px] text-slate-500">{o.clientId}</div>
                    </td>
                    <td className="p-3.5 font-medium">{o.serviceName}</td>
                    <td className={`p-3.5 max-w-xs truncate ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{o.details}</td>
                    <td className="p-3.5 font-mono font-bold text-emerald-500">${o.quoteAmount}</td>
                    <td className="p-3.5">
                      <select
                        value={o.status}
                        onChange={(e: any) => updateOrderStatus(o.orderId, e.target.value)}
                        className={`rounded px-2 py-1 text-[11px] font-bold border ${
                          isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                        }`}
                      >
                        <option value="Pending">Pending</option>
                        <option value="Awaiting payment">Awaiting payment</option>
                        <option value="Payment submitted">Payment submitted</option>
                        <option value="Verified">Verified</option>
                        <option value="In progress">In progress</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Expired">Expired</option>
                      </select>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setWorkEngineOrder(o)}
                          className="px-2.5 py-1 rounded-lg bg-pink-500/15 border border-pink-500/30 text-pink-300 hover:bg-pink-500/25 font-bold text-[11px] flex items-center gap-1 transition-colors"
                          title="Open Section 7 Universal Work Engine (8 Stages)"
                        >
                          <Layers className="w-3 h-3 text-pink-400" />
                          <span>Work Engine</span>
                        </button>

                        <button
                          onClick={() => setDraftStudioOrder(o)}
                          className="px-2.5 py-1 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25 font-bold text-[11px] flex items-center gap-1 transition-colors"
                          title="Open Camellia Studio with side-by-side QA"
                        >
                          <Sparkles className="w-3 h-3 text-cyan-400" />
                          <span>Studio</span>
                        </button>

                        <button
                          onClick={() => {
                            setDeliverModalOrderId(o.orderId);
                            setDeliverTitle(`${o.serviceName} Final Deliverable`);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-[11px] transition-colors"
                        >
                          Deliver
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 4. CLIENTS REGISTRY */}
      {/* ===================================================================== */}
      {adminTab === 'clients' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-heading font-bold text-base">Client Accounts Registry (Server-Stored)</h3>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64 text-xs">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  placeholder="Search Client ID or name..."
                  className={`w-full rounded-xl pl-9 pr-3 py-2 border ${
                    isDark ? 'bg-[#111B2E] border-[#22314D] text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              <button
                type="button"
                onClick={() => setShowNewClientForm((v) => !v)}
                className="px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shrink-0"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{showNewClientForm ? 'Close' : 'Issue Client ID & PIN'}</span>
              </button>
            </div>
          </div>

          {issuedClientCreds && (
            <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <div className="font-bold text-emerald-300">{issuedClientCreds.label}</div>
                <p className="text-slate-300 mt-0.5">
                  Client ID: <strong className="font-mono text-white">{issuedClientCreds.clientId}</strong> · Server-Stored PIN:{' '}
                  <strong className="font-mono text-amber-300">{issuedClientCreds.pin}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIssuedClientCreds(null)}
                className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs self-start sm:self-center"
              >
                Dismiss
              </button>
            </div>
          )}

          {showNewClientForm && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newClientName.trim() || !newClientEmail.trim()) return;
                setCreatingClient(true);
                try {
                  const res = await createClientAccount({
                    name: newClientName.trim(),
                    email: newClientEmail.trim(),
                    whatsapp: newClientWhatsapp.trim(),
                    country: newClientCountry.trim(),
                    pin: newClientPin.trim() || undefined,
                  });
                  setIssuedClientCreds({
                    clientId: res.client.clientId,
                    pin: res.plainPin,
                    label: 'New Client Account Created on Server',
                  });
                  setNewClientName('');
                  setNewClientEmail('');
                  setNewClientWhatsapp('');
                  setNewClientPin('');
                  setShowNewClientForm(false);
                } catch {}
                setCreatingClient(false);
              }}
              className={`p-4 rounded-2xl border grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs ${
                isDark ? 'bg-[#111B2E] border-cyan-500/30' : 'bg-white border-slate-200'
              }`}
            >
              <input
                type="text"
                required
                value={newClientName}
                onChange={(e) => setNewClientName(e.target.value)}
                placeholder="Client Full Name *"
                className={`rounded-xl px-3 py-2 border ${isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300'}`}
              />
              <input
                type="email"
                required
                value={newClientEmail}
                onChange={(e) => setNewClientEmail(e.target.value)}
                placeholder="Client Email *"
                className={`rounded-xl px-3 py-2 border ${isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300'}`}
              />
              <input
                type="text"
                value={newClientWhatsapp}
                onChange={(e) => setNewClientWhatsapp(e.target.value)}
                placeholder="WhatsApp (+880...)"
                className={`rounded-xl px-3 py-2 border ${isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300'}`}
              />
              <input
                type="text"
                maxLength={6}
                inputMode="numeric"
                value={newClientPin}
                onChange={(e) => setNewClientPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="6-Digit PIN (auto if blank)"
                className={`rounded-xl px-3 py-2 font-mono border ${isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300'}`}
              />
              <button
                type="submit"
                disabled={creatingClient}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold disabled:opacity-50"
              >
                {creatingClient ? 'Saving...' : 'Create on Server'}
              </button>
            </form>
          )}

          <div className={`rounded-2xl border overflow-x-auto ${isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200'}`}>
            <table className="w-full text-xs text-left">
              <thead className={`border-b font-mono ${isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
                <tr>
                  <th className="p-3.5">Client ID</th>
                  <th className="p-3.5">Name</th>
                  <th className="p-3.5">Contact</th>
                  <th className="p-3.5">Country</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Registered</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800/40' : 'divide-slate-100'}`}>
                {allClients
                  .filter((c) => {
                    const q = clientSearch.toLowerCase();
                    return c.clientId.toLowerCase().includes(q) || c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
                  })
                  .map((c) => (
                    <tr key={c.clientId} className={`transition-colors ${isDark ? 'hover:bg-slate-900/30' : 'hover:bg-slate-50'}`}>
                      <td className="p-3.5 font-mono font-bold text-cyan-500 whitespace-nowrap">{c.clientId}</td>
                      <td className={`p-3.5 font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{c.name}</td>
                      <td className={isDark ? 'p-3.5 text-slate-300' : 'p-3.5 text-slate-700'}>
                        <div>{c.email}</div>
                        <div className="text-[10px] text-slate-500">{c.whatsapp}</div>
                      </td>
                      <td className="p-3.5 text-slate-500">{c.country}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-slate-500">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={async () => {
                            try {
                              const pin = await resetClientPin(c.clientId);
                              setIssuedClientCreds({
                                clientId: c.clientId,
                                pin,
                                label: 'Client PIN Rotated & Stored on Server',
                              });
                            } catch {}
                          }}
                          className={`px-2 py-1 rounded border text-[11px] font-semibold ${
                            isDark
                              ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                          }`}
                          title="Generate new 6-digit access PIN"
                        >
                          Reset PIN
                        </button>
                        <button
                          onClick={() => toggleClientBlock(c.clientId)}
                          className={`px-2 py-1 rounded text-[11px] font-bold ${
                            c.status === 'active'
                              ? 'bg-rose-500/10 border border-rose-500/30 text-rose-500 hover:bg-rose-500/20'
                              : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20'
                          }`}
                        >
                          {c.status === 'active' ? 'Block' : 'Unblock'}
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 5. IPTV SUBSCRIPTIONS */}
      {/* ===================================================================== */}
      {adminTab === 'iptv' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-heading font-bold text-base">IPTV Subscriptions & Credentials Management</h3>
            <button
              type="button"
              onClick={() => {
                setEditingSubId(null);
                setIptvClientId(allClients[0]?.clientId || '');
                setIptvPlan('1-month');
                setIptvServerUrl('');
                setIptvCredentials('');
                setIptvStatus('active');
                setShowIptvForm((v) => !v);
              }}
              className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 self-start sm:self-auto"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{showIptvForm && !editingSubId ? 'Close Form' : 'Provision IPTV Pass'}</span>
            </button>
          </div>

          {showIptvForm && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!iptvClientId.trim()) return;
                setSavingIptv(true);
                try {
                  const targetClient = allClients.find((c) => c.clientId === iptvClientId.trim());
                  const url = editingSubId ? `/api/admin/subscriptions/${editingSubId}` : '/api/admin/subscriptions';
                  const method = editingSubId ? 'PUT' : 'POST';
                  const res = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      clientId: iptvClientId.trim(),
                      clientName: targetClient?.name || iptvClientId.trim(),
                      clientEmail: targetClient?.email || '',
                      plan: iptvPlan,
                      status: iptvStatus,
                      serverUrl: iptvServerUrl.trim(),
                      credentials: iptvCredentials.trim(),
                    }),
                  });
                  if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    showToast('IPTV Save Failed', err.error || 'Could not save subscription.', 'error');
                  } else {
                    await refreshAdminData();
                    showToast(
                      editingSubId ? 'Subscription Updated' : 'IPTV Pass Provisioned',
                      `Saved for client ${iptvClientId.trim()}`,
                      'success'
                    );
                    setShowIptvForm(false);
                    setEditingSubId(null);
                  }
                } finally {
                  setSavingIptv(false);
                }
              }}
              className={`p-4 rounded-2xl border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs ${
                isDark ? 'bg-[#111B2E] border-cyan-500/30' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div>
                <label className="block text-slate-500 mb-1">Client ID *</label>
                <select
                  value={iptvClientId}
                  onChange={(e) => setIptvClientId(e.target.value)}
                  disabled={Boolean(editingSubId)}
                  className={`w-full rounded-xl px-3 py-2 border ${
                    isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  {allClients.map((c) => (
                    <option key={c.clientId} value={c.clientId}>
                      {c.clientId} ({c.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Plan</label>
                <select
                  value={iptvPlan}
                  onChange={(e) => setIptvPlan(e.target.value as any)}
                  className={`w-full rounded-xl px-3 py-2 border ${
                    isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="1-month">1-month</option>
                  <option value="2-month">2-month</option>
                  <option value="6-month">6-month</option>
                  <option value="12-month">12-month</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Status</label>
                <select
                  value={iptvStatus}
                  onChange={(e) => setIptvStatus(e.target.value as any)}
                  className={`w-full rounded-xl px-3 py-2 border ${
                    isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="active">active</option>
                  <option value="suspended">suspended</option>
                  <option value="expired">expired</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Server Portal URL</label>
                <input
                  type="text"
                  value={iptvServerUrl}
                  onChange={(e) => setIptvServerUrl(e.target.value)}
                  placeholder="http://xtream.example.com:8080"
                  className={`w-full rounded-xl px-3 py-2 border font-mono ${
                    isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-500 mb-1">Xtream / M3U Credentials</label>
                <input
                  type="text"
                  value={iptvCredentials}
                  onChange={(e) => setIptvCredentials(e.target.value)}
                  placeholder="User: ... | Pass: ..."
                  className={`w-full rounded-xl px-3 py-2 border font-mono ${
                    isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  disabled={savingIptv}
                  className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold disabled:opacity-50"
                >
                  {savingIptv ? 'Saving...' : editingSubId ? 'Update' : 'Save Pass'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowIptvForm(false);
                    setEditingSubId(null);
                  }}
                  className={`py-2 px-3 rounded-xl border ${isDark ? 'border-slate-700 text-slate-300' : 'border-slate-300 text-slate-700'}`}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className={`rounded-2xl border overflow-x-auto ${isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200'}`}>
            <table className="w-full text-xs text-left">
              <thead className={`border-b font-mono ${isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
                <tr>
                  <th className="p-3.5">Sub ID</th>
                  <th className="p-3.5">Client</th>
                  <th className="p-3.5">Plan</th>
                  <th className="p-3.5">Valid Range</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Credentials (Client Visible)</th>
                  <th className="p-3.5 text-right">Edit</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800/40' : 'divide-slate-100'}`}>
                {allSubscriptions.map((sub) => (
                  <tr key={sub.subscriptionId} className={`transition-colors ${isDark ? 'hover:bg-slate-900/30' : 'hover:bg-slate-50'}`}>
                    <td className="p-3.5 font-mono text-cyan-500 font-bold whitespace-nowrap">{sub.subscriptionId}</td>
                    <td className="p-3.5 font-medium">{sub.clientName} ({sub.clientId})</td>
                    <td className="p-3.5 font-bold uppercase whitespace-nowrap">{sub.plan}</td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(sub.startDate).toLocaleDateString()} – {new Date(sub.endDate).toLocaleDateString()}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        sub.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : sub.status === 'suspended'
                          ? 'bg-amber-500/10 text-amber-500'
                          : 'bg-rose-500/10 text-rose-500'
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className={`p-3.5 font-mono text-[11px] max-w-xs truncate ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {sub.credentials || 'Pending creation'}
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSubId(sub.subscriptionId);
                          setIptvClientId(sub.clientId);
                          setIptvPlan((sub.plan as any) || '1-month');
                          setIptvStatus((sub.status as any) || 'active');
                          setIptvServerUrl(sub.serverUrl || '');
                          setIptvCredentials(sub.credentials || '');
                          setShowIptvForm(true);
                        }}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1 ${
                          isDark
                            ? 'bg-slate-800 border-slate-700 text-cyan-300 hover:bg-slate-700'
                            : 'bg-slate-100 border-slate-300 text-cyan-700 hover:bg-slate-200'
                        }`}
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 6. CATALOG MANAGER */}
      {/* ===================================================================== */}
      {adminTab === 'catalog' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-heading font-bold text-base">Service Catalog Manager ({services.length} Services)</h3>
            <button
              type="button"
              onClick={() => {
                setEditingServiceId(null);
                setSvcName('');
                setSvcCategory('M R S Services');
                setSvcRateUSD('$25');
                setSvcRateBDT('2,500 ৳');
                setSvcFixedPriceUSD('25');
                setSvcTurnaround('24–48 hours');
                setSvcShortDesc('');
                setShowServiceForm((v) => !v);
              }}
              className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 self-start sm:self-auto"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>{showServiceForm && !editingServiceId ? 'Close Form' : 'Add New Service'}</span>
            </button>
          </div>

          {showServiceForm && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!svcName.trim()) return;
                const numericPrice = Number(svcFixedPriceUSD) || 25;
                if (editingServiceId) {
                  const target = services.find((s) => s.id === editingServiceId);
                  if (target) {
                    await updateService({
                      ...target,
                      name: svcName.trim(),
                      category: svcCategory,
                      rateUSD: svcRateUSD.trim() || target.rateUSD,
                      rateBDT: svcRateBDT.trim() || target.rateBDT,
                      fixedPriceUSD: numericPrice,
                      typicalTurnaround: svcTurnaround.trim() || target.typicalTurnaround,
                      shortDescription: svcShortDesc.trim() || target.shortDescription,
                    });
                  }
                } else {
                  const slugBase = svcName
                    .toLowerCase()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/(^-|-$)/g, '');
                  const newId = `custom-${slugBase || Date.now().toString(36)}`;
                  const newService: ServiceItem = {
                    id: newId,
                    serviceId: `S-CUS-${Math.floor(100 + Math.random() * 900)}`,
                    slug: newId,
                    shortCode: newId.slice(0, 6).toUpperCase(),
                    category: svcCategory,
                    name: svcName.trim(),
                    shortDescription: svcShortDesc.trim() || 'Custom digital engineering service package.',
                    inclusions: ['Direct Owner Execution', 'QA Verified Delivery', 'Portal Tracking'],
                    typicalTurnaround: svcTurnaround.trim() || '24–48 hours',
                    priceType: 'fixed',
                    fixedPriceUSD: numericPrice,
                    rateUSD: svcRateUSD.trim() || `$${numericPrice}`,
                    rateBDT: svcRateBDT.trim() || `${Math.round(numericPrice * (settings.exchangeRate || 100)).toLocaleString()} ৳`,
                    currency: 'USD',
                    active: true,
                    sortOrder: services.length + 1,
                    icon: 'sparkles',
                    paymentTimingNewClient: 'mode_b',
                    paymentTimingTrustedClient: 'mode_a',
                    depositPercent: 50,
                    lockableDeliverables: true,
                    viewCount: 0,
                    orderCount: 0,
                  };
                  await addService(newService);
                }
                setShowServiceForm(false);
                setEditingServiceId(null);
              }}
              className={`p-4 rounded-2xl border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs ${
                isDark ? 'bg-[#111B2E] border-cyan-500/30' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div>
                <label className="block text-slate-500 mb-1">Service Name *</label>
                <input
                  type="text"
                  required
                  value={svcName}
                  onChange={(e) => setSvcName(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 border ${isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Category</label>
                <select
                  value={svcCategory}
                  onChange={(e) => setSvcCategory(e.target.value as ServiceItem['category'])}
                  className={`w-full rounded-xl px-3 py-2 border ${isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                >
                  <option value="M R S Services">M R S Services</option>
                  <option value="Gravatar Services">Gravatar Services</option>
                  <option value="M R S IPTV">M R S IPTV</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Base Price (USD numeric)</label>
                <input
                  type="number"
                  value={svcFixedPriceUSD}
                  onChange={(e) => setSvcFixedPriceUSD(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 border font-mono ${isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Display Rate USD</label>
                <input
                  type="text"
                  value={svcRateUSD}
                  onChange={(e) => setSvcRateUSD(e.target.value)}
                  placeholder="$25 or $12/hr"
                  className={`w-full rounded-xl px-3 py-2 border font-mono ${isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Display Rate BDT</label>
                <input
                  type="text"
                  value={svcRateBDT}
                  onChange={(e) => setSvcRateBDT(e.target.value)}
                  placeholder="2,500 ৳"
                  className={`w-full rounded-xl px-3 py-2 border font-mono ${isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                />
              </div>
              <div>
                <label className="block text-slate-500 mb-1">Typical Turnaround</label>
                <input
                  type="text"
                  value={svcTurnaround}
                  onChange={(e) => setSvcTurnaround(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 border ${isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-slate-500 mb-1">Short Description</label>
                <input
                  type="text"
                  value={svcShortDesc}
                  onChange={(e) => setSvcShortDesc(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 border ${isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowServiceForm(false);
                    setEditingServiceId(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg border ${isDark ? 'border-slate-700 text-slate-300' : 'border-slate-300 text-slate-700'}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                >
                  {editingServiceId ? 'Save Changes on Server' : 'Publish to Catalog'}
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {services.map((svc) => (
              <div
                key={svc.id}
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                  isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{svc.name}</span>
                    <span className="font-mono text-[10px] text-cyan-500">({svc.category})</span>
                  </div>
                  <div className="font-mono text-emerald-500 mt-0.5">{svc.rateUSD} / {svc.rateBDT}</div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingServiceId(svc.id);
                      setSvcName(svc.name);
                      setSvcCategory(svc.category);
                      setSvcRateUSD(svc.rateUSD);
                      setSvcRateBDT(svc.rateBDT);
                      setSvcFixedPriceUSD(String(svc.fixedPriceUSD ?? svc.minPriceUSD ?? 25));
                      setSvcTurnaround(svc.typicalTurnaround);
                      setSvcShortDesc(svc.shortDescription);
                      setShowServiceForm(true);
                    }}
                    className={`px-2.5 py-1 rounded border text-[11px] font-semibold flex items-center gap-1 ${
                      isDark
                        ? 'bg-slate-800 border-slate-700 text-cyan-300 hover:bg-slate-700'
                        : 'bg-slate-100 border-slate-300 text-cyan-700 hover:bg-slate-200'
                    }`}
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => hideService(svc.id)}
                    className={`px-3 py-1 rounded text-[11px] font-bold ${
                      svc.active
                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                    }`}
                  >
                    {svc.active ? 'Active' : 'Hidden'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* SHARE KIT & SERVICE DIRECT LINKS */}
      {/* ===================================================================== */}
      {adminTab === 'sharekit' && <ShareKitTab />}

      {/* ===================================================================== */}
      {/* 6B. MESSAGES INBOX */}
      {/* ===================================================================== */}
      {adminTab === 'messages' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className={`rounded-2xl border p-4 space-y-3 ${isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200 shadow-sm'}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-cyan-500" />
                <span>Client Threads ({allClients.length})</span>
              </h3>
            </div>
            <div className="space-y-1.5 max-h-[420px] overflow-y-auto custom-scrollbar">
              {allClients.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">No registered client profiles yet.</p>
              ) : (
                allClients.map((c) => {
                  const count = allMessages.filter((m) => m.clientId === c.clientId).length;
                  const active = selectedClientForMsg === c.clientId;
                  return (
                    <button
                      key={c.clientId}
                      type="button"
                      onClick={() => setSelectedClientForMsg(c.clientId)}
                      className={`w-full text-left p-2.5 rounded-xl border text-xs transition-colors ${
                        active
                          ? 'bg-cyan-500/15 border-cyan-500/50'
                          : isDark
                          ? 'bg-[#16233B]/60 border-[#22314D] hover:border-slate-600'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`font-bold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{c.name}</span>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-500">{count}</span>
                      </div>
                      <div className="font-mono text-[10px] text-slate-500 mt-0.5">{c.clientId} · {c.email}</div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className={`lg:col-span-2 rounded-2xl border flex flex-col min-h-[380px] max-h-[560px] ${
            isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className={`p-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
              isDark ? 'border-[#22314D]' : 'border-slate-200'
            }`}>
              <div>
                <div className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {allClients.find((c) => c.clientId === selectedClientForMsg)?.name || 'Select a Client'}
                </div>
                <div className="font-mono text-[10px] text-slate-500">{selectedClientForMsg || 'No Client Selected'}</div>
              </div>
              {selectedClientForMsg && (
                <select
                  value={selectedOrderForMsg}
                  onChange={(e) => setSelectedOrderForMsg(e.target.value)}
                  className={`rounded-lg px-2.5 py-1.5 border font-mono text-[11px] ${
                    isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  {allOrders.filter((o) => o.clientId === selectedClientForMsg).length === 0 ? (
                    <option value="">No order thread available</option>
                  ) : (
                    allOrders
                      .filter((o) => o.clientId === selectedClientForMsg)
                      .map((o) => (
                        <option key={o.orderId} value={o.orderId}>
                          {o.orderId} — {o.serviceName}
                        </option>
                      ))
                  )}
                </select>
              )}
            </div>

            <div className="flex-1 p-4 space-y-2.5 overflow-y-auto custom-scrollbar text-xs">
              {allMessages
                .filter((m) => m.clientId === selectedClientForMsg && (!selectedOrderForMsg || !m.orderId || m.orderId === selectedOrderForMsg))
                .map((m) => (
                  <div
                    key={m.id}
                    className={`p-3 rounded-xl max-w-[85%] ${
                      m.isInternalNote
                        ? isDark
                          ? 'ml-auto bg-amber-500/10 border border-amber-500/30 text-amber-200'
                          : 'ml-auto bg-amber-50 border border-amber-300 text-amber-900'
                        : m.sender === 'admin'
                        ? isDark
                          ? 'ml-auto bg-cyan-500/15 border border-cyan-500/30 text-slate-100'
                          : 'ml-auto bg-cyan-50 border border-cyan-200 text-slate-900'
                        : isDark
                        ? 'bg-[#16233B] border border-[#22314D] text-slate-200'
                        : 'bg-slate-100 border border-slate-200 text-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-slate-500 mb-1">
                      <span>{m.senderName}{m.isInternalNote ? ' · Internal Note' : ''}</span>
                      <span>{new Date(m.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  </div>
                ))}
              {allMessages.filter((m) => m.clientId === selectedClientForMsg).length === 0 && (
                <p className="text-center text-slate-500 py-10">No messages recorded for this client thread yet.</p>
              )}
            </div>

            <form
              onSubmit={handleSendAdminReply}
              className={`p-3 border-t space-y-2 text-xs ${isDark ? 'border-[#22314D]' : 'border-slate-200'}`}
            >
              <label className="inline-flex items-center gap-2 text-[11px] text-slate-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isInternalNoteMsg}
                  onChange={(e) => setIsInternalNoteMsg(e.target.checked)}
                />
                <span>Save as internal owner-only note (hidden from client portal)</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write reply to client..."
                  className={`flex-1 rounded-xl px-3 py-2 border ${
                    isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center gap-1.5 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 6C. SUPPORT TICKETS CONSOLE */}
      {/* ===================================================================== */}
      {adminTab === 'tickets' && (
        <div className="space-y-4">
          <h3 className="font-heading font-bold text-base flex items-center gap-2">
            <Wrench className="w-4 h-4 text-cyan-500" />
            <span>Support Tickets Queue ({supportTickets.length})</span>
          </h3>

          <div className={`rounded-2xl border overflow-x-auto ${isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200'}`}>
            <table className="w-full text-xs text-left">
              <thead className={`border-b font-mono ${isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
                <tr>
                  <th className="p-3.5">Ticket ID</th>
                  <th className="p-3.5">Device / Category</th>
                  <th className="p-3.5">Description</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Created</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800/40' : 'divide-slate-100'}`}>
                {supportTickets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500">
                      No open or historical support tickets reported yet.
                    </td>
                  </tr>
                ) : (
                  supportTickets.map((t) => (
                    <tr key={t.id} className={isDark ? 'hover:bg-slate-900/30' : 'hover:bg-slate-50'}>
                      <td className="p-3.5 font-mono font-bold text-cyan-500 whitespace-nowrap">{t.id}</td>
                      <td className="p-3.5">
                        <div className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t.device || 'General'}</div>
                        <div className="text-[10px] text-slate-500">{t.issueType}</div>
                      </td>
                      <td className={`p-3.5 max-w-md break-words ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{t.description}</td>
                      <td className="p-3.5">
                        <select
                          value={t.status}
                          onChange={(e) => updateTicketStatus(t.id, e.target.value as any)}
                          className={`rounded-lg px-2.5 py-1 border font-bold text-[11px] ${
                            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-100 border-slate-300 text-slate-900'
                          }`}
                        >
                          <option value="open">open</option>
                          <option value="investigating">investigating</option>
                          <option value="resolved">resolved</option>
                        </select>
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(t.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 6D. EXPENSES LEDGER */}
      {/* ===================================================================== */}
      {adminTab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="font-heading font-bold text-base flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-500" />
              <span>Operational Expenses Ledger</span>
            </h3>
            <div className="font-mono text-xs px-3 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 font-bold self-start sm:self-auto">
              Total Logged: ${expenses.reduce((s, e) => s + Number(e.amountUSD || 0), 0).toFixed(2)} USD
            </div>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!expTitle.trim() || !expAmountUSD) return;
              await addExpense(expTitle.trim(), expCategory, Number(expAmountUSD), expDate, expNotes.trim() || undefined);
              setExpTitle('');
              setExpAmountUSD('');
              setExpNotes('');
            }}
            className={`p-4 rounded-2xl border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs ${
              isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <input
              type="text"
              required
              value={expTitle}
              onChange={(e) => setExpTitle(e.target.value)}
              placeholder="Expense Title *"
              className={`rounded-xl px-3 py-2 border ${isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
            />
            <select
              value={expCategory}
              onChange={(e) => setExpCategory(e.target.value as any)}
              className={`rounded-xl px-3 py-2 border ${isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
            >
              <option value="tools">tools</option>
              <option value="hosting">hosting</option>
              <option value="fees">fees</option>
              <option value="other">other</option>
            </select>
            <input
              type="number"
              step="0.01"
              required
              value={expAmountUSD}
              onChange={(e) => setExpAmountUSD(e.target.value)}
              placeholder="Amount USD *"
              className={`rounded-xl px-3 py-2 border font-mono ${isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
            />
            <input
              type="date"
              value={expDate}
              onChange={(e) => setExpDate(e.target.value)}
              className={`rounded-xl px-3 py-2 border font-mono ${isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'}`}
            />
            <button
              type="submit"
              className="py-2 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
            >
              Log Expense on Server
            </button>
          </form>

          <div className={`rounded-2xl border overflow-x-auto ${isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200'}`}>
            <table className="w-full text-xs text-left">
              <thead className={`border-b font-mono ${isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
                <tr>
                  <th className="p-3.5">ID</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Title</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5 text-right">Amount (USD)</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800/40' : 'divide-slate-100'}`}>
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-slate-500">
                      No operational expenses recorded yet.
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp) => (
                    <tr key={exp.id} className={isDark ? 'hover:bg-slate-900/30' : 'hover:bg-slate-50'}>
                      <td className="p-3.5 font-mono text-cyan-500">{exp.id}</td>
                      <td className="p-3.5 font-mono text-slate-500">{exp.date}</td>
                      <td className={`p-3.5 font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{exp.title}</td>
                      <td className="p-3.5 font-mono uppercase text-slate-500">{exp.category}</td>
                      <td className="p-3.5 font-mono font-bold text-rose-500 text-right">${Number(exp.amountUSD).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 7. SETTINGS */}
      {/* ===================================================================== */}
      {adminTab === 'settings' && (
        <div
          className={`p-6 rounded-2xl border max-w-xl mx-auto space-y-4 text-xs ${
            isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <h3 className="font-heading font-bold text-base">Platform Operational Parameters</h3>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                Exchange Rate: 1 USD = X BDT (Default: 100)
              </label>
              <input
                type="number"
                value={exchangeRateInput}
                onChange={(e) => setExchangeRateInput(Number(e.target.value))}
                className={`w-full rounded-xl px-3 py-2 font-mono text-sm border ${
                  isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300'
                }`}
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Owner Email</label>
              <input
                type="email"
                value={ownerEmailInput}
                onChange={(e) => setOwnerEmailInput(e.target.value)}
                className={`w-full rounded-xl px-3 py-2 text-sm border ${
                  isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300'
                }`}
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">WhatsApp Hotline</label>
              <input
                type="text"
                value={whatsappInput}
                onChange={(e) => setWhatsappInput(e.target.value)}
                className={`w-full rounded-xl px-3 py-2 text-sm border ${
                  isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300'
                }`}
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Calendly Booking Link</label>
              <input
                type="text"
                value={calendlyInput}
                onChange={(e) => setCalendlyInput(e.target.value)}
                className={`w-full rounded-xl px-3 py-2 text-sm border ${
                  isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300'
                }`}
              />
            </div>

            {/* Crypto Payments Toggle (Section 6) */}
            <div className={`pt-3 border-t space-y-2 ${isDark ? 'border-slate-700/60' : 'border-slate-200'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className={`font-bold flex flex-wrap items-center gap-1.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                    <span>Cryptocurrency Payments Gateway</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                      isDark ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}>
                      Default: OFF
                    </span>
                  </div>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Controls whether Binance Pay and crypto wallet options appear across the store and Camellia prompts.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextVal = !settings.cryptoEnabled;
                    updateSettings({ ...settings, cryptoEnabled: nextVal });
                    showToast('Settings Updated', `Crypto payments are now ${nextVal ? 'ENABLED' : 'DISABLED'}`, nextVal ? 'warning' : 'info');
                  }}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-colors shrink-0 self-start sm:self-auto ${
                    settings.cryptoEnabled
                      ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                      : isDark
                      ? 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                      : 'bg-slate-100 text-slate-700 hover:text-slate-950 border border-slate-300'
                  }`}
                >
                  {settings.cryptoEnabled ? 'ENABLED' : 'DISABLED (OFF)'}
                </button>
              </div>

              {/* Mandatory Legal Warning (Section 6) */}
              <div className={`p-3 rounded-xl border text-[11px] leading-relaxed flex items-start gap-2 ${
                isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-800'
              }`}>
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                <span>
                  <strong>Legal Notice:</strong> Cryptocurrency payments may be restricted or unlawful where the business operates. Get local legal advice before enabling.
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
            >
              Save Parameters
            </button>
          </form>

          {/* Foreign Income Records (Accountant Pack) Panel */}
          <div className={`pt-4 border-t space-y-3 ${isDark ? 'border-slate-700/60' : 'border-slate-200'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>Foreign Income Certification ("Accountant Pack")</h4>
                <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Export verified ledger CSV, applied FX rate snapshots, invoices, and bank statements for tax filing.
                </p>
              </div>
              <button
                type="button"
                onClick={downloadAccountantPack}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shrink-0 self-start sm:self-auto ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-amber-500/30'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                }`}
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Pack (CSV)</span>
              </button>
            </div>
          </div>

          {/* Section 11: Brand Kit & Identity Assets (Single Source of Truth) */}
          <div className={`pt-4 border-t space-y-4 ${isDark ? 'border-slate-700/60' : 'border-slate-200'}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className={`font-bold text-xs flex flex-wrap items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  <span>Brand Kit & Identity Library (Section 11)</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-500 border border-cyan-500/30">
                    Source of Truth
                  </span>
                </h4>
                <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Official name, tagline, logo variants, and colors. Client deliverables strictly exclude M R S branding per Section 11.3.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDesignAuditOpen(true)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 self-start sm:self-auto ${
                  isDark
                    ? 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                    : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border-cyan-300'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Design System Audit (Section 13.10)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className={`p-3 rounded-xl border space-y-2 ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-[10px] uppercase font-mono text-slate-500 font-bold">Identity Constants</span>
                <div className="space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Business Name:</span>
                    <span className={`font-bold text-right ${isDark ? 'text-white' : 'text-slate-900'}`}>{BRAND_KIT.businessName}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Short Name:</span>
                    <span className="text-cyan-500 font-bold">{BRAND_KIT.shortName}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Tagline:</span>
                    <span className="text-emerald-500 font-bold">{BRAND_KIT.tagline}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Official Site:</span>
                    <span className={`break-all text-right ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{BRAND_KIT.website}</span>
                  </div>
                </div>
              </div>

              <div className={`p-3 rounded-xl border space-y-2 ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                <span className="text-[10px] uppercase font-mono text-slate-500 font-bold">Theme Colors & Fonts</span>
                <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-mono">
                  <div className="p-1.5 rounded-lg border border-slate-700 bg-[#0B1220]">
                    <div className="text-[9px] text-slate-400">Primary</div>
                    <div className="text-cyan-400 font-bold">#0B1220</div>
                  </div>
                  <div className="p-1.5 rounded-lg border border-slate-700 bg-cyan-500 text-slate-950 font-bold">
                    <div className="text-[9px] text-slate-900">Accent</div>
                    <div>#06B6D4</div>
                  </div>
                  <div className="p-1.5 rounded-lg border border-slate-700 bg-pink-500 text-slate-950 font-bold">
                    <div className="text-[9px] text-slate-900">Camellia</div>
                    <div>#F472B6</div>
                  </div>
                  <div className="p-1.5 rounded-lg border border-slate-700 bg-emerald-500 text-slate-950 font-bold">
                    <div className="text-[9px] text-slate-900">Success</div>
                    <div>#10B981</div>
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 pt-1">
                  Headings: <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{BRAND_KIT.typography.headings}</span> • Body: <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{BRAND_KIT.typography.body}</span>
                </div>
              </div>
            </div>

            {/* Logo Variants Preview */}
            <div className={`p-3 rounded-xl border space-y-2 ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-[10px] uppercase font-mono text-slate-500 font-bold">
                Official Logo Variants (Minimum size 120px with letter-height clear space)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-[#0B1220] border border-slate-800 flex flex-col items-center justify-center gap-2">
                  <span className="text-[10px] text-slate-400 font-mono">Full / Dark Theme</span>
                  <BrandLogo variant="full" size="md" />
                </div>
                <div className="p-3 rounded-xl bg-white border border-slate-200 flex flex-col items-center justify-center gap-2">
                  <span className="text-[10px] text-slate-500 font-mono">Light Theme</span>
                  <BrandLogo variant="light" size="md" />
                </div>
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center gap-2">
                  <span className="text-[10px] text-slate-400 font-mono">Icon / Favicon</span>
                  <BrandLogo variant="icon" size="md" />
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center gap-2">
                  <span className="text-[10px] text-slate-400 font-mono">Monochrome Print</span>
                  <div className="text-white">
                    <BrandLogo variant="mono" size="md" />
                  </div>
                </div>
              </div>
            </div>

            <div className={`p-3 rounded-xl border text-[11px] leading-relaxed ${
              isDark ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-300' : 'bg-cyan-50 border-cyan-200 text-cyan-900'
            }`}>
              <strong>Section 11.3 Deliverable Ownership Rule:</strong> Client deliverables belong to the client. Do NOT put the M R S logo, colors, or tagline inside a client's CV/resume, website, app, listing, logo design, or written document.
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 8. AUDIT LOG */}
      {/* ===================================================================== */}
      {adminTab === 'audit' && (
        <div className="space-y-4">
          <h3 className="font-heading font-bold text-base">Immutable Audit Ledger</h3>

          <div className={`rounded-2xl border overflow-x-auto ${isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200'}`}>
            <table className="w-full text-xs text-left">
              <thead className={`border-b font-mono ${isDark ? 'border-slate-800/80 text-slate-400' : 'border-slate-200 text-slate-600'}`}>
                <tr>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Action</th>
                  <th className="p-3.5">Operator</th>
                  <th className="p-3.5">Target</th>
                  <th className="p-3.5">Details</th>
                </tr>
              </thead>
              <tbody className={`divide-y font-mono text-[11px] ${isDark ? 'divide-slate-800/40' : 'divide-slate-100'}`}>
                {allAuditLogs.map((log) => (
                  <tr key={log.id} className={isDark ? 'hover:bg-slate-900/30' : 'hover:bg-slate-50'}>
                    <td className="p-3.5 text-slate-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="p-3.5 font-bold text-cyan-500">{log.action}</td>
                    <td className={`p-3.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{log.performedBy}</td>
                    <td className="p-3.5 text-amber-500">{log.targetId}</td>
                    <td className={`p-3.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Proof Viewer Modal */}
      {proofModalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="max-w-xl w-full bg-slate-900 p-4 rounded-2xl border border-slate-700 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs text-white">Receipt Screenshot Proof</span>
              <button onClick={() => setProofModalUrl(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <img src={proofModalUrl} alt="Receipt Proof" className="max-h-[70vh] w-full object-contain rounded-xl" />
          </div>
        </div>
      )}

      {/* Reject Payment Reason Modal */}
      {rejectModalPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="max-w-md w-full bg-slate-900 p-5 rounded-2xl border border-slate-700 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-white">Reject Payment {rejectModalPayment.trxId}</h3>
            <div>
              <label className="block text-slate-400 mb-1">Reason for Rejection *</label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectModalPayment(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deliver Work Modal */}
      {deliverModalOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="max-w-lg w-full bg-slate-900 p-6 rounded-2xl border border-slate-700 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-white">Publish Deliverable for {deliverModalOrderId}</h3>
            <div>
              <label className="block text-slate-400 mb-1">Deliverable Title *</label>
              <input
                type="text"
                value={deliverTitle}
                onChange={(e) => setDeliverTitle(e.target.value)}
                placeholder="e.g. ATS Resume Final Bundle or App Publishing Checklist"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">Summary Note</label>
              <input
                type="text"
                value={deliverSummary}
                onChange={(e) => setDeliverSummary(e.target.value)}
                placeholder="Short summary for the client..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1">File / Deliverable Content *</label>
              <textarea
                rows={6}
                value={deliverContent}
                onChange={(e) => setDeliverContent(e.target.value)}
                placeholder="Paste code, markdown summary, resume copy, or credentials..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 font-mono text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeliverModalOrderId(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeliver}
                className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
              >
                Publish Deliverable
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Draft Studio Modal */}
      {draftStudioOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="max-w-5xl w-full max-h-[92vh] overflow-y-auto rounded-2xl bg-[#0B1220] border border-cyan-500/40 p-4 sm:p-6 shadow-2xl relative">
            <button
              onClick={() => setDraftStudioOrder(null)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white"
            >
              ✕
            </button>
            <OrderAiDraftStudio
              order={draftStudioOrder}
              service={
                services.find((s) => s.id === draftStudioOrder.serviceId) ||
                services[0]
              }
              onDeliverCompleted={() => setDraftStudioOrder(null)}
            />
          </div>
        </div>
      )}

      {/* Section 7 Universal Work Engine Modal (8 Stages) */}
      {workEngineOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="max-w-5xl w-full max-h-[94vh] overflow-y-auto rounded-2xl bg-[#0B1220] border border-pink-500/40 p-4 sm:p-6 shadow-2xl relative">
            <button
              onClick={() => setWorkEngineOrder(null)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-white z-10"
            >
              ✕
            </button>
            <WorkCompletionModal
              order={workEngineOrder}
              service={
                services.find((s) => s.id === workEngineOrder.serviceId) ||
                services[0]
              }
              onClose={() => setWorkEngineOrder(null)}
              onDelivered={() => setWorkEngineOrder(null)}
            />
          </div>
        </div>
      )}

      {/* Section 13.10 Design System Quality Audit Modal */}
      <DesignSystemAuditModal
        isOpen={isDesignAuditOpen}
        onClose={() => setIsDesignAuditOpen(false)}
      />

    </div>
  );
};
