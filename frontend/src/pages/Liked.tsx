import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usersApi } from "../lib/api";
import VideoCard from "../components/video/VideoCard";
import type { Video } from "../types";

interface LikeItem {
  id: string;
  createdAt: string;
  video: Video;
}

export default function Liked() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<LikeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadLikes = useCallback(async (p: number, reset: boolean) => {
    try {
      if (reset) setLoading(true);
      else setLoadingMore(true);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = (await usersApi.getLikedVideos({ page: p, limit: 20 })) as { success: boolean; data: any[]; meta?: { hasNextPage?: boolean } };
      if (response.success) {
        const newItems = response.data || [];
        setItems(prev => reset ? newItems : [...prev, ...newItems]);
        setHasMore(response.meta?.hasNextPage ?? newItems.length === 20);
      }
    } catch (err) {
      console.error("Failed to load liked videos:", err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    loadLikes(1, true);
  }, [isAuthenticated, navigate, loadLikes]);

  // Infinite scroll
  useEffect(() => {
    if (!hasMore || loadingMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          loadLikes(nextPage, false);
        }
      },
      { rootMargin: '200px' }
    );

    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, page, loadLikes]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pt-2">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Liked videos</h1>
        {items.length > 0 && (
          <span className="text-sm text-neutral-500">{items.length} video{items.length !== 1 ? 's' : ''}</span>
        )}
      </div>
      {items.length === 0 ? (
        <div className="text-center py-12 text-neutral-500">
          <p>No liked videos yet.</p>
          <p className="text-sm mt-2">Videos you like will appear here.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <VideoCard key={item.id} video={item.video} />
            ))}
          </div>
          <div ref={sentinelRef} className="flex justify-center py-8">
            {loadingMore && (
              <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
            )}
            {!hasMore && items.length > 20 && (
              <p className="text-sm text-neutral-400">No more liked videos</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
