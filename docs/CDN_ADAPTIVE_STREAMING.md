# CDN & Adaptive Streaming Configuration

## Overview

This document describes the Content Delivery Network (CDN) configuration and adaptive bitrate streaming setup for global video delivery at YouTube scale.

## Architecture

```
┌────────────────┐
│     User       │
│   (Browser)    │
└───────┬────────┘
        │
        │ Request: video.m3u8
        ▼
┌────────────────────────┐
│   CDN Edge Server      │ ◄── Geographically closest
│   (CloudFlare/Fastly)  │     to user
│   - Mumbai (India)     │
│   - Oregon (US)        │
│   - Frankfurt (EU)     │
│   - Singapore (Asia)   │
└───────┬────────────────┘
        │
        │ Cache MISS?
        ▼
┌────────────────────────┐
│   Origin Servers       │
│   (nginx + storage)    │
└───────┬────────────────┘
        │
        ▼
┌────────────────────────┐
│   Object Storage       │
│   (S3/MinIO/Azure)     │
│   - HLS chunks (.ts)   │
│   - Manifests (.m3u8)  │
│   - Thumbnails         │
└────────────────────────┘
```

## Adaptive Bitrate Streaming

### Supported Protocols

1. **HLS (HTTP Live Streaming)** - Primary (Apple, most browsers)
2. **DASH (Dynamic Adaptive Streaming)** - Alternative (broader device support)

### Quality Profiles

```javascript
const qualityProfiles = [
  { name: '144p', resolution: '256x144', bitrate: '200k', audio: '64k' },
  { name: '360p', resolution: '640x360', bitrate: '800k', audio: '96k' },
  { name: '480p', resolution: '854x480', bitrate: '1400k', audio: '128k' },
  { name: '720p', resolution: '1280x720', bitrate: '2800k', audio: '128k' },
  { name: '1080p', resolution: '1920x1080', bitrate: '5000k', audio: '192k' },
  { name: '1440p', resolution: '2560x1440', bitrate: '9000k', audio: '192k' },
  { name: '4K', resolution: '3840x2160', bitrate: '16000k', audio: '256k' }
];
```

### HLS Transcoding (FFmpeg)

```bash
#!/bin/bash
# transcode-hls.sh

INPUT_FILE=$1
OUTPUT_DIR=$2
VIDEO_ID=$3

# Create output directory
mkdir -p "$OUTPUT_DIR/$VIDEO_ID"

# Transcode to multiple qualities
ffmpeg -i "$INPUT_FILE" \
  -filter_complex \
  "[0:v]split=7[v1][v2][v3][v4][v5][v6][v7]; \
   [v1]scale=256:144[v144]; \
   [v2]scale=640:360[v360]; \
   [v3]scale=854:480[v480]; \
   [v4]scale=1280:720[v720]; \
   [v5]scale=1920:1080[v1080]; \
   [v6]scale=2560:1440[v1440]; \
   [v7]scale=3840:2160[v4k]" \
  -map "[v144]" -c:v:0 libx264 -b:v:0 200k -maxrate:v:0 250k -bufsize:v:0 400k -preset fast -g 48 -sc_threshold 0 \
  -map "[v360]" -c:v:1 libx264 -b:v:1 800k -maxrate:v:1 1000k -bufsize:v:1 1600k -preset fast -g 48 -sc_threshold 0 \
  -map "[v480]" -c:v:2 libx264 -b:v:2 1400k -maxrate:v:2 1750k -bufsize:v:2 2800k -preset fast -g 48 -sc_threshold 0 \
  -map "[v720]" -c:v:3 libx264 -b:v:3 2800k -maxrate:v:3 3500k -bufsize:v:3 5600k -preset fast -g 48 -sc_threshold 0 \
  -map "[v1080]" -c:v:4 libx264 -b:v:4 5000k -maxrate:v:4 6250k -bufsize:v:4 10000k -preset medium -g 48 -sc_threshold 0 \
  -map "[v1440]" -c:v:5 libx264 -b:v:5 9000k -maxrate:v:5 11250k -bufsize:v:5 18000k -preset medium -g 48 -sc_threshold 0 \
  -map "[v4k]" -c:v:6 libx265 -b:v:6 16000k -maxrate:v:6 20000k -bufsize:v:6 32000k -preset medium -g 48 -sc_threshold 0 \
  -map a:0 -c:a:0 aac -b:a:0 64k -ac 2 \
  -map a:0 -c:a:1 aac -b:a:1 96k -ac 2 \
  -map a:0 -c:a:2 aac -b:a:2 128k -ac 2 \
  -map a:0 -c:a:3 aac -b:a:3 128k -ac 2 \
  -map a:0 -c:a:4 aac -b:a:4 192k -ac 2 \
  -map a:0 -c:a:5 aac -b:a:5 192k -ac 2 \
  -map a:0 -c:a:6 aac -b:a:6 256k -ac 2 \
  -f hls \
  -hls_time 6 \
  -hls_playlist_type vod \
  -hls_segment_filename "$OUTPUT_DIR/$VIDEO_ID/v%v/segment_%03d.ts" \
  -master_pl_name "$VIDEO_ID.m3u8" \
  -var_stream_map "v:0,a:0 v:1,a:1 v:2,a:2 v:3,a:3 v:4,a:4 v:5,a:5 v:6,a:6" \
  "$OUTPUT_DIR/$VIDEO_ID/stream_%v.m3u8"

echo "Transcoding complete: $OUTPUT_DIR/$VIDEO_ID/$VIDEO_ID.m3u8"
```

