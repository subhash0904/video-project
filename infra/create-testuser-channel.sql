INSERT INTO channels (id, "userId", handle, name, description, "avatarUrl", "subscriberCount", "videoCount", "totalViews", verified, "createdAt", "updatedAt", "isDeleted")
VALUES (
  'c6000000-0000-0000-0000-000000000006',
  'u6000000-0000-0000-0000-000000000006',
  '@testuser',
  'Test User Channel',
  'My personal channel for testing uploads',
  'https://ui-avatars.com/api/?name=Test+User&size=200&background=E74C3C&color=fff',
  0, 0, 0, false,
  NOW(), NOW(), false
)
ON CONFLICT (id) DO NOTHING;
