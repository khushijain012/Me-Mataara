import type { NextFunction, Request, Response } from 'express'
import type { AppRole, Member } from '@prisma/client'
import { prisma } from '../prisma.js'
import { verifyToken } from '../auth/jwt.js'
import { forbidden, unauthorized } from '../lib/httpError.js'

/**
 * Verify the Bearer token and load the member. The token is our own JWT for now;
 * this is the single seam that swaps to Circle token verification later without
 * touching any route.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization ?? ''
    const [scheme, token] = header.split(' ')
    if (scheme !== 'Bearer' || !token) throw unauthorized('Missing bearer token')

    let claims
    try {
      claims = verifyToken(token)
    } catch {
      throw unauthorized('Invalid or expired token')
    }

    const member = await prisma.member.findUnique({ where: { id: claims.sub } })
    if (!member) throw unauthorized('Account no longer exists')

    req.claims = claims
    req.member = member
    next()
  } catch (err) {
    next(err)
  }
}

/** Require the authenticated member to hold one of the given app roles. */
export function requireRole(...roles: AppRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const member = req.member
    if (!member) return next(unauthorized())
    if (!roles.includes(member.role)) return next(forbidden('Insufficient role'))
    next()
  }
}

/** Read the authenticated member, asserting the middleware ran. */
export function currentMember(req: Request): Member {
  if (!req.member) throw unauthorized()
  return req.member
}
