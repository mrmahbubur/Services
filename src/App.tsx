import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { MobileBottomNav } from './components/MobileBottomNav';
import { CamelliaModal } from './components/CamelliaModal';
import { CookieNotice } from './components/CookieNotice';
import { FloatingContact } from './components/FloatingContact';
import { ShortLinkRedirect, DirectOrderRedirect } from './components/ServiceRedirector';
import { HomePage } from './pages/HomePage';
import { ServicesPage } from './pages/ServicesPage';
import { ServiceDetailPage } from './pages/ServiceDetailPage';
import { RequestOrderPage } from './pages/RequestOrderPage';
import { PaymentPage } from './pages/PaymentPage';
import { ClientPortalPage } from './pages/ClientPortalPage';
import { IPTVPage } from './pages/IPTVPage';
import { AboutContactPage } from './pages/AboutContactPage';
import { FAQPage } from './pages/FAQPage';
import { LegalPage } from './pages/LegalPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { FreeToolsPage } from './pages/FreeToolsPage';
import { StatusPage } from './pages/StatusPage';
import { ContentPolicyPage } from './pages/ContentPolicyPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const ToastNotification: React.FC = () => {
  const { toast, theme } = useApp();
  const isDark = theme === 'dark';
  if (!toast) return null;

  return (
    <div className="fixed inset-x-4 bottom-20 sm:inset-x-auto sm:bottom-5 sm:right-20 z-50 pointer-events-none">
      <div
        className={`mrs-card pointer-events-auto p-4 flex items-center gap-3 text-xs sm:max-w-sm ml-auto ${
          isDark
            ? toast.type === 'success'
              ? 'border-[#34D399]/50 text-[#34D399]'
              : toast.type === 'error'
              ? 'border-[#FB7185]/50 text-[#FB7185]'
              : toast.type === 'warning'
              ? 'border-[#F59E0B]/50 text-[#F59E0B]'
              : 'border-[#22D3EE]/50 text-[#22D3EE]'
            : toast.type === 'success'
            ? 'border-[#047857]/40 text-[#047857]'
            : toast.type === 'error'
            ? 'border-[#BE123C]/40 text-[#BE123C]'
            : toast.type === 'warning'
            ? 'border-[#B45309]/40 text-[#B45309]'
            : 'border-[#0E7490]/40 text-[#0E7490]'
        }`}
      >
        {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0" />}
        {toast.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0" />}
        {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 shrink-0" />}
        {toast.type === 'info' && <Info className="w-5 h-5 shrink-0" />}

        <div className="min-w-0">
          <div className="font-bold text-sm text-[var(--color-text)]">{toast.title}</div>
          <div className="mt-0.5 break-words text-[var(--color-muted)]">{toast.message}</div>
        </div>
      </div>
    </div>
  );
};

const OutOfOfficeBanner: React.FC = () => {
  const { settings, theme } = useApp();
  const isDark = theme === 'dark';
  if (!settings.outOfOffice?.active) return null;

  return (
    <div
      className={`border-b px-4 py-1.5 text-xs text-center flex items-center justify-center gap-2 ${
        isDark
          ? 'bg-[#22D3EE]/10 border-[#22D3EE]/30 text-[#22D3EE]'
          : 'bg-[#EEF2F9] border-[#CBD5E1] text-[#0E7490]'
      }`}
    >
      <Info className="w-3.5 h-3.5 shrink-0" />
      <span>
        {settings.outOfOffice?.note || (settings as any).outOfOfficeNotice || 'Operations notice: Owner desk is currently handling active queues. New orders will be triaged within 24 hours.'}
      </span>
    </div>
  );
};

const AppRoutes: React.FC = () => {
  const { theme } = useApp();
  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen flex flex-col transition-colors ${isDark ? 'bg-[#0B1220] text-[#E6EDF7]' : 'bg-[#F6F8FC] text-[#0B1220]'}`}>
      <OutOfOfficeBanner />
      <Navbar />
      <main className="flex-1 pb-16 md:pb-0">
        <Routes>
          <Route path="/" element={<HomePage />} />

          {/* Services & Permanent Links */}
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/services/category/:categorySlug" element={<ServicesPage />} />
          <Route path="/services/:id" element={<ServiceDetailPage />} />
          <Route path="/s/:serviceId" element={<ShortLinkRedirect />} />
          <Route path="/order/:serviceId" element={<DirectOrderRedirect />} />

          {/* Order Request Flow */}
          <Route path="/request" element={<RequestOrderPage />} />
          <Route path="/request/:id" element={<RequestOrderPage />} />

          {/* Payments & Invoices */}
          <Route path="/payment" element={<PaymentPage />} />
          <Route path="/payment/:orderId" element={<PaymentPage />} />
          <Route path="/pay" element={<PaymentPage />} />
          <Route path="/pay/:invoiceId" element={<PaymentPage />} />

          {/* Client Isolation Console */}
          <Route path="/portal" element={<ClientPortalPage />} />

          {/* IPTV */}
          <Route path="/iptv" element={<IPTVPage />} />
          <Route path="/iptv/guides" element={<IPTVPage />} />

          {/* Free Tools Hub */}
          <Route path="/tools" element={<FreeToolsPage />} />
          <Route path="/free-tools" element={<FreeToolsPage />} />

          {/* Public information */}
          <Route path="/about" element={<AboutContactPage />} />
          <Route path="/contact" element={<AboutContactPage />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/status" element={<StatusPage />} />

          {/* Legal Pages & Policies */}
          <Route path="/legal" element={<LegalPage />} />
          <Route path="/terms" element={<LegalPage />} />
          <Route path="/privacy" element={<LegalPage />} />
          <Route path="/refund" element={<LegalPage />} />
          <Route path="/acceptable-use" element={<LegalPage />} />
          <Route path="/content-policy" element={<ContentPolicyPage />} />
          <Route path="/iptv-terms" element={<LegalPage />} />

          {/* Admin Dashboard */}
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/payments" element={<AdminDashboardPage />} />
          <Route path="/admin/auto-verify" element={<AdminDashboardPage />} />

          {/* 404 Page */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
      <MobileBottomNav />
      <CamelliaModal />
      <FloatingContact />
      <CookieNotice />
      <ToastNotification />
    </div>
  );
};

export function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;
