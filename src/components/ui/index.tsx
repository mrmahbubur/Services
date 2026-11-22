import React, { useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Info,
  Loader2,
  Inbox,
  X,
} from 'lucide-react';

// Shared Button enforcing min 44px touch targets and 10px control radius
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}) => {
  const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary:
      'bg-[#22D3EE] hover:bg-[#06B6D4] text-[#0B1220] font-semibold border border-transparent',
    secondary:
      'bg-[var(--color-elevated)] hover:opacity-90 text-[var(--color-text)] font-semibold border border-[var(--color-border)]',
    outline:
      'bg-transparent hover:bg-[var(--color-elevated)] text-[var(--color-text)] font-medium border border-[var(--color-border)]',
    danger:
      'bg-[#FB7185]/15 hover:bg-[#FB7185]/25 text-[#FB7185] font-semibold border border-[#FB7185]/40',
    ghost:
      'bg-transparent hover:bg-[var(--color-elevated)] text-[var(--color-muted)] hover:text-[var(--color-text)] border border-transparent',
  };

  const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
    sm: 'min-h-[40px] px-3 py-2 text-xs',
    md: 'min-h-[44px] px-4 py-2.5 text-sm',
    lg: 'min-h-[48px] px-5 py-3 text-sm',
  };

  return (
    <button
      disabled={disabled || loading}
      className={`mrs-control inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
      {children}
    </button>
  );
};

// Shared Input with label above field & inline error feedback
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  mono?: boolean;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  mono = false,
  id,
  className = '',
  ...props
}) => {
  const fieldId = id || (label ? `fld-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : undefined);
  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label
          htmlFor={fieldId}
          className="block text-sm font-medium text-[var(--color-text)]"
        >
          {label}
        </label>
      )}
      <input
        id={fieldId}
        className={`mrs-control w-full min-h-[44px] px-3.5 py-2.5 text-sm bg-[var(--color-elevated)] text-[var(--color-text)] border ${
          error ? 'border-[var(--color-danger)]' : 'border-[var(--color-border)]'
        } placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] ${
          mono ? 'font-mono' : ''
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="text-xs text-[var(--color-danger)] flex items-center gap-1.5" role="alert">
          <XCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
      {!error && hint && <p className="text-xs text-[var(--color-muted)]">{hint}</p>}
    </div>
  );
};

// Shared Card matching 16px card radius and single soft shadow level
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

export const Card: React.FC<CardProps> = ({
  elevated = false,
  className = '',
  children,
  ...props
}) => (
  <div
    className={`mrs-card p-5 sm:p-6 text-[var(--color-text)] ${
      elevated ? 'bg-[var(--color-elevated)]' : 'bg-[var(--color-surface)]'
    } ${className}`}
    {...props}
  >
    {children}
  </div>
);

// Shared Semantic Badge — ALWAYS renders both an icon and a text label (never color alone)
export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface BadgeProps {
  tone?: BadgeTone;
  label: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ tone = 'neutral', label, className = '' }) => {
  const toneMap: Record<BadgeTone, { cls: string; Icon: React.FC<{ className?: string }> }> = {
    success: {
      cls: 'bg-[#34D399]/10 text-[var(--color-success)] border-[#34D399]/35',
      Icon: CheckCircle2,
    },
    warning: {
      cls: 'bg-[#F59E0B]/10 text-[var(--color-warning)] border-[#F59E0B]/35',
      Icon: AlertTriangle,
    },
    danger: {
      cls: 'bg-[#FB7185]/10 text-[var(--color-danger)] border-[#FB7185]/35',
      Icon: XCircle,
    },
    info: {
      cls: 'bg-[#22D3EE]/10 text-[var(--color-accent)] border-[#22D3EE]/35',
      Icon: Info,
    },
    neutral: {
      cls: 'bg-[var(--color-elevated)] text-[var(--color-muted)] border-[var(--color-border)]',
      Icon: Clock,
    },
  };

  const { cls, Icon } = toneMap[tone];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[10px] border text-xs font-semibold whitespace-nowrap shrink-0 ${cls} ${className}`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
};

