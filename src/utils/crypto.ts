/**
 * Generates a unique, standardized Client ID in the exact format: MRS-YYMM-XXXX
 * e.g. MRS-2611-A7K2
 */
export function generateClientId(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // omitted 0, O, 1, I for readability
  let randomPart = '';
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `MRS-${yy}${mm}-${randomPart}`;
}

/**
 * Generates a 6-digit access PIN
 */
export function generateSixDigitPin(): string {
  const pinNum = Math.floor(100000 + Math.random() * 900000);
  return String(pinNum);
}

/**
 * Generates an Order ID: ORD-YYMM-NNNN
 */
export function generateOrderId(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${yy}${mm}-${rand}`;
}

/**
 * Generates an Invoice ID: INV-YYMM-NNNN
 */
export function generateInvoiceId(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${yy}${mm}-${rand}`;
}

export function generateInvoiceNumber(): string {
  return generateInvoiceId();
}

/**
 * Generates a Payment reference code: PAY-YYMM-NNNN
 */
export function generatePaymentRef(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `PAY-${yy}${mm}-${rand}`;
}

export function generateOrderRef(orderId?: string): string {
  if (orderId && orderId.startsWith('ORD-')) {
    return orderId.replace('ORD-', 'PAY-');
  }
  return generatePaymentRef();
}

/**
 * Generates a Receipt ID: RCP-YYMM-NNNN
 */
export function generateReceiptId(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `RCP-${yy}${mm}-${rand}`;
}

/**
 * Hashes a PIN using SHA-256 via the browser Web Crypto API
 */
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + '_mrs_salt_2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verifies if entered PIN matches the stored hash
 */
export async function verifyPin(enteredPin: string, storedHash: string): Promise<boolean> {
  const enteredHash = await hashPin(enteredPin);
  return enteredHash === storedHash;
}

/**
 * Fast hash for files (used for duplicate screenshot detection)
 */
export async function hashFile(file: File | Blob): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
