UPDATE videos 
SET status = 'READY', 
    "hlsUrl" = '/hls/v1000000-0000-0000-0000-000000000001/master.m3u8',
    duration = 10
WHERE id = 'v1000000-0000-0000-0000-000000000001';
