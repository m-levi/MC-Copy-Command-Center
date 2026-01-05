'use client';

import { ReactNode } from 'react';
import { MoonCommerceLogo } from '@/components/MoonCommerceLogo';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  showBrandPanel?: boolean;
}

export default function AuthLayout({ 
  children, 
  title, 
  subtitle,
  showBrandPanel = true 
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">
      {/* Brand Panel - Left Side */}
      {showBrandPanel && (
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
          {/* Animated gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900">
            {/* Animated gradient orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/30 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-fuchsia-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
            
            {/* Subtle grid pattern */}
            <div 
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                                  linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                backgroundSize: '50px 50px'
              }}
            />
          </div>
          
          {/* Content */}
          <div className="relative z-10 flex flex-col justify-between p-12 w-full">
            {/* Logo */}
            <div>
              <MoonCommerceLogo className="h-8 w-auto text-white" />
            </div>
            
            {/* Main content */}
            <div className="space-y-6">
              <h1 className="text-4xl font-bold text-white leading-tight">
                AI-Powered Email
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">
                  Copywriting
                </span>
              </h1>
              <p className="text-lg text-gray-300 max-w-md">
                Create compelling email campaigns that convert. 
                Powered by advanced AI trained on your brand voice.
              </p>
              
              {/* Feature highlights */}
              <div className="flex flex-col gap-3 pt-4">
                {[
                  'Brand-aware AI copywriting',
                  'Email flow automation',
                  'Team collaboration tools'
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3 text-gray-300">
                    <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center">
                      <svg className="w-3 h-3 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Testimonial */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <p className="text-gray-300 text-sm leading-relaxed mb-4">
                "This tool has completely transformed how we create email campaigns. 
                The AI understands our brand voice perfectly."
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-semibold text-sm">
                  SK
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Sarah Kim</p>
                  <p className="text-gray-400 text-xs">Marketing Director</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Form Panel - Right Side */}
      <div className={`flex-1 flex items-center justify-center p-6 sm:p-12 bg-gray-50 dark:bg-gray-950 ${!showBrandPanel ? 'w-full' : ''}`}>
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex justify-center">
            <MoonCommerceLogo className="h-8 w-auto text-gray-900 dark:text-white" />
          </div>
          
          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                {subtitle}
              </p>
            )}
          </div>
          
          {/* Form content */}
          <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-light-lg border border-gray-200/50 dark:border-gray-700/50">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}























