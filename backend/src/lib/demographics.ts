/** Age derived from date of birth (doc §2). Mirrors src/lib/utils.ts. */
export function ageFromDob(dob?: string | null): number {
  if (!dob) return 0
  const b = new Date(dob)
  if (Number.isNaN(b.getTime())) return 0
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--
  return age < 0 ? 0 : age
}

/** Aggregate age band (doc §2: never surface an individual age). */
export function ageBandFromDob(dob?: string | null): string {
  const age = ageFromDob(dob)
  if (!age) return 'Unknown'
  if (age < 25) return 'Under 25'
  if (age < 35) return '25–34'
  if (age < 45) return '35–44'
  if (age < 55) return '45–54'
  if (age < 65) return '55–64'
  return '65+'
}
