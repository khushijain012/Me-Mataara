/**
 * Reclaim disk for concern photos that have been soft-deleted long enough.
 *
 * Deletes in this app are soft (src/prisma.ts): removing a member, a business or a
 * concern flags the rows rather than dropping them, so photo files must stay on
 * disk at delete time — a surviving row has to keep pointing at real bytes. This
 * script is the deliberate second step that frees that space.
 *
 *   npm run photos:purge            # default 90-day retention
 *   npm run photos:purge -- 30      # keep 30 days
 *   npm run photos:purge -- 30 --dry-run
 *
 * For each photo whose row (or whose concern) has been soft-deleted past the
 * window, the file is unlinked and the row is hard-deleted — in that order, so an
 * interrupted run never leaves a live row pointing at a missing file.
 */
import { prisma } from '../src/prisma.js'
import { deleteStorageFile } from '../src/lib/fileStorage.js'
import { findPurgeablePhotos, hardDeletePhotoRows } from '../src/services/concernService.js'

const DEFAULT_RETENTION_DAYS = 90

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const days = Number(args.find((a) => /^\d+$/.test(a)) ?? DEFAULT_RETENTION_DAYS)
  if (!Number.isFinite(days) || days < 0) {
    console.error('Retention must be a non-negative number of days.')
    process.exitCode = 1
    return
  }

  const purgeable = await findPurgeablePhotos(days)
  console.log(
    `${purgeable.length} photo(s) soft-deleted more than ${days} day(s) ago` +
      (dryRun ? ' (dry run — nothing will be removed)' : ''),
  )
  if (purgeable.length === 0 || dryRun) {
    for (const p of purgeable) console.log(`  would remove ${p.storageKey}`)
    return
  }

  // File first, then the row: the reverse order could drop the only record of a
  // file that then survives on disk unreferenced.
  const purgedIds: string[] = []
  for (const photo of purgeable) {
    await deleteStorageFile(photo.storageKey)
    purgedIds.push(photo.id)
  }
  const rows = await hardDeletePhotoRows(purgedIds)
  console.log(`Removed ${purgedIds.length} file(s) and ${rows} row(s).`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
