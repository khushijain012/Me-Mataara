import type { AppRole } from '@prisma/client'
import { prisma } from '../prisma.js'

// Role-prefixed human-readable user IDs. Workers keep the existing W-#### series;
// supervisors and admins get their own bands so the prefix signals the role.
const SERIES: Record<AppRole, { prefix: string; base: number }> = {
  worker: { prefix: 'W-', base: 1000 },
  supervisor: { prefix: 'S-', base: 2000 },
  admin: { prefix: 'A-', base: 9000 },
}

/**
 * The next unique user ID for a role, e.g. `W-1006`, `S-2004`, `A-9003`.
 * Derived from the current max in that role's band so it always moves forward
 * (the unique constraint on member.worker_id is the ultimate guard).
 */
export async function nextUserId(role: AppRole): Promise<string> {
  const { prefix, base } = SERIES[role]
  const rows = await prisma.member.findMany({
    where: { workerId: { startsWith: prefix } },
    select: { workerId: true },
  })
  let max = base
  for (const r of rows) {
    const n = Number(r.workerId?.slice(prefix.length))
    if (Number.isFinite(n) && n > max) max = n
  }
  return `${prefix}${max + 1}`
}
