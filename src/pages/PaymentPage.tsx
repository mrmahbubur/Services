import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  ShieldCheck,
  Check,
  Copy,
  AlertCircle,
  AlertTriangle,
  Upload,
  CheckCircle2,
  Lock,
  ArrowRight,
  ImageIcon,
  X,
  CreditCard,
  QrCode,
  Clock,
  ExternalLink,
  Calendar,
  RefreshCw,
  FileCheck2,
  Fingerprint,
  Unlock,
} from 'lucide-react';
import { hashFile } from '../utils/crypto';
import { getQrCodeUrl } from '../utils/serviceLinks';
import { PaymentVerificationStatus } from '../components/PaymentVerificationStatus';

export const PaymentPage: React.FC = () => {
  const { invoiceId, orderId } = useParams<{ invoiceId?: string; orderId?: string }>();
  const {
    allInvoices,
    allOrders,
    settings,
    theme,
    convertPrice,
    submitPaymentProof,
    allPayments,
    currentClient,
    formatPrice,
    showToast,
    refreshPortalData,
  } = useApp();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  // Find target invoice by invoiceId or orderId (zero fake fallback)
  const invoice = invoiceId || orderId
    ? allInvoices.find((i) => i.invoiceId === invoiceId || i.orderId === orderId || i.invoiceNumber === invoiceId)
    : allInvoices.find((i) => i.status !== 'paid_verified' && i.status !== 'Paid');

  // Find associated order
  const order = invoice
    ? allOrders.find((o) => o.orderId === invoice.orderId)
    : orderId
    ? allOrders.find((o) => o.orderId === orderId)
    : undefined;

  // Locked Amount Snapshot from Invoice
  const amountUSD = invoice ? (invoice.amountDue ?? invoice.amountUSD) : (order?.quoteAmount || 0);
  const rateSnapshot = invoice?.rateSnapshot || settings.exchangeRate || 100;
  const amountBDT = Math.round(amountUSD * rateSnapshot);
  const paymentReference = invoice?.paymentReferenceCode || order?.orderId?.replace('ORD-', 'PAY-') || '';

  // Section 5A.2 Country-Based Method Routing
  const clientCountry = (order?.clientCountry || currentClient?.country || '').toLowerCase().trim();
  const isBangladesh = !clientCountry || clientCountry === 'bangladesh' || clientCountry === 'bd' || clientCountry.includes('bangla');

  // Filter methods by region & settings (Section 5A.2)
  const availablePaymentMethods = settings.paymentMethods.filter((m) => {
    if (m.active === false) return false;
    if (m.category === 'crypto' && !settings.cryptoEnabled) return false;

    if (!isBangladesh) {
      // Outside Bangladesh: show Binance, Payoneer, Skrill (USD)
      // NEVER show local methods to international clients
      return m.region === 'international' || m.currency === 'USD';
    }

    // Client is in Bangladesh: show bKash and Nagad (BDT)
    if (m.region === 'local' || m.currency === 'BDT') {
      return true;
    }

    // Optional owner setting: allow Bangladesh clients to use international methods
    return settings.allowBDClientsInternationalMethods === true;
  });

  // Selected payment method
  const [selectedMethodId, setSelectedMethodId] = useState<string>(() => {
    const firstAvailable = availablePaymentMethods[0];
    return firstAvailable ? firstAvailable.id : (isBangladesh ? 'bkash-personal' : 'binance-pay');
  });

  // Ensure selectedMethodId is valid for current set
  useEffect(() => {
    if (availablePaymentMethods.length > 0 && !availablePaymentMethods.some((m) => m.id === selectedMethodId)) {
      setSelectedMethodId(availablePaymentMethods[0].id);
    }
  }, [availablePaymentMethods, selectedMethodId]);

  const activeMethod =
    availablePaymentMethods.find((m) => m.id === selectedMethodId) ||
    availablePaymentMethods[0] ||
    settings.paymentMethods[0];

  // Section 5A.4.E: 3 Failed attempts limit locks to MANUAL_REVIEW
  const failedAttemptsCount = allPayments.filter(
    (p) => (p.invoiceId === invoice?.invoiceId || p.orderId === order?.orderId) && p.status === 'Rejected'
  ).length;
  const isLockedToManualReview = failedAttemptsCount >= 3 || order?.status === 'MANUAL_REVIEW';

  // Payment form fields
  const [trxId, setTrxId] = useState('');
  const [amountPaid, setAmountPaid] = useState<number>(() => (isBangladesh ? amountBDT : amountUSD));
  const [paymentCurrency, setPaymentCurrency] = useState<'BDT' | 'USD'>(() => (isBangladesh ? 'BDT' : 'USD'));
  const [senderAccountMask, setSenderAccountMask] = useState('');
  const [paymentDateTime, setPaymentDateTime] = useState<string>(() => new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState('');
  const [receiptBase64, setReceiptBase64] = useState<string | null>(null);
  const [receiptFileName, setReceiptFileName] = useState('');
  const [receiptHash, setReceiptHash] = useState<string | undefined>(undefined);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedPayment, setSubmittedPayment] = useState<any | null>(null);
  const [manualReviewSubmitted, setManualReviewSubmitted] = useState(false);
  const [liveCheckResults, setLiveCheckResults] = useState<any | null>(null);
  const [checkingLiveStatus, setCheckingLiveStatus] = useState(false);

  // Check if this invoice/order already has a payment submitted
  const existingPayment = allPayments.find(
    (p) => (p.invoiceId === invoice?.invoiceId || p.orderId === order?.orderId) && p.status !== 'Rejected'
  );

  // Check if order is in payment review state (Section 14.6 state machine & Section 5B)
  const isPaymentReviewState =
    (order?.status as string) === 'payment_review' ||
    (order?.status as string) === 'PAYMENT_REVIEW' ||
    order?.status === 'Payment submitted' ||
    order?.status === 'MANUAL_REVIEW' ||
    order?.status === 'Verified' ||
    order?.status === 'PAID_VERIFIED' ||
    Boolean(submittedPayment) ||
    Boolean(existingPayment && existingPayment.status !== 'Rejected');

  const fetchLiveStatus = async (paymentIdOrTrx?: string) => {
    const targetId = paymentIdOrTrx || submittedPayment?.id || submittedPayment?.trxId || existingPayment?.trxId || invoice?.invoiceId;
    if (!targetId) return;

    setCheckingLiveStatus(true);
    try {
      const res = await fetch(`/api/payments/${targetId}/status`);
      if (res.ok) {
        const data = await res.json();
        if (data.checkResults) {
          setLiveCheckResults(data.checkResults);
        }
        if (data.submission) {
          setSubmittedPayment((prev: any) => ({ ...prev, ...data.submission }));
        }
        showToast('Status Updated', 'Live verification results refreshed from server', 'info');
      }
    } catch (err) {
      console.warn('Status fetch warning:', err);
    } finally {
      setCheckingLiveStatus(false);
    }
  };

  useEffect(() => {
    fetchLiveStatus();
    const interval = setInterval(() => {
      fetchLiveStatus();
    }, 12000);
    return () => clearInterval(interval);
  }, [submittedPayment?.id, existingPayment?.trxId, invoice?.invoiceId]);

  useEffect(() => {
    if (activeMethod.currency === 'BDT' || activeMethod.category === 'mobile_banking') {
      setPaymentCurrency('BDT');
      setAmountPaid(amountBDT);
    } else {
      setPaymentCurrency('USD');
      setAmountPaid(amountUSD);
    }
  }, [activeMethod, amountBDT, amountUSD]);

  const copyToClipboard = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt);
    setCopiedText(label);
    showToast('Copied to clipboard', label, 'info');
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('File Too Large', 'Receipt file exceeds the maximum size of 5 MB.', 'error');
      return;
    }

    setReceiptFileName(file.name);
    const hash = await hashFile(file);
    setReceiptHash(hash);

    const reader = new FileReader();
    reader.onload = () => {
      setReceiptBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const [editMode, setEditMode] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trxId.trim() || submitting || !order || isLockedToManualReview) return;

    if (!receiptBase64) {
      showToast(
        'Receipt Document Required',
        `Please upload a screenshot or PDF receipt for ${activeMethod.name} so backend AI can verify your payment.`,
        'warning'
      );
      return;
    }

    setSubmitting(true);
    const idempotencyKey = `PAY-${invoice?.invoiceId || order.orderId}-${trxId.trim().toUpperCase()}`;

    try {
      // 1. Submit TrxID + Receipt Document together for Backend AI verification & activation email
      let backendSub: any = null;
      const methodKey = activeMethod.id;

      const apiRes = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          invoiceId: invoice?.invoiceId || order.orderId,
          methodId: methodKey,
          transactionId: trxId.trim(),
          amount: Number(amountPaid),
          currency: paymentCurrency,
          paidAt: paymentDateTime ? new Date(paymentDateTime).toISOString() : new Date().toISOString(),
          senderMask: senderAccountMask.trim(),
          note: notes.trim(),
          receiptFileName: receiptFileName || 'receipt.png',
          receiptBase64Data: receiptBase64,
        }),
      });

      const resData = await apiRes.json().catch(() => ({}));

      if (!apiRes.ok) {
        const errMsg = resData.error || resData.code || 'Payment submission failed';
        showToast('Payment Submission Failed', errMsg, 'error');
        setSubmitting(false);
        return;
      }

      backendSub = resData.submission;
      if (resData.checkResults) {
        setLiveCheckResults(resData.checkResults);
      }

      setSubmittedPayment(backendSub);
      setEditMode(false);
      await refreshPortalData();

      if (backendSub?.status === 'verified') {
        showToast(
          'Payment Verified',
          backendSub.emailDispatchStatus === 'sent'
            ? `Verified automatically. Confirmation sent to ${invoice?.clientEmail || order.clientEmail}.`
            : 'Payment verified. Your receipt and activation details are ready.',
          'success'
        );
      } else if (backendSub?.status === 'rejected') {
        showToast(
          'Needs Correction',
          'Please verify that your Transaction ID, amount, and receipt screenshot match the selected method.',
          'error'
        );
      } else if (backendSub?.secondProofRequested) {
        showToast(
          'Additional Proof Needed',
          'Please upload one additional proof of a different kind to complete verification.',
          'warning'
        );
      } else {
        showToast(
          'Checking Payment',
          'Your submission has been recorded and is being checked.',
          'info'
        );
      }
    } catch (err: any) {
      console.error(err);
      showToast('Submission Error', err.message || 'Payment submission failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const activeMethodQr = activeMethod.qrCodeUrl || getQrCodeUrl(activeMethod.accountNumber);

  if (!invoice && !order) {
    return (
      <div className={`min-h-[70vh] flex flex-col items-center justify-center px-4 py-12 text-center space-y-4 ${isDark ? 'text-[#E6EDF7]' : 'text-[#0B1220]'}`}>
        <div className={`max-w-md w-full p-8 rounded-2xl border space-y-4 ${isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200'}`}>
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
          <h2 className="font-heading font-bold text-xl">No Invoice Selected</h2>
          <p className="text-xs text-slate-400">
            Sign in to your Client Portal to open your invoice settlement link, or request a new service order first.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link to="/portal" className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs min-h-[40px] flex items-center">
              Open Client Portal
            </Link>
            <Link
              to="/request"
              className={`px-4 py-2 rounded-xl border text-xs font-semibold min-h-[40px] flex items-center ${
                isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              Request Service
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8 ${isDark ? 'text-[#E6EDF7]' : 'text-[#0B1220]'}`}>
      
      {/* Header with All Specified Identifiers (Part 1.3 & 2.8) */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-500 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>Payment Verification Protocol</span>
        </div>
        <h1 className="font-heading font-extrabold text-2xl sm:text-3xl tracking-tight break-words">
          Settle Invoice {invoice?.invoiceId || 'Direct Payment'}
        </h1>
        <p className={`text-xs sm:text-sm max-w-xl mx-auto ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          Payments are checked automatically against the provider's own records. Some payments are confirmed by the owner.
        </p>
      </div>

      {/* Meta Identifiers Bar */}
      <div className={`p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs font-mono ${
        isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="flex flex-wrap items-center gap-4 min-w-0">
          <div className="min-w-0">
            <span className="text-slate-500 text-[10px] block uppercase">Invoice ID:</span>
            <span className="font-bold text-cyan-500 break-all">{invoice?.invoiceId || 'INV-PENDING'}</span>
          </div>
          <div className="min-w-0">
            <span className="text-slate-500 text-[10px] block uppercase">Order ID:</span>
            <span className={`font-bold break-all ${isDark ? 'text-white' : 'text-slate-900'}`}>{order?.orderId || 'ORD-NEW'}</span>
          </div>
          <div className="min-w-0">
            <span className="text-slate-500 text-[10px] block uppercase">Service ID:</span>
            <span className="font-bold text-amber-500">{order?.serviceId || 'S-MRS-01'}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-left sm:text-right">
            <span className="text-slate-500 text-[10px] block uppercase">Due Date:</span>
            <span className="font-bold text-rose-500">{invoice?.dueDate || order?.dueDate || 'Within 48h'}</span>
          </div>
          <span className={`px-2 py-1 rounded text-[11px] font-bold uppercase border ${
            invoice?.status === 'paid_verified'
              ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-500 border-amber-500/30'
          }`}>
            {invoice?.status || 'Awaiting Payment'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Invoice Amount Lock & Accounts (~7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Amount Lock Card */}
          <div
            className={`p-6 rounded-2xl border space-y-4 ${
              isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className={`flex flex-wrap items-center justify-between gap-2 pb-3 border-b ${isDark ? 'border-slate-800/60' : 'border-slate-200'}`}>
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Target Service</span>
                <h3 className="font-heading font-bold text-base text-inherit">{order?.serviceName}</h3>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Timing Mode</span>
                <span className="font-mono text-xs font-bold text-cyan-500">
                  {order?.paymentTiming === 'A' ? 'Mode A (Pay after delivery)' : order?.paymentTiming === 'B' ? 'Mode B (Deposit 50%)' : 'Mode C (Prepay)'}
                </span>
              </div>
            </div>

            {/* Total Due in Dual Currency with Locked Snapshot */}
            <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-slate-500 block font-medium">Locked Invoice Total:</span>
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-mono font-extrabold text-2xl text-emerald-500">
                    {amountBDT.toLocaleString()} TK
                  </span>
                  <span className="font-mono text-sm text-slate-500">
                    (${amountUSD} USD)
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Locked at snapshot rate: 1 USD = {rateSnapshot} TK.
                </span>
              </div>

              {/* Payment Reference Code */}
              <div className={`p-2.5 rounded-xl border space-y-1 ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className="text-[10px] text-slate-500 block uppercase font-bold">Mandatory Note / Ref:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-bold text-cyan-500 select-all break-all">
                    {paymentReference}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(paymentReference, 'ref')}
                    className={`p-1 rounded transition-colors ${
                      isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                    }`}
                    title="Copy Reference"
                  >
                    {copiedText === 'ref' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Method Selector Cards */}
          <div className="space-y-3">
            <h3 className="font-heading font-bold text-sm tracking-wide flex items-center justify-between">
              <span>Select Payment Method</span>
              <span className="text-[11px] font-normal text-slate-400 font-mono">Sender covers all transfer fees</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {availablePaymentMethods.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMethodId(m.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedMethodId === m.id
                      ? 'border-cyan-400 bg-cyan-500/10 shadow-sm ring-1 ring-cyan-500/20'
                      : isDark
                      ? 'border-slate-800 bg-[#111B2E] hover:border-slate-700'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span className="text-[10px] font-mono text-cyan-400 block uppercase">{m.category.replace('_', ' ')}</span>
                  <span className="font-bold text-xs block text-inherit">{m.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Active Method Details & Instructions (Section 5A.1 & 5A.3) */}
          <div
            className={`p-5 rounded-2xl border space-y-4 ${
              isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
              <h4 className="font-heading font-bold text-sm text-cyan-400 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                <span>{activeMethod.name} Official Receiver Details</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="text-xs text-slate-400 hover:text-cyan-400 flex items-center gap-1 font-mono"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>Show QR</span>
              </button>
            </div>

            {/* Account / ID / Wallet Cards with Copy (Section 5A.1 & 5A.3) */}
            <div className="space-y-2">
              <div className={`p-3.5 rounded-xl border flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 ${
                isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">
                    {activeMethod.binanceUid ? 'Primary Receiver (Binance UID)' : activeMethod.customerId ? 'Customer ID' : 'Account Number'}
                  </span>
                  <span className={`font-mono text-sm font-bold tracking-wide select-all break-all block ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}>
                    {activeMethod.accountNumber}
                  </span>
                  {activeMethod.accountHolder && (
                    <span className="text-[10px] text-slate-500 block mt-0.5">Account Holder: {activeMethod.accountHolder}</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => copyToClipboard(activeMethod.accountNumber, activeMethod.name)}
                  className="shrink-0 inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-colors shadow-sm min-h-[36px]"
                >
                  {copiedText === activeMethod.name ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedText === activeMethod.name ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {/* Special secondary identifier for Binance: Binance ID mrxshahn */}
              {activeMethod.binancePayId && (
                <div className={`p-3 rounded-xl border flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 ${
                  isDark ? 'bg-slate-950/50 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="min-w-0">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Alternative Receiver (Binance ID)</span>
                    <span className="font-mono text-xs font-bold text-amber-500 select-all break-all block">
                      {activeMethod.binancePayId}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(activeMethod.binancePayId!, 'Binance ID')}
                    className={`shrink-0 inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded font-mono transition-colors ${
                      isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                    }`}
                  >
                    {copiedText === 'Binance ID' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedText === 'Binance ID' ? 'Copied' : 'Copy ID'}</span>
                  </button>
                </div>
              )}

            </div>

            {/* Instruction Steps per Method (Section 5B.5 Item 4) */}
            <div className={`p-4 rounded-xl border space-y-2.5 text-xs ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className="text-[10px] uppercase font-bold text-cyan-500 tracking-wider block">
                Official Payment Instructions (Section 5B)
              </span>
              <div className={`p-3 rounded-lg border font-mono text-[11px] leading-relaxed ${
                isDark ? 'bg-slate-950 border-cyan-500/20 text-cyan-300' : 'bg-white border-cyan-200 text-cyan-900'
              }`}>
                {selectedMethodId.includes('bkash') && (
                  <>Open bKash → Send Money → enter <strong>01810853282</strong> → amount <strong>{amountBDT.toLocaleString()} TK</strong> → reference <strong>{order?.orderId}</strong> → confirm.</>
                )}
                {selectedMethodId.includes('nagad') && (
                  <>Open Nagad → Send Money → enter <strong>01810853282</strong> → amount <strong>{amountBDT.toLocaleString()} TK</strong> → reference <strong>{order?.orderId}</strong> → confirm.</>
                )}
                {selectedMethodId.includes('binance') && (
                  <>Open Binance → Pay → Send → enter UID <strong>38927942</strong> or Binance ID <strong>mrxshahn</strong> → amount <strong>${amountUSD} USDT</strong> → note <strong>{order?.orderId}</strong> → confirm.</>
                )}
                {selectedMethodId.includes('payoneer') && (
                  <>Send <strong>${amountUSD} USD</strong> to Payoneer Customer ID <strong>108003450</strong> with the note <strong>{order?.orderId}</strong>.</>
                )}
                {selectedMethodId.includes('skrill') && (
                  <>Send <strong>${amountUSD} USD</strong> to Skrill Customer ID <strong>407108385</strong> with the note <strong>{order?.orderId}</strong>.</>
                )}
                {!selectedMethodId.includes('bkash') && !selectedMethodId.includes('nagad') && !selectedMethodId.includes('binance') && !selectedMethodId.includes('payoneer') && !selectedMethodId.includes('skrill') && (
                  <>Send exact amount to <strong>{activeMethod.accountNumber}</strong> with reference <strong>{order?.orderId}</strong>.</>
                )}
              </div>
              <ol className={`space-y-1.5 list-decimal list-inside text-[11px] leading-relaxed pt-1 ${
                isDark ? 'text-slate-300' : 'text-slate-700'
              }`}>
                <li>Send exact amount (sender pays transfer fee so the full invoice total arrives).</li>
                <li>Enter the mandatory Order ID reference note so your payment can be matched immediately.</li>
                <li>Return here, enter your Transaction ID/Hash and sender identifier, and attach your receipt.</li>
              </ol>
            </div>

            {/* Section 5B.5 Warning Banner */}
            <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 leading-relaxed ${
              isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
              <span>
                <strong>Warning:</strong> Pay only to the details shown here. We will never ask you to pay to a different number or account, and we never change these details by chat or email.
              </span>
            </div>

            {/* Section 5A.3 Screenshot Privacy Guidance */}
            <div className={`p-3 rounded-xl border text-[11px] space-y-1 ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
            }`}>
              <p className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>Screenshot Privacy Guidance:</p>
              <p>
                It is fine to hide your account balance in the screenshot, but do not obscure the transaction ID, amount, date/time, or receiver details.
              </p>
            </div>
          </div>

        </div>

        {/* Right Column: "I've Paid" Submission Form */}
        <div className="lg:col-span-5">
          <div
            className={`p-6 rounded-2xl border space-y-5 ${
              isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className={`flex items-center justify-between pb-3 border-b ${isDark ? 'border-slate-800/60' : 'border-slate-200'}`}>
              <h3 className="font-heading font-bold text-base">I've Paid — Submit Proof</h3>
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-500 font-semibold border border-cyan-500/30">
                Step 2 of 2
              </span>
            </div>

            {/* Section 5A.4.E: 3 Failed Attempts Freeze Banner */}
            {isLockedToManualReview && (
              <div className={`p-4 rounded-xl border text-xs space-y-2 ${
                isDark ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                <div className="flex items-center gap-2 font-bold text-rose-500">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>Automated Matching Frozen — Manual Review Required</span>
                </div>
                <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-rose-800'}`}>
                  This order has reached the maximum of 3 automated verification attempts. To protect your payment, automated matching has been paused and your case is routed to the team for direct manual review.
                </p>
                <div className="pt-1">
                  <Link
                    to="/portal"
                    className="inline-block py-1.5 px-3 rounded-lg bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs"
                  >
                    Open Client Portal Messages
                  </Link>
                </div>
              </div>
            )}

            {isPaymentReviewState && !editMode && order ? (
              <PaymentVerificationStatus
                order={order}
                invoice={invoice}
                payment={submittedPayment || existingPayment}
                onRefresh={fetchLiveStatus}
                onEditPayment={() => setEditMode(true)}
                isDark={isDark}
              />
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
                
                {/* Method Selected */}
                <div>
                  <label className="block text-slate-500 font-medium mb-1">Payment Method Used *</label>
                  <input
                    type="text"
                    disabled
                    value={activeMethod.name}
                    className={`w-full rounded-xl px-3 py-2 font-bold text-xs border ${
                      isDark ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
                    }`}
                  />
                </div>

                {/* Transaction ID */}
                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Transaction ID / TxHash / Bank Ref *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isLockedToManualReview}
                    value={trxId}
                    onChange={(e) => setTrxId(e.target.value)}
                    placeholder="e.g. 9K8J7H6G5F or 712KLM89"
                    className={`w-full min-h-[44px] rounded-[10px] px-3.5 py-2.5 font-mono text-sm border focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50 ${
                      isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Must be unique per transaction.</p>
                </div>

                {/* Sender Account Mask */}
                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Sender Account Identifier *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isLockedToManualReview}
                    value={senderAccountMask}
                    onChange={(e) => setSenderAccountMask(e.target.value)}
                    placeholder="Your sending number (e.g. 01711...) or Binance UID"
                    className={`w-full min-h-[44px] rounded-[10px] px-3.5 py-2.5 font-mono text-sm border focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50 ${
                      isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                {/* Amount & Currency */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Amount Sent *</label>
                    <input
                      type="number"
                      required
                      disabled={isLockedToManualReview}
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(Number(e.target.value))}
                      className={`w-full min-h-[44px] rounded-[10px] px-3.5 py-2.5 font-mono font-bold text-sm border focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50 ${
                        isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 font-medium mb-1">Currency *</label>
                    <select
                      value={paymentCurrency}
                      disabled={isLockedToManualReview}
                      onChange={(e: any) => setPaymentCurrency(e.target.value)}
                      className={`w-full min-h-[44px] rounded-[10px] px-3.5 py-2.5 text-sm border focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50 ${
                        isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                      }`}
                    >
                      <option value="BDT">BDT (TK)</option>
                      <option value="USD">USD ($)</option>
                    </select>
                  </div>
                </div>

                {/* Date & Time */}
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Date & Time of Payment *</label>
                  <input
                    type="datetime-local"
                    required
                    disabled={isLockedToManualReview}
                    value={paymentDateTime}
                    onChange={(e) => setPaymentDateTime(e.target.value)}
                    className={`w-full min-h-[44px] rounded-[10px] px-3.5 py-2.5 text-sm border focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50 ${
                      isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                {/* Receipt Screenshot Upload */}
                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Receipt / Confirmation Screenshot * (jpg, png, webp, pdf up to 5 MB)
                  </label>
                  <label className={`w-full min-h-[48px] py-3 px-3 rounded-[10px] border border-dashed flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                    receiptBase64
                      ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-400'
                      : isDark
                      ? 'border-slate-700 bg-slate-900 hover:border-cyan-500'
                      : 'border-slate-300 bg-slate-50 hover:border-cyan-500'
                  }`}>
                    <Upload className="w-4 h-4 text-cyan-400 shrink-0" />
                    <span className="text-xs font-mono truncate">
                      {receiptFileName || `Upload ${activeMethod.name} receipt screenshot / PDF`}
                    </span>
                    <input type="file" accept="image/png,image/jpeg,image/webp,.pdf" onChange={handleReceiptUpload} disabled={isLockedToManualReview} className="hidden" />
                  </label>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Payments are checked automatically and activation details are sent to your verified order email once confirmed.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !trxId.trim() || !receiptBase64 || isLockedToManualReview}
                  className="w-full min-h-[48px] py-3 px-4 rounded-[10px] bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-heading font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-md disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{submitting ? 'Submitting & Checking...' : 'Submit Payment Proof'}</span>
                </button>
              </form>
            )}
          </div>
        </div>

      </div>

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className={`w-full max-w-xs p-6 rounded-2xl border text-center space-y-4 ${
            isDark ? 'bg-[#111B2E] border-[#22314D] text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <span className="font-heading font-bold text-sm text-cyan-500">{activeMethod.name} QR</span>
              <button onClick={() => setShowQrModal(false)} className={`p-1 ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>
                <X className="w-4 h-4" />
              </button>
            </div>
            <img src={activeMethodQr} alt="Payment QR" className="w-48 h-48 mx-auto rounded-xl bg-white p-2 border border-slate-200" />
            <p className="text-[11px] font-mono text-slate-500 select-all break-all">{activeMethod.accountNumber}</p>
          </div>
        </div>
      )}

    </div>
  );
};
