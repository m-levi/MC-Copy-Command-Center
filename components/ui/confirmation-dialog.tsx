"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog"
import { AlertTriangle, Trash2, Info } from "lucide-react"

interface ConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: "danger" | "warning" | "info"
  isLoading?: boolean
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  isLoading = false,
}: ConfirmationDialogProps) {
  const [internalLoading, setInternalLoading] = React.useState(false)
  const loading = isLoading || internalLoading

  const handleConfirm = async () => {
    try {
      setInternalLoading(true)
      await onConfirm()
      onClose()
    } catch (error) {
      console.error("Confirmation action failed:", error)
    } finally {
      setInternalLoading(false)
    }
  }

  const IconComponent = variant === "danger" ? Trash2 : variant === "warning" ? AlertTriangle : Info
  const iconBgColor = variant === "danger"
    ? "bg-red-100 dark:bg-red-900/30"
    : variant === "warning"
      ? "bg-amber-100 dark:bg-amber-900/30"
      : "bg-blue-100 dark:bg-blue-900/30"
  const iconColor = variant === "danger"
    ? "text-red-600 dark:text-red-400"
    : variant === "warning"
      ? "text-amber-600 dark:text-amber-400"
      : "text-blue-600 dark:text-blue-400"
  const confirmButtonStyle = variant === "danger"
    ? "bg-red-600 hover:bg-red-700 text-white"
    : variant === "warning"
      ? "bg-amber-600 hover:bg-amber-700 text-white"
      : "bg-blue-600 hover:bg-blue-700 text-white"

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !loading && onClose()}>
      <DialogContent className="sm:max-w-[425px]" showCloseButton={false}>
        <DialogHeader className="gap-4">
          <div className="flex items-start gap-4">
            <div className={cn("p-3 rounded-full flex-shrink-0", iconBgColor)}>
              <IconComponent className={cn("w-6 h-6", iconColor)} />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {title}
              </DialogTitle>
              <DialogDescription className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogFooter className="mt-6 gap-3 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className={cn(
              "flex-1 px-4 py-2.5 rounded-lg font-medium text-sm",
              "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
              "hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className={cn(
              "flex-1 px-4 py-2.5 rounded-lg font-medium text-sm",
              confirmButtonStyle,
              "transition-colors flex items-center justify-center gap-2",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              confirmText
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Hook for managing confirmation dialog state
export function useConfirmationDialog() {
  const [state, setState] = React.useState<{
    isOpen: boolean
    config: Omit<ConfirmationDialogProps, "isOpen" | "onClose" | "onConfirm"> & {
      onConfirm: () => void | Promise<void>
    }
  }>({
    isOpen: false,
    config: {
      title: "",
      description: "",
      onConfirm: () => {},
    },
  })

  const confirm = React.useCallback(
    (config: Omit<ConfirmationDialogProps, "isOpen" | "onClose">) => {
      return new Promise<boolean>((resolve) => {
        setState({
          isOpen: true,
          config: {
            ...config,
            onConfirm: async () => {
              await config.onConfirm()
              resolve(true)
            },
          },
        })
      })
    },
    []
  )

  const close = React.useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }))
  }, [])

  const DialogComponent = React.useMemo(
    () => (
      <ConfirmationDialog
        {...state.config}
        isOpen={state.isOpen}
        onClose={close}
        onConfirm={state.config.onConfirm}
      />
    ),
    [state, close]
  )

  return { confirm, close, DialogComponent }
}
