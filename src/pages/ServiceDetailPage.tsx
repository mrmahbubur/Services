import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Zap,
  HelpCircle,
  ArrowRight,
  Bot,
  Copy,
  Check,
  Share2,
  QrCode,
  Lock,
  Layers,
  Star,
  Sparkles,
  CheckSquare,
  XCircle,
  X,
} from 'lucide-react';
import {
  getServicePageUrl,
  getServiceShortUrl,
  getServiceOrderUrl,
  getQrCodeUrl,
  getShareUrls,
} from '../utils/serviceLinks';

export const ServiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { services, settings, theme, openConcierge, showToast, reviews } = useApp();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // Match by id, slug, or serviceId
  const service = services.find(
    (s) =>
      s.id === id ||
      s.slug === id ||
      (s.serviceId && id && s.serviceId.toUpperCase() === id.toUpperCase())
  );

  if (!service) {
    return (
      <div className="max-w-4xl mx-auto py-20 px-4 text-center space-y-4">
        <h2 className="font-heading font-bold text-2xl">Service Not Found</h2>
        <p className="text-slate-400 text-sm">The requested service ID or slug "{id}" was not found in our catalog.</p>
        <Link to="/services" className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs inline-block">
          Return to All 16 Services
        </Link>
      </div>
    );
  }

  const siteBase = settings.siteBaseUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  const pageUrl = getServicePageUrl(siteBase, service.slug);
  const shortUrl = getServiceShortUrl(siteBase, service.serviceId);
  const orderUrl = getServiceOrderUrl(siteBase, service.serviceId);
  const qrCodeUrl = getQrCodeUrl(pageUrl, 260);
  const shareUrls = getShareUrls(service.name, pageUrl);

  const serviceReviews = reviews.filter((r) => r.serviceId === service.serviceId && r.visible);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showToast('Copied to Clipboard', text, 'info');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const getTimingModeBadge = () => {
    const mode = service.paymentTimingNewClient;
    if (mode === 'A') {
      return {
        label: 'Mode A — Pay After Delivery',
        desc: 'Work delivered as locked preview. Approve and pay to unlock final files.',
        color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
      };
    }
    if (mode === 'B') {
      return {
        label: `Mode B — ${service.depositPercent || 50}% Deposit, Balance After Delivery`,
        desc: 'Deposit verified before kickoff; balance paid after preview approval.',
        color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      };
    }
    return {
      label: 'Mode C — Prepaid Verification',
      desc: 'Full payment verified before execution begins (required for live systems/IPTV).',
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    };
  };

  const timingInfo = getTimingModeBadge();

  return (
    <div className={`min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8 ${isDark ? 'text-[#E6EDF7]' : 'text-[#0B1220]'}`}>
      
      {/* Top Navigation & Permanent ID Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <Link
          to="/services"
          className="inline-flex items-center gap-1.5 font-semibold text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All 16 Services</span>
        </Link>

        {/* Permanent Service ID & Links Bar (Part 1.2) */}
        <div className="flex items-center gap-2 font-mono">
          <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold">
            {service.serviceId}
          </span>

          <button
            type="button"
            onClick={() => handleCopy(pageUrl, 'page-url')}
            className={`px-2.5 py-1 rounded-lg border flex items-center gap-1 text-[11px] transition-colors ${
              isDark ? 'bg-[#16233B] border-[#22314D] text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-300 text-slate-700'
            }`}
            title="Copy Canonical Link"
          >
            {copiedKey === 'page-url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy Link</span>
          </button>

          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className={`px-2.5 py-1 rounded-lg border flex items-center gap-1 text-[11px] transition-colors ${
              isDark ? 'bg-[#16233B] border-[#22314D] text-slate-300 hover:text-white' : 'bg-slate-100 border-slate-300 text-slate-700'
            }`}
            title="Share Service"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share</span>
          </button>

          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            className={`p-1.5 rounded-lg border transition-colors ${
              isDark ? 'bg-[#16233B] border-[#22314D] text-slate-300 hover:text-cyan-400' : 'bg-slate-100 border-slate-300 text-slate-700'
            }`}
            title="Show QR Code"
          >
            <QrCode className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Service Card */}
      <div
        className={`p-6 sm:p-10 rounded-2xl border ${
          isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className={`flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b ${
          isDark ? 'border-slate-800/60' : 'border-slate-200'
        }`}>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="px-2.5 py-0.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-500 text-xs font-semibold">
                {service.category}
              </span>
              <span className={`font-mono text-xs px-2 py-0.5 rounded border uppercase font-bold ${
                isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300'
              }`}>
                {service.priceType}
              </span>
              <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded border ${timingInfo.color}`}>
                {timingInfo.label}
              </span>
            </div>

            <h1 className="font-heading font-extrabold text-2xl sm:text-4xl tracking-tight text-inherit">
              {service.name}
            </h1>

            <p className={`text-sm mt-2 max-w-2xl leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {service.shortDescription}
            </p>

            {/* Rating Stars (real verified reviews only) */}
            <div className="flex items-center gap-2 mt-3 text-xs text-amber-500 font-mono">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-3.5 h-3.5 ${
                      serviceReviews.length > 0 &&
                      i < Math.round(serviceReviews.reduce((s, r) => s + r.rating, 0) / serviceReviews.length)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-500'
                    }`}
                  />
                ))}
              </div>
              {serviceReviews.length > 0 ? (
                <>
                  <span className="font-bold">
                    {(serviceReviews.reduce((s, r) => s + r.rating, 0) / serviceReviews.length).toFixed(1)}
                  </span>
                  <span className="text-slate-500 font-sans">
                    ({serviceReviews.length} verified client {serviceReviews.length === 1 ? 'review' : 'reviews'})
                  </span>
                </>
              ) : (
                <span className="text-slate-500 font-sans">New · 0 verified reviews yet</span>
              )}
            </div>
          </div>

          {/* Pricing Box */}
          <div className={`p-5 rounded-2xl border w-full md:w-auto md:min-w-[240px] text-left md:text-right shrink-0 ${
            isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold font-mono">
              Quoted Standard Rate
            </span>
            <div className="font-mono font-extrabold text-2xl text-emerald-500 mt-0.5">
              {service.rateUSD}
            </div>
            <div className="font-mono text-xs text-slate-500 mt-1">
              {service.rateBDT}
            </div>

            <div className="mt-4 space-y-2">
              <Link
                to={`/order/${service.serviceId}`}
                className="w-full py-2.5 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-heading font-bold text-xs inline-flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <span>{service.priceType === 'fixed' || service.priceType === 'plan' ? 'Buy Now' : 'Request Quote'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                to="/portal"
                className={`w-full py-2 px-4 rounded-xl border font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-colors ${
                  isDark
                    ? 'border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300'
                    : 'border-cyan-500/40 bg-cyan-50 hover:bg-cyan-100 text-cyan-800'
                }`}
              >
                <span>⚡ Launch in Workspace</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Turnaround & SLA Highlights */}
        <div className={`grid grid-cols-1 sm:grid-cols-3 gap-4 py-6 border-b text-xs ${
          isDark ? 'border-slate-800/60' : 'border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Turnaround SLA</span>
              <span className="font-bold font-mono text-inherit">{service.typicalTurnaround}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Payment Mode</span>
              <span className="font-bold text-inherit">{timingInfo.label.split('—')[1] || timingInfo.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/30">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Revisions Included</span>
              <span className="font-bold text-inherit">{service.revisionsIncluded ?? 2} Revisions Included</span>
            </div>
          </div>
        </div>

        {/* Guarantee Box */}
        <div className={`my-6 p-4 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
        }`}>
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
            <div>
              <span className="font-bold block text-sm">Quality Scope Guarantee</span>
              <span className={`text-[11px] ${isDark ? 'text-slate-300' : 'text-emerald-800'}`}>{service.guarantee || 'Work matches the agreed scope or we fix it free.'}</span>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-500 uppercase font-bold shrink-0 self-start sm:self-center">
            Guaranteed
          </span>
        </div>

        {/* Inclusions vs What's Not Included (Transparent Pricing Block) */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 py-6 border-b ${
          isDark ? 'border-slate-800/60' : 'border-slate-200'
        }`}>
          <div>
            <h3 className="font-heading font-bold text-sm text-cyan-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>What's Included in Scope</span>
            </h3>
            <ul className={`space-y-3 text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              {service.inclusions.map((inc, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0 mt-1.5" />
                  <span>{inc}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-heading font-bold text-sm text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <XCircle className="w-4 h-4 text-rose-500" />
              <span>What is Not Included</span>
            </h3>
            <ul className={`space-y-3 text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {(service.notIncluded || ['Third-party external license or subscription costs', 'Scope changes outside the agreed summary']).map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Kickoff Checklist: What we need from you */}
        <div className={`py-6 border-b space-y-3 ${isDark ? 'border-slate-800/60' : 'border-slate-200'}`}>
          <h3 className="font-heading font-bold text-sm text-inherit flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-cyan-500" />
            <span>Kickoff Checklist: What We Need From You</span>
          </h3>
          <p className="text-xs text-slate-500">
            Work begins once required items are provided through your portal brief:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {(service.clientMustProvide || ['Project specifications and target criteria', 'Sample inputs or reference documents']).map((req, i) => (
              <div key={i} className={`p-3 rounded-xl border flex items-start gap-2 ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-50 border-slate-200'
              }`}>
                <span className="w-4 h-4 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-500 font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{req}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Portfolio & Sample Work */}
        {service.samples && service.samples.length > 0 && (
          <div className={`py-6 border-b space-y-4 ${isDark ? 'border-slate-800/60' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-bold text-base text-inherit flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-500" />
                <span>Portfolio & Sample Work</span>
              </h3>
              <span className="text-xs text-slate-500 font-mono">Verified Deliverables</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {service.samples.map((sample) => (
                <div key={sample.id} className={`p-4 rounded-xl border space-y-2 text-xs ${
                  isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-inherit">{sample.title}</span>
                    {sample.watermark && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                        Watermarked
                      </span>
                    )}
                  </div>
                  <p className={isDark ? 'text-slate-400' : 'text-slate-600'}>{sample.description}</p>
                  {sample.results && (
                    <div className={`text-[11px] font-medium p-2 rounded border ${
                      isDark ? 'text-emerald-400 bg-emerald-500/5 border-emerald-500/20' : 'text-emerald-800 bg-emerald-50 border-emerald-200'
                    }`}>
                      ✓ {sample.results}
                    </div>
                  )}
                  <div className="pt-2">
                    <Link
                      to={`/order/${service.serviceId}`}
                      className="inline-flex items-center gap-1.5 text-cyan-500 hover:text-cyan-400 font-semibold text-xs"
                    >
                      <span>Request something like this →</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Verified Reviews Section */}
        {serviceReviews.length > 0 && (
          <div className={`py-6 border-b space-y-4 ${isDark ? 'border-slate-800/60' : 'border-slate-200'}`}>
            <h3 className="font-heading font-bold text-base text-inherit flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span>Verified Client Reviews ({serviceReviews.length})</span>
            </h3>

            <div className="space-y-3">
              {serviceReviews.map((rev) => (
                <div key={rev.id} className={`p-4 rounded-xl border space-y-2 text-xs ${
                  isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-inherit">{rev.clientName}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                        Verified Client
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {[...Array(rev.rating)].map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-amber-400" />
                      ))}
                    </div>
                  </div>
                  <p className={`italic ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>"{rev.comment}"</p>
                  <span className="text-[10px] text-slate-500 font-mono block">
                    {new Date(rev.createdAt).toLocaleDateString()} · Service: {service.serviceId}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FAQ Accordion */}
        {service.faq && service.faq.length > 0 && (
          <div className="pt-6 space-y-4">
            <h3 className="font-heading font-bold text-sm text-inherit flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-cyan-500" />
              <span>Service FAQ</span>
            </h3>
            <div className="space-y-3">
              {service.faq.map((item, idx) => (
                <div key={idx} className={`p-4 rounded-xl border space-y-1.5 text-xs ${
                  isDark ? 'bg-slate-900/40 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}>
                  <h4 className="font-semibold text-cyan-500">{item.question}</h4>
                  <p className={isDark ? 'text-slate-300' : 'text-slate-700'}>{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className={`w-full max-w-sm p-6 rounded-2xl border text-center space-y-4 ${
            isDark ? 'bg-[#111B2E] border-[#22314D] text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <span className="font-heading font-bold text-sm text-cyan-500">Share {service.serviceId}</span>
              <button onClick={() => setShowShareModal(false)} className={`p-1 ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>✕</button>
            </div>
            <p className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{service.name}</p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <a
                href={shareUrls.whatsapp}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center justify-center gap-1.5"
              >
                <span>WhatsApp</span>
              </a>
              <a
                href={shareUrls.linkedin}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center gap-1.5"
              >
                <span>LinkedIn</span>
              </a>
              <a
                href={shareUrls.email}
                className="py-2.5 px-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold flex items-center justify-center gap-1.5"
              >
                <span>Email</span>
              </a>
              <button
                type="button"
                onClick={() => handleCopy(pageUrl, 'share-copy')}
                className="py-2.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center justify-center gap-1.5"
              >
                <span>{copiedKey === 'share-copy' ? 'Copied' : 'Copy Link'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className={`w-full max-w-xs p-6 rounded-2xl border text-center space-y-4 ${
            isDark ? 'bg-[#111B2E] border-[#22314D] text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between pb-2 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <span className="font-heading font-bold text-sm text-cyan-500">{service.serviceId} QR Code</span>
              <button onClick={() => setShowQrModal(false)} className={`p-1 ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>✕</button>
            </div>
            <img src={qrCodeUrl} alt="Service QR" className="w-52 h-52 mx-auto rounded-xl bg-white p-3 border border-slate-200" />
            <p className="text-[11px] font-mono text-slate-500 select-all break-all">{pageUrl}</p>
          </div>
        </div>
      )}

    </div>
  );
};
