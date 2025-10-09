'use client'

import { useState, useEffect, useCallback } from 'react'
import { api } from '@/lib/api-client'

/**
 * Хук для загрузки данных из API с автоматическим управлением состоянием
 * 
 * @example
 * const { data, loading, error, refetch } = useApi<Employee[]>('/api/employees')
 */
export function useApi<T>(
  endpoint: string,
  params?: Record<string, any>,
  options?: {
    enabled?: boolean // По умолчанию true
    initialData?: T
  }
) {
  const [data, setData] = useState<T | null>(options?.initialData || null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const enabled = options?.enabled !== false

  const fetch = useCallback(async () => {
    if (!enabled) return

    try {
      setLoading(true)
      setError(null)
      const result = await api.get<T>(endpoint, params)
      setData(result)
    } catch (e: any) {
      setError(e.message || 'Unknown error')
      console.error('useApi error:', e)
    } finally {
      setLoading(false)
    }
  }, [endpoint, JSON.stringify(params), enabled])

  useEffect(() => {
    fetch()
  }, [fetch])

  return {
    data,
    loading,
    error,
    refetch: fetch
  }
}

/**
 * Хук для мутации данных (POST, PATCH, DELETE)
 * 
 * @example
 * const { mutate, loading, error } = useMutation('/api/employees', 'POST')
 * await mutate({ fullName: 'Иван Иванов' })
 */
export function useMutation<TData = any, TResponse = any>(
  endpoint: string,
  method: 'POST' | 'PATCH' | 'DELETE' = 'POST'
) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutate = useCallback(async (data?: TData): Promise<TResponse | null> => {
    try {
      setLoading(true)
      setError(null)

      let result: TResponse
      if (method === 'POST') {
        result = await api.post<TResponse>(endpoint, data)
      } else if (method === 'PATCH') {
        result = await api.patch<TResponse>(endpoint, data)
      } else {
        result = await api.delete<TResponse>(endpoint)
      }

      return result
    } catch (e: any) {
      setError(e.message || 'Unknown error')
      console.error('useMutation error:', e)
      throw e
    } finally {
      setLoading(false)
    }
  }, [endpoint, method])

  return {
    mutate,
    loading,
    error
  }
}

