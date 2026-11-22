import React, { useState, useEffect } from 'react';
import {
  Layers,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  Shield,
  FileCode,
  Zap,
  Info,
} from 'lucide-react';

interface Context7Dimension {
  dimensionNumber: number;
  id: string;
  title: string;
  summary: string;
  status: 'active' | 'enforced' | 'synced';
  attributes: Record<string, any>;
  lastValidated: string;
}

interface Context7Manifest {
  version: string;
  systemName: string;
  framework: string;
  dimensions: Context7Dimension[];
  runtimeGroundingPrompt: string;
  generatedAt: string;
}

export const Context7Console: React.FC = () => {
  const [manifest, setManifest] = useState<Context7Manifest | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [selectedDimension, setSelectedDimension] = useState<number>(1);

  const fetchManifest = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/context7/manifest');
      if (res.ok) {
        const data = await res.json();
        setManifest(data);
      }
    } catch (e) {
      console.warn('Failed to load Context7 manifest:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManifest();
  }, []);

  const handleCopyPrompt = () => {
    if (manifest?.runtimeGroundingPrompt) {
      navigator.clipboard.writeText(manifest.runtimeGroundingPrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    }
  };

  const activeDim = manifest?.dimensions.find((d) => d.dimensionNumber === selectedDimension) || manifest?.dimensions[0];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="p-5 rounded-2xl bg-[#0D1526] border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-5 h-5 text-cyan-400" />
            <h3 className="font-heading font-bold text-lg text-white">Context7 Operational Grounding Framework</h3>
          </div>
          <p className="text-xs text-slate-400">
            Authoritative 7-dimension knowledge, rules, and security context synchronized across Camellia AI and backend engines.
          </p>
        </div>

        <button
          onClick={fetchManifest}
          disabled={loading}
          className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-colors self-start sm:self-auto shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
          <span>Sync Context7</span>
        </button>
      </div>

      {/* 7 Dimensions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 7 Dimension Selectors (5 cols) */}
        <div className="lg:col-span-5 space-y-2">
          {manifest?.dimensions.map((dim) => {
            const isSelected = dim.dimensionNumber === selectedDimension;
            return (
              <button
                key={dim.id}
                onClick={() => setSelectedDimension(dim.dimensionNumber)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-cyan-500/10 border-cyan-500/40 text-white shadow-sm'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-cyan-400">
                      0{dim.dimensionNumber}
                    </span>
                    <span className="font-semibold text-xs text-slate-200">{dim.title}</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wide">
                    {dim.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1">{dim.summary}</p>
              </button>
            );
          })}
        </div>

        {/* Right Column: Dimension Details & JSON Attributes (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {activeDim && (
            <div className="p-5 rounded-2xl bg-[#0D1526] border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-cyan-400">
                      Dimension {activeDim.dimensionNumber}
                    </span>
                    <span className="text-slate-600">·</span>
                    <h4 className="font-heading font-bold text-base text-white">{activeDim.title}</h4>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{activeDim.summary}</p>
                </div>
                <div className="text-right text-[10px] font-mono text-slate-500 shrink-0">
                  <span>Validated: </span>
                  <span className="text-slate-400">{new Date(activeDim.lastValidated).toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Attributes Inspector */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-semibold">
                  Live Enforced Attributes (Dimension Manifest)
                </span>
                <pre className="p-4 rounded-xl bg-slate-950 font-mono text-[11px] text-cyan-300/90 border border-slate-800 overflow-x-auto max-h-64 overflow-y-auto leading-relaxed">
                  {JSON.stringify(activeDim.attributes, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Runtime Grounding Prompt */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>Camellia Runtime Grounding Prompt</span>
              </span>
              <button
                onClick={handleCopyPrompt}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1 transition-colors"
              >
                {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
                <span>{copiedPrompt ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 font-mono whitespace-pre-wrap bg-slate-950 p-3 rounded-lg border border-slate-850">
              {manifest?.runtimeGroundingPrompt}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
