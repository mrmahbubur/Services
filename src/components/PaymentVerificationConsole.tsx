import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Upload,
  RefreshCw,
  PlusCircle,
  HelpCircle,
  Lock,
  RotateCcw,
} from 'lucide-react';
import {
  PaymentSubmissionV2,
  LedgerEntryV2,
  PaymentVerificationSettingsV2,
  BridgeStatusRecord,
  LedgerSource,
} from '../types/paymentVerification';
import {
  DEFAULT_PAYMENT_VERIFICATION_SETTINGS,
  toMajorUnits,
  formatMoney,
  scoreMatch,
} from '../services/paymentVerificationService';

const OFFICIAL_METHODS = [
  { value: 'bkash-personal', label: 'bKash (Personal) — 01810853282 (BDT)', currency: 'BDT' as const },
  { value: 'nagad-personal', label: 'Nagad (Personal) — 01810853282 (BDT)', currency: 'BDT' as const },
  { value: 'payoneer', label: 'Payoneer — Customer ID 108003450 (USD)', currency: 'USD' as const },
  { value: 'skrill', label: 'Skrill — Customer ID 407108385 (USD)', currency: 'USD' as const },
  { value: 'binance-pay', label: 'Binance Pay — UID 38927942 / mrxshahn (USD)', currency: 'USD' as const },
];

function mapChannelToSource(channel?: string, source?: LedgerSource): LedgerSource {
  if (source) return source;
  switch (channel) {
    case 'sms':
      return 'sms_bridge';
    case 'email':
      return 'email_bridge';
    case 'statement':
      return 'statement_import';
    case 'api':
      return 'crypto_watcher';
    default:
      return 'manual_entry';
  }
}

function normalizeSubmission(raw: any): PaymentSubmissionV2 {
  const currency: 'USD' | 'BDT' = raw.currency === 'BDT' ? 'BDT' : 'USD';
  const amountMinor =
    typeof raw.amountMinor === 'number'
      ? raw.amountMinor
      : Math.round(Number(raw.amount || 0) * 100);
  const method = raw.method || raw.methodId || 'bkash-personal';
  const trxId = raw.normalizedTrxId || raw.transactionId || raw.trxKey || '';
  const firstEvidence = Array.isArray(raw.evidenceFiles) ? raw.evidenceFiles[0] : undefined;

  return {
    id: raw.id,
    intentId: raw.intentId || raw.orderId || '',
    invoiceId: raw.invoiceId || '',
    clientId: raw.clientId || '',
    clientName: raw.clientName,
    clientEmail: raw.clientEmail,
    method,
    accountId: raw.accountId || method,
    trxKey: raw.trxKey || `${method}:${trxId}`,
    normalizedTrxId: trxId,
    amountMinor,
    currency,
    paidAt: raw.paidAt || raw.createdAt || new Date().toISOString(),
    senderMask: raw.senderMask || '****',
    status: raw.status || 'awaiting_ledger',
    riskScore: typeof raw.riskScore === 'number' ? raw.riskScore : 0,
    flags: Array.isArray(raw.flags)
      ? raw.flags
      : raw.decisionReason
      ? [raw.decisionReason]
      : [],
    idempotencyKey: raw.idempotencyKey || raw.id,
    note: raw.note,
    evidenceId: raw.evidenceId,
    evidence: raw.evidence || (firstEvidence
      ? {
          id: `${raw.id}-ev0`,
          paymentId: raw.id,
          fileName: firstEvidence.fileName || 'receipt',
          sha256: firstEvidence.sha256 || '',
          previewUrl: firstEvidence.dataUrl || '',
          mismatches: [],
        }
      : undefined),
    matchedLedgerEntryId: raw.matchedLedgerEntryId || raw.matchedLedgerId,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
    ownerConfirmationStatus:
      raw.ownerConfirmationStatus === 'NOT_RECEIVED'
        ? 'NOT RECEIVED'
        : raw.ownerConfirmationStatus,
  };
}

function normalizeLedger(raw: any): LedgerEntryV2 {
  const currency: 'USD' | 'BDT' = raw.currency === 'BDT' ? 'BDT' : 'USD';
  const amountMinor =
    typeof raw.amountMinor === 'number'
      ? raw.amountMinor
      : Math.round(Number(raw.amount || 0) * 100);
  const method = raw.method || raw.methodId || 'bkash-personal';
  const trxKey = raw.trxKey || raw.normalizedTrxId || raw.trxId || '';
  const status = raw.status || (raw.used ? 'consumed' : 'unmatched');

  return {
    id: raw.id,
    source: mapChannelToSource(raw.channel, raw.source),
    method,
    accountId: raw.accountId || method,
    trxKey,
    trxId: raw.trxId || trxKey,
    amountMinor,
    currency,
    senderMask: raw.senderMask || raw.sender,
    receivedAt: raw.receivedAt || raw.createdAt || new Date().toISOString(),
    rawMasked: raw.rawMasked || raw.rawPayload || '',
    status,
    matchedPaymentId: raw.matchedPaymentId || raw.claimedByPaymentId,
    ingestedAt: raw.ingestedAt || raw.createdAt || new Date().toISOString(),
    integrityFlags: Array.isArray(raw.integrityFlags) ? raw.integrityFlags : [],
  };
}

