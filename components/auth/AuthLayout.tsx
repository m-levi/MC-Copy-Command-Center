'use client';

import { ReactNode } from 'react';
import { MoonCommerceLogo } from '@/components/MoonCommerceLogo';
import { Card, CardContent } from '@/components/ui/card';
import { Check } from 'lucide-react';

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
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-violet-950 to-slate-900">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/30 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-fuchsia-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
          </div>

          <div className="relative z-10 flex flex-col justify-between p-12 w-full">
            <MoonCommerceLogo className="h-8 w-auto text-white" />

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

              <div className="flex flex-col gap-3 pt-4">
                {[
                  'Brand-aware AI copywriting',
                  'Email flow automation',
                  'Team collaboration tools'
                ].map((feature, i) => (
                  <div key={i} className="flex items-center gap-3 text-gray-300">
                    <div className="size-5 rounded-full bg-violet-500/20 flex items-center justify-center">
                      <Check className="size-3 text-violet-400" />
                    </div>
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <p className="text-gray-300 text-sm leading-relaxed mb-4">
                "This tool has completely transformed how we create email campaigns.
                The AI understands our brand voice perfectly."
              </p>
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-semibold text-sm">
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
      <div className={`flex-1 flex items-center justify-center p-6 sm:p-12 bg-background ${!showBrandPanel ? 'w-full' : ''}`}>
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex justify-center">
            <MoonCommerceLogo className="h-8 w-auto text-foreground" />
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-2 text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>

          {/* Form content */}
          <Card className="border-border/50 shadow-lg">
            <CardContent>
              {children}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
