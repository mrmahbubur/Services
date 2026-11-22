import React from 'react';
import {
  CamelliaAutonomyPolicy,
  KnowledgeArticle,
  QualityIncident,
  ServiceQualityScore,
  GoLiveCheckItem,
} from '../types/camellia';

export const DEFAULT_AUTONOMY_POLICY: CamelliaAutonomyPolicy = {
  routineQuestions: 'auto',
  clientReminders: 'approval',
  intakeTriage: 'auto',
  draftPreparation: 'approval',
  retryJobs: 'auto',
  reconciliationPrep: 'approval',
  sessionBooking: 'suggest',
  dailyBriefing: 'auto',
  isPaused: false,
  lastUpdated: new Date().toISOString(),
};

export const INITIAL_GO_LIVE_CHECKS: GoLiveCheckItem[] = [
  { id: 'GL-01', category: 'business', title: 'Real Business Details & Contact Info Published', description: 'Owner email (mr216873@gmail.com), WhatsApp (+8801810853282), and terms reviewed.', verified: false },
  { id: 'GL-02', category: 'payments', title: 'Payment Accounts Verified & Tested', description: 'bKash, Nagad, Payoneer, Skrill verified with real test transfers.', verified: false },
  { id: 'GL-03', category: 'payments', title: 'Payment Auto-Verify Limits & Kill Switch Tested', description: 'Auto-verify ceiling set to safe $50 USD; emergency kill switch verified.', verified: false },
  { id: 'GL-04', category: 'infrastructure', title: 'Durable Firestore Persistence & Restore Verified', description: 'FIREBASE_SERVICE_ACCOUNT connected and state exported/tested.', verified: false },
  { id: 'GL-05', category: 'security', title: 'Production Admin Password & Session Secret Set', description: 'Custom MRS_ADMIN_PASSWORD and 32+ char MRS_SESSION_SECRET configured.', verified: false },
  { id: 'GL-06', category: 'infrastructure', title: 'SMS Forwarder & Email Collectors Reporting', description: 'Live /api/ingest/sms and /api/ingest/email heartbeats confirmed.', verified: false },
  { id: 'GL-07', category: 'infrastructure', title: 'Gemini API Key Active & Tested', description: 'GEMINI_API_KEY configured and /api/admin/selftest?live=1 passes.', verified: false },
  { id: 'GL-08', category: 'infrastructure', title: 'HTTPS Domain & SSL Certificate Validated', description: 'TLS encryption verified on production domain.', verified: false },
  { id: 'GL-09', category: 'compliance', title: 'Mobile (360px) & WCAG AA Accessibility Passed', description: 'Audited across payment, order request, and portal views.', verified: false },
  { id: 'GL-10', category: 'testing', title: 'E2E Verification Suite Passed', description: 'All Playwright MCP live verification checks green.', verified: false },
  { id: 'GL-11', category: 'testing', title: 'Human QA Spot-Check of Sample Outputs Completed', description: 'Owner reviewed live drafts before enabling auto-release.', verified: false },
  { id: 'GL-12', category: 'compliance', title: 'Camellia AI Disclosure & Content Policy Active', description: 'Camellia identifies strictly as AI assistant and respects payment/price boundaries.', verified: false },
  { id: 'GL-13', category: 'business', title: 'Sandbox / Simulations Removed Across Production Build', description: 'All test modes, fake generators, and mock data removed.', verified: false },
];

export const INITIAL_KNOWLEDGE_ARTICLES: KnowledgeArticle[] = [
  {
    id: 'KB-01',
    category: 'service',
    title: 'What Camellia Does vs. The Owner',
    content: 'Camellia is the AI assistant for M R S Services. She answers catalog questions, checks order progress, prepares initial work drafts when enabled, and escalates quotes, refunds, or payment verification to the owner (Md. Mahbubur Rahman).',
    keywords: ['camellia', 'owner', 'ai', 'coordinator', 'who does the work'],
    approvedByOwner: true,
    useCount: 0,
  },
  {
    id: 'KB-02',
    category: 'payment',
    title: 'Official Receiving Accounts (Section 5B)',
    content: 'Bangladesh (BDT): bKash Personal 01810853282 (Send Money) or Nagad Personal 01810853282 (Send Money). International (USD): Payoneer Customer ID 108003450 / mr216873@gmail.com, Skrill Customer ID 407108385 / mr216873@gmail.com. Binance Pay only when enabled.',
    keywords: ['bkash', 'nagad', 'payoneer', 'skrill', 'binance', 'payment'],
    approvedByOwner: true,
    useCount: 0,
  },
];

export const INITIAL_INCIDENTS: QualityIncident[] = [];
export const SEEDED_QUALITY_SCORES: ServiceQualityScore[] = [];

export function classifyInboundMessage(text: string): {
  category: 'question' | 'status' | 'revision' | 'complaint' | 'payment' | 'spam' | 'other';
  confidence: number;
  sentiment: 'positive' | 'neutral' | 'negative';
} {
  const lower = text.toLowerCase();
  if (lower.includes('unhappy') || lower.includes('terrible') || lower.includes('wrong') || lower.includes('disappointed') || lower.includes('fail')) {
    return { category: 'complaint', confidence: 0.92, sentiment: 'negative' };
  }
  if (lower.includes('revision') || lower.includes('change this') || lower.includes('modify') || lower.includes('edit')) {
    return { category: 'revision', confidence: 0.88, sentiment: 'neutral' };
  }
  if (lower.includes('status') || lower.includes('progress') || lower.includes('when will') || lower.includes('ready yet')) {
    return { category: 'status', confidence: 0.94, sentiment: 'neutral' };
  }
  if (lower.includes('pay') || lower.includes('paid') || lower.includes('trx') || lower.includes('bkash') || lower.includes('nagad') || lower.includes('invoice')) {
    return { category: 'payment', confidence: 0.95, sentiment: 'neutral' };
  }
  if (lower.includes('casino') || lower.includes('http://spambot')) {
    return { category: 'spam', confidence: 0.98, sentiment: 'neutral' };
  }
  if (lower.includes('how') || lower.includes('what') || lower.includes('can you') || lower.includes('cost') || lower.includes('price')) {
    return { category: 'question', confidence: 0.85, sentiment: 'positive' };
  }
  return { category: 'other', confidence: 0.6, sentiment: 'neutral' };
}

export const CamelliaAvatar: React.FC<{ size?: number; className?: string }> = ({ size = 28, className = '' }) => {
  return (
    <div
      style={{ width: size, height: size }}
      className={`rounded-full flex items-center justify-center shrink-0 bg-pink-500/10 border border-pink-400/40 text-pink-400 shadow-sm ${className}`}
      title="Camellia · AI assistant"
    >
      <svg
        viewBox="0 0 24 24"
        width={size * 0.65}
        height={size * 0.65}
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 2C13.5 4.5 15.5 5 18 5C17.5 7.5 18 9.5 20.5 11C18.5 12.5 18 14.5 18 17C15.5 16.5 13.5 17 12 19.5C10.5 17 8.5 16.5 6 17C6 14.5 5.5 12.5 3.5 11C6 9.5 6.5 7.5 6 5C8.5 5 10.5 4.5 12 2Z"
          fill="#F472B6"
          opacity="0.85"
        />
        <circle cx="12" cy="11.5" r="3.2" fill="#FBCFE8" />
        <circle cx="12" cy="11.5" r="1.4" fill="#BE185D" />
      </svg>
    </div>
  );
};
