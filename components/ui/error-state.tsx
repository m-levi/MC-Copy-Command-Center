"use client"

import { cn } from "@/lib/utils"
import { AlertCircle, RefreshCw, WifiOff } from "lucide-react"

export type ErrorType = "generic" | "network" | "not_found" | "permission"

interface ErrorStateProps {
  title?: string
  message?: string
  error?: Error | string | null
  onRetry?: () => void
  retryLabel?: string
  isRetrying?: boolean
  type?: ErrorType
  className?: string
  compact?: boolean
}

const ERROR_CONFIGS: Record<ErrorType, { icon: typeof AlertCircle; title: string; message: string }> = {
  generic: {
    icon: AlertCircle,
    title: "Something went wrong",
    message: "An unexpected error occurred. Please try again.",
  },
  network: {
    icon: WifiOff,
    title: "Connection error",
    message: "Unable to connect. Check your internet connection and try again.",
  },
  not_found: {
    icon: AlertCircle,
    title: "Not found",
    message: "The requested resource could not be found.",
  },
  permission: {
    icon: AlertCircle,
    title: "Access denied",
    message: "You don't have permission to access this resource.",
  },
}

export function ErrorState({
  title,
  message,
  error,
  onRetry,
  retryLabel = "Try again",
  isRetrying = false,
  type = "generic",
  className,
  compact = false,
}: ErrorStateProps) {
  const config = ERROR_CONFIGS[type]
  const Icon = config.icon

  const displayTitle = title || config.title
  const displayMessage = message || (error ? String(error) : config.message)

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg",
          className
        )}
      >
        <Icon className="w-4 h-4 text-red-500 flex-shrink-0" />
        <span className="text-sm text-red-700 dark:text-red-300 flex-1">
          {displayMessage}
        </span>
        {onRetry && (
          <button
            onClick={onRetry}
            disabled={isRetrying}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-md transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-3 h-3", isRetrying && "animate-spin")} />
            {isRetrying ? "Retrying..." : retryLabel}
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8",
        className
      )}
    >
      <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-red-500 dark:text-red-400" />
      </div>

      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {displayTitle}
      </h3>

      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-6">
        {displayMessage}
      </p>

      {onRetry && (
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={cn("w-4 h-4", isRetrying && "animate-spin")} />
          {isRetrying ? "Retrying..." : retryLabel}
        </button>
      )}
    </div>
  )
}

/**
 * Inline error message for form fields
 */
interface InlineErrorProps {
  message: string
  className?: string
}

export function InlineError({ message, className }: InlineErrorProps) {
  return (
    <p className={cn("text-xs text-red-500 dark:text-red-400 mt-1", className)}>
      {message}
    </p>
  )
}

/**
 * Loading state with optional slow network indicator
 */
interface LoadingStateProps {
  message?: string
  showSlowIndicator?: boolean
  slowMessage?: string
  className?: string
}

export function LoadingState({
  message = "Loading...",
  showSlowIndicator = false,
  slowMessage = "This is taking longer than expected...",
  className,
}: LoadingStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center p-8",
        className
      )}
    >
      <div className="w-12 h-12 rounded-full border-4 border-gray-200 dark:border-gray-700 border-t-blue-600 dark:border-t-blue-500 animate-spin mb-4" />

      <p className="text-sm text-gray-600 dark:text-gray-400">{message}</p>

      {showSlowIndicator && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1.5">
          <WifiOff className="w-3 h-3" />
          {slowMessage}
        </p>
      )}
    </div>
  )
}

/**
 * Hook to detect slow loading and show indicator
 */
import { useState, useEffect } from "react"

export function useSlowLoading(isLoading: boolean, threshold = 5000) {
  const [isSlow, setIsSlow] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      setIsSlow(false)
      return
    }

    const timer = setTimeout(() => {
      setIsSlow(true)
    }, threshold)

    return () => clearTimeout(timer)
  }, [isLoading, threshold])

  return isSlow
}
