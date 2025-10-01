import { AsyncLocalStorage } from 'async_hooks'

export type RequestContext = {
  userId?: string | null
  tenantId?: string | null
  ip?: string | null
  ua?: string | null
}

export const als = new AsyncLocalStorage<RequestContext>()

export function getRequestContext(): RequestContext {
  return als.getStore() || {}
}


