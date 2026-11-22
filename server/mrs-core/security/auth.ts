/**
 * MRS Core — Security, Sessions & Rate Limiting
 */

import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

const SESSION_SECRET = process.env.MRS_SESSION_SECRET || 'mrs-default-secret-change-in-production-40chars-min';

export function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin.trim()).digest('hex');
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
  if (signature !== expectedSig) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch (e) {
    return null;
  }
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
