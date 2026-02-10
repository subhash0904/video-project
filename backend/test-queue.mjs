import Redis from 'ioredis';

const redis = new Redis({
  host: 'localhost',
  port: 6379,
});

// Test queueing a video
const testJob = {
  videoId: 'test-video-123',
  inputPath: '/app/uploads/raw/test-video.mp4',
  outputDir: '/app/uploads/processed/test-video-123',
  timestamp: new Date().toISOString(),
};

console.log('🧪 Testing Redis Queue...');
console.log('📦 Job:', testJob);

redis.rpush('video:transcode', JSON.stringify(testJob))
  .then(() => {
    console.log('✅ Job queued successfully!');
    return redis.llen('video:transcode');
  })
  .then((length) => {
    console.log(`📊 Queue length: ${length}`);
    return redis.lrange('video:transcode', 0, -1);
  })
  .then((jobs) => {
    console.log(`📋 Jobs in queue:`);
    jobs.forEach((job, i) => {
      console.log(`  ${i + 1}. ${JSON.parse(job).videoId}`);
    });
    // Clean up test job
    return redis.lpop('video:transcode');
  })
  .then((removed) => {
    console.log(`🧹 Cleaned up test job: ${JSON.parse(removed).videoId}`);
    redis.quit();
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error:', err);
    redis.quit();
    process.exit(1);
  });
