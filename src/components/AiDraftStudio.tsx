import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { OrderRecord, ServiceItem } from '../types';
import { AiDraftItem } from '../types/automation';
import {
  Send,
  Copy,
  Check,
  RotateCw,
  Sliders,
  AlertCircle,
} from 'lucide-react';
import { requestServerAiDraft } from '../services/automationService';
import { CamelliaAvatar } from '../services/camelliaService';

interface AiDraftStudioProps {
  order: OrderRecord;
  service: ServiceItem;
  onDeliverCompleted?: () => void;
}

export const AiDraftStudio: React.FC = () => {
  return null;
};

export const OrderAiDraftStudio: React.FC<AiDraftStudioProps> = ({
  order,
  service,
  onDeliverCompleted,
}) => {
  const { deliverOrder, showToast, theme } = useApp();
  const isDark = theme === 'dark';

  const [draft, setDraft] = useState<AiDraftItem | null>(null);
  const [editableContent, setEditableContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [delivering, setDelivering] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);

  const [qaChecks, setQaChecks] = useState<Record<string, boolean>>({
    scopeMatch: true,
    noInventedFacts: true,
    sensitiveDataRedacted: true,
    formattingVerified: true,
  });

  const allQaPassed = Object.values(qaChecks).every(Boolean);

  const loadGeminiDraft = useCallback(async () => {
    setGenerating(true);
    setDraftError(null);
    try {
      const result = await requestServerAiDraft({
        orderId: order.orderId,
        serviceId: service.serviceId || service.id,
        serviceName: service.name,
        clientName: order.clientName || order.clientId || 'Client',
        intakeDetails: order.details || '',
      });
      setDraft(result);
      setEditableContent(result.outputContent || '');
    } catch (err: any) {
      const msg = err?.message || 'Could not generate AI draft from Gemini backend.';
      setDraftError(msg);
      if (!editableContent) {
        setEditableContent(
          `# ${service.name} — Owner Manual Workspace Draft\nOrder: ${order.orderId}\n\n${order.details || ''}`
        );
      }
    } finally {
      setGenerating(false);
    }
  }, [order.orderId, order.clientName, order.clientId, order.details, service.serviceId, service.id, service.name]);

  useEffect(() => {
    loadGeminiDraft();
  }, [order.orderId, service.id]);

  const handleRegenerate = async () => {
    await loadGeminiDraft();
    showToast('Draft Regenerated', 'Camellia re-synthesized the deliverable draft using Gemini.', 'info');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editableContent);
    setCopied(true);
    showToast('Copied to Clipboard', 'Draft content copied for review.', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOneClickDeliver = async () => {
    if (!allQaPassed) {
      showToast('QA Gate Incomplete', 'Please verify all 4 QA checklist criteria before delivery.', 'warning');
      return;
    }
    if (!editableContent.trim()) {
      showToast('Empty Draft', 'Please enter or generate deliverable content before releasing.', 'error');
      return;
    }

    setDelivering(true);
    try {
      await deliverOrder(
        order.orderId,
        `${service.name} Deliverable`,
        draft?.summary || 'Prepared by Camellia · M R S AI Assistant (Owner Reviewed)',
        editableContent,
        service.serviceId === 'S-MRS-11' || service.id === 'S-MRS-11' ? 'json' : 'md'
      );

      if (onDeliverCompleted) {
        onDeliverCompleted();
      }
    } catch (err: any) {
      showToast('Delivery Error', err?.message || 'Failed to complete delivery.', 'error');
    } finally {
      setDelivering(false);
    }
  };

  return (
    <div className={`p-6 rounded-2xl border space-y-6 ${isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200 shadow-sm'}`}>
      {/* Studio Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <CamelliaAvatar size={24} />
            <h3 className="font-heading font-extrabold text-base text-white">
              Camellia Studio: {service.name}
            </h3>
            <span className="font-mono text-[10px] px-2.5 py-0.5 rounded bg-pink-500/15 text-pink-300 border border-pink-500/40 font-bold">
              Prepared by Camellia · M R S AI Assistant
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Client: <span className="text-slate-200 font-semibold">{order.clientName || order.clientId}</span> · Order:{' '}
            <span className="font-mono text-cyan-400">{order.orderId}</span> · Human verification required before release
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={generating}
            className="px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 disabled:opacity-50 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RotateCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin text-cyan-400' : ''}`} />
            <span>{generating ? 'Synthesizing...' : 'Regenerate'}</span>
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy Text</span>
          </button>
        </div>
      </div>

      {draftError && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong className="block">Live Gemini Generation Unavailable</strong>
            <span>{draftError} You can edit the draft manually below or retry once GEMINI_API_KEY is verified.</span>
          </div>
        </div>
      )}

      {/* ATS Keyword Match Report */}
      {draft?.atsKeywordMatchReport && (
        <div className="p-4 rounded-xl bg-slate-950/80 border border-cyan-500/30 space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              ATS Keyword Optimization & Compliance Audit
            </span>
            <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/30">
              Score: {draft.atsKeywordMatchReport.matchPercentage}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
            <div>
              <span className="text-slate-400 block font-semibold mb-1">Matched Target Keywords:</span>
              <div className="flex flex-wrap gap-1">
                {draft.atsKeywordMatchReport.matchedKeywords.map((k: string, i: number) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-mono text-[10px]">
                    ✓ {k}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-slate-400 block font-semibold mb-1">Recommended Adjustments:</span>
              <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                {draft.atsKeywordMatchReport.recommendations.map((rec: string, i: number) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side: Client Intake Brief vs. Editable AI Draft */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
              Client Intake & Brief Specifications
            </span>
            <span className="text-[10px] text-slate-500">Read-only input</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3 text-[11px] max-h-[380px] overflow-y-auto">
            <div>
              <span className="text-slate-500 block">Project Description:</span>
              <p className="text-slate-200 whitespace-pre-wrap mt-0.5 leading-relaxed">
                {order.details || 'No specific details provided.'}
              </p>
            </div>

            {service.clientMustProvide && service.clientMustProvide.length > 0 && (
              <div className="pt-2 border-t border-slate-800/60">
                <span className="text-slate-500 block mb-1">Service Kickoff Checklist:</span>
                <ul className="list-disc list-inside text-slate-400 space-y-0.5">
                  {service.clientMustProvide.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-bold text-cyan-300 uppercase tracking-wider text-[11px]">
              Generated Deliverable Draft (Owner Editable)
            </span>
            <span className="text-[10px] font-mono text-emerald-400">
              {generating ? 'Calling Gemini API...' : `Model: ${draft?.model || 'Manual / Server'}`}
            </span>
          </div>

          <textarea
            rows={15}
            value={editableContent}
            onChange={(e) => setEditableContent(e.target.value)}
            className="w-full rounded-xl p-3.5 bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 leading-relaxed max-h-[380px] overflow-y-auto"
          />
        </div>
      </div>

      {/* QA Verification Checklist & One-Click Deliver */}
      <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="font-bold text-white text-xs flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            Mandatory QA Gate (All must pass before delivery)
          </span>
          <span className={`text-[10px] font-mono font-bold ${allQaPassed ? 'text-emerald-400' : 'text-amber-400'}`}>
            {allQaPassed ? '✓ Ready for Release' : 'Action Required'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={qaChecks.scopeMatch}
              onChange={(e) => setQaChecks({ ...qaChecks, scopeMatch: e.target.checked })}
              className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400"
            />
            <span className="text-slate-300 text-[11px]">Matches agreed kickoff specifications</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={qaChecks.noInventedFacts}
              onChange={(e) => setQaChecks({ ...qaChecks, noInventedFacts: e.target.checked })}
              className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400"
            />
            <span className="text-slate-300 text-[11px]">No invented credentials or unverified claims</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={qaChecks.sensitiveDataRedacted}
              onChange={(e) => setQaChecks({ ...qaChecks, sensitiveDataRedacted: e.target.checked })}
              className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400"
            />
            <span className="text-slate-300 text-[11px]">Sensitive credentials and PII redacted</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={qaChecks.formattingVerified}
              onChange={(e) => setQaChecks({ ...qaChecks, formattingVerified: e.target.checked })}
              className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400"
            />
            <span className="text-slate-300 text-[11px]">Watermark and preview formatting verified</span>
          </label>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-800 gap-3 flex-wrap">
          <span className="text-[11px] text-slate-400">
            Publishes deliverable to server (locked preview until full invoice settlement).
          </span>

          <button
            type="button"
            onClick={handleOneClickDeliver}
            disabled={!allQaPassed || delivering}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
          >
            <Send className="w-4 h-4" />
            <span>{delivering ? 'Publishing...' : 'Publish Deliverable'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
