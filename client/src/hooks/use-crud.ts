'use client'

import { useState, useCallback } from 'react'
import { api } from '@/lib/api-client'

/**
 * Универсальный хук для CRUD операций
 * Автоматически управляет списком элементов, загрузкой и ошибками
 * 
 * @example
 * const employees = useCrud<Employee>('/api/employees', initialData)
 * 
 * // Использование
 * await employees.create({ fullName: 'Иван Иванов' })
 * await employees.update('id123', { fullName: 'Пётр Петров' })
 * await employees.remove('id123')
 * await employees.refetch()
 */
export function useCrud<T extends { id: string }>(
  endpoint: string,
  initialData?: T[]
) {
  const [items, setItems] = useState<T[]>(initialData || [])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Загрузить список элементов
   */
  const fetch = useCallback(async (params?: Record<string, any>) => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.get<{ data: T[] }>(endpoint, params)
      setItems(response.data || [])
    } catch (e: any) {
      setError(e.message || 'Failed to fetch')
      console.error('useCrud fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [endpoint])

  /**
   * Создать новый элемент
   */
  const create = useCallback(async (data: Partial<T>) => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.post<{ data: T }>(endpoint, data)
      
      // Оптимистичное обновление
      if (response.data) {
        setItems(prev => [...prev, response.data])
      } else {
        // Если сервер не вернул созданный объект, перезагрузим список
        await fetch()
      }
      
      return response.data
    } catch (e: any) {
      setError(e.message || 'Failed to create')
      console.error('useCrud create error:', e)
      throw e
    } finally {
      setLoading(false)
    }
  }, [endpoint, fetch])

  /**
   * Обновить существующий элемент
   */
  const update = useCallback(async (id: string, data: Partial<T>) => {
    try {
      setLoading(true)
      setError(null)
      const response = await api.patch<{ data: T }>(`${endpoint}/${id}`, data)
      
      // Оптимистичное обновление
      if (response.data) {
        setItems(prev => prev.map(item => 
          item.id === id ? response.data : item
        ))
      } else {
        await fetch()
      }
      
      return response.data
    } catch (e: any) {
      setError(e.message || 'Failed to update')
      console.error('useCrud update error:', e)
      throw e
    } finally {
      setLoading(false)
    }
  }, [endpoint, fetch])

  /**
   * Удалить элемент
   */
  const remove = useCallback(async (id: string) => {
    try {
      setLoading(true)
      setError(null)
      await api.delete(`${endpoint}/${id}`)
      
      // Оптимистичное обновление
      setItems(prev => prev.filter(item => item.id !== id))
    } catch (e: any) {
      setError(e.message || 'Failed to delete')
      console.error('useCrud remove error:', e)
      // Откатываем изменения при ошибке
      await fetch()
      throw e
    } finally {
      setLoading(false)
    }
  }, [endpoint, fetch])

  /**
   * Обновить один элемент локально без запроса к API
   * Полезно для оптимистичных обновлений
   */
  const updateLocal = useCallback((id: string, updates: Partial<T>) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, ...updates } : item
    ))
  }, [])

  /**
   * Добавить элемент локально без запроса к API
   */
  const addLocal = useCallback((item: T) => {
    setItems(prev => [...prev, item])
  }, [])

  /**
   * Удалить элемент локально без запроса к API
   */
  const removeLocal = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id))
  }, [])

  return {
    // Данные
    items,
    loading,
    error,
    
    // API операции
    fetch,
    refetch: fetch,
    create,
    update,
    remove,
    
    // Локальные операции (для оптимистичных обновлений)
    updateLocal,
    addLocal,
    removeLocal
  }
}

/**
 * Типизированная версия useCrud для конкретной сущности
 * 
 * @example
 * type Employee = { id: string; fullName: string; active: boolean }
 * const employees = useTypedCrud<Employee>('/api/employees')
 */
export function useTypedCrud<T extends { id: string }>(
  endpoint: string,
  initialData?: T[]
) {
  return useCrud<T>(endpoint, initialData)
}

