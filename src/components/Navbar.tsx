import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  Sun,
  Moon,
  Menu,
  X,
  Key,
  LogOut,
  Tv,
  SlidersHorizontal,
  Wrench,
} from 'lucide-react';
import { CamelliaAvatar } from '../services/camelliaService';
import { BrandLogo } from './BrandLogo';

export const Navbar: React.FC = () => {
  const {
    theme,
    toggleTheme,
    currency,
    toggleCurrency,
    language,
    toggleLanguage,
    t,
    services,
    currentClient,
    logoutClient,
    isAdmin,
    openConcierge,
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const isDark = theme === 'dark';
  const isActive = (path: string) => location.pathname === path;

  return (
    <header
      className={`sticky top-0 z-40 border-b backdrop-blur-md transition-colors ${
        isDark
          ? 'bg-[#0B1220]/90 border-[#22314D] text-[#E6EDF7]'
          : 'bg-[#FFFFFF]/90 border-[#CBD5E1] text-[#0B1220]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Official Brand SVG from /public/brand/logo/ */}
        <Link
          to="/"
          className="inline-flex items-center shrink-0 min-h-[44px]"
          aria-label="M R S Home"
        >
          <BrandLogo size="sm" />
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
          <Link
            to="/"
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-[var(--color-accent)] ${
              isActive('/') ? 'text-[var(--color-accent)] font-semibold' : 'text-[var(--color-muted)]'
            }`}
          >
            {t.nav.home}
          </Link>
          <Link
            to="/services"
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-[var(--color-accent)] ${
              isActive('/services') ? 'text-[var(--color-accent)] font-semibold' : 'text-[var(--color-muted)]'
            }`}
          >
            {t.nav.services} ({services.filter((s) => s.active).length})
          </Link>
          <Link
            to="/tools"
            className={`whitespace-nowrap shrink-0 flex items-center gap-1 transition-colors hover:text-[var(--color-accent)] ${
              isActive('/tools') ? 'text-[var(--color-accent)] font-semibold' : 'text-[var(--color-muted)]'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 text-pink-400" aria-hidden="true" />
            <span>{t.nav.tools}</span>
          </Link>
          <Link
            to="/portal"
            className={`whitespace-nowrap shrink-0 flex items-center gap-1.5 transition-colors hover:text-[var(--color-accent)] ${
              isActive('/portal') ? 'text-[var(--color-accent)] font-semibold' : 'text-[var(--color-muted)]'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-[var(--color-accent)]" aria-hidden="true" />
            <span>{t.nav.workspace}</span>
          </Link>
          <Link
            to="/iptv"
            className={`whitespace-nowrap shrink-0 flex items-center gap-1 transition-colors hover:text-[var(--color-accent)] ${
              isActive('/iptv') ? 'text-[var(--color-accent)] font-semibold' : 'text-[var(--color-muted)]'
            }`}
          >
            <Tv className="w-3.5 h-3.5 text-[var(--color-accent)]" aria-hidden="true" />
            <span>{t.nav.iptv}</span>
          </Link>
          <Link
            to="/about"
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-[var(--color-accent)] ${
              isActive('/about') ? 'text-[var(--color-accent)] font-semibold' : 'text-[var(--color-muted)]'
            }`}
          >
            {t.nav.about}
          </Link>
          <Link
            to="/faq"
            className={`whitespace-nowrap shrink-0 transition-colors hover:text-[var(--color-accent)] ${
              isActive('/faq') ? 'text-[var(--color-accent)] font-semibold' : 'text-[var(--color-muted)]'
            }`}
          >
            {t.nav.faq}
          </Link>
        </nav>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Camellia Quick Trigger */}
          <button
            type="button"
            onClick={() => openConcierge()}
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[40px] rounded-[10px] border border-pink-500/40 bg-pink-500/10 text-pink-300 hover:bg-pink-500/20 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
            title="Ask Camellia (AI Assistant)"
          >
            <CamelliaAvatar size={18} />
            <span>{t.askAi}</span>
          </button>

          {/* Currency Switcher */}
          <button
            type="button"
            onClick={toggleCurrency}
            className={`hidden sm:inline-flex items-center px-2.5 py-1.5 min-h-[40px] rounded-[10px] text-xs font-mono font-bold border transition-colors whitespace-nowrap shrink-0 ${
              isDark
                ? 'bg-[#16233B] border-[#22314D] text-[#E6EDF7] hover:border-[#22D3EE]'
                : 'bg-[#EEF2F9] border-[#CBD5E1] text-[#0B1220] hover:border-[#0E7490]'
            }`}
            title="Toggle Currency (USD / BDT)"
          >
            {currency === 'USD' ? '$ USD' : '৳ BDT'}
          </button>

          {/* Language Switcher (EN / BN) */}
          <button
            type="button"
            onClick={toggleLanguage}
            className={`hidden sm:inline-flex items-center px-2.5 py-1.5 min-h-[40px] rounded-[10px] text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
              isDark
                ? 'bg-[#16233B] border-[#22314D] text-[#E6EDF7] hover:border-[#22D3EE]'
                : 'bg-[#EEF2F9] border-[#CBD5E1] text-[#0B1220] hover:border-[#0E7490]'
            }`}
            title="Toggle Language (English / বাংলা)"
          >
            {language === 'en' ? 'EN' : 'বাং'}
          </button>

          {/* Theme Switcher */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`min-h-[44px] min-w-[44px] sm:min-h-[40px] sm:min-w-[40px] inline-flex items-center justify-center rounded-[10px] border transition-colors shrink-0 ${
              isDark
                ? 'bg-[#16233B] border-[#22314D] text-[#E6EDF7] hover:border-[#22D3EE]'
                : 'bg-[#EEF2F9] border-[#CBD5E1] text-[#0B1220] hover:border-[#0E7490]'
            }`}
            aria-label="Toggle Dark / Light Theme"
            title="Toggle Dark / Light Theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-[#F59E0B]" /> : <Moon className="w-4 h-4 text-[#0B1220]" />}
          </button>

          {/* Admin Desk Link when Signed In */}
          {isAdmin && (
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[40px] rounded-[10px] bg-[#34D399]/10 border border-[#34D399]/35 text-[var(--color-success)] text-xs font-bold hover:bg-[#34D399]/20 transition-colors whitespace-nowrap shrink-0"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">{t.nav.admin}</span>
            </Link>
          )}

          {/* Client Portal CTA */}
          {currentClient ? (
            <div className="hidden sm:flex items-center gap-1.5">
              <Link
                to="/portal"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[40px] rounded-[10px] bg-[#22D3EE]/10 border border-[#22D3EE]/40 text-[var(--color-accent)] hover:bg-[#22D3EE]/20 text-xs font-bold font-mono transition-colors whitespace-nowrap shrink-0"
              >
                <Key className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{currentClient.clientId}</span>
              </Link>
              <button
                type="button"
                onClick={logoutClient}
                className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-[10px] border border-[var(--color-border)] hover:text-[var(--color-danger)] text-[var(--color-muted)]"
                title="Log Out Client"
                aria-label="Log Out Client"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <Link
              to="/portal"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[40px] rounded-[10px] bg-[#22D3EE] hover:bg-[#06B6D4] text-[#0B1220] font-bold text-xs transition-colors whitespace-nowrap shrink-0"
            >
              <Key className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{t.clientPortal}</span>
            </Link>
          )}

          {/* Mobile Menu Hamburger Toggle (min 44x44px) */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
            className={`md:hidden min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-[10px] border transition-colors ${
              isDark ? 'border-[#22314D] text-[#E6EDF7]' : 'border-[#CBD5E1] text-[#0B1220]'
            }`}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer (360px+ friendly & scrollable) */}
      {mobileMenuOpen && (
        <div
          className={`md:hidden border-b p-4 space-y-3 transition-colors max-h-[calc(100dvh-4rem)] overflow-y-auto ${
            isDark ? 'bg-[#0B1220] border-[#22314D]' : 'bg-[#FFFFFF] border-[#CBD5E1]'
          }`}
        >
          <div className="grid grid-cols-2 gap-2 text-xs font-medium">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`p-2.5 rounded-[10px] border min-h-[44px] flex items-center ${
                isActive('/')
                  ? 'border-[#22D3EE]/50 bg-[#22D3EE]/10 text-[var(--color-accent)] font-bold'
                  : 'border-[var(--color-border)] text-[var(--color-text)]'
              }`}
            >
              {t.nav.home}
            </Link>
            <Link
              to="/services"
              onClick={() => setMobileMenuOpen(false)}
              className={`p-2.5 rounded-[10px] border min-h-[44px] flex items-center ${
                isActive('/services')
                  ? 'border-[#22D3EE]/50 bg-[#22D3EE]/10 text-[var(--color-accent)] font-bold'
                  : 'border-[var(--color-border)] text-[var(--color-text)]'
              }`}
            >
              {t.nav.services} ({services.filter((s) => s.active).length})
            </Link>
            <Link
              to="/portal"
              onClick={() => setMobileMenuOpen(false)}
              className={`p-2.5 rounded-[10px] border min-h-[44px] flex items-center gap-2 ${
                isActive('/portal')
                  ? 'border-[#22D3EE]/50 bg-[#22D3EE]/10 text-[var(--color-accent)] font-bold'
                  : 'border-[var(--color-border)] text-[var(--color-text)]'
              }`}
            >
              <Key className="w-4 h-4 shrink-0 text-[var(--color-accent)]" />
              <span>{t.clientPortal}</span>
            </Link>
            <Link
              to="/payment"
              onClick={() => setMobileMenuOpen(false)}
              className={`p-2.5 rounded-[10px] border min-h-[44px] flex items-center ${
                isActive('/payment')
                  ? 'border-[#22D3EE]/50 bg-[#22D3EE]/10 text-[var(--color-accent)] font-bold'
                  : 'border-[var(--color-border)] text-[var(--color-text)]'
              }`}
            >
              {t.nav.pay}
            </Link>
            <Link
              to="/iptv"
              onClick={() => setMobileMenuOpen(false)}
              className={`p-2.5 rounded-[10px] border min-h-[44px] flex items-center ${
                isActive('/iptv')
                  ? 'border-[#22D3EE]/50 bg-[#22D3EE]/10 text-[var(--color-accent)] font-bold'
                  : 'border-[var(--color-border)] text-[var(--color-text)]'
              }`}
            >
              M R S {t.nav.iptv}
            </Link>
            <Link
              to="/tools"
              onClick={() => setMobileMenuOpen(false)}
              className={`p-2.5 rounded-[10px] border min-h-[44px] flex items-center gap-1.5 ${
                isActive('/tools')
                  ? 'border-pink-500/50 bg-pink-500/10 text-pink-400 font-bold'
                  : 'border-[var(--color-border)] text-[var(--color-text)]'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-pink-400 shrink-0" />
              <span>{t.nav.tools}</span>
            </Link>
            <Link
              to="/about"
              onClick={() => setMobileMenuOpen(false)}
              className={`p-2.5 rounded-[10px] border min-h-[44px] flex items-center ${
                isActive('/about')
                  ? 'border-[#22D3EE]/50 bg-[#22D3EE]/10 text-[var(--color-accent)] font-bold'
                  : 'border-[var(--color-border)] text-[var(--color-text)]'
              }`}
            >
              {t.nav.about}
            </Link>
            <Link
              to="/faq"
              onClick={() => setMobileMenuOpen(false)}
              className={`p-2.5 rounded-[10px] border min-h-[44px] flex items-center ${
                isActive('/faq')
                  ? 'border-[#22D3EE]/50 bg-[#22D3EE]/10 text-[var(--color-accent)] font-bold'
                  : 'border-[var(--color-border)] text-[var(--color-text)]'
              }`}
            >
              {t.nav.faq}
            </Link>
            <Link
              to="/status"
              onClick={() => setMobileMenuOpen(false)}
              className={`p-2.5 rounded-[10px] border min-h-[44px] flex items-center ${
                isActive('/status')
                  ? 'border-[#34D399]/50 bg-[#34D399]/10 text-[var(--color-success)] font-bold'
                  : 'border-[var(--color-border)] text-[var(--color-text)]'
              }`}
            >
              {t.nav.status}
            </Link>
            <Link
              to="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className={`p-2.5 rounded-[10px] border min-h-[44px] flex items-center ${
                isActive('/admin')
                  ? 'border-[#34D399]/50 bg-[#34D399]/10 text-[var(--color-success)] font-bold'
                  : 'border-[var(--color-border)] text-[var(--color-text)]'
              }`}
            >
              {t.nav.admin}
            </Link>
          </div>

          <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-elevated)] text-xs font-semibold min-h-[44px]"
            >
              {isDark ? <Sun className="w-4 h-4 text-[#F59E0B]" /> : <Moon className="w-4 h-4" />}
              <span>{isDark ? 'Dark' : 'Light'}</span>
            </button>

            <button
              type="button"
              onClick={toggleCurrency}
              className="px-3 py-2 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-elevated)] font-mono text-xs font-bold text-[var(--color-accent)] min-h-[44px]"
            >
              {currency === 'USD' ? '$ USD' : '৳ BDT'}
            </button>

            <button
              type="button"
              onClick={toggleLanguage}
              className="px-3 py-2 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-elevated)] text-xs font-semibold min-h-[44px]"
            >
              {language === 'en' ? 'EN' : 'বাং'}
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              openConcierge();
            }}
            className="inline-flex items-center gap-2 px-3 py-2.5 rounded-[10px] border border-pink-500/40 bg-pink-500/10 text-pink-300 text-xs font-semibold w-full justify-center min-h-[44px]"
          >
            <CamelliaAvatar size={20} />
            <span>{t.askAi}</span>
          </button>
        </div>
      )}
    </header>
  );
};
