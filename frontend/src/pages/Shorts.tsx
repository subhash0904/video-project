import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, recommendationsApi, videosApi, usersApi } from '../lib/api';
import type { Video, ApiResponse } from '../types';
import { VIDEO_CATEGORY_FILTERS } from '../utils/categories';
import { getStreamBaseUrl } from '../utils/urlHelpers';

export default function Shorts() {
  const navigate = useNavigate();
  const [shorts, setShorts] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [likedShorts, setLikedShorts] = useState<Record<string, boolean>>({});
  const [dislikedShorts, setDislikedShorts] = useState<Record<string, boolean>>({});
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [likeAnimations, setLikeAnimations] = useState<Record<string, boolean>>({});
  const [subscribedChannels, setSubscribedChannels] = useState<Record<string, boolean>>({});
  const [showMoreMenu, setShowMoreMenu] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const touchStartYRef = useRef(0);
  const lastTapRef = useRef(0);
  const singleTapTimeoutRef = useRef<number | null>(null);
  const [category, setCategory] = useState<'ALL' | string>('ALL');

  useEffect(() => {
    const fetchShorts = async () => {
      try {
        setLoading(true);
        setError('');
        const response = (await recommendationsApi.getShortsFeed({
          page: 1,
          limit: 20,
          category: category === 'ALL' ? undefined : category,
        })) as ApiResponse<Video[]>;
        setShorts(response.data);
        setLikeCounts(
          response.data.reduce((acc, item) => {
            acc[item.id] = item.likes || 0;
            return acc;
          }, {} as Record<string, number>)
        );
        setActiveIndex(0);
        requestAnimationFrame(() => scrollToIndex(0));
      } catch (err: unknown) {
        console.error('Failed to load shorts:', err);
        setError(err instanceof Error ? err.message : 'Failed to load shorts');
      } finally {
        setLoading(false);
      }
    };

    fetchShorts();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchShorts defined inline, runs on category change
  }, [category]);

  const handleLike = async (videoId: string) => {
    const token = apiClient.getToken();
    if (!token) {
      navigate('/login');
      return;
    }

    // Show like animation
    setLikeAnimations((prev) => ({ ...prev, [videoId]: true }));
    setTimeout(() => {
      setLikeAnimations((prev) => ({ ...prev, [videoId]: false }));
    }, 600);

    try {
      const wasLiked = !!likedShorts[videoId];
      await videosApi.toggleLike(videoId, 'LIKE');
      setLikedShorts((prev) => ({ ...prev, [videoId]: !wasLiked }));
      setLikeCounts((prev) => ({
        ...prev,
        [videoId]: Math.max(0, (prev[videoId] || 0) + (wasLiked ? -1 : 1)),
      }));
    } catch (err) {
      console.error('Failed to like short:', err);
    }
  };

  const handleDislike = async (videoId: string) => {
    const token = apiClient.getToken();
    if (!token) { navigate('/login'); return; }
    try {
      const wasDisliked = !!dislikedShorts[videoId];
      await videosApi.toggleLike(videoId, 'DISLIKE');
      setDislikedShorts((prev) => ({ ...prev, [videoId]: !wasDisliked }));
      if (!wasDisliked && likedShorts[videoId]) {
        setLikedShorts((prev) => ({ ...prev, [videoId]: false }));
        setLikeCounts((prev) => ({ ...prev, [videoId]: Math.max(0, (prev[videoId] || 0) - 1) }));
      }
    } catch (err) { console.error('Failed to dislike short:', err); }
  };

  const handleSubscribe = async (channelId: string) => {
    const token = apiClient.getToken();
    if (!token) { navigate('/login'); return; }
    try {
      const wasSub = !!subscribedChannels[channelId];
      if (wasSub) {
        await usersApi.unsubscribe(channelId);
      } else {
        await usersApi.subscribe(channelId);
      }
      setSubscribedChannels((prev) => ({ ...prev, [channelId]: !wasSub }));
    } catch (err) { console.error('Failed to toggle subscription:', err); }
  };

  const handleShare = async (videoId: string) => {
    const url = `${window.location.origin}/watch?v=${videoId}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Check out this short!', url });
        return;
      } catch {
        // Ignore share cancel
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) {
      return 'Just now';
    }
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 1) return 'Today';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
    return `${Math.floor(diffDays / 365)}y ago`;
  };

  const scrollToIndex = (index: number) => {
    const clamped = Math.max(0, Math.min(shorts.length - 1, index));
    const target = itemRefs.current[clamped];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
      setActiveIndex(clamped);
    }
  };

  const handleSwipeEnd = (endY: number) => {
    const delta = endY - touchStartYRef.current;
    if (Math.abs(delta) < 60) return;
    if (delta < 0) {
      scrollToIndex(activeIndex + 1);
    } else {
      scrollToIndex(activeIndex - 1);
    }
  };

  const handleShortTap = (videoId: string, e: React.PointerEvent<HTMLVideoElement>) => {
    const now = Date.now();
    const isDoubleTap = now - lastTapRef.current < 280;
    lastTapRef.current = now;

    if (isDoubleTap) {
      if (singleTapTimeoutRef.current) {
        window.clearTimeout(singleTapTimeoutRef.current);
        singleTapTimeoutRef.current = null;
      }
      handleLike(videoId);
      return;
    }

    if (singleTapTimeoutRef.current) {
      window.clearTimeout(singleTapTimeoutRef.current);
    }

    const video = e.currentTarget;
    singleTapTimeoutRef.current = window.setTimeout(() => {
      if (video.paused) {
        video.play().catch(() => undefined);
      } else {
        video.pause();
      }
      singleTapTimeoutRef.current = null;
    }, 200);
  };

  if (loading) {
    return <div className="p-6 text-neutral-400">Loading shorts...</div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-900/20 border border-red-700 text-red-400 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-56px)] bg-black">
      {/* Category Filters */}
      <div className="absolute top-4 left-4 right-4 z-10 flex gap-2 overflow-x-auto scrollbar-hide">
        {VIDEO_CATEGORY_FILTERS.slice(0, 8).map((item) => (
          <button
            key={item.id}
            onClick={() => setCategory(item.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              category === item.id
                ? 'bg-white text-black'
                : 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Shorts Scroll Container */}
      <div
        ref={containerRef}
        className="h-full overflow-y-scroll snap-y snap-mandatory scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        onScroll={() => {
          const container = containerRef.current;
          if (!container) return;
          const index = Math.round(container.scrollTop / container.clientHeight);
          if (index !== activeIndex) {
            setActiveIndex(index);
          }
        }}
        onTouchStart={(e) => {
          touchStartYRef.current = e.touches[0]?.clientY || 0;
        }}
        onTouchEnd={(e) => {
          handleSwipeEnd(e.changedTouches[0]?.clientY || 0);
        }}
      >
        {shorts.map((short, index) => (
          <div
            key={short.id}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            className="h-full snap-start flex items-center justify-center relative"
          >
            {/* Video */}
            <video
              src={`${getStreamBaseUrl()}/hls/${short.id}/master.m3u8`}
              className="h-full w-auto max-w-full object-contain"
              autoPlay={index === activeIndex}
              muted
              loop
              playsInline
              onPointerUp={(e) => handleShortTap(short.id, e)}
            />

            {/* Double-Tap Like Animation */}
            {likeAnimations[short.id] && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                <div className="animate-bounce">
                  <svg
                    className="w-20 h-20 text-red-500 drop-shadow-lg"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </div>
              </div>
            )}

            {/* Top Info - Channel */}
            <div className="absolute top-20 left-6 right-24 flex items-center gap-3 z-20">
              <img
                src={short.channel.avatarUrl || `https://ui-avatars.com/api/?name=${short.channel.name}`}
                alt={short.channel.name}
                className="w-10 h-10 rounded-full border-2 border-white"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white text-sm">
                    {short.channel.handle}
                  </span>
                  <span className="text-gray-300 text-xs">
                    {formatDate(short.publishedAt)}
                  </span>
                </div>
                <p className="text-white text-sm font-medium line-clamp-1">
                  {short.title} {short.description && '😍'}
                </p>
              </div>
            </div>

            {/* Bottom Left Info */}
            <div className="absolute bottom-24 left-6 right-24 z-20">
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => handleSubscribe(short.channel.id)}
                  className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                    subscribedChannels[short.channel.id]
                      ? 'bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm'
                      : 'bg-white text-black hover:bg-gray-200'
                  }`}
                >
                  {subscribedChannels[short.channel.id] ? 'Subscribed' : 'Subscribe'}
                </button>
                <button
                  onClick={() => navigate(`/channel/${short.channel.handle || short.channel.id}`)}
                  className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              {short.description && (
                <p className="text-white text-sm line-clamp-2 drop-shadow-lg">
                  {short.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <img
                  src={short.channel.avatarUrl || `https://ui-avatars.com/api/?name=${short.channel.name}`}
                  alt=""
                  className="w-8 h-8 rounded-full"
                />
                <span className="text-white text-xs font-medium">@{short.channel.handle}</span>
              </div>
            </div>

            {/* Right Side Actions - YouTube Style */}
            <div className="absolute bottom-24 right-4 flex flex-col items-center gap-6 z-20">
              {/* Like Button */}
              <button
                onClick={() => handleLike(short.id)}
                className="flex flex-col items-center gap-1 group"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition ${
                  likedShorts[short.id]
                    ? 'bg-white text-black'
                    : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white'
                }`}>
                  <svg className="w-6 h-6" fill={likedShorts[short.id] ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                  </svg>
                </div>
                <span className="text-white text-xs font-medium drop-shadow">
                  {(likeCounts[short.id] || 0) >= 1000
                    ? `${((likeCounts[short.id] || 0) / 1000).toFixed(0)}K`
                    : likeCounts[short.id] || 0}
                </span>
              </button>

              {/* Dislike Button */}
              <button
                onClick={() => handleDislike(short.id)}
                className="flex flex-col items-center gap-1 group"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition ${
                  dislikedShorts[short.id]
                    ? 'bg-white text-black'
                    : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white'
                }`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                  </svg>
                </div>
                <span className="text-white text-xs font-medium drop-shadow">Dislike</span>
              </button>

              {/* Comments Button */}
              <button
                onClick={() => navigate(`/watch?v=${short.id}`)}
                className="flex flex-col items-center gap-1 group"
              >
                <div className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center text-white transition">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <span className="text-white text-xs font-medium drop-shadow">
                  {short.commentCount || 0}
                </span>
              </button>

              {/* Share Button */}
              <button
                onClick={() => handleShare(short.id)}
                className="flex flex-col items-center gap-1 group"
              >
                <div className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center text-white transition">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </div>
                <span className="text-white text-xs font-medium drop-shadow">Share</span>
              </button>

              {/* More Button */}
              <div className="relative">
                <button
                  onClick={() => setShowMoreMenu(showMoreMenu === short.id ? null : short.id)}
                  className="flex flex-col items-center gap-1 group"
                >
                  <div className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm flex items-center justify-center text-white transition rotate-90">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                    </svg>
                  </div>
                </button>
                {showMoreMenu === short.id && (
                  <div className="absolute right-14 bottom-0 w-48 bg-neutral-800 rounded-lg shadow-xl py-1 z-30 border border-neutral-700">
                    <button onClick={() => { handleShare(short.id); setShowMoreMenu(null); }} className="w-full px-4 py-2.5 text-left text-white text-sm hover:bg-neutral-700">Copy link</button>
                    <button onClick={() => { navigate(`/watch?v=${short.id}`); setShowMoreMenu(null); }} className="w-full px-4 py-2.5 text-left text-white text-sm hover:bg-neutral-700">Open in full player</button>
                    <button onClick={() => {
                      setShorts(prev => prev.filter(s => s.id !== short.id));
                      setShowMoreMenu(null);
                    }} className="w-full px-4 py-2.5 text-left text-red-400 text-sm hover:bg-neutral-700">Not interested</button>
                  </div>
                )}
              </div>

              {/* Channel Avatar */}
              <div className="relative mt-2">
                <img
                  src={short.channel.avatarUrl || `https://ui-avatars.com/api/?name=${short.channel.name}`}
                  alt={short.channel.name}
                  className="w-12 h-12 rounded-full border-2 border-white cursor-pointer"
                  onClick={() => navigate(`/channel/${short.channel.id}`)}
                />
              </div>
            </div>

            {/* Navigation Arrows - Desktop */}
            {index > 0 && (
              <button
                onClick={() => scrollToIndex(index - 1)}
                className="hidden md:flex absolute top-1/2 left-4 -translate-y-1/2 w-10 h-10 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white transition z-20"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </button>
            )}
            {index < shorts.length - 1 && (
              <button
                onClick={() => scrollToIndex(index + 1)}
                className="hidden md:flex absolute bottom-28 left-1/2 -translate-x-1/2 w-10 h-10 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white transition z-20"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