export const PaymentVerificationConsole: React.FC = () => {
  const { theme, showToast, settings: appSettings, updateSettings } = useApp();
  const isDark = theme === 'dark';

  // Queue tab state
  const [activeQueue, setActiveQueue] = useState<'needs_action' | 'awaiting_ledger' | 'auto_verified' | 'rejected' | 'all'>('needs_action');
  const [activeSubTab, setActiveSubTab] = useState<'queue' | 'statement_import' | 'manual_ledger' | 'orphans' | 'registry' | 'settings'>('queue');

  // Backend state
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState({ needsAction: 0, awaitingLedger: 0, autoVerified: 0, rejected: 0, total: 0 });
  const [payments, setPayments] = useState<PaymentSubmissionV2[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntryV2[]>([]);
  const [settings, setSettings] = useState<PaymentVerificationSettingsV2>(DEFAULT_PAYMENT_VERIFICATION_SETTINGS);
  const [bridgeStatuses, setBridgeStatuses] = useState<Record<string, BridgeStatusRecord>>({});

  // Selected payment for detail inspection modal
  const [selectedPayment, setSelectedPayment] = useState<PaymentSubmissionV2 | null>(null);

  // Modals & Action States
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('Transaction record not found in provider statement.');
  const [showRequestInfoModal, setShowRequestInfoModal] = useState(false);
  const [requestInfoMsg, setRequestInfoMsg] = useState('Please provide an unedited full-screen transaction receipt showing the reference.');
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    method: 'bkash-personal',
    trxId: '',
    amount: '',
    reason: 'Owner verified in mobile app',
  });

  // Inline Payment Reversal Confirmation Modal (replaces window.prompt / window.confirm)
  const [reverseTargetId, setReverseTargetId] = useState<string | null>(null);
  const [reverseReason, setReverseReason] = useState('');

  // Statement Import Modal State
  const [importText, setImportText] = useState('');
  const [importMethod, setImportMethod] = useState('bkash-personal');
  const [importResult, setImportResult] = useState<{ importedCount: number; skippedCount: number } | null>(null);

  // Step-up verification for amounts above threshold
  const [stepUpModalOpen, setStepUpModalOpen] = useState(false);
  const [pendingVerifyPayment, setPendingVerifyPayment] = useState<{ payment: PaymentSubmissionV2; ledgerId?: string } | null>(null);

  // Section 5B Signed Registry state from server
  const [serverRegistry, setServerRegistry] = useState<any | null>(null);
  const [registryLoading, setRegistryLoading] = useState(false);

  const fetchRegistry = async () => {
    setRegistryLoading(true);
    try {
      const res = await fetch('/api/admin/payment-registry');
      if (res.ok) {
        const data = await res.json();
        setServerRegistry(data.registry || data);
      }
    } catch (err) {
      console.error('Fetch Registry Error:', err);
    } finally {
      setRegistryLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubTab === 'registry') {
      fetchRegistry();
    }
  }, [activeSubTab]);

  // Fetch payments queue from server
  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/payments?queue=${activeQueue}`);
      if (res.ok) {
        const data = await res.json();
        setPayments(Array.isArray(data.payments) ? data.payments.map(normalizeSubmission) : []);
        setCounts(data.counts || { needsAction: 0, awaitingLedger: 0, autoVerified: 0, rejected: 0, total: 0 });
        setLedgerEntries(Array.isArray(data.ledgerEntries) ? data.ledgerEntries.map(normalizeLedger) : []);
        if (data.settings) {
          setSettings((prev) => ({ ...prev, ...data.settings }));
        }
        if (data.bridgeStatuses) setBridgeStatuses(data.bridgeStatuses);
      }
    } catch (err) {
      console.error('Fetch Queue Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, [activeQueue]);

  // Handle Verify Action (with Step-Up check if > stepUpAmountUsd)
  const handleInitiateVerify = (payment: PaymentSubmissionV2, ledgerId?: string) => {
    const amountUSD =
      payment.currency === 'USD'
        ? toMajorUnits(payment.amountMinor)
        : toMajorUnits(payment.amountMinor) / (appSettings.exchangeRate || 100);
    if (amountUSD > (settings.stepUpAmountUsd || 200)) {
      setPendingVerifyPayment({ payment, ledgerId });
      setStepUpModalOpen(true);
      return;
    }
    executeVerify(payment.id, ledgerId);
  };

  const executeVerify = async (paymentId: string, ledgerEntryId?: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ledgerEntryId,
          reason: 'Owner confirmed after reviewing authoritative ledger entry.',
        }),
      });
      if (res.ok) {
        showToast('Payment Verified', `Payment ${paymentId} settled atomically. Files unlocked.`, 'success');
        setSelectedPayment(null);
        setStepUpModalOpen(false);
        setPendingVerifyPayment(null);
        fetchQueue();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast('Verification Failed', err.error || 'Server error', 'error');
      }
    } catch (err: any) {
      showToast('Network Error', err.message || 'Unable to verify payment', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPayment) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/payments/${selectedPayment.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (res.ok) {
        showToast('Payment Rejected', `Client notified: ${rejectReason}`, 'info');
        setShowRejectModal(false);
        setSelectedPayment(null);
        fetchQueue();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast('Rejection Failed', err.error || 'Server rejected request', 'error');
      }
    } catch (err: any) {
      showToast('Error', err.message || 'Network error', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestInfo = async () => {
    if (!selectedPayment) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/payments/${selectedPayment.id}/request-info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: requestInfoMsg }),
      });
      if (res.ok) {
        showToast('Info Requested', 'Payment moved to review & message sent to client.', 'info');
        setShowRequestInfoModal(false);
        setSelectedPayment(null);
        fetchQueue();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast('Request Failed', err.error || 'Server rejected request', 'error');
      }
    } catch (err: any) {
      showToast('Error', err.message || 'Network error', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Section 5A.5 Explicit Owner Safeguard Actions
  const handleOwnerReceived = async (payment: PaymentSubmissionV2) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/payments/${payment.id}/owner-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RECEIVED', note: 'Owner confirmed funds in real account.' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast('Payment Confirmed in Account', 'Funds confirmed. Work is active and deliverables unlocked.', 'success');
        setSelectedPayment(null);
        fetchQueue();
      } else {
        showToast('Confirmation Failed', data.error || 'Server rejected owner confirmation', 'error');
      }
    } catch (err: any) {
      showToast('Error', err.message || 'Could not reach server', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReversePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reverseTargetId || !reverseReason.trim()) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/payments/${reverseTargetId}/reverse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reverseReason.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast('Payment Reversed', data.message || 'Payment reversed. Deliverables locked again.', 'info');
        setReverseTargetId(null);
        setReverseReason('');
        setSelectedPayment(null);
        fetchQueue();
      } else {
        showToast('Reversal Failed', data.error || 'Server rejected reversal', 'error');
      }
    } catch (err: any) {
      showToast('Error', err.message || 'Could not connect to server', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOwnerNotReceived = async (payment: PaymentSubmissionV2) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/payments/${payment.id}/owner-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'NOT_RECEIVED', note: 'Checked banking app; payment not found. Work paused.' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast('Marked NOT RECEIVED', 'Work paused and client order held for review.', 'info');
        setSelectedPayment(null);
        fetchQueue();
      } else {
        showToast('Update Failed', data.error || 'Server rejected NOT_RECEIVED update', 'error');
      }
    } catch (err: any) {
      showToast('Network Error', err.message || 'Could not connect to server', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOwnerCheck = async (payment: PaymentSubmissionV2) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/payments/${payment.id}/owner-confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CHECK', note: 'Flagged for deeper statement reconciliation.' }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showToast('Flagged as CHECK', 'Payment flagged for statement reconciliation.', 'info');
        setSelectedPayment(null);
        fetchQueue();
      } else {
        showToast('Update Failed', data.error || 'Server rejected CHECK flag', 'error');
      }
    } catch (err: any) {
      showToast('Network Error', err.message || 'Could not connect to server', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddManualLedger = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    const isBdt = manualForm.method.includes('bkash') || manualForm.method.includes('nagad');
    try {
      const res = await fetch('/api/admin/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: manualForm.method,
          trxId: manualForm.trxId,
          amount: parseFloat(manualForm.amount),
          currency: isBdt ? 'BDT' : 'USD',
          reason: manualForm.reason,
        }),
      });
      if (res.ok) {
        showToast('Ledger Entry Added', 'Manual record added to authoritative ledger.', 'success');
        setShowManualModal(false);
        setManualForm({ method: 'bkash-personal', trxId: '', amount: '', reason: 'Owner verified in mobile app' });
        fetchQueue();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast('Failed to Add', err.error || 'Duplicate or invalid entry', 'error');
      }
    } catch (err: any) {
      showToast('Error', err.message || 'Network error', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleImportStatement = async () => {
    if (!importText.trim()) return;
    setActionLoading(true);
    try {
      const lines = importText.trim().split('\n');
      const rows: any[] = [];
      for (const line of lines) {
        const parts = line.split(/[,;\t]/).map((p) => p.trim());
        if (parts.length >= 2) {
          rows.push({
            trxId: parts[0],
            amount: parseFloat(parts[1]),
            sender: parts[2] || '',
            date: parts[3] || new Date().toISOString(),
          });
        }
      }

      const res = await fetch('/api/admin/ledger/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: importMethod,
          rows,
          rawCsv: importText,
          fileName: `pasted_statement_${Date.now()}.csv`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const importedCount = Number(data.importRecord?.importedCount ?? data.imported ?? 0);
        const skippedCount = Number(data.importRecord?.skippedCount ?? Math.max(0, rows.length - importedCount));
        setImportResult({ importedCount, skippedCount });
        showToast('Statement Imported', `Imported ${importedCount} authoritative records.`, 'success');
        fetchQueue();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast('Import Failed', err.error || 'Could not import statement', 'error');
      }
    } catch (err: any) {
      showToast('Import Error', err.message || 'Network error', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkReconcile = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/reconcile-bulk', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        const verifiedTotal = Number(data.matchedCount ?? data.verifiedCount ?? 0);
        showToast('Bulk Reconcile Complete', `Verified ${verifiedTotal} exact green match(es).`, 'success');
        fetchQueue();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast('Reconcile Failed', err.error || 'Server error', 'error');
      }
    } catch (err: any) {
      showToast('Error', err.message || 'Network error', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateSettings = async (updated: Partial<PaymentVerificationSettingsV2>) => {
    try {
      const res = await fetch('/api/admin/payment-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSettings((prev) => ({ ...prev, ...data.settings }));
        }
        showToast('Settings Saved', 'Verification limits & rules updated.', 'success');
      } else {
        const err = await res.json().catch(() => ({}));
        showToast('Save Failed', err.error || 'Could not update settings', 'error');
      }
    } catch (err: any) {
      showToast('Save Error', err.message || 'Network error', 'error');
    }
  };

  // Find candidate matches for selected payment
  const selectedCandidates = selectedPayment
    ? ledgerEntries
        .filter((l) => {
          if (l.status !== 'unmatched') return false;
          const lPrefix = l.method.split('-')[0];
          const pPrefix = selectedPayment.method.split('-')[0];
          return l.method === selectedPayment.method || lPrefix === pPrefix;
        })
        .map((cand) => {
          const match = scoreMatch(selectedPayment, cand);
          return { candidate: cand, match };
        })
        .sort((a, b) => b.match.score - a.match.score)
    : [];

  return (
    <div className={`p-6 rounded-2xl border space-y-6 ${isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200 shadow-sm'}`}>
      {/* Top Header & Emergency Kill Switch Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-cyan-400" />
            <h2 className="font-heading font-extrabold text-xl text-inherit">Payment Verification Console</h2>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              V2 Authoritative
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic server decision engine: claim verification against verified Section 5B mobile banking, USD wallet, and Binance Pay records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {Object.keys(bridgeStatuses).length > 0 && (
            <span className="hidden xl:inline-flex text-[10px] font-mono px-2.5 py-1 rounded-lg bg-slate-800/60 border border-slate-700 text-slate-300">
              Bridges tracked: {Object.keys(bridgeStatuses).length}
            </span>
          )}
          <button
            onClick={() => handleUpdateSettings({ killSwitch: !settings.killSwitch })}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2 border transition-colors ${
              settings.killSwitch
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/50'
                : 'bg-slate-800/60 text-slate-300 border-slate-700 hover:border-slate-500'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{settings.killSwitch ? 'Emergency Kill Switch: ACTIVE' : 'Kill Switch: OFF'}</span>
          </button>

          <button
            onClick={fetchQueue}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-700 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-400 transition-colors"
            title="Refresh Queue"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/40 pb-2">
        <button
          onClick={() => setActiveSubTab('queue')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            activeSubTab === 'queue' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          Queue &amp; Ingestion ({counts.needsAction + counts.awaitingLedger})
        </button>
        <button
          onClick={() => setActiveSubTab('statement_import')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            activeSubTab === 'statement_import' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          Statement Import
        </button>
        <button
          onClick={() => setActiveSubTab('manual_ledger')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            activeSubTab === 'manual_ledger' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          Manual Ledger ({ledgerEntries.length})
        </button>
        <button
          onClick={() => setActiveSubTab('orphans')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            activeSubTab === 'orphans' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          Orphan Payments ({ledgerEntries.filter((e) => e.status === 'unmatched').length})
        </button>
        <button
          onClick={() => setActiveSubTab('registry')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            activeSubTab === 'registry' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          Section 5B Registry
        </button>
        <button
          onClick={() => setActiveSubTab('settings')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            activeSubTab === 'settings' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          Rules &amp; Thresholds
        </button>
      </div>

      {/* SUB-TAB 1: QUEUE & INGESTION */}
      {activeSubTab === 'queue' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveQueue('needs_action')}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                  activeQueue === 'needs_action'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                    : 'border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span>Needs Action</span>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/30 text-[10px]">{counts.needsAction}</span>
              </button>
              <button
                onClick={() => setActiveQueue('awaiting_ledger')}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                  activeQueue === 'awaiting_ledger'
                    ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
                    : 'border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span>Awaiting Ledger</span>
                <span className="px-1.5 py-0.2 rounded-full bg-cyan-500/30 text-[10px]">{counts.awaitingLedger}</span>
              </button>
              <button
                onClick={() => setActiveQueue('auto_verified')}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                  activeQueue === 'auto_verified'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                    : 'border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span>Verified</span>
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/30 text-[10px]">{counts.autoVerified}</span>
              </button>
              <button
                onClick={() => setActiveQueue('rejected')}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                  activeQueue === 'rejected'
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/50'
                    : 'border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span>Rejected</span>
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500/30 text-[10px]">{counts.rejected}</span>
              </button>
              <button
                onClick={() => setActiveQueue('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors ${
                  activeQueue === 'all'
                    ? 'bg-slate-700 text-white border-slate-600'
                    : 'border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <span>All ({counts.total})</span>
              </button>
            </div>

            <button
              onClick={handleBulkReconcile}
              disabled={actionLoading}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Verify All Green Matches</span>
            </button>
          </div>

          {payments.length === 0 ? (
            <div className="p-12 text-center border rounded-2xl border-dashed border-slate-800 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-400">Queue is clean</p>
              <p className="text-xs text-slate-500">No payment submissions in this queue filter.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/60 text-slate-400 font-mono uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Payment ID</th>
                    <th className="p-3">Invoice &amp; Client</th>
                    <th className="p-3">Method &amp; TrxID</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Risk</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {payments.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-bold text-cyan-400">{sub.id}</td>
                      <td className="p-3">
                        <span className="font-bold text-white block">{sub.invoiceId}</span>
                        <span className="text-[11px] text-slate-400 font-sans">{sub.clientName || sub.clientId}</span>
                      </td>
                      <td className="p-3">
                        <span className="uppercase text-amber-400 block">{sub.method}</span>
                        <span className="text-[11px] text-slate-400">{sub.normalizedTrxId}</span>
                      </td>
                      <td className="p-3 font-bold text-emerald-400">
                        {formatMoney(sub.amountMinor, sub.currency)}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          sub.status === 'verified'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : sub.status === 'matched_exact'
                            ? 'bg-teal-500/10 text-teal-400 border-teal-500/30'
                            : sub.status === 'awaiting_ledger'
                            ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                            : sub.status === 'rejected'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}>
                          {sub.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          sub.riskScore > 60
                            ? 'bg-rose-500/20 text-rose-400'
                            : sub.riskScore > 30
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-slate-800 text-slate-300'
                        }`}>
                          {sub.riskScore}/100
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {sub.status === 'verified' && (
                            <button
                              onClick={() => {
                                setReverseTargetId(sub.id);
                                setReverseReason('');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 font-bold text-[11px]"
                              title="Reverse verified payment"
                            >
                              Reverse
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedPayment(sub)}
                            className="px-3 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/30 font-bold text-[11px]"
                          >
                            Inspect &amp; Settle
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: STATEMENT IMPORT */}
      {activeSubTab === 'statement_import' && (
        <div className="space-y-4 max-w-3xl">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
            <h3 className="font-heading font-bold text-sm">Authoritative Statement Import (CSV / TSV / Raw Text)</h3>
            <p className="text-xs text-slate-400">
              Paste statement rows exported directly from your bKash Personal, Nagad Personal, Payoneer, Skrill, or Binance Pay history. The system normalizes transaction keys and prevents duplicates automatically.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Target Section 5B Payment Method</label>
              <select
                value={importMethod}
                onChange={(e) => setImportMethod(e.target.value)}
                className="w-full sm:w-80 p-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-white"
              >
                {OFFICIAL_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">
                Paste Rows (Format: TrxID, Amount, Sender, Date)
              </label>
              <textarea
                rows={6}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="9K8X2M99AB, 2500, 01711098234, 2026-11-05&#10;71B89KX123, 4500, 01810992341, 2026-11-05"
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 font-mono text-xs text-slate-200"
              />
            </div>

            <button
              onClick={handleImportStatement}
              disabled={actionLoading || !importText.trim()}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import &amp; Run Matching Engine</span>
            </button>
          </div>

          {importResult && (
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-xs space-y-1">
              <span className="font-bold block">Statement Ingested Successfully</span>
              <p>Imported: {importResult.importedCount} rows · Skipped: {importResult.skippedCount}</p>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: MANUAL LEDGER */}
      {activeSubTab === 'manual_ledger' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-sm">Authoritative Ledger Records ({ledgerEntries.length})</h3>
            <button
              onClick={() => setShowManualModal(true)}
              className="px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Manual Ledger Entry</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Ledger ID</th>
                  <th className="p-3">Source</th>
                  <th className="p-3">TrxKey</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Received At</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {ledgerEntries.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-800/20">
                    <td className="p-3 font-bold text-cyan-400">{l.id}</td>
                    <td className="p-3 uppercase text-[10px] text-slate-300">{(l.source || 'manual_entry').replace('_', ' ')}</td>
                    <td className="p-3 font-bold text-amber-400">{l.trxKey}</td>
                    <td className="p-3 font-bold text-emerald-400">{formatMoney(l.amountMinor, l.currency)}</td>
                    <td className="p-3 text-slate-400 text-[11px]">{new Date(l.receivedAt).toLocaleString()}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${
                        l.status === 'consumed'
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}>
                        {l.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: ORPHANS */}
      {activeSubTab === 'orphans' && (
        <div className="space-y-4 max-w-4xl">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
            <h3 className="font-heading font-bold text-sm">Orphan Payments (Unmatched Real Money)</h3>
            <p className="text-xs text-slate-400 mt-1">
              These records arrived on the server from the SMS bridge, email gateway, or imported statements, but have not yet been claimed by a client invoice submission.
            </p>
          </div>

          <div className="space-y-3">
            {ledgerEntries.filter((e) => e.status === 'unmatched').map((orphan) => (
              <div key={orphan.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900/30 flex items-center justify-between gap-4 font-mono text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-emerald-400">{formatMoney(orphan.amountMinor, orphan.currency)}</span>
                    <span className="text-slate-400">via</span>
                    <span className="text-amber-400 uppercase">{orphan.method}</span>
                    <span className="text-slate-500">({orphan.source})</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    TrxKey: <span className="text-white">{orphan.trxKey}</span> · Received: {new Date(orphan.receivedAt).toLocaleString()}
                  </div>
                </div>

                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(orphan.trxId || orphan.trxKey);
                    setActiveSubTab('queue');
                    showToast('Copied TrxID', `Switched to Queue to inspect matches for ${orphan.trxKey}`, 'info');
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 hover:border-cyan-500/50 text-cyan-400 text-xs font-sans font-bold"
                >
                  Copy TrxID &amp; Match
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 6: SETTINGS & THRESHOLDS */}
      {activeSubTab === 'settings' && (
        <div className="space-y-4 max-w-2xl text-xs">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/30 space-y-4">
            <h4 className="font-heading font-bold text-sm text-white">Deterministic Verification Thresholds (Section 14)</h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-400 block mb-1">SMS Auto-Verify Ceiling ($ USD)</label>
                <input
                  type="number"
                  value={settings.autoVerifyLimitsUsd.sms}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      autoVerifyLimitsUsd: { ...settings.autoVerifyLimitsUsd, sms: Number(e.target.value) },
                    })
                  }
                  className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 font-mono text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Email / Binance Ceiling ($ USD)</label>
                <input
                  type="number"
                  value={settings.autoVerifyLimitsUsd.chain}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      autoVerifyLimitsUsd: { ...settings.autoVerifyLimitsUsd, chain: Number(e.target.value) },
                    })
                  }
                  className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 font-mono text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Step-Up Auth Threshold ($ USD)</label>
                <input
                  type="number"
                  value={settings.stepUpAmountUsd}
                  onChange={(e) => setSettings({ ...settings, stepUpAmountUsd: Number(e.target.value) })}
                  className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 font-mono text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Auto-Verify Max Risk Threshold</label>
                <input
                  type="number"
                  value={settings.riskThresholdAuto}
                  onChange={(e) => setSettings({ ...settings, riskThresholdAuto: Number(e.target.value) })}
                  className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 font-mono text-white"
                />
              </div>
            </div>

            <button
              onClick={() => handleUpdateSettings(settings)}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs"
            >
              Save Configuration
            </button>
          </div>
        </div>
      )}

      {/* SUB-TAB: SECTION 5B PAYMENT ACCOUNT REGISTRY */}
      {activeSubTab === 'registry' && (
        <div className="space-y-6 max-w-4xl text-xs">
          <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400 shrink-0" />
                <div>
                  <h3 className="font-heading font-bold text-base text-white">Section 5B: Authoritative Payment Registry</h3>
                  <div className="flex items-center gap-2 pt-0.5 font-mono text-[11px] text-slate-300">
                    <span className="text-cyan-400 font-bold">v{serverRegistry?.registry_version || 2}</span>
                    <span>·</span>
                    <span className="text-slate-400" title={serverRegistry?.integrity_hash || 'SHA-256 Signed'}>
                      SHA-256:{' '}
                      <strong className="text-slate-200">
                        {serverRegistry?.integrity_hash ? `${serverRegistry.integrity_hash.slice(0, 16)}...` : 'loading...'}
                      </strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchRegistry}
                  disabled={registryLoading}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-mono text-[11px] flex items-center gap-1.5 border border-slate-700 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${registryLoading ? 'animate-spin' : ''}`} />
                  <span>Verify Hash</span>
                </button>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/40">
                  Signed &amp; Active
                </span>
              </div>
            </div>

            <p className="text-slate-300 leading-relaxed text-[11px]">
              These are the ONLY accounts M R S accepts payment into across all catalog and auto-built services per Section 5B.1.
              Changes require authorized administrative update with automated SHA-256 re-signing.
            </p>

            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  <strong>Retired Account Safety Guard:</strong> Nagad{' '}
                  <code className="bg-rose-950/60 px-1.5 py-0.5 rounded text-rose-200">01792322734</code> was retired on 2026-04-18. It is never displayed to clients; incoming transactions trigger manual review.
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[10px] font-bold shrink-0">
                RETIRED
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-heading font-bold text-sm text-emerald-400 flex items-center gap-2">
              <span>Local Accounts (Bangladesh) — Amounts in BDT (TK)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">1. bKash (Personal)</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">BDT</span>
                </div>
                <div className="space-y-1 text-slate-300">
                  <div>Account Number: <strong className="text-emerald-400 text-sm">01810853282</strong></div>
                  <div>Account Holder: <span className="text-slate-200">Md. Mahbubur Rahman</span></div>
                  <div>Allowed Type: <span className="text-amber-400 font-bold">Send Money only</span></div>
                  <div className="text-[10px] text-slate-400">Rule: Status must be &quot;Successful&quot;. Receiver must match 01810853282.</div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">2. Nagad (Personal)</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">BDT</span>
                </div>
                <div className="space-y-1 text-slate-300">
                  <div>Account Number: <strong className="text-emerald-400 text-sm">01810853282</strong> (Shared with bKash)</div>
                  <div>Account Holder: <span className="text-slate-200">Md. Mahbubur Rahman</span></div>
                  <div>Allowed Type: <span className="text-amber-400 font-bold">Send Money only</span></div>
                  <div className="text-[10px] text-slate-500 pt-0.5">Retired number: 01792322734 (safety flag)</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-heading font-bold text-sm text-cyan-400 flex items-center gap-2">
              <span>International Accounts — Amounts in USD ($)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">3. Binance Pay (Optional)</span>
                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[10px] font-bold">USD/USDT</span>
                </div>
                <div className="space-y-1 text-slate-300 text-[11px]">
                  <div>Binance UID: <strong className="text-amber-400">38927942</strong></div>
                  <div>Binance ID: <span className="text-amber-300">mrxshahn</span></div>
                  <div>Currency: <span className="text-white">USDT via Binance Pay</span></div>
                  <div className="text-[10px] text-rose-400 font-sans font-semibold">
                    Internal Binance Pay only (shown only when owner toggle is ON).
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">4. Payoneer</span>
                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[10px] font-bold">USD</span>
                </div>
                <div className="space-y-1 text-slate-300 text-[11px]">
                  <div>Customer ID: <strong className="text-emerald-400">108003450</strong></div>
                  <div>Account Holder: <span className="text-slate-200">Md. Mahbubur Rahman</span></div>
                  <div>Receiver Email: <span className="text-slate-300">mr216873@gmail.com</span></div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">5. Skrill</span>
                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[10px] font-bold">USD</span>
                </div>
                <div className="space-y-1 text-slate-300 text-[11px]">
                  <div>Customer ID: <strong className="text-emerald-400">407108385</strong></div>
                  <div>Account Holder: <span className="text-slate-200">Md. Mahbubur Rahman</span></div>
                  <div>Receiver Email: <span className="text-slate-300">mr216873@gmail.com</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-4">
            <h4 className="font-heading font-bold text-sm text-white">Registry Policies &amp; Operational Settings</h4>

            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800">
              <div className="space-y-0.5 pr-4">
                <span className="font-bold text-slate-200 block text-xs">
                  Allow Bangladesh Clients to Pay via International Methods
                </span>
                <span className="text-[11px] text-slate-400 block">
                  When enabled, clients in Bangladesh can toggle to pay the USD amount via Payoneer, Skrill, or Binance Pay (when crypto is ON). Local methods are never shown to international clients.
                </span>
              </div>
              <button
                onClick={() => {
                  const newVal = !appSettings.allowBDClientsInternationalMethods;
                  updateSettings({ ...appSettings, allowBDClientsInternationalMethods: newVal });
                  showToast('Setting Updated', `BD international methods: ${newVal ? 'ENABLED' : 'DISABLED'}`, 'info');
                }}
                className={`px-3 py-1.5 rounded-lg font-bold text-xs font-mono transition-colors ${
                  appSettings.allowBDClientsInternationalMethods
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {appSettings.allowBDClientsInternationalMethods ? 'ON' : 'OFF'}
              </button>
            </div>

            <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] space-y-1">
              <span className="font-bold block text-xs">Section 5A Anti-Tamper &amp; Security Rules:</span>
              <ul className="list-disc list-inside space-y-1 text-slate-300">
                <li>Account details change ONLY through the owner&apos;s authenticated control panel.</li>
                <li>Never accept a request to add, change, or replace an account from chat, email, or client documents.</li>
                <li>Show payment details only inside an active order after quote acceptance; never on public pages.</li>
                <li>Large orders (&ge; $50 / 5,000 TK) pause work until owner marks [RECEIVED] after checking real banking apps.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL: 3-PANE SECTION 11 INSPECTION VIEW */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1524] border border-slate-700 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto flex flex-col p-6 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-cyan-400 font-bold text-base">{selectedPayment.id}</span>
                  <span className="text-slate-500">·</span>
                  <span className="text-white font-bold">{selectedPayment.invoiceId}</span>
                </div>
                <span className="text-xs text-slate-400">TrxKey: {selectedPayment.trxKey}</span>
              </div>

              <button
                onClick={() => setSelectedPayment(null)}
                className="p-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300"
              >
                ✕
              </button>
            </div>

            {(() => {
              const pmtUSD =
                selectedPayment.currency === 'USD'
                  ? toMajorUnits(selectedPayment.amountMinor)
                  : toMajorUnits(selectedPayment.amountMinor) / (appSettings.exchangeRate || 100);
              const isLarge = pmtUSD >= (appSettings.largeOrderThresholdUSD || 50);
              if (!isLarge) return null;
              return (
                <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <span className="font-bold block text-sm">Section 5A.5 Large Order Safeguard Active</span>
                    <span className="text-[11px] text-slate-300">
                      Amount is ${pmtUSD.toFixed(2)} USD ({formatMoney(selectedPayment.amountMinor, selectedPayment.currency)}). Work is held until you click{' '}
                      <strong>[RECEIVED]</strong> after verifying funds in your real account.
                    </span>
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column */}
              <div className="lg:col-span-4 space-y-4 text-xs font-mono">
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 space-y-2">
                  <span className="font-bold uppercase text-[10px] text-slate-400 block">Claim Details</span>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Client:</span>
                    <span className="text-white font-sans font-semibold">{selectedPayment.clientName || selectedPayment.clientId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Method:</span>
                    <span className="text-amber-400 uppercase">{selectedPayment.method}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Amount Sent:</span>
                    <span className="font-bold text-emerald-400">{formatMoney(selectedPayment.amountMinor, selectedPayment.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Paid At:</span>
                    <span className="text-slate-300">{new Date(selectedPayment.paidAt).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sender Mask:</span>
                    <span className="text-slate-300">{selectedPayment.senderMask || 'Not provided'}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 space-y-2">
                  <span className="font-bold uppercase text-[10px] text-slate-400 block">Risk &amp; Verification Notes</span>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Risk Score:</span>
                    <span className={`font-bold ${selectedPayment.riskScore > 30 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {selectedPayment.riskScore} / 100
                    </span>
                  </div>
                  {(selectedPayment.flags || []).map((f, i) => (
                    <div key={i} className="text-[11px] text-amber-300/80 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                      {f}
                    </div>
                  ))}
                </div>
              </div>

              {/* Middle Column */}
              <div className="lg:col-span-4 space-y-4 text-xs font-mono">
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 space-y-3">
                  <span className="font-bold uppercase text-[10px] text-slate-400 block">Screenshot Evidence</span>
                  {selectedPayment.evidence?.previewUrl ? (
                    <img
                      src={selectedPayment.evidence.previewUrl}
                      alt="Payment Receipt"
                      className="w-full h-44 object-contain rounded-lg border border-slate-800 bg-black"
                    />
                  ) : (
                    <div className="h-32 border border-dashed border-slate-800 rounded-lg flex items-center justify-center text-slate-500">
                      No screenshot uploaded
                    </div>
                  )}

                  {selectedPayment.evidence?.sha256 && (
                    <div className="text-[10px] text-slate-500 truncate">
                      SHA256: {selectedPayment.evidence.sha256}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column */}
              <div className="lg:col-span-4 space-y-4 text-xs font-mono">
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 space-y-3">
                  <span className="font-bold uppercase text-[10px] text-slate-400 block">Ranked Authoritative Records</span>

                  {selectedCandidates.length === 0 ? (
                    <div className="p-4 text-center border border-dashed border-slate-800 rounded-lg text-slate-500">
                      No matching records in ledger yet. Awaiting SMS, email, or statement ingestion.
                    </div>
                  ) : (
                    selectedCandidates.map(({ candidate, match }) => (
                      <div
                        key={candidate.id}
                        className={`p-3 rounded-xl border space-y-2 ${
                          match.outcome === 'matched_exact'
                            ? 'border-emerald-500/40 bg-emerald-500/10'
                            : 'border-slate-800 bg-slate-900/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{candidate.id}</span>
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            match.score >= 80 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            Score: {match.score}/100
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-400 space-y-1">
                          <div>TrxKey: <span className="text-amber-400">{candidate.trxKey}</span></div>
                          <div>Amount: <span className="text-emerald-400 font-bold">{formatMoney(candidate.amountMinor, candidate.currency)}</span></div>
                          <div className="text-[10px] text-slate-500">Source: {candidate.source}</div>
                        </div>

                        <button
                          onClick={() => handleInitiateVerify(selectedPayment, candidate.id)}
                          disabled={actionLoading}
                          className="w-full py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Match &amp; Settle Atomically</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowRejectModal(true)}
                  className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-xs"
                >
                  Reject Claim
                </button>
                <button
                  onClick={() => setShowRequestInfoModal(true)}
                  className="px-3 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-bold text-xs"
                >
                  Request Info
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-2 font-mono">
                {selectedPayment.status === 'verified' && (
                  <button
                    onClick={() => {
                      setReverseTargetId(selectedPayment.id);
                      setReverseReason('');
                    }}
                    disabled={actionLoading}
                    className="px-3 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-bold text-xs flex items-center gap-1.5 transition-colors"
                    title="Reverse this verified payment and re-lock deliverables"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reverse Payment</span>
                  </button>
                )}
                <button
                  onClick={() => handleOwnerNotReceived(selectedPayment)}
                  disabled={actionLoading}
                  className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <XCircle className="w-4 h-4" />
                  <span>[NOT RECEIVED] Pause Work</span>
                </button>

                <button
                  onClick={() => handleOwnerCheck(selectedPayment)}
                  disabled={actionLoading}
                  className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <HelpCircle className="w-4 h-4" />
                  <span>[CHECK] Statement Audit</span>
                </button>

                <button
                  onClick={() => handleOwnerReceived(selectedPayment)}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>[RECEIVED] Confirm in Account</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INLINE REVERSE PAYMENT CONFIRMATION MODAL */}
      {reverseTargetId && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <form onSubmit={handleConfirmReversePayment} className="bg-[#0D1524] border border-rose-500/40 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h4 className="font-heading font-bold text-base text-rose-400">Reverse Verified Payment ({reverseTargetId})</h4>
            <p className="text-xs text-slate-300">
              Reversing marks the invoice awaiting payment again and re-locks all order deliverables immediately.
            </p>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Reversal Reason (Required)</label>
              <input
                type="text"
                required
                value={reverseReason}
                onChange={(e) => setReverseReason(e.target.value)}
                placeholder="e.g. Chargeback or incorrect TrxID credit"
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setReverseTargetId(null);
                  setReverseReason('');
                }}
                className="px-4 py-2 rounded-xl border border-slate-700 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading || !reverseReason.trim()}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs"
              >
                Confirm Reversal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* REQUEST INFO MODAL */}
      {showRequestInfoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0D1524] border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h4 className="font-heading font-bold text-base text-cyan-400">Request Clarification from Client</h4>
            <textarea
              rows={3}
              value={requestInfoMsg}
              onChange={(e) => setRequestInfoMsg(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowRequestInfoModal(false)} className="px-4 py-2 rounded-xl border border-slate-700 text-xs text-slate-300">
                Cancel
              </button>
              <button onClick={handleRequestInfo} disabled={actionLoading} className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs">
                Send Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT REASON MODAL */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0D1524] border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h4 className="font-heading font-bold text-base text-rose-400">Reject Payment Claim</h4>
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Select Template Reason</label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white"
              >
                <option value="Transaction record not found in provider statement.">Transaction not found</option>
                <option value="Amount paid does not cover invoice balance.">Underpayment</option>
                <option value="Money sent to unrecognized or incorrect account.">Wrong destination account</option>
                <option value="Screenshot is unreadable, cropped, or ambiguous.">Unclear evidence</option>
                <option value="Duplicate submission: Transaction ID was already credited elsewhere.">Duplicate TrxID</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowRejectModal(false)} className="px-4 py-2 rounded-xl border border-slate-700 text-xs text-slate-300">
                Cancel
              </button>
              <button onClick={handleReject} disabled={actionLoading} className="px-4 py-2 rounded-xl bg-rose-500 text-white font-bold text-xs">
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL LEDGER MODAL */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <form onSubmit={handleAddManualLedger} className="bg-[#0D1524] border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4">
            <h4 className="font-heading font-bold text-base text-white">Add Authoritative Ledger Record</h4>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Section 5B Method</label>
                <select
                  value={manualForm.method}
                  onChange={(e) => setManualForm({ ...manualForm, method: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                >
                  {OFFICIAL_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Transaction ID / Reference</label>
                <input
                  type="text"
                  required
                  value={manualForm.trxId}
                  onChange={(e) => setManualForm({ ...manualForm, trxId: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  placeholder="e.g. 9K8X2M99AB"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">
                  Amount ({manualForm.method.includes('bkash') || manualForm.method.includes('nagad') ? 'BDT' : 'USD'})
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={manualForm.amount}
                  onChange={(e) => setManualForm({ ...manualForm, amount: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono"
                  placeholder="e.g. 2500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Audit Reason</label>
                <input
                  type="text"
                  value={manualForm.reason}
                  onChange={(e) => setManualForm({ ...manualForm, reason: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setShowManualModal(false)} className="px-4 py-2 rounded-xl border border-slate-700 text-xs text-slate-300">
                Cancel
              </button>
              <button type="submit" disabled={actionLoading} className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs">
                Save Record
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP-UP AUTHENTICATION MODAL */}
      {stepUpModalOpen && pendingVerifyPayment && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#0D1524] border border-amber-500/50 rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h4 className="font-heading font-bold text-base text-amber-400">Step-Up Authorization Required</h4>
            <p className="text-xs text-slate-300">
              This payment exceeds the configured owner threshold of ${settings.stepUpAmountUsd} USD. Confirm that you have personally inspected the external account before releasing deliverables.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setStepUpModalOpen(false);
                  setPendingVerifyPayment(null);
                }}
                className="px-4 py-2 rounded-xl border border-slate-700 text-xs text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => executeVerify(pendingVerifyPayment.payment.id, pendingVerifyPayment.ledgerId)}
                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs"
              >
                Confirm Step-Up &amp; Verify
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
