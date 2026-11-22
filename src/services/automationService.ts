import {
  AiDraftItem,
  OrderTriageResult,
  IncomingPayment,
  AutomationSettings,
} from '../types/automation';
import { ServiceItem, OrderRecord, InvoiceRecord } from '../types';

export async function requestServerOrderTriage(
  order: Partial<OrderRecord>,
  service: ServiceItem
): Promise<OrderTriageResult> {
  const res = await fetch('/api/intake/triage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      orderId: order.orderId || 'PENDING',
      serviceId: service.serviceId || service.id,
      serviceName: service.name,
      details: order.details || '',
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.triage) {
    throw new Error(data.error || 'AI intake triage failed');
  }
  return data.triage as OrderTriageResult;
}

export async function requestServerAiDraft(params: {
  orderId: string;
  serviceId: string;
  serviceName: string;
  clientName: string;
  intakeDetails: string;
  targetJobDescription?: string;
}): Promise<AiDraftItem> {
  const res = await fetch('/api/work/ai-draft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok || !data.draft) {
    throw new Error(data.error || 'Gemini draft generation failed');
  }
  return data.draft as AiDraftItem;
}

export function parseIncomingSms(rawSms: string): Partial<IncomingPayment> | null {
  const text = rawSms.trim();
  if (!text) return null;
  const bkashTrx = text.match(/TrxID\s+([A-Za-z0-9]+)/i);
  const tkAmount = text.match(/(?:Tk|TK|BDT)\s*([0-9,]+(?:\.[0-9]{2})?)/i);
  const senderPhone = text.match(/from\s+([0-9+]{11,14})/i);
  const refMatch = text.match(/Ref\s+([A-Za-z0-9-_]+)/i);

  if (bkashTrx || tkAmount) {
    const rawAmt = tkAmount ? tkAmount[1].replace(/,/g, '') : '0';
    return {
      source: 'sms_bridge',
      trxId: bkashTrx ? bkashTrx[1].toUpperCase() : '',
      amount: parseFloat(rawAmt) || 0,
      currency: 'BDT',
      senderIdentifier: senderPhone ? senderPhone[1] : undefined,
      referenceCode: refMatch ? refMatch[1] : undefined,
      rawMasked: text.replace(/\b\d{6,}\b/g, (m) => m.slice(0, 3) + '••••' + m.slice(-3)),
      receivedAt: new Date().toISOString(),
      reconciled: false,
    };
  }
  return null;
}

export function evaluateAutoVerifyConditions(
  payment: Partial<IncomingPayment>,
  invoice: InvoiceRecord,
  settings: AutomationSettings,
  existingTrxIds: string[]
): { canAutoVerify: boolean; reasons: string[]; isUnderpaid: boolean } {
  const reasons: string[] = [];
  let canAutoVerify = true;
  let isUnderpaid = false;

  if (settings.killSwitch) {
    return { canAutoVerify: false, reasons: ['Global kill switch active'], isUnderpaid: false };
  }
  if (payment.trxId && existingTrxIds.includes(payment.trxId)) {
    canAutoVerify = false;
    reasons.push(`Duplicate transaction ID detected: ${payment.trxId}`);
  }
  const paymentAmountBDT = payment.currency === 'BDT' ? (payment.amount || 0) : (payment.amount || 0) * 100;
  const invoiceAmountBDT = invoice.amountBDT || 0;
  if (paymentAmountBDT < invoiceAmountBDT * 0.98) {
    canAutoVerify = false;
    isUnderpaid = true;
    reasons.push(`Underpaid: Received ${payment.amount} ${payment.currency}, expected ${invoice.amountBDT} BDT`);
  }
  if (invoice.amountUSD > settings.maxAutoVerifyAmountUSD) {
    canAutoVerify = false;
    reasons.push(`Invoice total ($${invoice.amountUSD}) exceeds auto-verify limit ($${settings.maxAutoVerifyAmountUSD}).`);
  }
  return { canAutoVerify, reasons, isUnderpaid };
}
