/**
 * Badge component for agent-generated conversations
 * Shows special styling to distinguish automated insights
 */

import { Sparkles } from 'lucide-react'

interface AgentInsightBadgeProps {
  type?: 'daily' | 'weekly' | 'manual'
  className?: string
}

export function AgentInsightBadge({ type = 'daily', className = '' }: AgentInsightBadgeProps) {
  const typeConfig = {
    daily: {
      label: 'Daily Insights',
      icon: '📧',
      gradient: 'from-blue-500 to-cyan-500',
    },
    weekly: {
      label: 'Weekly Review',
      icon: '📊',
      gradient: 'from-purple-500 to-pink-500',
    },
    manual: {
      label: 'On-Demand',
      icon: '⚡',
      gradient: 'from-orange-500 to-red-500',
    },
  }

  const config = typeConfig[type]

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r ${config.gradient} text-white text-xs font-medium ${className}`}
    >
      <Sparkles className="w-3 h-3" />
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </div>
  )
}

/**
 * Conversation card wrapper for agent insights
 * Adds special visual treatment to agent conversations
 */
interface AgentConversationCardProps {
  children: React.ReactNode
  type?: 'daily' | 'weekly' | 'manual'
}

export function AgentConversationCard({ children, type = 'daily' }: AgentConversationCardProps) {
  return (
    <div className="relative">
      {/* Gradient border effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-lg opacity-20 blur" />
      
      {/* Content */}
      <div className="relative bg-card border border-border/50 rounded-lg">
        {children}
      </div>
    </div>
  )
}

/**
 * Header component for agent insight messages
 * Shows special header at the top of agent-generated messages
 */
interface AgentInsightHeaderProps {
  type?: 'daily' | 'weekly' | 'manual'
  generatedAt: string
}

export function AgentInsightHeader({ type = 'daily', generatedAt }: AgentInsightHeaderProps) {
  const config = {
    daily: {
      title: 'Daily Marketing Insights',
      description: 'Fresh campaign ideas based on your recent activity',
      icon: '📧',
    },
    weekly: {
      title: 'Weekly Strategic Review',
      description: 'Comprehensive analysis of your week in marketing',
      icon: '📊',
    },
    manual: {
      title: 'On-Demand Insights',
      description: 'Custom analysis generated at your request',
      icon: '⚡',
    },
  }

  const info = config[type]
  const date = new Date(generatedAt).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border border-blue-200 dark:border-blue-800/30">
      <div className="flex items-start gap-3">
        <div className="text-3xl">{info.icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-lg">{info.title}</h3>
            <AgentInsightBadge type={type} />
          </div>
          <p className="text-sm text-muted-foreground">{info.description}</p>
          <p className="text-xs text-muted-foreground mt-1">Generated on {date}</p>
        </div>
        <Sparkles className="w-5 h-5 text-purple-500 animate-pulse" />
      </div>
    </div>
  )
}















