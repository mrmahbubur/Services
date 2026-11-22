import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AutomationMode } from '../types/automation';
import {
  Zap,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Check,
  X,
  MessageSquare,
  Smartphone,
  Coins,
  Clock,
  Inbox,
  RefreshCw,
} from 'lucide-react';

export const AutomationControlCenter: React.FC = () => {
  const {
    automationSettings,
    updateAutomationSettings,
    automationRules,
    updateAutomationRuleMode,
    automationRuns,
    approvals,
    decideApproval,
    automationKpis,
    incomingPayments,
    refreshAdminData,
    theme,
    showToast,
  } = useApp();

  const isDark = theme === 'dark';

  const [activeSubTab, setActiveSubTab] = useState<
    'overview' | 'approvals' | 'rules' | 'payments_ladder' | 'logs'
  >('overview');

  // Inline approval edit modal state (no window.prompt)
  const [editingApprovalId, setEditingApprovalId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');

  // Manual Ledger / SMS Ingestion Check Form
  const [smsMethod, setSmsMethod] = useState<'bkash-personal' | 'nagad-personal' | 'binance-pay' | 'payoneer' | 'skrill'>('bkash-personal');
  const [manualTrxId, setManualTrxId] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualCurrency, setManualCurrency] = useState<'BDT' | 'USD'>('BDT');
  const [ingesting, setIngesting] = useState(false);

  const [logFilter, setLogFilter] = useState<'all' | 'success' | 'failed' | 'pending_approval'>('all');

  const pendingApprovalsCount = approvals.filter((a) => a.status === 'pending').length;
  const filteredRuns = automationRuns.filter((r) => (logFilter === 'all' ? true : r.result === logFilter));

  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://mrs-services.ai.studio';

  const handleRecordRealLedgerEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTrxId.trim() || !manualAmount) return;
    setIngesting(true);
    try {
      const res = await fetch('/api/admin/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: smsMethod,
          trxId: manualTrxId.trim(),
          amount: Number(manualAmount),
          currency: manualCurrency,
          reason: 'Recorded via Operations Control Center',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast('Ledger Error', data.error || 'Could not record transaction.', 'error');
        return;
      }
      setManualTrxId('');
      setManualAmount('');
      await refreshAdminData();
      showToast('Ledger Recorded', `Transaction ${data.entry?.trxId || manualTrxId} added and checked for exact invoice match.`, 'success');
    } catch (err: any) {
      showToast('Network Error', err?.message || 'Failed to record ledger entry.', 'error');
    } finally {
      setIngesting(false);
    }
  };

  const handleRunBulkReconcile = async () => {
    setIngesting(true);
    try {
      const res = await fetch('/api/admin/reconcile-bulk', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast('Reconcile Error', data.error || 'Could not run bulk reconcile.', 'error');
        return;
      }
      await refreshAdminData();
      showToast('Bulk Reconcile Complete', `Matched and verified ${data.verifiedCount || 0} pending submissions.`, 'success');
    } catch (err: any) {
      showToast('Network Error', err?.message || 'Could not run bulk reconcile.', 'error');
    } finally {
      setIngesting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* GLOBAL KILL SWITCH BANNER */}
      {automationSettings.killSwitch && (
        <div className="p-4 rounded-2xl bg-rose-500/20 border-2 border-rose-500 text-rose-200 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0" />
            <div>
              <h4 className="font-heading font-extrabold text-sm sm:text-base text-white">
                GLOBAL AUTOMATION KILL SWITCH IS ACTIVE
              </h4>
              <p className="text-xs text-rose-300">
                Autonomous fulfilment execution is paused. Manual owner overrides remain active.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              updateAutomationSettings({ killSwitch: false });
              showToast('Kill Switch Cleared', 'Live automation engine resumed normal operation.', 'success');
            }}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shrink-0 transition-colors"
          >
            Resume Automations
          </button>
        </div>
      )}

      {/* TOP METRICS & CONTROLS HEADER */}
      <div
        className={`p-6 rounded-2xl border flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 ${
          isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center font-bold">
            <Zap className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading font-extrabold text-xl text-inherit">
                Autonomous Operations Engine
              </h2>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                100% Live Execution
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Order → Quote → Payment → AI Work → QA Gate → Owner Release. Zero dry-run or mock pipelines.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            const next = !automationSettings.killSwitch;
            updateAutomationSettings({ killSwitch: next });
            showToast(next ? 'Kill Switch ACTIVATED' : 'Kill Switch Cleared', next ? 'All automations paused on server' : 'Live automations active', next ? 'warning' : 'success');
          }}
          className={`px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
            automationSettings.killSwitch
              ? 'bg-rose-500 text-white border-rose-600 shadow-lg'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>{automationSettings.killSwitch ? 'Kill Switch ACTIVE' : 'Arm Kill Switch'}</span>
        </button>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200'}`}>
          <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Verified Settlement Rate</span>
          <span className="text-lg font-heading font-extrabold text-cyan-400 mt-1 block">
            {automationKpis.touchlessRatePct}%
          </span>
          <span className="text-[10px] text-slate-500">Live payment ratio</span>
        </div>

        <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200'}`}>
          <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Ledger Notices</span>
          <span className="text-lg font-heading font-extrabold text-emerald-400 mt-1 block">
            {incomingPayments.length}
          </span>
          <span className="text-[10px] text-slate-500">SMS / Email / API entries</span>
        </div>

        <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200'}`}>
          <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Audit Events</span>
          <span className="text-lg font-heading font-extrabold text-purple-400 mt-1 block">
            {automationKpis.totalAutomatedEvents}
          </span>
          <span className="text-[10px] text-slate-500">Append-only server log</span>
        </div>

        <div className={`p-4 rounded-xl border ${isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200'}`}>
          <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Approval Queue</span>
          <span className={`text-lg font-heading font-extrabold mt-1 block ${pendingApprovalsCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
            {pendingApprovalsCount} Pending
          </span>
          <span className="text-[10px] text-slate-500">Awaiting owner release</span>
        </div>
      </div>

      {/* SUB-TABS NAVIGATION */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold border-b border-slate-800">
        {[
          { id: 'overview', label: 'Overview & Limits' },
          { id: 'approvals', label: `Approval Inbox (${pendingApprovalsCount})` },
          { id: 'rules', label: `Automations Matrix (${automationRules.length})` },
          { id: 'payments_ladder', label: 'Live Payment Ledger & Reconciliation' },
          { id: 'logs', label: `Execution Logs (${automationRuns.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSubTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-t-xl transition-colors border-b-2 text-nowrap ${
              activeSubTab === tab.id
                ? 'border-cyan-400 text-cyan-400 font-bold bg-cyan-500/10'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* SUBTAB 1: OVERVIEW & LIMITS */}
      {activeSubTab === 'overview' && (
        <div className={`p-6 rounded-2xl border space-y-4 ${isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-heading font-bold text-base text-white">Operational Thresholds & Limits</h3>
              <p className="text-xs text-slate-400">Persisted directly to `/api/admin/fulfilment-settings`.</p>
            </div>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded border border-cyan-500/20">
              Guardrails Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
              <label className="text-slate-400 block font-semibold">Max Auto-Verify Limit (USD)</label>
              <input
                type="number"
                value={automationSettings.maxAutoVerifyAmountUSD}
                onChange={(e) => updateAutomationSettings({ maxAutoVerifyAmountUSD: Number(e.target.value) || 50 })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-emerald-400 font-bold"
              />
              <span className="text-[10px] text-slate-500 block">Above limit requires owner confirmation</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
              <label className="text-slate-400 block font-semibold">Max Auto-Quote Value (USD)</label>
              <input
                type="number"
                value={automationSettings.maxAutoQuoteAmountUSD}
                onChange={(e) => updateAutomationSettings({ maxAutoQuoteAmountUSD: Number(e.target.value) || 100 })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-cyan-400 font-bold"
              />
              <span className="text-[10px] text-slate-500 block">Escalated orders wait in Approval Inbox</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
              <label className="text-slate-400 block font-semibold">AI Confidence Threshold</label>
              <input
                type="number"
                step="0.05"
                min="0.5"
                max="1.0"
                value={automationSettings.aiConfidenceThreshold}
                onChange={(e) => updateAutomationSettings({ aiConfidenceThreshold: Number(e.target.value) || 0.8 })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-purple-400 font-bold"
              />
              <span className="text-[10px] text-slate-500 block">Low-confidence triage routes to owner</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
              <label className="text-slate-400 block font-semibold">Daily AI Call Cap</label>
              <input
                type="number"
                value={automationSettings.dailyAiCallsCount}
                onChange={(e) => updateAutomationSettings({ dailyAiCallsCount: Number(e.target.value) || 100 })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-amber-400 font-bold"
              />
              <span className="text-[10px] text-slate-500 block">Enforced server-side daily quota</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs space-y-1.5">
            <span className="font-bold text-cyan-300 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-cyan-400" />
              Operational Governance Boundaries
            </span>
            <ul className="list-disc list-inside text-slate-300 text-[11px] space-y-1">
              <li>Human services (IT support, live setup, custom edits) always undergo owner review prior to release.</li>
              <li>Camellia cannot confirm unverified payments, change invoice totals, or expose credentials.</li>
            </ul>
          </div>
        </div>
      )}

      {/* SUBTAB 2: APPROVAL INBOX */}
      {activeSubTab === 'approvals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-bold text-base text-white">Owner Approval Inbox</h3>
              <p className="text-xs text-slate-400">Fulfilment jobs & deliverables awaiting owner sign-off before client release.</p>
            </div>
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-3 py-1 rounded border border-amber-500/30">
              {pendingApprovalsCount} Awaiting Decision
            </span>
          </div>

          {approvals.filter((a) => a.status === 'pending').length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-slate-700/60 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-bold text-white">Approval Inbox is Clear</h4>
              <p className="text-xs text-slate-400">No items currently require manual owner approval.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {approvals
                .filter((a) => a.status === 'pending')
                .map((item) => (
                  <div
                    key={item.id}
                    className={`p-5 rounded-2xl border space-y-3 ${
                      isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-cyan-400">{item.id}</span>
                        <span className="font-semibold text-white text-xs">{item.clientName}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold uppercase">
                          {item.actionType.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(item.createdAt).toLocaleTimeString()}
                      </span>
                    </div>

                    <div className="text-xs space-y-1">
                      <p className="text-slate-200 font-medium">{item.summary}</p>
                      <p className="text-slate-400 text-[11px]">
                        <strong>Next Step:</strong> {item.suggestedAction}
                      </p>
                    </div>

                    {editingApprovalId === item.id ? (
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-700 space-y-2 text-xs">
                        <label className="text-slate-400 block">Override / Force Release Reason</label>
                        <input
                          type="text"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          placeholder="Enter owner review note..."
                          className="w-full rounded-lg px-3 py-2 bg-slate-900 border border-slate-700 text-white"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingApprovalId(null)}
                            className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await decideApproval(item.id, 'approved', editNotes.trim() || item.suggestedAction);
                              setEditingApprovalId(null);
                              setEditNotes('');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold"
                          >
                            Confirm & Release
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800/60">
                        <button
                          type="button"
                          onClick={() => decideApproval(item.id, 'rejected', 'Returned for rework by owner')}
                          className="px-3 py-1.5 rounded-xl border border-rose-500/30 text-rose-300 hover:bg-rose-500/10 text-xs font-semibold flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Send Back</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingApprovalId(item.id);
                            setEditNotes(item.suggestedAction || '');
                          }}
                          className="px-3 py-1.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
                        >
                          Add Note & Release
                        </button>

                        <button
                          type="button"
                          onClick={() => decideApproval(item.id, 'approved')}
                          className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve Release</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* SUBTAB 3: AUTOMATION RULES MATRIX */}
      {activeSubTab === 'rules' && (
        <div className="space-y-3">
          {automationRules.map((rule) => (
            <div
              key={rule.id}
              className={`p-5 rounded-2xl border ${isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200'}`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800/60">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-cyan-400 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                      {rule.id}
                    </span>
                    <h4 className="font-heading font-bold text-sm text-white">{rule.name}</h4>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{rule.description}</p>
                </div>

                <select
                  value={rule.mode}
                  onChange={(e) => {
                    const newMode = e.target.value as AutomationMode;
                    updateAutomationRuleMode(rule.id, newMode);
                    showToast('Rule Mode Updated', `${rule.name} set to ${newMode.toUpperCase()}`, 'info');
                  }}
                  className="rounded-xl px-3 py-1.5 text-xs font-bold border bg-slate-900 border-slate-700 text-slate-200"
                >
                  <option value="auto">Fully Automatic</option>
                  <option value="approval">Auto with Approval</option>
                  <option value="suggest">Suggest Only</option>
                  <option value="off">Off (Manual)</option>
                </select>
              </div>
              <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-400">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Trigger</span>
                  <span className="text-slate-300 font-mono text-[11px]">{rule.triggerEvent}</span>
                  <p className="text-[11px] mt-0.5">{rule.conditionsDescription}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Actions</span>
                  <p className="text-slate-300 text-[11px]">{rule.actionsDescription}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SUBTAB 4: LIVE PAYMENT LEDGER & RECONCILIATION */}
      {activeSubTab === 'payments_ladder' && (
        <div className={`p-6 rounded-2xl border space-y-6 ${isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200'}`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 className="font-heading font-bold text-base text-white">Live HMAC Bridges & Direct Ledger Reconciliation</h3>
              <p className="text-xs text-slate-400">
                Real production endpoints accept HMAC-signed Android SMS & Gmail collector payloads and auto-match exact unpaid claims.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRunBulkReconcile}
              disabled={ingesting}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${ingesting ? 'animate-spin' : ''}`} />
              <span>Run Bulk Reconciliation</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-[11px]">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">SMS Forwarder Webhook (HMAC SHA-256):</span>
              <span className="text-cyan-400 break-all select-all">{siteOrigin}/api/ingest/sms</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Email Payment Collector Endpoint:</span>
              <span className="text-emerald-400 break-all select-all">{siteOrigin}/api/ingest/email</span>
            </div>
          </div>

          {/* Record Verified Ledger Receipt directly */}
          <form onSubmit={handleRecordRealLedgerEntry} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3 text-xs">
            <span className="font-bold text-white flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              Record Authoritative Bank / Wallet Credit in Ledger
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <select
                value={smsMethod}
                onChange={(e: any) => setSmsMethod(e.target.value)}
                className="rounded-lg px-3 py-2 bg-slate-900 border border-slate-700 text-white font-mono"
              >
                <option value="bkash-personal">bKash Personal</option>
                <option value="nagad-personal">Nagad Personal</option>
                <option value="payoneer">Payoneer</option>
                <option value="skrill">Skrill</option>
                <option value="binance-pay">Binance Pay</option>
              </select>
              <input
                type="text"
                required
                value={manualTrxId}
                onChange={(e) => setManualTrxId(e.target.value)}
                placeholder="Exact TrxID / Reference"
                className="rounded-lg px-3 py-2 bg-slate-900 border border-slate-700 text-white font-mono"
              />
              <input
                type="number"
                step="any"
                required
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                placeholder="Exact Amount"
                className="rounded-lg px-3 py-2 bg-slate-900 border border-slate-700 text-white font-mono"
              />
              <div className="flex gap-2">
                <select
                  value={manualCurrency}
                  onChange={(e: any) => setManualCurrency(e.target.value)}
                  className="rounded-lg px-2 py-2 bg-slate-900 border border-slate-700 text-white font-mono"
                >
                  <option value="BDT">BDT</option>
                  <option value="USD">USD</option>
                </select>
                <button
                  type="submit"
                  disabled={ingesting}
                  className="flex-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold"
                >
                  Log Credit
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* SUBTAB 5: EXECUTION LOGS */}
      {activeSubTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-bold text-base text-white">Fulfilment & Automation Logs</h3>
              <p className="text-xs text-slate-400">Derived directly from server fulfilment jobs and audit trail.</p>
            </div>
            <select
              value={logFilter}
              onChange={(e: any) => setLogFilter(e.target.value)}
              className="rounded-xl px-3 py-1.5 bg-slate-900 border border-slate-700 text-white text-xs"
            >
              <option value="all">All Logs ({automationRuns.length})</option>
              <option value="success">Released</option>
              <option value="pending_approval">Pending Review</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div className="space-y-2">
            {filteredRuns.length === 0 ? (
              <div className="p-8 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                No execution logs recorded yet.
              </div>
            ) : (
              filteredRuns.map((run) => (
                <div
                  key={run.id}
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                    isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${run.result === 'success' ? 'bg-emerald-400' : run.result === 'pending_approval' ? 'bg-amber-400' : 'bg-rose-400'}`} />
                      <span className="font-mono text-slate-400 text-[10px]">{run.id}</span>
                      <span className="font-bold text-white">{run.ruleName}</span>
                    </div>
                    <p className="text-slate-300 text-[11px]">{run.inputSummary}</p>
                    <p className="text-emerald-400 font-mono text-[10px]">{run.actionTaken}</p>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(run.createdAt).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
