/*
  Warnings:

  - You are about to drop the column `file_id` on the `apps` table. All the data in the column will be lost.
  - You are about to drop the column `file_path` on the `apps` table. All the data in the column will be lost.
  - You are about to drop the column `img_path` on the `apps` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "apps" DROP CONSTRAINT "apps_file_id_fkey";

-- AlterTable
ALTER TABLE "apps" DROP COLUMN "file_id",
DROP COLUMN "file_path",
DROP COLUMN "img_path",
ADD COLUMN     "cover_img" TEXT;

-- CreateTable
CREATE TABLE "app_screenshots" (
    "id" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "app_screenshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_videos" (
    "id" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "app_videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_downloads" (
    "id" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "size" BIGINT NOT NULL,
    "version" TEXT,

    CONSTRAINT "app_downloads_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "app_screenshots" ADD CONSTRAINT "app_screenshots_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_videos" ADD CONSTRAINT "app_videos_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_downloads" ADD CONSTRAINT "app_downloads_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
