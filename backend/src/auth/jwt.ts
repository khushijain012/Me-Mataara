import jwt from 'jsonwebtoken'
import type { AppRole, CircleRole } from '@prisma/client'
import { config } from '../config.js'

export interface TokenClaims {
  sub: string // member id
  role: AppRole
  circleRole: CircleRole
  companyId: string | null
}

export function signToken(claims: TokenClaims): string {
  return jwt.sign(claims, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  })
}

export function verifyToken(token: string): TokenClaims {
  return jwt.verify(token, config.jwtSecret) as TokenClaims
}
