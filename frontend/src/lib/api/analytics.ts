import { apiFetch } from './client'

/** Analytics DTOs — mirror the backend's /analytics/* responses. */
export interface AnalyticsSummary {
  businesses: number
  users: number
  concerns: number
  avgTimeToCloseHours: number | null
}
export interface BusinessRow {
  name: string
  nzbn: string
  sites: number
  adoption: number
  workers: number
}
export interface BusinessUser {
  name: string
  role: string
  crew: string
}
export interface Demographics {
  genderSplit: { name: string; value: number }[]
  averageAgeBand: string | null
  suppressed: boolean
  minCohort: number
}
export interface CategoryDatum {
  name: string
  value: number
}
export interface TrendDatum {
  week: string
  reported: number
  closed: number
}

export const analyticsApi = {
  summary: () => apiFetch<AnalyticsSummary>('/analytics/summary'),
  businesses: () => apiFetch<BusinessRow[]>('/analytics/businesses'),
  businessUsers: (nzbn: string) =>
    apiFetch<BusinessUser[]>(`/analytics/businesses/${encodeURIComponent(nzbn)}/users`),
  demographics: () => apiFetch<Demographics>('/analytics/demographics'),
  categories: () => apiFetch<CategoryDatum[]>('/analytics/categories'),
  trend: () => apiFetch<TrendDatum[]>('/analytics/trend'),
  deleteCompany: (nzbn: string) =>
    apiFetch<{ ok: boolean; deletedMembers: number }>(
      `/analytics/companies/${encodeURIComponent(nzbn)}`,
      { method: 'DELETE' },
    ),
}
