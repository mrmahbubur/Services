import React from 'react';
import { ExternalLink, HeartHandshake, Sparkles } from 'lucide-react';
import { SPONSOR_SUPPORT_LINKS, SponsorAdItem } from '../data/sponsorsData';
import { useApp } from '../context/AppContext';

interface SponsorSupportPanelProps {
  placement?: 'free_tools' | 'about' | 'all';
  compact?: boolean;
  title?: string;
  subtitle?: string;
}

export const SponsorSupportPanel: React.FC<SponsorSupportPanelProps> = ({
  placement = 'all',
  compact = false,
  title = 'Sponsored Partners Supporting Free M R S Tools',
  subtitle = 'Visiting our verified sponsors keeps the ATS checker, DNS lookup, proofreader, and service matchmaker completely free.',
}) => {
  const { theme } = useApp();
  const isDark = theme === 'dark';

  const items: SponsorAdItem[] =
    placement === 'all'
      ? SPONSOR_SUPPORT_LINKS
      : SPONSOR_SUPPORT_LINKS.filter((s) => s.placement === placement || (placement === 'free_tools' && s.placement === 'about'));

  if (compact) {
    return (
      <div className={`pt-4 border-t space-y-2.5 ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className={`text-[11px] font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            <HeartHandshake className="w-3.5 h-3.5 text-pink-500" />
            Sponsored Partner Links (Keeps M R S Free Tools Online)
          </span>
          <span className="text-[10px] font-mono text-slate-500">Sponsored · External Partners</span>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px]">
          {SPONSOR_SUPPORT_LINKS.map((item) => (
            <a
              key={item.id}
              href={item.url}
              target="_blank"
              rel="sponsored noopener noreferrer"
              className={`px-2.5 py-1 rounded-lg border transition-colors inline-flex items-center gap-1 ${
                isDark
                  ? 'bg-[#111B2E] border-[#22314D] text-slate-300 hover:border-cyan-500/50 hover:text-cyan-300'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-cyan-500 hover:text-cyan-700'
              }`}
              title={`${item.title} (${item.category})`}
            >
              <span>{item.title}</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          ))}
        </div>
      </div>
    );
  }

  return (
    <section
      aria-label="Sponsored Support Partners"
      className={`p-5 sm:p-6 rounded-2xl border space-y-4 ${
        isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200 shadow-sm'
      }`}
    >
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b ${
        isDark ? 'border-slate-800/60' : 'border-slate-200'
      }`}>
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-pink-500 shrink-0" />
            <h3 className="font-heading font-bold text-sm sm:text-base text-inherit">{title}</h3>
          </div>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{subtitle}</p>
        </div>
        <span className={`text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded border shrink-0 self-start sm:self-center font-semibold ${
          isDark ? 'border-pink-500/30 bg-pink-500/10 text-pink-300' : 'border-pink-200 bg-pink-50 text-pink-700'
        }`}>
          Sponsored · Support Free Access
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
        {items.map((ad) => (
          <a
            key={ad.id}
            href={ad.url}
            target="_blank"
            rel="sponsored noopener noreferrer"
            className={`group p-4 rounded-xl border flex flex-col justify-between gap-3 transition-all ${
              isDark
                ? 'bg-[#16233B]/70 border-[#22314D] hover:border-cyan-500/50 hover:bg-[#16233B]'
                : 'bg-slate-50 border-slate-200 hover:border-cyan-500 hover:bg-white'
            }`}
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-500 font-semibold">
                  {ad.category}
                </span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-500 transition-colors" />
              </div>
              <h4 className={`font-heading font-bold text-sm transition-colors ${
                isDark ? 'text-white group-hover:text-cyan-300' : 'text-slate-900 group-hover:text-cyan-700'
              }`}>
                {ad.title}
              </h4>
              <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{ad.description}</p>
            </div>
            <div className={`pt-2 border-t flex items-center justify-between text-[11px] font-semibold text-pink-500 ${
              isDark ? 'border-slate-800/40 group-hover:text-pink-300' : 'border-slate-200 group-hover:text-pink-700'
            }`}>
              <span>{ad.ctaLabel}</span>
              <span className="font-mono text-[10px] text-slate-500">rel="sponsored"</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
};
