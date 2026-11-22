import React, { useState } from 'react';
import { MessageSquare, Mail, Phone, Calendar, Bot, X, ExternalLink } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CamelliaAvatar } from '../services/camelliaService';

export const FloatingContact: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { settings, openConcierge, theme } = useApp();
  const isDark = theme === 'dark';

  const itemCls = `flex items-center justify-between p-2 rounded-xl border transition-colors ${
    isDark
      ? 'bg-slate-900/60 border-slate-800/80 hover:border-cyan-500/40 text-slate-200'
      : 'bg-slate-50 border-slate-200 hover:border-cyan-500/60 text-slate-800'
  }`;

  return (
    <div className="fixed bottom-16 right-4 md:bottom-5 md:right-5 z-40 flex flex-col items-end">
      {/* Expanded Menu */}
      {open && (
        <div
          className={`mb-3 w-64 max-w-[calc(100vw-2rem)] max-h-[75dvh] overflow-y-auto rounded-2xl shadow-2xl p-4 space-y-3 border animate-in fade-in slide-in-from-bottom duration-200 ${
            isDark ? 'bg-[#111B2E] border-cyan-500/30 text-[#E6EDF7]' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div className={`flex items-center justify-between border-b pb-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <span className={`text-xs font-bold font-heading ${isDark ? 'text-white' : 'text-slate-900'}`}>Direct Channels</span>
            <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 font-semibold">
              Online
            </span>
          </div>

          <div className="space-y-1.5 text-xs">
            <a
              href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}?text=Hello%20MRS%20team,%20I%20have%20an%20inquiry.`}
              target="_blank"
              rel="noopener noreferrer"
              className={itemCls}
            >
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-emerald-500" />
                <span>WhatsApp Desk</span>
              </div>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            <a
              href="https://t.me/mrxshahin"
              target="_blank"
              rel="noopener noreferrer"
              className={itemCls}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-sky-500" />
                <span>Telegram Desk</span>
              </div>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            <a
              href={`mailto:${settings.ownerEmail}?subject=Project%20Inquiry%20via%20MRS%20Platform`}
              className={itemCls}
            >
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-cyan-500" />
                <span>Email Owner</span>
              </div>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            <a
              href={settings.calendlyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={itemCls}
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-violet-500" />
                <span>Book 15m Call</span>
              </div>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            <button
              onClick={() => {
                setOpen(false);
                openConcierge();
              }}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl border transition-colors shadow-sm ${
                isDark
                  ? 'bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 border-pink-500/40'
                  : 'bg-pink-50 hover:bg-pink-100 text-pink-700 border-pink-200'
              }`}
            >
              <div className="flex items-center gap-2">
                <CamelliaAvatar size={18} />
                <span className="font-semibold text-xs">Start with Camellia</span>
              </div>
              <span className="text-[10px] font-mono text-pink-500 font-bold">M R S</span>
            </button>
          </div>
        </div>
      )}

      {/* Main floating trigger toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold flex items-center justify-center shadow-lg shadow-cyan-500/30 hover:scale-105 active:scale-95 transition-transform"
        aria-label="Contact channels"
      >
        {open ? <X className="w-5 h-5 text-slate-950" /> : <MessageSquare className="w-5 h-5 text-slate-950" />}
      </button>
    </div>
  );
};
