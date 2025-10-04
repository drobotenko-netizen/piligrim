import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// DEV fetch helper: adds x-role for local API when no credentials/session
export async function fetchWithRole(input: string, init: RequestInit = {}) {
  const isDev = process.env.NODE_ENV !== 'production'
  const headers = new Headers(init.headers || {})
  if (isDev && !headers.has('x-role')) {
    headers.set('x-role', 'ADMIN')
  }
  const maxAttempts = 3
  const baseDelayMs = 300
  let lastErr: any = null
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fetch(input, { ...init, headers })
    } catch (e) {
      lastErr = e
      if (attempt < maxAttempts) {
        const delay = baseDelayMs * attempt
        await new Promise(res => setTimeout(res, delay))
        continue
      }
      throw e
    }
  }
  throw lastErr
}

