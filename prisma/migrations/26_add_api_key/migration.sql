-- CreateTable
CREATE TABLE "api_key" (
    "api_key_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "key_hash" VARCHAR(128) NOT NULL,
    "key_prefix" VARCHAR(20) NOT NULL,
    "permissions" JSONB NOT NULL,
    "last_used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_key_pkey" PRIMARY KEY ("api_key_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "api_key_api_key_id_key" ON "api_key"("api_key_id");

-- CreateIndex
CREATE UNIQUE INDEX "api_key_key_hash_key" ON "api_key"("key_hash");

-- CreateIndex
CREATE INDEX "api_key_user_id_idx" ON "api_key"("user_id");
