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
  return fetch(input, { ...init, headers })
}

