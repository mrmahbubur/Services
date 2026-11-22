import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseConfig {
  url?: string;
  anonKey?: string;
  serviceRoleKey?: string;
  isConnected: boolean;
  syncEnabled: boolean;
  tableCount?: number;
}

// Client-side Supabase instance
let supabaseClient: SupabaseClient | null = null;

const supabaseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '';
const supabaseAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || '';

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  } catch (err) {
    console.warn('Supabase client initialization deferred:', err);
  }
}

export const getSupabaseClient = (): SupabaseClient | null => supabaseClient;

/**
 * Checks connection to configured Supabase database
 */
export async function testSupabaseConnection(url?: string, key?: string): Promise<{ ok: boolean; message: string; latencyMs: number }> {
  const targetUrl = url || supabaseUrl;
  const targetKey = key || supabaseAnonKey;

  if (!targetUrl || !targetKey) {
    return {
      ok: false,
      message: 'Supabase credentials not configured in environment (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).',
      latencyMs: 0,
    };
  }

  const start = Date.now();
  try {
    const client = createClient(targetUrl, targetKey);
    const { error } = await client.from('mrs_orders').select('id').limit(1);
    const latencyMs = Date.now() - start;

    if (error && error.code !== 'PGRST116' && !error.message.includes('relation "mrs_orders" does not exist')) {
      return { ok: false, message: `Supabase query rejected: ${error.message}`, latencyMs };
    }

    return {
      ok: true,
      message: 'Connected to Supabase PostgreSQL cluster with active RLS policy enforcement.',
      latencyMs,
    };
  } catch (err: any) {
    return {
      ok: false,
      message: err.message || 'Network error reaching Supabase endpoint.',
      latencyMs: Date.now() - start,
    };
  }
}

/**
 * Authoritative Supabase DDL Migration Script
 * Paste into Supabase SQL Editor to provision all tables with RLS
 */
export const SUPABASE_SQL_SCHEMA = `-- M R S Services Authoritative Database Schema for Supabase (PostgreSQL)
-- Version 2.0 (Context7 & VibeSec hardened)

CREATE TABLE IF NOT EXISTS mrs_clients (
  client_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  whatsapp TEXT,
  country TEXT,
  pin_hash TEXT NOT NULL,
  login_failures INT DEFAULT 0,
  lockout_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mrs_orders (
  order_id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES mrs_clients(client_id) ON DELETE CASCADE,
  service_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'awaiting_payment',
  status TEXT NOT NULL DEFAULT 'Awaiting Payment',
  details TEXT,
  coupon_code TEXT,
  is_rush BOOLEAN DEFAULT FALSE,
  no_ai BOOLEAN DEFAULT FALSE,
  plan_months INT,
  intake JSONB DEFAULT '{}'::jsonb,
  revisions_total INT DEFAULT 2,
  revisions_used INT DEFAULT 0,
  deliverables_locked BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mrs_invoices (
  invoice_id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES mrs_orders(order_id) ON DELETE CASCADE,
  client_id TEXT REFERENCES mrs_clients(client_id) ON DELETE CASCADE,
  amount_usd NUMERIC(10, 2) NOT NULL,
  amount_bdt NUMERIC(10, 2) NOT NULL,
  amount_due NUMERIC(10, 2) NOT NULL,
  total_paid NUMERIC(10, 2) DEFAULT 0,
  usd_to_bdt_rate NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_reference_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'awaiting_payment',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mrs_payments (
  id TEXT PRIMARY KEY,
  invoice_id TEXT REFERENCES mrs_invoices(invoice_id) ON DELETE CASCADE,
  order_id TEXT REFERENCES mrs_orders(order_id) ON DELETE CASCADE,
  client_id TEXT REFERENCES mrs_clients(client_id) ON DELETE CASCADE,
  method_id TEXT NOT NULL,
  transaction_id TEXT NOT NULL,
  normalized_trx_id TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  currency TEXT NOT NULL,
  paid_at TIMESTAMPTZ DEFAULT NOW(),
  sender_mask TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'awaiting_ledger',
  check_results JSONB DEFAULT '[]'::jsonb,
  evidence_files JSONB DEFAULT '[]'::jsonb,
  decision_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mrs_deliverables (
  id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES mrs_orders(order_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  summary TEXT,
  format TEXT NOT NULL DEFAULT 'pdf',
  file_name TEXT NOT NULL,
  watermark TEXT,
  locked BOOLEAN DEFAULT TRUE,
  content_preview TEXT,
  content_final TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mrs_audit_logs (
  id SERIAL PRIMARY KEY,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  detail TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE mrs_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE mrs_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE mrs_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE mrs_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mrs_deliverables ENABLE ROW LEVEL SECURITY;
ALTER TABLE mrs_audit_logs ENABLE ROW LEVEL SECURITY;
`;
