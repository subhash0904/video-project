import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import VideoCard from "../components/video/VideoCard";
import SkeletonCard from "../components/video/SkeletonCard";
import { videosApi, recommendationsApi } from "../lib/api";
import type { Video, ApiResponse } from "../types";
import { VIDEO_CATEGORY_FILTERS } from "../utils/categories";
import { useAuth } from "../context/AuthContext";

interface HomeSection {
  id: string;
  title: string;
  videos: Video[];
}

export default function Home() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const urlCategory = searchParams.get('category');
  const [category, setCategory] = useState<'ALL' | string>(urlCategory || 'ALL');
  const [mode, setMode] = useState<'sections' | 'grid'>(urlCategory ? 'grid' : 'sections');
  const { isAuthenticated } = useAuth();

  // Sync category state with URL changes (e.g., sidebar navigation)
  useEffect(() => {
    const newCat = searchParams.get('category') || 'ALL';
    if (newCat !== category) {
      setCategory(newCat);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset when category changes
  useEffect(() => {
    setPage(1);
    setVideos([]);
    setHasMore(true);
    if (category !== 'ALL') {
      setMode('grid');
    } else {
      setMode('sections');
    }
  }, [category]);

  useEffect(() => {
    if (category !== 'ALL') {
      loadFilteredVideos(page, page === 1);
    } else {
      loadHomeFeed();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- loadFilteredVideos/loadHomeFeed intentionally omitted, runs on category/page change
  }, [category, page, isAuthenticated]);

  // Infinite scroll observer
  useEffect(() => {
    if (mode !== 'grid' || !hasMore || loadingMore) return;

    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          setPage(prev => prev + 1);
        }
      },
      { rootMargin: '200px' }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [mode, hasMore, loadingMore, loading]);

  async function loadHomeFeed() {
    try {
      setLoading(true);
      setError("");

      const response = (await recommendationsApi.getHomeFeed()) as ApiResponse<{ sections: HomeSection[] }>;
      if (response.data?.sections) {
        setSections(response.data.sections);
      } else {
        setMode('grid');
        await loadFilteredVideos(1, true);
      }
    } catch {
      setMode('grid');
      await loadFilteredVideos(1, true);
    } finally {
      setLoading(false);
    }
  }

  async function loadFilteredVideos(p: number, reset: boolean = false) {
    try {
      if (reset) setLoading(true);
      else setLoadingMore(true);
      setError("");

      const response = await videosApi.getFeed({
        page: p,
        limit: 20,
        category: category === 'ALL' ? undefined : category,
      }) as ApiResponse<Video[]>;

      const newVideos = response.data || [];
      setVideos(prev => reset ? newVideos : [...prev, ...newVideos]);
      setHasMore(response.meta?.hasNextPage || false);
    } catch (err: unknown) {
      console.error('Failed to load videos:', err);
      setError(err instanceof Error ? err.message : 'Failed to load videos');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-900/20 border border-red-700 text-red-400 p-4 rounded-lg">
          {error}
          <button
            onClick={loadHomeFeed}
            className="ml-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-1">
      {/* Category Filter Bar */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-thin">
        {VIDEO_CATEGORY_FILTERS.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setCategory(item.id);
              if (item.id === 'ALL') {
                setSearchParams({});
              } else {
                setSearchParams({ category: item.id });
              }
            }}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
              category === item.id
                ? 'bg-black text-white'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : mode === 'sections' && sections.length > 0 ? (
        /* ================================
           Personalized Sectioned Home Feed
           ================================ */
        <div className="space-y-8">
          {sections.map((section) => (
            <HomeVideoSection key={section.id} section={section} />
          ))}
        </div>
      ) : videos.length === 0 && sections.length === 0 ? (
        <div className="text-center py-12 text-neutral-500">
          <p>No videos available yet.</p>
          <p className="text-sm mt-2">Be the first to upload!</p>
        </div>
      ) : (
        /* ================================
           Classic Grid View (filtered)
           ================================ */
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>
      )}

      {/* Infinite scroll sentinel */}
      {mode === 'grid' && !loading && (
        <div ref={sentinelRef} className="flex justify-center py-8">
          {loadingMore && (
            <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
          )}
          {!hasMore && videos.length > 0 && (
            <p className="text-sm text-neutral-400">No more videos</p>
          )}
        </div>
      )}
    </div>
  );
}

/* Horizontal scrollable section */
function HomeVideoSection({ section }: { section: HomeSection }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    el?.addEventListener('scroll', checkScroll, { passive: true });
    return () => el?.removeEventListener('scroll', checkScroll);
  }, [checkScroll]);

  const scroll = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -400 : 400, behavior: 'smooth' });
  };

  if (section.videos.length === 0) return null;

  const sectionIcon: Record<string, string> = {
    continue: '▶️',
    subscriptions: '🔔',
    trending: '🔥',
    'for-you': '✨',
  };

  return (
    <div className="relative group">
      {/* Section Title */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="text-lg">{sectionIcon[section.id] || '📺'}</span>
        <h2 className="text-lg font-semibold text-neutral-900">{section.title}</h2>
        <span className="text-xs text-neutral-400 mt-0.5">({section.videos.length})</span>
      </div>

      {/* Scrollable Row */}
      <div className="relative">
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 rounded-full shadow-lg flex items-center justify-center hover:bg-white transition opacity-0 group-hover:opacity-100"
          >
            ‹
          </button>
        )}

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {section.videos.map((video) => (
            <div key={video.id} className="flex-shrink-0 w-72">
              <VideoCard video={video} />
            </div>
          ))}
        </div>

        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white/90 rounded-full shadow-lg flex items-center justify-center hover:bg-white transition opacity-0 group-hover:opacity-100"
          >
            ›
          </button>
        )}
      </div>
    </div>
  );
}
