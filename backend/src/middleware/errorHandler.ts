import type { NextFunction, Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import { HttpError } from '../lib/httpError.js'

/** Central error middleware — turns thrown errors into clean JSON responses. */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message })
  }
  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation failed', issues: err.flatten() })
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = (err.meta?.target as string[] | undefined)?.join(', ') ?? 'field'
      return res.status(409).json({ error: `A record with this ${target} already exists` })
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Not found' })
    }
  }
  console.error('[unhandled]', err)
  return res.status(500).json({ error: 'Internal server error' })
}
