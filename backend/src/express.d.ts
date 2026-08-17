import type { Member } from '@prisma/client'
import type { TokenClaims } from './auth/jwt.js'

// Attach the authenticated member + token claims to the request.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      member?: Member
      claims?: TokenClaims
    }
  }
}

export {}
