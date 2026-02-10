import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import VideoCard from "../components/video/VideoCard";
import type { Video, ApiResponse } from "../types";
import { videosApi } from "../lib/api";
import { VIDEO_CATEGORY_OPTIONS } from "../utils/categories";

export default function Search() {
  const [params] = useSearchParams();
  const query = params.get("q");
  const [results, setResults] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [type, setType] = useState<"STANDARD" | "SHORT" | "">("");
  const [duration, setDuration] = useState<"short" | "medium" | "long" | "">("");
  const [uploadDate, setUploadDate] = useState<
    "hour" | "today" | "week" | "month" | "year" | ""
  >("");
  const [sortBy, setSortBy] = useState<
    "relevance" | "date" | "views" | "rating" | ""
  >("");
  const [category, setCategory] = useState<string>("");

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const fetchResults = async () => {
      try {
        setLoading(true);
        setError("");
        const response = (await videosApi.search({
          q: query,
          type: type || undefined,
          duration: duration || undefined,
          uploadDate: uploadDate || undefined,
          sortBy: sortBy || undefined,
          category: category || undefined,
          page: 1,
          limit: 20,
        })) as ApiResponse<Video[]>;
        setResults(response.data);
      } catch (err: unknown) {
        console.error("Search failed:", err);
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query, type, duration, uploadDate, sortBy, category]);

  return (
    <div className="pt-2">
      <h1 className="text-xl font-bold mb-4">
        Search results for: <span className="text-neutral-500">{query}</span>
      </h1>

      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
          className="bg-white border border-neutral-200 rounded-full px-4 py-2 text-sm"
        >
          <option value="">All types</option>
          <option value="STANDARD">Videos</option>
          <option value="SHORT">Shorts</option>
        </select>
        <select
          value={duration}
          onChange={(e) => setDuration(e.target.value as typeof duration)}
          className="bg-white border border-neutral-200 rounded-full px-4 py-2 text-sm"
        >
          <option value="">Any duration</option>
          <option value="short">Under 4 minutes</option>
          <option value="medium">4-20 minutes</option>
          <option value="long">Over 20 minutes</option>
        </select>
        <select
          value={uploadDate}
          onChange={(e) => setUploadDate(e.target.value as typeof uploadDate)}
          className="bg-white border border-neutral-200 rounded-full px-4 py-2 text-sm"
        >
          <option value="">Any time</option>
          <option value="hour">Last hour</option>
          <option value="today">Today</option>
          <option value="week">This week</option>
          <option value="month">This month</option>
          <option value="year">This year</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="bg-white border border-neutral-200 rounded-full px-4 py-2 text-sm"
        >
          <option value="">Relevance</option>
          <option value="date">Upload date</option>
          <option value="views">View count</option>
          <option value="rating">Rating</option>
        </select>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bg-white border border-neutral-200 rounded-full px-4 py-2 text-sm"
        >
          <option value="">All categories</option>
          {VIDEO_CATEGORY_OPTIONS.map((item) => (
            <option key={item.id} value={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-neutral-200 border-t-red-600 rounded-full animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl mb-6">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {!loading && results.length === 0 ? (
          <div className="text-neutral-500">No results found.</div>
        ) : (
          results.map((video) => <VideoCard key={video.id} video={video} />)
        )}
      </div>
    </div>
  );
}
