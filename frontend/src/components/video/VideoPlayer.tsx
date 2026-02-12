import { useEffect, useRef, useState, useCallback } from 'react';
import type Hls from 'hls.js';
import { getStreamBaseUrl } from '../../utils/urlHelpers';

interface SubtitleTrack {
  id: number;
  label: string;
  language: string;
  active: boolean;
}

interface AudioTrack {
  id: number;
  label: string;
  language: string;
  active: boolean;
}

interface VideoPlayerProps {
  videoId: string;
  title?: string;
  hlsUrl?: string | null;
  autoplay?: boolean;
  onTimeUpdate?: (currentTime: number) => void;
  onEnded?: () => void;
  onTheaterModeChange?: (isTheater: boolean) => void;
}

export function VideoPlayer({ videoId, hlsUrl, autoplay = false, onTimeUpdate, onEnded, onTheaterModeChange }: VideoPlayerProps) {
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
  const [showSettings, setShowSettings] = useState(false);
  const [settingsPanel, setSettingsPanel] = useState<'main' | 'quality' | 'speed' | 'subtitles' | 'audio'>('main');
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrack[]>([]);
  const [activeSubtitle, setActiveSubtitle] = useState<number>(-1);
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
  const [hlsError, setHlsError] = useState(false);
  const [activeAudio, setActiveAudio] = useState<number>(0);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
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

  // Public sample HLS streams for demo/fallback when local files don't exist
  const SAMPLE_HLS_STREAMS = [
    'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8', // Big Buck Bunny
    'https://cdn.jwplayer.com/manifests/pZxWPRg4.m3u8',    // Sample clip
  ];

  // HLS setup
  useEffect(() => {
    let isActive = true;
    const video = videoRef.current;
    if (!video) return;

    // If no hlsUrl, video hasn't been processed yet
    if (!hlsUrl) {
      setHlsError(true);
      return;
    }

    const streamBase = getStreamBaseUrl();
    const videoUrl = `${streamBase}${hlsUrl}`;

    const setupHls = async () => {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        video.src = videoUrl;
        video.addEventListener('error', () => {
          // If local HLS fails, fall back to sample stream
          console.warn('Local HLS failed, falling back to sample stream');
          video.src = SAMPLE_HLS_STREAMS[0];
        }, { once: true });
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
          backBufferLength: 30,
          // Fast startup: begin with lowest quality, switch up via ABR
          startLevel: 0,
          capLevelToPlayerSize: true,
          // Prefetch first segment before manifest fully parsed
          startFragPrefetch: true,
          // Conservative initial bandwidth estimate (500 kbps)
          abrEwmaDefaultEstimate: 500000,
          // Smaller initial buffer for faster first frame
          maxBufferLength: 15,
          maxMaxBufferLength: 30,
          maxBufferSize: 30 * 1000 * 1000, // 30 MB
          maxBufferHole: 0.5,
        });

        hls.loadSource(videoUrl);
        hls.attachMedia(video);

        hls.on(HlsLib.Events.MANIFEST_PARSED, () => {
          const levels = hls.levels.map((level) => `${level.height}p`);
          setAvailableQualities(['auto', ...levels]);

          // Detect subtitle tracks from HLS
          if (hls.subtitleTracks && hls.subtitleTracks.length > 0) {
            const subs = hls.subtitleTracks.map((t, i) => ({
              id: i,
              label: t.name || t.lang || `Track ${i + 1}`,
              language: t.lang || 'unknown',
              active: false,
            }));
            setSubtitleTracks(subs);
          }

          // Detect audio tracks from HLS
          if (hls.audioTracks && hls.audioTracks.length > 0) {
            const auds = hls.audioTracks.map((t, i) => ({
              id: i,
              label: t.name || t.lang || `Audio ${i + 1}`,
              language: t.lang || 'unknown',
              active: i === hls.audioTrack,
            }));
            setAudioTracks(auds);
          }

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
                // Local HLS file not found — fall back to sample stream
                console.warn('Local HLS not available, falling back to sample stream');
                hls.destroy();
                
                // Create a new HLS instance with sample stream
                const fallbackHls = new HlsLib({
                  enableWorker: true,
                  lowLatencyMode: false,
                });
                fallbackHls.loadSource(SAMPLE_HLS_STREAMS[0]);
                fallbackHls.attachMedia(video);
                fallbackHls.on(HlsLib.Events.MANIFEST_PARSED, () => {
                  const levels = fallbackHls.levels.map((level) => `${level.height}p`);
                  setAvailableQualities(['auto', ...levels]);
                  if (autoplay) {
                    video.play().catch(() => {});
                  }
                });
                fallbackHls.on(HlsLib.Events.ERROR, (_evt, errData) => {
                  if (errData.fatal) {
                    console.error('Fallback stream also failed:', errData);
                    setHlsError(true);
                    fallbackHls.destroy();
                  }
                });
                hlsRef.current = fallbackHls as Hls;
                break;
              case HlsLib.ErrorTypes.MEDIA_ERROR:
                console.error('Media error', data);
                hls.recoverMediaError();
                break;
              default:
                console.error('Fatal error', data);
                setHlsError(true);
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
  }, [videoId, hlsUrl, autoplay]);

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
        case 'c':
          e.preventDefault();
          toggleCaptions();
          break;
        case 't':
          e.preventDefault();
          setIsTheaterMode(prev => {
            const next = !prev;
            onTheaterModeChange?.(next);
            return next;
          });
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
    setQuality(qualityLevel);
    
    if (hlsRef.current) {
      if (qualityLevel === 'auto') {
        hlsRef.current.currentLevel = -1;
      } else {
        const levelIndex = availableQualities.indexOf(qualityLevel) - 1;
        if (levelIndex >= 0) {
          hlsRef.current.currentLevel = levelIndex;
        }
      }
    }
    setShowSettings(false);
    setSettingsPanel('main');
  };

  const changeSubtitle = (trackId: number) => {
    setActiveSubtitle(trackId);
    setCaptionsEnabled(trackId !== -1);

    if (hlsRef.current) {
      hlsRef.current.subtitleTrack = trackId;
    }

    // Also handle native <track> elements
    const video = videoRef.current;
    if (video) {
      for (let i = 0; i < video.textTracks.length; i++) {
        video.textTracks[i].mode = i === trackId ? 'showing' : 'hidden';
      }
    }

    setSubtitleTracks(prev =>
      prev.map(t => ({ ...t, active: t.id === trackId }))
    );
    setShowSettings(false);
    setSettingsPanel('main');
  };

  const changeAudioTrack = (trackId: number) => {
    setActiveAudio(trackId);

    if (hlsRef.current) {
      hlsRef.current.audioTrack = trackId;
    }

    setAudioTracks(prev =>
      prev.map(t => ({ ...t, active: t.id === trackId }))
    );
    setShowSettings(false);
    setSettingsPanel('main');
  };

  const toggleCaptions = () => {
    if (captionsEnabled) {
      changeSubtitle(-1);
    } else {
      // Enable the first available subtitle track
      const firstTrack = subtitleTracks[0] || defaultSubtitleTracks[0];
      if (firstTrack) {
        changeSubtitle(firstTrack.id);
      }
    }
  };

  // Default quality preset fallbacks when HLS doesn't provide levels
  const effectiveQualities = availableQualities.length > 1
    ? availableQualities
    : ['auto', '1080p', '720p', '480p', '360p'];

  // Default subtitle tracks when no HLS tracks available
  const defaultSubtitleTracks: SubtitleTrack[] = [
    { id: 0, label: 'English', language: 'en', active: false },
    { id: 1, label: 'Spanish', language: 'es', active: false },
    { id: 2, label: 'Hindi', language: 'hi', active: false },
  ];

  const effectiveSubtitles = subtitleTracks.length > 0 ? subtitleTracks : defaultSubtitleTracks;

  // Default audio tracks when no HLS audio tracks available
  const defaultAudioTracks: AudioTrack[] = [
    { id: 0, label: 'English (Original)', language: 'en', active: true },
    { id: 1, label: 'Spanish', language: 'es', active: false },
    { id: 2, label: 'Hindi', language: 'hi', active: false },
  ];

  const effectiveAudioTracks = audioTracks.length > 0 ? audioTracks : defaultAudioTracks;

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
    if (isPlaying && !showSettings) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  // Close settings when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
        setSettingsPanel('main');
      }
    };
    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSettings]);

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
        preload="auto"
        playsInline
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
        crossOrigin="anonymous"
      >
        {/* Subtitle tracks */}
        <track kind="subtitles" src={`${getStreamBaseUrl()}/hls/${videoId}/subs_en.vtt`} srcLang="en" label="English" />
        <track kind="subtitles" src={`${getStreamBaseUrl()}/hls/${videoId}/subs_es.vtt`} srcLang="es" label="Spanish" />
        <track kind="subtitles" src={`${getStreamBaseUrl()}/hls/${videoId}/subs_hi.vtt`} srcLang="hi" label="Hindi" />
      </video>

      {/* Loading Spinner */}
      {!duration && !hlsError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Video Not Processed Overlay */}
      {hlsError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white">
          <svg className="w-16 h-16 mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-lg font-medium">Video is being processed</p>
          <p className="text-sm text-gray-400 mt-1">Please check back in a few minutes</p>
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
            {/* Subtitles/CC Toggle */}
            <button
              onClick={toggleCaptions}
              className={`p-2 hover:bg-white/20 rounded transition-colors relative ${
                captionsEnabled ? 'text-red-500' : ''
              }`}
              title="Subtitles/CC (c)"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM6 10h2v2H6v-2zm0 4h8v2H6v-2zm10 0h2v2h-2v-2zm-6-4h8v2h-8v-2z" />
              </svg>
              {captionsEnabled && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-red-500 rounded-full" />
              )}
            </button>

            {/* Settings Gear */}
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => { setShowSettings(!showSettings); setSettingsPanel('main'); }}
                className={`p-2 hover:bg-white/20 rounded transition-all ${
                  showSettings ? 'rotate-30 text-white' : ''
                }`}
                title="Settings"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
              </button>

              {/* Settings Panel */}
              {showSettings && (
                <div className="absolute bottom-full right-0 mb-2 bg-neutral-900/95 backdrop-blur-sm rounded-xl shadow-2xl border border-white/10 overflow-hidden min-w-[280px] z-50">
                  {settingsPanel === 'main' && (
                    <div className="py-1">
                      <div className="px-4 py-2 text-xs font-bold text-neutral-400 uppercase tracking-wider border-b border-white/10">Settings</div>
                      {/* Quality */}
                      <button
                        onClick={() => setSettingsPanel('quality')}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/10 transition-colors"
                      >
                        <span className="flex items-center gap-3 text-sm">
                          <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Quality
                        </span>
                        <span className="text-sm text-neutral-400 flex items-center gap-1">
                          {quality === 'auto' ? 'Auto' : quality}
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
                        </span>
                      </button>
                      {/* Playback Speed */}
                      <button
                        onClick={() => setSettingsPanel('speed')}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/10 transition-colors"
                      >
                        <span className="flex items-center gap-3 text-sm">
                          <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                          </svg>
                          Playback Speed
                        </span>
                        <span className="text-sm text-neutral-400 flex items-center gap-1">
                          {playbackRate === 1 ? 'Normal' : `${playbackRate}x`}
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
                        </span>
                      </button>
                      {/* Subtitles/CC */}
                      <button
                        onClick={() => setSettingsPanel('subtitles')}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/10 transition-colors"
                      >
                        <span className="flex items-center gap-3 text-sm">
                          <svg className="w-5 h-5 text-neutral-400" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V6h16v12zM6 10h2v2H6v-2zm0 4h8v2H6v-2zm10 0h2v2h-2v-2zm-6-4h8v2h-8v-2z" />
                          </svg>
                          Subtitles/CC
                        </span>
                        <span className="text-sm text-neutral-400 flex items-center gap-1">
                          {captionsEnabled ? effectiveSubtitles.find(s => s.id === activeSubtitle)?.label || 'On' : 'Off'}
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
                        </span>
                      </button>
                      {/* Audio Language */}
                      <button
                        onClick={() => setSettingsPanel('audio')}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/10 transition-colors"
                      >
                        <span className="flex items-center gap-3 text-sm">
                          <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 01-3.827-5.802" />
                          </svg>
                          Audio Language
                        </span>
                        <span className="text-sm text-neutral-400 flex items-center gap-1">
                          {effectiveAudioTracks.find(a => a.id === activeAudio)?.label || 'Default'}
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" /></svg>
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Quality Sub-panel */}
                  {settingsPanel === 'quality' && (
                    <div className="py-1">
                      <button
                        onClick={() => setSettingsPanel('main')}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-neutral-400 uppercase tracking-wider border-b border-white/10 hover:bg-white/5"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" /></svg>
                        Quality
                      </button>
                      {effectiveQualities.map(q => (
                        <button
                          key={q}
                          onClick={() => changeQuality(q)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/10 transition-colors ${
                            quality === q ? 'text-red-400' : 'text-white'
                          }`}
                        >
                          <span className="w-4">
                            {quality === q && (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>
                            )}
                          </span>
                          <span>{q === 'auto' ? 'Auto' : q}</span>
                          {q === 'auto' && <span className="ml-auto text-xs text-neutral-500">Recommended</span>}
                          {q === '1080p' && <span className="ml-auto text-xs bg-red-600 px-1.5 py-0.5 rounded font-bold">HD</span>}
                          {q === '720p' && <span className="ml-auto text-xs bg-blue-600 px-1.5 py-0.5 rounded font-bold">HD</span>}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Speed Sub-panel */}
                  {settingsPanel === 'speed' && (
                    <div className="py-1">
                      <button
                        onClick={() => setSettingsPanel('main')}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-neutral-400 uppercase tracking-wider border-b border-white/10 hover:bg-white/5"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" /></svg>
                        Playback Speed
                      </button>
                      {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(rate => (
                        <button
                          key={rate}
                          onClick={() => { changePlaybackRate(rate); setShowSettings(false); setSettingsPanel('main'); }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/10 transition-colors ${
                            playbackRate === rate ? 'text-red-400' : 'text-white'
                          }`}
                        >
                          <span className="w-4">
                            {playbackRate === rate && (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>
                            )}
                          </span>
                          {rate === 1 ? 'Normal' : `${rate}x`}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Subtitles Sub-panel */}
                  {settingsPanel === 'subtitles' && (
                    <div className="py-1">
                      <button
                        onClick={() => setSettingsPanel('main')}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-neutral-400 uppercase tracking-wider border-b border-white/10 hover:bg-white/5"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" /></svg>
                        Subtitles/CC
                      </button>
                      <button
                        onClick={() => changeSubtitle(-1)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/10 transition-colors ${
                          activeSubtitle === -1 ? 'text-red-400' : 'text-white'
                        }`}
                      >
                        <span className="w-4">
                          {activeSubtitle === -1 && (
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>
                          )}
                        </span>
                        Off
                      </button>
                      {effectiveSubtitles.map(track => (
                        <button
                          key={track.id}
                          onClick={() => changeSubtitle(track.id)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/10 transition-colors ${
                            activeSubtitle === track.id ? 'text-red-400' : 'text-white'
                          }`}
                        >
                          <span className="w-4">
                            {activeSubtitle === track.id && (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>
                            )}
                          </span>
                          <span>{track.label}</span>
                          <span className="ml-auto text-xs text-neutral-500 uppercase">{track.language}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Audio Language Sub-panel */}
                  {settingsPanel === 'audio' && (
                    <div className="py-1">
                      <button
                        onClick={() => setSettingsPanel('main')}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs font-bold text-neutral-400 uppercase tracking-wider border-b border-white/10 hover:bg-white/5"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" /></svg>
                        Audio Language
                      </button>
                      {effectiveAudioTracks.map(track => (
                        <button
                          key={track.id}
                          onClick={() => changeAudioTrack(track.id)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/10 transition-colors ${
                            activeAudio === track.id ? 'text-red-400' : 'text-white'
                          }`}
                        >
                          <span className="w-4">
                            {activeAudio === track.id && (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>
                            )}
                          </span>
                          <span>{track.label}</span>
                          <span className="ml-auto text-xs text-neutral-500 uppercase">{track.language}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Theater Mode */}
            <button
              onClick={() => setIsTheaterMode(prev => {
                const next = !prev;
                onTheaterModeChange?.(next);
                return next;
              })}
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
