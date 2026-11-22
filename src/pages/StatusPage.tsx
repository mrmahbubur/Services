import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  Activity,
  ArrowLeft,
  RefreshCw,
  Bell,
} from 'lucide-react';
import { CamelliaAvatar } from '../services/camelliaService';

interface LiveServiceStatus {
  id: string;
  name: string;
  status: 'operational' | 'degraded' | 'offline' | 'disabled';
  detail: string;
}

interface LiveIncident {
  id: string;
  category?: string;
  severity?: string;
  summary?: string;
  description?: string;
  status?: string;
  createdAt: string;
}

export const StatusPage: React.FC = () => {
  const { theme, showToast } = useApp();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(true);
  const [overall, setOverall] = useState<string>('loading');
  const [uptimeSeconds, setUptimeSeconds] = useState<number>(0);
  const [memoryMb, setMemoryMb] = useState<number>(0);
  const [checkedAt, setCheckedAt] = useState<string>('');
  const [services, setServices] = useState<LiveServiceStatus[]>([]);
  const [incidents, setIncidents] = useState<LiveIncident[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [subscribedEmail, setSubscribedEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeSuccess, setSubscribeSuccess] = useState(false);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/status');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Could not load system status from server.');
        return;
      }
      setOverall(data.overall || 'degraded');
      setUptimeSeconds(Number(data.uptimeSeconds || 0));
      setMemoryMb(Number(data.memoryMb || 0));
      setCheckedAt(data.checkedAt || new Date().toISOString());
      setServices(Array.isArray(data.services) ? data.services : []);
      setIncidents(Array.isArray(data.incidents) ? data.incidents : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to connect to status endpoint.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscribedEmail.trim() || subscribing) return;
    setSubscribing(true);
    try {
      const res = await fetch('/api/status/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: subscribedEmail.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast('Subscription Failed', data.error || 'Invalid email address.', 'error');
        return;
      }
      setSubscribeSuccess(true);
      showToast('Subscribed', data.message || 'Subscribed to operational notices.', 'success');
    } catch (err: any) {
      showToast('Subscription Error', err?.message || 'Network error.', 'error');
    } finally {
      setSubscribing(false);
    }
  };

  const formatUptime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const isOperational = overall === 'operational';

  return (
    <div className={`min-h-screen py-12 px-4 sm:px-6 lg:px-8 transition-colors ${isDark ? 'bg-[#0B1220] text-[#E6EDF7]' : 'bg-[#F8FAFC] text-[#0F172A]'}`}>
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Navigation & Header */}
        <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-6 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="space-y-1">
            <Link to="/" className="inline-flex items-center gap-2 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors mb-2">
              <ArrowLeft className="w-3.5 h-3.5" />
              Return to M R S Main Desk
            </Link>
            <div className="flex items-center gap-3">
              <CamelliaAvatar size={34} />
              <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                System Status & Health
              </h1>
            </div>
            <p className="text-sm text-slate-400">
              Live operational telemetry queried directly from M R S runtime health endpoints.
            </p>
          </div>

          <button
            onClick={loadStatus}
            disabled={loading}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white' : 'bg-white border-slate-200 text-slate-700 hover:text-slate-950 shadow-sm'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{checkedAt ? `Checked ${new Date(checkedAt).toLocaleTimeString()}` : 'Refreshing...'}</span>
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Global Banner */}
        <div className={`rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border ${
          isOperational
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : 'bg-amber-500/10 border-amber-500/30'
        }`}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${
              isOperational
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
            }`}>
              {isOperational ? <CheckCircle2 className="w-7 h-7" /> : <AlertCircle className="w-7 h-7" />}
            </div>
            <div>
              <div className={`text-lg font-bold font-mono ${
                isOperational
                  ? isDark ? 'text-emerald-300' : 'text-emerald-800'
                  : isDark ? 'text-amber-300' : 'text-amber-800'
              }`}>
                {loading ? 'Querying Live Telemetry...' : isOperational ? 'All Core Systems Operational' : 'Degraded / Pending External Configuration'}
              </div>
              <div className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Inspect component statuses below for Firestore persistence, Gemini AI, and payment ingestion bridges.
              </div>
            </div>
          </div>

          <div className={`flex items-center gap-6 text-left sm:text-right font-mono text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            <div>
              <div className="text-slate-500 text-[10px] uppercase tracking-wider">Process Uptime</div>
              <div className="text-cyan-500 font-bold text-sm">{formatUptime(uptimeSeconds)}</div>
            </div>
            <div>
              <div className="text-slate-500 text-[10px] uppercase tracking-wider">Memory RSS</div>
              <div className="text-emerald-500 font-bold text-sm">{memoryMb} MB</div>
            </div>
          </div>
        </div>

        {/* Services Table */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            Live Infrastructure & Connectors
          </h2>

          <div className={`border rounded-2xl overflow-hidden divide-y transition-colors ${
            isDark ? 'bg-[#111B2E] border-[#22314D] divide-slate-800' : 'bg-white border-slate-200 divide-slate-100 shadow-sm'
          }`}>
            {services.map((svc) => (
              <div key={svc.id} className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                isDark ? 'hover:bg-slate-900/60' : 'hover:bg-slate-50'
              }`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      svc.status === 'operational'
                        ? 'bg-emerald-400'
                        : svc.status === 'degraded'
                        ? 'bg-amber-400'
                        : 'bg-slate-500'
                    }`} />
                    <span className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{svc.name}</span>
                  </div>
                  <p className="text-xs text-slate-400 pl-5">{svc.detail}</p>
                </div>

                <span className={`px-2.5 py-1 rounded-full border text-[11px] font-medium uppercase font-mono self-start sm:self-auto ${
                  svc.status === 'operational'
                    ? isDark ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : svc.status === 'degraded'
                    ? isDark ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'
                    : isDark ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-600'
                }`}>
                  {svc.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Real Incident History */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            Recorded Incidents ({incidents.length})
          </h2>

          {incidents.length === 0 ? (
            <div className={`border rounded-2xl p-6 text-xs text-slate-400 ${
              isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200'
            }`}>
              Zero operational incidents recorded in database.
            </div>
          ) : (
            <div className="space-y-3">
              {incidents.map((inc) => (
                <div key={inc.id} className={`border rounded-2xl p-5 space-y-2 transition-colors ${
                  isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200 shadow-sm'
                }`}>
                  <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 ${
                    isDark ? 'border-slate-800' : 'border-slate-200'
                  }`}>
                    <div>
                      <span className="text-xs font-mono text-cyan-400 font-medium">{inc.id}</span>
                      <h3 className={`text-sm font-bold mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {inc.summary || 'Operational Notice'}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-slate-400">{new Date(inc.createdAt).toLocaleString()}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 text-[10px] font-bold uppercase">
                        {inc.status || 'open'}
                      </span>
                    </div>
                  </div>
                  {inc.description && (
                    <p className={`text-xs leading-relaxed pt-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      {inc.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notification Subscription */}
        <div className={`border rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 ${
          isDark
            ? 'bg-gradient-to-r from-slate-900 via-slate-900 to-slate-850 border-slate-800'
            : 'bg-white border-slate-200 shadow-sm'
        }`}>
          <div className="space-y-1">
            <div className={`flex items-center gap-2 text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <Bell className="w-4 h-4 text-pink-500" />
              Subscribe to System Incident Updates
            </div>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Receive automated status alerts if any pipeline or payment connector degrades.
            </p>
          </div>

          {subscribeSuccess ? (
            <div className={`text-xs font-mono border px-4 py-2.5 rounded-xl flex items-center gap-2 ${
              isDark ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-emerald-800 bg-emerald-50 border-emerald-200'
            }`}>
              <CheckCircle2 className="w-4 h-4" />
              Subscribed! Your email is registered in Firestore/status subscribers.
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
              <input
                type="email"
                placeholder="you@domain.com"
                value={subscribedEmail}
                onChange={(e) => setSubscribedEmail(e.target.value)}
                required
                className={`border rounded-xl px-3.5 py-2 text-xs placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-full sm:w-64 ${
                  isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
              <button
                type="submit"
                disabled={subscribing}
                className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs whitespace-nowrap transition-colors min-h-[40px]"
              >
                {subscribing ? 'Saving...' : 'Subscribe'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
