import React, { useState, useEffect } from 'react';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Server,
  Layers,
  ExternalLink,
} from 'lucide-react';
import { testSupabaseConnection, SUPABASE_SQL_SCHEMA } from '../services/supabaseService';

export const SupabaseConsole: React.FC = () => {
  const [status, setStatus] = useState<any | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string; latencyMs: number } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/admin/supabase/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (e) {
      console.warn('Could not fetch Supabase status:', e);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleTestConnection = async () => {
    setTesting(true);
    try {
      const res = await testSupabaseConnection();
      setTestResult(res);
    } finally {
      setTesting(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-[#0D1526] border border-cyan-500/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="font-heading font-bold text-lg text-white">Supabase PostgreSQL Architecture</h3>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                status?.configured
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}>
                {status?.configured ? 'CONNECTED' : 'STANDBY READY'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Dual-persistence layer: Primary Firestore state engine with PostgreSQL schema replication and Row-Level Security (RLS).
            </p>
          </div>
        </div>

        <button
          onClick={handleTestConnection}
          disabled={testing}
          className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-md shrink-0 self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
          <span>{testing ? 'Testing...' : 'Test Supabase Ping'}</span>
        </button>
      </div>

      {/* Ping Results Banner */}
      {testResult && (
        <div className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
          testResult.ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        }`}>
          {testResult.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
          <div>
            <span className="font-bold block">{testResult.ok ? 'Ping Successful' : 'Notice'}</span>
            <span className="text-[11px] leading-relaxed">{testResult.message}</span>
            {testResult.latencyMs > 0 && <span className="text-[10px] font-mono block mt-1">Roundtrip Latency: {testResult.latencyMs} ms</span>}
          </div>
        </div>
      )}

      {/* PostgreSQL Table Specifications */}
      <div className="space-y-3">
        <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold block">
          Replicated Supabase PostgreSQL Tables (RLS Enabled)
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs">
          <div className="p-4 rounded-xl bg-[#0D1526] border border-slate-800 space-y-1">
            <span className="text-emerald-400 font-bold block">mrs_orders</span>
            <span className="text-[11px] text-slate-400 block font-sans">Full lifecycle state machine, intake specs & revisions</span>
            <span className="text-[10px] text-slate-500">RLS: Client read self / Owner all</span>
          </div>

          <div className="p-4 rounded-xl bg-[#0D1526] border border-slate-800 space-y-1">
            <span className="text-cyan-400 font-bold block">mrs_invoices</span>
            <span className="text-[11px] text-slate-400 block font-sans">USD & BDT snapshots with reference code matching</span>
            <span className="text-[10px] text-slate-500">RLS: Immutable snapshots</span>
          </div>

          <div className="p-4 rounded-xl bg-[#0D1526] border border-slate-800 space-y-1">
            <span className="text-amber-400 font-bold block">mrs_payments</span>
            <span className="text-[11px] text-slate-400 block font-sans">Normalized TrxIDs, check results & evidence files</span>
            <span className="text-[10px] text-slate-500">RLS: Tamper-proof logs</span>
          </div>

          <div className="p-4 rounded-xl bg-[#0D1526] border border-slate-800 space-y-1">
            <span className="text-purple-400 font-bold block">mrs_clients</span>
            <span className="text-[11px] text-slate-400 block font-sans">Hashed 6-digit PIN credentials & lockout timestamps</span>
            <span className="text-[10px] text-slate-500">RLS: Strict authentication</span>
          </div>

          <div className="p-4 rounded-xl bg-[#0D1526] border border-slate-800 space-y-1">
            <span className="text-rose-400 font-bold block">mrs_deliverables</span>
            <span className="text-[11px] text-slate-400 block font-sans">Watermarked previews & final unwatermarked assets</span>
            <span className="text-[10px] text-slate-500">RLS: HTTP 402 lock enforcement</span>
          </div>

          <div className="p-4 rounded-xl bg-[#0D1526] border border-slate-800 space-y-1">
            <span className="text-teal-400 font-bold block">mrs_audit_logs</span>
            <span className="text-[11px] text-slate-400 block font-sans">Immutable audit trail with IP address and action timestamps</span>
            <span className="text-[10px] text-slate-500">RLS: Append-only ledger</span>
          </div>
        </div>
      </div>

      {/* SQL Migration Script Copy Box */}
      <div className="p-5 rounded-2xl bg-[#0D1526] border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-heading font-bold text-sm text-white">Supabase SQL Editor DDL Migration</h4>
            <p className="text-xs text-slate-400">Run this in your Supabase SQL editor to create all tables and RLS security policies.</p>
          </div>
          <button
            onClick={handleCopySql}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{copiedSql ? 'Copied' : 'Copy SQL'}</span>
          </button>
        </div>

        <pre className="p-4 rounded-xl bg-slate-950 font-mono text-[11px] text-cyan-300/90 border border-slate-800 max-h-56 overflow-y-auto leading-relaxed">
          {SUPABASE_SQL_SCHEMA}
        </pre>
      </div>
    </div>
  );
};