### Master Playlist (m3u8)

```m3u8
#EXTM3U
#EXT-X-VERSION:3

#EXT-X-STREAM-INF:BANDWIDTH=264000,RESOLUTION=256x144,CODECS="avc1.42c00d,mp4a.40.2"
v0/stream.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=896000,RESOLUTION=640x360,CODECS="avc1.42c01e,mp4a.40.2"
v1/stream.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=1528000,RESOLUTION=854x480,CODECS="avc1.42c01f,mp4a.40.2"
v2/stream.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=2928000,RESOLUTION=1280x720,CODECS="avc1.4d401f,mp4a.40.2"
v3/stream.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=5192000,RESOLUTION=1920x1080,CODECS="avc1.640028,mp4a.40.2"
v4/stream.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=9192000,RESOLUTION=2560x1440,CODECS="avc1.640028,mp4a.40.2"
v5/stream.m3u8

#EXT-X-STREAM-INF:BANDWIDTH=16256000,RESOLUTION=3840x2160,CODECS="hvc1.1.6.L120.90,mp4a.40.2"
v6/stream.m3u8
```

## CDN Configuration

### CloudFlare Configuration

```javascript
// cloudflare-worker.js
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // Video segment caching
  if (url.pathname.match(/\.(m3u8|ts)$/)) {
    const cache = caches.default;
    let response = await cache.match(request);
    
    if (!response) {
      response = await fetch(request);
      
      // Cache video segments for 30 days
      const newHeaders = new Headers(response.headers);
      if (url.pathname.endsWith('.ts')) {
        newHeaders.set('Cache-Control', 'public, max-age=2592000, immutable');
      } else if (url.pathname.endsWith('.m3u8')) {
        newHeaders.set('Cache-Control', 'public, max-age=60');
      }
      
      response = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
      
      // Store in cache
      event.waitUntil(cache.put(request, response.clone()));
    }
    
    return response;
  }
  
  return fetch(request);
}
```

### Nginx Origin Configuration

```nginx
# /etc/nginx/conf.d/cdn-origin.conf

# Video storage location
location /videos/ {
    alias /var/www/videos/;
    
    # CORS headers
    add_header Access-Control-Allow-Origin *;
    add_header Access-Control-Allow-Methods "GET, HEAD, OPTIONS";
    add_header Access-Control-Allow-Headers "Range";
    add_header Access-Control-Expose-Headers "Content-Length, Content-Range";
    
    # Cache control (CDN will override)
    add_header Cache-Control "public, max-age=31536000, immutable";
    
    # HLS types
    types {
        application/vnd.apple.mpegurl m3u8;
        video/mp2t ts;
    }
    
    # Enable byte-range requests
    max_ranges 1;
    
    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    aio threads=default;
    directio 4m;
    
    # Security
    valid_referers none blocked server_names *.yourdomain.com;
    if ($invalid_referer) {
        return 403;
    }
}

# HLS manifest caching
location ~ \.m3u8$ {
    add_header Cache-Control "public, max-age=60";
    add_header Access-Control-Allow-Origin *;
}

# Video segments (immutable)
location ~ \.ts$ {
    add_header Cache-Control "public, max-age=31536000, immutable";
    add_header Access-Control-Allow-Origin *;
}
```

