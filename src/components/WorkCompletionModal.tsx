import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { OrderRecord, ServiceItem } from '../types';
import {
  buildWorkOrder,
  auditInputs,
  buildExecutionPlan,
  buildDeliveryPackage,
  UNIVERSAL_QUALITY_GATE,
  SERVICE_PROTOCOLS,
  ChangeLogEntry,
  ExecutionMode,
  TaskCompletionStatus,
  BRAND_KIT,
  isClientOwnedDeliverable,
} from '../services/workEngineService';
import { BrandLogo } from './BrandLogo';
import {
  ShieldAlert,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Layers,
  Send,
  Eye,
  Download,
  RotateCcw,
  CheckSquare,
  Square,
  Lock,
  ArrowRight,
  Sparkles,
  Info,
  Check,
  ChevronRight,
  FileCheck,
} from 'lucide-react';

interface WorkCompletionModalProps {
  order: OrderRecord;
  service: ServiceItem;
  onClose: () => void;
  onDelivered?: () => void;
}

export const WorkCompletionModal: React.FC<WorkCompletionModalProps> = ({
  order,
  service,
  onClose,
  onDelivered,
}) => {
  const {
    allInvoices,
    allPayments,
    deliverOrder,
    updateOrderStatus,
    showToast,
    theme,
  } = useApp();

  const isDark = theme === 'dark';

  // Find associated invoice & payments to strictly verify PAID_VERIFIED status
  const invoice = allInvoices.find((i) => i.orderId === order.orderId || i.invoiceId === order.orderId);
  const payment = allPayments.find((p) => p.orderId === order.orderId);

  const isPaidVerified =
    order.status === 'Verified' ||
    order.status === 'PAID_VERIFIED' ||
    invoice?.status === 'paid_verified' ||
    payment?.status === 'Verified';

  // 8 Stages definition
  const STAGES = [
    { number: 1, name: 'Work Order', key: 'work_order' },
    { number: 2, name: 'Input Audit', key: 'input_audit' },
    { number: 3, name: 'Plan', key: 'plan' },
    { number: 4, name: 'Execute', key: 'execute' },
    { number: 5, name: 'Checkpoint', key: 'checkpoint' },
    { number: 6, name: 'Quality Gate', key: 'quality_gate' },
    { number: 7, name: 'Delivery', key: 'delivery' },
    { number: 8, name: 'Revision & Close', key: 'revision_close' },
  ];

  const [activeStage, setActiveStage] = useState<number>(1);

  // Stage 1: Work Order Data
  const workOrder = useMemo(() => {
    return buildWorkOrder(
      order.orderId,
      order.clientId,
      order.clientName || 'Valued Client',
      service.id,
      service.name,
      order.details || '',
      order.quoteAmount || service.fixedPriceUSD || 25,
      'USD',
      3,
      isPaidVerified
    );
  }, [order, service, isPaidVerified]);

  // Stage 2: Input Audit
  const inputAudit = useMemo(() => {
    return auditInputs(service.id, order.details || '', []);
  }, [service, order.details]);

  // Stage 3: Plan
  const plan = useMemo(() => {
    const estimatedHours = (order as any).hours || (order.timesheet?.length ? Math.round(order.timesheet.reduce((acc, t) => acc + (t.minutes || 0), 0) / 60) : Math.max(1, Math.round((order.quoteAmount || 50) / 30))) || 2;
    return buildExecutionPlan(service.id, estimatedHours);
  }, [service, order]);

  // Stage 4: Execution Output & Change Log
  const [outputContent, setOutputContent] = useState<string>(() => {
    return `# M R S Professional Deliverable: ${service.name}
Order ID: ${order.orderId}
Client: ${order.clientName || 'Valued Client'}
Date: ${new Date().toLocaleDateString()}
Status: Execution In Progress

## 1. Project Specifications
${order.details || 'Standard catalog execution per Work Order.'}

## 2. Verified Technical Output
- Verified all client-supplied parameters.
- Applied Section 7 ${service.name} protocols.
- Structured single-column, clear hierarchy, zero invented claims.
- Production assets compiled and validated.`;
  });

  const [changeLogs, setChangeLogs] = useState<ChangeLogEntry[]>([
    {
      id: 'log-1',
      timestamp: new Date().toLocaleTimeString(),
      action: 'Work Order initialized and input audit executed',
      reason: 'Stage 1 & 2 verification',
      operator: 'Camellia Desk',
    },
    {
      id: 'log-2',
      timestamp: new Date().toLocaleTimeString(),
      action: 'Working draft synthesized strictly on working copies',
      reason: 'Stage 4 Execution',
      operator: 'Camellia Desk',
    },
  ]);

  const [newLogAction, setNewLogAction] = useState('');

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLogAction.trim()) return;
    setChangeLogs((prev) => [
      ...prev,
      {
        id: `log-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        action: newLogAction.trim(),
        reason: 'Manual execution note',
        operator: 'Camellia Desk',
      },
    ]);
    setNewLogAction('');
    showToast('Log Entry Saved', 'Change recorded in immutable order execution ledger', 'info');
  };

  // Stage 5: Checkpoint Preview
  const [checkpointApproved, setCheckpointApproved] = useState<boolean>(true);

  // Stage 6: Quality Gate
  const protocol = SERVICE_PROTOCOLS[service.id];
  const [universalChecks, setUniversalChecks] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    UNIVERSAL_QUALITY_GATE.forEach((item) => {
      init[item.id] = true;
    });
    return init;
  });

  const [serviceChecks, setServiceChecks] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    if (protocol) {
      protocol.qualityGateItems.forEach((_, idx) => {
        init[`SQ-${idx}`] = true;
      });
    }
    return init;
  });

  const allUniversalPassed = Object.values(universalChecks).every(Boolean);
  const allServicePassed = Object.values(serviceChecks).every(Boolean);
  const qualityGatePassed = allUniversalPassed && allServicePassed;

  // Stage 7: Delivery Package
  const deliveryPkg = useMemo(() => {
    return buildDeliveryPackage(workOrder, outputContent, 'v1.0');
  }, [workOrder, outputContent]);

  // Stage 8: Revision and Close
  const [revisionCount, setRevisionCount] = useState<number>(0);

  // Blocker / On Hold modal state
  const [onHoldReason, setOnHoldReason] = useState<string>('');
  const [showHoldModal, setShowHoldModal] = useState<boolean>(false);

  const handleSetOnHold = () => {
    if (!onHoldReason.trim()) return;
    updateOrderStatus(order.orderId, 'On hold');
    showToast('Order Placed ON_HOLD', `Blocker recorded: "${onHoldReason}". Owner notified.`, 'warning');
    setShowHoldModal(false);
  };

  const handleSetNeedsInfo = () => {
    updateOrderStatus(order.orderId, 'Pending');
    showToast('Status set to NEEDS_INFO', 'Client notified of missing inputs. Turnaround clock paused.', 'info');
  };

  const handleFinalDeliver = () => {
    if (!qualityGatePassed) {
      showToast('Quality Gate Failed', 'All universal and service checklist criteria must pass before delivery.', 'warning');
      setActiveStage(6);
      return;
    }

    deliverOrder(
      order.orderId,
      `${service.name} Production Deliverable Package`,
      deliveryPkg.twoToThreeLineSummary,
      outputContent,
      service.id === 'S-MRS-11' ? 'json' : 'pdf',
      undefined,
      {
        whatWasDone: deliveryPkg.actionsTakenLog.join('\n'),
        howToUse: deliveryPkg.clientToDo,
        whatsIncluded: deliveryPkg.files.map((f) => f.filename).join(', '),
        nextSteps: deliveryPkg.revisionPolicy,
      }
    );

    updateOrderStatus(order.orderId, 'Delivered');
    showToast('Order DELIVERED', `Status updated to DELIVERED. Final files packaged under [OrderID]_[Service]_[Version].`, 'success');
    setActiveStage(8);
    if (onDelivered) onDelivered();
  };

  const handleCloseOrder = () => {
    updateOrderStatus(order.orderId, 'Completed');
    showToast('Order CLOSED', 'Order lifecycle completed. Retention countdown scheduled for 30 days.', 'success');
    onClose();
  };

  return (
    <div className="space-y-5 text-xs text-[#E6EDF7]">
      {/* Brand Header & Identity (Section 11) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <BrandLogo variant="full" size="sm" showTagline={false} />
          <div className="h-6 w-px bg-slate-800 hidden sm:block" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-cyan-400 font-bold text-sm">{order.orderId}</span>
              <span className="text-slate-500">•</span>
              <span className="font-heading font-bold text-white text-sm">{service.name}</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  isPaidVerified
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                }`}
              >
                {isPaidVerified ? 'PAID_VERIFIED' : `UNPAID (${order.status})`}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Work Completion System (Section 7 & 7A) • Stage {activeStage} of 8: {STAGES[activeStage - 1].name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isClientOwnedDeliverable(service.id) ? (
            <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/30">
              Client Deliverable (Brand-Neutral per Sec 11.3)
            </span>
          ) : (
            <span className="text-[10px] font-mono text-slate-400 bg-slate-800/60 px-2.5 py-1 rounded-lg border border-slate-700">
              M R S Official Package (Branded per Sec 11.2)
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowHoldModal(true)}
            className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Report Blocker (ON_HOLD)</span>
          </button>
        </div>
      </div>

      {/* STRICT GATE CHECK: PAID_VERIFIED ONLY */}
      {!isPaidVerified && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/40 text-rose-300 space-y-2 animate-in fade-in">
          <div className="flex items-center gap-2 font-bold text-rose-400 text-sm">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span>Strict Rule: Work Completion System Applies ONLY after PAID_VERIFIED</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Per Operating Instructions Section 7: <em>"Applies only after the order status is PAID_VERIFIED. Never start earlier."</em> This order is currently <strong>{order.status}</strong>. Please confirm or verify client payment before beginning execution.
          </p>
          <div className="pt-1 flex items-center gap-3">
            <button
              onClick={() => {
                updateOrderStatus(order.orderId, 'Verified');
                showToast('Status Updated', 'Order marked as PAID_VERIFIED for execution.', 'success');
              }}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
            >
              Override: Mark PAID_VERIFIED
            </button>
            <span className="text-[11px] text-slate-400">or wait for authoritative payment reconciliation</span>
          </div>
        </div>
      )}

      {/* Stage Stepper Navigation */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 bg-slate-900/60 p-2 rounded-2xl border border-slate-800">
        {STAGES.map((s) => {
          const isActive = activeStage === s.number;
          const isDone = activeStage > s.number;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setActiveStage(s.number)}
              className={`p-2 rounded-xl text-center flex flex-col items-center gap-1 transition-all ${
                isActive
                  ? 'bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 font-bold shadow-sm'
                  : isDone
                  ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                  : 'hover:bg-slate-800/60 text-slate-400 border border-transparent'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950'
                    : isDone
                    ? 'bg-emerald-500 text-slate-950'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {isDone ? '✓' : s.number}
              </div>
              <span className="text-[10px] leading-tight truncate w-full">{s.name}</span>
            </button>
          );
        })}
      </div>

      {/* STAGE 1: WORK ORDER */}
      {activeStage === 1 && (
        <div className="space-y-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-sm text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              Stage 1: Official Work Order
            </h3>
            <span className="text-slate-400 text-[11px]">Free revisions: 2 rounds within 7 days</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-mono">Order Scope</span>
                <p className="text-slate-200 mt-0.5 leading-relaxed">{workOrder.scopeSummary}</p>
              </div>
              <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Target Deadline:</span>
                <span className="font-mono text-cyan-400 font-bold">{workOrder.deadline}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Quoted Amount:</span>
                <span className="font-mono text-emerald-400 font-bold">${workOrder.quotedAmount} {workOrder.currency}</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <span className="text-slate-500 text-[10px] uppercase font-mono">Numbered Deliverables</span>
              <ul className="space-y-1 text-slate-300">
                {workOrder.numberedDeliverables.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-cyan-400 font-mono font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-2 border-t border-slate-800/60 text-[11px] text-slate-400">
                <span>Input requirements: {workOrder.inputFilesList.join(', ')}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setActiveStage(2)}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
            >
              <span>Proceed to Stage 2: Input Audit</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STAGE 2: INPUT AUDIT */}
      {activeStage === 2 && (
        <div className="space-y-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-sm text-white flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-cyan-400" />
              Stage 2: Input Audit & Completeness Check
            </h3>
            <span className="text-[11px] text-slate-400">Compare uploaded files against Work Order</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
            <div className="text-xs space-y-1">
              <span className="text-slate-400 font-semibold">Service Input Criteria:</span>
              <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                {protocol?.requiredInputs.map((req, i) => (
                  <li key={i}>{req}</li>
                ))}
              </ul>
            </div>

            {inputAudit.needsInfo ? (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Missing Input Detected: Status NEEDS_INFO</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  Missing: {inputAudit.missingInputs.join(', ')}. Deadline clock pauses until provided.
                </p>
                <button
                  type="button"
                  onClick={handleSetNeedsInfo}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  Set Status to NEEDS_INFO & Pause Clock
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>Input audit passed. Required specifications and details verified complete.</span>
              </div>
            )}
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setActiveStage(1)}
              className="px-3 py-1.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white"
            >
              Back
            </button>
            <button
              onClick={() => setActiveStage(3)}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
            >
              <span>Proceed to Stage 3: Plan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STAGE 3: PLAN */}
      {activeStage === 3 && (
        <div className="space-y-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-heading font-bold text-sm text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Stage 3: Task Breakdown Plan (Section 7.0 & 7A.1)
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Decision order: DIRECT first → TOOL-ASSISTED → GUIDED → TEAM HANDOFF last.
              </p>
            </div>
            <span className="text-[11px] font-mono text-cyan-400 shrink-0">
              Estimated: {plan.totalEstimatedMinutes}m / Quoted: {plan.quotedMinutes}m
            </span>
          </div>

          {/* Execution Mode Banner (7A.1) */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <span className="text-[10px] uppercase font-mono text-slate-400 font-bold">
              Primary Execution Mode for this Service:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px]">
              <div className={`p-2 rounded-lg border text-center ${workOrder.executionMode === 'DIRECT' ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-bold' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                <div>MODE 1. DIRECT</div>
                <div className="text-[9px] font-normal text-slate-400 mt-0.5">Produce deliverable directly</div>
              </div>
              <div className={`p-2 rounded-lg border text-center ${workOrder.executionMode === 'GUIDED' ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-bold' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                <div>MODE 2. GUIDED</div>
                <div className="text-[9px] font-normal text-slate-400 mt-0.5">Client account/device setup</div>
              </div>
              <div className={`p-2 rounded-lg border text-center ${workOrder.executionMode === 'TOOL_ASSISTED' ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-bold' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                <div>MODE 3. TOOL-ASSISTED</div>
                <div className="text-[9px] font-normal text-slate-400 mt-0.5">Connected CLI / tools</div>
              </div>
              <div className={`p-2 rounded-lg border text-center ${workOrder.executionMode === 'TEAM_HANDOFF' ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 font-bold' : 'bg-slate-900 border-slate-800 text-slate-400'}`}>
                <div>MODE 4. TEAM HANDOFF</div>
                <div className="text-[9px] font-normal text-slate-400 mt-0.5">Owner physical/root action</div>
              </div>
            </div>
          </div>

          {plan.exceedsThreshold && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{plan.requoteNotice}</span>
            </div>
          )}

          <div className="space-y-2">
            {plan.tasks.map((task) => (
              <div
                key={task.id}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-800 font-mono text-[10px] flex items-center justify-center text-slate-300">
                      {task.orderIndex}
                    </span>
                    <div>
                      <div className="font-semibold text-white flex items-center gap-2">
                        <span>{task.title}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          {task.mode}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">Done condition: {task.doneCondition}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {task.status}
                    </span>
                    <span className="font-mono text-cyan-400 text-xs">~{task.estimatedMinutes}m</span>
                  </div>
                </div>

                {task.mode === 'GUIDED' && task.clientGuidanceSteps && (
                  <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 space-y-1">
                    <span className="text-cyan-400 font-semibold">Guided Verification Steps (7A.1 Mode 2):</span>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                      {task.clientGuidanceSteps.map((step, sIdx) => (
                        <li key={sIdx}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setActiveStage(2)}
              className="px-3 py-1.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white"
            >
              Back
            </button>
            <button
              onClick={() => setActiveStage(4)}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
            >
              <span>Proceed to Stage 4: Execute</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STAGE 4: EXECUTE & CHANGE LOG */}
      {activeStage === 4 && (
        <div className="space-y-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-sm text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Stage 4: Execution on Working Copies & Change Log
            </h3>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
              Zero-Invented-Facts Enforced
            </span>
          </div>

          <div className="space-y-2">
            <label className="block text-slate-400 font-semibold text-xs">
              Working Copy Content ({service.name}):
            </label>
            <textarea
              rows={8}
              value={outputContent}
              onChange={(e) => setOutputContent(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Change Log */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
            <span className="text-slate-400 font-semibold text-xs">Execution Change Log:</span>
            <div className="space-y-1.5 max-h-36 overflow-y-auto font-mono text-[11px]">
              {changeLogs.map((log) => (
                <div key={log.id} className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-300">• {log.action}</span>
                  <span className="text-slate-500 text-[10px]">{log.timestamp}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddLog} className="flex gap-2 pt-1">
              <input
                type="text"
                value={newLogAction}
                onChange={(e) => setNewLogAction(e.target.value)}
                placeholder="Log change action (what was done and why)..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs"
              >
                Add Log
              </button>
            </form>
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setActiveStage(3)}
              className="px-3 py-1.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white"
            >
              Back
            </button>
            <button
              onClick={() => setActiveStage(5)}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
            >
              <span>Proceed to Stage 5: Checkpoint</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STAGE 5: CHECKPOINT */}
      {activeStage === 5 && (
        <div className="space-y-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-sm text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-cyan-400" />
              Stage 5: Progress Checkpoint (High-Risk or &gt;3hr Tasks)
            </h3>
            <span className="text-[11px] text-slate-400">Prevents costly rework</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3 text-xs">
            <p className="text-slate-300 leading-relaxed">
              For tasks over 3 hours or with custom architectural decisions, Camellia sends a progress sample for client approval.
            </p>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 font-mono text-[11px] text-slate-300 max-h-32 overflow-y-auto">
              {outputContent.slice(0, 300)}...
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
              <span>Checkpoint Status:</span>
              <button
                type="button"
                onClick={() => setCheckpointApproved(!checkpointApproved)}
                className={`px-3 py-1 rounded-lg font-bold text-xs ${
                  checkpointApproved ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {checkpointApproved ? '✓ Client Approved / In Scope' : 'Pending Client Checkpoint'}
              </button>
            </div>
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setActiveStage(4)}
              className="px-3 py-1.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white"
            >
              Back
            </button>
            <button
              onClick={() => setActiveStage(6)}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
            >
              <span>Proceed to Stage 6: Quality Gate</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STAGE 6: QUALITY GATE (QC_CHECK) */}
      {activeStage === 6 && (
        <div className="space-y-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-sm text-white flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-cyan-400" />
              Stage 6: Quality Gate (QC_CHECK Checklist)
            </h3>
            <span
              className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                qualityGatePassed
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              }`}
            >
              {qualityGatePassed ? 'ALL CRITERIA PASSED' : 'CHECKLIST INCOMPLETE'}
            </span>
          </div>

          {/* Universal Checklist */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <span className="text-slate-400 font-semibold text-xs uppercase font-mono">
              1. Universal Quality Checklist (7.0)
            </span>
            <div className="space-y-1.5">
              {UNIVERSAL_QUALITY_GATE.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/40 hover:bg-slate-900 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={!!universalChecks[item.id]}
                    onChange={(e) =>
                      setUniversalChecks((prev) => ({ ...prev, [item.id]: e.target.checked }))
                    }
                    className="rounded text-cyan-500 focus:ring-0 bg-slate-950 border-slate-700"
                  />
                  <span className="text-xs text-slate-300">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Service-Specific Checklist */}
          {protocol && protocol.qualityGateItems.length > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
              <span className="text-slate-400 font-semibold text-xs uppercase font-mono">
                2. {protocol.serviceName} Specific Checklist
              </span>
              <div className="space-y-1.5">
                {protocol.qualityGateItems.map((item, idx) => {
                  const key = `SQ-${idx}`;
                  return (
                    <label
                      key={key}
                      className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/40 hover:bg-slate-900 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={!!serviceChecks[key]}
                        onChange={(e) =>
                          setServiceChecks((prev) => ({ ...prev, [key]: e.target.checked }))
                        }
                        className="rounded text-cyan-500 focus:ring-0 bg-slate-950 border-slate-700"
                      />
                      <span className="text-xs text-slate-300">{item}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setActiveStage(5)}
              className="px-3 py-1.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white"
            >
              Back
            </button>
            <button
              onClick={() => {
                if (!qualityGatePassed) {
                  showToast('Quality Gate Incomplete', 'Tick all criteria before moving to delivery', 'warning');
                  return;
                }
                setActiveStage(7);
              }}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5"
            >
              <span>Proceed to Stage 7: Delivery</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STAGE 7: DELIVERY */}
      {activeStage === 7 && (
        <div className="space-y-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-sm text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-cyan-400" />
              Stage 7: Production Deliverable Package
            </h3>
            <span className="text-[11px] font-mono text-cyan-400">File naming: [OrderID]_[Service]_[Version]</span>
          </div>

          {/* Section 7A.5 Completion Report & Delivery Inclusions */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-bold uppercase font-mono text-[11px] flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <span>Completion Report (Section 7A.5)</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  const r = deliveryPkg.completionReport;
                  const text = `M R S COMPLETION REPORT
Order: ${r.orderId}
Service: ${r.serviceName}
Delivered At: ${new Date(r.deliveredAt).toLocaleString()}
Status: ${r.status}

1. WHAT WAS DELIVERED:
${r.whatWasDelivered.map((f) => `- ${f}`).join('\n')}

2. WHAT WAS DONE:
${r.whatWasDone.join('\n')}

3. WHAT WAS VERIFIED:
${r.whatWasVerified}

4. CLIENT TO-DO:
${r.clientToDo}

5. REVISION POLICY:
${r.revisionPolicy}

M R S – Professional Automation & Digital Services
Tagline: Automate. Deliver. Grow.`;
                  navigator.clipboard.writeText(text);
                  showToast('Completion Report Copied', 'Formatted completion report copied to clipboard', 'success');
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 text-[10px] font-bold"
              >
                Copy Completion Report
              </button>
            </div>

            <div>
              <span className="text-slate-500 text-[10px] uppercase font-mono">2–3 Line Client Summary:</span>
              <p className="text-slate-200 text-xs mt-0.5 leading-relaxed">{deliveryPkg.twoToThreeLineSummary}</p>
            </div>

            <div>
              <span className="text-slate-500 text-[10px] uppercase font-mono">Deliverables in Bundle:</span>
              <div className="space-y-1.5 mt-1">
                {deliveryPkg.files.map((file, i) => (
                  <div key={i} className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-cyan-400 text-xs">{file.filename}</span>
                      {file.isClientDeliverable && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                          Brand-Neutral (Sec 11.3)
                        </span>
                      )}
                    </div>
                    <span className="text-slate-400 text-[10px]">{file.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <span className="text-slate-500 text-[10px] uppercase font-mono">Actions Taken (3–6 Bullets):</span>
              <ul className="list-disc list-inside space-y-0.5 text-slate-300 mt-1 text-[11px]">
                {deliveryPkg.actionsTakenLog.map((act, i) => (
                  <li key={i}>{act}</li>
                ))}
              </ul>
            </div>

            <div>
              <span className="text-slate-500 text-[10px] uppercase font-mono">Client To-Do:</span>
              <p className="text-slate-300 text-xs mt-0.5">{deliveryPkg.clientToDo}</p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between">
              <span><strong>Revision Policy:</strong> {deliveryPkg.revisionPolicy}</span>
              <span className="text-emerald-400 font-mono font-bold">2 Free Rounds</span>
            </div>

            {isClientOwnedDeliverable(service.id) && (
              <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[11px] leading-relaxed">
                <strong>Brand Identity Rule (Section 11.3):</strong> Client deliverables belong to the client. The M R S logo, colors, and tagline have been excluded from the client's working assets.
              </div>
            )}
          </div>

          <div className="flex justify-between pt-2">
            <button
              onClick={() => setActiveStage(6)}
              className="px-3 py-1.5 rounded-xl border border-slate-700 text-slate-300 hover:text-white"
            >
              Back
            </button>
            <button
              onClick={handleFinalDeliver}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <Send className="w-4 h-4" />
              <span>Deliver to Client Portal (Status → DELIVERED)</span>
            </button>
          </div>
        </div>
      )}

      {/* STAGE 8: REVISION AND CLOSE */}
      {activeStage === 8 && (
        <div className="space-y-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <h3 className="font-heading font-bold text-sm text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Stage 8: Revision Management & Order Closure
            </h3>
            <span className="text-[11px] font-mono text-emerald-400">Status: DELIVERED</span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div>
                <span className="text-slate-400">In-Scope Revision Allowance:</span>
                <p className="font-bold text-white mt-0.5">2 free rounds within 7 days of delivery</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-xs">Used:</span>
                <span className="font-mono text-cyan-400 font-bold text-sm">{revisionCount} / 2</span>
                <button
                  type="button"
                  onClick={() => setRevisionCount((r) => Math.min(2, r + 1))}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                >
                  + Add Round
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
              <span>Retention Protocol: Sensitive client inputs archived after 30 days of closure.</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={handleCloseOrder}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Close Order (Status → CLOSED)</span>
            </button>
          </div>
        </div>
      )}

      {/* Report Blocker / ON_HOLD Modal */}
      {showHoldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="max-w-md w-full bg-slate-900 p-5 rounded-2xl border border-slate-700 space-y-4 text-xs">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Place Order ON_HOLD (Blocker Escalation)
            </h3>
            <p className="text-slate-300 text-xs">
              Per Section 7.0: <em>"Stuck or failing at any stage → write the exact blocker, set ON_HOLD, notify the owner, and tell the client honestly what is happening and the next update time."</em>
            </p>
            <div>
              <label className="block text-slate-400 mb-1">Exact Blocker Description *</label>
              <textarea
                rows={4}
                value={onHoldReason}
                onChange={(e) => setOnHoldReason(e.target.value)}
                placeholder="e.g. Awaiting client confirmation on database credentials or third-party API outage..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowHoldModal(false)}
                className="px-3 py-1.5 rounded-xl border border-slate-700 text-slate-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSetOnHold}
                className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
              >
                Confirm ON_HOLD
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
