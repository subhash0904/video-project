import Redis from 'ioredis';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================
// Configuration
// ============================================

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || '6379';
const REDIS_URL = `redis://${REDIS_HOST}:${REDIS_PORT}`;
const BACKEND_HOST = process.env.BACKEND_HOST || 'http://localhost:4000';
const QUEUE_NAME = 'video:transcode';

// Quality presets
const QUALITIES = [
  { name: '2160p', width: 3840, height: 2160, videoBitrate: '8000k', audioBitrate: '192k' },
  { name: '1080p', width: 1920, height: 1080, videoBitrate: '5000k', audioBitrate: '192k' },
  { name: '720p', width: 1280, height: 720, videoBitrate: '2500k', audioBitrate: '128k' },
  { name: '480p', width: 854, height: 480, videoBitrate: '1000k', audioBitrate: '128k' },
  { name: '360p', width: 640, height: 360, videoBitrate: '800k', audioBitrate: '96k' },
  { name: '144p', width: 256, height: 144, videoBitrate: '300k', audioBitrate: '64k' },
];

// ============================================
// Redis Connection
// ============================================

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('connect', () => {
  console.log('✅ Connected to Redis');
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err);
});

// ============================================
// Utilities
// ============================================

async function ensureDirectoryExists(dir) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

function getVideoInfo(inputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) return reject(err);
      
      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      if (!videoStream) return reject(new Error('No video stream found'));
      
      resolve({
        width: videoStream.width,
        height: videoStream.height,
        duration: parseFloat(metadata.format.duration || 0),
      });
    });
  });
}

// ============================================
// Transcoding Logic
// ============================================

async function transcodeVideo(job) {
  const { videoId, inputPath, outputDir } = job;
  
  console.log(`\n🎬 Starting transcoding for video ${videoId}`);
  console.log(`   Input: ${inputPath}`);
  console.log(`   Output: ${outputDir}`);
  
  // Ensure output directory exists
  await ensureDirectoryExists(outputDir);
  
  // Get video info
  const videoInfo = await getVideoInfo(inputPath);
  console.log(`   Original resolution: ${videoInfo.width}x${videoInfo.height}`);
  console.log(`   Duration: ${videoInfo.duration}s`);
  
  // Filter qualities based on video resolution (don't upscale)
  const applicableQualities = QUALITIES.filter(
    q => q.height <= videoInfo.height
  );
  
  if (applicableQualities.length === 0) {
    // If video is lower than 144p, use original dimensions
    applicableQualities.push({
      name: 'original',
      width: videoInfo.width,
      height: videoInfo.height,
      videoBitrate: '500k',
      audioBitrate: '64k',
    });
  }
  
  console.log(`   Generating ${applicableQualities.length} quality variants...`);
  
  // Transcode each quality
  const variants = [];
  for (const quality of applicableQualities) {
    try {
      await transcodeQuality(inputPath, outputDir, quality, videoInfo);
      variants.push({
        name: quality.name,
        width: quality.width,
        height: quality.height,
        playlistPath: path.join(outputDir, `${quality.name}.m3u8`),
      });
      console.log(`   ✅ ${quality.name} completed`);
    } catch (error) {
      console.error(`   ❌ ${quality.name} failed:`, error.message);
    }
  }
  
  // Generate master playlist
  const masterPlaylistPath = path.join(outputDir, 'master.m3u8');
  await generateMasterPlaylist(masterPlaylistPath, variants);
  console.log(`   ✅ Master playlist generated`);
  
  return {
    masterPlaylistUrl: `/hls/${videoId}/master.m3u8`,
    variants: variants.length,
  };
}

