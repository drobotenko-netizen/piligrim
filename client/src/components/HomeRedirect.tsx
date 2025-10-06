"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getFirstAvailableMenuItem } from '@/lib/menu-utils'

export function HomeRedirect() {
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(true)

  useEffect(() => {
    async function redirectToFirstAvailable() {
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000'
        const response = await fetch(`${API_BASE}/api/auth/otp/me`, { credentials: 'include' })
        const data = await response.json()
        
        const roles = data?.roles || []
        const firstMenuItem = getFirstAvailableMenuItem(roles)
        
        console.log('[HomeRedirect] User roles:', roles)
        console.log('[HomeRedirect] Redirecting to:', firstMenuItem)
        
        router.replace(firstMenuItem)
      } catch (error) {
        console.error('[HomeRedirect] Error getting user data:', error)
        // Fallback to employees if error
        router.replace('/employees')
      } finally {
        setIsRedirecting(false)
      }
    }

    redirectToFirstAvailable()
  }, [router])

  if (isRedirecting) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Перенаправление...</p>
        </div>
      </div>
    )
  }

  return null
}
