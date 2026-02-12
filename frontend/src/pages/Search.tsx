import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import VideoCard from "../components/video/VideoCard";
import type { Video, ApiResponse } from "../types";
import { videosApi } from "../lib/api";
import { VIDEO_CATEGORY_OPTIONS } from "../utils/categories";

export default function Search() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const query = params.get("q");
  const [results, setResults] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceSearchSupported, setVoiceSearchSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [type, setType] = useState<"STANDARD" | "SHORT" | "">("");
  const [duration, setDuration] = useState<"short" | "medium" | "long" | "">("");
  const [uploadDate, setUploadDate] = useState<
    "hour" | "today" | "week" | "month" | "year" | ""
  >("");
  const [sortBy, setSortBy] = useState<
    "relevance" | "date" | "views" | "rating" | ""
  >("");
  const [category, setCategory] = useState<string>("");

  // Initialize voice search
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setVoiceSearchSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        navigate(`/search?q=${encodeURIComponent(transcript)}`);
      };

      recognition.onerror = (event: any) => {
        console.error('Voice search error:', event.error);
        setError('Voice search failed. Please try again.');
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [navigate]);

  const startVoiceSearch = () => {
    if (recognitionRef.current && !isListening) {
      setError("");
      recognitionRef.current.start();
    }
  };

  const stopVoiceSearch = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

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
      {/* Voice Search Listening Overlay */}
      {isListening && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center" onClick={stopVoiceSearch}>
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="relative inline-flex items-center justify-center mb-6">
              <div className="absolute w-20 h-20 bg-red-100 rounded-full animate-ping opacity-50" />
              <div className="relative w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <h2 className="text-lg font-semibold mb-2">Listening...</h2>
            <p className="text-neutral-500 text-sm mb-4">Say what you want to search for</p>
            <button
              onClick={stopVoiceSearch}
              className="px-6 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-full text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-xl font-bold">
          {query ? (
            <>
              Search results for: <span className="text-neutral-500">{query}</span>
            </>
          ) : (
            "Search Videos"
          )}
        </h1>
        
        {voiceSearchSupported && (
          <button
            onClick={isListening ? stopVoiceSearch : startVoiceSearch}
            className={`p-2 rounded-full transition-all ${
              isListening 
                ? 'bg-red-600 text-white animate-pulse' 
                : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
            }`}
            title={isListening ? "Stop voice search" : "Start voice search"}
          >
            {isListening ? (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 002 0V8a1 1 0 00-1-1zm4 0a1 1 0 00-1 1v4a1 1 0 002 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        )}
      </div>

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
