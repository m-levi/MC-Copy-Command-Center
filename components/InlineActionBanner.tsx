'use client';

import { ReactNode } from 'react';
import LoadingDots from './LoadingDots';

type InlineActionBannerTone = 'default' | 'primary' | 'success';

interface BannerAction {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
}

interface InlineActionBannerProps {
  tone?: InlineActionBannerTone;
  icon?: ReactNode;
  title: string;
  message?: string;
  helperText?: string;
  action: BannerAction;
}

const toneStyles: Record<
  InlineActionBannerTone,
  {
    container: string;
    icon: string;
    title: string;
    message: string;
    helper: string;
    button: string;
    buttonHover: string;
    buttonDisabled: string;
  }
> = {
  default: {
    container: 'bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800',
    icon: 'bg-gray-800 dark:bg-gray-700 text-white',
    title: 'text-gray-900 dark:text-gray-100',
    message: 'text-gray-600 dark:text-gray-400',
    helper: 'text-gray-500 dark:text-gray-500',
    button: 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900',
    buttonHover: 'hover:bg-gray-900 dark:hover:bg-white',
    buttonDisabled: 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
  },
  primary: {
    container: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    icon: 'bg-blue-600 dark:bg-blue-500 text-white',
    title: 'text-blue-900 dark:text-blue-100',
    message: 'text-blue-700 dark:text-blue-200',
    helper: 'text-blue-600 dark:text-blue-300',
    button: 'bg-blue-600 dark:bg-blue-500 text-white',
    buttonHover: 'hover:bg-blue-700 dark:hover:bg-blue-600',
    buttonDisabled: 'bg-blue-200 dark:bg-blue-800/40 text-blue-500 dark:text-blue-300 cursor-not-allowed'
  },
  success: {
    container: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800',
    icon: 'bg-emerald-600 dark:bg-emerald-500 text-white',
    title: 'text-emerald-900 dark:text-emerald-100',
    message: 'text-emerald-700 dark:text-emerald-200',
    helper: 'text-emerald-600 dark:text-emerald-300',
    button: 'bg-emerald-600 dark:bg-emerald-500 text-white',
    buttonHover: 'hover:bg-emerald-700 dark:hover:bg-emerald-600',
    buttonDisabled: 'bg-emerald-200 dark:bg-emerald-800/40 text-emerald-500 dark:text-emerald-300 cursor-not-allowed'
  }
};

export default function InlineActionBanner({
  tone = 'default',
  icon,
  title,
  message,
  helperText,
  action
}: InlineActionBannerProps) {
  const toneStyle = toneStyles[tone];
  const { disabled, loading } = action;
  const isDisabled = Boolean(disabled || loading);

  return (
    <div className={`rounded-2xl border px-4 py-4 sm:px-5 sm:py-5 shadow-sm ${toneStyle.container}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          {icon && (
            <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${toneStyle.icon}`}>
              {icon}
            </div>
          )}
          <div className="space-y-1">
            <p className={`text-sm font-semibold ${toneStyle.title}`}>{title}</p>
            {message && <p className={`text-xs leading-relaxed ${toneStyle.message}`}>{message}</p>}
            {helperText && <p className={`text-xs ${toneStyle.helper}`}>{helperText}</p>}
          </div>
        </div>

        <button
          onClick={action.onClick}
          disabled={isDisabled}
          className={`inline-flex items-center justify-center w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm ${
            isDisabled ? toneStyle.buttonDisabled : `${toneStyle.button} ${toneStyle.buttonHover} hover:shadow`
          } ${loading ? 'cursor-progress' : 'cursor-pointer'}`}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <LoadingDots size="sm" color="white" />
              {action.loadingLabel ?? 'Processing...'}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              {action.icon}
              {action.label}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}


