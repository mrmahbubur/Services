import React, { useState, useEffect } from 'react';
import { Cookie, Shield, X, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

export const CookieNotice: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('mrs_cookie_consent');
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = (type: 'all' | 'essential') => {
    localStorage.setItem('mrs_cookie_consent', type);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-6 sm:right-auto sm:max-w-md z-40 animate-in fade-in slide-in-from-bottom duration-300">
      <div className="bg-[#111B2E] border border-cyan-500/30 rounded-2xl p-5 shadow-2xl backdrop-blur-md text-[#E6EDF7] space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
              <Cookie className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold font-heading text-white">Privacy & Isolation Notice</h4>
              <p className="text-[11px] text-slate-400">Zero tracking cookies. Only essential session state.</p>
            </div>
          </div>
          <button
            onClick={() => handleAccept('essential')}
            className="text-slate-500 hover:text-slate-300 p-1"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[11px] text-slate-300 leading-relaxed">
          We use strict client cryptographic isolation to keep your Client ID and project deliverables secure. We never track your activity across third-party websites.{' '}
          <Link to="/privacy" className="text-cyan-400 hover:underline">
            Read Privacy Policy
          </Link>.
        </p>

        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => handleAccept('all')}
            className="flex-1 py-1.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Accept Essential</span>
          </button>
          <button
            onClick={() => handleAccept('essential')}
            className="py-1.5 px-3 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs transition-colors"
          >
            Preferences
          </button>
        </div>
      </div>
    </div>
  );
};
