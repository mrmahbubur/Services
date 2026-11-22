import React, { useState, useEffect, useCallback } from 'react';
import {
  Mail,
  ShieldCheck,
  AlertTriangle,
  Send,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  Check,
  ShieldAlert,
  Inbox,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export interface ServerGmailMessage {
  id: string;
  from: string;
  subject: string;
  body: string;
  receivedAt: string;
  category: 'payment_notice' | 'quarantine';
  amount?: number;
  currency?: string;
  used?: boolean;
}

export const GmailIntegrationConsole: React.FC = () => {
  const { showToast, settings } = useApp();

  const [mailbox, setMailbox] = useState(settings.ownerEmail || 'mr216873@gmail.com');
  const [configured, setConfigured] = useState(false);
  const [bridgeLastSeen, setBridgeLastSeen] = useState<string | null>(null);
  const [messages, setMessages] = useState<ServerGmailMessage[]>([]);
  const [filter, setFilter] = useState<'all' | 'payment_notice' | 'quarantine'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [replySubject, setReplySubject] = useState('M R S Services — Order & Inquiry Update');
  const [replyText, setReplyText] = useState('');
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const loadMailbox = useCallback(async () => {
    setIsSyncing(true);
    try {
      const [statusRes, msgRes] = await Promise.all([
        fetch('/api/admin/gmail/status'),
        fetch('/api/admin/gmail/messages'),
      ]);
      if (statusRes.ok) {
        const s = await statusRes.json();
        setMailbox(s.mailbox || settings.ownerEmail);
        setConfigured(Boolean(s.configured));
        setBridgeLastSeen(s.collectorBridgeLastSeen || null);
      }
      if (msgRes.ok) {
        const m = await msgRes.json();
        const list = Array.isArray(m.messages) ? m.messages : [];
        setMessages(list);
        if (list.length > 0 && !selectedId) {
          setSelectedId(list[0].id);
        }
      }
    } catch (err) {
      console.warn('Gmail console load warning:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [settings.ownerEmail, selectedId]);

  useEffect(() => {
    loadMailbox();
  }, [loadMailbox]);

  const filteredMessages = messages.filter((m) => (filter === 'all' ? true : m.category === filter));
  const selectedMessage = filteredMessages.find((m) => m.id === selectedId) || filteredMessages[0] || null;

  const handleGenerateAiDraft = async () => {
    setIsGeneratingDraft(true);
    try {
      const res = await fetch('/api/admin/gmail/draft-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientEmail: recipientEmail || selectedMessage?.from || 'Client',
          subject: replySubject || selectedMessage?.subject || 'Order Update',
          contextText: selectedMessage?.body || 'Client status & support inquiry',
          instruction: 'Write a concise, honest, helpful update signed cleanly by Camellia · M R S AI Assistant.',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast('Gemini Draft Failed', data.error || 'Could not generate AI reply.', 'error');
        return;
      }
      setReplyText(data.draft || '');
      showToast('Camellia Draft Ready', `Signed honestly as ${data.signedAs || 'Camellia · M R S AI Assistant'}.`, 'success');
    } catch (err: any) {
      showToast('Network Error', err?.message || 'Failed to reach Gemini draft endpoint.', 'error');
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const handleSendReply = async () => {
    const targetTo = (recipientEmail || selectedMessage?.from || '').trim();
    if (!targetTo || !replyText.trim()) {
      showToast('Missing Fields', 'Specify a recipient email and reply body.', 'warning');
      return;
    }
    setIsSending(true);
    try {
      const res = await fetch('/api/admin/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: targetTo,
          subject: replySubject.trim() || `Re: ${selectedMessage?.subject || 'M R S Services'}`,
          body: replyText.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast('Send Blocked / Not Configured', data.error || 'Gmail OAuth outbound token missing.', 'warning');
        return;
      }
      showToast('Email Sent', `Sent to ${data.recipient} (${data.signedAs}).`, 'success');
      setReplyText('');
    } catch (err: any) {
      showToast('Network Error', err?.message || 'Failed to send email.', 'error');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mailbox Header */}
      <div className="p-5 rounded-2xl border border-cyan-500/30 bg-[#0F172A] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
            <Mail className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-heading font-bold text-base text-white">Official Business Mailbox</h3>
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                {mailbox}
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold border ${
                  configured
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}
              >
                {configured ? 'OAuth Token Active' : 'OAuth Outbound Not Configured'}
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Live `/api/ingest/email` Collector & Gemini Composer · Bridge last seen:{' '}
              <span className="font-mono text-slate-300">{bridgeLastSeen ? new Date(bridgeLastSeen).toLocaleString() : 'Never reported'}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadMailbox}
          disabled={isSyncing}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Refreshing...' : 'Refresh Inbox'}</span>
        </button>
      </div>

      {/* Main Mailbox Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Ingested Payment Notices & Quarantined Emails */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
            {[
              { id: 'all', label: `All (${messages.length})` },
              { id: 'payment_notice', label: 'Payment Notices' },
              { id: 'quarantine', label: 'Quarantine' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-lg border transition-colors ${
                  filter === f.id
                    ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
            {filteredMessages.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-slate-800 text-center text-xs text-slate-500 space-y-2">
                <Inbox className="w-7 h-7 mx-auto opacity-50" />
                <p>No ingested email notices yet. HMAC-signed email forwarders report to `/api/ingest/email`.</p>
              </div>
            ) : (
              filteredMessages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => {
                    setSelectedId(msg.id);
                    if (msg.from.includes('@')) setRecipientEmail(msg.from);
                  }}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    selectedMessage?.id === msg.id
                      ? 'border-cyan-400 bg-cyan-500/10'
                      : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-200 truncate max-w-[190px]">{msg.from}</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {msg.receivedAt ? new Date(msg.receivedAt).toLocaleTimeString() : '—'}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-100 truncate mb-1">{msg.subject}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{msg.body}</p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800 text-[10px]">
                    {msg.category === 'quarantine' ? (
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30 flex items-center gap-1">
                        <ShieldAlert className="w-3 h-3" /> QUARANTINED
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> {msg.used ? 'CLAIMED' : 'UNCLAIMED NOTICE'}
                      </span>
                    )}
                    {msg.amount !== undefined && (
                      <span className="font-mono text-cyan-300 font-bold">
                        {msg.amount} {msg.currency}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Message Viewer & Real Gemini Draft Composer */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-2xl border border-slate-800 bg-[#111B2E] space-y-4">
            {selectedMessage ? (
              <div className="space-y-3 border-b border-slate-800 pb-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-heading font-bold text-base text-white">{selectedMessage.subject}</h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    {selectedMessage.receivedAt ? new Date(selectedMessage.receivedAt).toLocaleString() : '—'}
                  </span>
                </div>
                <div className="text-xs text-slate-400 font-mono">From: {selectedMessage.from}</div>
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-[200px] overflow-y-auto">
                  {selectedMessage.body}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800 text-xs text-slate-400">
                Use the composer below to draft an AI-assisted client email via Gemini.
              </div>
            )}

            {/* Reply Composer */}
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-pink-400" />
                  Camellia Gemini Composer
                </span>

                <button
                  type="button"
                  onClick={handleGenerateAiDraft}
                  disabled={isGeneratingDraft}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-[11px] font-bold flex items-center gap-1.5 border border-cyan-500/30 transition-colors"
                >
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>{isGeneratingDraft ? 'Drafting via Gemini...' : 'Generate Draft with Gemini'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="Recipient email..."
                  className="rounded-xl px-3 py-2 bg-slate-900 border border-slate-800 text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
                <input
                  type="text"
                  value={replySubject}
                  onChange={(e) => setReplySubject(e.target.value)}
                  placeholder="Email subject..."
                  className="rounded-xl px-3 py-2 bg-slate-900 border border-slate-800 text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <textarea
                rows={6}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Compose reply... (Signed transparently as Camellia, M R S AI assistant)"
                className="w-full rounded-xl p-3 bg-slate-900 border border-slate-800 focus:border-cyan-500 text-xs text-slate-100 focus:outline-none font-sans leading-relaxed"
              />

              <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                <span className="text-[11px] text-slate-400">
                  Transparency Guard: Signed as <strong className="text-pink-300">Camellia · M R S AI Assistant</strong>
                </span>

                <button
                  type="button"
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || !recipientEmail.trim() || isSending}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2 transition-colors shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSending ? 'Sending...' : configured ? 'Send via Gmail OAuth' : 'Attempt Send'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
