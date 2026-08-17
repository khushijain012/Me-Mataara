import { prisma } from '../prisma.js'

const REF_PREFIX = 'HZ-'
const REF_START = 1042 // matches the seed baseline in src/lib/mockData.ts

/**
 * Generate the next human concern ref (HZ-####) server-side so offline queues
 * from multiple devices never collide. Scans existing refs for the max number.
 */
export async function nextConcernRef(): Promise<string> {
  const concerns = await prisma.concern.findMany({ select: { ref: true } })
  const max = concerns.reduce((m, c) => {
    const n = Number(c.ref.replace(REF_PREFIX, ''))
    return Number.isFinite(n) && n > m ? n : m
  }, REF_START)
  return `${REF_PREFIX}${max + 1}`
}
