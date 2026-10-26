import React from 'react';

export type IntegrationStatus = 'not_configured' | 'setup_required' | 'connected' | 'error';

export interface StatusBadgeProps {
  label: string;
  status: IntegrationStatus;
  statusText?: string;
  className?: string;
}

export function StatusBadge({
  label,
  status,
  statusText,
  className = '',
}: StatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'not_configured':
        return {
          dotColor: 'bg-slate-400 dark:bg-slate-500',
          badgeClass:
            'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
          defaultText: 'Not configured',
        };
      case 'setup_required':
        return {
          dotColor: 'bg-amber-400 animate-pulse',
          badgeClass:
            'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
          defaultText: 'Setup required',
        };
      case 'connected':
        return {
          dotColor: 'bg-emerald-500',
          badgeClass:
            'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          defaultText: 'Connected',
        };
      case 'error':
        return {
          dotColor: 'bg-rose-500',
          badgeClass:
            'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
          defaultText: 'Error',
        };
    }
  };

  const config = getStatusConfig();
  const displayText = statusText || config.defaultText;

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-medium border ${config.badgeClass} ${className}`}
      title={`${label}: ${displayText}`}
    >
      <span className="font-semibold text-slate-800 dark:text-slate-200">{label}:</span>
      <span className="inline-flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor}`} />
        <span>{displayText}</span>
      </span>
    </div>
  );
}
