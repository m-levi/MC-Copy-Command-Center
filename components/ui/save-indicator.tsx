"use client"

import { cn } from "@/lib/utils"
import { Check, Loader2, Cloud, CloudOff } from "lucide-react"

export type SaveStatus = "idle" | "saving" | "saved" | "unsaved" | "error"

interface SaveIndicatorProps {
  status: SaveStatus
  lastSaved?: number | null
  className?: string
  showText?: boolean
  size?: "sm" | "md"
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  if (diff < 5000) return "just now"
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return new Date(timestamp).toLocaleDateString()
}

export function SaveIndicator({
  status,
  lastSaved,
  className,
  showText = true,
  size = "sm",
}: SaveIndicatorProps) {
  const iconSize = size === "sm" ? "w-3 h-3" : "w-4 h-4"
  const textSize = size === "sm" ? "text-[10px]" : "text-xs"

  if (status === "idle") {
    return null
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 transition-all duration-200",
        status === "error" && "text-red-500 dark:text-red-400",
        status === "saving" && "text-blue-500 dark:text-blue-400",
        status === "saved" && "text-green-600 dark:text-green-400",
        status === "unsaved" && "text-amber-500 dark:text-amber-400",
        className
      )}
    >
      {status === "saving" && (
        <>
          <Loader2 className={cn(iconSize, "animate-spin")} />
          {showText && <span className={textSize}>Saving...</span>}
        </>
      )}

      {status === "saved" && (
        <>
          <Check className={iconSize} />
          {showText && (
            <span className={textSize}>
              Saved {lastSaved ? formatTimeAgo(lastSaved) : ""}
            </span>
          )}
        </>
      )}

      {status === "unsaved" && (
        <>
          <Cloud className={iconSize} />
          {showText && <span className={textSize}>Unsaved changes</span>}
        </>
      )}

      {status === "error" && (
        <>
          <CloudOff className={iconSize} />
          {showText && <span className={textSize}>Failed to save</span>}
        </>
      )}
    </div>
  )
}

/**
 * Hook to compute save status from useDraftSave return values
 */
export function useSaveStatus(
  isSaving: boolean,
  lastSaved: number,
  hasContent: boolean,
  contentChanged: boolean = false
): SaveStatus {
  if (!hasContent) return "idle"
  if (isSaving) return "saving"
  if (lastSaved > 0) {
    // If content changed after last save, show unsaved
    if (contentChanged) return "unsaved"
    return "saved"
  }
  return "unsaved"
}
