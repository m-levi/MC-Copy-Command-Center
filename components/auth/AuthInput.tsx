'use client';

import { useState, forwardRef, InputHTMLAttributes } from 'react';

interface AuthInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
  showPasswordToggle?: boolean;
}

const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, error, icon, showPasswordToggle, type = 'text', ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const hasValue = props.value && String(props.value).length > 0;
    
    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;
    
    return (
      <div className="relative">
        {/* Input container */}
        <div className={`
          relative rounded-xl border-2 transition-all duration-200
          ${error 
            ? 'border-red-300 dark:border-red-500/50 bg-red-50/50 dark:bg-red-900/10' 
            : focused 
              ? 'border-violet-500 dark:border-violet-400 bg-white dark:bg-gray-800 shadow-[0_0_0_4px_rgba(139,92,246,0.1)]' 
              : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
          }
        `}>
          {/* Icon */}
          {icon && (
            <div className={`
              absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200
              ${focused ? 'text-violet-500 dark:text-violet-400' : 'text-gray-400 dark:text-gray-500'}
            `}>
              {icon}
            </div>
          )}
          
          {/* Input */}
          <input
            ref={ref}
            type={inputType}
            className={`
              w-full bg-transparent px-4 py-3.5 text-gray-900 dark:text-white
              placeholder-transparent focus:outline-none peer
              ${icon ? 'pl-12' : ''}
              ${isPassword && showPasswordToggle ? 'pr-12' : ''}
            `}
            placeholder={label}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            {...props}
          />
          
          {/* Floating label */}
          <label
            className={`
              absolute left-4 transition-all duration-200 pointer-events-none
              ${icon ? 'left-12' : 'left-4'}
              ${(focused || hasValue) 
                ? '-top-2.5 text-xs px-2 bg-white dark:bg-gray-800' 
                : 'top-1/2 -translate-y-1/2 text-base'
              }
              ${error 
                ? 'text-red-500 dark:text-red-400' 
                : focused 
                  ? 'text-violet-600 dark:text-violet-400' 
                  : 'text-gray-500 dark:text-gray-400'
              }
            `}
          >
            {label}
          </label>
          
          {/* Password toggle */}
          {isPassword && showPasswordToggle && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          )}
        </div>
        
        {/* Error message */}
        {error && (
          <p className="mt-2 text-sm text-red-500 dark:text-red-400 flex items-center gap-1.5 animate-in slide-in-from-top-1 duration-200">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

AuthInput.displayName = 'AuthInput';

export default AuthInput;























