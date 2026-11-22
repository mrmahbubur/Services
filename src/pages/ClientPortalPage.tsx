import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  Key,
  Lock,
  LogOut,
  Package,
  CreditCard,
  FileText,
  Tv,
  MessageSquare,
  Download,
  Printer,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Send,
  PlusCircle,
  Copy,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Sparkles,
  Layers,
} from 'lucide-react';
import { InvoicePrintModal } from '../components/InvoicePrintModal';
import { ServiceWorkspace } from '../components/ServiceWorkspace';
import { InvoiceRecord, OrderRecord, OrderStatus } from '../types';
import { CamelliaAvatar } from '../services/camelliaService';

export const ClientPortalPage: React.FC = () => {
  const {
    currentClient,
    loginClient,
    registerClient,
    changeClientPin,
    logoutClient,
    logoutAllDevices,
    clientOrders,
    clientPayments,
    clientSubscriptions,
    clientDeliverables,
    clientInvoices,
    clientMessages,
    sendMessage,
    approvePreview,
    requestRevision,
    reportProblem,
    showToast,
    theme,
    formatPrice,
    allClients,
    settings,
    t,
    refreshPortalData,
  } = useApp();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  // Login / Register mode state
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [clientIdInput, setClientIdInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regWhatsapp, setRegWhatsapp] = useState('');
  const [regCountry, setRegCountry] = useState('Bangladesh');
  const [regPin, setRegPin] = useState('');
  const [issuedCredentials, setIssuedCredentials] = useState<{ clientId: string; pin: string } | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  // Active portal tab
  const [activeTab, setActiveTab] = useState<
    'workspace' | 'orders' | 'payments' | 'deliverables' | 'iptv' | 'invoices' | 'messages'
  >('workspace');

  // Selected invoice for printable modal
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceRecord | null>(null);

  // Messages form
  const [msgInput, setMsgInput] = useState('');

  // IPTV credentials reveal toggle
  const [revealedCreds, setRevealedCreds] = useState<Record<string, boolean>>({});

  // Revision, dispute & security modals
  const [revisionModalDeliv, setRevisionModalDeliv] = useState<any | null>(null);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [problemModalOrderId, setProblemModalOrderId] = useState<string | null>(null);
  const [problemCategory, setProblemCategory] = useState<'scope_mismatch' | 'quality_issue' | 'delay' | 'other'>('scope_mismatch');
  const [problemDescription, setProblemDescription] = useState('');
  const [memoryModalOpen, setMemoryModalOpen] = useState(false);
  const [memoryPurged, setMemoryPurged] = useState(false);
  const [securityModalOpen, setSecurityModalOpen] = useState(false);
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinUpdateError, setPinUpdateError] = useState<string | null>(null);
  const [pinUpdating, setPinUpdating] = useState(false);

  // Activation code redemption state
  const [activationCodeInput, setActivationCodeInput] = useState('');
  const [redeemingCode, setRedeemingCode] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemResult, setRedeemResult] = useState<{ monthsPaid: number; expiresAt?: string; codeMask?: string; alreadyRedeemed?: boolean } | null>(null);

  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = activationCodeInput.trim();
    if (!trimmed || redeemingCode) return;
    setRedeemingCode(true);
    setRedeemError(null);
    setRedeemResult(null);
    try {
      const res = await fetch('/api/portal/activation/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setRedeemError(data.error || 'Could not redeem activation code.');
      } else {
        setRedeemResult({
          monthsPaid: data.monthsPaid,
          expiresAt: data.expiresAt,
          codeMask: data.codeMask,
          alreadyRedeemed: Boolean(data.alreadyRedeemed),
        });
        setActivationCodeInput('');
        await refreshPortalData();
        showToast('Activation Code Verified', `${data.monthsPaid}-month pass activated.`, 'success');
      }
    } catch (err: any) {
      setRedeemError(err?.message || 'Network error redeeming activation code.');
    } finally {
      setRedeemingCode(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientIdInput.trim() || !pinInput.trim()) {
      setLoginError('Please enter both your Client ID and 6-digit PIN.');
      return;
    }

    setLoggingIn(true);
    setLoginError(null);

    const res = await loginClient(clientIdInput.trim(), pinInput.trim());
    setLoggingIn(false);

    if (!res.success) {
      setLoginError(res.error || 'Authentication failed. Please verify your credentials.');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim()) {
      setLoginError('Full name and email are required.');
      return;
    }
    if (regPin.trim() && !/^\d{6}$/.test(regPin.trim())) {
      setLoginError('Custom PIN must be exactly 6 numeric digits (or leave blank to auto-generate).');
      return;
    }
    setLoggingIn(true);
    setLoginError(null);
    const res = await registerClient({
      name: regName.trim(),
      email: regEmail.trim(),
      whatsapp: regWhatsapp.trim(),
      country: regCountry.trim(),
      pin: regPin.trim() || undefined,
    });
    setLoggingIn(false);
    if (!res.success) {
      setLoginError(res.error || 'Could not create Client ID on server.');
      return;
    }
    if (res.client?.clientId && res.plainPin) {
      setIssuedCredentials({ clientId: res.client.clientId, pin: res.plainPin });
    }
  };

  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinUpdateError(null);
    if (!/^\d{6}$/.test(newPinInput.trim())) {
      setPinUpdateError('New PIN must be exactly 6 digits.');
      return;
    }
    if (newPinInput.trim() !== confirmPinInput.trim()) {
      setPinUpdateError('New PIN and confirmation do not match.');
      return;
    }
    setPinUpdating(true);
    const res = await changeClientPin(currentPinInput.trim(), newPinInput.trim());
    setPinUpdating(false);
    if (!res.success) {
      setPinUpdateError(res.error || 'Failed to update PIN.');
      return;
    }
    setCurrentPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');
    setSecurityModalOpen(false);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgInput.trim()) return;
    sendMessage(msgInput.trim());
    setMsgInput('');
  };

  const toggleRevealCreds = (id: string) => {
    setRevealedCreds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const downloadDeliverable = async (_content: string, filename: string, deliverableId?: string) => {
    if (!deliverableId) {
      showToast('Download Unavailable', 'No authoritative server deliverable ID found.', 'error');
      return;
    }
    try {
      const res = await fetch(`/api/deliverables/${deliverableId}/download`);
      if (res.status === 402) {
        showToast('Payment Required', 'Deliverables unlock automatically once payment is verified.', 'warning');
        return;
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        showToast('Download Failed', d.error || 'Could not retrieve deliverable file from server.', 'error');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      showToast('Download Error', e?.message || 'Network error retrieving deliverable.', 'error');
    }
  };

  // Status Stepper Helper
  const getStepperIndex = (status: OrderStatus): number => {
    switch (status) {
      case 'Pending': return 1;
      case 'Awaiting payment': return 2;
      case 'Payment submitted': return 3;
      case 'Verified': return 4;
      case 'In progress': return 4;
      case 'Delivered': return 5;
      default: return 1;
    }
  };

  // IF NOT AUTHENTICATED: Show Client ID + 6-Digit PIN Login Gate
  if (!currentClient) {
    return (
      <div className={`min-h-[80vh] flex flex-col items-center justify-center px-4 py-12 ${isDark ? 'text-[#E6EDF7]' : 'text-[#0B1220]'}`}>
        <div
          className={`w-full max-w-md p-8 rounded-2xl border shadow-2xl space-y-6 ${
            isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200'
          }`}
        >
          {/* Top Brand & Badge */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <Key className="w-6 h-6" />
            </div>
            <h2 className="font-heading font-extrabold text-2xl tracking-tight">
              Client Portal Sign In
            </h2>
            <p className="text-xs text-slate-400">
              Isolated workspace access via your unique Client ID & 6-digit PIN.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className={`grid grid-cols-2 p-1 rounded-xl border text-xs font-bold ${isDark ? 'bg-[#0B1220] border-[#22314D]' : 'bg-slate-100 border-slate-200'}`}>
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setLoginError(null);
              }}
              className={`py-2 rounded-lg transition-colors min-h-[40px] ${
                authMode === 'login'
                  ? 'bg-cyan-500 text-slate-950'
                  : isDark
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              Sign In (ID & PIN)
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setLoginError(null);
              }}
              className={`py-2 rounded-lg transition-colors min-h-[40px] ${
                authMode === 'register'
                  ? 'bg-cyan-500 text-slate-950'
                  : isDark
                  ? 'text-slate-400 hover:text-white'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              Create Client ID
            </button>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{loginError}</span>
            </div>
          )}

          {authMode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Client ID (Format: MRS-YYMM-XXXX)
                </label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={clientIdInput}
                    onChange={(e) => setClientIdInput(e.target.value)}
                    placeholder="e.g. MRS-2611-4821"
                    className={`w-full rounded-xl pl-9 pr-3 py-2.5 font-mono uppercase text-sm border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                      isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  6-Digit Access PIN
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="password"
                    required
                    maxLength={6}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                    placeholder="••••••"
                    className={`w-full rounded-xl pl-9 pr-3 py-2.5 font-mono tracking-widest text-sm border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                      isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Server-verified & rate-limited: 5 attempts before 15-minute lockout.
                </p>
              </div>

              <button
                type="submit"
                disabled={loggingIn}
                className="w-full py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-heading font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-md disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                <span>{loggingIn ? 'Authenticating...' : 'Enter Isolated Workspace'}</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Your full name"
                  className={`w-full rounded-xl px-3 py-2 text-sm border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                    isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className={`w-full rounded-xl px-3 py-2 text-sm border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                    isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">WhatsApp</label>
                  <input
                    type="text"
                    value={regWhatsapp}
                    onChange={(e) => setRegWhatsapp(e.target.value)}
                    placeholder="+880..."
                    className={`w-full rounded-xl px-3 py-2 text-xs border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                      isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Country</label>
                  <input
                    type="text"
                    value={regCountry}
                    onChange={(e) => setRegCountry(e.target.value)}
                    placeholder="Bangladesh"
                    className={`w-full rounded-xl px-3 py-2 text-xs border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                      isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Preferred 6-Digit PIN (optional — auto-generated on server if blank)
                </label>
                <input
                  type="password"
                  maxLength={6}
                  inputMode="numeric"
                  value={regPin}
                  onChange={(e) => setRegPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6 digits (or leave blank)"
                  className={`w-full rounded-xl px-3 py-2 font-mono tracking-widest text-sm border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                    isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              <button
                type="submit"
                disabled={loggingIn}
                className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-heading font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-md disabled:opacity-50"
              >
                <Key className="w-4 h-4" />
                <span>{loggingIn ? 'Issuing on Server...' : 'Generate Client ID & PIN on Server'}</span>
              </button>
            </form>
          )}

          <div className="text-center pt-2">
            <Link to="/services" className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold">
              Request a Service directly (auto-issues Client ID & PIN) →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // IF AUTHENTICATED: Show Full Client Dashboard
  return (
    <div className={`min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6 ${isDark ? 'text-[#E6EDF7]' : 'text-[#0B1220]'}`}>
      
      {/* Header Profile Bar */}
      <div
        className={`p-6 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-500 flex items-center justify-center font-bold text-lg font-mono shrink-0">
            {(currentClient.name || 'CL').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-heading font-bold text-lg text-inherit">{currentClient.name}</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 font-bold">
                Active Client
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-0.5">
              <span className="font-mono text-cyan-500 font-semibold">{currentClient.clientId}</span>
              <span className="hidden sm:inline">·</span>
              <span className="break-all">{currentClient.email}</span>
              <span className="hidden sm:inline">·</span>
              <span>{currentClient.country}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setMemoryModalOpen(true)}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors min-h-[40px] ${
              isDark ? 'border-pink-500/40 bg-pink-500/10 text-pink-300 hover:bg-pink-500/20' : 'border-pink-300 bg-pink-50 text-pink-700 hover:bg-pink-100'
            }`}
            title="View & manage what Camellia remembers about your account"
          >
            <CamelliaAvatar size={16} />
            <span className="hidden sm:inline">Camellia Memory</span>
          </button>

          <button
            onClick={() => setSecurityModalOpen(true)}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors min-h-[40px] ${
              isDark ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20' : 'border-cyan-300 bg-cyan-50 text-cyan-800 hover:bg-cyan-100'
            }`}
            title="Manage your 6-digit PIN & server sessions"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PIN & Security</span>
          </button>

          <button
            onClick={() => {
              if (!currentClient) return;
              const bundle = {
                client: currentClient,
                orders: clientOrders,
                payments: clientPayments,
                deliverables: clientDeliverables,
                invoices: clientInvoices,
                exportedAt: new Date().toISOString(),
              };
              const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `MRS_ClientData_${currentClient.clientId}.json`;
              a.click();
              URL.revokeObjectURL(url);
              showToast('Data Exported', 'Your isolated profile and project data downloaded', 'success');
            }}
            className={`px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors min-h-[40px] ${
              isDark ? 'border-slate-700 bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-800' : 'border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
            title="Download My Data (JSON)"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export My Data</span>
          </button>

          <Link
            to="/request"
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm min-h-[40px]"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Request</span>
          </Link>

          <button
            onClick={logoutClient}
            className={`p-2 rounded-xl border text-xs text-slate-500 hover:text-rose-500 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center ${
              isDark ? 'border-slate-700 bg-slate-900' : 'border-slate-300 bg-slate-100'
            }`}
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Newly Issued Server Client ID & PIN Save Card */}
      {issuedCredentials && (
        <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
          isDark ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-emerald-300 bg-emerald-50'
        }`}>
          <div className="space-y-1">
            <div className={`font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>
              Save Your Server-Stored Access Credentials
            </div>
            <p className={isDark ? 'text-slate-300' : 'text-slate-700'}>
              Client ID: <strong className={`font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>{issuedCredentials.clientId}</strong> · PIN:{' '}
              <strong className="font-mono text-amber-500">{issuedCredentials.pin}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIssuedCredentials(null)}
            className="px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs self-start sm:self-center"
          >
            Saved & Dismiss
          </button>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('workspace')}
          className={`px-4 py-2.5 rounded-xl border flex items-center gap-2 text-nowrap transition-colors ${
            activeTab === 'workspace'
              ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400 shadow-md ring-1 ring-cyan-500/30'
              : isDark
              ? 'bg-[#111B2E] border-[#22314D] text-cyan-400 hover:text-white'
              : 'bg-white border-slate-300 text-cyan-600 hover:text-cyan-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Service Workspace Console</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2.5 rounded-xl border flex items-center gap-2 text-nowrap transition-colors ${
            activeTab === 'orders'
              ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
              : isDark
              ? 'bg-[#111B2E] border-[#22314D] text-slate-400 hover:text-white'
              : 'bg-white border-slate-300 text-slate-700 hover:text-slate-950'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Orders ({clientOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2.5 rounded-xl border flex items-center gap-2 text-nowrap transition-colors ${
            activeTab === 'payments'
              ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
              : isDark
              ? 'bg-[#111B2E] border-[#22314D] text-slate-400 hover:text-white'
              : 'bg-white border-slate-300 text-slate-700 hover:text-slate-950'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Payments & Proofs ({clientPayments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('deliverables')}
          className={`px-4 py-2.5 rounded-xl border flex items-center gap-2 text-nowrap transition-colors ${
            activeTab === 'deliverables'
              ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
              : isDark
              ? 'bg-[#111B2E] border-[#22314D] text-slate-400 hover:text-white'
              : 'bg-white border-slate-300 text-slate-700 hover:text-slate-950'
          }`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Deliverables ({clientDeliverables.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('iptv')}
          className={`px-4 py-2.5 rounded-xl border flex items-center gap-2 text-nowrap transition-colors ${
            activeTab === 'iptv'
              ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
              : isDark
              ? 'bg-[#111B2E] border-[#22314D] text-slate-400 hover:text-white'
              : 'bg-white border-slate-300 text-slate-700 hover:text-slate-950'
          }`}
        >
          <Tv className="w-3.5 h-3.5" />
          <span>IPTV Pass ({clientSubscriptions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2.5 rounded-xl border flex items-center gap-2 text-nowrap transition-colors ${
            activeTab === 'invoices'
              ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
              : isDark
              ? 'bg-[#111B2E] border-[#22314D] text-slate-400 hover:text-white'
              : 'bg-white border-slate-300 text-slate-700 hover:text-slate-950'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Official Invoices ({clientInvoices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('messages')}
          className={`px-4 py-2.5 rounded-xl border flex items-center gap-2 text-nowrap transition-colors ${
            activeTab === 'messages'
              ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
              : isDark
              ? 'bg-[#111B2E] border-[#22314D] text-slate-400 hover:text-white'
              : 'bg-white border-slate-300 text-slate-700 hover:text-slate-950'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Direct Desk Messages ({clientMessages.length})</span>
        </button>
      </div>

      {/* ===================================================================== */}
      {/* PRIMARY TAB: INTERACTIVE SERVICE WORKSPACE CONSOLE */}
      {/* ===================================================================== */}
      {activeTab === 'workspace' && (
        <div className="space-y-4">
          <ServiceWorkspace />
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 1: ORDERS WITH STATUS STEPPERS */}
      {/* ===================================================================== */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {clientOrders.length === 0 ? (
            <div className="p-12 text-center border rounded-2xl border-dashed border-slate-700/60 space-y-3">
              <Package className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm text-slate-400">No active orders found for this client ID.</p>
              <Link to="/services" className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs inline-block">
                Start a New Project
              </Link>
            </div>
          ) : (
            clientOrders.map((order) => {
              const currentStepIndex = getStepperIndex(order.status);
              return (
                <div
                  key={order.orderId}
                  className={`p-6 rounded-2xl border space-y-4 ${
                    isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  {/* Top order summary */}
                  <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b ${
                    isDark ? 'border-slate-800/60' : 'border-slate-200'
                  }`}>
                    <div>
                      <span className="text-[11px] font-mono font-bold text-cyan-500 uppercase tracking-wider block">
                        {order.category}
                      </span>
                      <h3 className="font-heading font-bold text-base text-inherit">{order.serviceName}</h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="font-mono text-slate-500">ID: {order.orderId}</span>
                      <span className="font-mono font-bold text-emerald-500">${order.quoteAmount} USD</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        order.status === 'Delivered'
                          ? 'border-emerald-500/40 text-emerald-500 bg-emerald-500/10'
                          : order.status === 'Verified' || order.status === 'In progress'
                          ? 'border-blue-500/40 text-blue-500 bg-blue-500/10'
                          : 'border-amber-500/40 text-amber-500 bg-amber-500/10'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>

                  {/* Requirements details */}
                  <p className={`text-xs p-3 rounded-xl border ${
                    isDark ? 'text-slate-300 bg-slate-900/40 border-slate-800/80' : 'text-slate-700 bg-slate-50 border-slate-200'
                  }`}>
                    {order.details}
                  </p>

                  {/* Visual Status Stepper */}
                  <div className="py-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block mb-2">
                      Execution Stepper:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-[10px] font-semibold">
                      
                      {/* Step 1: Pending */}
                      <div className={`p-2 rounded-lg border ${
                        currentStepIndex >= 1
                          ? isDark ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' : 'border-amber-300 bg-amber-50 text-amber-800'
                          : isDark ? 'border-slate-800 text-slate-600' : 'border-slate-200 text-slate-400'
                      }`}>
                        <span>1. Intake</span>
                      </div>

                      {/* Step 2: Awaiting payment */}
                      <div className={`p-2 rounded-lg border ${
                        currentStepIndex >= 2
                          ? isDark ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' : 'border-cyan-300 bg-cyan-50 text-cyan-800'
                          : isDark ? 'border-slate-800 text-slate-600' : 'border-slate-200 text-slate-400'
                      }`}>
                        <span>2. Quote Ready</span>
                      </div>

                      {/* Step 3: Payment submitted */}
                      <div className={`p-2 rounded-lg border ${
                        currentStepIndex >= 3
                          ? isDark ? 'border-purple-500/40 bg-purple-500/10 text-purple-300' : 'border-purple-300 bg-purple-50 text-purple-800'
                          : isDark ? 'border-slate-800 text-slate-600' : 'border-slate-200 text-slate-400'
                      }`}>
                        <span>3. Proof Sent</span>
                      </div>

                      {/* Step 4: Verified / In progress */}
                      <div className={`p-2 rounded-lg border ${
                        currentStepIndex >= 4
                          ? isDark ? 'border-blue-500/40 bg-blue-500/10 text-blue-300' : 'border-blue-300 bg-blue-50 text-blue-800'
                          : isDark ? 'border-slate-800 text-slate-600' : 'border-slate-200 text-slate-400'
                      }`}>
                        <span>4. In Progress</span>
                      </div>

                      {/* Step 5: Delivered */}
                      <div className={`p-2 rounded-lg border col-span-2 sm:col-span-1 ${
                        currentStepIndex >= 5
                          ? isDark ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : isDark ? 'border-slate-800 text-slate-600' : 'border-slate-200 text-slate-400'
                      }`}>
                        <span>5. Delivered</span>
                      </div>

                    </div>
                  </div>

                  {/* Order actions */}
                  <div className="flex items-center justify-between pt-2 text-xs">
                    <span className="text-[11px] text-slate-500">
                      Created: {new Date(order.createdAt).toLocaleDateString()}
                    </span>

                    {order.status === 'Awaiting payment' && (
                      <Link
                        to={`/payment/${order.orderId}`}
                        className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Settle & Submit Payment</span>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: PAYMENTS & PROOFS */}
      {/* ===================================================================== */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-base">Remittance & Proof History</h3>
            <Link
              to="/payment"
              className="px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition-colors"
            >
              <span>Submit New Payment Proof</span>
            </Link>
          </div>

          {clientPayments.length === 0 ? (
            <div className="p-12 text-center border rounded-2xl border-dashed border-slate-700/60 space-y-3">
              <CreditCard className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm text-slate-400">No payment remittances recorded yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clientPayments.map((p) => (
                <div
                  key={p.paymentId}
                  className={`p-5 rounded-2xl border space-y-3 ${
                    isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/60">
                    <span className="font-mono text-cyan-400 font-bold">{p.reference}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      p.status === 'Verified'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : p.status === 'Rejected'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        : 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                    }`}>
                      {p.status}
                    </span>
                  </div>

                  <div className="text-xs space-y-1">
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Method:</span>
                      <span className="font-semibold">{p.method}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Amount Sent:</span>
                      <span className="font-mono font-bold text-emerald-500">
                        {p.amount} {p.currency}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">TrxID:</span>
                      <span className={`font-mono break-all ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{p.trxId}</span>
                    </div>
                    {p.senderIdentifier && (
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Sender Account:</span>
                        <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{p.senderIdentifier}</span>
                      </div>
                    )}
                  </div>

                  {p.proofUrl && (
                    <div className="pt-2 border-t border-slate-800/60">
                      <span className="text-[10px] text-slate-500 block mb-1">Receipt Screenshot:</span>
                      <img
                        src={p.proofUrl}
                        alt="Receipt"
                        className="w-16 h-16 rounded-lg object-cover border border-slate-700"
                      />
                    </div>
                  )}

                  {p.rejectionReason && (
                    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                      <strong>Rejection note:</strong> {p.rejectionReason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: DELIVERABLES & PREVIEW WATERMARK LOCK */}
      {/* ===================================================================== */}
      {activeTab === 'deliverables' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-bold text-base">Completed Deliverables & Previews</h3>
              <p className="text-xs text-slate-400">Mode A/B deliverables provide watermarked preview inspection prior to payment verification.</p>
            </div>
          </div>

          {clientDeliverables.length === 0 ? (
            <div className="p-12 text-center border rounded-2xl border-dashed border-slate-700/60 space-y-3">
              <Download className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm text-slate-400">No deliverables published yet. Work in progress will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {clientDeliverables.map((deliv) => {
                const isLocked = deliv.locked;
                const watermark = deliv.watermarkText || `PREVIEW — UNPAID — ${deliv.orderId}`;

                return (
                  <div
                    key={deliv.id}
                    className={`p-6 rounded-2xl border space-y-4 ${
                      isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/60">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-heading font-bold text-base">{deliv.title}</h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            isLocked
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          }`}>
                            {isLocked ? '🔒 LOCKED PREVIEW (UNPAID)' : '✓ VERIFIED & UNLOCKED'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{deliv.summary} · Order: {deliv.orderId}</p>
                      </div>

                      {/* Download or Action */}
                      <div className="flex items-center gap-2">
                        {!isLocked ? (
                          <button
                            onClick={() => downloadDeliverable(deliv.content, `${deliv.title.replace(/\s+/g, '_')}.${deliv.format}`, deliv.id)}
                            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download Final (.{deliv.format})</span>
                          </button>
                        ) : (
                          <Link
                            to={`/pay/${deliv.orderId}`}
                            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>Approve & Settle Payment</span>
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Preview Box with Watermark */}
                    <div className="relative p-4 rounded-xl bg-slate-950 font-mono text-xs text-slate-300 border border-slate-800 overflow-hidden">
                      {isLocked && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10">
                          <div className="text-rose-500/20 text-xl sm:text-2xl font-black uppercase tracking-widest transform -rotate-12 border-4 border-rose-500/20 p-4 rounded-2xl">
                            {watermark}
                          </div>
                        </div>
                      )}

                      <div className={`whitespace-pre-wrap max-h-56 overflow-y-auto ${isLocked ? 'blur-[0.5px]' : ''}`}>
                        {deliv.content}
                      </div>
                    </div>

                    {/* Locked Actions Toolbar */}
                    {isLocked && (
                      <div className={`flex flex-wrap items-center justify-between gap-3 pt-3 border-t text-xs ${
                        isDark ? 'border-slate-800/60' : 'border-slate-200'
                      }`}>
                        <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                          <span>Final clean files and live source code unlock immediately upon payment verification.</span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => setRevisionModalDeliv(deliv)}
                            className={`px-3 py-1.5 rounded-xl border font-semibold text-xs transition-colors ${
                              isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                            }`}
                          >
                            Request Revision
                          </button>

                          <button
                            onClick={() => setProblemModalOrderId(deliv.orderId)}
                            className={`px-3 py-1.5 rounded-xl border font-semibold text-xs transition-colors ${
                              isDark ? 'border-rose-500/30 text-rose-300 hover:bg-rose-500/10' : 'border-rose-300 text-rose-700 hover:bg-rose-50'
                            }`}
                          >
                            Report Problem
                          </button>

                          <Link
                            to={`/pay/${deliv.orderId}`}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors"
                          >
                            Pay & Unlock
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: IPTV SUBSCRIPTIONS */}
      {/* ===================================================================== */}
      {activeTab === 'iptv' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-heading font-bold text-base">M R S IPTV VIP Pass Subscriptions</h3>
            <Link
              to="/iptv"
              className="min-h-[44px] px-4 py-2 rounded-[10px] bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition-colors"
            >
              <span>Renew or Upgrade Plan</span>
            </Link>
          </div>

          {/* Exact-Month Activation Code Redemption Box */}
          <form
            onSubmit={handleRedeemCode}
            className={`p-5 rounded-2xl border space-y-3 ${
              isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <Key className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <h4 className="font-heading font-bold text-sm text-inherit">{t.activation.title}</h4>
                <p className="text-xs text-[var(--color-muted)]">{t.activation.subtitle}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={activationCodeInput}
                onChange={(e) => setActivationCodeInput(e.target.value.toUpperCase())}
                placeholder={t.activation.placeholder}
                className={`flex-1 min-h-[44px] rounded-[10px] px-3.5 py-2.5 font-mono text-sm border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                  isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
              <button
                type="submit"
                disabled={!activationCodeInput.trim() || redeemingCode}
                className="min-h-[44px] px-5 py-2.5 rounded-[10px] bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs whitespace-nowrap shrink-0"
              >
                {redeemingCode ? t.activation.submitting : t.activation.submit}
              </button>
            </div>

            {redeemError && (
              <div className="p-3 rounded-[10px] border border-[#FB7185]/40 bg-[#FB7185]/10 text-xs text-[var(--color-danger)] flex items-center gap-2" role="alert">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{redeemError}</span>
              </div>
            )}

            {redeemResult && (
              <div className="p-3 rounded-[10px] border border-[#34D399]/40 bg-[#34D399]/10 text-xs text-[var(--color-success)] flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">
                    {redeemResult.alreadyRedeemed
                      ? `Already redeemed (${redeemResult.monthsPaid}-month pass, ${redeemResult.codeMask})`
                      : `Activated ${redeemResult.monthsPaid}-month pass (${redeemResult.codeMask})`}
                  </span>
                  {redeemResult.expiresAt && (
                    <span className="block text-[var(--color-muted)] font-mono mt-0.5">
                      Valid until:{' '}
                      {new Date(redeemResult.expiresAt).toLocaleString('en-GB', {
                        timeZone: 'Asia/Dhaka',
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}{' '}
                      (Asia/Dhaka)
                    </span>
                  )}
                </div>
              </div>
            )}
          </form>

          {clientSubscriptions.length === 0 ? (
            <div className="p-12 text-center border rounded-2xl border-dashed border-slate-700/60 space-y-3">
              <Tv className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm text-slate-400">No active IPTV VIP subscriptions found.</p>
              <Link to="/iptv" className="px-4 py-2 rounded-xl bg-cyan-500 text-slate-950 font-bold text-xs inline-block">
                Explore IPTV Plans (1, 2, 6, 12 Months)
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {clientSubscriptions.map((sub) => {
                const isRevealed = revealedCreds[sub.subscriptionId];
                const daysLeft = Math.max(
                  0,
                  Math.ceil((new Date(sub.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                );

                return (
                  <div
                    key={sub.subscriptionId}
                    className={`p-6 rounded-2xl border space-y-4 ${
                      isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200 shadow-sm'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/60">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-heading font-bold text-base">M R S IPTV VIP Pass ({sub.plan})</h4>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            sub.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}>
                            {(sub.status || 'active').toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Valid: {new Date(sub.startDate).toLocaleDateString()} to {new Date(sub.endDate).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 uppercase block font-semibold">Remaining</span>
                          <span className="font-mono font-bold text-cyan-400 text-sm">
                            {daysLeft} Days Left
                          </span>
                        </div>

                        <Link
                          to="/iptv"
                          className="px-3 py-1.5 rounded-lg border border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/10 text-xs font-semibold"
                        >
                          Renew
                        </Link>
                      </div>
                    </div>

                    {/* Secure Private Credentials Field (visible only to client) */}
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                        <span className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          Private Xtream Codes & M3U Playlist Credentials
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleRevealCreds(sub.subscriptionId)}
                          className="inline-flex items-center gap-1 text-[11px] text-cyan-500 hover:underline"
                        >
                          {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          <span>{isRevealed ? 'Hide Details' : 'Reveal Credentials'}</span>
                        </button>
                      </div>

                      {isRevealed ? (
                        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-400 whitespace-pre-wrap select-all">
                          {sub.credentials || 'Credentials provisioning in progress...'}
                        </div>
                      ) : (
                        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 font-mono text-xs text-slate-400">
                          •••••••••••••••••••••••••••••••••••••••••••••••••• (Click "Reveal Credentials" to display)
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 5: INVOICES & RECEIPT PRINT */}
      {/* ===================================================================== */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-heading font-bold text-base">Official Accounting Invoices & Receipts</h3>
            <span className="text-xs text-slate-500">Snapshot exchange rate locked at invoice generation</span>
          </div>

          {clientInvoices.length === 0 ? (
            <div className="p-12 text-center border rounded-2xl border-dashed border-slate-700/60 space-y-3">
              <FileText className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm text-slate-500">No invoices generated yet. Invoices are issued upon delivery or order creation.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {clientInvoices.map((inv) => (
                <div
                  key={inv.invoiceNumber}
                  className={`p-5 rounded-2xl border space-y-4 ${
                    isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className={`flex flex-wrap items-center justify-between gap-2 pb-3 border-b ${
                    isDark ? 'border-slate-800/60' : 'border-slate-200'
                  }`}>
                    <div>
                      <span className="font-mono text-xs font-bold text-cyan-500 block">{inv.invoiceNumber || inv.invoiceId}</span>
                      <span className="text-[11px] text-slate-500">
                        Issued: {new Date(inv.issuedDate || inv.issuedAt || Date.now()).toLocaleDateString()} {inv.dueDate ? `· Due: ${new Date(inv.dueDate).toLocaleDateString()}` : ''}
                      </span>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
                      inv.status === 'Paid' || inv.status === 'paid_verified'
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
                        : inv.status === 'Overdue' || inv.status === 'overdue'
                        ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                        : 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30'
                    }`}>
                      {inv.status}
                    </span>
                  </div>

                  <div className="text-xs space-y-1">
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Order ID:</span>
                      <span className={`font-mono ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{inv.orderId}</span>
                    </div>
                    {inv.serviceName && (
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-500">Service:</span>
                        <span className={`font-semibold text-right ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{inv.serviceName}</span>
                      </div>
                    )}
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Total Settled:</span>
                      <span className="font-mono font-bold text-emerald-500 text-sm">
                        ${inv.amountUSD} USD ({inv.amountBDT.toLocaleString()} TK)
                      </span>
                    </div>
                  </div>

                  <div className={`pt-2 border-t flex flex-wrap items-center justify-between gap-2 ${
                    isDark ? 'border-slate-800/60' : 'border-slate-200'
                  }`}>
                    {inv.status !== 'Paid' && inv.status !== 'paid_verified' && (
                      <Link
                        to={`/pay/${inv.invoiceNumber || inv.invoiceId}`}
                        className="py-1.5 px-3.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition-colors"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Pay Invoice Now</span>
                      </Link>
                    )}

                    <button
                      onClick={() => setSelectedInvoice(inv)}
                      className="px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm ml-auto"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>{inv.status === 'Paid' || inv.status === 'paid_verified' ? 'PDF Receipt' : 'Print Invoice'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 6: MESSAGES WITH ADMIN */}
      {/* ===================================================================== */}
      {activeTab === 'messages' && (
        <div
          className={`p-4 sm:p-6 rounded-2xl border flex flex-col h-[65dvh] min-h-[340px] max-h-[540px] ${
            isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
          <div className={`pb-3 border-b flex flex-wrap items-center justify-between gap-2 ${
            isDark ? 'border-slate-800/60' : 'border-slate-200'
          }`}>
            <div>
              <h3 className="font-heading font-bold text-sm">Direct Operations Channel</h3>
              <p className="text-[11px] text-slate-500">End-to-end isolated communication with the owner desk.</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
              Clearance Level 1
            </span>
          </div>

          {/* Stream */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3 text-xs">
            {clientMessages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'client' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-xl border ${
                    m.sender === 'client'
                      ? 'bg-cyan-500 text-slate-950 font-medium border-cyan-400 rounded-br-none'
                      : isDark
                      ? 'bg-[#16233B] border-[#22314D] text-slate-200 rounded-bl-none'
                      : 'bg-slate-100 border-slate-200 text-slate-800 rounded-bl-none'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1 px-1">
                  <span>{m.senderName}</span>
                  <span>·</span>
                  <span>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSendMessage} className={`pt-3 border-t flex items-center gap-2 ${
            isDark ? 'border-slate-800/60' : 'border-slate-200'
          }`}>
            <input
              type="text"
              value={msgInput}
              onChange={(e) => setMsgInput(e.target.value)}
              placeholder="Type message to operations desk..."
              className={`flex-1 rounded-xl px-3.5 py-2 text-xs border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                isDark ? 'bg-[#16233B] border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            />
            <button
              type="submit"
              disabled={!msgInput.trim()}
              className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition-colors disabled:opacity-40 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Printable Invoice Modal */}
      {selectedInvoice && (
        <InvoicePrintModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {/* Revision Request Modal */}
      {revisionModalDeliv && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl ${
            isDark ? 'bg-[#111B2E] border-cyan-500/30 text-[#E6EDF7]' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div>
                <h3 className="font-heading font-bold text-base text-inherit">Request Free Scope Revision</h3>
                <p className="text-[11px] text-slate-500">Order: {revisionModalDeliv.orderId} · Round 1 of 2 included</p>
              </div>
              <button
                onClick={() => setRevisionModalDeliv(null)}
                className={`p-1 ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className={`block font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Specific Adjustments / Feedback *</label>
              <textarea
                rows={4}
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                placeholder="Detail exactly what changes or edits are requested based on the preview..."
                className={`w-full rounded-xl p-3 border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                  isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
              <span className="text-[10px] text-slate-500 block">
                Revisions matching the agreed kickoff specifications are performed with top priority.
              </span>
            </div>

            <div className={`flex justify-end gap-2 pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                onClick={() => setRevisionModalDeliv(null)}
                className={`px-4 py-2 rounded-xl border text-xs font-semibold ${
                  isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Cancel
              </button>
              <button
                disabled={!revisionNotes.trim()}
                onClick={() => {
                  requestRevision(revisionModalDeliv.orderId, revisionNotes.trim());
                  setRevisionModalDeliv(null);
                  setRevisionNotes('');
                }}
                className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-bold text-xs"
              >
                Submit Revision Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Problem / Dispute Modal */}
      {problemModalOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className={`border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl ${
            isDark ? 'bg-[#111B2E] border-rose-500/30 text-[#E6EDF7]' : 'bg-white border-rose-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div>
                <h3 className={`font-heading font-bold text-base ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>Report a Problem / Milestone Dispute</h3>
                <p className="text-[11px] text-slate-500">Order: {problemModalOrderId} · Escalate directly to owner</p>
              </div>
              <button
                onClick={() => setProblemModalOrderId(null)}
                className={`p-1 ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Issue Category</label>
                <select
                  value={problemCategory}
                  onChange={(e: any) => setProblemCategory(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2 border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="scope_mismatch">Scope Mismatch with agreed specifications</option>
                  <option value="quality_issue">Quality does not meet standard</option>
                  <option value="delay">Turnaround delay beyond SLA</option>
                  <option value="other">Other technical issue</option>
                </select>
              </div>

              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Explanation & Requirements *</label>
                <textarea
                  rows={4}
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  placeholder="Explain what went wrong or how this differs from what you specified..."
                  className={`w-full rounded-xl p-3 border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div className={`flex justify-end gap-2 pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                onClick={() => setProblemModalOrderId(null)}
                className={`px-4 py-2 rounded-xl border text-xs font-semibold ${
                  isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Cancel
              </button>
              <button
                disabled={!problemDescription.trim()}
                onClick={() => {
                  if (problemModalOrderId) {
                    reportProblem(problemModalOrderId, `[${problemCategory}] ${problemDescription.trim()}`);
                  }
                  setProblemModalOrderId(null);
                  setProblemDescription('');
                }}
                className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 disabled:opacity-40 text-white font-bold text-xs"
              >
                Submit Problem Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camellia Memory & Privacy Inspector Modal (Section 2.5) */}
      {memoryModalOpen && currentClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className={`max-w-md w-full border rounded-2xl p-6 space-y-4 text-xs shadow-2xl ${
            isDark ? 'bg-slate-900 border-pink-500/30 text-[#E6EDF7]' : 'bg-white border-pink-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2.5">
                <CamelliaAvatar size={24} />
                <h3 className="font-bold text-inherit text-sm">Camellia Memory & Client Preferences</h3>
              </div>
              <button onClick={() => setMemoryModalOpen(false)} className={`font-bold p-1 ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>
                ✕
              </button>
            </div>

            <p className={`leading-relaxed text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              To make repeat orders faster, Camellia securely retains non-sensitive operational preferences isolated exclusively to your Client ID (<span className="font-mono text-cyan-500">{currentClient.clientId}</span>). This data is never used for training or shared with other clients.
            </p>

            <div className={`p-3.5 rounded-xl border space-y-2 font-mono text-[11px] ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Preferred Language:</span>
                <span className="text-pink-500 font-bold">{memoryPurged ? 'Default (English)' : 'English (en-US)'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Communication Voice:</span>
                <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>{memoryPurged ? 'Not stored' : 'Warm, Concise & Technical'}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Past Orders Context:</span>
                <span className={isDark ? 'text-slate-200' : 'text-slate-800'}>{memoryPurged ? '0 active records' : `${clientOrders.length} scoped projects`}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500">Client Memory Isolation:</span>
                <span className="text-emerald-500">Active (Encrypted per client)</span>
              </div>
            </div>

            <div className={`p-3 rounded-xl border text-[11px] leading-relaxed ${
              isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              You can wipe Camellia's memory at any time. When wiped, future intakes will begin with fresh questions.
            </div>

            <div className={`flex flex-wrap items-center justify-between gap-2 pt-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                type="button"
                onClick={() => {
                  setMemoryPurged(true);
                  showToast('Memory Purged', 'Camellia memory for your Client ID has been erased', 'info');
                }}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                  isDark ? 'border-rose-500/40 text-rose-300 hover:bg-rose-500/10' : 'border-rose-300 text-rose-700 hover:bg-rose-50'
                }`}
              >
                Purge All Memory
              </button>

              <button
                type="button"
                onClick={() => setMemoryModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-pink-500 hover:bg-pink-400 text-slate-950 font-bold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIN & Session Security Modal */}
      {securityModalOpen && currentClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className={`max-w-md w-full border rounded-2xl p-6 space-y-4 text-xs shadow-2xl ${
            isDark ? 'bg-slate-900 border-cyan-500/30 text-[#E6EDF7]' : 'bg-white border-cyan-200 text-slate-900'
          }`}>
            <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-500" />
                <h3 className="font-bold text-inherit text-sm">Client ID & PIN Server Security</h3>
              </div>
              <button onClick={() => setSecurityModalOpen(false)} className={`font-bold p-1 ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}>
                ✕
              </button>
            </div>

            <div className={`p-3 rounded-xl border font-mono text-[11px] flex flex-wrap items-center justify-between gap-2 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <span className="text-slate-500">Active Server Client ID:</span>
              <span className="text-cyan-500 font-bold">{currentClient.clientId}</span>
            </div>

            {pinUpdateError && (
              <div className={`p-2.5 rounded-xl border text-[11px] ${
                isDark ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                {pinUpdateError}
              </div>
            )}

            <form onSubmit={handleChangePin} className="space-y-3">
              <div>
                <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Current 6-Digit PIN</label>
                <input
                  type="password"
                  required
                  maxLength={6}
                  value={currentPinInput}
                  onChange={(e) => setCurrentPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••••"
                  className={`w-full rounded-xl px-3 py-2 border font-mono tracking-widest ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>New 6-Digit PIN</label>
                  <input
                    type="password"
                    required
                    maxLength={6}
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    className={`w-full rounded-xl px-3 py-2 border font-mono tracking-widest ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className={`block font-semibold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Confirm New PIN</label>
                  <input
                    type="password"
                    required
                    maxLength={6}
                    value={confirmPinInput}
                    onChange={(e) => setConfirmPinInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="••••••"
                    className={`w-full rounded-xl px-3 py-2 border font-mono tracking-widest ${
                      isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={pinUpdating}
                className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs disabled:opacity-50"
              >
                {pinUpdating ? 'Updating on Server...' : 'Update PIN on Server'}
              </button>
            </form>

            <div className={`pt-3 border-t flex flex-wrap items-center justify-between gap-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                type="button"
                onClick={async () => {
                  setSecurityModalOpen(false);
                  await logoutAllDevices();
                }}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold ${
                  isDark ? 'border-rose-500/40 text-rose-300 hover:bg-rose-500/10' : 'border-rose-300 text-rose-700 hover:bg-rose-50'
                }`}
              >
                Log Out All Devices
              </button>
              <button
                type="button"
                onClick={() => setSecurityModalOpen(false)}
                className={`px-4 py-1.5 rounded-lg border text-xs font-semibold ${
                  isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
