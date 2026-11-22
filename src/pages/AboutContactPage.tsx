import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { SponsorSupportPanel } from '../components/SponsorSupportPanel';
import {
  Mail,
  Calendar,
  Github,
  Linkedin,
  Send,
  CheckCircle2,
  ExternalLink,
  Phone,
  MessageCircle,
  Globe,
  AlertCircle,
  Award,
} from 'lucide-react';

interface OwnerProfileResponse {
  slug: string;
  profileUrl: string;
  displayName: string;
  fullName: string;
  role: string;
  location: string;
  avatarUrl: string;
  bio: string;
  email: string;
  phone: string;
  whatsapp: string;
  calendlyUrl: string;
  contactFormUrl?: string;
  verifiedAccounts: { serviceLabel: string; shortname: string; url: string; display: string }[];
  source: string;
  syncedAt: string;
}

export const AboutContactPage: React.FC = () => {
  const { settings, theme, showToast } = useApp();
  const isDark = theme === 'dark';

  const [profile, setProfile] = useState<OwnerProfileResponse | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/owner/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setProfile(data);
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(data.error || 'Could not dispatch message.');
        showToast('Delivery Error', data.error || 'Could not dispatch message.', 'error');
        return;
      }
      setSubmittedId(data.inquiryId || 'LOGGED');
      showToast('Message Dispatched', `Inquiry ${data.inquiryId || ''} persisted for owner review.`, 'success');
    } catch (err: any) {
      setSubmitError(err?.message || 'Network error while contacting server.');
      showToast('Network Error', err?.message || 'Could not reach server.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const avatarUrl =
    profile?.avatarUrl ||
    settings.avatarUrl ||
    'https://1.gravatar.com/avatar/79cb903b47ada0af52e9962551bab25e563cc0a515939789f348aaa0ca135946?size=256';
  const ownerEmail = profile?.email || settings.ownerEmail;
  const ownerPhone = profile?.phone || settings.phoneNumber || '+8809611056361';
  const ownerWhatsapp = profile?.whatsapp || settings.whatsappNumber;
  const gravatarUrl = profile?.profileUrl || settings.gravatarUrl || 'https://gravatar.com/mrxshahin';
  const calendlyUrl = profile?.calendlyUrl || settings.calendlyUrl;
  const verifiedAccounts = profile?.verifiedAccounts || [
    { serviceLabel: 'GitHub', shortname: 'github', url: settings.githubUrl, display: '@mrmahbubur' },
    { serviceLabel: 'LinkedIn', shortname: 'linkedin', url: settings.linkedinUrl, display: '@mrmahbubur' },
    { serviceLabel: 'X', shortname: 'twitter', url: settings.xUrl || 'https://x.com/Mrshahinx', display: '@Mrshahinx' },
    { serviceLabel: 'Bluesky', shortname: 'bluesky', url: settings.blueskyUrl || 'https://bsky.app/profile/mrxshahin.bsky.social', display: '@mrxshahin.bsky.social' },
    { serviceLabel: 'WordPress', shortname: 'wordpress', url: settings.wordpressUrl || 'https://mrxshahin.wordpress.com', display: 'mrxshahin.wordpress.com' },
  ];

  return (
    <div className={`min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-10 ${isDark ? 'text-[#E6EDF7]' : 'text-[#0B1220]'}`}>
      {/* Header */}
      <div className="text-center space-y-2">
        <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider block">
          Verified Owner Identity · Gravatar Profile Synced
        </span>
        <h1 className="font-heading font-extrabold text-2xl sm:text-4xl tracking-tight">
          About M R S & Direct Operations Desk
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-2xl mx-auto">
          Practical remote IT support, WordPress & Blogger management, technical writing since 2018, AI workflows, and owner-verified service delivery.
        </p>
      </div>

      {/* Profile & Contact Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Column: Live Gravatar Profile Card */}
        <div
          className={`md:col-span-5 p-6 rounded-2xl border space-y-5 ${
            isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className="flex items-start gap-4">
            <img
              src={avatarUrl}
              alt="Md. Mahbubur Rahman (M R S) Gravatar"
              className="w-16 h-16 rounded-2xl border border-cyan-500/40 object-cover shrink-0 bg-slate-900"
            />
            <div>
              <h2 className="font-heading font-bold text-xl text-inherit">
                {profile?.fullName || 'Md. Mahbubur Rahman'}
              </h2>
              <p className="text-xs font-mono text-cyan-400">
                {profile?.displayName || 'M R S'} · Principal Coordinator
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {profile?.location || 'Dhaka, Bangladesh · Global Remote Operations'}
              </p>
            </div>
          </div>

          <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            {profile?.bio ||
              'Specializing in Remote IT Support, Virtual Assistance & Admin Support, WordPress/Blogger Management, Technical Writing & Documentation (since 2018), Online Research, and AI Tools & Productivity.'}
          </p>

          <div className={`p-3 rounded-xl border text-[11px] flex items-start gap-2 ${
            isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}>
            <Award className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            <span>Certified in Computer Systems (360-hour intensive program) · Technical Writer since 2018.</span>
          </div>

          {/* Direct Contact Channels */}
          <div className={`space-y-2.5 pt-3 border-t text-xs ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <a
              href={`mailto:${ownerEmail}`}
              className={`flex items-center gap-2.5 p-2 rounded-xl border transition-colors ${
                isDark
                  ? 'bg-slate-900/50 border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-white'
                  : 'bg-slate-50 border-slate-200 hover:border-cyan-500/40 text-slate-700 hover:text-slate-950'
              }`}
            >
              <Mail className="w-4 h-4 text-cyan-500 shrink-0" />
              <span className="truncate">{ownerEmail}</span>
            </a>

            <a
              href={`tel:${ownerPhone}`}
              className={`flex items-center gap-2.5 p-2 rounded-xl border transition-colors ${
                isDark
                  ? 'bg-slate-900/50 border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-white'
                  : 'bg-slate-50 border-slate-200 hover:border-cyan-500/40 text-slate-700 hover:text-slate-950'
              }`}
            >
              <Phone className="w-4 h-4 text-cyan-500 shrink-0" />
              <span>Office Phone: {ownerPhone}</span>
            </a>

            <a
              href={`https://wa.me/${ownerWhatsapp.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className={`flex items-center gap-2.5 p-2 rounded-xl border transition-colors ${
                isDark
                  ? 'bg-slate-900/50 border-slate-800 hover:border-emerald-500/40 text-slate-300 hover:text-white'
                  : 'bg-slate-50 border-slate-200 hover:border-emerald-500/40 text-slate-700 hover:text-slate-950'
              }`}
            >
              <MessageCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>WhatsApp & bKash/Nagad: {ownerWhatsapp}</span>
              <ExternalLink className="w-3 h-3 ml-auto text-slate-500" />
            </a>

            <a
              href={calendlyUrl}
              target="_blank"
              rel="noreferrer"
              className={`flex items-center gap-2.5 p-2 rounded-xl border transition-colors ${
                isDark
                  ? 'bg-slate-900/50 border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-white'
                  : 'bg-slate-50 border-slate-200 hover:border-cyan-500/40 text-slate-700 hover:text-slate-950'
              }`}
            >
              <Calendar className="w-4 h-4 text-cyan-500 shrink-0" />
              <span>Book Consultation (Calendly)</span>
              <ExternalLink className="w-3 h-3 ml-auto text-slate-500" />
            </a>

            <a
              href={gravatarUrl}
              target="_blank"
              rel="noreferrer"
              className={`flex items-center gap-2.5 p-2 rounded-xl border transition-colors ${
                isDark
                  ? 'bg-slate-900/50 border-slate-800 hover:border-pink-500/40 text-slate-300 hover:text-white'
                  : 'bg-slate-50 border-slate-200 hover:border-pink-500/40 text-slate-700 hover:text-slate-950'
              }`}
            >
              <Globe className="w-4 h-4 text-pink-500 shrink-0" />
              <span>Gravatar Verified Hub (mrxshahin)</span>
              <ExternalLink className="w-3 h-3 ml-auto text-slate-500" />
            </a>
          </div>

          {/* Verified Accounts from Gravatar */}
          <div className="pt-2 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Verified Profiles (via Gravatar):
            </span>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              {verifiedAccounts.map((acc) => (
                <a
                  key={acc.url}
                  href={acc.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`px-2.5 py-1 rounded-lg border inline-flex items-center gap-1 transition-colors ${
                    isDark
                      ? 'bg-slate-900/70 border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300'
                      : 'bg-slate-50 border-slate-200 hover:border-cyan-500/50 text-slate-700 hover:text-cyan-700'
                  }`}
                >
                  {acc.shortname === 'github' && <Github className="w-3 h-3" />}
                  {acc.shortname === 'linkedin' && <Linkedin className="w-3 h-3" />}
                  <span>{acc.serviceLabel}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Specialties */}
          <div className="pt-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
              Core Service Competencies:
            </span>
            <div className="flex flex-wrap gap-1.5 text-[11px] font-mono">
              <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">Remote IT Support</span>
              <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">Technical Writing (2018+)</span>
              <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">WordPress & Blogger</span>
              <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">AI Workflows & Gemini</span>
              <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">Admin & Virtual Assistance</span>
            </div>
          </div>
        </div>

        {/* Right Column: Direct Contact Form persisted to server */}
        <div
          className={`md:col-span-7 p-6 sm:p-8 rounded-2xl border space-y-6 ${
            isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div>
            <h3 className="font-heading font-bold text-lg">Send Direct Message to Owner Desk</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Logged directly to the server inquiry queue for {ownerEmail}. Average response: 2–4 hours.
            </p>
          </div>

          {submitError && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {submittedId ? (
            <div className={`p-6 rounded-xl border text-xs space-y-3 text-center ${
              isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
            }`}>
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <h4 className="font-bold text-base text-inherit">Inquiry Logged ({submittedId})</h4>
              <p className={isDark ? 'text-slate-300' : 'text-emerald-800'}>
                Thank you, {name}. Your inquiry has been stored on the server and routed to <strong>{ownerEmail}</strong>.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSubmittedId(null);
                  setMessage('');
                }}
                className="mt-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Your Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Alex Henderson"
                  className={`w-full rounded-xl px-3.5 py-2.5 border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                    isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Your Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. alex@example.com"
                  className={`w-full rounded-xl px-3.5 py-2.5 border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                    isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Message / Consultation Scope *</label>
                <textarea
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your project, custom SLA agreement, or partnership inquiry..."
                  className={`w-full rounded-xl p-3.5 border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                    isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-heading font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Dispatching...' : `Send Direct Message to ${ownerEmail}`}</span>
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Sponsored Community Support Panel */}
      <SponsorSupportPanel
        placement="about"
        title="Sponsored Community & Free Support Links"
        subtitle="Featured support links synced with gravatar.com/mrxshahin helping keep M R S community tools and guides free."
      />
    </div>
  );
};
