"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Label } from "./label"
import { AlertCircle } from "lucide-react"

interface FormFieldProps {
  /** Unique identifier for the field - used for htmlFor/aria-describedby */
  id: string
  /** Label text displayed above the input */
  label: string
  /** Error message to display - also sets aria-invalid on children */
  error?: string
  /** Helper text displayed below the input */
  helperText?: string
  /** Whether the field is required */
  required?: boolean
  /** Additional className for the wrapper */
  className?: string
  /** The form input element(s) */
  children: React.ReactNode
}

/**
 * FormField - A unified wrapper for form inputs with proper accessibility
 *
 * Features:
 * - Automatic label association via htmlFor
 * - Error messages with aria-describedby
 * - Required field indicator
 * - Helper text support
 * - Consistent styling across the app
 *
 * @example
 * <FormField id="email" label="Email" error={errors.email} required>
 *   <Input id="email" type="email" />
 * </FormField>
 */
export function FormField({
  id,
  label,
  error,
  helperText,
  required,
  className,
  children,
}: FormFieldProps) {
  const errorId = `${id}-error`
  const helperId = `${id}-helper`
  const hasError = Boolean(error)

  // Clone children to add aria attributes
  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      const describedBy = [
        hasError ? errorId : null,
        helperText ? helperId : null,
      ]
        .filter(Boolean)
        .join(" ") || undefined

      return React.cloneElement(child as React.ReactElement<any>, {
        "aria-invalid": hasError || undefined,
        "aria-describedby": describedBy,
        "aria-required": required || undefined,
      })
    }
    return child
  })

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label
        htmlFor={id}
        className={cn(
          "text-sm font-medium text-gray-700 dark:text-gray-300",
          hasError && "text-destructive"
        )}
      >
        {label}
        {required && (
          <span className="ml-1 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </Label>

      {enhancedChildren}

      {hasError && (
        <p
          id={errorId}
          role="alert"
          className="flex items-center gap-1.5 text-sm text-destructive"
        >
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}

      {helperText && !hasError && (
        <p
          id={helperId}
          className="text-sm text-muted-foreground"
        >
          {helperText}
        </p>
      )}
    </div>
  )
}

/**
 * FormError - Standalone error message component
 * Use when you need just the error message without the full FormField wrapper
 */
export function FormError({
  id,
  message,
  className,
}: {
  id?: string
  message: string
  className?: string
}) {
  return (
    <p
      id={id}
      role="alert"
      className={cn(
        "flex items-center gap-1.5 text-sm text-destructive",
        className
      )}
    >
      <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  )
}
