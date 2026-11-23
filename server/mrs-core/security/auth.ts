/**
 * MRS Core — Security, Sessions & Rate Limiting
 */

import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

const SESSION_SECRET = process.env.MRS_SESSION_SECRET || crypto.randomBytes(32).toString('hex');

export function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin.trim()).digest('hex');
}

export function timingSafeEqualStrings(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

const SCRYPT_KEYLEN = 64;
const SCRYPT_OPTIONS: crypto.ScryptOptions = { N: 16384, r: 8, p: 1 };

export function hashPasswordScrypt(password: string): string {
  if (typeof password !== 'string' || password.length === 0) {
    throw new Error('Password must be a non-empty string.');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_OPTIONS).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

export function verifyPasswordScrypt(password: string, storedHash: string): boolean {
  if (typeof password !== 'string' || password.length === 0) return false;
  if (!storedHash || typeof storedHash !== 'string') return false;
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, hexDigest] = parts;
  if (!salt || !/^[a-f0-9]{128}$/i.test(hexDigest || '')) return false;
  try {
    const derived = crypto.scryptSync(password, salt, SCRYPT_KEYLEN, SCRYPT_OPTIONS);
    const expected = Buffer.from(hexDigest, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export function generateToken(payload: Record<string, any>, expiresInSeconds: number = 7 * 24 * 3600): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): Record<string, any> | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(`${header}.${body}`).digest('base64url');
  if (!timingSafeEqualStrings(signature, expectedSig)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

export function createAttemptLimiter(maxAttempts: number, windowMs: number) {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  return {
    check(key: string): { allowed: boolean; retryAfterSec: number } {
      const now = Date.now();
      const entry = buckets.get(key);
      if (!entry || entry.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, retryAfterSec: 0 };
      }
      if (entry.count >= maxAttempts) {
        return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
      }
      entry.count += 1;
      return { allowed: true, retryAfterSec: 0 };
    },
    reset(key: string): void {
      buckets.delete(key);
    },
  };
}

export function extractBearerToken(req: Request, preferredCookie?: 'mrs_session' | 'mrs_admin_session'): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim();
  }
  const cookies = req.headers.cookie;
  if (cookies) {
    if (preferredCookie) {
      const m = cookies.match(new RegExp(`(?:^|;\\s*)${preferredCookie}=([^;]+)`));
      if (m) return decodeURIComponent(m[1]);
    }
    const match = cookies.match(/(?:^|;\s*)(?:mrs_session|mrs_admin_session)=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}

export function containsSecretOrPassword(text: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  const suspiciousKeywords = [
    'password:',
    'passwd:',
    'api_key:',
    'apikey:',
    'secret_key:',
    'private_key',
    'bearer ey',
    'ghp_',
    'ai_za',
  ];
  return suspiciousKeywords.some((k) => lower.includes(k));
}
