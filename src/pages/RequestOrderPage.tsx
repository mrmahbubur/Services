import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
  Check,
  Copy,
  ArrowRight,
  ArrowLeft,
  Lock,
  AlertTriangle,
  Upload,
  FileText,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Tag,
  Zap,
  Info,
  ExternalLink,
} from 'lucide-react';
import { ProjectFileUploadZone, SecureDocumentRecord } from '../components/ProjectFileUploadZone';

export const RequestOrderPage: React.FC = () => {
  const { id: paramServiceId } = useParams<{ id: string }>();
  const { services, theme, createOrder, formatPrice, currentClient, showToast } = useApp();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  // Find service by ID, slug, or shortCode
  const initialService = services.find(
    (s) =>
      s.id.toLowerCase() === paramServiceId?.toLowerCase() ||
      s.slug?.toLowerCase() === paramServiceId?.toLowerCase() ||
      s.shortCode?.toLowerCase() === paramServiceId?.toLowerCase()
  ) || services[0];

  // Stepper state: 1: Service, 2: Your details, 3: Project scope & options, 4: Review & agreement, 5: Result
  const [step, setStep] = useState<number>(paramServiceId ? 2 : 1);
  const [selectedServiceId, setSelectedServiceId] = useState<string>(initialService?.id || 'S-MRS-01');

  // Form fields
  const [clientName, setClientName] = useState(currentClient?.name || '');
  const [clientEmail, setClientEmail] = useState(currentClient?.email || '');
  const [clientWhatsapp, setClientWhatsapp] = useState(currentClient?.whatsapp || '');
  const [clientCountry, setClientCountry] = useState(currentClient?.country || 'Bangladesh');
  const [projectDetails, setProjectDetails] = useState('');

  // Add-ons & discounts
  const [rushDelivery, setRushDelivery] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountPct: number } | null>(null);

  // Agreement
  const [agreementChecked, setAgreementChecked] = useState(false);
  
  // File attachments state & Section 14.14 secure documents
  const [secureDocuments, setSecureDocuments] = useState<SecureDocumentRecord[]>([]);
  const [attachedFiles, setAttachedFiles] = useState<{ name: string; url: string; size: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Result state
  const [orderResult, setOrderResult] = useState<{
    orderId: string;
    clientId: string;
    serviceId: string;
    plainPin?: string;
    isNewClient: boolean;
  } | null>(null);

  const [copiedClientId, setCopiedClientId] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);

  const selectedService = services.find((s) => s.id === selectedServiceId) || services[0];
  const timingMode = selectedService?.paymentTimingMode || 'mode_a';

  // Base price calculation
  const basePriceUSD = selectedService?.fixedPriceUSD || selectedService?.minPriceUSD || 25;
  const rushSurchargeUSD = rushDelivery ? Math.round(basePriceUSD * 0.35) : 0;
  const subtotalUSD = basePriceUSD + rushSurchargeUSD;
  const discountAmountUSD = appliedCoupon ? Math.round((subtotalUSD * appliedCoupon.discountPct) / 100) : 0;
  const finalPriceUSD = Math.max(5, subtotalUSD - discountAmountUSD);

  const handleApplyCoupon = () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;
    if (code === 'WELCOME10') {
      setAppliedCoupon({ code, discountPct: 10 });
      showToast('Coupon Applied', '10% discount applied to your order', 'success');
    } else if (code === 'MRS2026' || code === 'AUTOMATE') {
      setAppliedCoupon({ code, discountPct: 15 });
      showToast('VIP Coupon Applied', '15% automated discount applied', 'success');
    } else {
      showToast('Invalid Coupon', 'Code not recognized or expired', 'error');
    }
  };

  const handleSecureFilesChange = (docs: SecureDocumentRecord[]) => {
    setSecureDocuments(docs);
    setAttachedFiles(
      docs.map((d) => ({
        name: d.name,
        url: d.base64Content || '',
        size: d.sizeFormatted,
      }))
    );
  };

  const copyToClipboard = (text: string, type: 'clientId' | 'pin') => {
    navigator.clipboard.writeText(text);
    if (type === 'clientId') {
      setCopiedClientId(true);
      setTimeout(() => setCopiedClientId(false), 2000);
    } else {
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    }
  };

  const handleSubmitOrder = async () => {
    if (!clientName.trim() || !clientEmail.trim() || !projectDetails.trim()) return;
    if ((timingMode === 'mode_a' || timingMode === 'mode_b') && !agreementChecked) {
      showToast('Agreement Required', 'Please accept the payment terms before submitting', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await createOrder({
        serviceId: selectedService.id,
        details: projectDetails,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim(),
        clientWhatsapp: clientWhatsapp.trim(),
        clientCountry: clientCountry.trim(),
        files: attachedFiles,
        isRush: rushDelivery,
        rushDelivery,
        couponCode: appliedCoupon?.code,
      });

      setOrderResult({
        orderId: res.order.orderId,
        clientId: res.client.clientId,
        serviceId: selectedService.id,
        plainPin: res.plainPin,
        isNewClient: res.isNewClient,
      });

      setStep(5);
    } catch (err: any) {
      console.error('Order creation error:', err);
      showToast('Submission Failed', err?.message || 'An error occurred while creating your order', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8 ${isDark ? 'text-[#E6EDF7]' : 'text-[#0B1220]'}`}>
      
      {/* Title */}
      <div className="text-center space-y-2">
        <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider block">
          Client Onboarding & Project Scope
        </span>
        <h1 className="font-heading font-extrabold text-2xl sm:text-3xl tracking-tight">
          Request Quote or Place Order
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Deterministic execution · Transparent milestones · Direct owner review
        </p>
      </div>

      {/* Progress Stepper Bar (1 to 4) */}
      {step < 5 && (
        <div className="flex items-center justify-between max-w-xl mx-auto text-xs font-semibold px-2">
          <div className={`flex items-center gap-1.5 shrink-0 ${step >= 1 ? 'text-cyan-500' : 'text-slate-500'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono border ${
              step >= 1 ? 'border-cyan-500 bg-cyan-500/10' : isDark ? 'border-slate-700' : 'border-slate-300'
            }`}>
              1
            </span>
            <span className="hidden sm:inline">Service</span>
          </div>
          <div className={`flex-1 max-w-[3.5rem] h-0.5 mx-1.5 ${isDark ? 'bg-slate-700/60' : 'bg-slate-300'}`} />

          <div className={`flex items-center gap-1.5 shrink-0 ${step >= 2 ? 'text-cyan-500' : 'text-slate-500'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono border ${
              step >= 2 ? 'border-cyan-500 bg-cyan-500/10' : isDark ? 'border-slate-700' : 'border-slate-300'
            }`}>
              2
            </span>
            <span className="hidden sm:inline">Your Details</span>
          </div>
          <div className={`flex-1 max-w-[3.5rem] h-0.5 mx-1.5 ${isDark ? 'bg-slate-700/60' : 'bg-slate-300'}`} />

          <div className={`flex items-center gap-1.5 shrink-0 ${step >= 3 ? 'text-cyan-500' : 'text-slate-500'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono border ${
              step >= 3 ? 'border-cyan-500 bg-cyan-500/10' : isDark ? 'border-slate-700' : 'border-slate-300'
            }`}>
              3
            </span>
            <span className="hidden sm:inline">Scope & Options</span>
          </div>
          <div className={`flex-1 max-w-[3.5rem] h-0.5 mx-1.5 ${isDark ? 'bg-slate-700/60' : 'bg-slate-300'}`} />

          <div className={`flex items-center gap-1.5 shrink-0 ${step >= 4 ? 'text-cyan-500' : 'text-slate-500'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono border ${
              step >= 4 ? 'border-cyan-500 bg-cyan-500/10' : isDark ? 'border-slate-700' : 'border-slate-300'
            }`}>
              4
            </span>
            <span className="hidden sm:inline">Review & Terms</span>
          </div>
        </div>
      )}

      {/* Main Stepper Card */}
      <div
        className={`p-6 sm:p-8 rounded-2xl border shadow-xl ${
          isDark ? 'bg-[#111B2E] border-[#22314D]' : 'bg-white border-slate-200'
        }`}
      >
        {/* STEP 1: Select Service */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-heading font-bold text-xl mb-1">Select Digital Solution</h2>
              <p className="text-xs text-slate-400">
                Choose the solution you want us to deliver. All 16 catalog offerings have dedicated scopes.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
              {services.map((svc) => (
                <div
                  key={svc.id}
                  onClick={() => setSelectedServiceId(svc.id)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedServiceId === svc.id
                      ? 'border-cyan-400 bg-cyan-500/10 shadow-sm'
                      : isDark
                      ? 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                      : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1.5">
                    <span className="font-mono font-bold text-cyan-400">{svc.id}</span>
                    <span className="font-mono text-emerald-400 font-semibold">{svc.rateUSD}</span>
                  </div>
                  <h4 className="font-heading font-bold text-sm text-inherit">{svc.name}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-1">{svc.shortDescription}</p>
                </div>
              ))}
            </div>

            <div className={`flex justify-end pt-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                onClick={() => setStep(2)}
                className="py-2.5 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-2 min-h-[44px]"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Client Details */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-heading font-bold text-xl mb-1">Your Identity & Contact</h2>
                <p className="text-xs text-slate-500">
                  Used exclusively to generate your isolated Client ID and send delivery milestones.
                </p>
              </div>
              <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border ${
                isDark ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' : 'text-cyan-800 bg-cyan-50 border-cyan-200'
              }`}>
                {selectedService.id}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Full Name *</label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className={`w-full rounded-xl px-3.5 py-2.5 border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                    isDark ? 'bg-slate-900/60 border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Email Address *</label>
                <input
                  type="email"
                  required
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="client@organization.com"
                  className={`w-full rounded-xl px-3.5 py-2.5 border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                    isDark ? 'bg-slate-900/60 border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">WhatsApp / Phone</label>
                <input
                  type="text"
                  value={clientWhatsapp}
                  onChange={(e) => setClientWhatsapp(e.target.value)}
                  placeholder="+880 1810 853282 or +1..."
                  className={`w-full rounded-xl px-3.5 py-2.5 border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                    isDark ? 'bg-slate-900/60 border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Country / Jurisdiction</label>
                <input
                  type="text"
                  value={clientCountry}
                  onChange={(e) => setClientCountry(e.target.value)}
                  placeholder="Bangladesh, United States, UK, etc."
                  className={`w-full rounded-xl px-3.5 py-2.5 border focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                    isDark ? 'bg-slate-900/60 border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div className={`flex items-center justify-between pt-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                onClick={() => setStep(1)}
                className={`py-2.5 px-4 rounded-xl border text-xs font-semibold flex items-center gap-1.5 min-h-[44px] ${
                  isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                disabled={!clientName.trim() || !clientEmail.trim()}
                onClick={() => setStep(3)}
                className="py-2.5 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition-colors flex items-center gap-2 min-h-[44px]"
              >
                <span>Continue to Scope</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Project Scope, Rush Option & Coupon */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-heading font-bold text-xl mb-1">Project Scope & Deliverable Details</h2>
              <p className="text-xs text-slate-500">
                Detail your goals, repository URLs, or specific requirements for {selectedService.name}.
              </p>
            </div>

            {/* Kickoff Checklist Guide */}
            {selectedService.clientMustProvide && selectedService.clientMustProvide.length > 0 && (
              <div className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                isDark ? 'bg-cyan-500/10 border-cyan-500/20' : 'bg-cyan-50 border-cyan-200'
              }`}>
                <span className={`font-bold flex items-center gap-1.5 ${isDark ? 'text-cyan-300' : 'text-cyan-800'}`}>
                  <Info className="w-3.5 h-3.5" />
                  What to include in your description:
                </span>
                <ul className={`list-disc list-inside space-y-1 pl-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {selectedService.clientMustProvide.map((req, i) => (
                    <li key={i}>{req}</li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <label className="block text-slate-500 mb-1.5 text-xs font-semibold">Scope & Specifications *</label>
              <textarea
                required
                rows={4}
                value={projectDetails}
                onChange={(e) => setProjectDetails(e.target.value)}
                placeholder="Describe exactly what needs to be configured, written, audited, or published..."
                className={`w-full rounded-xl p-3 border text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 ${
                  isDark ? 'bg-slate-900/60 border-[#22314D] text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            {/* Rush Delivery Toggle */}
            <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
              isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Priority Rush Execution (+35%)</h4>
                  <p className="text-[11px] text-slate-500">
                    Moves your task to top priority queue with 24-hour turnaround where applicable.
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={rushDelivery}
                onChange={(e) => setRushDelivery(e.target.checked)}
                className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 shrink-0"
              />
            </div>

            {/* Coupon Code Input */}
            <div className={`p-4 rounded-xl border space-y-2 ${
              isDark ? 'border-slate-800 bg-slate-900/40' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-cyan-500" />
                <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Promotional Coupon</span>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  placeholder="e.g. WELCOME10 or MRS2026"
                  className={`flex-1 rounded-xl px-3 py-2 text-xs border uppercase font-mono ${
                    isDark ? 'bg-slate-900 border-[#22314D] text-white' : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
                <button
                  type="button"
                  onClick={handleApplyCoupon}
                  className={`px-4 py-2 rounded-xl font-bold text-xs border transition-colors min-h-[40px] ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-cyan-500/30'
                      : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border-cyan-300'
                  }`}
                >
                  Apply
                </button>
              </div>
              {appliedCoupon && (
                <span className="text-[11px] text-emerald-500 font-semibold block">
                  ✓ {appliedCoupon.code} applied ({appliedCoupon.discountPct}% OFF)
                </span>
              )}
            </div>

            {/* Upload Project Files Section */}
            <div className="pt-2">
              <ProjectFileUploadZone
                files={secureDocuments}
                onFilesChange={handleSecureFilesChange}
                isDark={isDark}
                maxFiles={6}
                maxSizeBytes={25 * 1024 * 1024}
              />
            </div>

            <div className={`flex items-center justify-between pt-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                onClick={() => setStep(2)}
                className={`py-2.5 px-4 rounded-xl border text-xs font-semibold flex items-center gap-1.5 min-h-[44px] ${
                  isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                disabled={!projectDetails.trim()}
                onClick={() => setStep(4)}
                className="py-2.5 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition-colors flex items-center gap-2 min-h-[44px]"
              >
                <span>Review & Agree</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Review, Financial Snapshot & Payment Agreement */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-heading font-bold text-xl mb-1">Review Order & Sign Agreement</h2>
              <p className="text-xs text-slate-400">
                Confirm your parameters and accept the deterministic payment delivery milestone.
              </p>
            </div>

            {/* Scope Summary Box */}
            <div className={`p-4 rounded-xl border space-y-3 text-xs ${
              isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-50'
            }`}>
              <div className={`flex flex-wrap items-center justify-between gap-2 border-b pb-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <span className="text-slate-500">Service:</span>
                <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{selectedService.name} ({selectedService.id})</span>
              </div>
              <div className={`flex flex-wrap items-center justify-between gap-2 border-b pb-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <span className="text-slate-500">Client:</span>
                <span className={`font-mono break-all ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{clientName} &lt;{clientEmail}&gt;</span>
              </div>
              <div className={`flex flex-wrap items-center justify-between gap-2 border-b pb-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                <span className="text-slate-500">Turnaround:</span>
                <span className="text-cyan-500 font-mono">{rushDelivery ? '24 Hours (Priority)' : selectedService.typicalTurnaround}</span>
              </div>
              {attachedFiles.length > 0 && (
                <div className={`flex flex-wrap items-center justify-between gap-2 border-b pb-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                  <span className="text-slate-500">Project Files:</span>
                  <span className="text-emerald-500 font-mono text-[11px] truncate max-w-full sm:max-w-[240px]">
                    {attachedFiles.length} verified doc(s) ({attachedFiles.map((f) => f.name).join(', ')})
                  </span>
                </div>
              )}
              
              {/* Financial Breakdown */}
              <div className="pt-2 space-y-1 font-mono text-[11px]">
                <div className="flex justify-between text-slate-500">
                  <span>Base Solution Quote:</span>
                  <span>${basePriceUSD}</span>
                </div>
                {rushDelivery && (
                  <div className="flex justify-between text-amber-500">
                    <span>Priority Rush Surcharge (+35%):</span>
                    <span>+${rushSurchargeUSD}</span>
                  </div>
                )}
                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-500">
                    <span>Coupon Discount ({appliedCoupon.code}):</span>
                    <span>-${discountAmountUSD}</span>
                  </div>
                )}
                <div className={`flex justify-between text-base font-bold pt-2 border-t ${
                  isDark ? 'text-white border-slate-800' : 'text-slate-900 border-slate-200'
                }`}>
                  <span>Estimated Total:</span>
                  <span className="text-cyan-500">${finalPriceUSD} USD</span>
                </div>
              </div>
            </div>

            {/* Payment Timing Notice & Agreement */}
            <div className={`p-4 rounded-xl border space-y-3 text-xs ${
              isDark ? 'border-cyan-500/30 bg-cyan-500/10' : 'border-cyan-200 bg-cyan-50'
            }`}>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-cyan-500 shrink-0" />
                <span className={`font-bold uppercase tracking-wider text-[11px] ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {timingMode === 'mode_a' && 'Mode A — Pay After Delivery Milestone'}
                  {timingMode === 'mode_b' && 'Mode B — Deposit Then Final Balance'}
                  {timingMode === 'mode_c' && 'Mode C — Prepay Required'}
                </span>
              </div>

              <p className={`leading-relaxed text-[11px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {timingMode === 'mode_a' && (
                  <>
                    Work begins immediately upon owner review. When work is completed, we publish a watermarked preview and issue Invoice <strong>INV-YYMM-NNNN</strong>. You inspect the preview, approve it, and remit payment within 7 days. Final source deliverables are instantly unlocked upon payment verification.
                  </>
                )}
                {timingMode === 'mode_b' && (
                  <>
                    Requires a 50% milestone deposit to commence work. The final deliverable is previewed in watermarked format and unlocked upon final balance settlement.
                  </>
                )}
                {timingMode === 'mode_c' && (
                  <>
                    Full prepayment is required before credentials or instant access passes are provisioned.
                  </>
                )}
              </p>

              {/* Mandatory Agreement Checkbox */}
              <label className="flex items-start gap-2.5 pt-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  required
                  checked={agreementChecked}
                  onChange={(e) => setAgreementChecked(e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 mt-0.5 shrink-0"
                />
                <span className={`text-[11px] font-medium leading-snug ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                  I agree to pay within 7 days of delivery. Final files and source assets are released after payment verification (Agreement v2.4).
                </span>
              </label>
            </div>

            <div className={`flex flex-wrap items-center justify-between gap-2 pt-4 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                onClick={() => setStep(3)}
                className={`py-2.5 px-4 rounded-xl border text-xs font-semibold flex items-center gap-1.5 min-h-[44px] ${
                  isDark ? 'border-slate-700 text-slate-300 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                disabled={submitting || !agreementChecked}
                onClick={handleSubmitOrder}
                className="py-2.5 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition-colors flex items-center gap-2 shadow-lg shadow-cyan-500/20 min-h-[44px]"
              >
                {submitting ? (
                  <span>Generating Secure Ledger...</span>
                ) : (
                  <>
                    <span>Confirm & Generate Client ID</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Success & Result Display (Client ID + PIN Gate) */}
        {step === 5 && orderResult && (
          <div className="space-y-6 text-center py-4">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className={`font-heading font-extrabold text-2xl ${isDark ? 'text-white' : 'text-slate-900'}`}>Order Registered Successfully</h2>
              <p className="text-xs text-slate-500">
                Order <span className="font-mono text-cyan-500 font-bold">{orderResult.orderId}</span> has been logged to the owner operations queue.
              </p>
            </div>

            {/* Credentials Card */}
            <div className={`max-w-md mx-auto p-6 rounded-2xl border space-y-4 text-left shadow-2xl ${
              isDark ? 'border-cyan-500/40 bg-slate-950/80' : 'border-cyan-300 bg-slate-50'
            }`}>
              <div className={`flex items-center gap-2 text-cyan-500 text-xs font-bold uppercase tracking-wider border-b pb-2 ${
                isDark ? 'border-slate-800' : 'border-slate-200'
              }`}>
                <Lock className="w-4 h-4" />
                <span>Your Zero-Knowledge Access Credentials</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">Your Isolated Client ID</span>
                <div className={`flex items-center justify-between p-2.5 rounded-xl border ${
                  isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                }`}>
                  <span className={`font-mono text-sm font-bold break-all ${isDark ? 'text-white' : 'text-slate-900'}`}>{orderResult.clientId}</span>
                  <button
                    onClick={() => copyToClipboard(orderResult.clientId, 'clientId')}
                    className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                      isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-cyan-400' : 'hover:bg-slate-100 text-slate-500 hover:text-cyan-700'
                    }`}
                  >
                    {copiedClientId ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {orderResult.plainPin && (
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block mb-1">One-Time 6-Digit Access PIN</span>
                  <div className={`flex items-center justify-between p-2.5 rounded-xl border border-emerald-500/40 ${
                    isDark ? 'bg-slate-900' : 'bg-white'
                  }`}>
                    <span className="font-mono text-base font-bold text-emerald-500 tracking-widest">{orderResult.plainPin}</span>
                    <button
                      onClick={() => copyToClipboard(orderResult.plainPin || '', 'pin')}
                      className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                        isDark ? 'hover:bg-slate-800 text-slate-400 hover:text-emerald-400' : 'hover:bg-slate-100 text-slate-500 hover:text-emerald-600'
                      }`}
                    >
                      {copiedPin ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div className={`p-3 rounded-xl border text-[11px] flex items-start gap-2 ${
                isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                <span>
                  <strong>CRITICAL:</strong> Save your Client ID and PIN now. We store only cryptographic hashes—your plain PIN cannot be recovered if lost.
                </span>
              </div>
            </div>

            {/* Portal Action Link */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/portal"
                className="w-full sm:w-auto justify-center py-3 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-colors flex items-center gap-2 shadow-lg shadow-cyan-500/20 min-h-[44px]"
              >
                <span>Enter Client Portal / Track Milestones</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/services"
                className={`w-full sm:w-auto text-center py-3 px-5 rounded-xl border text-xs font-semibold min-h-[44px] flex items-center justify-center ${
                  isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-300' : 'border-slate-300 hover:bg-slate-100 text-slate-700'
                }`}
              >
                Browse Other Services
              </Link>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
