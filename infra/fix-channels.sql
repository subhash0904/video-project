-- Fix missing columns on channels table
ALTER TABLE channels ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE channels ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Check subscriptions table for any missing columns
-- Prisma schema expects: id, userId, channelId, subscribedAt
-- Let's verify by adding any that might be missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subscriptions' AND column_name='subscribedAt') THEN
    ALTER TABLE subscriptions ADD COLUMN "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;
