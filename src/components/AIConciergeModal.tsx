import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  Bot,
  X,
  Send,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  recommendedServiceId?: string;
  recommendedServiceName?: string;
  estimatedPrice?: string;
}

export const AIConciergeModal: React.FC = () => {
  const {
    isConciergeOpen,
    closeConcierge,
    conciergePrefillService,
    services,
    theme,
  } = useApp();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isConciergeOpen) {
      if (messages.length === 0) {
        if (conciergePrefillService) {
          const svc = services.find((s) => s.id === conciergePrefillService);
          setMessages([
            {
              id: 'init-prefill',
              role: 'assistant',
              text: `Hello! I see you are interested in "${svc?.name || conciergePrefillService}". What specific scope or deliverables are you looking to achieve? I will provide an exact catalog estimate and pre-fill your order request.`,
              recommendedServiceId: svc?.id,
              recommendedServiceName: svc?.name,
              estimatedPrice: svc ? (svc.priceType === 'fixed' ? `$${svc.fixedPriceUSD} USD` : `${svc.rateUSD}`) : undefined,
            },
          ]);
        } else {
          setMessages([
            {
              id: 'init',
              role: 'assistant',
              text: "Welcome to M R S. I am Camellia, M R S's AI assistant. Tell me what technical or digital challenge you need solved, and I will match your goal against our 16 catalog services.",
            },
          ]);
        }
      }
    }
  }, [isConciergeOpen, conciergePrefillService]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  if (!isConciergeOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      text: userText,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/concierge/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          history: messages.map((m) => ({ role: m.role, content: m.text })),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: `ast-${Date.now()}`,
            role: 'assistant',
            text: data.reply,
            recommendedServiceId: data.recommendedServiceId,
            recommendedServiceName: data.recommendedServiceName,
            estimatedPrice: data.estimatedPrice,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `ast-${Date.now()}`,
            role: 'assistant',
            text: data.error || `AI Concierge is unavailable right now (HTTP ${res.status}). Please browse our Services page or submit a request directly.`,
          },
        ]);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `ast-${Date.now()}`,
          role: 'assistant',
          text: `Network error connecting to Camellia AI: ${err?.message || 'Unknown error'}.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRecommendation = (serviceId: string) => {
    closeConcierge();
    navigate(`/request/${serviceId}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`w-full max-w-lg rounded-2xl border shadow-2xl flex flex-col h-[580px] max-h-[90vh] overflow-hidden transition-colors ${
          isDark
            ? 'bg-[#111B2E] border-[#22314D] text-[#E6EDF7]'
            : 'bg-white border-slate-200 text-[#0B1220]'
        }`}
      >
        {/* Modal Top Bar */}
        <div
          className={`px-4 py-3 border-b flex items-center justify-between ${
            isDark ? 'bg-[#0B1220] border-[#22314D]' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-sm tracking-wide">
                  AI Operations Concierge
                </h3>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono">
                  Gemini API
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Catalog recommendations & transparent estimates
              </p>
            </div>
          </div>

          <button
            onClick={closeConcierge}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conversation Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs leading-relaxed">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-xl border ${
                  m.role === 'user'
                    ? 'bg-cyan-500 text-slate-950 font-medium border-cyan-400 rounded-br-none shadow-sm'
                    : isDark
                    ? 'bg-[#16233B] border-[#22314D] text-slate-200 rounded-bl-none'
                    : 'bg-slate-100 border-slate-200 text-slate-800 rounded-bl-none'
                }`}
              >
                <div className="whitespace-pre-line">{m.text}</div>

                {/* Recommendation Action Pill */}
                {m.recommendedServiceId && (
                  <div
                    className={`mt-2.5 pt-2.5 border-t flex flex-col gap-1.5 ${
                      m.role === 'user'
                        ? 'border-cyan-600'
                        : isDark
                        ? 'border-slate-700/80'
                        : 'border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-cyan-400">
                        {m.recommendedServiceName}
                      </span>
                      {m.estimatedPrice && (
                        <span className="font-mono font-bold text-emerald-400">
                          {m.estimatedPrice}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleSelectRecommendation(m.recommendedServiceId!)}
                      className="mt-1 w-full py-1.5 px-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <span>Proceed to Quote & Order</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-500 mt-1 px-1">
                {m.role === 'user' ? 'You' : 'Camellia (Concierge)'}
              </span>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-cyan-400 text-xs py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Analyzing requirements against 16 catalog services...</span>
            </div>
          )}

          <div ref={scrollRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div
          className={`px-3 py-2 border-t flex items-center gap-1.5 overflow-x-auto text-[11px] ${
            isDark ? 'bg-[#0B1220]/70 border-[#22314D]' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <span className="text-slate-500 shrink-0">Quick ask:</span>
          <button
            type="button"
            onClick={() => setInput('I need an ATS-optimized CV for senior roles.')}
            className={`px-2 py-0.5 rounded border text-nowrap transition-colors ${
              isDark
                ? 'bg-[#16233B] border-[#22314D] text-slate-300 hover:border-cyan-500/40'
                : 'bg-white border-slate-300 text-slate-700 hover:border-cyan-500'
            }`}
          >
            ATS Resume ($15)
          </button>
          <button
            type="button"
            onClick={() => setInput('What live sports and channels are in the IPTV VIP Pass?')}
            className={`px-2 py-0.5 rounded border text-nowrap transition-colors ${
              isDark
                ? 'bg-[#16233B] border-[#22314D] text-slate-300 hover:border-cyan-500/40'
                : 'bg-white border-slate-300 text-slate-700 hover:border-cyan-500'
            }`}
          >
            IPTV VIP Pass
          </button>
          <button
            type="button"
            onClick={() => setInput('How do you publish an Android AAB app on Google Play Console?')}
            className={`px-2 py-0.5 rounded border text-nowrap transition-colors ${
              isDark
                ? 'bg-[#16233B] border-[#22314D] text-slate-300 hover:border-cyan-500/40'
                : 'bg-white border-slate-300 text-slate-700 hover:border-cyan-500'
            }`}
          >
            Play Store ($25)
          </button>
        </div>

        {/* Input Form */}
        <form
          onSubmit={handleSend}
          className={`p-3 border-t flex items-center gap-2 ${
            isDark ? 'bg-[#0B1220] border-[#22314D]' : 'bg-white border-slate-200'
          }`}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe your technical need or project scope..."
            className={`flex-1 rounded-xl px-3.5 py-2 text-xs border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
              isDark
                ? 'bg-[#16233B] border-[#22314D] text-white placeholder-slate-500'
                : 'bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400'
            }`}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-colors disabled:opacity-40"
            title="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
