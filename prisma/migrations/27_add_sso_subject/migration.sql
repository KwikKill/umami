-- AlterTable
ALTER TABLE "user" ADD COLUMN "sso_subject" VARCHAR(255);

-- CreateIndex
CREATE UNIQUE INDEX "user_sso_subject_key" ON "user"("sso_subject");
