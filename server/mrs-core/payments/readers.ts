/**
 * MRS Core — Provider Notice Readers
 * Parses SMS from operators (bKash, Nagad), emails (Payoneer, Skrill, Binance) with DMARC checks,
 * and ledger imports.
 */

export interface ParsedSms {
  provider: 'bkash' | 'nagad' | 'unknown';
  trxId: string;
  amount: number;
  currency: 'BDT';
  sender: string;
  reference?: string;
  balance?: number;
  raw: string;
  valid: boolean;
}

export function parseOperatorSms(senderId: string, text: string): ParsedSms {
  const clean = text.replace(/\s+/g, ' ').trim();
  const lowerSender = senderId.toLowerCase();

  // bKash:
  // "You have received Tk 2,500.00 from 01711098234. Ref PAY-2611-1044. Fee Tk 0.00. Balance Tk 14,250.00. TrxID 9K8X2M99 at 05/11/2026 14:15"
  if (lowerSender.includes('bkash') || lowerSender.includes('16247') || /TrxID\s+[A-Z0-9]+/i.test(clean)) {
    const trxMatch = clean.match(/TrxID\s+([A-Z0-9]+)/i);
    const amtMatch = clean.match(/(?:received|Tk)\s*([0-9,]+(?:\.[0-9]{2})?)/i);
    const senderMatch = clean.match(/from\s+([0-9A-Za-z\+\*]+)/i);
    const refMatch = clean.match(/Ref\s+([A-Za-z0-9\-]+)/i);
    const balMatch = clean.match(/Balance\s+Tk\s*([0-9,]+(?:\.[0-9]{2})?)/i);

    const amount = amtMatch ? parseFloat(amtMatch[1].replace(/,/g, '')) : 0;
    const balance = balMatch ? parseFloat(balMatch[1].replace(/,/g, '')) : undefined;

    return {
      provider: 'bkash',
      trxId: trxMatch ? trxMatch[1].toUpperCase() : '',
      amount,
      currency: 'BDT',
      sender: senderMatch ? senderMatch[1] : 'Unknown',
      reference: refMatch ? refMatch[1] : undefined,
      balance,
      raw: clean,
      valid: amount > 0 && !!trxMatch,
    };
  }

  // Nagad:
  // "Money Received. Amount: Tk 4,500.00. Sender: 01810992341. TxnID: 71B89KX. Balance: Tk 28,450.00."
  if (lowerSender.includes('nagad') || lowerSender.includes('16167') || /TxnID\s*:\s*[A-Z0-9]+/i.test(clean)) {
    const trxMatch = clean.match(/TxnID\s*:\s*([A-Z0-9]+)/i);
    const amtMatch = clean.match(/Amount\s*:\s*(?:Tk|BDT)?\s*([0-9,]+(?:\.[0-9]{2})?)/i);
    const senderMatch = clean.match(/Sender\s*:\s*([0-9A-Za-z\+\*]+)/i);
    const refMatch = clean.match(/Ref\s*:\s*([A-Za-z0-9\-]+)/i);
    const balMatch = clean.match(/Balance\s*:\s*(?:Tk|BDT)?\s*([0-9,]+(?:\.[0-9]{2})?)/i);

    const amount = amtMatch ? parseFloat(amtMatch[1].replace(/,/g, '')) : 0;
    const balance = balMatch ? parseFloat(balMatch[1].replace(/,/g, '')) : undefined;

    return {
      provider: 'nagad',
      trxId: trxMatch ? trxMatch[1].toUpperCase() : '',
      amount,
      currency: 'BDT',
      sender: senderMatch ? senderMatch[1] : 'Unknown',
      reference: refMatch ? refMatch[1] : undefined,
      balance,
      raw: clean,
      valid: amount > 0 && !!trxMatch,
    };
  }

  return {
    provider: 'unknown',
    trxId: '',
    amount: 0,
    currency: 'BDT',
    sender: 'Unknown',
    raw: clean,
    valid: false,
  };
}

export interface ParsedEmail {
  provider: 'payoneer' | 'skrill' | 'binance' | 'unknown';
  trxId: string;
  amount: number;
  currency: 'USD' | 'BDT';
  sender: string;
  dmarcPass: boolean;
  valid: boolean;
  raw: string;
}

export function parsePaymentEmail(from: string, subject: string, body: string, authResults: string): ParsedEmail {
  const dmarcPass = /dmarc=pass/i.test(authResults || '');
  const cleanBody = body.replace(/\s+/g, ' ');
  const lowerFrom = from.toLowerCase();

  if (lowerFrom.includes('payoneer.com') || /payoneer/i.test(subject)) {
    const amtMatch = cleanBody.match(/\$([0-9,]+(?:\.[0-9]{2})?)/i) || cleanBody.match(/([0-9,]+(?:\.[0-9]{2})?)\s*USD/i);
    const trxMatch = cleanBody.match(/Payment ID[:\s]+([0-9A-Za-z\-]+)/i) || cleanBody.match(/Transaction ID[:\s]+([0-9A-Za-z\-]+)/i);
    const amount = amtMatch ? parseFloat(amtMatch[1].replace(/,/g, '')) : 0;

    return {
      provider: 'payoneer',
      trxId: trxMatch ? trxMatch[1] : '',
      amount,
      currency: 'USD',
      sender: 'Payoneer Payer',
      dmarcPass,
      valid: amount > 0 && !!trxMatch && dmarcPass,
      raw: `${subject}\n${body}`,
    };
  }

  if (lowerFrom.includes('skrill.com') || /skrill/i.test(subject)) {
    const amtMatch = cleanBody.match(/\$([0-9,]+(?:\.[0-9]{2})?)/i) || cleanBody.match(/([0-9,]+(?:\.[0-9]{2})?)\s*USD/i);
    const trxMatch = cleanBody.match(/Transaction ID[:\s]+([0-9A-Za-z\-]+)/i) || cleanBody.match(/Ref[:\s]+([0-9A-Za-z\-]+)/i);
    const amount = amtMatch ? parseFloat(amtMatch[1].replace(/,/g, '')) : 0;

    return {
      provider: 'skrill',
      trxId: trxMatch ? trxMatch[1] : '',
      amount,
      currency: 'USD',
      sender: 'Skrill Payer',
      dmarcPass,
      valid: amount > 0 && !!trxMatch && dmarcPass,
      raw: `${subject}\n${body}`,
    };
  }

  if (lowerFrom.includes('binance.com') || /binance/i.test(subject)) {
    const amtMatch = cleanBody.match(/([0-9,]+(?:\.[0-9]{2})?)\s*(?:USDT|USDC|USD)/i);
    const trxMatch = cleanBody.match(/Order ID[:\s]+([0-9A-Za-z\-]+)/i);
    const amount = amtMatch ? parseFloat(amtMatch[1].replace(/,/g, '')) : 0;

    return {
      provider: 'binance',
      trxId: trxMatch ? trxMatch[1] : '',
      amount,
      currency: 'USD',
      sender: 'Binance Payer',
      dmarcPass,
      valid: amount > 0 && !!trxMatch && dmarcPass,
      raw: `${subject}\n${body}`,
    };
  }

  return {
    provider: 'unknown',
    trxId: '',
    amount: 0,
    currency: 'USD',
    sender: 'Unknown',
    dmarcPass,
    valid: false,
    raw: `${subject}\n${body}`,
  };
}
