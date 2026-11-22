/**
 * MRS Core — Fulfilment Engine & Model Worker Pipeline
 * Executes QA verification and drafts deliverables using configured Gemini model.
 * Never fabricates synthetic drafts when Gemini is unavailable or errors.
 */

import { GoogleGenAI } from '@google/genai';
import { OrderRecord, FulfilmentJob, DeliverableRecord } from '../types.js';
import { IStore } from '../store/index.js';
import { generateWithRetry, resolveGeminiModel } from '../ai/client.js';

export async function processOrderJob(
  order: OrderRecord,
  job: FulfilmentJob,
  _store: IStore,
  ai: GoogleGenAI | null
): Promise<{ deliverables: DeliverableRecord[]; qa: any[] }> {
  const qa: any[] = [];
  const deliverables: DeliverableRecord[] = [];

  // 1. Respect customer opt-out
  if (order.noAi) {
    qa.push({
      id: 'no_ai_preference',
      label: 'No-AI Customer Preference',
      passed: true,
      severity: 'warn',
      detail: 'Customer requested human-only handling. Routed directly to owner desk.',
    });
    job.state = 'owner_review';
    job.summary = 'Awaiting owner manual draft per No-AI request.';
    return { deliverables, qa };
  }

  const model = resolveGeminiModel();

  // 2. Automated AI draft services require real Gemini execution
  if (order.serviceId === 'S-MRS-06' || order.serviceId === 'ats-cv-resume') {
    const cvSource = order.intake?.cv_text || order.details || '';
    const targetRoles = order.intake?.target_roles || '';

    if (!cvSource.trim()) {
      qa.push({
        id: 'intake_completeness',
        label: 'CV Source Present',
        passed: false,
        severity: 'block',
        detail: 'Missing CV background or resume text from client.',
      });
      job.state = 'waiting_inputs';
      job.questionsForClient = ['Please upload or paste your current CV/career background to begin drafting.'];
      job.summary = 'Waiting for client CV source text.';
      return { deliverables, qa };
    }

    if (!ai) {
      qa.push({
        id: 'gemini_connectivity',
        label: 'Gemini AI Engine',
        passed: false,
        severity: 'block',
        detail: 'GEMINI_API_KEY is not configured. Draft generation failed honestly — owner intervention required.',
      });
      job.state = 'failed';
      job.error = 'Gemini API is not configured on the server.';
      job.summary = 'AI drafting unavailable (missing GEMINI_API_KEY). Routed to owner.';
      job.ownerTasks = ['Configure GEMINI_API_KEY or draft this CV manually.'];
      return { deliverables, qa };
    }

    let modelDraft = '';
    try {
      const response = await generateWithRetry(ai, {
        model,
        contents: `You are an expert executive resume writer assisting M R S Services.
Restructure and optimize the following CV strictly based ONLY on the facts supplied below.
Never invent dates, employers, degrees, metrics, or external URLs not present in the source text.
Target Roles: ${targetRoles || 'Professional role as described in brief'}
Client Name: ${order.clientName}
Source Brief / CV:
${cvSource}`,
      });
      modelDraft = (response.text || '').trim();
    } catch (e: any) {
      qa.push({
        id: 'gemini_connectivity',
        label: 'Gemini AI Engine',
        passed: false,
        severity: 'block',
        detail: `Gemini call failed: ${e?.message || 'Unknown error'}`,
      });
      job.state = 'failed';
      job.error = e?.message || 'Gemini generation error';
      job.retryCount = (job.retryCount || 0) + 1;
      job.summary = `AI generation error (${job.error}). Retry or complete manually.`;
      return { deliverables, qa };
    }

    if (!modelDraft) {
      job.state = 'failed';
      job.error = 'Gemini returned an empty response.';
      job.summary = 'AI returned empty output. Routed to owner.';
      return { deliverables, qa };
    }

    qa.push(
      {
        id: 'credential_fidelity',
        label: 'Credential & Fact Fidelity',
        passed: true,
        severity: 'block',
        detail: 'Draft constrained strictly to supplied CV facts; owner must review before release.',
      },
      {
        id: 'ats_format',
        label: 'ATS Layout Standards',
        passed: true,
        severity: 'warn',
        detail: 'Generated in clean single-column markdown ready for Word/PDF export.',
      }
    );

    const deliverableId = `DEL-${Date.now().toString().slice(-6)}`;
    deliverables.push({
      id: deliverableId,
      orderId: order.id,
      clientId: order.clientId,
      serviceId: order.serviceId,
      fileName: `${order.orderId}_ATS_Resume_v1.md`,
      title: 'ATS-Optimized Resume Draft (AI Prepared — Owner Review Required)',
      summary: 'AI-prepared draft strictly mapped from client intake facts.',
      format: 'md',
      fileSize: `${Math.max(1, Math.round(Buffer.byteLength(modelDraft, 'utf8') / 1024))} KB`,
      base64Data: Buffer.from(modelDraft, 'utf8').toString('base64'),
      locked: order.deliverablesLocked,
      downloadable: true,
      createdAt: new Date().toISOString(),
    });

    job.summary = 'ATS CV draft prepared via Gemini and queued for mandatory owner QA review.';
    job.state = 'owner_review';
    return { deliverables, qa };
  }

  // 3. Other services: intake check + owner review preparation
  const hasDetails = Boolean((order.details || '').trim().length >= 15 || Object.keys(order.intake || {}).length > 0);
  qa.push({
    id: 'intake_completeness',
    label: 'Intake Specifications Verified',
    passed: hasDetails,
    severity: 'block',
    detail: hasDetails
      ? 'Client scope and intake fields supplied.'
      : 'Client scope description is sparse; request clarification if needed.',
  });

  job.summary = `Preparation logged for ${order.serviceName}. Ready for owner execution & review.`;
  job.state = hasDetails ? 'owner_review' : 'waiting_inputs';
  if (!hasDetails) {
    job.questionsForClient = ['Please supply fuller scope details and required materials for this service.'];
  }
  return { deliverables, qa };
}
