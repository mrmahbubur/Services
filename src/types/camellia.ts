// Camellia Autonomous Operations & Compliance - Types
// Based on M R S Camellia Update Specification

export type ServiceVisibility = 'live' | 'expert_only' | 'waitlist' | 'hidden';

export type AutonomyMode = 'off' | 'suggest' | 'approval' | 'auto';

export interface CamelliaAutonomyPolicy {
  routineQuestions: AutonomyMode;
  clientReminders: AutonomyMode;
  intakeTriage: AutonomyMode;
  draftPreparation: AutonomyMode;
  retryJobs: AutonomyMode;
  reconciliationPrep: AutonomyMode;
  sessionBooking: AutonomyMode;
  dailyBriefing: AutonomyMode;
  isPaused: boolean; // Global pause switch
  lastUpdated: string;
}

export interface CamelliaActivityItem {
  id: string;
  action: string;
  targetType: 'order' | 'client' | 'ticket' | 'payment' | 'system';
  targetId: string;
  summary: string;
  details?: string;
  isUndoable: boolean;
  undone?: boolean;
  timestamp: string;
}

export interface CamelliaSuggestionItem {
  id: string;
  category: 'faq' | 'pricing' | 'service' | 'workflow' | 'quality';
  title: string;
  description: string;
  rationale: string;
  proposedAction: string;
  status: 'pending' | 'accepted' | 'dismissed';
  createdAt: string;
}

export interface KnowledgeArticle {
  id: string;
  category: 'service' | 'policy' | 'pricing' | 'device' | 'faq' | 'payment';
  title: string;
  content: string;
  keywords: string[];
  approvedByOwner: boolean;
  approvedAt?: string;
  useCount: number;
  lastUsedAt?: string;
}

export interface KnowledgeGapItem {
  id: string;
  query: string;
  frequency: number;
  firstAskedAt: string;
  lastAskedAt: string;
  proposedAnswer?: string;
  status: 'open' | 'article_created' | 'dismissed';
}

export interface QualityIncident {
  id: string; // INC-YYMM-NNNN
  category: 'complaint' | 'wrong_output' | 'payment_mismatch' | 'security' | 'outage';
  severity: 'low' | 'medium' | 'high' | 'critical';
  orderId?: string;
  serviceId?: string;
  clientEmail?: string;
  summary: string;
  description: string;
  rootCause?: 'bad_input' | 'prompt' | 'model' | 'recipe' | 'tool' | 'external';
  resolution?: string;
  status: 'open' | 'investigating' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
}

export interface ServiceQualityScore {
  serviceId: string;
  serviceName: string;
  firstTimeApprovalRate: number; // e.g. 94%
  avgRevisions: number;
  avgRating: number;
  refundRate: number;
  incidentCount: number;
  isBetaFallback: boolean;
  orderCount?: number;
  reviewCount?: number;
}

export interface ConsentLogRecord {
  id: string;
  clientId: string;
  termsVersion: string;
  privacyVersion: string;
  acceptedAt: string;
  ipAddress?: string;
}

export interface GoLiveCheckItem {
  id: string;
  category: 'business' | 'payments' | 'security' | 'infrastructure' | 'testing' | 'compliance';
  title: string;
  description: string;
  verified: boolean;
  verifiedAt?: string;
  verifiedBy?: string;
}

export interface SystemHealthMetrics {
  database: 'healthy' | 'degraded' | 'down';
  storage: 'healthy' | 'degraded';
  geminiApi: {
    status: 'healthy' | 'degraded' | 'rate_limited';
    latencyMs: number;
    errorRatePct: number;
  };
  smsBridge: 'healthy' | 'stale' | 'disabled';
  jobWorker: 'healthy' | 'idle' | 'congested';
  lastBackupAt: string;
  lastRestoreTestAt?: string;
  lastRestoreTestPassed?: boolean;
}

export interface PromptVersionRecord {
  id: string;
  serviceId: string; // or 'global_concierge'
  version: string;
  systemPrompt: string;
  changelog: string;
  isActive: boolean;
  testedOnSimulator: boolean;
  createdAt: string;
  createdBy: string;
}
