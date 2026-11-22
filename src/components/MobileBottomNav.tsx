import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Grid, CreditCard, Key, Tv } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const { t, theme } = useApp();
  const isDark = theme === 'dark';

  const items = [
    { path: '/', label: t.nav.home, Icon: Home },
    { path: '/services', label: t.nav.services, Icon: Grid },
    { path: '/payment', label: t.nav.pay, Icon: CreditCard },
    { path: '/iptv', label: t.nav.iptv, Icon: Tv },
    { path: '/portal', label: t.nav.workspace, Icon: Key },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className={`md:hidden fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-md ${
        isDark
          ? 'bg-[#0B1220]/95 border-[#22314D] text-[#8FA3C0]'
          : 'bg-[#FFFFFF]/95 border-[#CBD5E1] text-[#475569]'
      }`}
    >
      <div className="grid grid-cols-5 h-14 max-w-full">
        {items.map(({ path, label, Icon }) => {
          const active =
            path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(path) ||
                (path === '/payment' && location.pathname.startsWith('/pay'));
          return (
            <Link
              key={path}
              to={path}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold whitespace-nowrap transition-colors ${
                active
                  ? isDark
                    ? 'text-[#22D3EE]'
                    : 'text-[#0E7490]'
                  : 'hover:text-[var(--color-text)]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span className="truncate max-w-[68px]">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
