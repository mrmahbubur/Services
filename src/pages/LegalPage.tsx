import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ShieldCheck, Lock, FileText, ArrowLeft } from 'lucide-react';

export const LegalPage: React.FC = () => {
  const { pathname } = useLocation();
  const { theme, settings } = useApp();
  const isDark = theme === 'dark';

  let title = 'Terms of Service';
  let subtitle = 'Operational agreements, client obligations, and service milestones.';

  if (pathname === '/privacy') {
    title = 'Privacy Policy & Zero-Trust Isolation';
    subtitle = 'Cryptographic PIN protection, strict zero-leakage client data policy.';
  } else if (pathname === '/refund') {
    title = 'Refund & Cancellation Policy';
    subtitle = 'Transparent terms regarding revision warranties and verification refunds.';
  } else if (pathname === '/acceptable-use') {
    title = 'Acceptable Use Policy';
    subtitle = 'Ethical boundaries, security rules, and prohibited automation use cases.';
  } else if (pathname === '/iptv-terms') {
    title = 'M R S IPTV Service Terms';
    subtitle = 'Subscription provisioning, device slot limits, and fair-use streaming terms.';
  } else if (pathname === '/legal') {
    title = 'Legal Center & Terms of Service';
    subtitle = 'Platform agreements, privacy guarantees, refund rules, and IPTV service terms.';
  }

  const isTermsView = pathname === '/terms' || pathname === '/legal';

  const legalNav = [
    { to: '/terms', label: 'Terms of Service' },
    { to: '/privacy', label: 'Privacy Policy' },
    { to: '/refund', label: 'Refund Policy' },
    { to: '/acceptable-use', label: 'Acceptable Use' },
    { to: '/iptv-terms', label: 'IPTV Terms' },
    { to: '/content-policy', label: 'Content Policy' },
  ];

  return (
    <div className={`min-h-screen py-8 sm:py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6 sm:space-y-8 ${isDark ? 'text-[#E6EDF7]' : 'text-[#0B1220]'}`}>
      
      <Link
        to="/"
        className={`inline-flex items-center gap-1.5 text-xs font-semibold transition-colors ${
          isDark ? 'text-slate-400 hover:text-cyan-400' : 'text-slate-600 hover:text-cyan-700'
        }`}
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Home</span>
      </Link>

      <div className="space-y-2">
        <h1 className="font-heading font-extrabold text-2xl sm:text-4xl tracking-tight">
          {title}
        </h1>
        <p className={`text-xs sm:text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          {subtitle}
        </p>
      </div>

      {/* Policy quick-switcher across devices */}
      <div className="flex flex-wrap gap-2">
        {legalNav.map((item) => {
          const active = pathname === item.to || (pathname === '/legal' && item.to === '/terms');
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                active
                  ? 'bg-cyan-500 text-slate-950 border-cyan-500'
                  : isDark
                  ? 'bg-slate-900/70 border-slate-800 text-slate-300 hover:border-cyan-500/40'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-cyan-500/40'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <div
        className={`p-5 sm:p-8 rounded-2xl border space-y-6 text-xs sm:text-sm leading-relaxed transition-colors ${
          isDark ? 'bg-[#111B2E] border-[#22314D] text-slate-300' : 'bg-white border-slate-200 text-slate-700 shadow-sm'
        }`}
      >
        {isTermsView && (
          <div className="space-y-4">
            <h3 className={`font-heading font-bold text-base flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <FileText className="w-4 h-4 text-cyan-500 shrink-0" />
              1. Scope of Engagement
            </h3>
            <p>
              M R S provides technical consulting, prompt engineering, digital systems administration, and digital service passes. All projects are executed on deterministic milestones agreed upon in the client quote.
            </p>

            <h3 className={`font-heading font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>2. Client ID & Access PIN</h3>
            <p>
              Each client receives an isolated Client ID (format MRS-YYMM-XXXX) and a one-time 6-digit access PIN. Clients are solely responsible for securing their PIN.
            </p>

            <h3 className={`font-heading font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>3. Remittance & Owner Verification</h3>
            <p>
              Payment proofs (bKash Personal Send Money, Nagad Personal Send Money, Payoneer, Skrill, or Binance Pay when enabled) submitted by clients are subject to owner verification against financial statements before final deliverable release or IPTV credentials unlock.
            </p>
          </div>
        )}

        {pathname === '/privacy' && (
          <div className="space-y-4">
            <h3 className={`font-heading font-bold text-base flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <Lock className="w-4 h-4 text-emerald-500 shrink-0" />
              1. Data Minimization
            </h3>
            <p>
              M R S collects only necessary information required to execute technical orders (name, email, phone/WhatsApp, and project files). We never sell, lease, or distribute client data to any third party.
            </p>

            <h3 className={`font-heading font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>2. Cryptographic Security</h3>
            <p>
              Client PINs are never stored in plain text. They are hashed using cryptographic digests with server peppering before insertion into the ledger. Client portal data is isolated so no client can query or inspect another client’s projects.
            </p>

            <h3 className={`font-heading font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>3. Right to Erasure</h3>
            <p>
              Clients may request immediate deletion of their files and profile records by messaging the operations desk directly at {settings.ownerEmail}.
            </p>
          </div>
        )}

        {pathname === '/refund' && (
          <div className="space-y-4">
            <h3 className={`font-heading font-bold text-base flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <ShieldCheck className="w-4 h-4 text-cyan-500 shrink-0" />
              1. Revision Warranty
            </h3>
            <p>
              For technical writing, resume engineering, and digital setup services, we provide up to 2 rounds of revisions within 14 days of delivery to ensure complete satisfaction.
            </p>

            <h3 className={`font-heading font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>2. Pre-Verification Cancellations</h3>
            <p>
              If a payment has not yet been audited and work has not commenced, clients may request a full cancellation and refund by notifying the owner desk.
            </p>

            <h3 className={`font-heading font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>3. IPTV Subscriptions</h3>
            <p>
              IPTV subscriptions are non-refundable once private Xtream credentials and playlists are generated and delivered. We encourage selecting the 1-month plan for initial testing.
            </p>
          </div>
        )}

        {pathname === '/acceptable-use' && (
          <div className="space-y-4">
            <h3 className={`font-heading font-bold text-base flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              1. Authorized Technical Engagements Only
            </h3>
            <p>
              All automation pipelines, cloud setups, code audits, and content services delivered by M R S must be used solely on domains, accounts, and systems you own or have explicit written authorization to operate.
            </p>

            <h3 className={`font-heading font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>2. Prohibited Submissions</h3>
            <p>
              Requests involving credential theft, forged identification or academic documents, non-consensual scraping, unsolicited spam systems, or malware are rejected immediately and flagged in the security ledger.
            </p>

            <h3 className={`font-heading font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>3. Portal & Payment Integrity</h3>
            <p>
              Submitting fabricated Transaction IDs or tampering with Client ID authentication tokens triggers automatic rate limiting and account suspension. See our full{' '}
              <Link to="/content-policy" className="text-cyan-500 underline font-semibold">Content Policy</Link>.
            </p>
          </div>
        )}

        {pathname === '/iptv-terms' && (
          <div className="space-y-4">
            <h3 className={`font-heading font-bold text-base flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
              <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
              1. Provisioning & Access Window
            </h3>
            <p>
              M R S IPTV VIP passes (1-month, 2-month, 6-month, and 12-month) are activated after owner payment verification. Private server URL and Xtream/M3U credentials are published directly inside your isolated Client Portal.
            </p>

            <h3 className={`font-heading font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>2. Single-Household Connection Fairness</h3>
            <p>
              Do not share your private credentials publicly or restream server feeds. Simultaneous connections beyond your pass allocation may result in automatic connection throttling or suspension.
            </p>

            <h3 className={`font-heading font-bold text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>3. Device & Player Support</h3>
            <p>
              Supported clients include Smart TVs (IPTV Smarters / TiviMate), Android TV, FireStick, Windows, macOS, and iOS. Use the in-app Support Assistant or submit a portal ticket anytime for server routing help.
            </p>
          </div>
        )}

        <div className={`pt-4 border-t text-[11px] ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-500'}`}>
          Last revised: November 2026 · M R S Platform Operations Desk ({settings.ownerEmail})
        </div>
      </div>

    </div>
  );
};
