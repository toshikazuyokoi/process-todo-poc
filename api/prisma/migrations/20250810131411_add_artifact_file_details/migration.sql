/*
  Warnings:

  - Added the required column `file_name` to the `artifacts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `file_size` to the `artifacts` table without a default value. This is not possible if the table is not empty.
  - Added the required column `mime_type` to the `artifacts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."artifacts" ADD COLUMN     "file_name" TEXT NOT NULL,
ADD COLUMN     "file_size" INTEGER NOT NULL,
ADD COLUMN     "mime_type" TEXT NOT NULL,
ADD COLUMN     "uploaded_at" TIMESTAMP(3),
ADD COLUMN     "uploaded_by" INTEGER;

-- AddForeignKey
ALTER TABLE "public"."artifacts" ADD CONSTRAINT "artifacts_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
