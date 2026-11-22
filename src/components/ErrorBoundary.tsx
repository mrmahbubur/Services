import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    const rawMsg = error instanceof Error ? error.message : String(error || 'Unexpected error');
    let friendlyMsg = rawMsg;
    try {
      const parsed = JSON.parse(rawMsg);
      if (parsed?.error && parsed?.operationType) {
        friendlyMsg = `Storage access notice (${parsed.operationType}): ${parsed.error}`;
      }
    } catch {
      // Plain non-JSON error message
    }
    return { hasError: true, errorMessage: friendlyMsg };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('[M R S ErrorBoundary]', error, info.componentStack);
    try {
      const msg = error instanceof Error ? error.message : String(error || 'Unexpected error');
      let operationType = 'runtime';
      let path = typeof window !== 'undefined' ? window.location.pathname : '/';
      try {
        const parsed = JSON.parse(msg);
        if (parsed?.operationType) operationType = String(parsed.operationType);
        if (parsed?.path) path = String(parsed.path);
      } catch {
        // Non-JSON runtime error
      }
      void fetch('/api/telemetry/client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operationType,
          path,
          error: msg.slice(0, 2000),
        }),
      }).catch(() => {});
    } catch {
      // Ignore telemetry failures inside error boundary
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        role="alert"
        aria-live="assertive"
        className="min-h-screen flex items-center justify-center p-6 bg-[var(--color-bg)] text-[var(--color-text)]"
      >
        <div className="mrs-card max-w-md w-full p-6 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-xl bg-[#FB7185]/15 text-[#FB7185] flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold font-heading">Something went wrong</h1>
          <p className="text-sm text-[var(--color-muted)] break-words">
            {this.state.errorMessage || 'An unexpected rendering issue occurred. Please reload the view.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, errorMessage: '' })}
              className="inline-flex items-center gap-2 px-4 min-h-[44px] rounded-[var(--radius-sm)] bg-[var(--color-primary)] text-[#0B1220] font-semibold text-sm cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Try Again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 min-h-[44px] rounded-[var(--radius-sm)] border border-[var(--color-border)] text-sm font-semibold cursor-pointer"
            >
              Reload Page
            </button>
            <a
              href="/"
              className="inline-flex items-center gap-2 px-4 min-h-[44px] rounded-[var(--radius-sm)] border border-[var(--color-border)] text-sm font-semibold"
            >
              <Home className="w-4 h-4" />
              Home
            </a>
          </div>
        </div>
      </div>
    );
  }
}
