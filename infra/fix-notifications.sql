-- Fix notifications table: add body and read columns expected by Prisma
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS body text DEFAULT '';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read boolean DEFAULT false;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "readAt" timestamp(3) without time zone;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "thumbnailUrl" text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS "actionUrl" text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Sync data from old columns
UPDATE notifications SET body = message WHERE body = '' OR body IS NULL;
UPDATE notifications SET read = "isRead";

-- Add indexes expected by Prisma
CREATE INDEX IF NOT EXISTS "notifications_userId_read_createdAt_idx" ON notifications ("userId", read, "createdAt");
CREATE INDEX IF NOT EXISTS "notifications_userId_createdAt_idx" ON notifications ("userId", "createdAt");
