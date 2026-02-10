import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usersApi, recommendationsApi } from "../lib/api";
import VideoCard from "../components/video/VideoCard";
import type { Video } from "../types";

interface SubscriptionItem {
  id: string;
  channel: {
    id: string;
    handle: string;
    name: string;
    avatarUrl?: string;
    subscriberCount: number;
    videoCount: number;
    verified: boolean;
  };
}

export default function Subscriptions() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<SubscriptionItem[]>([]);
  const [feedVideos, setFeedVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'feed' | 'channels'>('feed');
  const [unsubscribing, setUnsubscribing] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    loadData();
  }, [isAuthenticated, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [subsRes, feedRes] = await Promise.allSettled([
        usersApi.getSubscriptions() as Promise<{ success: boolean; data: SubscriptionItem[] }>,
        recommendationsApi.getSubscriptionFeed({ page: 1, limit: 30 }) as Promise<{ success: boolean; data: Video[] }>,
      ]);

      if (subsRes.status === 'fulfilled' && subsRes.value.success) {
        setItems(subsRes.value.data);
      }
      if (feedRes.status === 'fulfilled' && feedRes.value.data) {
        setFeedVideos(Array.isArray(feedRes.value.data) ? feedRes.value.data : []);
      }
    } catch (err) {
      console.error("Failed to load subscriptions:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async (channelId: string) => {
    if (!confirm('Unsubscribe from this channel?')) return;
    setUnsubscribing(prev => new Set(prev).add(channelId));
    try {
      await usersApi.unsubscribe(channelId);
      setItems(prev => prev.filter(i => i.channel.id !== channelId));
    } catch (err) {
      console.error('Failed to unsubscribe:', err);
    } finally {
      setUnsubscribing(prev => {
        const next = new Set(prev);
        next.delete(channelId);
        return next;
      });
    }
  };

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
        <h1 className="text-2xl font-bold">Subscriptions</h1>
        <div className="flex gap-1 bg-neutral-100 rounded-xl p-1">
          <button
            onClick={() => setView('feed')}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${view === 'feed' ? 'bg-white shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}
          >
            Latest
          </button>
          <button
            onClick={() => setView('channels')}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${view === 'channels' ? 'bg-white shadow-sm' : 'text-neutral-600 hover:text-neutral-900'}`}
          >
            Channels ({items.length})
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-neutral-500">
          <p>No subscriptions yet.</p>
          <p className="text-sm mt-2">Subscribe to channels to see their latest videos here.</p>
        </div>
      ) : view === 'feed' ? (
        <>
          {feedVideos.length === 0 ? (
            <div className="text-center py-12 text-neutral-500">
              <p>No recent videos from your subscriptions.</p>
            </div>
          ) : (
            <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {feedVideos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-neutral-200 rounded-2xl p-4 flex items-center gap-4"
            >
              <Link to={`/channel/${item.channel.handle}`} className="shrink-0">
                {item.channel.avatarUrl ? (
                  <img
                    src={item.channel.avatarUrl}
                    alt={item.channel.name}
                    className="w-12 h-12 rounded-full border border-neutral-200"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-600 font-semibold">
                    {item.channel.name[0].toUpperCase()}
                  </div>
                )}
              </Link>
              <Link to={`/channel/${item.channel.handle}`} className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold truncate">{item.channel.name}</h2>
                  {item.channel.verified && (
                    <svg className="w-3.5 h-3.5 text-neutral-500 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                  )}
                </div>
                <p className="text-xs text-neutral-500">@{item.channel.handle}</p>
                <p className="text-xs text-neutral-500">
                  {item.channel.subscriberCount.toLocaleString()} subscribers &middot; {item.channel.videoCount} videos
                </p>
              </Link>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => handleUnsubscribe(item.channel.id)}
                  disabled={unsubscribing.has(item.channel.id)}
                  className="px-4 py-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-sm font-semibold disabled:opacity-50 transition"
                >
                  {unsubscribing.has(item.channel.id) ? 'Removing...' : 'Subscribed'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
