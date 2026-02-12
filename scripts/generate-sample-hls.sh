#!/bin/bash
# ============================================
# Generate Sample HLS Files for Seeded Videos
# ============================================
# This script creates sample HLS streams for all videos in the database
# so that seeded/test videos can play in the video player.
#
# Prerequisites:
#   - FFmpeg installed (comes with the transcoder container)
#   - Database must be seeded first (npx prisma db seed)
#
# Usage:
#   ./scripts/generate-sample-hls.sh [output_dir]
#
# Default output: uploads/processed/
# In Docker:      /app/streaming/hls/

set -e

OUTPUT_DIR="${1:-uploads/processed}"
SAMPLE_DURATION=30  # seconds of sample video

echo "🎬 Sample HLS Generator"
echo "========================"
echo "Output directory: $OUTPUT_DIR"

# Create a sample test video using FFmpeg's test sources
generate_sample_video() {
    local VIDEO_ID="$1"
    local VIDEO_DIR="$OUTPUT_DIR/$VIDEO_ID"
    local DURATION="${2:-$SAMPLE_DURATION}"

    echo ""
    echo "📹 Generating HLS for video: $VIDEO_ID"

    # Create output directory
    mkdir -p "$VIDEO_DIR"

    # Skip if master.m3u8 already exists
    if [ -f "$VIDEO_DIR/master.m3u8" ]; then
        echo "   ⏭  Already exists, skipping"
        return 0
    fi

    # Generate a test video with color bars and sine wave audio
    # Using lavfi input for a synthetic but visually interesting test video
    ffmpeg -y -hide_banner -loglevel warning \
        -f lavfi -i "testsrc2=duration=$DURATION:size=1280x720:rate=30" \
        -f lavfi -i "sine=frequency=440:duration=$DURATION" \
        -c:v libx264 -preset ultrafast -crf 28 \
        -c:a aac -b:a 128k \
        -pix_fmt yuv420p \
        "/tmp/sample_${VIDEO_ID}.mp4"

    echo "   ✅ Source video generated"

    # Generate 720p HLS variant
    ffmpeg -y -hide_banner -loglevel warning \
        -i "/tmp/sample_${VIDEO_ID}.mp4" \
        -c:v libx264 -preset ultrafast -crf 28 \
        -b:v 2500k -maxrate 2500k -bufsize 5000k \
        -vf "scale=1280:720" \
        -c:a aac -b:a 128k -ar 48000 -ac 2 \
        -hls_time 4 -hls_playlist_type vod \
        -hls_segment_type mpegts \
        -hls_segment_filename "$VIDEO_DIR/720p_%03d.ts" \
        -hls_flags independent_segments \
        "$VIDEO_DIR/720p.m3u8"
    echo "   ✅ 720p variant done"

    # Generate 480p HLS variant
    ffmpeg -y -hide_banner -loglevel warning \
        -i "/tmp/sample_${VIDEO_ID}.mp4" \
        -c:v libx264 -preset ultrafast -crf 30 \
        -b:v 1000k -maxrate 1000k -bufsize 2000k \
        -vf "scale=854:480" \
        -c:a aac -b:a 128k -ar 48000 -ac 2 \
        -hls_time 4 -hls_playlist_type vod \
        -hls_segment_type mpegts \
        -hls_segment_filename "$VIDEO_DIR/480p_%03d.ts" \
        -hls_flags independent_segments \
        "$VIDEO_DIR/480p.m3u8"
    echo "   ✅ 480p variant done"

    # Generate 360p HLS variant
    ffmpeg -y -hide_banner -loglevel warning \
        -i "/tmp/sample_${VIDEO_ID}.mp4" \
        -c:v libx264 -preset ultrafast -crf 32 \
        -b:v 800k -maxrate 800k -bufsize 1600k \
        -vf "scale=640:360" \
        -c:a aac -b:a 96k -ar 48000 -ac 2 \
        -hls_time 4 -hls_playlist_type vod \
        -hls_segment_type mpegts \
        -hls_segment_filename "$VIDEO_DIR/360p_%03d.ts" \
        -hls_flags independent_segments \
        "$VIDEO_DIR/360p.m3u8"
    echo "   ✅ 360p variant done"

    # Generate master playlist
    cat > "$VIDEO_DIR/master.m3u8" << EOF
#EXTM3U
#EXT-X-VERSION:3

#EXT-X-STREAM-INF:BANDWIDTH=2628000,RESOLUTION=1280x720
720p.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=1128000,RESOLUTION=854x480
480p.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=896000,RESOLUTION=640x360
360p.m3u8
EOF
    echo "   ✅ Master playlist generated"

    # Cleanup temp file
    rm -f "/tmp/sample_${VIDEO_ID}.mp4"

    echo "   🎉 Done!"
}

# ============================================
# Main: Get video IDs from database or use args
# ============================================

if [ -n "$2" ]; then
    # Video IDs passed as arguments
    shift  # Remove output_dir
    for VIDEO_ID in "$@"; do
        generate_sample_video "$VIDEO_ID"
    done
else
    echo ""
    echo "ℹ️  No video IDs specified. Generating a demo video..."
    echo "   To generate for specific videos, pass their IDs:"
    echo "   ./scripts/generate-sample-hls.sh <output_dir> <video_id_1> <video_id_2> ..."
    echo ""
    echo "   Or run inside Docker to auto-detect from DB:"
    echo "   docker exec video-platform-backend node -e \\"
    echo "     \"const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.video.findMany({select:{id:true}}).then(v=>v.forEach(x=>console.log(x.id)))\""
    echo ""

    # Generate a single demo video
    generate_sample_video "demo-video"
fi

echo ""
echo "✅ All sample HLS files generated in: $OUTPUT_DIR"
echo ""
echo "Tip: If running in Docker, make sure the output directory"
echo "     is mounted as a volume shared with the frontend container."
