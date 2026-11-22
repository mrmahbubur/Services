import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  Circle,
  ShieldCheck,
  RefreshCw,
  ChevronRight,
  Info,
  Activity,
} from 'lucide-react';
import { INITIAL_GO_LIVE_CHECKS } from '../services/camelliaService';
import { GoLiveCheckItem } from '../types/camellia';
import { useApp } from '../context/AppContext';

export const GoLiveGate: React.FC = () => {
  const { showToast } = useApp();
  const [checks, setChecks] = useState<GoLiveCheckItem[]>(INITIAL_GO_LIVE_CHECKS);
  const [loading, setLoading] = useState(false);
  const [selfTestStatus, setSelfTestStatus] = useState<{ ok: boolean; checks: { id: string; ok: boolean; detail: string }[] } | null>(null);

  const loadChecks = useCallback(async () => {
    setLoading(true);
    try {
      const [stateRes, testRes] = await Promise.all([
        fetch('/api/admin/camellia/state'),
        fetch('/api/admin/selftest'),
      ]);
      if (stateRes.ok) {
        const data = await stateRes.json();
        if (Array.isArray(data.goLiveChecks) && data.goLiveChecks.length > 0) {
          setChecks(data.goLiveChecks);
        }
      }
      if (testRes.ok) {
        const testData = await testRes.json();
        setSelfTestStatus(testData);
      }
    } catch {
      // Leave initial checks visible until server responds
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChecks();
  }, [loadChecks]);

  const verifiedCount = checks.filter((c) => c.verified).length;
  const allVerified = checks.length > 0 && verifiedCount === checks.length;

  const toggleCheck = async (item: GoLiveCheckItem) => {
    const nextVerified = !item.verified;
    try {
      const res = await fetch(`/api/admin/camellia/go-live/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified: nextVerified }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast('Save Failed', data.error || 'Could not persist go-live check.', 'error');
        return;
      }
      setChecks((prev) => prev.map((c) => (c.id === item.id ? data.check : c)));
      showToast('Checklist Updated', `${item.id} marked ${nextVerified ? 'verified' : 'pending'} on server.`, 'info');
    } catch (err: any) {
      showToast('Network Error', err?.message || 'Failed to save checklist item.', 'error');
    }
  };

  const handleRunLiveDiagnostic = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/selftest?live=1');
      const data = await res.json().catch(() => ({}));
      setSelfTestStatus(data);
      showToast(
        data.ok ? 'All Live Checks Passed' : 'Diagnostic Complete',
        data.ok ? 'Firestore, Gemini API, and ingestion bridges are operational.' : 'Review incomplete server probes below.',
        data.ok ? 'success' : 'warning'
      );
    } catch (err: any) {
      showToast('Diagnostic Error', err?.message || 'Could not run server self-test.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${allVerified ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono">
                Production Go-Live Readiness Gate
              </h2>
              <p className="text-xs text-slate-400">
                100% live production environment · Zero sandbox or simulated execution modes
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
          <div className="text-right font-mono text-xs">
            <span className="text-slate-400">Gate Verification: </span>
            <span className={`font-bold ${allVerified ? 'text-emerald-400' : 'text-amber-400'}`}>
              {verifiedCount} / {checks.length} ({checks.length ? Math.round((verifiedCount / checks.length) * 100) : 0}%)
            </span>
          </div>

          <button
            type="button"
            onClick={handleRunLiveDiagnostic}
            disabled={loading}
            className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 flex items-center gap-2 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Run Live Self-Test</span>
          </button>
        </div>
      </div>

      {/* Mode Status Bar */}
      <div className="p-4 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-2 font-mono bg-emerald-500/10 border-emerald-500/30 text-emerald-300">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" />
          <span>
            Current Mode: <strong>LIVE PRODUCTION ONLY</strong>
          </span>
        </div>
        <span className="text-[11px] opacity-85">
          Real orders, real ledger matching, and persistent Firestore state active
        </span>
      </div>

      {/* Live Infrastructure Self-Test Matrix */}
      {selfTestStatus?.checks && (
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5 text-xs">
          <div className="flex items-center gap-2 font-mono font-bold text-slate-200">
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Live Server Probe Diagnostics</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 font-mono text-[11px]">
            {selfTestStatus.checks.map((c) => (
              <div
                key={c.id}
                className={`p-2.5 rounded-lg border ${
                  c.ok ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300' : 'border-amber-500/30 bg-amber-500/5 text-amber-300'
                }`}
              >
                <div className="font-bold uppercase">{c.id}: {c.ok ? 'PASS' : 'PENDING'}</div>
                <div className="text-slate-400 text-[10px] mt-0.5">{c.detail}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Checklist Items */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl divide-y divide-slate-800 overflow-hidden">
        {checks.map((item) => (
          <div
            key={item.id}
            onClick={() => toggleCheck(item)}
            className="p-4 sm:p-5 flex items-start justify-between gap-4 cursor-pointer hover:bg-slate-850/60 transition-colors"
          >
            <div className="flex items-start gap-3.5">
              <div className="mt-0.5">
                {item.verified ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-600 hover:text-slate-400 shrink-0" />
                )}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[11px] font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded">
                    {item.id}
                  </span>
                  <span className={`text-sm font-bold ${item.verified ? 'text-white' : 'text-slate-300'}`}>
                    {item.title}
                  </span>
                  <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                    {item.category}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
                {item.verified && item.verifiedAt && (
                  <div className="text-[10px] font-mono text-emerald-400/80 pt-1 flex items-center gap-2">
                    <span>Verified by {item.verifiedBy || 'Owner'}</span>
                    <span>•</span>
                    <span>{new Date(item.verifiedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="shrink-0 text-slate-500 hover:text-slate-300">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
