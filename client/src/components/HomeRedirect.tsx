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
        const API_BASE = getApiBase()
        console.log('[HomeRedirect] Making request to:', `${API_BASE}/api/auth/otp/me`)
        
        const response = await fetch(`${API_BASE}/api/auth/otp/me`, { 
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        })
        
        console.log('[HomeRedirect] Response status:', response.status)
        console.log('[HomeRedirect] Response headers:', Object.fromEntries(response.headers.entries()))
        
        // Если не авторизован, показываем информацию о входе через Telegram
        if (!response.ok || response.status === 401) {
          console.log('[HomeRedirect] User not authenticated, showing telegram login info')
          setIsRedirecting(false)
          return
        }
        
        const data = await response.json()
        console.log('[HomeRedirect] Response data:', data)
        
        // Проверяем, что пользователь действительно авторизован
        if (!data?.user) {
          console.log('[HomeRedirect] No user data, showing telegram login info')
          setIsRedirecting(false)
          return
        }
        
        const roles = data?.roles || []
        const firstMenuItem = getFirstAvailableMenuItem(roles)
        
        console.log('[HomeRedirect] User roles:', roles)
        console.log('[HomeRedirect] Redirecting to:', firstMenuItem)
        
        router.replace(firstMenuItem)
      } catch (error) {
        console.error('[HomeRedirect] Error getting user data:', error)
        // При ошибке показываем информацию о входе через Telegram
        setIsRedirecting(false)
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

  // Показываем информацию о входе через Telegram
  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <img src="/logo.png" alt="Piligrim" className="h-16 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Добро пожаловать в Piligrim</h1>
          <p className="text-gray-600">Для входа в систему используйте Telegram бота</p>
        </div>
        
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 8.16l-1.61 7.59c-.12.56-.44.7-.89.435l-2.46-1.81-1.19 1.15c-.13.13-.24.24-.49.24l.18-2.56 4.57-4.13c.2-.18-.04-.28-.31-.1l-5.64 3.55-2.43-.76c-.53-.16-.54-.53.11-.79l9.57-3.69c.44-.16.83.1.69.79z"/>
              </svg>
              <span className="font-semibold text-blue-800">Telegram Bot</span>
            </div>
            <p className="text-sm text-blue-700">
              Откройте Telegram и найдите бота <strong>@piligrim_app_bot</strong>
            </p>
          </div>
          
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>Для входа:</strong></p>
            <ol className="list-decimal list-inside space-y-1 text-left">
              <li>Откройте Telegram</li>
              <li>Найдите бота @piligrim_app_bot</li>
              <li>Отправьте команду <code className="bg-gray-100 px-1 rounded">/login</code></li>
              <li>Перейдите по полученной ссылке</li>
            </ol>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              <strong>Нет доступа к боту?</strong><br />
              Обратитесь к администратору для получения кода привязки
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
