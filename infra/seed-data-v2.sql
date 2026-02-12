-- Fix video_stats table to match Prisma schema (videoId as PK, correct column names)
-- Then seed data

BEGIN;

-- Drop the old video_stats table and recreate with correct schema
DROP TABLE IF EXISTS video_stats CASCADE;

CREATE TABLE video_stats (
    "videoId" TEXT NOT NULL,
    "viewCount" BIGINT NOT NULL DEFAULT 0,
    "likeCount" BIGINT NOT NULL DEFAULT 0,
    "dislikeCount" BIGINT NOT NULL DEFAULT 0,
    "commentCount" BIGINT NOT NULL DEFAULT 0,
    "shareCount" BIGINT NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "video_stats_pkey" PRIMARY KEY ("videoId"),
    CONSTRAINT "video_stats_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES videos(id) ON UPDATE CASCADE ON DELETE CASCADE
);

-- ============================================
-- USERS
-- ============================================
INSERT INTO users (id, email, username, "passwordHash", "displayName", "emailVerified", "avatarUrl", "createdAt", "updatedAt")
VALUES
  ('u1000000-0000-0000-0000-000000000001', 'alice@example.com', 'alice_creator', '$2a$12$LQv3c1yqBo9SkvXS7QTJp.6ySl0VLX3FoXccnUiV1JqWpFHc3WUOW', 'Alice Tech', true, 'https://ui-avatars.com/api/?name=Alice+Tech&size=200&background=random', NOW(), NOW()),
  ('u2000000-0000-0000-0000-000000000002', 'bob@example.com', 'bob_gamer', '$2a$12$LQv3c1yqBo9SkvXS7QTJp.6ySl0VLX3FoXccnUiV1JqWpFHc3WUOW', 'Bob Gaming', true, 'https://ui-avatars.com/api/?name=Bob+Gaming&size=200&background=random', NOW(), NOW()),
  ('u3000000-0000-0000-0000-000000000003', 'carol@example.com', 'carol_vlogs', '$2a$12$LQv3c1yqBo9SkvXS7QTJp.6ySl0VLX3FoXccnUiV1JqWpFHc3WUOW', 'Carol Vlogs', true, 'https://ui-avatars.com/api/?name=Carol+Vlogs&size=200&background=random', NOW(), NOW()),
  ('u4000000-0000-0000-0000-000000000004', 'david@example.com', 'david_music', '$2a$12$LQv3c1yqBo9SkvXS7QTJp.6ySl0VLX3FoXccnUiV1JqWpFHc3WUOW', 'David Music', true, 'https://ui-avatars.com/api/?name=David+Music&size=200&background=random', NOW(), NOW()),
  ('u5000000-0000-0000-0000-000000000005', 'eve@example.com', 'eve_education', '$2a$12$LQv3c1yqBo9SkvXS7QTJp.6ySl0VLX3FoXccnUiV1JqWpFHc3WUOW', 'Eve Learning', true, 'https://ui-avatars.com/api/?name=Eve+Learning&size=200&background=random', NOW(), NOW()),
  ('u6000000-0000-0000-0000-000000000006', 'testuser@example.com', 'testuser', '$2a$12$LQv3c1yqBo9SkvXS7QTJp.6ySl0VLX3FoXccnUiV1JqWpFHc3WUOW', 'Test User', true, 'https://ui-avatars.com/api/?name=Test+User&size=200&background=random', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- CHANNELS
-- ============================================
INSERT INTO channels (id, "userId", handle, name, description, "subscriberCount", "videoCount", "totalViews", verified, "avatarUrl", "createdAt", "updatedAt")
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'u1000000-0000-0000-0000-000000000001', '@techmastery', 'Tech Mastery', 'Advanced programming tutorials and tech insights', 15200, 12, 982000, true, 'https://ui-avatars.com/api/?name=Tech+Mastery&size=200&background=0D8ABC&color=fff', NOW(), NOW()),
  ('c2000000-0000-0000-0000-000000000002', 'u2000000-0000-0000-0000-000000000002', '@gamingcentral', 'Gaming Central', 'Latest game reviews, walkthroughs, and esports content', 8700, 8, 456000, true, 'https://ui-avatars.com/api/?name=Gaming+Central&size=200&background=E74C3C&color=fff', NOW(), NOW()),
  ('c3000000-0000-0000-0000-000000000003', 'u3000000-0000-0000-0000-000000000003', '@dailyvlogs', 'Daily Vlogs', 'Daily life, travel, and adventure vlogs', 3200, 6, 124000, false, 'https://ui-avatars.com/api/?name=Daily+Vlogs&size=200&background=2ECC71&color=fff', NOW(), NOW()),
  ('c4000000-0000-0000-0000-000000000004', 'u4000000-0000-0000-0000-000000000004', '@musicstudio', 'Music Studio', 'Original music, covers, and production tutorials', 21000, 10, 1540000, true, 'https://ui-avatars.com/api/?name=Music+Studio&size=200&background=9B59B6&color=fff', NOW(), NOW()),
  ('c5000000-0000-0000-0000-000000000005', 'u5000000-0000-0000-0000-000000000005', '@learninghub', 'Learning Hub', 'Educational content for developers of all levels', 42000, 15, 3200000, true, 'https://ui-avatars.com/api/?name=Learning+Hub&size=200&background=F39C12&color=fff', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- VIDEOS
-- ============================================
INSERT INTO videos (id, "channelId", title, description, "thumbnailUrl", duration, type, category, status, "hlsUrl", "uploadedAt", "publishedAt", "processedAt", views, likes, dislikes, "commentCount", "isPublic", "allowComments", "ageRestricted", "viewsCache", "likesCache", "isDeleted", visibility)
VALUES
  ('v1000000-0000-0000-0000-000000000001', 'c1000000-0000-0000-0000-000000000001',
   'Building a Production-Ready Video Platform',
   'Learn how to build a scalable video streaming platform with Node.js, React, and FFmpeg.',
   'https://picsum.photos/seed/v1/640/360', 1245, 'STANDARD', 'EDUCATION', 'READY', NULL,
   NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days',
   245000, 12400, 230, 890, true, true, false, 245000, 12400, false, 'PUBLIC'),

  ('v1000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001',
   'Complete Guide to TypeScript in 2026',
   'Master TypeScript from basics to advanced concepts.',
   'https://picsum.photos/seed/v2/640/360', 2890, 'STANDARD', 'EDUCATION', 'READY', NULL,
   NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days', NOW() - INTERVAL '25 days',
   189000, 9800, 150, 670, true, true, false, 189000, 9800, false, 'PUBLIC'),

  ('v1000000-0000-0000-0000-000000000003', 'c1000000-0000-0000-0000-000000000001',
   'Docker & Kubernetes Deployment Tutorial',
   'Deploy your applications with Docker and Kubernetes.',
   'https://picsum.photos/seed/v3/640/360', 1580, 'STANDARD', 'SCIENCE_TECH', 'READY', NULL,
   NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days', NOW() - INTERVAL '20 days',
   156000, 7200, 120, 430, true, true, false, 156000, 7200, false, 'PUBLIC'),

  ('v1000000-0000-0000-0000-000000000004', 'c1000000-0000-0000-0000-000000000001',
   'React Hooks in 60 Seconds',
   'Quick overview of useState and useEffect hooks',
   'https://picsum.photos/seed/v4/640/360', 58, 'SHORT', 'EDUCATION', 'READY', NULL,
   NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days',
   520000, 28000, 340, 1200, true, true, false, 520000, 28000, false, 'PUBLIC'),

  ('v2000000-0000-0000-0000-000000000005', 'c2000000-0000-0000-0000-000000000002',
   'Top 10 Games of 2026 - Must Play!',
   'Our picks for the best games released this year.',
   'https://picsum.photos/seed/v5/640/360', 1820, 'STANDARD', 'GAMING', 'READY', NULL,
   NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days', NOW() - INTERVAL '18 days',
   312000, 15600, 890, 2100, true, true, false, 312000, 15600, false, 'PUBLIC'),

  ('v2000000-0000-0000-0000-000000000006', 'c2000000-0000-0000-0000-000000000002',
   'Elden Ring DLC - Full Walkthrough',
   'Complete walkthrough of the latest Elden Ring DLC.',
   'https://picsum.photos/seed/v6/640/360', 5400, 'STANDARD', 'GAMING', 'READY', NULL,
   NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days', NOW() - INTERVAL '12 days',
   198000, 11200, 340, 1560, true, true, false, 198000, 11200, false, 'PUBLIC'),

  ('v2000000-0000-0000-0000-000000000007', 'c2000000-0000-0000-0000-000000000002',
   'Insane Clutch Play! #shorts',
   'Watch this incredible last-second clutch play',
   'https://picsum.photos/seed/v7/640/360', 45, 'SHORT', 'GAMING', 'READY', NULL,
   NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days',
   890000, 67000, 1200, 4500, true, true, false, 890000, 67000, false, 'PUBLIC'),

  ('v3000000-0000-0000-0000-000000000008', 'c3000000-0000-0000-0000-000000000003',
   'Tokyo Street Food Tour 2026',
   'Exploring the best street food in Tokyo!',
   'https://picsum.photos/seed/v8/640/360', 960, 'STANDARD', 'TRAVEL_EVENTS', 'READY', NULL,
   NOW() - INTERVAL '22 days', NOW() - INTERVAL '22 days', NOW() - INTERVAL '22 days',
   89000, 5600, 90, 320, true, true, false, 89000, 5600, false, 'PUBLIC'),

  ('v3000000-0000-0000-0000-000000000009', 'c3000000-0000-0000-0000-000000000003',
   'A Day in My Life as a Content Creator',
   'Follow me through a typical day as a content creator.',
   'https://picsum.photos/seed/v9/640/360', 720, 'STANDARD', 'PEOPLE_BLOGS', 'READY', NULL,
   NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days',
   45000, 3200, 45, 210, true, true, false, 45000, 3200, false, 'PUBLIC'),

  ('v4000000-0000-0000-0000-000000000010', 'c4000000-0000-0000-0000-000000000004',
   'Lofi Hip Hop Mix - Study & Chill',
   'Relaxing lofi beats perfect for studying or working. 2 hours of music.',
   'https://picsum.photos/seed/v10/640/360', 7200, 'STANDARD', 'MUSIC', 'READY', NULL,
   NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days', NOW() - INTERVAL '45 days',
   1240000, 89000, 1200, 5600, true, true, false, 1240000, 89000, false, 'PUBLIC'),

  ('v4000000-0000-0000-0000-000000000011', 'c4000000-0000-0000-0000-000000000004',
   'How to Produce Music with FL Studio',
   'Beginner-friendly music production tutorial.',
   'https://picsum.photos/seed/v11/640/360', 1800, 'STANDARD', 'MUSIC', 'READY', NULL,
   NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days', NOW() - INTERVAL '14 days',
   67000, 4500, 78, 290, true, true, false, 67000, 4500, false, 'PUBLIC'),

  ('v4000000-0000-0000-0000-000000000012', 'c4000000-0000-0000-0000-000000000004',
   'Guitar Riff Challenge #shorts',
   'Can you play this riff? Drop a comment!',
   'https://picsum.photos/seed/v12/640/360', 30, 'SHORT', 'MUSIC', 'READY', NULL,
   NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days',
   340000, 23000, 450, 8900, true, true, false, 340000, 23000, false, 'PUBLIC'),

  ('v5000000-0000-0000-0000-000000000013', 'c5000000-0000-0000-0000-000000000005',
   'Machine Learning Crash Course',
   'Learn ML fundamentals in under 2 hours.',
   'https://picsum.photos/seed/v13/640/360', 6300, 'STANDARD', 'EDUCATION', 'READY', NULL,
   NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days', NOW() - INTERVAL '35 days',
   567000, 34000, 560, 2100, true, true, false, 567000, 34000, false, 'PUBLIC'),

  ('v5000000-0000-0000-0000-000000000014', 'c5000000-0000-0000-0000-000000000005',
   'System Design Interview Prep',
   'Everything you need for system design interviews.',
   'https://picsum.photos/seed/v14/640/360', 4500, 'STANDARD', 'EDUCATION', 'READY', NULL,
   NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days',
   234000, 18000, 230, 1450, true, true, false, 234000, 18000, false, 'PUBLIC'),

  ('v5000000-0000-0000-0000-000000000015', 'c5000000-0000-0000-0000-000000000005',
   'CSS Grid vs Flexbox - When to Use What',
   'The definitive guide to choosing between CSS Grid and Flexbox.',
   'https://picsum.photos/seed/v15/640/360', 1200, 'STANDARD', 'EDUCATION', 'READY', NULL,
   NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days',
   123000, 8900, 120, 560, true, true, false, 123000, 8900, false, 'PUBLIC'),

  ('v5000000-0000-0000-0000-000000000016', 'c5000000-0000-0000-0000-000000000005',
   'Python One-Liner Tricks #shorts',
   '5 amazing Python one-liners that will blow your mind!',
   'https://picsum.photos/seed/v16/640/360', 55, 'SHORT', 'EDUCATION', 'READY', NULL,
   NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days',
   780000, 56000, 890, 3400, true, true, false, 780000, 56000, false, 'PUBLIC'),

  ('v1000000-0000-0000-0000-000000000017', 'c1000000-0000-0000-0000-000000000001',
   'Next.js 15 - Whats New and Migration Guide',
   'Explore the exciting new features in Next.js 15.',
   'https://picsum.photos/seed/v17/640/360', 1650, 'STANDARD', 'SCIENCE_TECH', 'READY', NULL,
   NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days',
   98000, 6700, 90, 420, true, true, false, 98000, 6700, false, 'PUBLIC'),

  ('v2000000-0000-0000-0000-000000000018', 'c2000000-0000-0000-0000-000000000002',
   'Building a Gaming PC in 2026 - Budget Guide',
   'Build the ultimate gaming PC without breaking the bank.',
   'https://picsum.photos/seed/v18/640/360', 2100, 'STANDARD', 'GAMING', 'READY', NULL,
   NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days',
   175000, 12300, 180, 890, true, true, false, 175000, 12300, false, 'PUBLIC'),

  ('v3000000-0000-0000-0000-000000000019', 'c3000000-0000-0000-0000-000000000003',
   'Bali Travel Guide - Hidden Gems',
   'Discover the secret spots in Bali that most tourists miss.',
   'https://picsum.photos/seed/v19/640/360', 1380, 'STANDARD', 'TRAVEL_EVENTS', 'READY', NULL,
   NOW() - INTERVAL '16 days', NOW() - INTERVAL '16 days', NOW() - INTERVAL '16 days',
   67000, 4100, 65, 280, true, true, false, 67000, 4100, false, 'PUBLIC'),

  ('v5000000-0000-0000-0000-000000000020', 'c5000000-0000-0000-0000-000000000005',
   'Rust vs Go - Which Should You Learn in 2026?',
   'An honest comparison of Rust and Go for backend development.',
   'https://picsum.photos/seed/v20/640/360', 1920, 'STANDARD', 'SCIENCE_TECH', 'READY', NULL,
   NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day',
   45000, 3200, 340, 890, true, true, false, 45000, 3200, false, 'PUBLIC')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- VIDEO STATS (matching Prisma schema: videoId as PK)
-- ============================================
INSERT INTO video_stats ("videoId", "viewCount", "likeCount", "dislikeCount", "commentCount", "shareCount", "updatedAt")
VALUES
  ('v1000000-0000-0000-0000-000000000001', 245000, 12400, 230, 890, 1200, NOW()),
  ('v1000000-0000-0000-0000-000000000002', 189000, 9800, 150, 670, 890, NOW()),
  ('v1000000-0000-0000-0000-000000000003', 156000, 7200, 120, 430, 560, NOW()),
  ('v1000000-0000-0000-0000-000000000004', 520000, 28000, 340, 1200, 3400, NOW()),
  ('v2000000-0000-0000-0000-000000000005', 312000, 15600, 890, 2100, 1800, NOW()),
  ('v2000000-0000-0000-0000-000000000006', 198000, 11200, 340, 1560, 980, NOW()),
  ('v2000000-0000-0000-0000-000000000007', 890000, 67000, 1200, 4500, 12000, NOW()),
  ('v3000000-0000-0000-0000-000000000008', 89000, 5600, 90, 320, 340, NOW()),
  ('v3000000-0000-0000-0000-000000000009', 45000, 3200, 45, 210, 120, NOW()),
  ('v4000000-0000-0000-0000-000000000010', 1240000, 89000, 1200, 5600, 23000, NOW()),
  ('v4000000-0000-0000-0000-000000000011', 67000, 4500, 78, 290, 230, NOW()),
  ('v4000000-0000-0000-0000-000000000012', 340000, 23000, 450, 8900, 5600, NOW()),
  ('v5000000-0000-0000-0000-000000000013', 567000, 34000, 560, 2100, 4500, NOW()),
  ('v5000000-0000-0000-0000-000000000014', 234000, 18000, 230, 1450, 2300, NOW()),
  ('v5000000-0000-0000-0000-000000000015', 123000, 8900, 120, 560, 890, NOW()),
  ('v5000000-0000-0000-0000-000000000016', 780000, 56000, 890, 3400, 8900, NOW()),
  ('v1000000-0000-0000-0000-000000000017', 98000, 6700, 90, 420, 450, NOW()),
  ('v2000000-0000-0000-0000-000000000018', 175000, 12300, 180, 890, 1200, NOW()),
  ('v3000000-0000-0000-0000-000000000019', 67000, 4100, 65, 280, 230, NOW()),
  ('v5000000-0000-0000-0000-000000000020', 45000, 3200, 340, 890, 340, NOW())
ON CONFLICT ("videoId") DO NOTHING;

-- ============================================
-- SUBSCRIPTIONS
-- ============================================
INSERT INTO subscriptions (id, "userId", "channelId", "subscribedAt")
VALUES
  ('s1000000-0000-0000-0000-000000000001', 'u6000000-0000-0000-0000-000000000006', 'c1000000-0000-0000-0000-000000000001', NOW()),
  ('s1000000-0000-0000-0000-000000000002', 'u6000000-0000-0000-0000-000000000006', 'c5000000-0000-0000-0000-000000000005', NOW()),
  ('s1000000-0000-0000-0000-000000000003', 'u1000000-0000-0000-0000-000000000001', 'c5000000-0000-0000-0000-000000000005', NOW()),
  ('s1000000-0000-0000-0000-000000000004', 'u2000000-0000-0000-0000-000000000002', 'c1000000-0000-0000-0000-000000000001', NOW()),
  ('s1000000-0000-0000-0000-000000000005', 'u3000000-0000-0000-0000-000000000003', 'c4000000-0000-0000-0000-000000000004', NOW()),
  ('s1000000-0000-0000-0000-000000000006', 'u4000000-0000-0000-0000-000000000004', 'c2000000-0000-0000-0000-000000000002', NOW()),
  ('s1000000-0000-0000-0000-000000000007', 'u5000000-0000-0000-0000-000000000005', 'c1000000-0000-0000-0000-000000000001', NOW())
ON CONFLICT (id) DO NOTHING;

COMMIT;