// Shared Status Stepper
export interface StatusStepperStep {
  key: string;
  label: string;
  state: 'done' | 'active' | 'pending' | 'error';
}

export const StatusStepper: React.FC<{ steps: StatusStepperStep[] }> = ({ steps }) => (
  <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2" aria-label="Progress steps">
    {steps.map((s, idx) => {
      const cls =
        s.state === 'done'
          ? 'bg-[#34D399]/10 border-[#34D399]/35 text-[var(--color-success)]'
          : s.state === 'active'
          ? 'bg-[#22D3EE]/10 border-[#22D3EE]/45 text-[var(--color-accent)]'
          : s.state === 'error'
          ? 'bg-[#FB7185]/10 border-[#FB7185]/40 text-[var(--color-danger)]'
          : 'bg-[var(--color-elevated)] border-[var(--color-border)] text-[var(--color-muted)]';
      return (
        <li
          key={s.key}
          className={`p-2.5 rounded-[10px] border flex items-center gap-2 text-xs font-semibold ${cls}`}
        >
          {s.state === 'done' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          ) : s.state === 'error' ? (
            <XCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          ) : s.state === 'active' ? (
            <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
          ) : (
            <span className="w-4 h-4 rounded-full border border-current text-[10px] flex items-center justify-center shrink-0">
              {idx + 1}
            </span>
          )}
          <span className="truncate">{s.label}</span>
        </li>
      );
    })}
  </ol>
);

// Shared Accessible Modal
export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidthClass?: string;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  maxWidthClass = 'max-w-lg',
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className={`mrs-card w-full ${maxWidthClass} max-h-[90dvh] overflow-y-auto p-5 sm:p-6 space-y-4`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-[var(--color-border)]">
          <h3 className="font-heading font-bold text-base text-[var(--color-text)]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-[10px] flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-elevated)]"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// Shared Data Table with horizontal responsiveness
export interface TableProps {
  headers: string[];
  children: React.ReactNode;
}

export const Table: React.FC<TableProps> = ({ headers, children }) => (
  <div className="mrs-card overflow-x-auto">
    <table className="w-full text-sm text-left">
      <thead className="border-b border-[var(--color-border)] text-xs font-mono text-[var(--color-muted)]">
        <tr>
          {headers.map((h) => (
            <th key={h} className="px-4 py-3 font-semibold whitespace-nowrap">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--color-border)] tabular-nums">{children}</tbody>
    </table>
  </div>
);

// Shared StateDisplay (Loading, Empty, Error, Success)
export interface StateDisplayProps {
  type: 'loading' | 'empty' | 'error' | 'success';
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const StateDisplay: React.FC<StateDisplayProps> = ({
  type,
  title,
  description,
  action,
}) => {
  const map = {
    loading: { Icon: Loader2, iconCls: 'text-[var(--color-accent)] animate-spin' },
    empty: { Icon: Inbox, iconCls: 'text-[var(--color-muted)]' },
    error: { Icon: XCircle, iconCls: 'text-[var(--color-danger)]' },
    success: { Icon: CheckCircle2, iconCls: 'text-[var(--color-success)]' },
  };
  const { Icon, iconCls } = map[type];

  return (
    <div className="mrs-card p-8 text-center space-y-3">
      <Icon className={`w-8 h-8 mx-auto ${iconCls}`} aria-hidden="true" />
      <h4 className="font-heading font-bold text-base text-[var(--color-text)]">{title}</h4>
      {description && (
        <p className="text-sm text-[var(--color-muted)] max-w-md mx-auto">{description}</p>
      )}
      {action && <div className="pt-2 flex justify-center">{action}</div>}
    </div>
  );
};
