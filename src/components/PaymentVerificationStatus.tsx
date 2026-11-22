import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Lock,
  Unlock,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  Upload,
  Key,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { OrderRecord, InvoiceRecord, PaymentRecord } from '../types';
import { useApp } from '../context/AppContext';
import { Badge, StatusStepper } from './ui';

export interface PaymentVerificationStatusProps {
  order: OrderRecord;
  invoice?: InvoiceRecord;
  payment?: PaymentRecord | any;
  onRefresh?: () => void;
  onEditPayment?: () => void;
  isDark?: boolean;
}

export const PaymentVerificationStatus: React.FC<PaymentVerificationStatusProps> = ({
  order,
  invoice,
  payment,
  onRefresh,
  onEditPayment,
  isDark = true,
}) => {
  const { t, showToast, refreshPortalData } = useApp();
  const [liveData, setLiveData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualReviewSubmitted, setManualReviewSubmitted] = useState(false);

  // Second proof upload state (Lite 6 §3 score 55-79 retry band)
  const [secondProofFileName, setSecondProofFileName] = useState('');
  const [secondProofBase64, setSecondProofBase64] = useState<string | null>(null);
  const [secondProofError, setSecondProofError] = useState<string | null>(null);
  const [uploadingSecondProof, setUploadingSecondProof] = useState(false);

  const [requestingReview, setRequestingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const targetTrxId = payment?.trxId || payment?.normalizedTrxId || 'SUBMITTED';
  const targetPaymentId = payment?.id || payment?.paymentId || invoice?.invoiceId || order?.orderId;
  const liveSub = liveData?.submission || payment;

  const isVerified =
    liveSub?.ownerConfirmationStatus === 'RECEIVED' ||
    liveSub?.status === 'Verified' ||
    liveSub?.status === 'verified' ||
    order?.status === 'PAID_VERIFIED' ||
    order?.status === 'Verified';
  const isRejected = liveSub?.status === 'rejected' || liveSub?.status === 'Rejected';
  const needsSecondProof = !isVerified && !isRejected && Boolean(liveSub?.secondProofRequested);

  const clientStatusLabel = isVerified
    ? t.paymentStatus.verified
    : isRejected
    ? t.paymentStatus.needsCorrection
    : needsSecondProof
    ? t.paymentStatus.additionalProof
    : liveSub?.status === 'needs_review' || liveSub?.status === 'awaiting_ledger'
    ? t.paymentStatus.checking
    : t.paymentStatus.submitted;

  const badgeTone = isVerified
    ? 'success'
    : isRejected
    ? 'danger'
    : needsSecondProof
    ? 'warning'
    : 'info';

  const fetchLiveStatus = useCallback(async () => {
    if (!targetPaymentId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/payments/${targetPaymentId}/status`);
      if (res.ok) {
        const data = await res.json();
        setLiveData(data);
      }
    } catch {
      // ignore transient network errors
    } finally {
      setLoading(false);
      if (onRefresh) onRefresh();
    }
  }, [targetPaymentId, onRefresh]);

  useEffect(() => {
    fetchLiveStatus();
  }, [fetchLiveStatus]);

  const handleSecondProofSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSecondProofError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setSecondProofError('File size must be 5 MB or smaller.');
      return;
    }
    setSecondProofFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setSecondProofBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitSecondProof = async (e: React.FormEvent) => {
    e.preventDefault();
    const subId = liveSub?.id || payment?.paymentId || payment?.id;
    if (!subId || !secondProofBase64 || uploadingSecondProof) return;

    setUploadingSecondProof(true);
    setSecondProofError(null);
    try {
      const res = await fetch(`/api/payments/${subId}/evidence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: secondProofFileName || 'second-proof.png',
          base64Data: secondProofBase64,
          evidenceKind: 'second_proof',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSecondProofError(data.error || 'Could not upload additional proof. Please try a clearer image.');
      } else {
        if (data.submission) {
          setLiveData((prev: any) => ({ ...prev, submission: data.submission }));
        }
        setSecondProofBase64(null);
        setSecondProofFileName('');
        await refreshPortalData();
        showToast('Additional Proof Submitted', 'Verification updated automatically.', 'info');
      }
    } catch (err: any) {
      setSecondProofError(err?.message || 'Network error uploading proof.');
    } finally {
      setUploadingSecondProof(false);
    }
  };

  const handleRequestManualReview = async () => {
    if (!targetPaymentId || requestingReview) return;
    setRequestingReview(true);
    setReviewError(null);
    try {
      const res = await fetch(`/api/payments/${targetPaymentId}/request-manual-review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setReviewError(data.error || 'Could not queue manual review.');
      } else {
        setManualReviewSubmitted(true);
        await fetchLiveStatus();
      }
    } catch (err: any) {
      setReviewError(err?.message || 'Network error requesting manual review.');
    } finally {
      setRequestingReview(false);
    }
  };

  const displayTrx = liveSub?.normalizedTrxId || targetTrxId;
  const displayAmount = payment?.amount
    ? `${payment.amount} ${payment.currency || 'USD'}`
    : invoice?.amountBDT
    ? `${invoice.amountBDT} TK ($${invoice.amountUSD} USD)`
    : order?.quoteAmount
    ? `$${order.quoteAmount} USD`
    : 'Pending Invoice';

  const stepperSteps = [
    { key: 'submitted', label: t.paymentStatus.submitted, state: 'done' as const },
    {
      key: 'checking',
      label: t.paymentStatus.checking,
      state: isVerified ? ('done' as const) : isRejected ? ('error' as const) : ('active' as const),
    },
    {
      key: 'verified',
      label: t.paymentStatus.verified,
      state: isVerified ? ('done' as const) : ('pending' as const),
    },
    {
      key: 'unlocked',
      label: isVerified ? 'Unlocked' : 'Locked',
      state: isVerified ? ('done' as const) : ('pending' as const),
    },
  ];

  return (
    <div className="space-y-4 py-1">
      <div className="mrs-card p-4 sm:p-5 space-y-4">
        {/* Header with Client-Safe Status Badge & Refresh */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-[10px] bg-[#22D3EE]/10 border border-[#22D3EE]/30 text-[var(--color-accent)] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-heading font-bold text-base text-[var(--color-text)]">
                  Payment Status
                </h3>
                <Badge tone={badgeTone} label={clientStatusLabel} />
              </div>
              <p className="text-xs text-[var(--color-muted)] font-mono mt-0.5 truncate">
                {displayTrx} · {displayAmount}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchLiveStatus}
            disabled={loading}
            className="mrs-control min-h-[44px] px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 border border-[var(--color-border)] bg-[var(--color-elevated)] text-[var(--color-text)] hover:border-[var(--color-accent)] self-start sm:self-auto shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[var(--color-accent)] ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Refreshing...' : 'Refresh Status'}</span>
          </button>
        </div>

        {/* Clean 4-Step Progress Stepper */}
        <StatusStepper steps={stepperSteps} />

        {/* Verified Receipt & Exact-Month Activation Summary (No secrets, only mask & dispatch note) */}
        {isVerified && (
          <div className="p-4 rounded-[10px] border border-[#34D399]/35 bg-[#34D399]/10 text-sm space-y-2">
            <div className="font-bold flex items-center gap-2 text-[var(--color-success)]">
              <Unlock className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Payment Verified & Deliverables Unlocked</span>
            </div>
            {(liveSub?.activationCodeMask || liveSub?.monthsPaid) && (
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[var(--color-text)]">
                <Key className="w-3.5 h-3.5 text-[var(--color-success)]" aria-hidden="true" />
                <span>
                  {liveSub.monthsPaid ? `${liveSub.monthsPaid}-Month Activation Code` : 'Activation Code'}:{' '}
                  <strong>{liveSub.activationCodeMask || 'Issued'}</strong>
                </span>
              </div>
            )}
            <p className="text-xs text-[var(--color-muted)]">
              {liveSub?.emailDispatchStatus === 'sent'
                ? `Confirmation and activation details were sent to ${invoice?.clientEmail || order.clientEmail}.`
                : `Your receipt is saved in your Client Portal for ${invoice?.clientEmail || order.clientEmail}.`}
            </p>
          </div>
        )}

        {/* Checking Notice */}
        {!isVerified && !isRejected && !needsSecondProof && (
          <div className="p-4 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-elevated)] text-sm flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-[var(--color-accent)] shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-semibold text-[var(--color-text)]">Checking your payment</p>
              <p className="text-xs text-[var(--color-muted)]">
                {liveSub?.clientMessage ||
                  'Your payment claim and receipt are under verification. Deliverables and activation codes unlock automatically once confirmed.'}
              </p>
            </div>
          </div>
        )}

        {/* Second Proof Request Form (Score 55-79 retry band — no internal score shown) */}
        {needsSecondProof && (
          <form
            onSubmit={handleSubmitSecondProof}
            className="p-4 rounded-[10px] border border-[#F59E0B]/40 bg-[#F59E0B]/10 space-y-3"
          >
            <div className="flex items-start gap-2 text-sm text-[var(--color-warning)] font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>
                {liveSub?.secondProofPrompt ||
                  'Please upload one additional proof of a different kind (e.g., confirmation email or transaction history screenshot).'}
              </span>
            </div>

            <label className="mrs-control w-full min-h-[48px] px-3.5 py-2.5 border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center gap-2 cursor-pointer text-xs font-mono">
              <Upload className="w-4 h-4 text-[var(--color-accent)] shrink-0" />
              <span className="truncate">
                {secondProofFileName || 'Choose second proof screenshot or PDF (max 5 MB)'}
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,.pdf"
                onChange={handleSecondProofSelect}
                className="sr-only"
              />
            </label>

            {secondProofError && (
              <p className="text-xs text-[var(--color-danger)] flex items-center gap-1.5" role="alert">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{secondProofError}</span>
              </p>
            )}

            <button
              type="submit"
              disabled={!secondProofBase64 || uploadingSecondProof}
              className="mrs-control w-full min-h-[44px] px-4 py-2 bg-[#22D3EE] hover:bg-[#06B6D4] disabled:opacity-50 text-[#0B1220] font-bold text-xs flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>{uploadingSecondProof ? 'Uploading & Re-checking...' : 'Submit Additional Proof'}</span>
            </button>
          </form>
        )}

        {/* Generic Correction Message ONLY on Rejected (Lite 6 §8: never show failed check, score, or anomaly) */}
        {isRejected && (
          <div className="p-4 rounded-[10px] border border-[#FB7185]/40 bg-[#FB7185]/10 text-sm space-y-2">
            <div className="font-bold flex items-center gap-2 text-[var(--color-danger)]">
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{t.paymentStatus.needsCorrection}</span>
            </div>
            <p className="text-xs text-[var(--color-text)] leading-relaxed">
              We could not verify this submission automatically. Please verify your Transaction ID, exact amount, and receipt screenshot match the selected payment method, then try again or request owner review.
            </p>
          </div>
        )}

        {/* Official Receiver Protection Notice */}
        <div className="p-3.5 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-elevated)] text-xs flex items-start gap-2.5 leading-relaxed text-[var(--color-muted)]">
          <Lock className="w-4 h-4 shrink-0 text-[var(--color-accent)] mt-0.5" aria-hidden="true" />
          <span>
            <strong className="text-[var(--color-text)]">Security Notice:</strong> Pay only to the official receiver accounts displayed on this page. We never change payment numbers by chat or email.
          </span>
        </div>

        {/* Manual Review Escalation */}
        {manualReviewSubmitted || liveSub?.manualReviewRequested ? (
          <div className="p-3.5 rounded-[10px] border border-[#22D3EE]/35 bg-[#22D3EE]/10 text-xs space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-[var(--color-accent)]">
              <ShieldCheck className="w-4 h-4" />
              <span>Queued for Owner Review</span>
            </div>
            <p className="text-[var(--color-muted)]">
              Your submission has been forwarded to the owner desk for confirmation.
            </p>
          </div>
        ) : (
          !isVerified && (
            <div className="p-3.5 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-elevated)] text-xs space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <span className="font-semibold text-[var(--color-text)]">
                  Need direct owner confirmation?
                </span>
                <button
                  type="button"
                  disabled={requestingReview || (!payment?.id && !payment?.paymentId && !liveSub?.id)}
                  onClick={handleRequestManualReview}
                  className="mrs-control min-h-[44px] px-3.5 py-2 bg-[#F59E0B] hover:opacity-90 disabled:opacity-50 text-[#0B1220] font-bold text-xs self-start sm:self-auto"
                >
                  {requestingReview ? 'Queueing...' : 'Request Owner Review'}
                </button>
              </div>
              {reviewError && <p className="text-xs text-[var(--color-danger)]">{reviewError}</p>}
            </div>
          )
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
          {onEditPayment && !isVerified && (
            <button
              type="button"
              onClick={onEditPayment}
              className="mrs-control min-h-[44px] px-4 py-2 border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-elevated)] text-xs font-semibold"
            >
              Update Details / Resubmit Proof
            </button>
          )}
          <Link
            to="/portal"
            className="mrs-control min-h-[44px] flex-1 px-4 py-2 bg-[#22D3EE] hover:bg-[#06B6D4] text-[#0B1220] font-bold text-xs flex items-center justify-center gap-2"
          >
            <span>Open Client Portal</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};
