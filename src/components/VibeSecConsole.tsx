import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Key,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
} from 'lucide-react';

type AuditStatus = 'pass' | 'warn' | 'fail';

interface VibeSecAuditResult {
  score: number;
  grade: string;
  timestamp: string;
  checks: {
    id: string;
    name: string;
    category: string;
    status: AuditStatus;
    detail: string;
  }[];
  recommendations: string[];
}

function getGradeBadgeStyle(grade?: string): string {
  switch (grade) {
    case 'A+':
    case 'A':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    case 'B':
    case 'C':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    case 'F':
      return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
    default:
      return 'bg-slate-800 text-slate-300 border-slate-700';
  }
}

function getScoreTextStyle(score?: number): string {
  if (typeof score !== 'number') return 'text-slate-400';
  if (score >= 85) return 'text-cyan-400';
  if (score >= 65) return 'text-amber-400';
  return 'text-rose-400';
}

const AUDIT_STATUS_VISUALS: Record<
  AuditStatus,
  {
    cardClass: string;
    badgeClass: string;
    HeaderIcon: React.FC<{ className?: string }>;
    headerIconClass: string;
    BadgeIcon: React.FC<{ className?: string }>;
  }
> = {
  pass: {
    cardClass: 'bg-[#0D1526]/80 border-slate-800',
    badgeClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    HeaderIcon: CheckCircle2,
    headerIconClass: 'w-4 h-4 text-emerald-400 shrink-0 mt-0.5',
    BadgeIcon: CheckCircle2,
  },
  warn: {
    cardClass: 'bg-amber-500/10 border-amber-500/30',
    badgeClass: 'text-amber-300 bg-amber-500/10 border-amber-500/30',
    HeaderIcon: AlertTriangle,
    headerIconClass: 'w-4 h-4 text-amber-400 shrink-0 mt-0.5',
    BadgeIcon: AlertTriangle,
  },
  fail: {
    cardClass: 'bg-rose-500/10 border-rose-500/30',
    badgeClass: 'text-rose-300 bg-rose-500/10 border-rose-500/30',
    HeaderIcon: XCircle,
    headerIconClass: 'w-4 h-4 text-rose-400 shrink-0 mt-0.5',
    BadgeIcon: ShieldAlert,
  },
};

export const VibeSecConsole: React.FC = () => {
  const [audit, setAudit] = useState<VibeSecAuditResult | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAudit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/vibesec/audit');
      if (res.ok) {
        const data = await res.json();
        setAudit(data);
      }
    } catch (e) {
      console.warn('Failed to load VibeSec audit:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudit();
  }, []);

  const passCount = audit?.checks.filter((c) => c.status === 'pass').length ?? 0;
  const warnCount = audit?.checks.filter((c) => c.status === 'warn').length ?? 0;
  const failCount = audit?.checks.filter((c) => c.status === 'fail').length ?? 0;

  return (
    <div className="space-y-6">
      {/* Top Banner with Score */}
      <div className="p-6 rounded-2xl bg-[#0D1526] border border-cyan-500/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-heading font-bold text-lg text-white">VibeSec Cryptographic & Runtime Hardening</h3>
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${getGradeBadgeStyle(audit?.grade)}`}>
                Grade: {audit?.grade || '...'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Zero client secrets, ephemeral runtime HMAC-SHA256 session keys, locked Firestore security rules, and Partitioned / SameSite=None HTTPS cookies.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 self-start md:self-auto shrink-0">
          <div className="text-right">
            <span className="text-[10px] font-mono text-slate-500 block uppercase">VibeSec Posture Score</span>
            <span className={`font-heading font-black text-2xl ${getScoreTextStyle(audit?.score)}`}>
              {audit ? `${audit.score} / 100` : '-- / 100'}
            </span>
          </div>
          <button
            onClick={fetchAudit}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
            <span>Re-Audit</span>
          </button>
        </div>
      </div>

      {/* Itemized Audit Checks */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
            Live Security Posture Checks ({audit?.checks.length || 0})
          </span>
          {audit && (
            <div className="flex items-center gap-2 text-[11px] font-mono">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" /> {passCount} Pass
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                <AlertTriangle className="w-3 h-3" /> {warnCount} Warn
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                <XCircle className="w-3 h-3" /> {failCount} Fail
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {audit?.checks.map((check) => {
            const visuals = AUDIT_STATUS_VISUALS[check.status] || AUDIT_STATUS_VISUALS.fail;
            const { HeaderIcon, BadgeIcon } = visuals;
            return (
              <div
                key={check.id}
                className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${visuals.cardClass}`}
              >
                <div className="flex items-start gap-3">
                  <HeaderIcon className={visuals.headerIconClass} />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-slate-200">{check.name}</span>
                      <span className="text-[10px] font-mono text-slate-500 uppercase">[{check.id}]</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{check.detail}</p>
                  </div>
                </div>

                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded border shrink-0 uppercase ${visuals.badgeClass}`}
                >
                  <BadgeIcon className="w-3 h-3" />
                  <span>{check.status}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommendations & Invariants */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2 text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-2">
            <Key className="w-3.5 h-3.5 text-cyan-400" />
            <span>Session Keys & Cookie Policy</span>
          </span>
          <ul className="space-y-1.5 text-slate-400 list-disc list-inside text-[11px] leading-relaxed">
            <li>
              <strong className="text-slate-300">Ephemeral Signing Keys:</strong> Session tokens are signed in server memory with a fresh 256-bit key (`crypto.randomBytes(32)`) and verified in constant time via HMAC-SHA256—no static `MRS_SESSION_SECRET` required.
            </li>
            <li>
              <strong className="text-slate-300">HTTPS &amp; Partitioned Cookies:</strong> Auth cookies emit `HttpOnly; Secure; SameSite=None; Partitioned` over HTTPS / proxied requests (with `Lax` on local HTTP) and enforce same-origin `Origin` checks on cookie mutations.
            </li>
            <li>
              <strong className="text-slate-300">Owner &amp; Brute-Force Protection:</strong> Admin sign-in and first-run claim validate salted `scrypt` (`N=16384, r=8, p=1`) hashes or `MRS_ADMIN_PASSWORD` with per-IP rate limiting (`10` attempts / 15m) and 5-strike client PIN lockouts.
            </li>
          </ul>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2 text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Runtime Headers &amp; Audit Notes</span>
          </span>
          <ul className="space-y-1.5 text-slate-400 list-disc list-inside text-[11px] leading-relaxed">
            <li>HTTP headers set `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy` without restrictive `X-Frame-Options` blockers for embedded consoles.</li>
            <li>Incoming ingestion webhooks verify `X-Signature` via HMAC-SHA256 within a 300-second replay window.</li>
            {audit?.recommendations?.map((rec, i) => (
              <li key={i} className="text-cyan-300/90">
                {rec}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
