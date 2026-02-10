#!/bin/bash

# FFmpeg HLS Transcoding Script
# Converts uploaded videos to multiple quality variants with HLS

set -e

# Usage: ./transcode.sh <input_video> <output_dir> <video_id>

INPUT_VIDEO=$1
OUTPUT_DIR=$2
VIDEO_ID=$3

if [ -z "$INPUT_VIDEO" ] || [ -z "$OUTPUT_DIR" ] || [ -z "$VIDEO_ID" ]; then
    echo "Usage: $0 <input_video> <output_dir> <video_id>"
    exit 1
fi

# Create output directory
mkdir -p "$OUTPUT_DIR/$VIDEO_ID"

echo "🎬 Starting transcoding for video: $VIDEO_ID"
echo "📁 Input: $INPUT_VIDEO"
echo "📂 Output: $OUTPUT_DIR/$VIDEO_ID"

# Generate thumbnails
echo "📸 Generating thumbnails..."
ffmpeg -i "$INPUT_VIDEO" \
    -vf "select='eq(n\,0)',scale=640:360" \
    -frames:v 1 \
    "$OUTPUT_DIR/$VIDEO_ID/thumbnail.jpg" \
    -y

# Get video duration
DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$INPUT_VIDEO")
echo "⏱️  Video duration: ${DURATION}s"

# Transcode to multiple qualities
echo "🔄 Transcoding to multiple qualities..."

# 2160p (4K) - if source is high enough resolution
ffmpeg -i "$INPUT_VIDEO" \
    -vf "scale=3840:2160:force_original_aspect_ratio=decrease,pad=3840:2160:(ow-iw)/2:(oh-ih)/2" \
    -c:v libx264 -preset medium -crf 23 -maxrate 20M -bufsize 40M \
    -c:a aac -b:a 192k -ac 2 \
    -hls_time 6 -hls_playlist_type vod \
    -hls_segment_filename "$OUTPUT_DIR/$VIDEO_ID/2160p_%03d.ts" \
    "$OUTPUT_DIR/$VIDEO_ID/2160p.m3u8" \
    2>/dev/null || echo "⚠️  2160p encoding skipped (source resolution too low)"

# 1080p (Full HD)
echo "📹 Encoding 1080p..."
ffmpeg -i "$INPUT_VIDEO" \
    -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" \
    -c:v libx264 -preset medium -crf 23 -maxrate 5M -bufsize 10M \
    -c:a aac -b:a 128k -ac 2 \
    -hls_time 6 -hls_playlist_type vod \
    -hls_segment_filename "$OUTPUT_DIR/$VIDEO_ID/1080p_%03d.ts" \
    "$OUTPUT_DIR/$VIDEO_ID/1080p.m3u8" \
    -y

# 720p (HD)
echo "📹 Encoding 720p..."
ffmpeg -i "$INPUT_VIDEO" \
    -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2" \
    -c:v libx264 -preset medium -crf 23 -maxrate 3M -bufsize 6M \
    -c:a aac -b:a 128k -ac 2 \
    -hls_time 6 -hls_playlist_type vod \
    -hls_segment_filename "$OUTPUT_DIR/$VIDEO_ID/720p_%03d.ts" \
    "$OUTPUT_DIR/$VIDEO_ID/720p.m3u8" \
    -y

# 360p (SD)
echo "📹 Encoding 360p..."
ffmpeg -i "$INPUT_VIDEO" \
    -vf "scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2" \
    -c:v libx264 -preset medium -crf 23 -maxrate 1M -bufsize 2M \
    -c:a aac -b:a 96k -ac 2 \
    -hls_time 6 -hls_playlist_type vod \
    -hls_segment_filename "$OUTPUT_DIR/$VIDEO_ID/360p_%03d.ts" \
    "$OUTPUT_DIR/$VIDEO_ID/360p.m3u8" \
    -y

# 144p (Low quality)
echo "📹 Encoding 144p..."
ffmpeg -i "$INPUT_VIDEO" \
    -vf "scale=256:144:force_original_aspect_ratio=decrease,pad=256:144:(ow-iw)/2:(oh-ih)/2" \
    -c:v libx264 -preset medium -crf 23 -maxrate 500k -bufsize 1M \
    -c:a aac -b:a 64k -ac 2 \
    -hls_time 6 -hls_playlist_type vod \
    -hls_segment_filename "$OUTPUT_DIR/$VIDEO_ID/144p_%03d.ts" \
    "$OUTPUT_DIR/$VIDEO_ID/144p.m3u8" \
    -y

# Create master playlist
echo "📝 Creating master playlist..."
cat > "$OUTPUT_DIR/$VIDEO_ID/master.m3u8" << EOF
#EXTM3U
#EXT-X-VERSION:3

#EXT-X-STREAM-INF:BANDWIDTH=500000,RESOLUTION=256x144,NAME="144p"
144p.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=1000000,RESOLUTION=640x360,NAME="360p"
360p.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=3000000,RESOLUTION=1280x720,NAME="720p"
720p.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=5000000,RESOLUTION=1920x1080,NAME="1080p"
1080p.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=20000000,RESOLUTION=3840x2160,NAME="2160p"
2160p.m3u8
EOF

echo "✅ Transcoding complete!"
echo "📊 Generated files:"
ls -lh "$OUTPUT_DIR/$VIDEO_ID/"

exit 0
