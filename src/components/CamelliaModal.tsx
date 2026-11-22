import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  X,
  Send,
  Sparkles,
  ArrowRight,
  Shield,
  Clock,
  ExternalLink,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { CamelliaAvatar } from '../services/camelliaService';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  recommendedServiceId?: string;
  estimatedHours?: number;
  handoffToOwner?: boolean;
}

export const CamelliaModal: React.FC = () => {
  const {
    isConciergeOpen,
    closeConcierge,
    conciergePrefillService,
    services,
    settings,
    theme,
  } = useApp();
  const isDark = theme === 'dark';

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (isConciergeOpen) {
      if (conciergePrefillService) {
        const svc = services.find((s) => s.id === conciergePrefillService || s.serviceId === conciergePrefillService);
        setMessages([
          {
            id: 'init-1',
            role: 'assistant',
            text: `Hi, I'm Camellia, M R S's AI assistant. I see you're inquiring about "${svc?.name || conciergePrefillService}" (${svc?.serviceId || ''}). What specific goal or deadline do you have in mind? I can answer catalog questions and route custom quotes to the owner (${settings.ownerEmail}).`,
            recommendedServiceId: svc?.id || svc?.serviceId,
          },
        ]);
      } else {
        setMessages([
          {
            id: 'init-0',
            role: 'assistant',
            text: `Hi, I'm Camellia, M R S's AI assistant. I answer catalog questions, check order requirements, and route payment or custom quote requests directly to the owner. How can I help you today?`,
          },
        ]);
      }
    }
  }, [isConciergeOpen, conciergePrefillService, services, settings.ownerEmail]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!isConciergeOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text: input.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/concierge/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.text,
          prefillService: conciergePrefillService,
          history: messages.map((m) => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.text,
          })),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.reply) {
        const assistantMsg: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          text: data.reply,
          recommendedServiceId: data.recommendedService?.id || data.recommendedServiceId,
          estimatedHours: data.recommendedService?.estimatedHours,
          handoffToOwner: Boolean(data.handoffToOwner),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now() + 1}`,
            role: 'assistant',
            text: data.error || `Camellia AI is currently unavailable (HTTP ${res.status}). You can submit an order directly or contact the owner on WhatsApp (${settings.whatsappNumber}).`,
            handoffToOwner: true,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now() + 1}`,
          role: 'assistant',
          text: `Unable to reach the concierge server right now. Please contact the owner directly via WhatsApp (${settings.whatsappNumber}) or ${settings.ownerEmail}.`,
          handoffToOwner: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-xl rounded-2xl border shadow-2xl flex flex-col h-[80dvh] sm:h-[600px] max-h-[90dvh] overflow-hidden ${
          isDark ? 'bg-[#0E1626] border-[#22314D] text-[#E6EDF7]' : 'bg-white border-slate-200 text-[#0B1220]'
        }`}
      >
        {/* Header with Camellia Visual Identity (Rose-pink #F472B6) */}
        <div className={`p-4 border-b flex items-center justify-between ${
          isDark ? 'border-slate-800/80 bg-slate-900/60' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center gap-3">
            <CamelliaAvatar size={34} />
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`font-heading font-extrabold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Camellia</h3>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold ${
                  isDark ? 'bg-pink-500/10 text-pink-300 border-pink-400/30' : 'bg-pink-50 text-pink-700 border-pink-200'
                }`}>
                  AI Assistant
                </span>
              </div>
              <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Concierge & Technical Guidance</p>
            </div>
          </div>

          <button
            onClick={closeConcierge}
            className={`p-1.5 rounded-lg border transition-colors ${
              isDark
                ? 'border-slate-700/60 hover:bg-slate-800 text-slate-400 hover:text-white'
                : 'border-slate-300 hover:bg-slate-200 text-slate-600 hover:text-slate-900'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Reassurance Banner */}
        <div className={`border-b px-4 py-1.5 text-[11px] flex items-center justify-between ${
          isDark ? 'bg-pink-500/5 border-pink-500/20 text-pink-300' : 'bg-pink-50/80 border-pink-200 text-pink-800'
        }`}>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-pink-500" />
            <span>Camellia · AI Assistant</span>
          </div>
          <span className={`font-mono text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Real-Time Responses</span>
        </div>

        {/* Chat Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {messages.map((m) => {
            const isBot = m.role === 'assistant';
            return (
              <div key={m.id} className={`flex gap-3 ${isBot ? 'justify-start' : 'justify-end'}`}>
                {isBot && <CamelliaAvatar size={26} className="mt-0.5" />}
                
                <div className={`max-w-[85%] space-y-2`}>
                  <div
                    className={`p-3.5 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                      isBot
                        ? isDark
                          ? 'bg-[#152033] border border-pink-500/20 text-slate-100'
                          : 'bg-pink-50/60 border border-pink-200 text-slate-900'
                        : 'bg-cyan-500 text-slate-950 font-medium'
                    }`}
                  >
                    {m.text}
                  </div>

                  {/* Recommendation Card */}
                  {m.recommendedServiceId && (
                    <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
                      isDark ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300' : 'border-cyan-300 bg-cyan-50 text-cyan-900'
                    }`}>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-cyan-500 block">Recommended Catalog Service</span>
                        <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{m.recommendedServiceId}</span>
                      </div>
                      <Link
                        to={`/request/${m.recommendedServiceId}`}
                        onClick={closeConcierge}
                        className="py-1 px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition-colors shrink-0"
                      >
                        <span>Start Order</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )}

                  {/* Owner Direct Handoff Link */}
                  {m.handoffToOwner && (
                    <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                      isDark ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-amber-300 bg-amber-50 text-amber-900'
                    }`}>
                      <span>Speak with the owner immediately:</span>
                      <a
                        href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold underline text-amber-500 shrink-0"
                      >
                        WhatsApp Desk
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="flex gap-3 items-center text-xs text-pink-500">
              <CamelliaAvatar size={24} className="animate-spin" />
              <span className="font-mono text-[11px]">Camellia is working…</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className={`p-3 border-t flex items-center gap-2 ${
          isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50'
        }`}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Camellia about services, pricing, or technical scopes..."
            className={`flex-1 min-w-0 p-2.5 rounded-xl border text-xs focus:outline-none focus:border-pink-500 font-sans ${
              isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
            }`}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2.5 rounded-xl bg-pink-500 hover:bg-pink-400 disabled:opacity-40 text-slate-950 font-bold transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
