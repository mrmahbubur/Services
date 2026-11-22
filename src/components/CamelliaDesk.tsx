import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import {
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  CamelliaAutonomyPolicy,
  CamelliaActivityItem,
  CamelliaSuggestionItem,
  KnowledgeArticle,
  KnowledgeGapItem,
  QualityIncident,
  ServiceQualityScore,
} from '../types/camellia';
import { DEFAULT_AUTONOMY_POLICY, CamelliaAvatar } from '../services/camelliaService';

export const CamelliaDesk: React.FC = () => {
  const { theme, showToast, allOrders, allPayments } = useApp();
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<'overview' | 'autonomy' | 'knowledge' | 'incidents' | 'suggestions'>('overview');
  const [loading, setLoading] = useState(false);

  const [policy, setPolicy] = useState<CamelliaAutonomyPolicy>(DEFAULT_AUTONOMY_POLICY);
  const [activities, setActivities] = useState<CamelliaActivityItem[]>([]);
  const [suggestions, setSuggestions] = useState<CamelliaSuggestionItem[]>([]);
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [gaps, setGaps] = useState<KnowledgeGapItem[]>([]);
  const [incidents, setIncidents] = useState<QualityIncident[]>([]);
  const [qualityScores, setQualityScores] = useState<ServiceQualityScore[]>([]);

  // Article composer form state
  const [showAddArticle, setShowAddArticle] = useState(false);
  const [newArticleTitle, setNewArticleTitle] = useState('');
  const [newArticleCategory, setNewArticleCategory] = useState<'service' | 'payment' | 'policy' | 'faq'>('faq');
  const [newArticleContent, setNewArticleContent] = useState('');
  const [newArticleKeywords, setNewArticleKeywords] = useState('');

  const loadCamelliaState = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/camellia/state');
      if (!res.ok) return;
      const data = await res.json();
      if (data.policy) setPolicy(data.policy);
      if (Array.isArray(data.articles)) setArticles(data.articles);
      if (Array.isArray(data.gaps)) setGaps(data.gaps);
      if (Array.isArray(data.incidents)) setIncidents(data.incidents);
      if (Array.isArray(data.suggestions)) setSuggestions(data.suggestions);
      if (Array.isArray(data.activities)) setActivities(data.activities);
      if (Array.isArray(data.qualityScores)) setQualityScores(data.qualityScores);
    } catch (err) {
      console.warn('Camellia state load warning:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCamelliaState();
  }, [loadCamelliaState]);

  const handleTogglePause = async () => {
    const nextPaused = !policy.isPaused;
    try {
      const res = await fetch('/api/admin/camellia/policy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPaused: nextPaused }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast('Policy Update Failed', data.error || 'Could not update Camellia policy.', 'error');
        return;
      }
      setPolicy(data.policy);
      showToast(
        nextPaused ? 'Camellia Paused' : 'Camellia Active',
        nextPaused ? 'Autonomous triage paused. All items routed directly to owner.' : 'Autonomous coordination resumed.',
        nextPaused ? 'warning' : 'success'
      );
    } catch (err: any) {
      showToast('Network Error', err?.message || 'Failed to update Camellia policy.', 'error');
    }
  };

  const handleUndoActivity = async (actId: string) => {
    try {
      const res = await fetch(`/api/admin/camellia/activity/${actId}/undo`, { method: 'POST' });
      if (!res.ok) {
        showToast('Undo Failed', 'Server rejected undo request.', 'error');
        return;
      }
      await loadCamelliaState();
      showToast('Action Reverted', `Camellia activity ${actId} reverted on server.`, 'info');
    } catch (err: any) {
      showToast('Network Error', err?.message || 'Could not revert activity.', 'error');
    }
  };

  const handleDecisionSuggestion = async (sugId: string, status: 'accepted' | 'dismissed') => {
    try {
      const res = await fetch(`/api/admin/camellia/suggestions/${sugId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        showToast('Update Failed', 'Could not update suggestion status.', 'error');
        return;
      }
      await loadCamelliaState();
      showToast(
        status === 'accepted' ? 'Suggestion Accepted' : 'Suggestion Dismissed',
        `Suggestion ${sugId} marked ${status}.`,
        status === 'accepted' ? 'success' : 'info'
      );
    } catch (err: any) {
      showToast('Network Error', err?.message || 'Could not update suggestion.', 'error');
    }
  };

  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newArticleTitle.trim() || !newArticleContent.trim()) return;
    try {
      const res = await fetch('/api/admin/camellia/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newArticleTitle.trim(),
          category: newArticleCategory,
          content: newArticleContent.trim(),
          keywords: newArticleKeywords,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast('Save Failed', data.error || 'Could not publish knowledge article.', 'error');
        return;
      }
      setNewArticleTitle('');
      setNewArticleContent('');
      setNewArticleKeywords('');
      setShowAddArticle(false);
      await loadCamelliaState();
      showToast('Article Published', `Approved article ${data.article?.id} added to Camellia KB.`, 'success');
    } catch (err: any) {
      showToast('Network Error', err?.message || 'Failed to add article.', 'error');
    }
  };

  const handleResolveGap = async (gap: KnowledgeGapItem) => {
    try {
      if (gap.proposedAnswer) {
        await fetch('/api/admin/camellia/articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: gap.query,
            category: 'faq',
            content: gap.proposedAnswer,
            keywords: gap.query.split(/\s+/).slice(0, 5),
          }),
        });
      }
      await fetch(`/api/admin/camellia/gaps/${gap.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved' }),
      });
      await loadCamelliaState();
      showToast('Knowledge Gap Resolved', 'Converted into approved Camellia knowledge article.', 'success');
    } catch (err: any) {
      showToast('Error', err?.message || 'Could not resolve gap.', 'error');
    }
  };

  return (
    <div className={`p-6 rounded-2xl border space-y-6 ${isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200 shadow-sm'}`}>
      {/* Top Header with Identity & Pause Switch */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <CamelliaAvatar size={38} />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-heading font-extrabold text-xl text-inherit">Camellia Desk</h2>
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded bg-pink-500/10 text-pink-400 border border-pink-400/30">
                Camellia · M R S AI Assistant
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Persistent order triage, approved KB answering, incident surveillance, and quality scoring.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleTogglePause}
          className={`px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-2 border transition-colors self-start md:self-auto ${
            policy.isPaused
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
              : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
          }`}
        >
          {policy.isPaused ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          <span>{policy.isPaused ? 'Camellia Paused (Owner Only)' : 'Camellia Active'}</span>
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/40 pb-2 text-xs">
        {[
          { id: 'overview', label: 'Overview & Brief' },
          { id: 'autonomy', label: 'Autonomy Policy' },
          { id: 'knowledge', label: `Knowledge Base (${articles.length})` },
          { id: 'incidents', label: `Quality & Incidents (${incidents.length})` },
          { id: 'suggestions', label: `Suggestions (${suggestions.filter((s) => s.status === 'pending').length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-colors ${
              activeTab === tab.id ? 'bg-pink-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW & BRIEF */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl border border-pink-500/30 bg-gradient-to-r from-pink-500/5 via-purple-500/5 to-cyan-500/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-pink-400" />
                <h3 className="font-heading font-extrabold text-sm text-white">Live Operations Brief (Asia/Dhaka)</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {loading ? 'Syncing...' : 'Live Server Figures'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase block">Work In Progress</span>
                <span className="font-bold text-white text-base">
                  {allOrders.filter((o) => o.status === 'In progress').length}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase block">Awaiting Payment</span>
                <span className="font-bold text-amber-400 text-base">
                  {allOrders.filter((o) => o.status === 'Awaiting payment' || o.status === 'Payment submitted').length}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase block">Open Incidents</span>
                <span className="font-bold text-cyan-400 text-base">
                  {incidents.filter((i) => i.status === 'open').length}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 text-[10px] uppercase block">Verified Payments</span>
                <span className="font-bold text-emerald-400 text-base">
                  {allPayments.filter((p) => p.status === 'Verified').length}
                </span>
              </div>
            </div>
          </div>

          {/* Persistent Activity Log */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-heading font-bold text-sm text-white">Camellia Persistent Activity Log</h4>
              <span className="text-[11px] text-slate-400">{activities.length} recorded actions</span>
            </div>

            {activities.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
                No autonomous actions recorded yet. Camellia logs live actions as orders, messages, and ledger checks occur.
              </div>
            ) : (
              <div className="space-y-2.5">
                {activities.map((act) => (
                  <div
                    key={act.id}
                    className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                      act.undone
                        ? 'border-slate-800 bg-slate-900/20 opacity-60'
                        : isDark
                        ? 'bg-slate-900/50 border-slate-800'
                        : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-pink-500/10 text-pink-400 border border-pink-400/30">
                          {act.action}
                        </span>
                        <span className="font-bold text-white font-mono">{act.targetId}</span>
                        <span className="text-slate-500 text-[11px]">· {new Date(act.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-slate-300">{act.summary}</p>
                    </div>

                    {act.isUndoable && !act.undone && (
                      <button
                        type="button"
                        onClick={() => handleUndoActivity(act.id)}
                        className="px-3 py-1 rounded-lg border border-slate-700 hover:border-amber-400 text-slate-300 hover:text-amber-300 text-[11px] font-bold flex items-center gap-1 self-start sm:self-auto shrink-0"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Undo</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: AUTONOMY POLICY */}
      {activeTab === 'autonomy' && (
        <div className="space-y-4 max-w-3xl text-xs">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
            <h4 className="font-heading font-bold text-sm text-white">Autonomy Policy & Hard Governance</h4>
            <p className="text-slate-400 leading-relaxed">
              Camellia always identifies as <strong>Camellia · M R S AI Assistant</strong>. She can triage intakes, prepare Gemini drafts, and answer from approved KB articles. She is <strong>blocked in server code</strong> from confirming unverified payments, changing prices, issuing refunds, or deleting audit logs.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left font-mono">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Operational Task</th>
                  <th className="p-3">Current Mode</th>
                  <th className="p-3">Boundary Enforcement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                <tr>
                  <td className="p-3 font-bold text-white font-sans">Routine Inbound Questions</td>
                  <td className="p-3 text-emerald-400 font-bold uppercase">{policy.routineQuestions}</td>
                  <td className="p-3 text-slate-400 font-sans">Strictly uses approved knowledge base articles</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-white font-sans">Order Intake & Triaging</td>
                  <td className="p-3 text-emerald-400 font-bold uppercase">{policy.intakeTriage}</td>
                  <td className="p-3 text-slate-400 font-sans">Gemini summary & kickoff readiness check</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-white font-sans">AI Execution Drafts</td>
                  <td className="p-3 text-emerald-400 font-bold uppercase">{policy.draftPreparation}</td>
                  <td className="p-3 text-slate-400 font-sans">Owner review required before deliverable unlock</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-white font-sans">Price or Invoice Alteration</td>
                  <td className="p-3 text-rose-400 font-bold uppercase">PROHIBITED</td>
                  <td className="p-3 text-slate-400 font-sans">Hard-blocked on server API</td>
                </tr>
                <tr>
                  <td className="p-3 font-bold text-white font-sans">Payment Confirmation</td>
                  <td className="p-3 text-rose-400 font-bold uppercase">OWNER / LEDGER ONLY</td>
                  <td className="p-3 text-slate-400 font-sans">Deterministic TrxID/amount match or manual owner confirmation</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: KNOWLEDGE BASE */}
      {activeTab === 'knowledge' && (
        <div className="space-y-5 text-xs">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h4 className="font-heading font-bold text-sm text-white">Approved Knowledge Base Articles ({articles.length})</h4>
              <p className="text-slate-400 text-[11px]">Camellia cites approved articles stored in `/api/admin/camellia/articles`.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddArticle(!showAddArticle)}
              className="px-3 py-1.5 rounded-xl bg-pink-500 hover:bg-pink-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
            >
              {showAddArticle ? <X className="w-3.5 h-3.5" /> : <PlusCircle className="w-3.5 h-3.5" />}
              <span>{showAddArticle ? 'Cancel' : 'Add Article'}</span>
            </button>
          </div>

          {showAddArticle && (
            <form onSubmit={handleCreateArticle} className="p-4 rounded-xl border border-pink-500/30 bg-slate-950/70 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  required
                  value={newArticleTitle}
                  onChange={(e) => setNewArticleTitle(e.target.value)}
                  placeholder="Article title..."
                  className="rounded-lg px-3 py-2 bg-slate-900 border border-slate-700 text-white"
                />
                <select
                  value={newArticleCategory}
                  onChange={(e: any) => setNewArticleCategory(e.target.value)}
                  className="rounded-lg px-3 py-2 bg-slate-900 border border-slate-700 text-white"
                >
                  <option value="faq">FAQ</option>
                  <option value="service">Service</option>
                  <option value="payment">Payment</option>
                  <option value="policy">Policy</option>
                </select>
              </div>
              <textarea
                rows={3}
                required
                value={newArticleContent}
                onChange={(e) => setNewArticleContent(e.target.value)}
                placeholder="Approved answer content..."
                className="w-full rounded-lg p-3 bg-slate-900 border border-slate-700 text-white"
              />
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  value={newArticleKeywords}
                  onChange={(e) => setNewArticleKeywords(e.target.value)}
                  placeholder="Keywords (comma separated)"
                  className="flex-1 rounded-lg px-3 py-2 bg-slate-900 border border-slate-700 text-white"
                />
                <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Save Article
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {articles.map((art) => (
              <div key={art.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] font-bold text-pink-400 uppercase">{art.category}</span>
                  <span className="text-[10px] font-mono text-slate-500">Used {art.useCount} times</span>
                </div>
                <h5 className="font-heading font-bold text-white text-xs">{art.title}</h5>
                <p className="text-slate-300 leading-relaxed text-[11px]">{art.content}</p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {(art.keywords || []).map((kw, i) => (
                    <span key={i} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[9px]">
                      #{kw}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {gaps.length > 0 && (
            <div className="pt-4 border-t border-slate-800/60 space-y-3">
              <h5 className="font-heading font-bold text-xs text-amber-400">Detected Knowledge Gaps</h5>
              {gaps.map((gap) => (
                <div key={gap.id} className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-white block">"{gap.query}"</span>
                    <span className="text-[11px] text-slate-400">
                      Asked {gap.frequency} times · Status: {gap.status}
                    </span>
                  </div>
                  {gap.status === 'open' && (
                    <button
                      type="button"
                      onClick={() => handleResolveGap(gap)}
                      className="px-3 py-1 rounded-lg bg-pink-500 text-slate-950 font-bold text-[11px]"
                    >
                      Approve Article
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: QUALITY & INCIDENTS */}
      {activeTab === 'incidents' && (
        <div className="space-y-6 text-xs">
          <div className="space-y-3">
            <h4 className="font-heading font-bold text-sm text-white">Live Service Quality Surveillance</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {qualityScores.map((score) => (
                <div key={score.serviceId} className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/40 space-y-2">
                  <span className="font-mono text-cyan-400 text-[10px] font-bold block">{score.serviceId}</span>
                  <span className="font-bold text-white text-xs block">{score.serviceName}</span>
                  <div className="space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Orders / Reviews:</span>
                      <span className="text-slate-200 font-bold">{score.orderCount ?? 0} / {score.reviewCount ?? 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">First-Time Approval:</span>
                      <span className="text-emerald-400 font-bold">{score.firstTimeApprovalRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Average Rating:</span>
                      <span className="text-amber-400 font-bold">
                        {(score.reviewCount ?? 0) > 0 ? `${score.avgRating} / 5.0` : 'No reviews'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-slate-800/60">
            <h4 className="font-heading font-bold text-sm text-white">Incident & Escalation Log</h4>
            {incidents.length === 0 ? (
              <div className="p-5 rounded-xl border border-dashed border-slate-800 text-center text-slate-500">
                No open quality incidents or client complaints recorded.
              </div>
            ) : (
              incidents.map((inc) => (
                <div key={inc.id} className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-rose-400">{inc.id}</span>
                      <span className="text-slate-400">·</span>
                      <span className="font-bold text-white">{inc.summary}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] uppercase font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {inc.status}
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px]">{inc.description}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: SUGGESTIONS */}
      {activeTab === 'suggestions' && (
        <div className="space-y-4 max-w-3xl text-xs">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
            <h4 className="font-heading font-bold text-sm text-white">Camellia Suggestions Queue</h4>
            <p className="text-slate-400 mt-1">
              Operational proposals logged for explicit owner approval before taking effect.
            </p>
          </div>

          {suggestions.length === 0 ? (
            <div className="p-6 rounded-xl border border-dashed border-slate-800 text-center text-slate-500 flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>No pending Camellia suggestions.</span>
            </div>
          ) : (
            <div className="space-y-3">
              {suggestions.map((sug) => (
                <div
                  key={sug.id}
                  className={`p-4 rounded-xl border space-y-3 ${
                    sug.status === 'accepted'
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : sug.status === 'dismissed'
                      ? 'border-slate-800 opacity-50 bg-slate-900/20'
                      : 'border-slate-800 bg-slate-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold text-pink-400 uppercase">{sug.category}</span>
                      <span className="font-bold text-white text-xs">{sug.title}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">{sug.status}</span>
                  </div>

                  <p className="text-slate-300 text-[11px] leading-relaxed">{sug.description}</p>
                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-[11px] text-cyan-300 font-mono">
                    Action: {sug.proposedAction}
                  </div>

                  {sug.status === 'pending' && (
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleDecisionSuggestion(sug.id, 'dismissed')}
                        className="px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white font-bold"
                      >
                        Dismiss
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDecisionSuggestion(sug.id, 'accepted')}
                        className="px-3.5 py-1.5 rounded-lg bg-pink-500 hover:bg-pink-400 text-slate-950 font-bold"
                      >
                        Accept
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
