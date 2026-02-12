/**
 * Generate Sample HLS Files for All Seeded Videos
 * 
 * This script queries the database for all video IDs and generates
 * sample HLS streams (test pattern + audio) so videos can play in the player.
 * 
 * Usage:
 *   node scripts/generate-sample-hls.mjs
 * 
 * In Docker:
 *   docker exec video-platform-backend node scripts/generate-sample-hls.mjs
 * 
 * Prerequisites:
 *   - FFmpeg installed
 *   - Database seeded
 */

import { execSync, exec } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const HLS_OUTPUT_DIR = process.env.HLS_OUTPUT_DIR || path.resolve(__dirname, '../uploads/processed');
const SAMPLE_DURATION = 15; // seconds

console.log('🎬 Sample HLS Generator (Node.js)');
console.log('===================================');
console.log(`Output: ${HLS_OUTPUT_DIR}`);

// Check FFmpeg availability
try {
  execSync('ffmpeg -version', { stdio: 'pipe' });
  console.log('✅ FFmpeg found');
} catch {
  console.error('❌ FFmpeg not found! Install FFmpeg first.');
  console.log('   On Ubuntu: sudo apt install ffmpeg');
  console.log('   On macOS:  brew install ffmpeg');
  console.log('   On Windows: choco install ffmpeg  OR  winget install ffmpeg');
  process.exit(1);
}

/**
 * Generate HLS files for a single video ID
 */
function generateHLS(videoId, duration = SAMPLE_DURATION) {
  const videoDir = path.join(HLS_OUTPUT_DIR, videoId);
  
  // Skip if already exists
  if (existsSync(path.join(videoDir, 'master.m3u8'))) {
    console.log(`   ⏭  ${videoId} — already exists`);
    return;
  }

  mkdirSync(videoDir, { recursive: true });

  const tmpFile = path.join(videoDir, '_temp.mp4');

  console.log(`   📹 ${videoId} — generating...`);

  try {
    // Step 1: Generate test source video
    execSync(
      `ffmpeg -y -hide_banner -loglevel warning ` +
      `-f lavfi -i "testsrc2=duration=${duration}:size=1280x720:rate=24" ` +
      `-f lavfi -i "sine=frequency=440:duration=${duration}" ` +
      `-c:v libx264 -preset ultrafast -crf 30 ` +
      `-c:a aac -b:a 96k ` +
      `-pix_fmt yuv420p ` +
      `"${tmpFile}"`,
      { stdio: 'pipe' }
    );

    // Step 2: Generate 720p variant
    execSync(
      `ffmpeg -y -hide_banner -loglevel warning ` +
      `-i "${tmpFile}" ` +
      `-c:v libx264 -preset ultrafast -crf 28 ` +
      `-b:v 2500k -maxrate 2500k -bufsize 5000k ` +
      `-vf "scale=1280:720" ` +
      `-c:a aac -b:a 128k -ar 48000 -ac 2 ` +
      `-hls_time 4 -hls_playlist_type vod ` +
      `-hls_segment_type mpegts ` +
      `-hls_segment_filename "${path.join(videoDir, '720p_%03d.ts')}" ` +
      `-hls_flags independent_segments ` +
      `"${path.join(videoDir, '720p.m3u8')}"`,
      { stdio: 'pipe' }
    );

    // Step 3: Generate 360p variant
    execSync(
      `ffmpeg -y -hide_banner -loglevel warning ` +
      `-i "${tmpFile}" ` +
      `-c:v libx264 -preset ultrafast -crf 32 ` +
      `-b:v 800k -maxrate 800k -bufsize 1600k ` +
      `-vf "scale=640:360" ` +
      `-c:a aac -b:a 96k -ar 48000 -ac 2 ` +
      `-hls_time 4 -hls_playlist_type vod ` +
      `-hls_segment_type mpegts ` +
      `-hls_segment_filename "${path.join(videoDir, '360p_%03d.ts')}" ` +
      `-hls_flags independent_segments ` +
      `"${path.join(videoDir, '360p.m3u8')}"`,
      { stdio: 'pipe' }
    );

    // Step 4: Write master playlist
    const masterPlaylist = `#EXTM3U
#EXT-X-VERSION:3

#EXT-X-STREAM-INF:BANDWIDTH=2628000,RESOLUTION=1280x720
720p.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=896000,RESOLUTION=640x360
360p.m3u8
`;
    writeFileSync(path.join(videoDir, 'master.m3u8'), masterPlaylist, 'utf8');

    // Cleanup temp
    try { execSync(`rm -f "${tmpFile}"`, { stdio: 'pipe' }); } catch {
      // Windows fallback
      try { execSync(`del /f "${tmpFile}"`, { stdio: 'pipe' }); } catch { /* ignore */ }
    }

    console.log(`   ✅ ${videoId} — done (720p + 360p)`);
  } catch (err) {
    console.error(`   ❌ ${videoId} — failed:`, err.message);
  }
}

// ============================================
// Main
// ============================================

async function main() {
  let videoIds = [];

  // Try to get video IDs from the database
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    const videos = await prisma.video.findMany({
      where: { status: 'READY' },
      select: { id: true },
    });
    
    videoIds = videos.map(v => v.id);
    await prisma.$disconnect();
    
    console.log(`\n📋 Found ${videoIds.length} videos in database\n`);
  } catch (err) {
    console.log('\n⚠️  Could not connect to database. Generating demo video only.');
    console.log(`   Error: ${err.message}\n`);
    videoIds = ['demo-video'];
  }

  if (videoIds.length === 0) {
    console.log('No videos found. Run: npx prisma db seed');
    process.exit(0);
  }

  for (const id of videoIds) {
    generateHLS(id);
  }

  console.log(`\n✅ Done! Generated HLS files in: ${HLS_OUTPUT_DIR}`);
}

main().catch(console.error);
