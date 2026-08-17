import { apiFetch } from './client'
import type { AppNotification } from '@/lib/types'

/** Notifications (mirrors /notifications). */
export const notificationsApi = {
  list: () => apiFetch<AppNotification[]>('/notifications'),
  readAll: () => apiFetch<{ ok: boolean }>('/notifications/read-all', { method: 'POST' }),
}
