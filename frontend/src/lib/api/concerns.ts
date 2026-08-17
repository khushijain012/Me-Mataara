import { apiFetch } from './client'
import type { Concern, SyncEvent } from '@/lib/types'

/** What the worker submits to raise a concern (server assigns ref/routing). */
export interface CreateConcernBody {
  categoryId: string
  riskIds: string[]
  description: string
  photos: string[]
  sceneDate?: string
  reportedAnonymous?: boolean
  offline?: boolean
  clientId?: string // idempotency key for offline dedupe
  capturedAt?: string // ISO — when captured on device
}

/** Concern loop (mirrors /concerns). The server owns routing, refs, cycle-time. */
export const concernsApi = {
  list: () => apiFetch<Concern[]>('/concerns'),
  create: (body: CreateConcernBody) =>
    apiFetch<Concern>('/concerns', { method: 'POST', body: JSON.stringify(body) }),
  sync: (concerns: CreateConcernBody[]) =>
    apiFetch<{ synced: Concern[]; event: SyncEvent }>('/sync', {
      method: 'POST',
      body: JSON.stringify({ concerns }),
    }),
  addAction: (id: string, message: string, promptId?: string) =>
    apiFetch<Concern>(`/concerns/${encodeURIComponent(id)}/actions`, {
      method: 'POST',
      body: JSON.stringify({ message, promptId }),
    }),
  close: (id: string, riskReduction: string) =>
    apiFetch<Concern>(`/concerns/${encodeURIComponent(id)}/close`, {
      method: 'POST',
      body: JSON.stringify({ riskReduction }),
    }),
  updateStatus: (id: string, status: 'open' | 'in_progress') =>
    apiFetch<Concern>(`/concerns/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
}
