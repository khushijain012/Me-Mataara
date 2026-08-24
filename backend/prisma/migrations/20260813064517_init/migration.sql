-- CreateEnum
CREATE TYPE "CircleRole" AS ENUM ('platform_owner', 'company_owner', 'supervisor', 'worker');

-- CreateEnum
CREATE TYPE "AppRole" AS ENUM ('worker', 'supervisor', 'admin');

-- CreateEnum
CREATE TYPE "ConcernStatus" AS ENUM ('open', 'in_progress', 'closed');

-- CreateEnum
CREATE TYPE "ResponseType" AS ENUM ('preset', 'custom');

-- CreateEnum
CREATE TYPE "CaptureStatus" AS ENUM ('captured', 'queued', 'synced', 'failed');

-- CreateEnum
CREATE TYPE "Approval" AS ENUM ('approved', 'awaiting_approval');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('female', 'male', 'gender_diverse', 'prefer_not');

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('new_concern', 'status', 'reminder', 'closed');

-- CreateEnum
CREATE TYPE "SyncResult" AS ENUM ('success', 'failure');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('insert', 'update', 'delete');

-- CreateTable
CREATE TABLE "system_role" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_disabled" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "system_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_type" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "storage_folder" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_disabled" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "media_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mime_type" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "media_type_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_disabled" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "mime_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quick_link_type" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_disabled" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "quick_link_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hazard_category" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "maori_label" TEXT,
    "icon" TEXT NOT NULL DEFAULT '',
    "data_url" TEXT NOT NULL DEFAULT '',
    "tint" TEXT NOT NULL DEFAULT 'pounamu',
    "description" TEXT NOT NULL DEFAULT '',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_disabled" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "hazard_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supervisor_prompt" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_disabled" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "supervisor_prompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ako_korero" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_disabled" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "ako_korero_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company" (
    "id" TEXT NOT NULL,
    "nzbn" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sites" INTEGER NOT NULL DEFAULT 1,
    "adoption" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_disabled" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member" (
    "id" TEXT NOT NULL,
    "circle_id" TEXT,
    "worker_id" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "password_hash" TEXT,
    "circle_role" "CircleRole" NOT NULL DEFAULT 'worker',
    "role" "AppRole" NOT NULL DEFAULT 'worker',
    "dob" TEXT,
    "gender" "Gender",
    "industry" TEXT,
    "is_hsr" BOOLEAN NOT NULL DEFAULT false,
    "worker_number" TEXT,
    "nzbn" TEXT,
    "organisation" TEXT,
    "verification_status" TEXT NOT NULL DEFAULT 'verified',
    "company_id" TEXT,
    "company_name" TEXT,
    "supervisor_id" TEXT,
    "supervisor_name" TEXT,
    "crew" TEXT,
    "approval" "Approval",
    "initials" TEXT,
    "avatar_color" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_disabled" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_role" (
    "id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_disabled" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "member_role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_asset" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "media_type_id" TEXT NOT NULL,
    "mime_type_id" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "storage_url" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_disabled" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "media_asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quick_link" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "quick_link_type_id" TEXT NOT NULL,
    "media_id" TEXT,
    "external_url" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_disabled" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "quick_link_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concern" (
    "id" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "client_id" TEXT,
    "primary_category_id" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "ConcernStatus" NOT NULL DEFAULT 'open',
    "scene_date" TEXT,
    "reported_by_id" TEXT NOT NULL,
    "reported_by_name" TEXT NOT NULL,
    "reported_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "reported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supervisor_id" TEXT,
    "assigned_to" TEXT,
    "company_id" TEXT,
    "nzbn" TEXT,
    "closed_at" TEXT,
    "closed_at_iso" TIMESTAMP(3),
    "time_to_close_hours" DOUBLE PRECISION,
    "risk_reduction" TEXT,
    "offline" BOOLEAN NOT NULL DEFAULT false,
    "capture_status" "CaptureStatus",
    "captured_at" TIMESTAMP(3),
    "synced_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_disabled" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "concern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concern_risk" (
    "id" TEXT NOT NULL,
    "concern_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_disabled" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "concern_risk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concern_photo" (
    "id" TEXT NOT NULL,
    "concern_id" TEXT NOT NULL,
    "data_url" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_disabled" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "concern_photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corrective_action" (
    "id" TEXT NOT NULL,
    "concern_id" TEXT NOT NULL,
    "author_id" TEXT,
    "author_name" TEXT NOT NULL,
    "role" "AppRole" NOT NULL,
    "message" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prompt_id" TEXT,
    "response_type" "ResponseType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_disabled" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "corrective_action_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" TEXT NOT NULL,
    "recipient_id" TEXT,
    "kind" "NotificationKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "concern_ref" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_disabled" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_event" (
    "id" TEXT NOT NULL,
    "member_id" TEXT,
    "result" "SyncResult" NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_disabled" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "sync_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "error_log" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entity" TEXT,
    "entity_id" TEXT,
    "retries" INTEGER NOT NULL DEFAULT 0,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_disabled" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,
    "deleted_at" TIMESTAMP(3),
    "deleted_by" TEXT,

    CONSTRAINT "error_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "changes" JSONB,
    "actor_id" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "system_role_code_key" ON "system_role"("code");

-- CreateIndex
CREATE UNIQUE INDEX "media_type_code_key" ON "media_type"("code");

-- CreateIndex
CREATE UNIQUE INDEX "mime_type_code_key" ON "mime_type"("code");

-- CreateIndex
CREATE UNIQUE INDEX "quick_link_type_code_key" ON "quick_link_type"("code");

-- CreateIndex
CREATE UNIQUE INDEX "company_nzbn_key" ON "company"("nzbn");

-- CreateIndex
CREATE UNIQUE INDEX "member_circle_id_key" ON "member"("circle_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_worker_id_key" ON "member"("worker_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_email_key" ON "member"("email");

-- CreateIndex
CREATE UNIQUE INDEX "member_mobile_key" ON "member"("mobile");

-- CreateIndex
CREATE UNIQUE INDEX "member_role_member_id_role_id_key" ON "member_role"("member_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "concern_ref_key" ON "concern"("ref");

-- CreateIndex
CREATE UNIQUE INDEX "concern_client_id_key" ON "concern"("client_id");

-- CreateIndex
CREATE INDEX "concern_supervisor_id_idx" ON "concern"("supervisor_id");

-- CreateIndex
CREATE INDEX "concern_reported_by_id_idx" ON "concern"("reported_by_id");

-- CreateIndex
CREATE INDEX "concern_status_idx" ON "concern"("status");

-- CreateIndex
CREATE UNIQUE INDEX "concern_risk_concern_id_category_id_key" ON "concern_risk"("concern_id", "category_id");

-- CreateIndex
CREATE INDEX "corrective_action_concern_id_idx" ON "corrective_action"("concern_id");

-- CreateIndex
CREATE INDEX "notification_recipient_id_idx" ON "notification"("recipient_id");

-- CreateIndex
CREATE INDEX "sync_event_member_id_idx" ON "sync_event"("member_id");

-- CreateIndex
CREATE INDEX "audit_log_entity_entity_id_idx" ON "audit_log"("entity", "entity_id");

-- AddForeignKey
ALTER TABLE "mime_type" ADD CONSTRAINT "mime_type_media_type_id_fkey" FOREIGN KEY ("media_type_id") REFERENCES "media_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member" ADD CONSTRAINT "member_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_role" ADD CONSTRAINT "member_role_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_role" ADD CONSTRAINT "member_role_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "system_role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_asset" ADD CONSTRAINT "media_asset_media_type_id_fkey" FOREIGN KEY ("media_type_id") REFERENCES "media_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_asset" ADD CONSTRAINT "media_asset_mime_type_id_fkey" FOREIGN KEY ("mime_type_id") REFERENCES "mime_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_asset" ADD CONSTRAINT "media_asset_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_link" ADD CONSTRAINT "quick_link_quick_link_type_id_fkey" FOREIGN KEY ("quick_link_type_id") REFERENCES "quick_link_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quick_link" ADD CONSTRAINT "quick_link_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "media_asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concern" ADD CONSTRAINT "concern_reported_by_id_fkey" FOREIGN KEY ("reported_by_id") REFERENCES "member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concern" ADD CONSTRAINT "concern_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concern_risk" ADD CONSTRAINT "concern_risk_concern_id_fkey" FOREIGN KEY ("concern_id") REFERENCES "concern"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concern_risk" ADD CONSTRAINT "concern_risk_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "hazard_category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concern_photo" ADD CONSTRAINT "concern_photo_concern_id_fkey" FOREIGN KEY ("concern_id") REFERENCES "concern"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_action" ADD CONSTRAINT "corrective_action_concern_id_fkey" FOREIGN KEY ("concern_id") REFERENCES "concern"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_action" ADD CONSTRAINT "corrective_action_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_action" ADD CONSTRAINT "corrective_action_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "supervisor_prompt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_event" ADD CONSTRAINT "sync_event_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "member"("id") ON DELETE SET NULL ON UPDATE CASCADE;
