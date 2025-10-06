"use client"

import { useEffect, useState } from 'react'
import { getApiBase } from "@/lib/api"
import { useRouter } from 'next/navigation'
import { getFirstAvailableMenuItem } from '@/lib/menu-utils'

export function HomeRedirect() {
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(true)

  useEffect(() => {
    async function redirectToFirstAvailable() {
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4000')
        console.log('[HomeRedirect] Making request to:', `${API_BASE}/api/auth/otp/me`)
        
        const response = await fetch(`${API_BASE}/api/auth/otp/me`, { 
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        })
        
        console.log('[HomeRedirect] Response status:', response.status)
        console.log('[HomeRedirect] Response headers:', Object.fromEntries(response.headers.entries()))
        
        // Если не авторизован, перенаправляем на страницу входа
        if (!response.ok || response.status === 401) {
          console.log('[HomeRedirect] User not authenticated, redirecting to login')
          router.replace('/login')
          return
        }
        
        const data = await response.json()
        console.log('[HomeRedirect] Response data:', data)
        
        // Проверяем, что пользователь действительно авторизован
        if (!data?.user) {
          console.log('[HomeRedirect] No user data, redirecting to login')
          router.replace('/login')
          return
        }
        
        const roles = data?.roles || []
        const firstMenuItem = getFirstAvailableMenuItem(roles)
        
        console.log('[HomeRedirect] User roles:', roles)
        console.log('[HomeRedirect] Redirecting to:', firstMenuItem)
        
        router.replace(firstMenuItem)
      } catch (error) {
        console.error('[HomeRedirect] Error getting user data:', error)
        // При ошибке перенаправляем на страницу входа
        router.replace('/login')
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
