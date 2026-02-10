import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usersApi } from "../lib/api";
import VideoCard from "../components/video/VideoCard";
import type { Video } from "../types";

interface HistoryItem {
  id: string;
  watchedAt: string;
  video: Video;
}

export default function History() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    const loadHistory = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = (await usersApi.getWatchHistory({ page: 1, limit: 40 })) as { success: boolean; data: any[] };
        if (response.success) {
          setItems(response.data);
        }
      } catch (err) {
        console.error("Failed to load history:", err);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [isAuthenticated, navigate]);

  const clearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear your entire watch history? This cannot be undone.')) {
      return;
    }
    try {
      await usersApi.clearWatchHistory();
      setItems([]);
    } catch (err) {
      console.error("Failed to clear history:", err);
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
        <h1 className="text-2xl font-bold">History</h1>
        <button
          onClick={clearHistory}
          className="px-4 py-2 rounded-full border border-neutral-300 hover:bg-neutral-100 text-sm"
        >
          Clear all
        </button>
      </div>

      {items.length === 0 ? (
        <div className="text-neutral-500">No watch history yet.</div>
      ) : (
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <VideoCard key={item.id} video={item.video} />
          ))}
        </div>
      )}
    </div>
  );
}
