import { PrismaClient, type Prisma } from '@prisma/client'

export const prisma = new PrismaClient()

/**
 * One place that enforces two system-wide rules so no route ever repeats them:
 *
 *  • Soft delete (#11): `delete`/`deleteMany` become an update that sets
 *    `is_deleted = true` (+ `deleted_at`); reads transparently hide deleted rows.
 *  • Field audit (#13): every create/update/delete writes an `audit_log` row
 *    (best-effort, non-blocking).
 *
 * `audit_log` itself is exempt (it is the ledger — never soft-deleted or audited).
 */
const READS_TO_FILTER = new Set(['findFirst', 'findFirstOrThrow', 'findMany', 'count', 'aggregate', 'groupBy'])

prisma.$use(async (params, next) => {
  const model = params.model
  // The audit ledger is exempt from both rules (and prevents recursion).
  if (!model || model === 'AuditLog') return next(params)

  const original = params.action

  // ---- Soft delete: turn deletes into flag updates ----
  if (original === 'delete') {
    params.action = 'update'
    params.args = params.args ?? {}
    params.args.data = { isDeleted: true, deletedAt: new Date() }
  } else if (original === 'deleteMany') {
    params.action = 'updateMany'
    params.args = params.args ?? {}
    params.args.data = { ...(params.args.data ?? {}), isDeleted: true, deletedAt: new Date() }
  } else if (READS_TO_FILTER.has(original)) {
    // Hide soft-deleted rows from all reads.
    params.args = params.args ?? {}
    params.args.where = { isDeleted: false, ...(params.args.where ?? {}) }
  } else if (original === 'findUnique' || original === 'findUniqueOrThrow') {
    // findUnique can't take a non-unique filter, so run it as findFirst.
    params.action = original === 'findUnique' ? 'findFirst' : 'findFirstOrThrow'
    params.args.where = { isDeleted: false, ...params.args.where }
  }

  const result = await next(params)

  // ---- Field audit: record what changed (non-blocking best-effort) ----
  const action: 'insert' | 'update' | 'delete' | null = original.startsWith('create')
    ? 'insert'
    : original === 'delete' || original === 'deleteMany'
      ? 'delete'
      : original.startsWith('update')
        ? 'update'
        : null
  if (action) {
    const entityId = String((result as { id?: string } | null)?.id ?? params.args?.where?.id ?? '')
    prisma.auditLog
      .create({
        data: { entity: model, entityId, action, changes: (params.args?.data ?? undefined) as Prisma.InputJsonValue },
      })
      .catch(() => {
        /* audit is best-effort; never block the main operation */
      })
  }

  return result
})
