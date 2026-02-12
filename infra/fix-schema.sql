ba-- Fix column name mismatches between Prisma schema and database

-- Check current schema for remaining columns
-- The schema expects: viewsCache (bigint), likesCache (int), isDeleted (bool), deletedAt (timestamp), visibility

-- Add viewsCache column (missing entirely)
ALTER TABLE videos ADD COLUMN IF NOT EXISTS "viewsCache" BIGINT DEFAULT 0;
UPDATE videos SET "viewsCache" = views;

-- Rename lowercase columns to camelCase to match Prisma schema
-- likescache -> likesCache
ALTER TABLE videos RENAME COLUMN "likescache" TO "likesCache";

-- isdeleted -> isDeleted
ALTER TABLE videos RENAME COLUMN "isdeleted" TO "isDeleted";

-- deletedat -> deletedAt
ALTER TABLE videos RENAME COLUMN "deletedat" TO "deletedAt";

-- Add visibility column if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'videos' AND column_name = 'visibility') THEN
        CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'UNLISTED', 'PRIVATE');
        ALTER TABLE videos ADD COLUMN "visibility" "Visibility" DEFAULT 'PUBLIC';
    END IF;
END $$;

-- Add googleId to users if missing (for OAuth)
ALTER TABLE users ADD COLUMN IF NOT EXISTS "googleId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "users_googleId_key" ON users ("googleId");

-- Add passwordHash nullable support (for OAuth users)
ALTER TABLE users ALTER COLUMN "passwordHash" DROP NOT NULL;

-- Add twoFactorEnabled if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS "twoFactorEnabled" BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "twoFactorSecret" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "backupCodes" TEXT;

-- Add shares table if missing
CREATE TABLE IF NOT EXISTS "shares" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "platform" TEXT,
    "sharedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shares_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "shares_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT "shares_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES videos(id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- Add video_stats table if missing
CREATE TABLE IF NOT EXISTS "video_stats" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "views" BIGINT NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "dislikes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "avgWatchTime" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgCompletionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "video_stats_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "video_stats_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES videos(id) ON UPDATE CASCADE ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "video_stats_videoId_key" ON video_stats ("videoId");

-- Add video_category_links table if missing
CREATE TABLE IF NOT EXISTS "video_category_links" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "category" "VideoCategory" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "video_category_links_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "video_category_links_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES videos(id) ON UPDATE CASCADE ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "video_category_links_videoId_category_key" ON video_category_links ("videoId", "category");
