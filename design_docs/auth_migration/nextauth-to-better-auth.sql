-- Migration from NextAuth to Better Auth
-- This migration transforms the existing NextAuth schema to Better Auth schema
-- Run this in a transaction for safety

BEGIN;

-- ============================================================================
-- BACKUP EXISTING DATA (Optional but recommended)
-- ============================================================================
-- CREATE TABLE _backup_users AS SELECT * FROM "User";
-- CREATE TABLE _backup_accounts AS SELECT * FROM "Account";
-- CREATE TABLE _backup_sessions AS SELECT * FROM "Session";
-- CREATE TABLE _backup_verification_tokens AS SELECT * FROM "VerificationToken";

-- ============================================================================
-- 1. USER TABLE UPDATES
-- ============================================================================

-- Add username and displayUsername fields (Better Auth username plugin)
ALTER TABLE "User" 
  ADD COLUMN IF NOT EXISTS "username" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "displayUsername" VARCHAR(255);

-- Migrate existing usernames if they exist (already populated in current schema)
-- UPDATE "User" SET "username" = LOWER("username") WHERE "username" IS NOT NULL;
-- UPDATE "User" SET "displayUsername" = "username" WHERE "displayUsername" IS NULL AND "username" IS NOT NULL;

-- Make username unique (already exists in current schema)
-- CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");

-- emailVerified: Keep as DateTime for now (Better Auth expects boolean, but we'll handle in code)
-- Note: Better Auth uses boolean, but Prisma will handle the conversion

-- name, email: Already correct (required in Better Auth, optional in current schema)
-- createdAt, updatedAt: Already exist

-- ============================================================================
-- 2. SESSION TABLE UPDATES
-- ============================================================================

-- Rename sessionToken to token
ALTER TABLE "Session" 
  RENAME COLUMN "sessionToken" TO "token";

-- Rename expires to expiresAt  
ALTER TABLE "Session"
  RENAME COLUMN "expires" TO "expiresAt";

-- Add ipAddress and userAgent fields
ALTER TABLE "Session"
  ADD COLUMN IF NOT EXISTS "ipAddress" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "userAgent" TEXT;

-- Add createdAt and updatedAt (not in NextAuth)
ALTER TABLE "Session"
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Update unique constraint
DROP INDEX IF EXISTS "Session_sessionToken_key";
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- ============================================================================
-- 3. ACCOUNT TABLE UPDATES
-- ============================================================================

-- Rename snake_case fields to camelCase
ALTER TABLE "Account"
  RENAME COLUMN "refresh_token" TO "refreshToken";

ALTER TABLE "Account"
  RENAME COLUMN "access_token" TO "accessToken";

ALTER TABLE "Account"
  RENAME COLUMN "expires_at" TO "expiresAt";

ALTER TABLE "Account"
  RENAME COLUMN "token_type" TO "tokenType";

ALTER TABLE "Account"
  RENAME COLUMN "id_token" TO "idToken";

ALTER TABLE "Account"
  RENAME COLUMN "session_state" TO "sessionState";

-- Add Better Auth specific fields
ALTER TABLE "Account"
  ADD COLUMN IF NOT EXISTS "accountId" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "providerId" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "accessTokenExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "refreshTokenExpiresAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "password" TEXT;

-- Migrate provider to providerId
UPDATE "Account" 
  SET "providerId" = "provider" 
  WHERE "providerId" IS NULL;

-- Migrate providerAccountId to accountId
UPDATE "Account"
  SET "accountId" = "providerAccountId"
  WHERE "accountId" IS NULL;

-- Add timestamps
ALTER TABLE "Account"
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Remove deprecated fields (optional - can keep for safety)
-- ALTER TABLE "Account" DROP COLUMN IF EXISTS "tokenType";
-- ALTER TABLE "Account" DROP COLUMN IF EXISTS "sessionState";
-- We'll keep them for now in case they're needed

-- ============================================================================
-- 4. VERIFICATION TABLE UPDATES
-- ============================================================================

-- Rename VerificationToken to Verification
ALTER TABLE "VerificationToken" RENAME TO "Verification";

-- Add id column (Better Auth uses single id PK instead of composite)
ALTER TABLE "Verification"
  ADD COLUMN IF NOT EXISTS "id" VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text;

-- Rename token to value
ALTER TABLE "Verification"
  RENAME COLUMN "token" TO "value";

-- Rename expires to expiresAt
ALTER TABLE "Verification"
  RENAME COLUMN "expires" TO "expiresAt";

-- Add timestamps
ALTER TABLE "Verification"
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Update constraints (Better Auth uses id as PK, not composite)
DROP INDEX IF EXISTS "VerificationToken_token_key";
DROP INDEX IF EXISTS "VerificationToken_identifier_token_key";

CREATE UNIQUE INDEX IF NOT EXISTS "Verification_value_key" ON "Verification"("value");

-- ============================================================================
-- 5. SITE SETTINGS - Add API Import Feature Flag
-- ============================================================================

-- Add ENABLE_IMPORT_API setting (disabled by default)
INSERT INTO "SiteSetting" ("key", "value", "encrypted", "createdAt", "updatedAt")
VALUES ('ENABLE_IMPORT_API', 'false', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES (Run after migration to verify)
-- ============================================================================

-- Verify User table
-- SELECT id, username, displayUsername, email, "emailVerified", "createdAt", "updatedAt" FROM "User" LIMIT 5;

-- Verify Session table
-- SELECT id, token, "userId", "expiresAt", "ipAddress", "userAgent", "createdAt", "updatedAt" FROM "Session" LIMIT 5;

-- Verify Account table
-- SELECT id, "userId", "providerId", "accountId", "accessToken", "refreshToken", "password", "createdAt", "updatedAt" FROM "Account" LIMIT 5;

-- Verify Verification table
-- SELECT id, identifier, value, "expiresAt", "createdAt", "updatedAt" FROM "Verification" LIMIT 5;

-- Verify feature flag
-- SELECT * FROM "SiteSetting" WHERE key = 'ENABLE_IMPORT_API';

COMMIT;

-- ============================================================================
-- ROLLBACK SCRIPT (If needed)
-- ============================================================================
-- BEGIN;
-- 
-- -- Restore from backups
-- DROP TABLE IF EXISTS "User";
-- DROP TABLE IF EXISTS "Account";
-- DROP TABLE IF EXISTS "Session";
-- DROP TABLE IF EXISTS "Verification";
-- 
-- ALTER TABLE _backup_users RENAME TO "User";
-- ALTER TABLE _backup_accounts RENAME TO "Account";
-- ALTER TABLE _backup_sessions RENAME TO "Session";
-- ALTER TABLE _backup_verification_tokens RENAME TO "VerificationToken";
-- 
-- -- Remove feature flag
-- DELETE FROM "SiteSetting" WHERE key = 'ENABLE_IMPORT_API';
-- 
-- COMMIT;
