-- CreateTable
CREATE TABLE "website_annotation" (
    "annotation_id" UUID NOT NULL,
    "website_id" UUID NOT NULL,
    "date" TIMESTAMPTZ(6) NOT NULL,
    "text" VARCHAR(500) NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "website_annotation_pkey" PRIMARY KEY ("annotation_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "website_annotation_annotation_id_key" ON "website_annotation"("annotation_id");

-- CreateIndex
CREATE INDEX "website_annotation_website_id_idx" ON "website_annotation"("website_id");

-- CreateIndex
CREATE INDEX "website_annotation_website_id_date_idx" ON "website_annotation"("website_id", "date");
