import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ChevronDown, ChevronUp, HelpCircle, Bot, ArrowRight } from 'lucide-react';
import { CamelliaAvatar } from '../services/camelliaService';

interface FAQItem {
  question: string;
  answer: string;
  category: 'General' | 'Payments' | 'Client ID & Portal' | 'IPTV & Tech';
}

const FAQ_DATA: FAQItem[] = [
  {
    category: 'Client ID & Portal',
    question: 'How do I obtain a Client ID and PIN to access the portal?',
    answer: 'There is no public open registration. When you submit your first order or quote request, our system server-side generates a unique Client ID in the format MRS-YYMM-XXXX along with a one-time 6-digit access PIN. Save these credentials to log in at /portal anytime.',
  },
  {
    category: 'Client ID & Portal',
    question: 'What happens if I lose my 6-digit access PIN?',
    answer: 'Because PINs are cryptographically hashed using SHA-256 for zero-trust client isolation, plain PINs cannot be viewed by anyone. If lost, you can contact the owner desk (mr216873@gmail.com) to request an authorized PIN reset.',
  },
  {
    category: 'Payments',
    question: 'Why does bKash / Nagad state "Send Money only"?',
    answer: 'Our bKash account (01810853282) and Nagad account (01810853282) are official personal accounts. Using "Make Payment" or merchant counters will fail. You must use "Send Money" from your mobile app and enter your Order ID in the reference or note field.',
  },
  {
    category: 'Payments',
    question: 'How long does payment verification take?',
    answer: 'Payments are personally audited by the owner against incoming statement ledgers. Typical verification takes 15–45 minutes during operational hours (SLA up to 4 hours). Once verified, your order status changes to "In progress" and deliverables unlock upon final settlement.',
  },
  {
    category: 'Payments',
    question: 'How do international clients outside Bangladesh pay?',
    answer: 'For clients outside Bangladesh, quotes are in USD and we accept Binance (UID: 38927942 / ID: mrxshahn via internal Binance Pay), Payoneer (Customer ID: 108003450), and Skrill (Customer ID: 407108385). Official accounts are shown on your payment screen after quote acceptance.',
  },
  {
    category: 'IPTV & Tech',
    question: 'What devices are compatible with M R S IPTV VIP Pass?',
    answer: 'Virtually all devices: Smart TVs (Samsung, LG, Sony), Firestick, Android TV boxes, Apple TV, iPhone/iPad, Android mobile, MAG boxes, and Windows/Mac using TiviMate, IPTV Smarters, or VLC.',
  },
  {
    category: 'IPTV & Tech',
    question: 'Where do I find my IPTV M3U link and Xtream credentials after purchase?',
    answer: 'As soon as your payment is verified by the owner, your private credentials (Server URL, Username, Password, and M3U Plus URL) will appear in your Client Portal under the "IPTV Pass" tab with a secure reveal toggle.',
  },
  {
    category: 'General',
    question: 'Can I request a custom SLA or volume discount?',
    answer: 'Yes. For multi-service bundles, ongoing monthly retainers, or enterprise scopes, schedule a consultation on Calendly (calendly.com/mrxshahin) or message the owner desk directly.',
  },
];

export const FAQPage: React.FC = () => {
  const { theme, openConcierge } = useApp();
  const isDark = theme === 'dark';

  const [openIndexes, setOpenIndexes] = useState<Record<number, boolean>>({ 0: true, 2: true });

  const toggleAccordion = (idx: number) => {
    setOpenIndexes((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className={`min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-10 ${isDark ? 'text-[#E6EDF7]' : 'text-[#0B1220]'}`}>
      
      {/* Title */}
      <div className="text-center space-y-2">
        <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider block">
          Knowledge Base & Operational Answers
        </span>
        <h1 className="font-heading font-extrabold text-2xl sm:text-4xl tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Clear answers regarding client onboarding, payment verification, and service delivery.
        </p>
      </div>

      {/* Accordion List */}
      <div className="space-y-3">
        {FAQ_DATA.map((item, idx) => {
          const isOpen = openIndexes[idx];
          return (
            <div
              key={idx}
              className={`rounded-2xl border overflow-hidden transition-all duration-150 ${
                isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleAccordion(idx)}
                className="w-full p-5 text-left flex items-center justify-between gap-4 font-heading font-bold text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 uppercase">
                    {item.category}
                  </span>
                  <span className="text-inherit">{item.question}</span>
                </div>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-cyan-400 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                )}
              </button>

              {isOpen && (
                <div className={`px-5 pb-5 pt-2 text-xs leading-relaxed border-t ${
                  isDark ? 'text-slate-300 border-slate-800/40' : 'text-slate-700 border-slate-200'
                }`}>
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Advisor Strip */}
      <div className={`p-6 rounded-2xl border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs ${
        isDark ? 'bg-pink-500/10 border-pink-500/30' : 'bg-pink-50 border-pink-200'
      }`}>
        <div className="flex items-center gap-3">
          <CamelliaAvatar size={36} />
          <div>
            <h4 className={`font-bold ${isDark ? 'text-pink-300' : 'text-pink-800'}`}>Have a question not listed here?</h4>
            <p className={`mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Consult Camellia · M R S AI Assistant, or book a strategy call.</p>
          </div>
        </div>

        <button
          onClick={() => openConcierge()}
          className="px-5 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors shadow-sm min-h-[44px]"
        >
          <CamelliaAvatar size={16} />
          <span>Ask Camellia</span>
        </button>
      </div>

    </div>
  );
};
