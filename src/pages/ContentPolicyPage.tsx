import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldAlert, 
  Ban, 
  CheckCircle2, 
  ArrowLeft, 
  AlertTriangle, 
  Scale, 
  FileWarning, 
  Mail, 
  Lock, 
  Sparkles 
} from 'lucide-react';
import { CamelliaAvatar } from '../services/camelliaService';
import { useApp } from '../context/AppContext';

export const ContentPolicyPage: React.FC = () => {
  const { theme } = useApp();
  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen py-10 sm:py-12 px-4 sm:px-6 lg:px-8 transition-colors ${isDark ? 'bg-[#0B1220] text-slate-100' : 'bg-[#F8FAFC] text-slate-900'}`}>
      <div className="max-w-4xl mx-auto space-y-8 sm:space-y-10">
        {/* Navigation & Header */}
        <div className={`border-b pb-6 space-y-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <Link to="/" className={`inline-flex items-center gap-2 text-xs font-mono transition-colors mb-2 ${isDark ? 'text-cyan-400 hover:text-cyan-300' : 'text-cyan-700 hover:text-cyan-800'}`}>
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to M R S
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6 text-rose-500" />
            </div>
            <div>
              <h1 className={`text-2xl sm:text-3xl font-extrabold tracking-tight font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Acceptable Use & Content Policy
              </h1>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Last updated: November 2026 • Policy Version 2.1 (Enforced by Camellia & M R S)
              </p>
            </div>
          </div>
        </div>

        {/* Core Principles */}
        <div className={`border rounded-2xl p-6 sm:p-8 space-y-4 ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <h2 className={`text-lg font-bold flex items-center gap-2 font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <Scale className="w-5 h-5 text-cyan-500 shrink-0" />
            1. Core Ethical & Legal Foundations
          </h2>
          <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            M R S and its service coordinator, <strong>Camellia</strong>, deliver legitimate professional engineering, resume enhancement, cloud administration, automation systems, and digital consulting. We strictly prohibit any use of our technology, services, or automation pipelines for fraudulent, deceptive, harmful, or illegal activities.
          </p>
          <p className={`text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Orders violating this policy are rejected immediately, the order is cancelled, and if fees were submitted, they are handled in accordance with our refund policy. Repeat or malicious violations will result in permanent isolation of the client account.
          </p>
        </div>

        {/* Prohibited Activities Grid */}
        <div className="space-y-4">
          <h2 className={`text-sm font-semibold uppercase tracking-wider font-mono flex items-center gap-2 ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>
            <Ban className="w-4 h-4 shrink-0" />
            2. Strictly Prohibited Tasks & Content
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`border rounded-2xl p-5 space-y-2 ${isDark ? 'bg-rose-500/5 border-rose-500/20' : 'bg-rose-50/70 border-rose-200'}`}>
              <div className={`flex items-center gap-2 font-bold text-sm ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>
                <FileWarning className="w-4 h-4 shrink-0" />
                Forged Documents & Fake Credentials
              </div>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                We never produce, alter, or forge government IDs, educational certificates, diplomas, financial statements, bank certificates, medical records, or legal contracts intended to mislead third parties.
              </p>
            </div>

            <div className={`border rounded-2xl p-5 space-y-2 ${isDark ? 'bg-rose-500/5 border-rose-500/20' : 'bg-rose-50/70 border-rose-200'}`}>
              <div className={`flex items-center gap-2 font-bold text-sm ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Academic Dishonesty & Cheating
              </div>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                We will not complete graded exams, take university tests, or generate plagiarized academic dissertations. Camellia Tutor (S-MRS-08) is an educational mentor for conceptual learning and homework review only.
              </p>
            </div>

            <div className={`border rounded-2xl p-5 space-y-2 ${isDark ? 'bg-rose-500/5 border-rose-500/20' : 'bg-rose-50/70 border-rose-200'}`}>
              <div className={`flex items-center gap-2 font-bold text-sm ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>
                <Lock className="w-4 h-4 shrink-0" />
                Malware, Exploits & Scraping Bypass
              </div>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                We do not build keyloggers, botnets, credential stuffers, phishing pages, ransomware, or scripts engineered to bypass anti-scraping protections or terms of service of third-party platforms.
              </p>
            </div>

            <div className={`border rounded-2xl p-5 space-y-2 ${isDark ? 'bg-rose-500/5 border-rose-500/20' : 'bg-rose-50/70 border-rose-200'}`}>
              <div className={`flex items-center gap-2 font-bold text-sm ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>
                <ShieldAlert className="w-4 h-4 shrink-0" />
                Impersonation & Brand Infringement
              </div>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                We reject all projects attempting to clone trademarked brands, impersonate public figures, create deceptive affiliate landing pages, or distribute counterfeit assets.
              </p>
            </div>

            <div className={`border rounded-2xl p-5 space-y-2 ${isDark ? 'bg-rose-500/5 border-rose-500/20' : 'bg-rose-50/70 border-rose-200'}`}>
              <div className={`flex items-center gap-2 font-bold text-sm ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>
                <Ban className="w-4 h-4 shrink-0" />
                Spam, Bulk Harassment & Unsolicited Outreach
              </div>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                Our automation workflows (S-MRS-11) may not be configured to blast non-consensual mass emails, scrape personal directories without permission, or execute spam campaigns.
              </p>
            </div>

            <div className={`border rounded-2xl p-5 space-y-2 ${isDark ? 'bg-rose-500/5 border-rose-500/20' : 'bg-rose-50/70 border-rose-200'}`}>
              <div className={`flex items-center gap-2 font-bold text-sm ${isDark ? 'text-rose-400' : 'text-rose-700'}`}>
                <Scale className="w-4 h-4 shrink-0" />
                High-Risk Financial Schemes & Illegal Crypto
              </div>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                We do not build pyramid schemes, token minting scams, unregulated forex trading bots, or cryptocurrency bypasses in jurisdictions where digital assets are prohibited.
              </p>
            </div>
          </div>
        </div>

        {/* Camellia's Autonomous Guardrails */}
        <div className={`border rounded-2xl p-6 space-y-4 ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="flex items-center gap-3">
            <CamelliaAvatar size={28} />
            <h2 className={`text-base font-bold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
              3. Camellia's Autonomous Safety Guardrails
            </h2>
          </div>
          <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            Camellia is programmed with strict semantic guardrails:
          </p>
          <ul className={`space-y-2 text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Identity Integrity:</strong> Camellia presents herself transparently as "Camellia · M R S AI Assistant". She never claims to be human, never invents personal backstories, and answers candidly about her role as M R S's AI assistant.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Deterministic Boundaries:</strong> Camellia cannot change prices, grant unauthorized refunds, or mark unverified payments as valid.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span><strong>Immediate Escalation:</strong> Any request flagged for potential ethical or safety violations is escalated directly to the owner desk.</span>
            </li>
          </ul>
        </div>

        {/* Reporting & Questions */}
        <div className={`border rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
          <div className="space-y-1">
            <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Questions or Reporting Violations</h3>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              To request a policy clarification or report abusive use of an M R S deliverable:
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="mailto:mr216873@gmail.com?subject=Content%20Policy%20Inquiry"
              className={`inline-flex items-center gap-2 font-mono text-xs px-4 py-2 rounded-xl border transition-colors ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-900'
              }`}
            >
              <Mail className="w-3.5 h-3.5 text-cyan-500" />
              mr216873@gmail.com
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