function transcodeQuality(inputPath, outputDir, quality, videoInfo) {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(outputDir, `${quality.name}.m3u8`);
    const segmentPattern = path.join(outputDir, `${quality.name}_%03d.ts`);
    
    // Calculate aspect ratio to maintain
    const aspectRatio = videoInfo.width / videoInfo.height;
    const targetWidth = quality.width;
    const targetHeight = Math.round(targetWidth / aspectRatio);
    
    // Ensure even dimensions (required by some codecs)
    const width = targetWidth % 2 === 0 ? targetWidth : targetWidth - 1;
    const height = targetHeight % 2 === 0 ? targetHeight : targetHeight - 1;
    
    ffmpeg(inputPath)
      .outputOptions([
        '-c:v libx264',           // Video codec
        '-preset medium',          // Encoding preset (speed vs quality)
        '-crf 23',                 // Constant Rate Factor (quality)
        `-b:v ${quality.videoBitrate}`, // Video bitrate
        `-maxrate ${quality.videoBitrate}`,
        `-bufsize ${parseInt(quality.videoBitrate) * 2}k`,
        `-vf scale=${width}:${height}`, // Scale to target resolution
        '-c:a aac',                // Audio codec
        `-b:a ${quality.audioBitrate}`, // Audio bitrate
        '-ar 48000',               // Audio sample rate
        '-ac 2',                   // Audio channels (stereo)
        '-hls_time 4',             // Segment duration (4 seconds)
        '-hls_playlist_type vod',  // VOD playlist type
        '-hls_segment_type mpegts', // MPEG-TS segments
        `-hls_segment_filename ${segmentPattern}`,
        '-hls_flags independent_segments', // Independent segments for seeking
        '-movflags +faststart',    // Web optimization
      ])
      .output(outputPath)
      .on('start', (cmd) => {
        console.log(`      FFmpeg command: ${cmd.substring(0, 100)}...`);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          process.stdout.write(`\r      Progress: ${progress.percent.toFixed(1)}%`);
        }
      })
      .on('end', () => {
        process.stdout.write('\n');
        resolve();
      })
      .on('error', (err) => {
        reject(err);
      })
      .run();
  });
}

async function generateMasterPlaylist(outputPath, variants) {
  let content = '#EXTM3U\n';
  content += '#EXT-X-VERSION:3\n\n';
  
  // Sort variants by bandwidth (highest first)
  variants.sort((a, b) => b.height - a.height);
  
  for (const variant of variants) {
    const bandwidth = variant.height * variant.width * 2; // Estimate
    content += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${variant.width}x${variant.height}\n`;
    content += `${variant.name}.m3u8\n\n`;
  }
  
  await fs.writeFile(outputPath, content, 'utf8');
}

// ============================================
// Job Processing
// ============================================

async function processJob(jobData) {
  try {
    const job = JSON.parse(jobData);
    console.log(`\n📦 Received job: ${job.videoId}`);
    
    const result = await transcodeVideo(job);
    
    // Update video status in database via API
    console.log(`\n🔄 Updating video status...`);
    const updateResponse = await fetch(`${BACKEND_HOST}/api/videos/${job.videoId}/transcode-complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hlsUrl: result.masterPlaylistUrl,
        status: 'READY',
        variants: result.variants,
      }),
    });
    
    if (updateResponse.ok) {
      console.log(`✅ Video ${job.videoId} transcoding completed successfully\n`);
    } else {
      const error = await updateResponse.text();
      console.error(`❌ Failed to update video status: ${error}`);
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Job processing failed:`, error);
    return false;
  }
}

// ============================================
// Worker Loop
// ============================================

async function startWorker() {
  console.log('🚀 Video Transcoding Worker started');
  console.log(`📡 Listening to queue: ${QUEUE_NAME}`);
  console.log(`🔗 Backend: ${BACKEND_HOST}`);
  console.log(`💾 Redis: ${REDIS_URL}\n`);
  
  while (true) {
    try {
      // Block for 5 seconds waiting for jobs
      const result = await redis.blpop(QUEUE_NAME, 5);
      
      if (result) {
        const [_queue, jobData] = result;
        await processJob(jobData);
      }
    } catch (error) {
      console.error('Worker error:', error);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
}

// ============================================
// Graceful Shutdown
// ============================================

process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down worker...');
  await redis.quit();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down worker...');
  await redis.quit();
  process.exit(0);
});

// ============================================
// Start
// ============================================

startWorker().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
