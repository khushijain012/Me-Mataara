import { apiFetch } from './client'
import type { Role } from '@/lib/types'

/** A member row for the admin Users screen (mirrors GET /members). */
export interface MemberRow {
  id: string
  userId: string
  name: string
  initials: string
  color: string
  role: Role
  crew: string
  site: string
  status: 'active' | 'pending'
}

/** Fields for creating a member from the admin Users screen (POST /members). */
export interface NewMemberInput {
  firstName: string
  lastName: string
  mobile: string
  email: string
  role: Role
  password: string
  supervisorId?: string
  organisation?: string
}

export const membersApi = {
  list: () => apiFetch<MemberRow[]>('/members'),
  create: (input: NewMemberInput) =>
    apiFetch<MemberRow>('/members', { method: 'POST', body: JSON.stringify(input) }),
  remove: (id: string) => apiFetch<{ ok: boolean }>(`/members/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}
