/**
 * Drain concern photos out of the database and onto disk.
 *
 * Photos used to be stored as base64 in `concern_photo.data_url`. This walks the
 * rows that still hold base64, writes each one under storage/photos/, points the
 * row at the file and clears the column. Safe to re-run: rows that already have a
 * `storage_key` are skipped, so an interrupted run just picks up where it left off.
 *
 *   npm run photos:backfill
 *
 * Once it reports 0 remaining, `data_url` can be dropped in a follow-up migration.
 */
import { prisma } from '../src/prisma.js'
import { storePhotoDataUrl } from '../src/lib/photos.js'
import { STORAGE_ROOT } from '../src/lib/fileStorage.js'

const BATCH = 50

async function main() {
  console.log(`Backfilling concern photos into ${STORAGE_ROOT}`)

  let moved = 0
  // Rows that threw are skipped on the next page so the walk always terminates.
  const failedIds: string[] = []

  for (;;) {
    // Rows written before the move: base64 present, no file behind them yet.
    const batch = await prisma.concernPhoto.findMany({
      where: { storageKey: '', dataUrl: { not: null }, id: { notIn: failedIds } },
      select: { id: true, dataUrl: true, createdAt: true },
      take: BATCH,
      orderBy: { createdAt: 'asc' },
    })
    if (batch.length === 0) break

    for (const row of batch) {
      try {
        const stored = await storePhotoDataUrl(row.dataUrl!, row.createdAt)
        await prisma.concernPhoto.update({
          where: { id: row.id },
          data: { ...stored, dataUrl: null },
        })
        moved += 1
      } catch (err) {
        // Leave the row untouched so a re-run can retry it; report and move on
        // rather than aborting a long backfill on one bad blob.
        failedIds.push(row.id)
        console.error(`  ! photo ${row.id}: ${(err as Error).message}`)
      }
    }
    console.log(`  … ${moved} moved${failedIds.length ? `, ${failedIds.length} failed` : ''}`)
  }

  const remaining = await prisma.concernPhoto.count({
    where: { storageKey: '', dataUrl: { not: null } },
  })
  console.log(`\nDone — ${moved} photo(s) moved to disk, ${remaining} still in the database.`)
  if (remaining > 0) {
    console.log('Fix the reported rows and re-run before dropping the data_url column.')
  }
  process.exitCode = remaining > 0 ? 1 : 0
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
