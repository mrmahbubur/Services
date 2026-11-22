import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Bot,
  Send,
  CheckCircle2,
} from 'lucide-react';

export const IptvSupportAssistant: React.FC = () => {
  const { settings, showToast, theme } = useApp();
  const isDark = theme === 'dark';

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<
    { sender: 'user' | 'bot'; text: string; escalated?: boolean }[]
  >([
    {
      sender: 'bot',
      text: "Hello! I'm Camellia, M R S's AI assistant. Ask any question about IPTV player setup (Smarters Pro, TiviMate, Apple TV, FireStick) or billing, and I will query the live concierge backend.",
    },
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    const q = input.trim();
    if (!q || loading) return;

    const history = messages.map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));

    setMessages((prev) => [...prev, { sender: 'user', text: q }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/concierge/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: q,
          prefillService: 'iptv-vip-pass',
          history,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.reply) {
        setMessages((prev) => [
          ...prev,
          { sender: 'bot', text: data.reply, escalated: Boolean(data.handoffToOwner) },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: data.error || `AI assistant is unavailable right now (HTTP ${res.status}). Contact owner WhatsApp ${settings.whatsappNumber} or visit https://shahin-iptv.ai.studio/ directly.`,
            escalated: true,
          },
        ]);
      }
    } catch (err: any) {
      showToast('Connection Error', err?.message || 'Could not reach IPTV assistant server.', 'error');
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: `Network error connecting to assistant. Contact ${settings.whatsappNumber} for direct IPTV setup assistance.`,
          escalated: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`p-4 sm:p-6 rounded-2xl border space-y-4 flex flex-col h-[65dvh] min-h-[380px] max-h-[540px] ${
        isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      <div className={`flex flex-wrap items-center justify-between gap-2 pb-3 border-b ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h4 className={`font-heading font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>IPTV Setup & Troubleshooting Concierge</h4>
            <p className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Live Camellia AI Assistant · Grounded Catalog & KB</p>
          </div>
        </div>
        <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 font-semibold">
          Camellia · AI
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
        {messages.map((m, i) => (
          <div key={i} className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
            <div
              className={`max-w-[88%] p-3.5 rounded-xl border leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-cyan-500 text-slate-950 font-medium border-cyan-400 rounded-br-none'
                  : isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-200 rounded-bl-none'
                  : 'bg-slate-100 border-slate-200 text-slate-800 rounded-bl-none'
              }`}
            >
              <p className="whitespace-pre-wrap">{m.text}</p>
              {m.escalated && (
                <div className={`mt-2.5 p-2 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 ${
                  isDark ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' : 'bg-cyan-50 border-cyan-300 text-cyan-800'
                }`}>
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                  <span>Direct Owner Desk: {settings.whatsappNumber}</span>
                </div>
              )}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 px-1">
              {m.sender === 'user' ? 'You' : 'Camellia · AI assistant'}
            </span>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-1.5 text-slate-500 text-xs italic">
            <Bot className="w-3.5 h-3.5 text-cyan-500" />
            <span>Camellia is querying live IPTV setup guidance...</span>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className={`pt-3 border-t flex items-center gap-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about Smarters Pro, FireStick, buffering, or activation..."
          className={`flex-1 min-w-0 rounded-xl px-3.5 py-2.5 text-xs border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
          }`}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center gap-1 transition-colors shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Ask</span>
        </button>
      </form>
    </div>
  );
};
