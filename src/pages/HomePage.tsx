import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Clock,
  Sparkles,
  Bot,
  Calendar,
  Mail,
  ChevronRight,
  Tv,
  Layers,
  Lock,
  Cpu,
  FileCheck,
  ExternalLink,
} from 'lucide-react';
import { CamelliaAvatar } from '../services/camelliaService';

export const HomePage: React.FC = () => {
  const { theme, services, formatPrice, openConcierge, settings, t } = useApp();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const featuredServices = services.slice(0, 6);

  return (
    <div className={`space-y-16 pb-16 transition-colors ${isDark ? 'bg-circuit-dark text-[#E6EDF7]' : 'bg-circuit-light text-[#0B1220]'}`}>
      
      {/* ===================================================================== */}
      {/* 1. HERO SECTION */}
      {/* ===================================================================== */}
      <section className="relative pt-12 sm:pt-20 pb-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        
        {/* Subtle Automation Tag */}
        <div className="inline-flex items-center gap-2 text-xs text-slate-400 mb-6 font-medium">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-cyan-400 font-semibold">Professional Operations & Digital Engineering</span>
          <span className="text-slate-600">·</span>
          <span className="font-mono text-[11px] text-emerald-400">Owner Verified</span>
        </div>

        <h1 className="font-heading font-extrabold text-3xl sm:text-5xl lg:text-6xl tracking-tight max-w-4xl mx-auto leading-tight sm:leading-tight">
          Professional technical and digital solutions,{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400">
            delivered on time
          </span>
        </h1>

        <p className={`mt-5 text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed ${isDark ? 'text-[#8FA3C0]' : 'text-slate-600'}`}>
          {t.heroSubtitle}
        </p>

        {/* Primary CTA Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          <Link
            to="/services"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-heading font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(34,211,238,0.25)] hover:shadow-[0_0_25px_rgba(34,211,238,0.4)] min-h-[44px]"
          >
            <span>Explore {services.length} Services</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to="/portal"
            className={`w-full sm:w-auto px-6 py-3 rounded-xl border font-heading font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-sm min-h-[44px] ${
              isDark
                ? 'border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300'
                : 'border-cyan-500/40 bg-cyan-50 hover:bg-cyan-100 text-cyan-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-cyan-500" />
            <span>⚡ Live Client Workspace Console</span>
          </Link>

          <button
            onClick={() => openConcierge()}
            className={`w-full sm:w-auto px-5 py-3 rounded-xl border text-sm font-heading font-semibold flex items-center justify-center gap-2 transition-colors min-h-[44px] ${
              isDark
                ? 'bg-pink-500/10 border-pink-500/30 text-pink-300 hover:bg-pink-500/20 hover:border-pink-500/50'
                : 'bg-pink-50 border-pink-200 text-pink-900 hover:bg-pink-100 shadow-sm'
            }`}
          >
            <CamelliaAvatar size={18} />
            <span>Start with Camellia</span>
          </button>
        </div>

        {/* Trust Strip */}
        <div className={`mt-12 pt-8 border-t max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs ${
          isDark ? 'border-slate-800/60' : 'border-slate-200'
        }`}>
          <div className="flex flex-col items-center text-center p-2">
            <Clock className="w-4 h-4 text-cyan-400 mb-1" />
            <span className="font-semibold">{t.trustStrip.speed}</span>
            <span className="text-[11px] text-slate-500">Fast delivery</span>
          </div>
          <div className="flex flex-col items-center text-center p-2">
            <Lock className="w-4 h-4 text-emerald-400 mb-1" />
            <span className="font-semibold">{t.trustStrip.security}</span>
            <span className="text-[11px] text-slate-500">Encrypted portal</span>
          </div>
          <div className="flex flex-col items-center text-center p-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400 mb-1" />
            <span className="font-semibold">{t.trustStrip.verified}</span>
            <span className="text-[11px] text-slate-500">
              bKash, Nagad, Binance, Payoneer & Skrill
            </span>
          </div>
          <div className="flex flex-col items-center text-center p-2">
            <Tv className="w-4 h-4 text-emerald-400 mb-1" />
            <span className="font-semibold">{t.trustStrip.uptime}</span>
            <span className="text-[11px] text-slate-500">Live HD channels</span>
          </div>
        </div>

      </section>

      {/* ===================================================================== */}
      {/* 2. THREE CATEGORY CARDS */}
      {/* ===================================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="font-heading font-bold text-2xl sm:text-3xl tracking-tight">
            Three Distinct Solution Pillars
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Engineered workflows tailored for professionals, founders, and households.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Pillar 1: M R S Services */}
          <div
            className={`p-6 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
              isDark
                ? 'bg-[#111B2E] border-[#22314D] hover:border-cyan-500/40 hover:shadow-[0_0_20px_rgba(34,211,238,0.1)]'
                : 'bg-white border-slate-200 hover:border-cyan-500/40 hover:shadow-lg'
            }`}
          >
            <div>
              <div className="w-10 h-10 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4">
                <Cpu className="w-5 h-5" />
              </div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-heading font-bold text-lg">M R S Services</h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/30">
                  12 Services
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                AI workflow automations, technical writing, WordPress speed audits, AnyDesk IT support, App Store publishing, and ATS CV rewrites.
              </p>
              <ul className="space-y-1.5 text-xs text-slate-400 mb-6">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>AI & Digital Productivity ($50–$100/hr)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Advanced ATS CV & Resume ($15 / 1,500 TK)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>App Store Publishing ($25 USD / Crypto)</span>
                </li>
              </ul>
            </div>

            <Link
              to="/services?cat=M+R+S+Services"
              className="w-full py-2.5 px-4 rounded-xl border border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/15 text-cyan-400 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Explore Category A</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Pillar 2: Gravatar Services */}
          <div
            className={`p-6 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
              isDark
                ? 'bg-[#111B2E] border-[#22314D] hover:border-cyan-500/40 hover:shadow-[0_0_20px_rgba(34,211,238,0.1)]'
                : 'bg-white border-slate-200 hover:border-cyan-500/40 hover:shadow-lg'
            }`}
          >
            <div>
              <div className="w-10 h-10 rounded-xl border border-teal-500/30 bg-teal-500/10 text-teal-400 flex items-center justify-center mb-4">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-heading font-bold text-lg">Gravatar Services</h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 font-bold border border-teal-500/30">
                  3 Services
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Global identity optimization, cryptographic email-avatar hash synchronization, profile personalization, and custom domain mapping.
              </p>
              <ul className="space-y-1.5 text-xs text-slate-400 mb-6">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span>Professional Identity Consultation ($25)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span>Profile Personalization ($10–$20)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  <span>Custom Domain Mapping ($15–$30)</span>
                </li>
              </ul>
            </div>

            <Link
              to="/services?cat=Gravatar+Services"
              className="w-full py-2.5 px-4 rounded-xl border border-teal-500/30 bg-teal-500/5 hover:bg-teal-500/15 text-teal-400 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Explore Category B</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Pillar 3: M R S IPTV */}
          <div
            className={`p-6 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
              isDark
                ? 'bg-[#111B2E] border-[#22314D] hover:border-cyan-500/40 hover:shadow-[0_0_20px_rgba(34,211,238,0.1)]'
                : 'bg-white border-slate-200 hover:border-cyan-500/40 hover:shadow-lg'
            }`}
          >
            <div>
              <div className="w-10 h-10 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
                <Tv className="w-5 h-5" />
              </div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-heading font-bold text-lg">M R S IPTV</h3>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30">
                  VIP Entertainment
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                VIP Pass with 15,000+ HD/4K live sports, cinema, news, and on-demand entertainment. Ultra-reliable server infrastructure with 99.9% uptime.
              </p>
              <ul className="space-y-1.5 text-xs text-slate-400 mb-6">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>1, 2, 6, or 12 Month Plans</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Smart TV, Firestick, iOS & Android setup</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Private credentials delivered to client portal</span>
                </li>
              </ul>
            </div>

            <Link
              to="/iptv"
              className="w-full py-2.5 px-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/15 text-emerald-400 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Explore VIP Pass Plans</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

        </div>
      </section>

      {/* ===================================================================== */}
      {/* 3. HOW IT WORKS (Choose → Quote → Pay → Verified → Delivered) */}
      {/* ===================================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`p-8 sm:p-10 rounded-2xl border ${
            isDark ? 'bg-[#111B2E]/60 border-[#22314D]' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider block mb-1">
              Deterministic Process
            </span>
            <h2 className="font-heading font-bold text-2xl sm:text-3xl tracking-tight">
              {t.howItWorks}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              From requirement intake to portal delivery in 5 transparent stages.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 relative">
            
            {/* Step 1 */}
            <div className={`p-4 rounded-xl border text-center flex flex-col items-center ${isDark ? 'border-slate-700/40 bg-slate-900/30' : 'border-slate-200 bg-slate-50'}`}>
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/40 text-cyan-500 font-mono font-bold text-xs flex items-center justify-center mb-2">
                1
              </div>
              <h4 className="font-heading font-bold text-xs">{t.step1}</h4>
              <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{t.step1Desc}</p>
            </div>

            {/* Step 2 */}
            <div className={`p-4 rounded-xl border text-center flex flex-col items-center ${isDark ? 'border-slate-700/40 bg-slate-900/30' : 'border-slate-200 bg-slate-50'}`}>
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/40 text-cyan-500 font-mono font-bold text-xs flex items-center justify-center mb-2">
                2
              </div>
              <h4 className="font-heading font-bold text-xs">{t.step2}</h4>
              <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{t.step2Desc}</p>
            </div>

            {/* Step 3 */}
            <div className={`p-4 rounded-xl border text-center flex flex-col items-center ${isDark ? 'border-slate-700/40 bg-slate-900/30' : 'border-slate-200 bg-slate-50'}`}>
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/40 text-cyan-500 font-mono font-bold text-xs flex items-center justify-center mb-2">
                3
              </div>
              <h4 className="font-heading font-bold text-xs">{t.step3}</h4>
              <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{t.step3Desc}</p>
            </div>

            {/* Step 4 */}
            <div className={`p-4 rounded-xl border text-center flex flex-col items-center ${isDark ? 'border-slate-700/40 bg-slate-900/30' : 'border-slate-200 bg-slate-50'}`}>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/40 text-emerald-500 font-mono font-bold text-xs flex items-center justify-center mb-2">
                4
              </div>
              <h4 className="font-heading font-bold text-xs">{t.step4}</h4>
              <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{t.step4Desc}</p>
            </div>

            {/* Step 5 */}
            <div className={`p-4 rounded-xl border text-center flex flex-col items-center sm:col-span-2 lg:col-span-1 ${isDark ? 'border-slate-700/40 bg-slate-900/30' : 'border-slate-200 bg-slate-50'}`}>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/40 text-emerald-500 font-mono font-bold text-xs flex items-center justify-center mb-2">
                5
              </div>
              <h4 className="font-heading font-bold text-xs">{t.step5}</h4>
              <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{t.step5Desc}</p>
            </div>

          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 4. FEATURED SERVICES GRID */}
      {/* ===================================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-heading font-bold text-2xl tracking-tight">
              {t.featuredServices}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Instant transparent pricing with quote or direct buy flow.
            </p>
          </div>

          <Link
            to="/services"
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <span>{t.viewAllServices}</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredServices.map((svc) => (
            <div
              key={svc.id}
              className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
                isDark
                  ? 'bg-[#111B2E] border-[#22314D] hover:border-cyan-500/40'
                  : 'bg-white border-slate-200 hover:border-cyan-500/40 hover:shadow-md'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                  <span className="font-semibold text-cyan-400">{svc.category}</span>
                  <span className="font-mono">{svc.typicalTurnaround}</span>
                </div>

                <h3 className="font-heading font-bold text-base mb-2">
                  {svc.name}
                </h3>

                <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                  {svc.shortDescription}
                </p>

                {/* Pricing Display */}
                <div className={`p-3 rounded-xl border mb-4 flex items-center justify-between gap-2 ${
                  isDark ? 'bg-slate-950/40 border-slate-800/80' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Rate</span>
                    <span className="font-mono text-xs font-bold text-emerald-500">
                      {svc.rateUSD}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 uppercase tracking-wider block">BDT Equivalent</span>
                    <span className={`font-mono text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {svc.rateBDT}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className={`flex items-center gap-2 pt-2 border-t ${isDark ? 'border-slate-800/40' : 'border-slate-200'}`}>
                <Link
                  to={`/services/${svc.id}`}
                  className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium text-center transition-colors ${
                    isDark
                      ? 'border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800'
                      : 'border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  Details
                </Link>

                <Link
                  to={`/request/${svc.id}`}
                  className="flex-1 py-2 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs text-center transition-colors shadow-sm"
                >
                  {svc.priceType === 'fixed' || svc.priceType === 'plan' ? 'Buy Now' : 'Request Quote'}
                </Link>
              </div>

            </div>
          ))}
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 5. CAMELLIA INTAKE & TRIAGE STRIP */}
      {/* ===================================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`p-6 sm:p-8 rounded-2xl border flex flex-col md:flex-row items-center justify-between gap-6 ${
            isDark
              ? 'bg-gradient-to-r from-[#111B2E] via-[#16233B] to-[#111B2E] border-pink-500/30'
              : 'bg-gradient-to-r from-pink-50 via-white to-pink-50 border-pink-200 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-4">
            <CamelliaAvatar size={48} />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className={`font-heading font-bold text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Meet Camellia · M R S AI Assistant
                </h3>
                <span className="text-slate-500">·</span>
                <span className="text-xs font-mono text-pink-500 font-semibold tracking-wide">
                  AI Service Coordinator
                </span>
              </div>
              <p className={`text-xs mt-1 max-w-xl leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Need immediate scoping advice or custom requirements? Camellia reviews your brief, checks catalog rates, clarifies payment details, and coordinates your order for timely delivery.
              </p>
            </div>
          </div>

          <button
            onClick={() => openConcierge()}
            className="w-full md:w-auto px-6 py-3 rounded-xl bg-pink-500 hover:bg-pink-400 text-slate-950 font-heading font-bold text-sm flex items-center justify-center gap-2 transition-colors shrink-0 shadow-lg shadow-pink-500/20"
          >
            <CamelliaAvatar size={18} />
            <span>Start with Camellia</span>
          </button>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 6. FINAL CTA & CALENDLY / DIRECT DESK */}
      {/* ===================================================================== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-8">
        <div className="max-w-2xl mx-auto space-y-4">
          <h2 className="font-heading font-bold text-2xl sm:text-3xl tracking-tight">
            Ready to streamline your technical operations?
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Book an introductory scoping call or dispatch your requirements directly to the owner desk.
          </p>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <a
              href={settings.calendlyUrl}
              target="_blank"
              rel="noreferrer"
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-colors shadow-sm"
            >
              <Calendar className="w-4 h-4" />
              <span>{t.bookCall}</span>
            </a>

            <a
              href={`mailto:${settings.ownerEmail}`}
              className={`px-5 py-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition-colors ${
                isDark
                  ? 'bg-[#16233B] border-[#22314D] text-slate-200 hover:text-white'
                  : 'bg-white border-slate-300 text-slate-800 hover:text-slate-950 shadow-sm'
              }`}
            >
              <Mail className="w-4 h-4 text-cyan-400" />
              <span>Direct Email ({settings.ownerEmail})</span>
            </a>
          </div>
        </div>
      </section>

    </div>
  );
};
