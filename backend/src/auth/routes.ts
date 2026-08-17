import { Router } from 'express'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '../prisma.js'
import { asyncHandler } from '../lib/asyncHandler.js'
import { toIdentity } from '../lib/dto.js'
import { unauthorized } from '../lib/httpError.js'
import { hashPassword, verifyPassword } from './password.js'
import { nextUserId } from '../lib/userId.js'
import { signToken } from './jwt.js'
import { authenticate, currentMember } from '../middleware/auth.js'

export const authRouter = Router()

const GENDERS = ['female', 'male', 'gender_diverse', 'prefer_not'] as const

// Mirrors RegisterDraft in src/lib/identity/types.ts.
const registerSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  dob: z.string().trim().min(1),
  gender: z.union([z.enum(GENDERS), z.literal('')]).optional(),
  industry: z.string().trim().optional().default(''),
  mobile: z.string().trim().min(6),
  email: z.string().trim().email(),
  isHSR: z.boolean().optional().default(false),
  workerNumber: z.string().trim().optional(),
  nzbn: z.string().trim().optional().default(''),
  organisation: z.string().trim().optional().default(''),
  supervisorId: z.string().trim().optional(),
  supervisorName: z.string().trim().optional(),
  password: z.string().min(5),
})

const loginSchema = z.object({
  mobile: z.string().trim().min(1),
  password: z.string().min(1),
})

const normMobile = (s: string) => s.replace(/\s/g, '')

function tokenFor(member: Prisma.MemberGetPayload<object>): string {
  return signToken({
    sub: member.id,
    role: member.role,
    circleRole: member.circleRole,
    companyId: member.companyId,
  })
}

// POST /auth/register — self-registration (worker). Provisional own-auth path.
authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body)

    // Link (or create) the NZBN business so analytics can roll up.
    let companyId: string | null = null
    if (input.nzbn) {
      const company = await prisma.company.upsert({
        where: { nzbn: input.nzbn },
        update: { name: input.organisation || undefined },
        create: { nzbn: input.nzbn, name: input.organisation || 'Unknown business' },
      })
      companyId = company.id
    }

    // Resolve the claimed supervisor (Worker->Supervisor edge).
    let supervisorId = input.supervisorId ?? null
    let supervisorName = input.supervisorName ?? null
    if (supervisorId) {
      const sup = await prisma.member.findUnique({ where: { id: supervisorId } })
      if (!sup) {
        supervisorId = null
        supervisorName = null
      } else {
        supervisorName = `${sup.firstName} ${sup.lastName}`.trim()
      }
    }

    const initials =
      (input.firstName[0] ?? '').toUpperCase() + (input.lastName[0] ?? '').toUpperCase()

    const member = await prisma.member.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        mobile: input.mobile,
        passwordHash: await hashPassword(input.password),
        workerId: await nextUserId('worker'),
        circleRole: 'worker',
        role: 'worker',
        dob: input.dob,
        gender: input.gender ? input.gender : null,
        industry: input.industry || null,
        isHSR: input.isHSR,
        workerNumber: input.workerNumber || null,
        nzbn: input.nzbn || null,
        organisation: input.organisation || null,
        companyId,
        companyName: input.organisation || null,
        supervisorId,
        supervisorName,
        initials,
        avatarColor: 'bg-pounamu-600',
        verificationStatus: 'verified',
      },
    })

    res.status(201).json({ token: tokenFor(member), identity: toIdentity(member) })
  }),
)

// POST /auth/login — mobile + password.
authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { mobile, password } = loginSchema.parse(req.body)
    // Match on normalised mobile (ignore spacing).
    const candidates = await prisma.member.findMany({ where: { passwordHash: { not: null } } })
    const member = candidates.find((m) => normMobile(m.mobile) === normMobile(mobile))
    if (!member || !member.passwordHash) throw unauthorized('Incorrect mobile or password')

    const ok = await verifyPassword(password, member.passwordHash)
    if (!ok) throw unauthorized('Incorrect mobile or password')

    res.json({ token: tokenFor(member), identity: toIdentity(member) })
  }),
)

// GET /auth/me — restore the session identity from the token.
authRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({ identity: toIdentity(currentMember(req)) })
  }),
)

// POST /auth/logout — stateless JWT; the client discards the token.
authRouter.post(
  '/logout',
  asyncHandler(async (_req, res) => {
    res.json({ ok: true })
  }),
)
