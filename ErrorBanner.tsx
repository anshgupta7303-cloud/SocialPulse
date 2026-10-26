import React from 'react';
import { AlertCircle, X, RotateCcw } from 'lucide-react';
import { Button } from './Button.tsx';

export interface ErrorBannerProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export function ErrorBanner({
  title = 'Something went wrong',
  message,
  onRetry,
  onDismiss,
  className = '',
}: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className={`p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/90 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 flex items-start gap-3 ${className}`}
    >
      <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
      <div className="flex-1 text-xs">
        <h4 className="font-semibold text-rose-900 dark:text-rose-100">{title}</h4>
        <p className="mt-0.5 text-rose-700 dark:text-rose-300 leading-relaxed">{message}</p>
        {onRetry && (
          <div className="mt-3">
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              className="border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 hover:bg-rose-100 dark:hover:bg-rose-900/40"
            >
              Retry
            </Button>
          </div>
        )}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 p-1 rounded-md"
          aria-label="Dismiss error"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
