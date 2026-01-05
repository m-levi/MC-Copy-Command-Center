'use client';

import { useState, useMemo } from 'react';
import { OrganizationRole } from '@/types';
import toast from 'react-hot-toast';

interface InviteFormProps {
  onInviteSent: () => void;
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const roleOptions = [
  {
    value: 'member' as OrganizationRole,
    label: 'Member',
    description: 'Can view and chat',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    color: 'gray'
  },
  {
    value: 'brand_manager' as OrganizationRole,
    label: 'Brand Manager',
    description: 'Create & manage brands',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    color: 'blue'
  },
  {
    value: 'admin' as OrganizationRole,
    label: 'Admin',
    description: 'Full access to everything',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    color: 'violet'
  }
];

export default function InviteForm({ onInviteSent }: InviteFormProps) {
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [role, setRole] = useState<OrganizationRole>('member');
  const [loading, setLoading] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);

  // Real-time email validation
  const emailValidation = useMemo(() => {
    if (!email) return { isValid: false, message: '' };
    if (!EMAIL_REGEX.test(email)) {
      return { isValid: false, message: 'Please enter a valid email address' };
    }
    return { isValid: true, message: '' };
  }, [email]);

  const showEmailError = emailTouched && email && !emailValidation.isValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setInviteLink('');

    try {
      const response = await fetch('/api/organizations/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      setInviteLink(data.inviteLink);
      
      if (data.emailSent) {
        toast.success('Invitation email sent!');
      } else {
        toast.success('Invitation created! Copy the link below.');
      }
      
      setEmail('');
      onInviteSent();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  const getColorClasses = (color: string, isSelected: boolean) => {
    if (!isSelected) {
      return 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800';
    }
    
    switch (color) {
      case 'violet':
        return 'border-violet-500 bg-violet-50 dark:bg-violet-900/20';
      case 'blue':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
      default:
        return 'border-gray-500 bg-gray-50 dark:bg-gray-800';
    }
  };

  const getIconColorClasses = (color: string, isSelected: boolean) => {
    if (!isSelected) return 'text-gray-400 dark:text-gray-500';
    
    switch (color) {
      case 'violet':
        return 'text-violet-600 dark:text-violet-400';
      case 'blue':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-light-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Invite Team Member
        </h3>
      </div>
      
      <form onSubmit={handleSubmit} className="p-5 space-y-5">
        {/* Email Input */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email address <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              required
              disabled={loading}
              className={`
                w-full px-4 py-3 rounded-xl
                bg-white dark:bg-gray-800
                border text-gray-900 dark:text-white
                placeholder-gray-400 dark:placeholder-gray-500
                focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                disabled:opacity-50 transition-all
                ${showEmailError
                  ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500/20'
                  : emailValidation.isValid && email
                    ? 'border-green-300 dark:border-green-700'
                    : 'border-gray-200 dark:border-gray-700'
                }
              `}
              placeholder="colleague@company.com"
            />
            {/* Validation icon */}
            {email && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {emailValidation.isValid ? (
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : emailTouched ? (
                  <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : null}
              </div>
            )}
          </div>
          {/* Error message */}
          {showEmailError && (
            <p className="mt-1.5 text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {emailValidation.message}
            </p>
          )}
        </div>

        {/* Role Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Role
          </label>
          <div className="space-y-2">
            {roleOptions.map((option) => {
              const isSelected = role === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRole(option.value)}
                  disabled={loading}
                  className={`
                    w-full p-3 rounded-xl border-2 text-left transition-all duration-200
                    disabled:opacity-50
                    ${getColorClasses(option.color, isSelected)}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className={`
                      w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
                      ${isSelected 
                        ? option.color === 'violet' 
                          ? 'bg-violet-100 dark:bg-violet-800/30' 
                          : option.color === 'blue'
                            ? 'bg-blue-100 dark:bg-blue-800/30'
                            : 'bg-gray-100 dark:bg-gray-700'
                        : 'bg-gray-100 dark:bg-gray-800'
                      }
                    `}>
                      <span className={getIconColorClasses(option.color, isSelected)}>
                        {option.icon}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                        {option.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {option.description}
                      </p>
                    </div>
                    {isSelected && (
                      <div className={`
                        w-5 h-5 rounded-full flex items-center justify-center
                        ${option.color === 'violet' 
                          ? 'bg-violet-500' 
                          : option.color === 'blue'
                            ? 'bg-blue-500'
                            : 'bg-gray-500'
                        }
                      `}>
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !email || !emailValidation.isValid}
          className="
            w-full py-3 px-4 rounded-xl font-semibold text-white
            bg-gradient-to-r from-blue-600 to-blue-700
            hover:from-blue-500 hover:to-blue-600
            disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed
            transition-all duration-200
            active:scale-[0.98]
            flex items-center justify-center gap-2
          "
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Sending...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>Send Invitation</span>
            </>
          )}
        </button>
      </form>

      {/* Invite Link Success */}
      {inviteLink && (
        <div className="mx-5 mb-5 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-800/30 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                Invitation created!
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                Email sent. You can also share this link:
              </p>
              
              <div className="flex items-center gap-2 mt-3">
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  className="
                    flex-1 px-3 py-2 text-xs
                    bg-white dark:bg-gray-800
                    border border-emerald-200 dark:border-emerald-700
                    rounded-lg text-gray-600 dark:text-gray-300
                    truncate
                  "
                />
                <button
                  onClick={copyToClipboard}
                  className={`
                    px-3 py-2 rounded-lg text-sm font-medium transition-all
                    flex items-center gap-1.5 flex-shrink-0
                    ${copied 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-emerald-100 dark:bg-emerald-800/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800/50'
                    }
                  `}
                >
                  {copied ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              </div>
              
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">
                Link expires in 7 days
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
