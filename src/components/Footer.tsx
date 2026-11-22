import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  ShieldCheck,
  Mail,
  Calendar,
  Github,
  Linkedin,
  Lock,
  Globe,
} from 'lucide-react';
import { SponsorSupportPanel } from './SponsorSupportPanel';
import { BrandLogo } from './BrandLogo';

export const Footer: React.FC = () => {
  const { theme, settings, t } = useApp();
  const isDark = theme === 'dark';

  return (
    <footer
      className={`border-t transition-colors mt-auto pb-20 md:pb-0 ${
        isDark
          ? 'bg-[#0B1220] border-[#22314D] text-[#8FA3C0]'
          : 'bg-[#F6F8FC] border-[#CBD5E1] text-[#475569]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Official Brand Logo & Tagline */}
          <div className="space-y-3">
            <Link to="/" className="inline-block">
              <BrandLogo size="md" />
            </Link>
            <p className="text-xs font-semibold text-[var(--color-accent)] tracking-wide">
              {t.tagline}
            </p>
            <p className="text-xs leading-relaxed text-[var(--color-muted)]">
              Professional automation, specialized digital engineering, ATS CV re-writing, and high-definition IPTV services.
            </p>
            <div className="flex items-center gap-2 text-xs text-[var(--color-success)] font-medium">
              <ShieldCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Verified remittances & SLA delivery</span>
            </div>
          </div>

          {/* Solution Categories */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3 text-[var(--color-text)]">
              Solutions
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/services?cat=M+R+S+Services" className="hover:text-[var(--color-accent)] transition-colors">
                  M R S Services (12 Solutions)
                </Link>
              </li>
              <li>
                <Link to="/services?cat=Gravatar+Services" className="hover:text-[var(--color-accent)] transition-colors">
                  Gravatar Identity & Domain Mapping
                </Link>
              </li>
              <li>
                <Link to="/iptv" className="hover:text-[var(--color-accent)] transition-colors">
                  M R S IPTV VIP Pass (1–12 Mo)
                </Link>
              </li>
              <li>
                <Link to="/services" className="hover:text-[var(--color-accent)] transition-colors">
                  Browse All 16 Solutions
                </Link>
              </li>
            </ul>
          </div>

          {/* Public & Legal */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3 text-[var(--color-text)]">
              Information & Terms
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/about" className="hover:text-[var(--color-accent)] transition-colors">
                  About Operations & Skills
                </Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-[var(--color-accent)] transition-colors">
                  Frequently Asked Questions
                </Link>
              </li>
              <li>
                <Link to="/tools" className="font-medium hover:text-pink-400 transition-colors">
                  Free Tools Hub (ATS, DNS, Proofreader)
                </Link>
              </li>
              <li>
                <Link to="/status" className="hover:text-[var(--color-accent)] transition-colors">
                  System Status & Health
                </Link>
              </li>
              <li>
                <Link to="/content-policy" className="hover:text-[var(--color-accent)] transition-colors">
                  Content Policy & Prohibited Services
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-[var(--color-accent)] transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-[var(--color-accent)] transition-colors">
                  Privacy Policy & Data Isolation
                </Link>
              </li>
              <li>
                <Link to="/refund" className="hover:text-[var(--color-accent)] transition-colors">
                  Refund & Cancellation Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Direct Operations Desk & Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-3 text-[var(--color-text)]">
              Executive Operations Desk
            </h4>
            <div className="space-y-2.5 text-xs">
              <a
                href={`mailto:${settings.ownerEmail}`}
                className="flex items-center gap-2 hover:text-[var(--color-accent)] transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-[var(--color-accent)] shrink-0" />
                <span>{settings.ownerEmail}</span>
              </a>
              <a
                href={settings.calendlyUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 hover:text-[var(--color-accent)] transition-colors"
              >
                <Calendar className="w-3.5 h-3.5 text-[var(--color-accent)] shrink-0" />
                <span>{t.bookCall}</span>
              </a>
              <a
                href={settings.githubUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 hover:text-[var(--color-accent)] transition-colors"
              >
                <Github className="w-3.5 h-3.5 text-[var(--color-accent)] shrink-0" />
                <span>GitHub (@mrmahbubur)</span>
              </a>
              <a
                href={settings.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 hover:text-[var(--color-accent)] transition-colors"
              >
                <Linkedin className="w-3.5 h-3.5 text-[var(--color-accent)] shrink-0" />
                <span>LinkedIn (@mrmahbubur)</span>
              </a>
              <a
                href={settings.gravatarUrl || 'https://gravatar.com/mrxshahin'}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 hover:text-pink-400 transition-colors"
              >
                <Globe className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                <span>Gravatar (mrxshahin)</span>
              </a>
            </div>

            <div className="mt-4 pt-3 border-t border-[var(--color-border)]">
              <Link
                to="/portal"
                className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-[var(--color-accent)] hover:underline"
              >
                <Lock className="w-3 h-3" />
                <span>Client ID + PIN Portal →</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Accepted Payment Methods Strip (clean typography) */}
        <div className="pt-6 border-t border-[var(--color-border)] flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[var(--color-text)]">Payment Methods:</span>
            <span>bKash Personal</span>
            <span aria-hidden="true">·</span>
            <span>Nagad Personal</span>
            <span aria-hidden="true">·</span>
            <span>Payoneer</span>
            <span aria-hidden="true">·</span>
            <span>Skrill</span>
            {settings.cryptoEnabled && (
              <>
                <span aria-hidden="true">·</span>
                <span>Binance Pay</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-[var(--color-muted)]">
            <span>Coordinated by Camellia, M R S AI assistant</span>
            <span aria-hidden="true">·</span>
            <p>© {new Date().getFullYear()} M R S. {t.footerRights}</p>
          </div>
        </div>

        <SponsorSupportPanel compact />
      </div>
    </footer>
  );
};
