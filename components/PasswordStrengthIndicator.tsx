'use client';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export default function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const getStrength = (password: string): { score: number; label: string; color: string } => {
    if (!password) {
      return { score: 0, label: '', color: '' };
    }

    let score = 0;
    
    // Length check
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    
    // Character variety checks
    if (/[a-z]/.test(password)) score++; // lowercase
    if (/[A-Z]/.test(password)) score++; // uppercase
    if (/[0-9]/.test(password)) score++; // numbers
    if (/[^A-Za-z0-9]/.test(password)) score++; // special characters
    
    // Determine strength level
    if (score <= 2) {
      return { score: 1, label: 'Weak', color: 'bg-red-500' };
    } else if (score <= 4) {
      return { score: 2, label: 'Fair', color: 'bg-orange-500' };
    } else if (score <= 6) {
      return { score: 3, label: 'Good', color: 'bg-yellow-500' };
    } else {
      return { score: 4, label: 'Strong', color: 'bg-green-500' };
    }
  };

  const strength = getStrength(password);
  
  if (!password) {
    return null;
  }

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="flex-1 flex gap-1 h-1.5">
          {[1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={`flex-1 rounded-full transition-colors ${
                level <= strength.score
                  ? strength.color
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>
        <span
          className={`text-xs font-medium ${
            strength.score === 1
              ? 'text-red-600 dark:text-red-400'
              : strength.score === 2
              ? 'text-orange-600 dark:text-orange-400'
              : strength.score === 3
              ? 'text-yellow-600 dark:text-yellow-400'
              : 'text-green-600 dark:text-green-400'
          }`}
        >
          {strength.label}
        </span>
      </div>
      <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
        {password.length < 8 && (
          <div>• At least 8 characters</div>
        )}
        {!/[A-Z]/.test(password) && (
          <div>• Include uppercase letters</div>
        )}
        {!/[a-z]/.test(password) && (
          <div>• Include lowercase letters</div>
        )}
        {!/[0-9]/.test(password) && (
          <div>• Include numbers</div>
        )}
        {!/[^A-Za-z0-9]/.test(password) && (
          <div>• Include special characters</div>
        )}
      </div>
    </div>
  );
}