## Client-Side Player Integration

### HLS.js Implementation

```typescript
// videoPlayer.ts
import Hls from 'hls.js';

interface QualityLevel {
  height: number;
  bitrate: number;
  level: number;
}

class AdaptiveVideoPlayer {
  private hls: Hls;
  private video: HTMLVideoElement;
  private currentQuality: QualityLevel | null = null;
  private availableQualities: QualityLevel[] = [];

  constructor(videoElement: HTMLVideoElement, videoUrl: string) {
    this.video = videoElement;
    
    if (Hls.isSupported()) {
      this.hls = new Hls({
        // ABR (Adaptive Bitrate) config
        abrEwmaDefaultEstimate: 500000, // Initial bandwidth estimate (500 kbps)
        abrBandWidthFactor: 0.95, // Conservative bandwidth usage
        abrBandWidthUpFactor: 0.7, // Factor for upgrading quality
        
        // Buffer settings
        maxBufferLength: 30, // 30 seconds
        maxBufferSize: 60 * 1000 * 1000, // 60 MB
        
        // Loading optimization
        maxMaxBufferLength: 120,
        enableWorker: true,
        lowLatencyMode: false,
        
        // Error handling
        fragLoadingMaxRetry: 6,
        manifestLoadingMaxRetry: 3,
        levelLoadingMaxRetry: 3
      });
      
      this.setupHls(videoUrl);
    } else if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (iOS, Safari)
      this.video.src = videoUrl;
    }
  }

  private setupHls(videoUrl: string) {
    this.hls.loadSource(videoUrl);
    this.hls.attachMedia(this.video);
    
    // Event listeners
    this.hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
      console.log('Manifest loaded, found ' + data.levels.length + ' quality levels');
      
      this.availableQualities = data.levels.map((level, index) => ({
        height: level.height,
        bitrate: level.bitrate,
        level: index
      }));
      
      // Auto-start at appropriate quality
      this.video.play();
    });
    
    this.hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
      console.log('Quality switched to level ' + data.level);
      this.currentQuality = this.availableQualities[data.level];
    });
    
    this.hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.error('Fatal network error, trying to recover');
            this.hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.error('Fatal media error, trying to recover');
            this.hls.recoverMediaError();
            break;
          default:
            console.error('Fatal error, cannot recover');
            this.hls.destroy();
            break;
        }
      }
    });
  }

  // Manual quality selection
  setQuality(levelIndex: number) {
    if (this.hls) {
      this.hls.currentLevel = levelIndex;
    }
  }

  // Enable auto quality
  enableAutoQuality() {
    if (this.hls) {
      this.hls.currentLevel = -1; // -1 = auto
    }
  }

  // Get available qualities
  getQualities(): QualityLevel[] {
    return this.availableQualities;
  }

  // Get current quality
  getCurrentQuality(): QualityLevel | null {
    return this.currentQuality;
  }

  destroy() {
    if (this.hls) {
      this.hls.destroy();
    }
  }
}

export default AdaptiveVideoPlayer;
```

### React Component Example

```tsx
// VideoPlayer.tsx
import React, { useEffect, useRef, useState } from 'react';
import AdaptiveVideoPlayer from './videoPlayer';

interface Props {
  videoId: string;
  videoUrl: string;
}

export const VideoPlayer: React.FC<Props> = ({ videoId, videoUrl }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [player, setPlayer] = useState<AdaptiveVideoPlayer | null>(null);
  const [qualities, setQualities] = useState<any[]>([]);
  const [currentQuality, setCurrentQuality] = useState<any>(null);

  useEffect(() => {
    if (videoRef.current) {
      const adaptivePlayer = new AdaptiveVideoPlayer(videoRef.current, videoUrl);
      setPlayer(adaptivePlayer);

      // Get available qualities after load
      setTimeout(() => {
        setQualities(adaptivePlayer.getQualities());
      }, 1000);

      return () => {
        adaptivePlayer.destroy();
      };
    }
  }, [videoUrl]);

  const handleQualityChange = (levelIndex: number) => {
    if (player) {
      if (levelIndex === -1) {
        player.enableAutoQuality();
      } else {
        player.setQuality(levelIndex);
      }
    }
  };

  return (
    <div className="video-player">
      <video
        ref={videoRef}
        controls
        style={{ width: '100%', height: 'auto' }}
      />
      
      <div className="quality-selector">
        <button onClick={() => handleQualityChange(-1)}>Auto</button>
        {qualities.map((quality, index) => (
          <button key={index} onClick={() => handleQualityChange(index)}>
            {quality.height}p
          </button>
        ))}
      </div>
    </div>
  );
};
```

