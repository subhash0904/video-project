SELECT id, title, status, duration, "hlsUrl" FROM videos WHERE status != 'READY' OR "hlsUrl" IS NOT NULL;
SELECT id, title, status FROM videos WHERE title LIKE '%VID%' OR title LIKE '%WA%';
SELECT column_name FROM information_schema.columns WHERE table_name = 'videos' AND column_name LIKE '%creat%';
