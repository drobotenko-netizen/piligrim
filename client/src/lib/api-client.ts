import { getApiBase } from './api'

type FetchOptions = {
  method?: string
  body?: any
  params?: Record<string, any>
  headers?: Record<string, string>
}

/**
 * Централизованный API клиент для всех запросов к бэкенду
 * Автоматически добавляет credentials, Content-Type и обрабатывает ошибки
 */
export class ApiClient {
  private baseUrl: string

  constructor() {
    this.baseUrl = getApiBase()
  }

  /**
   * Универсальный метод для запросов
   */
  private async request<T>(
    endpoint: string, 
    options: FetchOptions = {}
  ): Promise<T> {
    const { method = 'GET', body, params, headers = {} } = options
    
    // Формируем URL с query параметрами
    let url = `${this.baseUrl}${endpoint}`
    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value))
        }
      })
      const queryString = searchParams.toString()
      if (queryString) {
        url += `?${queryString}`
      }
    }

    // Конфигурация запроса
    const config: RequestInit = {
      method,
      credentials: 'include', // Важно для cookies (JWT)
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...headers
      }
    }

    if (body) {
      config.body = JSON.stringify(body)
    }

    try {
      const response = await fetch(url, config)
      
      // Обработка ошибок HTTP
      if (!response.ok) {
        const error = await response.json().catch(() => ({ 
          error: `HTTP ${response.status}: ${response.statusText}` 
        }))
        throw new Error(error.error || 'Request failed')
      }

      // Возвращаем JSON
      return await response.json()
    } catch (error) {
      // Логируем ошибку
      console.error(`API Error [${method} ${endpoint}]:`, error)
      throw error
    }
  }

  /**
   * GET запрос
   */
  get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    return this.request<T>(endpoint, { params })
  }

  /**
   * POST запрос
   */
  post<T>(endpoint: string, body: any): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body })
  }

  /**
   * PATCH запрос
   */
  patch<T>(endpoint: string, body: any): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body })
  }

  /**
   * DELETE запрос
   */
  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  /**
   * PUT запрос
   */
  put<T>(endpoint: string, body: any): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body })
  }
}

/**
 * Singleton instance для использования во всём приложении
 */
export const api = new ApiClient()

