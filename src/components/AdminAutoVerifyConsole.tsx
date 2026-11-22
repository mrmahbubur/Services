import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Upload,
  Trash2,
  SlidersHorizontal,
  Power,
  Sparkles,
  Clock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Badge, Button, Card, StateDisplay } from './ui';

const METHODS = [
  { id: 'bkash-personal', label: 'bKash Personal (BDT)' },
  { id: 'nagad-personal', label: 'Nagad Personal (BDT)' },
  { id: 'binance-pay', label: 'Binance Pay (USD)' },
  { id: 'payoneer', label: 'Payoneer (USD)' },
  { id: 'skrill', label: 'Skrill (USD)' },
];

export const AdminAutoVerifyConsole: React.FC = () => {
  const { showToast, refreshAdminData } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  // Local editable settings form synced from overview
  const [killSwitch, setKillSwitch] = useState(false);
  const [methodModes, setMethodModes] = useState<Record<string, string>>({});
  const [payToEmails, setPayToEmails] = useState<{ payoneer: string; skrill: string }>({
    payoneer: 'mr216873@gmail.com',
    skrill: 'mr216873@gmail.com',
  });
  const [autoVerifyScore, setAutoVerifyScore] = useState(80);
  const [retryScore, setRetryScore] = useState(55);
  const [weights, setWeights] = useState<Record<string, number>>({
    trxIdFormat: 20,
    fieldMatch: 25,
    looksGenuine: 25,
    matchesReference: 15,
    timePlausible: 10,
    historyClean: 5,
  });
  const [caps, setCaps] = useState<{
    newClientFirstOrderUsd: number;
    trustedClientOrderUsd: number;
    dailyTotalUsd: number;
    dailyPerMethodUsd: number;
    confirmWindowHours: number;
    onUnconfirmed: string;
  }>({
    newClientFirstOrderUsd: 20,
    trustedClientOrderUsd: 100,
    dailyTotalUsd: 150,
    dailyPerMethodUsd: 150,
    confirmWindowHours: 72,
    onUnconfirmed: 'alert_only',
  });

  // Reference Sample upload form
  const [refMethodId, setRefMethodId] = useState('bkash-personal');
  const [refLabel, setRefLabel] = useState('');
  const [refBase64, setRefBase64] = useState<string | null>(null);
  const [refFileName, setRefFileName] = useState('');
  const [uploadingRef, setUploadingRef] = useState(false);

  const [classifyingId, setClassifyingId] = useState<string | null>(null);
  const [acceptingMethod, setAcceptingMethod] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/auto-verify/overview');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not load Auto-Verify console overview.');
      } else {
        setOverview(data);
        setKillSwitch(Boolean(data.killSwitch));
        if (data.config) {
          setMethodModes(data.config.methodModes || {});
          setAutoVerifyScore(Number(data.config.autoVerifyScore ?? 80));
          setRetryScore(Number(data.config.retryScore ?? 55));
          if (data.config.weights) setWeights(data.config.weights);
          if (data.config.caps) setCaps(data.config.caps);
        }
        if (data.methodPayToEmails) {
          setPayToEmails({
            payoneer: data.methodPayToEmails.payoneer || 'mr216873@gmail.com',
            skrill: data.methodPayToEmails.skrill || 'mr216873@gmail.com',
          });
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Network error loading Auto-Verify console.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/auto-verify/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          killSwitch,
          methodModes,
          methodPayToEmails: payToEmails,
          autoVerifyScore: Number(autoVerifyScore),
          retryScore: Number(retryScore),
          weights,
          caps,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast('Save Failed', data.error || 'Could not save auto-verify configuration.', 'error');
      } else {
        showToast('Configuration Saved', 'Auto-verify thresholds, weights, and caps updated on server.', 'success');
        await loadOverview();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleKillSwitch = async () => {
    const next = !killSwitch;
    setKillSwitch(next);
    const res = await fetch('/api/admin/auto-verify/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ killSwitch: next }),
    });
    if (res.ok) {
      showToast(
        next ? 'Kill Switch Enabled' : 'Auto-Verify Resumed',
        next ? 'All automatic verifications paused; new submissions queue for owner review.' : 'Evidence Mode automatic verification active.',
        next ? 'warning' : 'success'
      );
      await loadOverview();
    }
  };

  const handleUploadReferenceSample = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refBase64) return;
    setUploadingRef(true);
    try {
      const res = await fetch('/api/admin/auto-verify/reference-samples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          methodId: refMethodId,
          label: refLabel.trim() || refFileName || `${refMethodId} authentic sample`,
          base64Data: refBase64,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast('Upload Failed', data.error || 'Could not save reference sample.', 'error');
      } else {
        showToast('Reference Sample Saved', `Added genuine sample for ${refMethodId}.`, 'success');
        setRefLabel('');
        setRefBase64(null);
        setRefFileName('');
        await loadOverview();
      }
    } finally {
      setUploadingRef(false);
    }
  };

  const handleDeleteSample = async (sampleId: string) => {
    const res = await fetch(`/api/admin/auto-verify/reference-samples/${sampleId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      showToast('Removed', 'Reference sample deleted.', 'info');
      await loadOverview();
    }
  };

  const handleClassify = async (paymentId: string, action: 'confirmed' | 'fraud' | 'fine') => {
    setClassifyingId(paymentId);
    try {
      const res = await fetch(`/api/admin/auto-verify/payments/${paymentId}/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast('Action Failed', data.error || 'Could not update classification.', 'error');
      } else {
        showToast(
          action === 'fraud' ? 'Fraud Recorded & Caps Halved' : action === 'confirmed' ? 'Payment Confirmed' : 'Marked Fine',
          `Payment ${paymentId} classified as ${action}.`,
          action === 'fraud' ? 'danger' as any : 'success'
        );
        await Promise.all([loadOverview(), refreshAdminData()]);
      }
    } finally {
      setClassifyingId(null);
    }
  };

  const handleAcceptRegex = async (methodId: string, regex: string) => {
    setAcceptingMethod(methodId);
    try {
      const res = await fetch(`/api/admin/auto-verify/shapes/${methodId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regex }),
      });
      if (res.ok) {
        showToast('Regex Accepted', `Tight TrxID shape pattern saved for ${methodId}.`, 'success');
        await loadOverview();
      }
    } finally {
      setAcceptingMethod(null);
    }
  };

  if (loading && !overview) {
    return <StateDisplay type="loading" title="Loading Auto-Verify Console" description="Fetching exposure metrics, decision logs, and reference samples..." />;
  }

  if (error) {
    return (
      <StateDisplay
        type="error"
        title="Could Not Load Auto-Verify Console"
        description={error}
        action={<Button onClick={loadOverview}>Retry</Button>}
      />
    );
  }

  const totalUnconfirmedUsd = overview?.exposure?.totalUnconfirmedUsd ?? 0;
  const unconfirmedCount = overview?.exposure?.unconfirmedCount ?? 0;
  const overdueCount = overview?.exposure?.overdueCount ?? 0;
  const decisionLog = Array.isArray(overview?.decisionLog) ? overview.decisionLog : [];
  const refSamples = Array.isArray(overview?.referenceSamples) ? overview.referenceSamples : [];
  const shapeLibrary = Array.isArray(overview?.shapeLibrary) ? overview.shapeLibrary : [];

  return (
    <div className="space-y-6">
      {/* Permanent Owner Unconfirmed Exposure Warning Banner (§6) */}
      <div className="p-4 sm:p-5 rounded-2xl border border-[#F59E0B]/45 bg-[#F59E0B]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-[#F59E0B] shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-1">
            <h3 className="font-heading font-bold text-base text-[var(--color-text)]">
              Evidence Mode Exposure: <span className="font-mono text-[#F59E0B]">${totalUnconfirmedUsd} USD</span> unconfirmed across {unconfirmedCount} payment(s)
            </h3>
            <p className="text-xs text-[var(--color-muted)]">
              Auto-verified payments verified by evidence remain unconfirmed until matched by SMS/email statement or owner tap. Overdue (&gt;{caps.confirmWindowHours}h): <strong className="text-[var(--color-danger)]">{overdueCount}</strong>.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            type="button"
            variant={killSwitch ? 'danger' : 'secondary'}
            size="sm"
            onClick={handleToggleKillSwitch}
          >
            <Power className="w-4 h-4" />
            <span>{killSwitch ? 'Kill Switch ON (Paused)' : 'Kill Switch OFF (Active)'}</span>
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={loadOverview}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* KPI Exposure & Accuracy Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <span className="text-xs font-semibold text-[var(--color-muted)] block">Unconfirmed Exposure</span>
          <div className="font-mono font-bold text-2xl text-[var(--color-warning)] mt-1">
            ${totalUnconfirmedUsd} USD
          </div>
          <span className="text-xs text-[var(--color-muted)]">{unconfirmedCount} awaiting settlement check</span>
        </Card>

        <Card>
          <span className="text-xs font-semibold text-[var(--color-muted)] block">Overdue Window</span>
          <div className="font-mono font-bold text-2xl text-[var(--color-danger)] mt-1">
            {overdueCount}
          </div>
          <span className="text-xs text-[var(--color-muted)]">Past {caps.confirmWindowHours}h confirmation window</span>
        </Card>

        <Card>
          <span className="text-xs font-semibold text-[var(--color-muted)] block">False Positives (Fraud)</span>
          <div className="font-mono font-bold text-2xl text-[var(--color-text)] mt-1">
            {overview?.counters?.falsePositives ?? 0}
          </div>
          <span className="text-xs text-[var(--color-muted)]">Owner marked Fraud</span>
        </Card>

        <Card>
          <span className="text-xs font-semibold text-[var(--color-muted)] block">False Negatives</span>
          <div className="font-mono font-bold text-2xl text-[var(--color-success)] mt-1">
            {overview?.counters?.falseNegatives ?? 0}
          </div>
          <span className="text-xs text-[var(--color-muted)]">Held/rejected but marked Fine</span>
        </Card>
      </div>

      {/* Daily & Per-Method Exposure Breakdown */}
      {(Object.keys(overview?.exposure?.byMethod || {}).length > 0 || Object.keys(overview?.exposure?.byDay || {}).length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="space-y-2">
            <h4 className="font-heading font-bold text-sm">Unconfirmed Exposure by Method</h4>
            <div className="space-y-1.5 text-xs font-mono">
              {Object.entries(overview.exposure.byMethod).map(([m, stat]: any) => (
                <div key={m} className="flex items-center justify-between py-1 border-b border-[var(--color-border)] last:border-b-0">
                  <span>{m}</span>
                  <span>{stat.count} tx · <strong>${stat.usd} USD</strong></span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-2">
            <h4 className="font-heading font-bold text-sm">Unconfirmed Exposure by Day</h4>
            <div className="space-y-1.5 text-xs font-mono">
              {Object.entries(overview.exposure.byDay).map(([day, stat]: any) => (
                <div key={day} className="flex items-center justify-between py-1 border-b border-[var(--color-border)] last:border-b-0">
                  <span>{day}</span>
                  <span>{stat.count} tx · <strong>${stat.usd} USD</strong></span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Learned Shape Library & 1-Click Tight Regex Acceptance */}
      {shapeLibrary.length > 0 && (
        <Card className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--color-accent)]" />
            <h4 className="font-heading font-bold text-sm">TrxID Shape Library (Confirmed Samples)</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {shapeLibrary.map((s: any) => (
              <div key={s.methodId} className="p-3 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-elevated)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold font-mono">{s.methodId}</span>
                  <span className="font-mono text-[var(--color-muted)]">{s.sampleCount} confirmed samples</span>
                </div>
                {s.suggestedRegex ? (
                  <div className="space-y-2">
                    <div className="font-mono text-xs text-[var(--color-accent)] break-all">
                      Suggested tight pattern ({s.suggestedMinLen}–{s.suggestedMaxLen} chars): <strong>{s.suggestedRegex}</strong>
                    </div>
                    <Button
                      size="sm"
                      loading={acceptingMethod === s.methodId}
                      onClick={() => handleAcceptRegex(s.methodId, s.suggestedRegex)}
                    >
                      Accept Pattern
                    </Button>
                  </div>
                ) : (
                  <p className="text-[var(--color-muted)]">Collect {Math.max(0, 20 - s.sampleCount)} more confirmed payments to unlock auto-suggested strict regex.</p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Configuration: Per-Method Modes, Thresholds, Weights & Server Caps */}
      <form onSubmit={handleSaveSettings}>
        <Card className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[var(--color-accent)]" />
              <h4 className="font-heading font-bold text-base">Method Modes, Thresholds, Weights & Caps</h4>
            </div>
            <Button type="submit" loading={saving} size="sm">
              Save Configuration
            </Button>
          </div>

          {/* Per-Method Verify Mode */}
          <div className="space-y-2">
            <h5 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">Per-Method Verification Mode</h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {METHODS.map((m) => (
                <div key={m.id} className="p-3 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-elevated)] space-y-1.5">
                  <label className="block text-xs font-semibold">{m.label}</label>
                  <select
                    value={methodModes[m.id] || 'evidence_auto'}
                    onChange={(e) => setMethodModes((prev) => ({ ...prev, [m.id]: e.target.value }))}
                    className="mrs-control w-full min-h-[44px] px-3 py-2 text-xs border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
                  >
                    <option value="evidence_auto">Evidence Auto-Verify</option>
                    <option value="authoritative">Authoritative Record Only</option>
                    <option value="manual">Manual Owner Only</option>
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Payoneer / Skrill Receiver Email Matching */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Payoneer Receiver Email (Pay-To Match)</label>
              <input
                type="email"
                value={payToEmails.payoneer}
                onChange={(e) => setPayToEmails((p) => ({ ...p, payoneer: e.target.value }))}
                className="mrs-control w-full min-h-[44px] px-3 py-2 text-sm font-mono border border-[var(--color-border)] bg-[var(--color-elevated)] text-[var(--color-text)]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Skrill Receiver Email (Pay-To Match)</label>
              <input
                type="email"
                value={payToEmails.skrill}
                onChange={(e) => setPayToEmails((p) => ({ ...p, skrill: e.target.value }))}
                className="mrs-control w-full min-h-[44px] px-3 py-2 text-sm font-mono border border-[var(--color-border)] bg-[var(--color-elevated)] text-[var(--color-text)]"
              />
            </div>
          </div>

          {/* Thresholds & Server Caps */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            <div>
              <label className="block font-semibold mb-1">Auto-Verify Score</label>
              <input
                type="number"
                min={50}
                max={99}
                value={autoVerifyScore}
                onChange={(e) => setAutoVerifyScore(Number(e.target.value))}
                className="mrs-control w-full min-h-[44px] px-3 py-2 font-mono border border-[var(--color-border)] bg-[var(--color-elevated)]"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Retry 2nd-Proof Min</label>
              <input
                type="number"
                min={20}
                max={90}
                value={retryScore}
                onChange={(e) => setRetryScore(Number(e.target.value))}
                className="mrs-control w-full min-h-[44px] px-3 py-2 font-mono border border-[var(--color-border)] bg-[var(--color-elevated)]"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">New Client Cap ($)</label>
              <input
                type="number"
                min={1}
                value={caps.newClientFirstOrderUsd}
                onChange={(e) => setCaps((c) => ({ ...c, newClientFirstOrderUsd: Number(e.target.value) }))}
                className="mrs-control w-full min-h-[44px] px-3 py-2 font-mono border border-[var(--color-border)] bg-[var(--color-elevated)]"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Trusted Cap ($)</label>
              <input
                type="number"
                min={1}
                value={caps.trustedClientOrderUsd}
                onChange={(e) => setCaps((c) => ({ ...c, trustedClientOrderUsd: Number(e.target.value) }))}
                className="mrs-control w-full min-h-[44px] px-3 py-2 font-mono border border-[var(--color-border)] bg-[var(--color-elevated)]"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Daily Total Cap ($)</label>
              <input
                type="number"
                min={1}
                value={caps.dailyTotalUsd}
                onChange={(e) => setCaps((c) => ({ ...c, dailyTotalUsd: Number(e.target.value) }))}
                className="mrs-control w-full min-h-[44px] px-3 py-2 font-mono border border-[var(--color-border)] bg-[var(--color-elevated)]"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Confirm Window (h)</label>
              <input
                type="number"
                min={1}
                value={caps.confirmWindowHours}
                onChange={(e) => setCaps((c) => ({ ...c, confirmWindowHours: Number(e.target.value) }))}
                className="mrs-control w-full min-h-[44px] px-3 py-2 font-mono border border-[var(--color-border)] bg-[var(--color-elevated)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-semibold mb-1">Daily Per-Method Cap ($)</label>
              <input
                type="number"
                min={1}
                value={caps.dailyPerMethodUsd}
                onChange={(e) => setCaps((c) => ({ ...c, dailyPerMethodUsd: Number(e.target.value) }))}
                className="mrs-control w-full min-h-[44px] px-3 py-2 font-mono border border-[var(--color-border)] bg-[var(--color-elevated)]"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Overdue Unconfirmed Policy</label>
              <select
                value={caps.onUnconfirmed}
                onChange={(e) => setCaps((c) => ({ ...c, onUnconfirmed: e.target.value }))}
                className="mrs-control w-full min-h-[44px] px-3 py-2 border border-[var(--color-border)] bg-[var(--color-elevated)]"
              >
                <option value="alert_only">Alert Only + Pause Client Auto-Verify</option>
                <option value="suspend_pass">Suspend Pass Until Confirmed</option>
                <option value="void_code">Void Activation Code Until Confirmed</option>
              </select>
            </div>
            {Object.entries(weights).map(([wk, wv]) => (
              <div key={wk}>
                <label className="block font-semibold mb-1">Weight: {wk}</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={wv}
                  onChange={(e) => setWeights((w) => ({ ...w, [wk]: Number(e.target.value) }))}
                  className="mrs-control w-full min-h-[44px] px-3 py-2 font-mono border border-[var(--color-border)] bg-[var(--color-elevated)]"
                />
              </div>
            ))}
          </div>
        </Card>
      </form>

      {/* Private Reference Samples Manager (§3 Check 3) */}
      <Card className="space-y-4">
        <div className="border-b border-[var(--color-border)] pb-3">
          <h4 className="font-heading font-bold text-base">Private Reference Samples (Genuine App Screenshots)</h4>
          <p className="text-xs text-[var(--color-muted)]">
            Store 2–5 authentic receipt samples per payment method. Backend Vision compares submitted proofs against these samples without exposing them publicly.
          </p>
        </div>

        <form onSubmit={handleUploadReferenceSample} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end text-xs">
          <div>
            <label className="block font-semibold mb-1">Method</label>
            <select
              value={refMethodId}
              onChange={(e) => setRefMethodId(e.target.value)}
              className="mrs-control w-full min-h-[44px] px-3 py-2 border border-[var(--color-border)] bg-[var(--color-elevated)]"
            >
              {METHODS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">Sample Label</label>
            <input
              type="text"
              value={refLabel}
              onChange={(e) => setRefLabel(e.target.value)}
              placeholder="e.g. bKash iOS dark layout"
              className="mrs-control w-full min-h-[44px] px-3 py-2 border border-[var(--color-border)] bg-[var(--color-elevated)]"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Sample Image (PNG/JPG/WEBP)</label>
            <label className="mrs-control w-full min-h-[44px] px-3 py-2 border border-dashed border-[var(--color-border)] bg-[var(--color-elevated)] flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
              <span className="truncate font-mono">{refFileName || 'Choose image...'}</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setRefFileName(file.name);
                  const r = new FileReader();
                  r.onload = () => setRefBase64(r.result as string);
                  r.readAsDataURL(file);
                }}
              />
            </label>
          </div>
          <Button type="submit" disabled={!refBase64} loading={uploadingRef} size="md">
            Add Sample
          </Button>
        </form>

        {refSamples.length === 0 ? (
          <p className="text-xs text-[var(--color-muted)]">No reference samples uploaded yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
            {refSamples.map((s: any) => (
              <div key={s.id} className="p-3 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-elevated)] flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-mono font-bold text-[var(--color-accent)]">{s.methodId}</div>
                  <div className="truncate text-[var(--color-text)]">{s.label}</div>
                  <div className="font-mono text-[11px] text-[var(--color-muted)]">{s.sha256?.slice(0, 12)}...</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteSample(s.id)}
                  className="min-h-[40px] min-w-[40px] rounded-[10px] border border-[var(--color-border)] hover:border-[var(--color-danger)] text-[var(--color-muted)] hover:text-[var(--color-danger)] flex items-center justify-center shrink-0"
                  aria-label="Delete sample"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Decision Log & Owner Confirmation / Fraud Triage (§7) */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3">
          <div>
            <h4 className="font-heading font-bold text-base">Decision Log (Typed vs Extracted Comparison)</h4>
            <p className="text-xs text-[var(--color-muted)]">
              Inspect AI extraction vs client submission side-by-side and confirm, flag Fraud (halves caps + raises score threshold), or mark Fine.
            </p>
          </div>
          <span className="font-mono text-xs text-[var(--color-muted)]">{decisionLog.length} records</span>
        </div>

        {decisionLog.length === 0 ? (
          <StateDisplay type="empty" title="No Payment Decisions Yet" description="Submitted payment proofs will appear here with full score breakdowns and comparison views." />
        ) : (
          <div className="space-y-3">
            {decisionLog.map((row: any) => {
              const isExpanded = expandedRow === row.id;
              const tone =
                row.status === 'verified'
                  ? 'success'
                  : row.status === 'rejected'
                  ? 'danger'
                  : 'warning';
              const confTone =
                row.confirmationState === 'confirmed'
                  ? 'success'
                  : row.confirmationState === 'fraud' || row.confirmationState === 'unconfirmed_overdue'
                  ? 'danger'
                  : 'warning';

              return (
                <div
                  key={row.id}
                  className="p-4 rounded-[12px] border border-[var(--color-border)] bg-[var(--color-elevated)] space-y-3"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-bold text-sm text-[var(--color-accent)]">{row.id}</span>
                        <Badge tone={tone} label={row.status} />
                        <Badge tone={confTone} label={row.confirmationState || 'n/a'} />
                        {row.aiConfidence !== null && (
                          <span className="font-mono text-xs font-bold text-[var(--color-text)]">
                            Score: {row.aiConfidence}/100
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[var(--color-muted)] font-mono flex flex-wrap gap-x-3 gap-y-1">
                        <span>Client: {row.clientId}</span>
                        <span>Method: {row.methodId}</span>
                        <span>Order: {row.orderId}</span>
                        <span>
                          {new Date(row.createdAt).toLocaleString('en-GB', {
                            timeZone: 'Asia/Dhaka',
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Owner Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setExpandedRow(isExpanded ? null : row.id)}
                      >
                        <span>{isExpanded ? 'Hide Details' : 'Compare Fields'}</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="primary"
                        loading={classifyingId === row.id}
                        onClick={() => handleClassify(row.id, 'confirmed')}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirmed</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        loading={classifyingId === row.id}
                        onClick={() => handleClassify(row.id, 'fraud')}
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Fraud</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={classifyingId === row.id}
                        onClick={() => handleClassify(row.id, 'fine')}
                      >
                        <span>Fine</span>
                      </Button>
                    </div>
                  </div>

                  {/* Decision Reason & Anomalies */}
                  {(row.decisionReason || row.capBlockedReason || (row.anomalies && row.anomalies.length > 0)) && (
                    <div className="text-xs text-[var(--color-muted)] space-y-1">
                      {row.decisionReason && <p><strong className="text-[var(--color-text)]">Reason:</strong> {row.decisionReason}</p>}
                      {row.capBlockedReason && <p className="text-[var(--color-warning)]">Cap hold: {row.capBlockedReason}</p>}
                      {Array.isArray(row.anomalies) && row.anomalies.length > 0 && (
                        <p className="text-[var(--color-danger)]">Anomalies: {row.anomalies.join(' · ')}</p>
                      )}
                    </div>
                  )}

                  {/* Expanded Side-by-Side Comparison + Score Breakdown */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-[var(--color-border)] grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                      <div className="p-3 rounded-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
                        <div className="font-bold text-[var(--color-accent)] uppercase">Client Typed</div>
                        <div>TrxID: {row.typed?.transactionId}</div>
                        <div>Amount: {row.typed?.amount} {row.typed?.currency}</div>
                        <div>Sender: {row.typed?.senderMask}</div>
                        <div>PaidAt: {row.typed?.paidAt}</div>
                      </div>

                      <div className="p-3 rounded-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
                        <div className="font-bold text-[var(--color-accent)] uppercase">AI Extracted</div>
                        {row.extracted ? (
                          <>
                            <div>TrxID: {row.extracted.trxId || '—'}</div>
                            <div>Amount: {row.extracted.amount ?? '—'} {row.extracted.currency || ''}</div>
                            <div>Receiver: {row.extracted.receiverAccount || '—'}</div>
                            <div>Status: {row.extracted.status || '—'}</div>
                            <div>Genuine Screen: {row.extracted.looksLikeGenuineAppScreen ?? '—'}/100</div>
                            <div>Ref Match: {row.extracted.matchesReferenceStyle ?? '—'}/100</div>
                          </>
                        ) : (
                          <div className="text-[var(--color-muted)]">No OCR extraction recorded.</div>
                        )}
                      </div>

                      <div className="p-3 rounded-[10px] bg-[var(--color-surface)] border border-[var(--color-border)] space-y-1">
                        <div className="font-bold text-[var(--color-accent)] uppercase">Weighted Breakdown</div>
                        {row.scoreBreakdown ? (
                          <>
                            <div>Trx Format: {row.scoreBreakdown.trxIdFormat}</div>
                            <div>Field Match: {row.scoreBreakdown.fieldMatch}</div>
                            <div>Genuine UI: {row.scoreBreakdown.looksGenuine}</div>
                            <div>Ref Style: {row.scoreBreakdown.matchesReference}</div>
                            <div>Time Plausible: {row.scoreBreakdown.timePlausible}</div>
                            <div>History Clean: {row.scoreBreakdown.historyClean}</div>
                            <div className="font-bold pt-1 border-t border-[var(--color-border)]">Total: {row.scoreBreakdown.total}/100</div>
                          </>
                        ) : (
                          <div className="text-[var(--color-muted)]">Authoritative / legacy check</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
