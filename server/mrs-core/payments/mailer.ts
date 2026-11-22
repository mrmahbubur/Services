/**
 * MRS Core — Backend Transactional & Activation Email Dispatcher
 * Supports Resend API, SMTP (nodemailer), and Gmail OAuth API when server secrets are set.
 * Never fabricates email delivery: logs honest outbox status when no transport secret is configured.
 */

import nodemailer from 'nodemailer';
import { IStore } from '../store/index.js';

export interface EmailDispatchParams {
  to: string;
  subject: string;
  text: string;
  html: string;
  orderId?: string;
  invoiceId?: string;
  paymentId?: string;
  kind: 'activation_code' | 'payment_verified' | 'notice';
  codeMask?: string;
  monthsPaid?: number;
}

export interface EmailDispatchResult {
  sent: boolean;
  provider: 'resend' | 'smtp' | 'gmail' | 'none';
  status: 'sent' | 'pending_mailer_config' | 'failed';
  messageId?: string;
  detail: string;
  sentAt: string;
}

export function formatDhakaDateTime(iso: string | Date = new Date()): string {
  try {
    const dt = typeof iso === 'string' ? new Date(iso) : iso;
    return `${new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(dt)} (Asia/Dhaka)`;
  } catch {
    return new Date().toISOString();
  }
}

