import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  Tv,
  CheckCircle2,
  Zap,
  ShieldCheck,
  Smartphone,
  Monitor,
  Flame,
  ArrowRight,
  Headphones,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { IptvSupportAssistant } from '../components/IptvSupportAssistant';

export const IPTVPage: React.FC = () => {
  const { theme, settings, formatPrice } = useApp();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const plans = [
    {
      id: '1-month',
      duration: '1 Month VIP Pass',
      usd: 1,
      bdt: 110,
      popular: false,
      description: 'Ideal for testing stream stability & sports weekends.',
    },
    {
      id: '2-month',
      duration: '2 Months VIP Pass',
      usd: 2,
      bdt: 210,
      popular: false,
      description: 'Bi-monthly pass with priority server buffer.',
    },
    {
      id: '6-month',
      duration: '6 Months VIP Pass',
      usd: 6,
      bdt: 610,
      popular: true,
      description: 'Best value for continuous global sports & entertainment.',
    },
    {
      id: '12-month',
      duration: '12 Months (1 Year Full VIP)',
      usd: 12,
      bdt: 1220,
      popular: false,
      description: 'Maximum savings with dedicated high-bandwidth VIP cluster.',
    },
  ];

  return (
    <div className={`min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-16 ${isDark ? 'text-[#E6EDF7]' : 'text-[#0B1220]'}`}>
      
      {/* Hero */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-semibold">
          <Tv className="w-3.5 h-3.5" />
          <span>M R S IPTV VIP Entertainment Pass</span>
        </div>

        <h1 className="font-heading font-extrabold text-3xl sm:text-5xl tracking-tight leading-tight">
          15,000+ HD Live Channels & Global Sports{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
            With 99.9% Uptime
          </span>
        </h1>

        <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
          Premium anti-freeze streaming architecture compatible with Smart TVs, Firesticks, Android, iOS, Windows, and MAG devices. Instant private credentials delivery upon payment verification.
        </p>

        {/* Fulfillment Notice (Section 6) */}
        <div className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 max-w-2xl mx-auto ${
          isDark
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}>
          <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
          <span className="break-words">
            IPTV orders are completed exclusively on <strong className={isDark ? 'text-white' : 'text-emerald-950'}>https://shahin-iptv.ai.studio/</strong>. Payment and instant activation take place directly on the IPTV portal.
          </span>
        </div>
      </div>

      {/* Plan Comparison Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((p) => (
          <div
            key={p.id}
            className={`p-6 rounded-2xl border relative flex flex-col justify-between transition-all duration-200 ${
              p.popular
                ? 'border-cyan-400 bg-cyan-500/5 shadow-[0_0_25px_rgba(34,211,238,0.15)] ring-1 ring-cyan-400'
                : isDark
                ? 'bg-[#111B2E] border-[#22314D] hover:border-slate-600'
                : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
            }`}
          >
            {p.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-cyan-500 text-slate-950 font-heading font-extrabold text-[10px] uppercase tracking-wider shadow-sm flex items-center gap-1">
                <Flame className="w-3 h-3" />
                <span>Most Popular</span>
              </div>
            )}

            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                {p.duration}
              </span>
              <div className="flex items-baseline gap-1 my-2">
                <span className="font-mono font-extrabold text-3xl text-emerald-400">
                  ${p.usd}
                </span>
                <span className="text-xs text-slate-400">USD</span>
                <span className="text-xs text-slate-400 ml-2 font-mono">
                  ({p.bdt} TK)
                </span>
              </div>
              <p className={`text-xs mb-6 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{p.description}</p>

              {/* Inclusions */}
              <ul className={`space-y-2 text-xs mb-6 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>15,000+ Live Channels (HD/4K)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Full Live Sports & PPV Events</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Electronic Program Guide (EPG)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Private Xtream / M3U Playlist</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Anti-Freeze Server Technology</span>
                </li>
              </ul>
            </div>

            <a
              href={`https://shahin-iptv.ai.studio/?plan=${p.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`w-full py-2.5 px-4 rounded-xl font-heading font-bold text-xs text-center transition-colors shadow-sm flex items-center justify-center gap-1.5 ${
                p.popular
                  ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
              }`}
            >
              <span>PAY & ACTIVATE ON IPTV SITE</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        ))}
      </div>

      {/* Setup Steps Accordion */}
      <div
        className={`p-8 rounded-2xl border space-y-6 ${
          isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="text-center max-w-xl mx-auto">
          <h2 className="font-heading font-bold text-2xl tracking-tight">
            How to Set Up on Your Device
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Setup takes less than 3 minutes across any compatible IPTV player.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
          
          <div className={`p-4 rounded-xl border space-y-2 ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center font-mono font-bold">
              1
            </div>
            <h4 className={`font-bold text-sm ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Install an IPTV Player</h4>
            <p className={`leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Download <strong>TiviMate</strong>, <strong>IPTV Smarters Pro</strong>, or <strong>XCIPTV</strong> on Firestick/Smart TV, or <strong>GSE Smart IPTV</strong> on iOS.
            </p>
          </div>

          <div className={`p-4 rounded-xl border space-y-2 ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center font-mono font-bold">
              2
            </div>
            <h4 className={`font-bold text-sm ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Settle Order & Open Portal</h4>
            <p className={`leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Send payment via bKash Personal Send Money, Nagad Personal Send Money, Payoneer, Skrill, or Binance Pay (when enabled). Once verified, open your Client Portal under <strong>IPTV Pass</strong>.
            </p>
          </div>

          <div className={`p-4 rounded-xl border space-y-2 ${isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-500 flex items-center justify-center font-mono font-bold">
              3
            </div>
            <h4 className={`font-bold text-sm ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>Enter Xtream Codes</h4>
            <p className={`leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Copy Server URL, Username, and Password directly into your app. Stream channels in high definition instantly.
            </p>
          </div>

        </div>
      </div>

      {/* Automated 24/7 IPTV Setup Assistant */}
      <div className="space-y-3">
        <h3 className={`font-heading font-bold text-xl ${isDark ? 'text-white' : 'text-slate-900'}`}>24/7 Setup & Connection Troubleshooting</h3>
        <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Ask any device-specific setup or stream question to receive verified step-by-step guidance.</p>
        <IptvSupportAssistant />
      </div>

      {/* Support Strip */}
      <div className={`p-6 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs ${
        isDark ? 'bg-cyan-500/10 border-cyan-500/30' : 'bg-cyan-50 border-cyan-200'
      }`}>
        <div className="flex items-center gap-3">
          <Headphones className="w-6 h-6 text-cyan-500 shrink-0" />
          <div>
            <h4 className={`font-bold ${isDark ? 'text-cyan-300' : 'text-cyan-800'}`}>Need Immediate Setup Assistance?</h4>
            <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>Our operations desk assists via WhatsApp and AnyDesk remote sessions.</p>
          </div>
        </div>

        <a
          href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}`}
          target="_blank"
          rel="noreferrer"
          className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shrink-0 transition-colors shadow-sm"
        >
          Message on WhatsApp
        </a>
      </div>

    </div>
  );
};
