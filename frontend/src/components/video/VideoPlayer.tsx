import { useEffect, useRef, useState, useCallback } from 'react';
import type Hls from 'hls.js';
import { getStreamBaseUrl } from '../../utils/urlHelpers';

interface VideoPlayerProps {
  videoId: string;
  title?: string;
  autoplay?: boolean;
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
}

export function VideoPlayer({ videoId, autoplay = false, onTimeUpdate, onEnded }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [quality, setQuality] = useState<string>('auto');
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const [buffered, setBuffered] = useState(0);
  const [brightness, setBrightness] = useState(1);
  const [zoomScale, setZoomScale] = useState(1);
  const [gestureOverlay, setGestureOverlay] = useState<null | { label: string; value?: number }>(null);
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapRef = useRef(0);
  const singleTapTimeoutRef = useRef<number | null>(null);
  const gestureOverlayTimeoutRef = useRef<number | null>(null);
  const touchActiveRef = useRef(false);
  const touchStateRef = useRef({
    startX: 0,
    startY: 0,
    mode: '' as '' | 'seek' | 'volume' | 'brightness' | 'pinch',
    startVolume: 1,
    startBrightness: 1,
    startTime: 0,
    startDistance: 0,
    startZoom: 1,
  });

  // HLS setup
  useEffect(() => {
    let isActive = true;
    const video = videoRef.current;
    if (!video) return;

    const streamBase = getStreamBaseUrl();
    const videoUrl = `${streamBase}/hls/${videoId}/master.m3u8`;

    const setupHls = async () => {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        video.src = videoUrl;
        if (autoplay) {
          video.play().catch(() => {
            // Autoplay blocked
          });
        }
        return;
      }

      const { default: HlsLib } = await import('hls.js');
      if (!isActive || !videoRef.current) return;

      if (HlsLib.isSupported()) {
        const hls = new HlsLib({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
        });

        hls.loadSource(videoUrl);
        hls.attachMedia(video);

        hls.on(HlsLib.Events.MANIFEST_PARSED, () => {
          const levels = hls.levels.map((level) => `${level.height}p`);
          setAvailableQualities(['auto', ...levels]);

          if (autoplay) {
            video.play().catch(() => {
              // Autoplay blocked
            });
          }
        });

        hls.on(HlsLib.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case HlsLib.ErrorTypes.NETWORK_ERROR:
                console.error('Network error', data);
                hls.startLoad();
                break;
              case HlsLib.ErrorTypes.MEDIA_ERROR:
                console.error('Media error', data);
                hls.recoverMediaError();
                break;
              default:
                console.error('Fatal error', data);
                hls.destroy();
                break;
            }
          }
        });

        hlsRef.current = hls as Hls;
      }
    };

    setupHls();

    return () => {
      isActive = false;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [videoId, autoplay]);

  // Define functions before using them in useEffect
  const togglePlayPause = useCallback(() => {
    if (!videoRef.current) return;
    
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    videoRef.current.muted = newMuted;
  }, [isMuted]);

  const toggleFullscreen = useCallback(() => {
    if (!videoRef.current) return;
    
    const container = videoRef.current.parentElement;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!videoRef.current) return;
      
      const video = videoRef.current;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + 5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(0, volume - 0.1));
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 't':
          e.preventDefault();
          setIsTheaterMode(!isTheaterMode);
          break;
        case '0':
        case 'Home':
          e.preventDefault();
          video.currentTime = 0;
          break;
        case 'End':
          e.preventDefault();
          video.currentTime = video.duration;
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [volume, isTheaterMode, togglePlayPause, toggleMute, toggleFullscreen]);

  // Video event handlers
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
    onTimeUpdate?.(time);

    // Update buffered amount
    const bufferedEnd = videoRef.current.buffered.length > 0 
      ? videoRef.current.buffered.end(videoRef.current.buffered.length - 1)
      : 0;
    setBuffered((bufferedEnd / videoRef.current.duration) * 100);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    const time = parseFloat(e.target.value);
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      setIsMuted(vol === 0);
    }
  };

  const changePlaybackRate = (rate: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const changeQuality = (qualityLevel: string) => {
    if (!hlsRef.current) return;
    
    setQuality(qualityLevel);
    
    if (qualityLevel === 'auto') {
      hlsRef.current.currentLevel = -1; // Auto quality
    } else {
      const levelIndex = availableQualities.indexOf(qualityLevel) - 1;
      if (levelIndex >= 0) {
        hlsRef.current.currentLevel = levelIndex;
      }
    }
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00';
    
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  const showGestureOverlay = (label: string, value?: number) => {
    setGestureOverlay({ label, value });
    if (gestureOverlayTimeoutRef.current) {
      window.clearTimeout(gestureOverlayTimeoutRef.current);
    }
    gestureOverlayTimeoutRef.current = window.setTimeout(() => {
      setGestureOverlay(null);
      gestureOverlayTimeoutRef.current = null;
    }, 800);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLVideoElement>) => {
    if (!videoRef.current) return;
    touchActiveRef.current = true;
    const touch = e.touches[0];
    if (!touch) return;

    const state = touchStateRef.current;
    state.startX = touch.clientX;
    state.startY = touch.clientY;
    state.startVolume = volume;
    state.startBrightness = brightness;
    state.startTime = videoRef.current.currentTime;
    state.mode = '';

    if (e.touches.length === 2) {
      const [t1, t2] = Array.from(e.touches);
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      state.startDistance = Math.hypot(dx, dy);
      state.startZoom = zoomScale;
      state.mode = 'pinch';
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLVideoElement>) => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const state = touchStateRef.current;

    if (e.touches.length === 2 || state.mode === 'pinch') {
      const [t1, t2] = Array.from(e.touches);
      if (!t1 || !t2) return;
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      const distance = Math.hypot(dx, dy);
      const delta = distance - state.startDistance;
      const nextZoom = Math.min(1.6, Math.max(1, state.startZoom + delta / 300));
      setZoomScale(nextZoom);
      showGestureOverlay(`Zoom ${Math.round(nextZoom * 100)}%`);
      e.preventDefault();
      return;
    }

    const touch = e.touches[0];
    if (!touch) return;
    const dx = touch.clientX - state.startX;
    const dy = touch.clientY - state.startY;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (!state.mode) {
      if (absX > 10 || absY > 10) {
        if (absX > absY) {
          state.mode = 'seek';
        } else {
          const rect = video.getBoundingClientRect();
          state.mode = (state.startX - rect.left) > rect.width * 0.5 ? 'volume' : 'brightness';
        }
      }
    }

    if (state.mode === 'seek') {
      const rect = video.getBoundingClientRect();
      const durationSafe = duration || video.duration || 0;
      const windowSeconds = Math.min(120, durationSafe || 120);
      const deltaSeconds = (dx / rect.width) * windowSeconds;
      const nextTime = Math.min(durationSafe || 0, Math.max(0, state.startTime + deltaSeconds));
      video.currentTime = nextTime;
      setCurrentTime(nextTime);
      showGestureOverlay(`Seek ${deltaSeconds >= 0 ? '+' : ''}${Math.round(deltaSeconds)}s`);
      e.preventDefault();
      return;
    }

    if (state.mode === 'volume') {
      const rect = video.getBoundingClientRect();
      const delta = -dy / rect.height;
      const nextVolume = Math.min(1, Math.max(0, state.startVolume + delta));
      setVolume(nextVolume);
      video.volume = nextVolume;
      setIsMuted(nextVolume === 0);
      showGestureOverlay(`Volume ${Math.round(nextVolume * 100)}%`, nextVolume);
      e.preventDefault();
      return;
    }

    if (state.mode === 'brightness') {
      const rect = video.getBoundingClientRect();
      const delta = -dy / rect.height;
      const nextBrightness = Math.min(1.5, Math.max(0.5, state.startBrightness + delta));
      setBrightness(nextBrightness);
      showGestureOverlay(`Brightness ${Math.round(nextBrightness * 100)}%`, nextBrightness / 1.5);
      e.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    touchStateRef.current.mode = '';
    window.setTimeout(() => {
      touchActiveRef.current = false;
    }, 0);
  };

  const seekBy = (delta: number) => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const nextTime = Math.min(video.duration, Math.max(0, video.currentTime + delta));
    video.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  const handleVideoTap = (e: React.PointerEvent<HTMLVideoElement>) => {
    const now = Date.now();
    const isDoubleTap = now - lastTapRef.current < 300;
    lastTapRef.current = now;
    setShowControls(true);

    if (isDoubleTap) {
      if (singleTapTimeoutRef.current) {
        window.clearTimeout(singleTapTimeoutRef.current);
        singleTapTimeoutRef.current = null;
      }

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const zone = x / rect.width;

      if (zone < 0.33) {
        seekBy(-10);
      } else if (zone > 0.66) {
        seekBy(10);
      } else {
        togglePlayPause();
      }
      return;
    }

    if (singleTapTimeoutRef.current) {
      window.clearTimeout(singleTapTimeoutRef.current);
    }

    singleTapTimeoutRef.current = window.setTimeout(() => {
      togglePlayPause();
      singleTapTimeoutRef.current = null;
    }, 200);
  };

  return (
    <div 
      className={`relative bg-black ${isTheaterMode ? 'w-full max-w-none' : 'w-full max-w-5xl mx-auto'} aspect-video group`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full"
        style={{
          filter: `brightness(${brightness})`,
          transform: `scale(${zoomScale})`,
          transformOrigin: 'center center',
          objectFit: zoomScale > 1 ? 'cover' : 'contain',
          touchAction: 'none',
        }}
        onPointerUp={(e) => {
          if (!touchActiveRef.current) {
            handleVideoTap(e);
          }
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          onEnded?.();
        }}
      />

      {/* Loading Spinner */}
      {!duration && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Play/Pause Overlay */}
      {!isPlaying && duration > 0 && (
        <button
          onClick={togglePlayPause}
          className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
        >
          <div className="w-24 h-24 bg-red-600 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-white ml-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          </div>
        </button>
      )}

      {/* Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/90 to-transparent p-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Progress Bar */}
        <div className="mb-2">
          <div className="relative group/progress">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer hover:h-2 transition-all"
              style={{
                background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${(currentTime / duration) * 100}%, rgba(255,255,255,0.3) ${(currentTime / duration) * 100}%, rgba(255,255,255,0.3) ${buffered}%, rgba(255,255,255,0.1) ${buffered}%, rgba(255,255,255,0.1) 100%)`
              }}
            />
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-4">
            {/* Play/Pause */}
            <button onClick={togglePlayPause} className="hover:text-red-500 transition-colors">
              {isPlaying ? (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z" />
                </svg>
              ) : (
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                </svg>
              )}
            </button>

            {/* Volume */}
            <div className="flex items-center gap-2 group/volume">
              <button onClick={toggleMute} className="hover:text-red-500 transition-colors">
                {isMuted || volume === 0 ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0118 10a9.972 9.972 0 01-1.929 5.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0016 10c0-1.636-.491-3.139-1.343-4.41a1 1 0 010-1.661z" />
                  </svg>
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={handleVolumeChange}
                className="w-0 group-hover/volume:w-20 transition-all duration-200"
              />
            </div>

            {/* Time */}
            <span className="text-sm font-medium">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Playback Speed */}
            <div className="relative group/speed">
              <button className="px-3 py-1 hover:bg-white/20 rounded text-sm font-medium">
                {playbackRate}x
              </button>
              <div className="absolute bottom-full right-0 mb-2 bg-gray-900 rounded-lg shadow-xl opacity-0 group-hover/speed:opacity-100 pointer-events-none group-hover/speed:pointer-events-auto transition-opacity">
                {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(rate => (
                  <button
                    key={rate}
                    onClick={() => changePlaybackRate(rate)}
                    className={`block w-full px-4 py-2 text-left hover:bg-white/20 text-sm ${
                      playbackRate === rate ? 'text-red-500' : ''
                    }`}
                  >
                    {rate === 1 ? 'Normal' : `${rate}x`}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality */}
            {availableQualities.length > 1 && (
              <div className="relative group/quality">
                <button className="px-3 py-1 hover:bg-white/20 rounded flex items-center gap-1 text-sm font-medium">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                  {quality}
                </button>
                <div className="absolute bottom-full right-0 mb-2 bg-gray-900 rounded-lg shadow-xl opacity-0 group-hover/quality:opacity-100 pointer-events-none group-hover/quality:pointer-events-auto transition-opacity min-w-25">
                  {availableQualities.map(q => (
                    <button
                      key={q}
                      onClick={() => changeQuality(q)}
                      className={`block w-full px-4 py-2 text-left hover:bg-white/20 text-sm ${
                        quality === q ? 'text-red-500' : ''
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Theater Mode */}
            <button
              onClick={() => setIsTheaterMode(!isTheaterMode)}
              className="p-2 hover:bg-white/20 rounded"
              title="Theater mode (t)"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
              </svg>
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-white/20 rounded"
              title="Fullscreen (f)"
            >
              {isFullscreen ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3.707 6.293a1 1 0 010-1.414l2-2a1 1 0 011.414 0l2 2a1 1 0 01-1.414 1.414L7 5.586V7a1 1 0 11-2 0V5.586L4.293 6.293a1 1 0 01-1.414 0zM14.293 13.707a1 1 0 010 1.414l-2 2a1 1 0 01-1.414 0l-2-2a1 1 0 111.414-1.414L11 14.414V13a1 1 0 112 0v1.414l.707-.707a1 1 0 011.414 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {gestureOverlay && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/70 text-white px-4 py-2 rounded-full text-sm font-semibold">
            {gestureOverlay.label}
          </div>
        </div>
      )}
    </div>
  );
}
