-- Fix ALL missing columns across all tables to match Prisma schema

-- Comments table: add isDeleted, deletedAt, edited
ALTER TABLE comments ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
ALTER TABLE comments ADD COLUMN IF NOT EXISTS "edited" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS "parentId" TEXT;

-- Add self-referencing FK for comment replies if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='comments_parentId_fkey') THEN
    ALTER TABLE comments ADD CONSTRAINT "comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES comments(id) ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Create comment_likes table if it doesn't exist
CREATE TABLE IF NOT EXISTS comment_likes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "commentId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "comment_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "comment_likes_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES comments(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "comment_likes_userId_commentId_key" UNIQUE ("userId", "commentId")
);
CREATE INDEX IF NOT EXISTS "comment_likes_commentId_idx" ON comment_likes("commentId");

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'INFO',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "resourceId" TEXT,
  "resourceType" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "notifications_userId_idx" ON notifications("userId");

-- Create categories table if it doesn't exist
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  "iconUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create video_categories junction table if needed
CREATE TABLE IF NOT EXISTS video_categories (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "videoId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  CONSTRAINT "video_categories_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES videos(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "video_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES categories(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "video_categories_videoId_categoryId_key" UNIQUE ("videoId", "categoryId")
);

-- Create notification_preferences table if it doesn't exist
CREATE TABLE IF NOT EXISTS notification_preferences (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "channelId" TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'ALL',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "notification_preferences_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES channels(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "notification_preferences_userId_channelId_key" UNIQUE ("userId", "channelId")
);

-- Add missing indexes on comments
CREATE INDEX IF NOT EXISTS "comments_videoId_createdAt_idx" ON comments("videoId", "createdAt");
CREATE INDEX IF NOT EXISTS "comments_userId_idx" ON comments("userId");
CREATE INDEX IF NOT EXISTS "comments_parentId_idx" ON comments("parentId");

-- Watch history: ensure all required columns exist
ALTER TABLE watch_history ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE watch_history ADD COLUMN IF NOT EXISTS "watchDuration" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE watch_history ADD COLUMN IF NOT EXISTS "completed" BOOLEAN NOT NULL DEFAULT false;

-- Analytics events: ensure columns match
ALTER TABLE analytics_events ADD COLUMN IF NOT EXISTS metadata JSONB;
