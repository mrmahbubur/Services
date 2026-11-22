import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  FileText,
  Globe,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Search,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { CamelliaAvatar } from '../services/camelliaService';
import { SponsorSupportPanel } from '../components/SponsorSupportPanel';

export const FreeToolsPage: React.FC = () => {
  const { theme, showToast } = useApp();
  const isDark = theme === 'dark';

  const [activeTool, setActiveTool] = useState<'ats' | 'dns' | 'proofread' | 'quiz'>('ats');

  // Tool 1: ATS CV Checker State
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [atsResult, setAtsResult] = useState<any | null>(null);
  const [atsLoading, setAtsLoading] = useState(false);

  // Tool 2: Domain & DNS Checker State
  const [domainInput, setDomainInput] = useState('');
  const [dnsResult, setDnsResult] = useState<any | null>(null);
  const [dnsLoading, setDnsLoading] = useState(false);

  // Tool 3: Proofreading Sample State
  const [proofText, setProofText] = useState('');
  const [proofResult, setProofResult] = useState<any | null>(null);
  const [proofLoading, setProofLoading] = useState(false);

  // Tool 4: "Which Service Do I Need?"
  const [goalInput, setGoalInput] = useState('');
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizResult, setQuizResult] = useState<{ serviceId: string; name: string; reason: string } | null>(null);

  // Real Backend ATS Checker
  const handleRunAtsCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeText.trim() || !jobDescription.trim()) {
      showToast('Inputs Required', 'Paste both your CV/resume text and the target job description.', 'warning');
      return;
    }
    setAtsLoading(true);
    setAtsResult(null);

    try {
      const res = await fetch('/api/tools/ats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText: resumeText.trim(), jobDescription: jobDescription.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast('ATS Check Failed', data.error || 'Server rejected ATS analysis.', 'error');
        return;
      }
      setAtsResult({
        score: data.score,
        matchedCount: data.matchedCount,
        totalJdKeywords: data.totalJdKeywords,
        matchedKeywords: data.matchedKeywords || [],
        missingKeywords: data.missingKeywords || [],
        aiAdvice: data.aiAdvice,
        targetServiceId: 'S-MRS-06',
        targetServiceName: 'Advanced ATS CV & Resume',
      });
      showToast('Audit Complete', `ATS Keyword score calculated: ${data.score}%`, 'success');
    } catch (err: any) {
      showToast('Network Error', err?.message || 'Could not reach ATS checker API.', 'error');
    } finally {
      setAtsLoading(false);
    }
  };

  // Real Node.js Authoritative DNS & HTTPS Checker
  const handleRunDnsCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainInput.trim()) return;
    setDnsLoading(true);
    setDnsResult(null);

    try {
      const res = await fetch('/api/tools/dns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domainInput.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast('DNS Lookup Failed', data.error || 'Invalid domain or DNS lookup error.', 'error');
        return;
      }
      setDnsResult({
        ...data,
        targetServiceId: 'S-GRV-02',
        targetServiceName: 'Domain Mapping & Gravatar Identity Setup',
      });
      showToast('DNS Lookup Complete', `Queried live records for ${data.domain}`, data.healthy ? 'success' : 'warning');
    } catch (err: any) {
      showToast('Network Error', err?.message || 'Could not reach DNS resolver API.', 'error');
    } finally {
      setDnsLoading(false);
    }
  };

  // Real Gemini Proofreading Endpoint
  const handleRunProofread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofText.trim()) return;
    setProofLoading(true);
    setProofResult(null);

    try {
      const res = await fetch('/api/tools/proofread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: proofText.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast('Proofread Unavailable', data.error || 'Proofreading API unavailable.', 'error');
        return;
      }
      setProofResult({
        wordCount: data.wordCount,
        correctedText: data.correctedText,
        clarityNotes: data.clarityNotes || [],
        targetServiceId: 'S-MRS-02',
        targetServiceName: 'Technical Writing & Proofreading',
      });
      showToast('Proofreading Complete', 'Sample evaluated by Camellia · AI assistant.', 'success');
    } catch (err: any) {
      showToast('Network Error', err?.message || 'Could not reach proofreading API.', 'error');
    } finally {
      setProofLoading(false);
    }
  };

  // Real Gemini Service Recommender
  const handleRunQuiz = async () => {
    if (!goalInput.trim()) return;
    setQuizLoading(true);
    setQuizResult(null);

    try {
      const res = await fetch('/api/tools/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: goalInput.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast('Matcher Unavailable', data.error || 'Recommendation engine unavailable.', 'error');
        return;
      }
      setQuizResult({
        serviceId: data.service?.serviceId || data.service?.id || 'S-MRS-01',
        name: data.service?.name || 'M R S Service',
        reason: data.reason || data.service?.description || '',
      });
    } catch (err: any) {
      showToast('Network Error', err?.message || 'Could not reach service matcher API.', 'error');
    } finally {
      setQuizLoading(false);
    }
  };

  return (
    <div className={`min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8 ${isDark ? 'text-[#E6EDF7]' : 'text-[#0B1220]'}`}>
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-pink-500/30 bg-pink-500/10 text-pink-400 text-xs font-semibold">
          <CamelliaAvatar size={18} />
          <span>Powered by Camellia · AI Assistant · Live Utilities</span>
        </div>
        <h1 className="font-heading font-extrabold text-3xl sm:text-4xl tracking-tight">
          M R S Free Tools Hub
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl mx-auto">
          Live server utilities with zero signup required. Check CV keyword overlap, query real DNS & HTTPS records, run AI proofreading, or match your project to a service.
        </p>
      </div>

      {/* Tool Selector Tabs */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={() => setActiveTool('ats')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 min-h-[40px] ${
            activeTool === 'ats'
              ? 'bg-pink-500 text-slate-950 shadow-md'
              : isDark
              ? 'border border-slate-700 text-slate-400 hover:text-white'
              : 'border border-slate-300 bg-white text-slate-700 hover:text-slate-950'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>ATS CV Checker</span>
        </button>
        <button
          onClick={() => setActiveTool('dns')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 min-h-[40px] ${
            activeTool === 'dns'
              ? 'bg-pink-500 text-slate-950 shadow-md'
              : isDark
              ? 'border border-slate-700 text-slate-400 hover:text-white'
              : 'border border-slate-300 bg-white text-slate-700 hover:text-slate-950'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Domain & DNS Lookup</span>
        </button>
        <button
          onClick={() => setActiveTool('proofread')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 min-h-[40px] ${
            activeTool === 'proofread'
              ? 'bg-pink-500 text-slate-950 shadow-md'
              : isDark
              ? 'border border-slate-700 text-slate-400 hover:text-white'
              : 'border border-slate-300 bg-white text-slate-700 hover:text-slate-950'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Proofreading Sample</span>
        </button>
        <button
          onClick={() => setActiveTool('quiz')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 min-h-[40px] ${
            activeTool === 'quiz'
              ? 'bg-pink-500 text-slate-950 shadow-md'
              : isDark
              ? 'border border-slate-700 text-slate-400 hover:text-white'
              : 'border border-slate-300 bg-white text-slate-700 hover:text-slate-950'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Which Service Do I Need?</span>
        </button>
      </div>

      {/* TOOL 1: ATS CV CHECKER */}
      {activeTool === 'ats' && (
        <div className={`p-6 rounded-2xl border space-y-6 ${isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div>
            <h2 className="font-heading font-bold text-lg">ATS CV & Keyword Overlap Checker</h2>
            <p className="text-xs text-slate-500 mt-1">
              Runs deterministic keyword extraction against the real target job description plus optional Gemini AI analysis.
            </p>
          </div>

          <form onSubmit={handleRunAtsCheck} className="space-y-4 text-xs">
            <div>
              <label className={`font-semibold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Paste Resume Content *</label>
              <textarea
                rows={5}
                required
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste your resume text here..."
                className={`w-full p-3 rounded-xl border font-mono focus:outline-none focus:ring-1 focus:ring-pink-500 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className={`font-semibold block mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Target Job Description *</label>
              <textarea
                rows={4}
                required
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste target job description here to compare real keyword overlap..."
                className={`w-full p-3 rounded-xl border font-mono focus:outline-none focus:ring-1 focus:ring-pink-500 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={atsLoading || !resumeText.trim() || !jobDescription.trim()}
              className="px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-400 disabled:opacity-40 text-slate-950 font-bold flex items-center gap-2 min-h-[44px]"
            >
              <Sparkles className="w-4 h-4" />
              <span>{atsLoading ? 'Analyzing Keywords on Server...' : 'Run Live ATS Check'}</span>
            </button>
          </form>

          {atsResult && (
            <div className="p-5 rounded-xl border border-pink-500/30 bg-pink-500/5 space-y-4 font-mono text-xs">
              <div className={`flex flex-wrap items-center justify-between gap-2 pb-3 border-b ${
                isDark ? 'border-slate-800' : 'border-pink-200'
              }`}>
                <span className="text-slate-500">ATS Keyword Overlap ({atsResult.matchedCount}/{atsResult.totalJdKeywords} terms):</span>
                <span className="font-bold text-lg text-pink-500">{atsResult.score} / 100</span>
              </div>

              <div>
                <span className="text-slate-500 block mb-1">Matched Keywords:</span>
                <div className="flex flex-wrap gap-1.5">
                  {atsResult.matchedKeywords.length > 0 ? (
                    atsResult.matchedKeywords.map((k: string, i: number) => (
                      <span key={i} className={`px-2 py-0.5 rounded border ${
                        isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}>
                        ✓ {k}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500">No overlapping JD terms found.</span>
                  )}
                </div>
              </div>

              {atsResult.missingKeywords?.length > 0 && (
                <div>
                  <span className="text-slate-500 block mb-1">Missing JD Keywords:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {atsResult.missingKeywords.map((k: string, i: number) => (
                      <span key={i} className={`px-2 py-0.5 rounded border ${
                        isDark ? 'bg-amber-500/10 text-amber-300 border-amber-500/20' : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}>
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {atsResult.aiAdvice && (
                <div className={`space-y-1 pt-2 border-t font-sans ${isDark ? 'border-slate-800' : 'border-pink-200'}`}>
                  <span className="text-slate-500 block text-[11px] font-semibold">AI Analysis:</span>
                  <p className={`text-xs whitespace-pre-wrap leading-relaxed ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{atsResult.aiAdvice}</p>
                </div>
              )}

              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans ${
                isDark ? 'border-cyan-500/40 bg-cyan-500/10' : 'border-cyan-300 bg-cyan-50'
              }`}>
                <div>
                  <span className="text-[10px] uppercase font-bold text-cyan-500 block">Need a complete rewrite?</span>
                  <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{atsResult.targetServiceName}</span>
                  <p className="text-xs text-slate-500">Permanent ID: {atsResult.targetServiceId}</p>
                </div>
                <Link
                  to={`/request/${atsResult.targetServiceId}`}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <span>Request Full Rewrite</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TOOL 2: DOMAIN & DNS LOOKUP */}
      {activeTool === 'dns' && (
        <div className={`p-6 rounded-2xl border space-y-6 ${isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div>
            <h2 className="font-heading font-bold text-lg">Live Domain & DNS Resolver</h2>
            <p className="text-xs text-slate-500 mt-1">
              Queries live A, MX, NS, SPF, DMARC records and checks live HTTPS reachability on the server.
            </p>
          </div>

          <form onSubmit={handleRunDnsCheck} className="flex flex-col sm:flex-row gap-2 text-xs">
            <input
              type="text"
              required
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              placeholder="e.g. google.com or yourcompany.com"
              className={`flex-1 p-3 rounded-xl border font-mono focus:outline-none focus:ring-1 focus:ring-pink-500 ${
                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
            <button
              type="submit"
              disabled={dnsLoading || !domainInput.trim()}
              className="px-5 py-3 rounded-xl bg-pink-500 hover:bg-pink-400 disabled:opacity-40 text-slate-950 font-bold flex items-center justify-center gap-1.5 min-h-[44px]"
            >
              <Search className="w-4 h-4" />
              <span>{dnsLoading ? 'Querying...' : 'Lookup'}</span>
            </button>
          </form>

          {dnsResult && (
            <div className="p-5 rounded-xl border border-cyan-500/30 bg-cyan-500/5 space-y-3 font-mono text-xs">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="text-slate-500">Target Host:</span>
                <span className={`font-bold break-all ${isDark ? 'text-white' : 'text-slate-900'}`}>{dnsResult.domain}</span>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <span className="text-slate-500 shrink-0">IPv4 (A) Records:</span>
                <span className="text-emerald-500 text-left sm:text-right break-all min-w-0">
                  {dnsResult.aRecords?.length ? dnsResult.aRecords.join(', ') : 'None found'}
                </span>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <span className="text-slate-500 shrink-0">MX Mail Records:</span>
                <span className={`text-left sm:text-right break-all min-w-0 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  {dnsResult.mxRecords?.length ? dnsResult.mxRecords.map((m: any) => `${m.priority} ${m.exchange}`).join(', ') : 'None found'}
                </span>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <span className="text-slate-500">HTTPS Reachable:</span>
                <span className={dnsResult.httpsReachable ? 'text-emerald-500 font-bold' : 'text-rose-500 font-bold'}>
                  {dnsResult.httpsReachable ? `Yes (HTTP ${dnsResult.httpStatus})` : 'Unreachable / Timeout'}
                </span>
              </div>

              {dnsResult.issues?.length > 0 && (
                <div className={`p-3 rounded-lg border space-y-1 font-sans ${
                  isDark ? 'bg-amber-500/10 border-amber-500/30' : 'bg-amber-50 border-amber-200'
                }`}>
                  <div className={`font-bold flex items-center gap-1.5 ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Detected Configuration Issues</span>
                  </div>
                  {dnsResult.issues.map((iss: string, i: number) => (
                    <p key={i} className={`text-[11px] ${isDark ? 'text-amber-200' : 'text-amber-900'}`}>• {iss}</p>
                  ))}
                </div>
              )}

              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans mt-3 ${
                isDark ? 'border-cyan-500/40 bg-cyan-500/10' : 'border-cyan-300 bg-cyan-50'
              }`}>
                <div>
                  <span className="text-[10px] uppercase font-bold text-cyan-500 block">Need DNS / Domain Setup?</span>
                  <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{dnsResult.targetServiceName}</span>
                  <p className="text-xs text-slate-500">Permanent ID: {dnsResult.targetServiceId}</p>
                </div>
                <Link
                  to={`/request/${dnsResult.targetServiceId}`}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <span>Order DNS Setup</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TOOL 3: PROOFREADING SAMPLE */}
      {activeTool === 'proofread' && (
        <div className={`p-6 rounded-2xl border space-y-6 ${isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div>
            <h2 className="font-heading font-bold text-lg">Live AI Proofreading & Style Check</h2>
            <p className="text-xs text-slate-500 mt-1">
              Runs Camellia · AI assistant editing on your text via Gemini while preserving all numbers and URLs.
            </p>
          </div>

          <form onSubmit={handleRunProofread} className="space-y-3 text-xs">
            <textarea
              rows={4}
              required
              value={proofText}
              onChange={(e) => setProofText(e.target.value)}
              placeholder="Paste technical text, email draft, or proposal..."
              className={`w-full p-3 rounded-xl border font-sans focus:outline-none focus:ring-1 focus:ring-pink-500 ${
                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
            <button
              type="submit"
              disabled={proofLoading || !proofText.trim()}
              className="px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-400 disabled:opacity-40 text-slate-950 font-bold flex items-center gap-1.5 min-h-[44px]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{proofLoading ? 'Editing on Server...' : 'Proofread Text'}</span>
            </button>
          </form>

          {proofResult && (
            <div className="p-4 rounded-xl border border-pink-500/30 bg-pink-500/5 space-y-3 font-sans text-xs">
              <div className="flex items-center justify-between font-mono">
                <span className="text-slate-500">Word Count Evaluated:</span>
                <span className="font-bold text-pink-500">{proofResult.wordCount} words</span>
              </div>
              <div>
                <span className={`font-bold block mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>Polished Output:</span>
                <div className={`p-3 rounded-xl border whitespace-pre-wrap ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                }`}>
                  {proofResult.correctedText}
                </div>
              </div>
              {proofResult.clarityNotes?.length > 0 && (
                <div className="space-y-1">
                  <span className={`font-bold block ${isDark ? 'text-white' : 'text-slate-900'}`}>Editorial Notes:</span>
                  {proofResult.clarityNotes.map((s: string, i: number) => (
                    <p key={i} className={`text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>• {s}</p>
                  ))}
                </div>
              )}

              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-sans ${
                isDark ? 'border-cyan-500/40 bg-cyan-500/10' : 'border-cyan-300 bg-cyan-50'
              }`}>
                <div>
                  <span className="text-[10px] uppercase font-bold text-cyan-500 block">Full Document Proofreading</span>
                  <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{proofResult.targetServiceName}</span>
                  <p className="text-xs text-slate-500">Permanent ID: {proofResult.targetServiceId}</p>
                </div>
                <Link
                  to={`/request/${proofResult.targetServiceId}`}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <span>Book Proofreading</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TOOL 4: WHICH SERVICE DO I NEED? */}
      {activeTool === 'quiz' && (
        <div className={`p-6 rounded-2xl border space-y-6 ${isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div>
            <h2 className="font-heading font-bold text-lg">Live AI Service Matchmaker</h2>
            <p className="text-xs text-slate-500 mt-1">
              Describe what you need or choose a starting template to match against the authoritative M R S services catalog.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                'I need an ATS-safe resume rewrite for senior engineering roles',
                'I need help setting up an IPTV VIP Pass subscription',
                'Fix Windows/Android driver errors or system performance issues',
                'Automate spreadsheet pipelines and repetitive workflows with AI',
              ].map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setGoalInput(preset);
                    setQuizResult(null);
                  }}
                  className={`p-3 rounded-xl border text-left font-sans transition-all ${
                    goalInput === preset
                      ? isDark
                        ? 'border-pink-500 bg-pink-500/10 text-white font-bold'
                        : 'border-pink-500 bg-pink-50 text-pink-950 font-bold'
                      : isDark
                      ? 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              placeholder="Or describe your project requirements in your own words..."
              className={`w-full p-3 rounded-xl border font-sans focus:outline-none focus:ring-1 focus:ring-pink-500 ${
                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />

            <button
              onClick={handleRunQuiz}
              disabled={quizLoading || !goalInput.trim()}
              className="px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-400 disabled:opacity-40 text-slate-950 font-bold flex items-center gap-1.5 min-h-[44px]"
            >
              <span>{quizLoading ? 'Matching Catalog...' : 'Find Matching Service'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {quizResult && (
            <div className={`p-5 rounded-xl border space-y-3 font-sans ${
              isDark ? 'border-cyan-500/40 bg-cyan-500/10' : 'border-cyan-300 bg-cyan-50'
            }`}>
              <span className="text-[10px] uppercase font-bold text-cyan-500 block">Recommended Match</span>
              <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>{quizResult.name}</h4>
              <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{quizResult.reason}</p>

              <div className="pt-2">
                <Link
                  to={`/request/${quizResult.serviceId}`}
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs inline-flex items-center gap-2"
                >
                  <span>Start Order with {quizResult.serviceId}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sponsored Support Section supporting free public utilities */}
      <SponsorSupportPanel placement="free_tools" />
    </div>
  );
};
