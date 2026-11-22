import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Grid } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Card } from '../components/ui';

export const NotFoundPage: React.FC = () => {
  const { t } = useApp();

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <Card className="max-w-md w-full text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-[10px] bg-[#22D3EE]/10 border border-[#22D3EE]/30 text-[var(--color-accent)] flex items-center justify-center">
          <AlertCircle className="w-6 h-6" aria-hidden="true" />
        </div>
        <div className="font-mono text-xs font-bold text-[var(--color-muted)]">HTTP 404</div>
        <h1 className="font-heading font-bold text-2xl text-[var(--color-text)]">
          {t.notFound.title}
        </h1>
        <p className="text-sm text-[var(--color-muted)]">{t.notFound.description}</p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link
            to="/"
            className="mrs-control min-h-[44px] px-4 py-2.5 bg-[#22D3EE] hover:bg-[#06B6D4] text-[#0B1220] font-semibold text-sm inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.notFound.backHome}</span>
          </Link>
          <Link
            to="/services"
            className="mrs-control min-h-[44px] px-4 py-2.5 border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-elevated)] font-semibold text-sm inline-flex items-center gap-2"
          >
            <Grid className="w-4 h-4" />
            <span>{t.notFound.browseServices}</span>
          </Link>
        </div>
      </Card>
    </div>
  );
};
