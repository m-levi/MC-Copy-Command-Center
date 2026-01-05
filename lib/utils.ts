import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Safely extract an error message from an unknown error type
 * Use this in catch blocks instead of `error: any`
 *
 * @example
 * try {
 *   await someOperation()
 * } catch (error) {
 *   const message = getErrorMessage(error)
 *   toast.error(message)
 * }
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }
  return 'An unexpected error occurred'
}