export async function dispatchBackendEmail(
  store: IStore,
  params: EmailDispatchParams
): Promise<EmailDispatchResult> {
  const cleanTo = String(params.to || '').trim();
  const nowIso = new Date().toISOString();
  const ownerEmail = process.env.OWNER_EMAIL || 'mr216873@gmail.com';
  const fromAddress = process.env.SMTP_FROM || process.env.EMAIL_FROM || `M R S Services <${ownerEmail}>`;

  const outboxId = `EML-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  if (!cleanTo || !cleanTo.includes('@')) {
    const res: EmailDispatchResult = {
      sent: false,
      provider: 'none',
      status: 'failed',
      detail: 'Valid verified client email is missing on the order/invoice.',
      sentAt: nowIso,
    };
    await store.set('email_outbox', outboxId, {
      id: outboxId,
      to: cleanTo || 'missing',
      subject: params.subject,
      kind: params.kind,
      orderId: params.orderId,
      invoiceId: params.invoiceId,
      paymentId: params.paymentId,
      codeMask: params.codeMask,
      monthsPaid: params.monthsPaid,
      ...res,
    });
    return res;
  }

  // 1. Resend REST API
  if (process.env.RESEND_API_KEY) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [cleanTo],
          reply_to: ownerEmail,
          subject: params.subject,
          text: params.text,
          html: params.html,
        }),
      });
      const data: any = await r.json().catch(() => ({}));
      if (r.ok && data.id) {
        const result: EmailDispatchResult = {
          sent: true,
          provider: 'resend',
          status: 'sent',
          messageId: data.id,
          detail: `Delivered via Resend API to ${cleanTo}`,
          sentAt: nowIso,
        };
        await store.set('email_outbox', outboxId, {
          id: outboxId,
          to: cleanTo,
          subject: params.subject,
          kind: params.kind,
          orderId: params.orderId,
          invoiceId: params.invoiceId,
          paymentId: params.paymentId,
          codeMask: params.codeMask,
          monthsPaid: params.monthsPaid,
          ...result,
        });
        return result;
      }
      throw new Error(data.message || `Resend HTTP ${r.status}`);
    } catch (err: any) {
      const failRes: EmailDispatchResult = {
        sent: false,
        provider: 'resend',
        status: 'failed',
        detail: `Resend dispatch failed: ${err?.message || 'Unknown error'}`,
        sentAt: nowIso,
      };
      await store.set('email_outbox', outboxId, {
        id: outboxId,
        to: cleanTo,
        subject: params.subject,
        kind: params.kind,
        orderId: params.orderId,
        invoiceId: params.invoiceId,
        paymentId: params.paymentId,
        codeMask: params.codeMask,
        monthsPaid: params.monthsPaid,
        ...failRes,
      });
      return failRes;
    }
  }

  // 2. Standard SMTP via Nodemailer
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const port = Number(process.env.SMTP_PORT || 587);
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465 || process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      const info = await transporter.sendMail({
        from: fromAddress,
        to: cleanTo,
        replyTo: ownerEmail,
        subject: params.subject,
        text: params.text,
        html: params.html,
      });
      const result: EmailDispatchResult = {
        sent: true,
        provider: 'smtp',
        status: 'sent',
        messageId: info.messageId,
        detail: `Delivered via SMTP (${process.env.SMTP_HOST}) to ${cleanTo}`,
        sentAt: nowIso,
      };
      await store.set('email_outbox', outboxId, {
        id: outboxId,
        to: cleanTo,
        subject: params.subject,
        kind: params.kind,
        orderId: params.orderId,
        invoiceId: params.invoiceId,
        paymentId: params.paymentId,
        codeMask: params.codeMask,
        monthsPaid: params.monthsPaid,
        ...result,
      });
      return result;
    } catch (err: any) {
      const failRes: EmailDispatchResult = {
        sent: false,
        provider: 'smtp',
        status: 'failed',
        detail: `SMTP dispatch failed: ${err?.message || 'Unknown error'}`,
        sentAt: nowIso,
      };
      await store.set('email_outbox', outboxId, {
        id: outboxId,
        to: cleanTo,
        subject: params.subject,
        kind: params.kind,
        orderId: params.orderId,
        invoiceId: params.invoiceId,
        paymentId: params.paymentId,
        codeMask: params.codeMask,
        monthsPaid: params.monthsPaid,
        ...failRes,
      });
      return failRes;
    }
  }

  // 3. Gmail REST API OAuth Access Token (if provided)
  const gmailToken = process.env.GMAIL_OAUTH_TOKEN || process.env.GOOGLE_GMAIL_ACCESS_TOKEN;
  if (gmailToken) {
    try {
      const rawMime = [
        `From: ${fromAddress}`,
        `To: ${cleanTo}`,
        `Subject: ${params.subject}`,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=utf-8',
        '',
        params.text,
      ].join('\r\n');
      const encoded = Buffer.from(rawMime, 'utf8').toString('base64url');
      const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${gmailToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: encoded }),
      });
      const data: any = await r.json().catch(() => ({}));
      if (r.ok && data.id) {
        const result: EmailDispatchResult = {
          sent: true,
          provider: 'gmail',
          status: 'sent',
          messageId: data.id,
          detail: `Delivered via Gmail API to ${cleanTo}`,
          sentAt: nowIso,
        };
        await store.set('email_outbox', outboxId, {
          id: outboxId,
          to: cleanTo,
          subject: params.subject,
          kind: params.kind,
          orderId: params.orderId,
          invoiceId: params.invoiceId,
          paymentId: params.paymentId,
          codeMask: params.codeMask,
          monthsPaid: params.monthsPaid,
          ...result,
        });
        return result;
      }
      throw new Error(data?.error?.message || `Gmail API HTTP ${r.status}`);
    } catch (err: any) {
      const failRes: EmailDispatchResult = {
        sent: false,
        provider: 'gmail',
        status: 'failed',
        detail: `Gmail API dispatch failed: ${err?.message || 'Unknown error'}`,
        sentAt: nowIso,
      };
      await store.set('email_outbox', outboxId, {
        id: outboxId,
        to: cleanTo,
        subject: params.subject,
        kind: params.kind,
        orderId: params.orderId,
        invoiceId: params.invoiceId,
        paymentId: params.paymentId,
        codeMask: params.codeMask,
        monthsPaid: params.monthsPaid,
        ...failRes,
      });
      return failRes;
    }
  }

  // No server email transport secret configured — record transparently without fabricating delivery
  const pendingRes: EmailDispatchResult = {
    sent: false,
    provider: 'none',
    status: 'pending_mailer_config',
    detail:
      'Activation code generated cleanly, but outbound email delivery requires server secrets (RESEND_API_KEY or SMTP_HOST/SMTP_USER/SMTP_PASS). Logged in Admin Email Outbox.',
    sentAt: nowIso,
  };
  await store.set('email_outbox', outboxId, {
    id: outboxId,
    to: cleanTo,
    subject: params.subject,
    kind: params.kind,
    orderId: params.orderId,
    invoiceId: params.invoiceId,
    paymentId: params.paymentId,
    codeMask: params.codeMask,
    monthsPaid: params.monthsPaid,
    ...pendingRes,
  });
  return pendingRes;
}

export async function sendActivationOrVerificationEmail(
  store: IStore,
  opts: {
    clientEmail: string;
    clientName: string;
    orderId: string;
    invoiceId: string;
    serviceName: string;
    paymentId: string;
    transactionId: string;
    methodId: string;
    amount: number;
    currency: 'USD' | 'BDT';
    activationCode?: string;
    codeMask?: string;
    monthsPaid?: number;
    expiresAt?: string;
  }
): Promise<EmailDispatchResult> {
  const verifiedTime = formatDhakaDateTime(new Date());
  const expiresTime = opts.expiresAt ? formatDhakaDateTime(opts.expiresAt) : '';

  const hasActivationCode = Boolean(opts.activationCode && opts.monthsPaid);
  const subject = hasActivationCode
    ? `[M R S] Payment Verified & ${opts.monthsPaid}-Month Activation Code — ${opts.orderId}`
    : `[M R S] Payment Verified — Invoice ${opts.invoiceId} (${opts.orderId})`;

  const text = hasActivationCode
    ? [
        `Hello ${opts.clientName || 'Client'},`,
        '',
        `Your payment for ${opts.serviceName} (${opts.orderId}) has been verified automatically by M R S backend inspection.`,
        '',
        `Invoice ID      : ${opts.invoiceId}`,
        `Payment Method  : ${opts.methodId}`,
        `Transaction ID  : ${opts.transactionId}`,
        `Amount Verified : ${opts.amount} ${opts.currency}`,
        `Verified At     : ${verifiedTime}`,
        `Plan Duration   : ${opts.monthsPaid} Month(s)`,
        `Valid Until     : ${expiresTime}`,
        '',
        `YOUR ${opts.monthsPaid}-MONTH ACTIVATION CODE (SHOWN ONCE):`,
        `${opts.activationCode}`,
        '',
        `Security Notice: Only this ${opts.monthsPaid}-month activation code is issued for the paid duration. Save it securely; only a cryptographic SHA-256 hash is retained on our servers.`,
        '',
        'You can monitor your order status and invoices anytime inside your Client Portal using your Client ID & 6-digit PIN.',
        '',
        '— Camellia, M R S AI assistant',
      ].join('\n')
    : [
        `Hello ${opts.clientName || 'Client'},`,
        '',
        `Your payment for ${opts.serviceName} (${opts.orderId}) has been verified automatically by M R S backend inspection.`,
        '',
        `Invoice ID      : ${opts.invoiceId}`,
        `Payment Method  : ${opts.methodId}`,
        `Transaction ID  : ${opts.transactionId}`,
        `Amount Verified : ${opts.amount} ${opts.currency}`,
        `Verified At     : ${verifiedTime}`,
        '',
        'Your deliverables will unlock automatically in your Client Portal once completed and checked.',
        '',
        '— Camellia, M R S AI assistant',
      ].join('\n');

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #0B1220; color: #E6EDF7; border: 1px solid #22314D; border-radius: 16px; padding: 24px;">
      <h2 style="margin: 0 0 8px; color: #22D3EE; font-size: 18px;">M R S — Payment Verified</h2>
      <p style="margin: 0 0 16px; color: #8FA3C0; font-size: 14px;">Hello ${opts.clientName || 'Client'}, your remittance for <strong>${opts.serviceName}</strong> (${opts.orderId}) has been verified.</p>
      <div style="background: #111B2E; border: 1px solid #22314D; border-radius: 12px; padding: 14px; font-size: 13px; line-height: 1.7;">
        <div><strong>Invoice:</strong> ${opts.invoiceId}</div>
        <div><strong>Method:</strong> ${opts.methodId}</div>
        <div><strong>Transaction ID:</strong> <code style="color: #34D399;">${opts.transactionId}</code></div>
        <div><strong>Verified Amount:</strong> ${opts.amount} ${opts.currency}</div>
        <div><strong>Verified Time:</strong> ${verifiedTime}</div>
      </div>
      ${
        hasActivationCode
          ? `<div style="margin-top: 16px; background: #16233B; border: 1px solid #22D3EE; border-radius: 12px; padding: 16px; text-align: center;">
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #22D3EE; font-weight: 700;">${opts.monthsPaid}-Month Activation Code (Shown Once)</div>
              <div style="margin: 8px 0; font-family: 'JetBrains Mono', monospace; font-size: 20px; font-weight: 700; color: #FFFFFF; letter-spacing: 0.06em;">${opts.activationCode}</div>
              <div style="font-size: 12px; color: #8FA3C0;">Valid until: ${expiresTime}</div>
            </div>`
          : ''
      }
      <p style="margin-top: 18px; font-size: 12px; color: #8FA3C0;">— Camellia, M R S AI assistant</p>
    </div>
  `;

  return dispatchBackendEmail(store, {
    to: opts.clientEmail,
    subject,
    text,
    html,
    orderId: opts.orderId,
    invoiceId: opts.invoiceId,
    paymentId: opts.paymentId,
    kind: hasActivationCode ? 'activation_code' : 'payment_verified',
    codeMask: opts.codeMask,
    monthsPaid: opts.monthsPaid,
  });
}
