import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  RotateCcw,
  PauseCircle,
  PlayCircle,
  Power,
  Activity,
  Cpu,
  Database,
  GitBranch,
  RefreshCw,
  Zap,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export interface OpsHealthPayload {
  status: 'healthy' | 'degraded';
  uptimeSeconds: number;
  memoryUsageMb: number;
  databaseStatus: string;
  geminiConfigured: boolean;
  geminiModel: string;
  activeClientsCount: number;
  bridges?: Record<string, { lastSeen: string | null }>;
}

export interface OpsSettings {
  autoDeployPaused: boolean;
  tier1Frozen: boolean;
  safeModeActive: boolean;
  maintenanceModeActive: boolean;
}

export const AutonomousOperationsConsole: React.FC = () => {
  const { showToast } = useApp();

  const [opsSettings, setOpsSettings] = useState<OpsSettings>({
    autoDeployPaused: false,
    tier1Frozen: false,
    safeModeActive: false,
    maintenanceModeActive: false,
  });

  const [health, setHealth] = useState<OpsHealthPayload | null>(null);
  const [revisions, setRevisions] = useState<{ id: string; serviceId?: string; orderId?: string; notes?: string; status?: string; createdAt: string }[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [newRevisionNote, setNewRevisionNote] = useState('');

  const loadOpsHealth = useCallback(async () => {
    setIsRefreshing(true);
    setLoadError(null);
    try {
      const res = await fetch('/api/admin/ops/health');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoadError(data.error || 'Failed to load server ops health telemetry.');
        return;
      }
      if (data.health) setHealth(data.health);
      if (data.opsSettings) setOpsSettings(data.opsSettings);
      if (Array.isArray(data.revisions)) setRevisions(data.revisions);
    } catch (err: any) {
      setLoadError(err?.message || 'Network error while fetching ops health.');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOpsHealth();
  }, [loadOpsHealth]);

  const updateOpsSwitch = async (key: keyof OpsSettings, label: string) => {
    const nextValue = !opsSettings[key];
    try {
      const res = await fetch('/api/admin/ops/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: nextValue }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast('Save Failed', data.error || `Could not update ${label}.`, 'error');
        return;
      }
      setOpsSettings(data.opsSettings);
      showToast(
        `${label} ${nextValue ? 'Activated' : 'Cleared'}`,
        `Persistent operational guard updated on server.`,
        nextValue ? 'warning' : 'success'
      );
    } catch (err: any) {
      showToast('Network Error', err?.message || 'Failed to persist ops setting.', 'error');
    }
  };

  const handleLogRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRevisionNote.trim()) return;
    try {
      const res = await fetch('/api/admin/ops/revisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: 'platform',
          orderId: 'OPS-SNAPSHOT',
          notes: newRevisionNote.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast('Checkpoint Failed', data.error || 'Could not record revision.', 'error');
        return;
      }
      setNewRevisionNote('');
      await loadOpsHealth();
      showToast('Revision Logged', `Recorded checkpoint ${data.revision?.id}`, 'success');
    } catch (err: any) {
      showToast('Error', err?.message || 'Failed to save revision.', 'error');
    }
  };

  const formatUptime = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    return `${hrs}h ${mins}m ${secs % 60}s`;
  };

  return (
    <div className="space-y-6">
      {loadError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {/* Operational Kill Switch Panel */}
      <div className="p-6 rounded-2xl border border-amber-500/30 bg-[#0F172A] space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-white">
                Operational Kill Switches & Safety Guards
              </h3>
              <p className="text-xs text-slate-400">
                Server-persisted override controls for autonomous pipelines, AI triage, and maintenance windows.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={loadOpsHealth}
            disabled={isRefreshing}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Checking...' : 'Refresh Telemetry'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          <div className={`p-4 rounded-xl border transition-all ${opsSettings.autoDeployPaused ? 'border-amber-500/50 bg-amber-500/10' : 'border-slate-800 bg-slate-900/60'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-200">Auto-Release Pipeline</span>
              <button
                type="button"
                onClick={() => updateOpsSwitch('autoDeployPaused', 'Auto-Release Pipeline')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${opsSettings.autoDeployPaused ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}
              >
                {opsSettings.autoDeployPaused ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              {opsSettings.autoDeployPaused ? 'Auto-release paused. Owner review mandatory.' : 'Standard automated fulfilment pipeline active.'}
            </p>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${opsSettings.autoDeployPaused ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
              {opsSettings.autoDeployPaused ? 'STATUS: PAUSED' : 'STATUS: ARMED'}
            </span>
          </div>

          <div className={`p-4 rounded-xl border transition-all ${opsSettings.tier1Frozen ? 'border-amber-500/50 bg-amber-500/10' : 'border-slate-800 bg-slate-900/60'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-200">Tier 1 Background Jobs</span>
              <button
                type="button"
                onClick={() => updateOpsSwitch('tier1Frozen', 'Tier 1 Background Jobs')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${opsSettings.tier1Frozen ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}
              >
                {opsSettings.tier1Frozen ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              {opsSettings.tier1Frozen ? 'Background cron workers paused.' : 'Background cron and retry jobs active.'}
            </p>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${opsSettings.tier1Frozen ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
              {opsSettings.tier1Frozen ? 'STATUS: FROZEN' : 'STATUS: ENGAGED'}
            </span>
          </div>

          <div className={`p-4 rounded-xl border transition-all ${opsSettings.safeModeActive ? 'border-rose-500/50 bg-rose-500/10' : 'border-slate-800 bg-slate-900/60'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-200">Emergency Safe Mode</span>
              <button
                type="button"
                onClick={() => updateOpsSwitch('safeModeActive', 'Emergency Safe Mode')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${opsSettings.safeModeActive ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-300'}`}
              >
                <Power className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              {opsSettings.safeModeActive ? 'AI drafting paused. Core checkout active.' : 'Gemini triage and drafting active.'}
            </p>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${opsSettings.safeModeActive ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-400'}`}>
              {opsSettings.safeModeActive ? 'STATUS: ACTIVE' : 'STATUS: NORMAL'}
            </span>
          </div>

          <div className={`p-4 rounded-xl border transition-all ${opsSettings.maintenanceModeActive ? 'border-purple-500/50 bg-purple-500/10' : 'border-slate-800 bg-slate-900/60'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-200">Maintenance Notice</span>
              <button
                type="button"
                onClick={() => updateOpsSwitch('maintenanceModeActive', 'Maintenance Notice')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${opsSettings.maintenanceModeActive ? 'bg-purple-500 text-white' : 'bg-slate-800 text-slate-300'}`}
              >
                <Power className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mb-2">
              {opsSettings.maintenanceModeActive ? 'Public maintenance notice active.' : 'Platform open to incoming orders.'}
            </p>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${opsSettings.maintenanceModeActive ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-800 text-slate-400'}`}>
              {opsSettings.maintenanceModeActive ? 'STATUS: MAINTENANCE' : 'STATUS: ONLINE'}
            </span>
          </div>
        </div>
      </div>

      {/* Live Health & Resource Telemetry */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-800 bg-[#111B2E] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Endpoint Health</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-heading font-extrabold text-white uppercase">
              {health?.status || 'Checking...'}
            </span>
            <span className="text-xs font-mono text-emerald-400 font-bold">/api/health</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Uptime: {health ? formatUptime(health.uptimeSeconds) : '—'}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-[#111B2E] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Data Persistence</span>
            <Database className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-heading font-extrabold text-white">
              {health?.databaseStatus === 'connected' ? 'Firestore' : 'In-Memory'}
            </span>
            <span className="text-xs font-mono text-cyan-400 font-bold">
              {health?.activeClientsCount ?? 0} clients
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Payment Registry: Server Locked
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-[#111B2E] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Gemini AI Engine</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-heading font-extrabold text-white">
              {health?.geminiConfigured ? 'Configured' : 'Key Missing'}
            </span>
            <span className="text-xs font-mono text-emerald-400 font-bold truncate">
              {health?.geminiModel || '—'}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Direct server-side SDK calls only
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-800 bg-[#111B2E] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold">Server Memory (RSS)</span>
            <Cpu className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-heading font-extrabold text-white">
              {health ? `${health.memoryUsageMb} MB` : '—'}
            </span>
            <span className="text-xs font-mono text-slate-400 font-bold">Live Process</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Zero simulated metrics
          </div>
        </div>
      </div>

      {/* Persistent Operations Checkpoint Log */}
      <div className="p-5 rounded-2xl border border-slate-800 bg-[#111B2E] space-y-4">
        <div>
          <h3 className="font-heading font-bold text-base text-white">
            Operational Change & Revision Log
          </h3>
          <p className="text-xs text-slate-400">
            Log and inspect verified operational checkpoints persisted to `/api/admin/ops/revisions`.
          </p>
        </div>

        <form onSubmit={handleLogRevision} className="flex flex-col sm:flex-row gap-2 text-xs">
          <input
            type="text"
            value={newRevisionNote}
            onChange={(e) => setNewRevisionNote(e.target.value)}
            placeholder="Record operational change note or release checkpoint..."
            className="flex-1 rounded-xl px-3.5 py-2 bg-slate-900 border border-slate-700 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
          />
          <button
            type="submit"
            disabled={!newRevisionNote.trim()}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Record Checkpoint</span>
          </button>
        </form>

        <div className="space-y-2">
          {revisions.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
              No operational checkpoints recorded yet.
            </div>
          ) : (
            revisions.map((rev) => (
              <div
                key={rev.id}
                className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-3">
                  <GitBranch className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-200">{rev.id}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(rev.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <span className="text-slate-400 text-[11px]">{rev.notes}</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-[11px] border border-emerald-500/30 inline-flex items-center gap-1 self-start sm:self-center">
                  <Check className="w-3.5 h-3.5" /> {rev.status || 'recorded'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
