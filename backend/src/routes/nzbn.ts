import { Router } from 'express'
import { prisma } from '../prisma.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { notFound } from '../lib/httpError.js'

// Public (pre-auth) — used by the registration company-name lookup.
// Backed by our Company table for now; swaps to the live nzbn.govt.nz API later.
export const nzbnRouter = Router()

// GET /nzbn/search?q= — search registered businesses by (partial) name.
nzbnRouter.get(
  '/search',
  asyncHandler(async (req, res) => {
    const q = String(req.query.q ?? '').trim()
    if (q.length < 2) return res.json([])
    const companies = await prisma.company.findMany({
      where: { name: { contains: q, mode: 'insensitive' } },
      orderBy: { name: 'asc' },
      take: 6,
    })
    res.json(companies.map((c) => ({ nzbn: c.nzbn, name: c.name })))
  }),
)

// GET /nzbn/:nzbn — resolve an NZBN to a business name.
nzbnRouter.get(
  '/:nzbn',
  asyncHandler(async (req, res) => {
    const nzbn = req.params.nzbn.replace(/\s/g, '')
    const company = await prisma.company.findUnique({ where: { nzbn } })
    if (!company) throw notFound('NZBN not found')
    res.json({ nzbn: company.nzbn, name: company.name })
  }),
)
