import React, { useState } from 'react';
import {
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  RefreshCw,
  Copy,
  Check,
  CheckCheck,
  AlertTriangle,
} from 'lucide-react';

interface PlaywrightMcpStepResult {
  stepId: string;
  name: string;
  description: string;
  durationMs: number;
  status: 'passed' | 'failed' | 'skipped';
  assertion: string;
  detail?: string;
}

interface PlaywrightMcpRunReport {
  suite: string;
  version: string;
  timestamp: string;
  totalTests: number;
  passed: number;
  failed: number;
  durationMs: number;
  allPassed: boolean;
  steps: PlaywrightMcpStepResult[];
  playwrightCliSnippet: string;
}

export const PlaywrightMcpConsole: React.FC = () => {
  const [report, setReport] = useState<PlaywrightMcpRunReport | null>(null);
  const [running, setRunning] = useState(false);
  const [copiedCli, setCopiedCli] = useState(false);

  const handleRunSuite = async () => {
    setRunning(true);
    try {
      const res = await fetch('/api/admin/playwright-mcp/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch (err) {
      console.warn('Playwright MCP run error:', err);
    } finally {
      setRunning(false);
    }
  };

  const handleCopyCli = () => {
    if (report?.playwrightCliSnippet) {
      navigator.clipboard.writeText(report.playwrightCliSnippet);
      setCopiedCli(true);
      setTimeout(() => setCopiedCli(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar with Trigger Button */}
      <div className="p-6 rounded-2xl bg-[#0D1526] border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <h3 className="font-heading font-bold text-lg text-white">Playwright MCP Synthetic Verification Suite</h3>
          </div>
          <p className="text-xs text-slate-400">
            Automated Model Context Protocol (MCP) end-to-end assertions verifying public routes, order placement, PIN lockout, and deliverable access gates.
          </p>
        </div>

        <button
          onClick={handleRunSuite}
          disabled={running}
          className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-md self-start sm:self-auto shrink-0"
        >
          {running ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Executing Test Suite...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>Run Playwright MCP Suite</span>
            </>
          )}
        </button>
      </div>

      {/* Summary Scorecard */}
      {report && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase block">Total Scenarios</span>
            <span className="text-lg font-bold text-white">{report.totalTests}</span>
          </div>

          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
            <span className="text-emerald-400 text-[10px] uppercase block">Passed Assertions</span>
            <span className="text-lg font-bold text-emerald-400">{report.passed}</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase block">Failed</span>
            <span className={`text-lg font-bold ${report.failed > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
              {report.failed}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1">
            <span className="text-slate-400 text-[10px] uppercase block">Execution Duration</span>
            <span className="text-lg font-bold text-cyan-400">{report.durationMs} ms</span>
          </div>
        </div>
      )}

      {/* Step by Step Results Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold block">
            Synthetic MCP Assertion Steps
          </span>
          {report && (
            <span className="text-[11px] font-mono text-slate-500">
              Run completed at {new Date(report.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>

        {report?.steps ? (
          <div className="space-y-2">
            {report.steps.map((step) => {
              const isPass = step.status === 'passed';
              return (
                <div
                  key={step.stepId}
                  className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isPass ? 'bg-[#0D1526]/80 border-slate-800' : 'bg-rose-500/10 border-rose-500/30'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {isPass ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-white">{step.name}</span>
                        <span className="text-[10px] font-mono text-slate-500">[{step.stepId}]</span>
                      </div>
                      <p className="text-[11px] text-slate-400">{step.description}</p>
                      <code className="text-[10px] font-mono text-cyan-300 block bg-slate-950 px-2 py-1 rounded border border-slate-850">
                        {step.assertion}
                      </code>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 text-right shrink-0">
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                        isPass
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      {step.status}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">{step.durationMs}ms</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 rounded-2xl border border-dashed border-slate-800 bg-slate-900/30 text-center space-y-3">
            <Terminal className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="space-y-1">
              <span className="text-xs font-semibold text-slate-300 block">No Test Run Recorded Yet</span>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                Click &ldquo;Run Playwright MCP Suite&rdquo; above to execute the automated synthetic verification suite against the local server endpoints.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Playwright Headless CLI Snippet */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-200">Local Headless Playwright Run Command</span>
          <button
            onClick={handleCopyCli}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono flex items-center gap-1 transition-colors"
          >
            {copiedCli ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
            <span>{copiedCli ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <pre className="p-3 rounded-lg bg-slate-950 font-mono text-[11px] text-cyan-300 border border-slate-850 overflow-x-auto">
          npx playwright test tests/mrs-e2e.spec.ts --project=chromium --headed
        </pre>
      </div>
    </div>
  );
};
