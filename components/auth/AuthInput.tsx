'use client';

import { useState, forwardRef, InputHTMLAttributes } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

interface AuthInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label: string;
  error?: string;
  icon?: React.ReactNode;
  showPasswordToggle?: boolean;
}

const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ label, error, icon, showPasswordToggle, type = 'text', id, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;
    const inputId = id || label.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="space-y-2">
        <Label htmlFor={inputId}>{label}</Label>
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {icon}
            </div>
          )}
          <Input
            ref={ref}
            id={inputId}
            type={inputType}
            aria-invalid={!!error}
            className={cn(
              'h-11',
              icon && 'pl-10',
              isPassword && showPasswordToggle && 'pr-10'
            )}
            {...props}
          />
          {isPassword && showPasswordToggle && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          )}
        </div>
        {error && (
          <p className="text-sm text-destructive flex items-center gap-1.5">
            <AlertCircle className="size-3.5 shrink-0" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

AuthInput.displayName = 'AuthInput';

export default AuthInput;
