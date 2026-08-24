-- Move concern photos out of the database and onto disk (#8).
--
-- Expand step: concern_photo gains the file-storage columns while "data_url" is
-- kept (now nullable) so existing base64 rows can be drained by
-- `npm run photos:backfill`. Drop "data_url" in a follow-up migration once the
-- backfill reports zero remaining.

-- AlterTable
ALTER TABLE "concern_photo"
  ADD COLUMN "storage_key" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "mime_type"   TEXT NOT NULL DEFAULT 'image/jpeg',
  ADD COLUMN "size_bytes"  INTEGER NOT NULL DEFAULT 0,
  ALTER COLUMN "data_url" DROP NOT NULL;

-- The defaults above exist only to backfill existing rows; new rows must supply
-- these values explicitly (they are required in the Prisma model).
ALTER TABLE "concern_photo"
  ALTER COLUMN "storage_key" DROP DEFAULT,
  ALTER COLUMN "mime_type"   DROP DEFAULT,
  ALTER COLUMN "size_bytes"  DROP DEFAULT;
