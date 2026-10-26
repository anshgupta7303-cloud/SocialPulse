import React from 'react';

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export function LoadingSpinner({
  size = 'md',
  label = 'Loading...',
  className = '',
}: LoadingSpinnerProps) {
  const sizeStyles = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center p-6 gap-3 ${className}`}
    >
      <div
        className={`${sizeStyles[size]} border-indigo-200 dark:border-indigo-950 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin`}
      />
      {label && <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>}
      <span className="sr-only">{label}</span>
    </div>
  );
}
