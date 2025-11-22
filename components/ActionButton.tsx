'use client';

import { ReactNode } from 'react';
import LoadingDots from './LoadingDots';

export type ActionButtonState = 'idle' | 'loading' | 'success' | 'error';

interface ActionButtonProps {
  children: ReactNode;
  onClick?: () => void;
  state?: ActionButtonState;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loadingText?: string;
  successText?: string;
  errorText?: string;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export default function ActionButton({
  children,
  onClick,
  state = 'idle',
  disabled = false,
  variant = 'primary',
  size = 'md',
  loadingText,
  successText,
  errorText,
  className = '',
  type = 'button'
}: ActionButtonProps) {
  const isDisabled = disabled || state === 'loading';

  const baseClasses = 'font-medium transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95';
  
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100',
    danger: 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white'
  };

  const sizeClasses = {
    sm: 'py-1.5 px-3 text-sm rounded-lg',
    md: 'py-2.5 px-4 text-sm rounded-lg',
    lg: 'py-3 px-6 text-base rounded-xl'
  };

  const stateClasses = {
    idle: '',
    loading: 'animate-pulse',
    success: 'bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600',
    error: 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600'
  };

  const getContent = () => {
    switch (state) {
      case 'loading':
        return (
          <>
            <LoadingDots size="sm" color={variant === 'primary' || variant === 'danger' ? 'white' : 'gray'} />
            {loadingText && <span>{loadingText}</span>}
            {!loadingText && children}
          </>
        );
      case 'success':
        return (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            {successText || children}
          </>
        );
      case 'error':
        return (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            {errorText || children}
          </>
        );
      default:
        return children;
    }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${stateClasses[state]}
        ${state === 'success' || state === 'error' ? '' : ''}
        ${className}
      `}
    >
      {getContent()}
    </button>
  );
}