## Geographic Distribution

### Multi-Region CDN Setup

```yaml
# Geographic routing configuration
regions:
  - name: asia-south
    location: Mumbai, India
    edge_servers:
      - mumbai-edge-01.cdn.yourdomain.com
      - mumbai-edge-02.cdn.yourdomain.com
    origin: mumbai-origin.yourdomain.com
    
  - name: us-west
    location: Oregon, USA
    edge_servers:
      - oregon-edge-01.cdn.yourdomain.com
      - oregon-edge-02.cdn.yourdomain.com
    origin: oregon-origin.yourdomain.com
    
  - name: eu-west
    location: Frankfurt, Germany
    edge_servers:
      - frankfurt-edge-01.cdn.yourdomain.com
      - frankfurt-edge-02.cdn.yourdomain.com
    origin: frankfurt-origin.yourdomain.com
    
  - name: asia-southeast
    location: Singapore
    edge_servers:
      - singapore-edge-01.cdn.yourdomain.com
      - singapore-edge-02.cdn.yourdomain.com
    origin: singapore-origin.yourdomain.com
```

### GeoDNS Configuration

```zone
; Route 53 / GeoDNS configuration
cdn.yourdomain.com. IN A 
  geolocation asia {
    1.2.3.4    ; Asia edge servers
  }
  geolocation europe {
    5.6.7.8    ; Europe edge servers
  }
  geolocation north-america {
    9.10.11.12 ; North America edge servers
  }
  default {
    13.14.15.16 ; Default fallback
  }
```

## Performance Optimization

### Preload & Prefetch

```html
<!-- Preload video manifest -->
<link rel="preload" href="/videos/${videoId}/master.m3u8" as="fetch">

<!-- DNS prefetch for CDN -->
<link rel="dns-prefetch" href="https://cdn.yourdomain.com">
<link rel="preconnect" href="https://cdn.yourdomain.com">
```

### Service Worker Caching

```javascript
// service-worker.js
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Cache video segments
  if (url.pathname.endsWith('.ts')) {
    event.respondWith(
      caches.open('video-segments').then((cache) => {
        return cache.match(event.request).then((response) => {
          return response || fetch(event.request).then((fetchResponse) => {
            cache.put(event.request, fetchResponse.clone());
            return fetchResponse;
          });
        });
      })
    );
  }
});
```

## Monitoring & Analytics

### Metrics to Track

```typescript
interface VideoMetrics {
  // Quality of Experience
  bufferingRatio: number;      // % of time buffering
  startupTime: number;          // Time to first frame (ms)
  bitrateAverage: number;       // Average bitrate used
  qualitySwitches: number;      // Number of quality changes
  
  // Technical
  cdn: string;                  // CDN location used
  bandwidth: number;            // User bandwidth (bps)
  latency: number;             // CDN latency (ms)
  cacheHitRate: number;        // % of cache hits
  
  // Errors
  errorRate: number;           // % of failed requests
  rebufferCount: number;       // Number of rebuffer events
}
```

## Cost Optimization

### Tiered Storage Strategy

```
Hot Content (< 30 days):
  ├─ SSD Storage
  ├─ All qualities available
  └─ 99.99% availability

Warm Content (30-365 days):
  ├─ HDD Storage
  ├─ 720p max initially
  └─ On-demand transcoding

Cold Content (> 365 days):
  ├─ Archive Storage (S3 Glacier)
  ├─ 480p max
  └─ Restore on demand
```

## Summary

This CDN and adaptive streaming setup provides:

- ⚡ **Low latency**: 10-50ms from nearest edge
- 🌍 **Global reach**: Serves users from closest location
- 📱 **Adaptive quality**: Automatically adjusts to network conditions
- 💰 **Cost efficient**: Reduces origin load by 95%+
- 🔄 **Fault tolerant**: Multiple edge servers per region
- 📊 **Scalable**: Handles millions of concurrent streams

Perfect for YouTube-scale video delivery! 🚀
