-- Opaque service API tokens. Only the SHA-256 token hash is persisted.
CREATE TABLE "service_api_tokens" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token_prefix" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "scopes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "actor_user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_api_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "service_api_tokens_token_prefix_key"
    ON "service_api_tokens"("token_prefix");

CREATE UNIQUE INDEX "service_api_tokens_token_hash_key"
    ON "service_api_tokens"("token_hash");

CREATE INDEX "service_api_tokens_actor_user_id_idx"
    ON "service_api_tokens"("actor_user_id");

CREATE INDEX "service_api_tokens_expires_at_idx"
    ON "service_api_tokens"("expires_at");

ALTER TABLE "service_api_tokens"
    ADD CONSTRAINT "service_api_tokens_actor_user_id_fkey"
    FOREIGN KEY ("actor_user_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
