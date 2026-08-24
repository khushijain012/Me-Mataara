import { Router } from 'express'
import { prisma } from '../prisma.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { authenticate, requireRole } from '../middleware/auth.js'
import { notFound } from '../lib/httpError.js'
import { ageBandFromDob, ageFromDob } from '../lib/demographics.js'

export const analyticsRouter = Router()
analyticsRouter.use(authenticate, requireRole('admin'))

// Minimum cohort before an aggregate is shown (k-anonymity — doc: aggregate only).
const MIN_COHORT = 3

const ROLE_LABEL: Record<string, string> = {
  worker: 'Worker',
  supervisor: 'Supervisor',
  admin: 'Platform Admin',
}

// GET /analytics/summary — headline tiles.
analyticsRouter.get(
  '/summary',
  asyncHandler(async (_req, res) => {
    const [businesses, users, concerns, closed] = await Promise.all([
      prisma.company.count(),
      prisma.member.count(),
      prisma.concern.count(),
      prisma.concern.findMany({
        where: { status: 'closed', timeToCloseHours: { not: null } },
        select: { timeToCloseHours: true },
      }),
    ])
    const avgTimeToCloseHours = closed.length
      ? Math.round((closed.reduce((a, c) => a + (c.timeToCloseHours ?? 0), 0) / closed.length) * 10) / 10
      : null
    res.json({ businesses, users, concerns, avgTimeToCloseHours })
  }),
)

// GET /analytics/businesses — businesses by NZBN with user counts.
analyticsRouter.get(
  '/businesses',
  asyncHandler(async (_req, res) => {
    const companies = await prisma.company.findMany({ orderBy: { name: 'asc' } })
    const out = await Promise.all(
      companies.map(async (c) => ({
        name: c.name,
        nzbn: c.nzbn,
        sites: c.sites,
        adoption: c.adoption,
        workers: await prisma.member.count({ where: { companyId: c.id } }),
      })),
    )
    res.json(out)
  }),
)

// GET /analytics/businesses/:nzbn/users — drill-down (no demographics).
analyticsRouter.get(
  '/businesses/:nzbn/users',
  asyncHandler(async (req, res) => {
    const company = await prisma.company.findUnique({ where: { nzbn: req.params.nzbn } })
    if (!company) throw notFound('Business not found')
    const members = await prisma.member.findMany({
      where: { companyId: company.id },
      orderBy: { firstName: 'asc' },
    })
    res.json(
      members.map((m) => ({
        name: `${m.firstName} ${m.lastName}`.trim(),
        role: ROLE_LABEL[m.role] ?? m.role,
        crew: m.crew ?? '',
      })),
    )
  }),
)

// GET /analytics/demographics — aggregate only (doc: never per-user).
analyticsRouter.get(
  '/demographics',
  asyncHandler(async (_req, res) => {
    const members = await prisma.member.findMany({ select: { gender: true, dob: true } })

    // Gender split (k-anonymised).
    const withGender = members.filter((m) => m.gender)
    const genderCounts: Record<string, number> = {}
    for (const m of withGender) genderCounts[m.gender as string] = (genderCounts[m.gender as string] ?? 0) + 1
    const total = withGender.length
    const genderSplit =
      total >= MIN_COHORT
        ? Object.entries(genderCounts).map(([name, count]) => ({
            name,
            value: Math.round((count / total) * 100),
          }))
        : []

    // Average age band from those with a DOB.
    const ages = members.map((m) => ageFromDob(m.dob)).filter((a) => a > 0)
    const averageAgeBand =
      ages.length >= MIN_COHORT
        ? ageBandFromDob(
            new Date(new Date().getFullYear() - Math.round(ages.reduce((a, b) => a + b, 0) / ages.length), 0, 1)
              .toISOString()
              .slice(0, 10),
          )
        : null

    res.json({
      genderSplit,
      averageAgeBand,
      suppressed: total < MIN_COHORT,
      minCohort: MIN_COHORT,
    })
  }),
)

// GET /analytics/categories — risk-theme breakdown (concern counts per hazard).
analyticsRouter.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const [concerns, hazards] = await Promise.all([
      prisma.concern.findMany({ select: { categoryId: true } }),
      prisma.hazardCategory.findMany({ select: { id: true, label: true } }),
    ])
    const label = new Map(hazards.map((h) => [h.id, h.label]))
    const counts: Record<string, number> = {}
    for (const c of concerns) counts[c.categoryId] = (counts[c.categoryId] ?? 0) + 1
    const out = Object.entries(counts)
      .map(([id, value]) => ({ name: label.get(id) ?? id, value }))
      .sort((a, b) => b.value - a.value)
    res.json(out)
  }),
)

// GET /analytics/trend — reported vs closed per week for the last 6 weeks.
analyticsRouter.get(
  '/trend',
  asyncHandler(async (_req, res) => {
    const WEEKS = 6
    const now = Date.now()
    const weekMs = 7 * 24 * 3600 * 1000
    const concerns = await prisma.concern.findMany({
      select: { reportedAt: true, closedAtIso: true },
    })
    const buckets = Array.from({ length: WEEKS }, (_, i) => {
      const end = now - (WEEKS - 1 - i) * weekMs
      const start = end - weekMs
      return { week: `Wk ${i + 1}`, start, end, reported: 0, closed: 0 }
    })
    for (const c of concerns) {
      const r = c.reportedAt.getTime()
      const cl = c.closedAtIso?.getTime()
      for (const b of buckets) {
        if (r > b.start && r <= b.end) b.reported += 1
        if (cl && cl > b.start && cl <= b.end) b.closed += 1
      }
    }
    res.json(buckets.map((b) => ({ week: b.week, reported: b.reported, closed: b.closed })))
  }),
)

// DELETE /companies/:nzbn — bulk-delete a business and its members' domain data.
// (Mounted here for cohesion with the analytics view; platform-owner only.)
analyticsRouter.delete(
  '/companies/:nzbn',
  asyncHandler(async (req, res) => {
    const company = await prisma.company.findUnique({ where: { nzbn: req.params.nzbn } })
    if (!company) throw notFound('Business not found')

    const members = await prisma.member.findMany({
      where: { companyId: company.id },
      select: { id: true },
    })
    const memberIds = members.map((m) => m.id)

    // Note: these deletes are soft (see src/prisma.ts), so the concerns' photo
    // files stay on disk — the surviving rows must keep pointing at real bytes.
    // That disk is reclaimed by `npm run photos:purge`.
    await prisma.$transaction([
      // Remove the business's concerns first (corrective actions cascade).
      prisma.concern.deleteMany({
        where: { OR: [{ companyId: company.id }, { reportedById: { in: memberIds } }] },
      }),
      // Then the members (their remaining refs are SetNull by the schema).
      prisma.member.deleteMany({ where: { companyId: company.id } }),
      prisma.company.delete({ where: { id: company.id } }),
    ])

    res.json({ ok: true, deletedMembers: memberIds.length })
  }),
)
