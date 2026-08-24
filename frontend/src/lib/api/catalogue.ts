import { apiFetch } from './client'
import type { AkoKorero, HazardCategory, SupervisorPrompt } from '@/lib/types'

/** Hazard catalogue + supervisor prompts + cultural content (mirror /hazards, /prompts, /ako-korero). */
export const catalogueApi = {
  getHazards: () => apiFetch<HazardCategory[]>('/hazards'),
  saveHazards: (hazards: HazardCategory[]) =>
    apiFetch<HazardCategory[]>('/hazards', { method: 'PUT', body: JSON.stringify(hazards) }),
  getPrompts: () => apiFetch<SupervisorPrompt[]>('/prompts'),
  savePrompts: (prompts: SupervisorPrompt[]) =>
    apiFetch<SupervisorPrompt[]>('/prompts', { method: 'PUT', body: JSON.stringify(prompts) }),
  getAkoKorero: () => apiFetch<AkoKorero[]>('/ako-korero'),
}
