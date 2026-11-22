import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ServiceItem, OrderRecord, OrderStatus, Currency } from '../types';
import { detectUserRegion, UserRegionInfo } from '../utils/geolocation';
import {
  generateServiceDeliverableFiles,
  triggerDownload,
  MultiTypeFileSpec,
} from '../utils/fileGenerators';
import {
  Sparkles,
  Cpu,
  Tv,
  CheckCircle2,
  Clock,
  Send,
  Download,
  Copy,
  Check,
  CreditCard,
  FileText,
  FileCode,
  Code,
  Archive,
  Printer,
  ChevronRight,
  ShieldCheck,
  Search,
  AlertTriangle,
  UploadCloud,
  Layers,
  ArrowRight,
  MessageSquare,
  MapPin,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { InvoicePrintModal } from './InvoicePrintModal';

interface ServiceWorkspaceProps {
  onOpenNewOrder?: () => void;
}

export const ServiceWorkspace: React.FC<ServiceWorkspaceProps> = () => {
  const {
    services,
    currentClient,
    clientOrders,
    clientPayments,
    clientDeliverables,
    clientInvoices,
    clientMessages,
    sendMessage,
    submitPaymentProof,
    theme,
    currency,
    formatPrice,
    convertPrice,
    settings,
    showToast,
    createOrder,
    deliverOrder,
    updateOrderStatus,
  } = useApp();

  const isDark = theme === 'dark';

  // Geolocation detection
  const [regionInfo, setRegionInfo] = useState<UserRegionInfo>(() =>
    detectUserRegion(settings.exchangeRate || 100)
  );

  useEffect(() => {
    setRegionInfo(detectUserRegion(settings.exchangeRate || 100));
  }, [settings.exchangeRate]);

  // Selected Service (default to AI & Digital Productivity or the first service)
  const [selectedServiceId, setSelectedServiceId] = useState<string>(() => {
    if (clientOrders.length > 0) {
      return clientOrders[0].serviceId;
    }
    return services[0]?.id || 'ai-productivity';
  });

  // Search in left sidebar
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'All' | 'M R S Services' | 'Gravatar Services' | 'M R S IPTV'>('All');

  // Mobile/Tablet view mode: 'services' | 'chat' | 'payment'
  const [activeMobileView, setActiveMobileView] = useState<'services' | 'chat' | 'payment'>('chat');

  // Chat input
  const [chatInput, setChatInput] = useState('');
  const [isConsultantTyping, setIsConsultantTyping] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Payment form state in right sidebar
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [trxIdInput, setTrxIdInput] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>(settings.paymentMethods[0]?.id || 'bkash');
  const [proofFileName, setProofFileName] = useState<string | null>(null);
  const [proofFileUrl, setProofFileUrl] = useState<string | null>(null);
  const [senderIdentifier, setSenderIdentifier] = useState('');
  const [isSubmittingProof, setIsSubmittingProof] = useState(false);

  // Invoice modal
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  // Active service object
  const activeService = services.find((s) => s.id === selectedServiceId) || services[0];

  // Find if client has an existing order for this service, or pick the active order
  const activeOrder = clientOrders.find((o) => o.serviceId === selectedServiceId) || clientOrders[0];

  // Price calculations
  const basePriceUsd = activeOrder?.quoteAmount || activeService?.fixedPriceUSD || activeService?.minPriceUSD || 0;
  const dualPrice = convertPrice(basePriceUsd);

  // Copy helper
  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast('Copied to Clipboard', text, 'info');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Scroll to bottom of chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [clientMessages, isConsultantTyping, selectedServiceId]);

  // Handle service selection
  const handleSelectService = (service: ServiceItem) => {
    setSelectedServiceId(service.id);
    setActiveMobileView('chat');
    showToast('Service Process Started', `Engaging console for ${service.name}`, 'info');
  };

  // Send real message in order thread (server persists & Camellia auto-triages if enabled)
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;
    if (!activeOrder?.orderId) {
      showToast('Active Order Required', 'Place or unlock an order first to message the workspace thread.', 'warning');
      return;
    }

    const userText = chatInput.trim();
    setChatInput('');
    setIsConsultantTyping(true);
    try {
      await sendMessage(userText, activeOrder.orderId, false);
    } finally {
      setIsConsultantTyping(false);
    }
  };

  // Quick suggestion prompts
  const handleQuickPrompt = (prompt: string) => {
    setChatInput(prompt);
  };

  // Request status update / packaging note via real order message
  const handleCompleteWorkTrigger = async () => {
    if (!activeOrder) {
      showToast('Active Order Required', 'Please submit an order first to track deliverables.', 'warning');
      return;
    }
    await sendMessage(
      `Client requested completion check & multi-format deliverables verification for "${activeService.name}".`,
      activeOrder.orderId,
      false
    );
    showToast('Completion Check Sent', 'Your deliverable verification request was sent to the owner desk.', 'success');
  };

  // Read real file as base64 DataURL for server upload (/api/payments/:id/evidence)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      showToast('File Too Large', 'Receipt image/PDF must be under 4 MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProofFileName(file.name);
        setProofFileUrl(reader.result);
        showToast('Receipt Attached', `${file.name} ready for upload on submission.`, 'info');
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle payment proof submission
  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trxIdInput.trim()) {
      showToast('Transaction ID Required', 'Please provide TxID or TxHash.', 'error');
      return;
    }
    if (!activeOrder?.orderId) {
      showToast('Order Required', 'Select or create an order before submitting payment proof.', 'error');
      return;
    }

    const orderId = activeOrder.orderId;
    const amt = parseFloat(amountInput) || basePriceUsd;

    setIsSubmittingProof(true);
    try {
      await submitPaymentProof({
        orderId,
        method: settings.paymentMethods.find((m) => m.id === selectedMethod)?.id || selectedMethod,
        amount: amt,
        currency,
        reference: `PAY-${orderId}`,
        trxId: trxIdInput.trim(),
        proofFileName: proofFileName || undefined,
        proofUrl: proofFileUrl || undefined,
        senderIdentifier: senderIdentifier.trim() || undefined,
        note: `Submitted via Service Workspace for ${activeService.name}`,
      });

      setTrxIdInput('');
      setAmountInput('');
      setProofFileName(null);
      setProofFileUrl(null);
      setSenderIdentifier('');
    } catch (err: any) {
      showToast('Error', err.message || 'Failed to submit proof', 'error');
    } finally {
      setIsSubmittingProof(false);
    }
  };

  // Generate reference briefs for the active order
  const multiTypeFiles: MultiTypeFileSpec[] = generateServiceDeliverableFiles(
    activeService.name,
    activeService.id,
    activeOrder?.orderId || 'NO-ACTIVE-ORDER',
    currentClient?.clientId || 'GUEST',
    currentClient?.name || 'Authorized Client'
  );

  // Filtered services in left sidebar
  const filteredServices = services.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.shortDescription.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || s.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Messages for this active order or client
  const relevantMessages = clientMessages.filter(
    (m) => !m.orderId || !activeOrder || m.orderId === activeOrder.orderId
  );

  // Status helper
  const getStatusBadge = (status: OrderStatus = 'In progress') => {
    switch (status) {
      case 'Pending':
        return <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">Pending</span>;
      case 'Awaiting payment':
        return <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">Awaiting Payment</span>;
      case 'Payment submitted':
        return <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-violet-500/10 text-violet-400 border border-violet-500/30">Payment Submitted</span>;
      case 'Verified':
        return <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Verified</span>;
      case 'In progress':
        return <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/30">In Progress</span>;
      case 'Delivered':
        return <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">Delivered</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300">Active</span>;
    }
  };

  return (
    <div className={`w-full rounded-2xl border transition-colors ${isDark ? 'bg-[#0B1220] border-[#22314D] text-[#E6EDF7]' : 'bg-white border-slate-200 text-[#0B1220] shadow-sm'}`}>
      
      {/* Top Banner: Regional Geolocation & Live Status */}
      <div className={`px-4 py-3 border-b flex flex-wrap items-center justify-between gap-3 text-xs ${isDark ? 'bg-[#111B2E]/90 border-[#22314D]' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-heading font-semibold text-xs text-inherit">
            M R S Systematic Automation Console
          </span>
          <span className="hidden sm:inline-block text-slate-500">|</span>
          <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-[11px]">
            <MapPin className="w-3.5 h-3.5" />
            <span>Region: {regionInfo.countryName} ({regionInfo.currency})</span>
            <span className="text-slate-400 text-[10px]">({currency === 'BDT' ? `1 USD = ${settings.exchangeRate} ৳` : 'Global USD'})</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-[11px] font-mono flex items-center gap-1.5 text-slate-400">
            <span>Client ID:</span>
            <span className="text-cyan-400 font-bold">{currentClient?.clientId || 'Not signed in'}</span>
          </div>
          <div className="hidden md:flex items-center gap-1 text-[11px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Isolated Workspace</span>
          </div>
        </div>
      </div>

      {/* Mobile / Tablet Segmented Controller (< 1024px) */}
      <div className={`lg:hidden border-b p-2 flex flex-wrap items-center gap-1.5 text-xs ${
        isDark ? 'bg-[#111B2E]/60 border-[#22314D]' : 'bg-slate-50 border-slate-200'
      }`}>
        <button
          onClick={() => setActiveMobileView('services')}
          className={`flex-1 min-w-[96px] py-2 px-2.5 rounded-xl border flex items-center justify-center gap-1.5 font-medium transition-all min-h-[44px] ${
            activeMobileView === 'services'
              ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-sm'
              : isDark
              ? 'border-transparent text-slate-400 hover:text-white'
              : 'border-transparent text-slate-600 hover:text-slate-950'
          }`}
        >
          <Layers className="w-3.5 h-3.5 shrink-0" />
          <span>Services ({services.length})</span>
        </button>

        <button
          onClick={() => setActiveMobileView('chat')}
          className={`flex-1 min-w-[96px] py-2 px-2.5 rounded-xl border flex items-center justify-center gap-1.5 font-medium transition-all min-h-[44px] ${
            activeMobileView === 'chat'
              ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-sm'
              : isDark
              ? 'border-transparent text-slate-400 hover:text-white'
              : 'border-transparent text-slate-600 hover:text-slate-950'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 shrink-0" />
          <span>Process Chat</span>
          <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
        </button>

        <button
          onClick={() => setActiveMobileView('payment')}
          className={`flex-1 min-w-[110px] py-2 px-2.5 rounded-xl border flex items-center justify-center gap-1.5 font-medium transition-all min-h-[44px] ${
            activeMobileView === 'payment'
              ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-sm'
              : isDark
              ? 'border-transparent text-slate-400 hover:text-white'
              : 'border-transparent text-slate-600 hover:text-slate-950'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5 shrink-0" />
          <span>Payment & Files</span>
        </button>
      </div>

      {/* Main 3-Column Grid Container */}
      <div className={`grid grid-cols-1 lg:grid-cols-12 lg:min-h-[680px] divide-y lg:divide-y-0 lg:divide-x ${
        isDark ? 'divide-slate-800' : 'divide-slate-200'
      }`}>
        
        {/* ============================================================ */}
        {/* LEFT COLUMN: Services Catalog Sidebar with Action Buttons */}
        {/* ============================================================ */}
        <aside
          className={`lg:col-span-3 flex flex-col p-4 space-y-4 ${
            activeMobileView !== 'services' ? 'hidden lg:flex' : 'flex'
          } ${isDark ? 'bg-[#0E1726]' : 'bg-slate-50/60'}`}
        >
          {/* Sidebar Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-sm tracking-tight flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-500" />
                <span>Service Catalog ({services.length})</span>
              </h3>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                isDark ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' : 'text-cyan-700 bg-cyan-50 border-cyan-300'
              }`}>
                {services.length} Available
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search services..."
                className={`w-full rounded-xl pl-8 pr-3 py-1.5 text-xs border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                  isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[10px]">
              {(['All', 'M R S Services', 'Gravatar Services', 'M R S IPTV'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2 py-1 rounded-lg border text-nowrap transition-colors ${
                    categoryFilter === cat
                      ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                      : isDark
                      ? 'bg-[#16233B] border-[#22314D] text-slate-400 hover:text-white'
                      : 'bg-white border-slate-200 text-slate-600'
                  }`}
                >
                  {cat === 'All'
                    ? `All (${services.length})`
                    : cat === 'M R S Services'
                    ? `MRS (${services.filter((s) => s.category === 'M R S Services').length})`
                    : cat === 'Gravatar Services'
                    ? `Gravatar (${services.filter((s) => s.category === 'Gravatar Services').length})`
                    : 'IPTV'}
                </button>
              ))}
            </div>
          </div>

          {/* Services List with Launch Buttons */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[60dvh] lg:max-h-[640px] custom-scrollbar">
            {filteredServices.map((srv) => {
              const isSelected = srv.id === selectedServiceId;
              const hasOrder = clientOrders.some((o) => o.serviceId === srv.id);

              return (
                <div
                  key={srv.id}
                  className={`p-3 rounded-xl border transition-all text-xs flex flex-col justify-between gap-2.5 ${
                    isSelected
                      ? 'bg-cyan-500/10 border-cyan-400/60 shadow-md ring-1 ring-cyan-500/20'
                      : isDark
                      ? 'bg-[#111B2E] border-[#22314D] hover:border-slate-700'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-heading font-bold text-inherit leading-tight">
                          {srv.name}
                        </span>
                        {hasOrder && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" title="Active Client Order" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1">
                        {srv.shortDescription}
                      </p>
                    </div>
                  </div>

                  {/* Price & Turnaround row */}
                  <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-slate-800/40">
                    <div className="text-cyan-400 font-semibold">
                      {currency === 'BDT'
                        ? `${(srv.fixedPriceUSD || srv.minPriceUSD || 25) * (settings.exchangeRate || 100)} ৳`
                        : `$${srv.fixedPriceUSD || srv.minPriceUSD || 25}`}
                      {srv.priceType === 'hourly' && <span className="text-[10px] text-slate-400 font-sans">/hr</span>}
                    </div>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{srv.typicalTurnaround}</span>
                    </span>
                  </div>

                  {/* Specific Action Button */}
                  <button
                    type="button"
                    onClick={() => handleSelectService(srv)}
                    className={`w-full py-2 px-3 rounded-lg font-heading font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 shadow-sm'
                        : isDark
                        ? 'bg-[#16233B] hover:bg-cyan-500/20 text-cyan-300 border border-[#22314D] hover:border-cyan-500/40'
                        : 'bg-slate-100 hover:bg-cyan-50 text-slate-800 border border-slate-200'
                    }`}
                  >
                    <span>{isSelected ? 'Active Process' : 'Start Process'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </aside>

        {/* ============================================================ */}
        {/* CENTER COLUMN: Interactive Service Process & Live Chat Hub  */}
        {/* ============================================================ */}
        <main
          className={`lg:col-span-5 flex flex-col justify-between ${
            activeMobileView !== 'chat' ? 'hidden lg:flex' : 'flex'
          } ${isDark ? 'bg-[#0B1220]' : 'bg-white'}`}
        >
          {/* Service Process Header & Stage Stepper */}
          <div className={`p-4 border-b space-y-3 ${isDark ? 'bg-[#111B2E]/60 border-[#22314D]' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-heading font-extrabold text-base tracking-tight text-inherit">
                    {activeService.name}
                  </h2>
                  {getStatusBadge(activeOrder?.status || 'In progress')}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span className="font-mono text-cyan-400">Order: {activeOrder?.orderId || 'None'}</span>
                  <span>·</span>
                  <span>Turnaround: {activeService.typicalTurnaround}</span>
                  <span>·</span>
                  <span className="text-emerald-400 font-mono">SLA Guaranteed</span>
                </div>
              </div>

              {/* Completion status request button */}
              <button
                type="button"
                onClick={handleCompleteWorkTrigger}
                className="py-1.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-heading font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                title="Request owner check & multi-format deliverable verification"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Request Deliverable Check</span>
              </button>
            </div>

            {/* Systematic Stage Stepper */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 text-[10px] font-mono">
              <div className={`p-2 rounded-lg border flex flex-col items-center text-center ${
                isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}>
                <span className="font-bold">1. Scope</span>
                <span className={`text-[9px] ${isDark ? 'text-emerald-400/80' : 'text-emerald-700'}`}>Completed</span>
              </div>
              <div className={`p-2 rounded-lg border flex flex-col items-center text-center ${
                isDark ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' : 'bg-cyan-50 border-cyan-200 text-cyan-800'
              }`}>
                <span className="font-bold">2. Technical</span>
                <span className={`text-[9px] ${isDark ? 'text-cyan-400/80' : 'text-cyan-700'}`}>Verified</span>
              </div>
              <div className={`p-2 rounded-lg border flex flex-col items-center text-center ${
                isDark ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}>
                <span className="font-bold">3. Execution</span>
                <span className={`text-[9px] ${isDark ? 'text-blue-400/80' : 'text-blue-700'}`}>Active</span>
              </div>
              <div className={`p-2 rounded-lg border flex flex-col items-center text-center ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
              }`}>
                <span className="font-bold">4. Package</span>
                <span className="text-[9px] text-slate-500">Multi-Type</span>
              </div>
            </div>
          </div>

          {/* Interactive Chat Stream */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 max-h-[50dvh] lg:max-h-[460px] custom-scrollbar text-xs">
            {/* System Info Notice */}
            <div className={`p-3 rounded-xl border flex items-start gap-2.5 ${
              isDark ? 'bg-cyan-500/5 border-cyan-500/20 text-cyan-300' : 'bg-cyan-50 border-cyan-200 text-cyan-900'
            }`}>
              <Sparkles className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-inherit">
                  Automated Engineering Console Active
                </p>
                <p className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Your requests for <strong>{activeService.name}</strong> are processed directly by our ops team. Attach technical briefs, review live drafts, or trigger full multi-format file generation anytime.
                </p>
              </div>
            </div>

            {/* Chat Messages */}
            {relevantMessages.map((msg) => {
              const isClient = msg.sender === 'client';
              const isSystem = msg.sender === 'system';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isClient ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-1 px-1">
                    <span className="font-medium">{msg.senderName}</span>
                    <span>·</span>
                    <span className="font-mono">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl max-w-[88%] text-xs leading-relaxed ${
                      isClient
                        ? 'bg-cyan-500 text-slate-950 font-medium rounded-tr-none shadow-sm'
                        : isSystem
                        ? isDark
                          ? 'bg-slate-800 text-slate-200 border border-slate-700 font-mono text-[11px]'
                          : 'bg-slate-200 text-slate-900 border border-slate-300 font-mono text-[11px]'
                        : isDark
                        ? 'bg-[#16233B] text-slate-200 border border-[#22314D] rounded-tl-none'
                        : 'bg-slate-100 text-slate-900 border border-slate-200 rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}

            {/* Typing Indicator */}
            {isConsultantTyping && (
              <div className="flex items-center gap-2 text-cyan-500 text-xs py-1">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span className="font-mono text-[11px]">Camellia (Engineering) is preparing specifications...</span>
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>

          {/* Quick Suggestion Prompts */}
          <div className={`px-4 py-2 border-t flex items-center gap-1.5 overflow-x-auto text-[11px] ${
            isDark ? 'border-slate-800/40 bg-slate-950/40' : 'border-slate-200 bg-slate-50'
          }`}>
            <span className="text-slate-500 text-[10px] font-mono shrink-0">Quick Action:</span>
            <button
              type="button"
              onClick={() => handleQuickPrompt('Please review and optimize this deliverable for European tech standards.')}
              className={`px-2 py-1 rounded-lg border text-nowrap ${
                isDark
                  ? 'border-slate-700 bg-slate-900 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40'
                  : 'border-slate-300 bg-white text-slate-700 hover:text-cyan-700 hover:border-cyan-400'
              }`}
            >
              European Standard Review
            </button>
            <button
              type="button"
              onClick={() => handleQuickPrompt('Deliver all completed files in PDF, Markdown, JSON, and ZIP bundle.')}
              className={`px-2 py-1 rounded-lg border text-nowrap ${
                isDark
                  ? 'border-slate-700 bg-slate-900 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40'
                  : 'border-slate-300 bg-white text-slate-700 hover:text-cyan-700 hover:border-cyan-400'
              }`}
            >
              Export Multi-Type Files
            </button>
            <button
              type="button"
              onClick={() => handleQuickPrompt('Confirm payment verification status and dual-currency invoice receipt.')}
              className={`px-2 py-1 rounded-lg border text-nowrap ${
                isDark
                  ? 'border-slate-700 bg-slate-900 text-slate-300 hover:text-cyan-300 hover:border-cyan-500/40'
                  : 'border-slate-300 bg-white text-slate-700 hover:text-cyan-700 hover:border-cyan-400'
              }`}
            >
              Verify Invoice Receipt
            </button>
          </div>

          {/* Chat Message Input Box */}
          <form onSubmit={handleSendMessage} className={`p-4 border-t flex items-center gap-2 ${isDark ? 'bg-[#111B2E]/60 border-[#22314D]' : 'bg-slate-50 border-slate-200'}`}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder={`Type project requirements or ask about ${activeService.name}...`}
              className={`flex-1 rounded-xl px-4 py-2.5 text-xs border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            />

            <button
              type="submit"
              disabled={!chatInput.trim()}
              className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-colors disabled:opacity-40"
              title="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </main>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: Payment Options & Deliverables (While Working) */}
        {/* ============================================================ */}
        <aside
          className={`lg:col-span-4 flex flex-col p-4 space-y-4 overflow-y-auto lg:max-h-[720px] custom-scrollbar ${
            activeMobileView !== 'payment' ? 'hidden lg:flex' : 'flex'
          } ${isDark ? 'bg-[#0E1726]' : 'bg-slate-50/60'}`}
        >
          {/* Header & Pricing Overview with Geolocation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-sm tracking-tight flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-cyan-500" />
                <span>Payment & Deliverables</span>
              </h3>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                isDark ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-emerald-700 bg-emerald-50 border-emerald-300'
              }`}>
                Verified Portal
              </span>
            </div>

            {/* Total Price Card */}
            <div className={`p-3.5 rounded-xl border space-y-2 ${isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs text-slate-500">Project Total:</span>
                <span className={`text-xs font-mono px-2 py-0.5 rounded border break-all ${
                  isDark ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' : 'bg-cyan-50 text-cyan-800 border-cyan-200'
                }`}>
                  Ref: PAY-{activeOrder?.orderId || 'PENDING'}
                </span>
              </div>

              <div className="flex items-baseline justify-between flex-wrap gap-2">
                <div className="text-xl font-heading font-extrabold text-cyan-500">
                  {formatPrice(basePriceUsd)}
                </div>
                <div className="text-xs font-mono text-slate-500">
                  {currency === 'USD' ? `≈ ${(basePriceUsd * (settings.exchangeRate || 100)).toLocaleString()} ৳ BDT` : `≈ $${basePriceUsd} USD`}
                </div>
              </div>

              <p className="text-[10px] text-slate-500">
                Live exchange rate: 1 USD = {settings.exchangeRate || 100} TK. Verified by admin upon submission.
              </p>
            </div>
          </div>

          {/* Real Payment Methods with Copy Buttons */}
          <div className="space-y-2">
            <label className={`text-xs font-semibold block ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              1. Select Payment Method & Transfer:
            </label>

            <div className="space-y-2">
              {settings.paymentMethods.map((method) => {
                const isSelected = selectedMethod === method.id;
                const isBkash = method.id.toLowerCase().includes('bkash');

                return (
                  <div
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all text-xs ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-400/60 ring-1 ring-cyan-500/30'
                        : isDark
                        ? 'bg-[#111B2E] border-[#22314D] hover:border-slate-700'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-heading font-bold text-inherit">{method.name}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        isDark ? 'text-cyan-400 bg-cyan-500/10' : 'text-cyan-700 bg-cyan-50'
                      }`}>
                        {method.category === 'mobile_banking' ? 'BDT (TK)' : 'USD / Crypto'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-1.5">
                      <div className={`font-mono text-[11px] break-all select-all ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {method.accountNumber}
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(method.accountNumber, method.id);
                        }}
                        className={`p-1.5 rounded-lg border shrink-0 transition-colors ${
                          isDark
                            ? 'border-slate-700 bg-slate-800 text-slate-300 hover:text-white'
                            : 'border-slate-300 bg-slate-100 text-slate-700 hover:text-slate-950'
                        }`}
                        title="Copy account / ID"
                      >
                        {copiedKey === method.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {isBkash && (
                      <div className={`mt-2 text-[10px] font-mono p-1.5 rounded border flex items-center gap-1.5 ${
                        isDark
                          ? 'text-amber-300/90 bg-amber-500/10 border-amber-500/20'
                          : 'text-amber-800 bg-amber-50 border-amber-200'
                      }`}>
                        <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
                        <span>Personal Account — <strong>Send Money only</strong> (No merchant pay)</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Inline Payment Proof Submission Form */}
          <form onSubmit={handleSubmitProof} className={`p-3.5 rounded-xl border space-y-3 ${isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                2. Submit Proof of Payment:
              </span>
              <span className="text-[10px] font-mono text-slate-500">Step 2 of 2</span>
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 mb-1 font-mono">
                Transaction ID / TxHash (Required)
              </label>
              <input
                type="text"
                required
                value={trxIdInput}
                onChange={(e) => setTrxIdInput(e.target.value)}
                placeholder="e.g. 9K8J7H6G5F or 0x9f4a... or TXN-1042"
                className={`w-full rounded-lg px-3 py-2 text-xs font-mono border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                  isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">
                  Amount Sent ({currency})
                </label>
                <input
                  type="number"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder={basePriceUsd.toString()}
                  className={`w-full rounded-lg px-3 py-2 text-xs font-mono border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                    isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 mb-1">
                  Sender Phone / ID
                </label>
                <input
                  type="text"
                  value={senderIdentifier}
                  onChange={(e) => setSenderIdentifier(e.target.value)}
                  placeholder="+8801... / ID"
                  className={`w-full rounded-lg px-3 py-2 text-xs font-mono border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                    isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            {/* Receipt Upload Input */}
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">
                Receipt Screenshot (Optional)
              </label>
              <label className={`w-full py-2 px-3 rounded-lg border border-dashed flex items-center justify-center gap-2 cursor-pointer transition-colors text-xs ${
                isDark ? 'border-slate-700 bg-slate-900 hover:border-cyan-500' : 'border-slate-300 bg-slate-50 hover:border-cyan-500'
              }`}>
                <UploadCloud className="w-4 h-4 text-cyan-400" />
                <span className="text-[11px] truncate">{proofFileName || 'Attach payment receipt'}</span>
                <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="hidden" />
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmittingProof || !trxIdInput.trim()}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-heading font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm disabled:opacity-40"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isSubmittingProof ? 'Submitting Proof...' : 'Submit Payment Proof'}</span>
            </button>
          </form>

          {/* ============================================================ */}
          {/* DELIVERABLES: Complete file in multiple type for the client */}
          {/* ============================================================ */}
          <div className={`space-y-2 pt-2 border-t ${isDark ? 'border-slate-800/40' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <h4 className="font-heading font-bold text-xs text-inherit flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Multi-Type Deliverable Files</span>
              </h4>
              <span className="text-[10px] font-mono text-emerald-400">Ready</span>
            </div>

            <p className="text-[10px] text-slate-400">
              Download your verified production files in any format:
            </p>

            <div className="space-y-2">
              {multiTypeFiles.map((file) => (
                <div
                  key={file.format}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs transition-colors ${
                    isDark ? 'bg-[#111B2E] border-[#22314D] hover:border-cyan-500/30' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                      {file.format === 'html' && <FileText className="w-3.5 h-3.5" />}
                      {file.format === 'md' && <FileCode className="w-3.5 h-3.5" />}
                      {file.format === 'json' && <Code className="w-3.5 h-3.5" />}
                      {file.format === 'txt' && <FileText className="w-3.5 h-3.5" />}
                    </div>

                    <div className="truncate">
                      <div className="font-semibold text-inherit text-[11px] truncate">
                        {file.label}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        {file.filename}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      triggerDownload(file.getContent(), file.filename, file.mimeType);
                      showToast('File Downloaded', file.filename, 'success');
                    }}
                    className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-500/20 transition-all shrink-0"
                    title={`Download ${file.label}`}
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Official PDF Invoice Generator button */}
            {clientInvoices.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedInvoice(clientInvoices[0])}
                className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                  isDark ? 'bg-[#16233B] border-[#22314D] text-slate-200 hover:text-white' : 'bg-slate-100 border-slate-300 text-slate-800'
                }`}
              >
                <Printer className="w-3.5 h-3.5 text-cyan-400" />
                <span>View Official Accounting Receipt & PDF</span>
              </button>
            )}
          </div>
        </aside>

      </div>

      {/* Printable Invoice Modal if invoked */}
      {selectedInvoice && (
        <InvoicePrintModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
};
