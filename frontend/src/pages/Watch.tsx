import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { VideoPlayer } from '../components/video/VideoPlayer';
import { VideoEngagement } from '../components/video/VideoEngagement';
import { Comments } from '../components/video/Comments';
import { LiveChat } from '../components/video/LiveChat';
import { apiClient, videosApi } from '../lib/api';

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  hlsUrl?: string | null;
  duration: number;
  views: bigint | number;
  likes: number;
  dislikes: number;
  commentCount: number;
  publishedAt: string;
  category?: string;
  channel: {
    id: string;
    name: string;
    handle: string;
    avatarUrl: string;
    verified: boolean;
    subscriberCount: number;
  };
}

export default function Watch() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const videoId = searchParams.get('v');
  
  const [video, setVideo] = useState<Video | null>(null);
  const [relatedVideos, setRelatedVideos] = useState<Video[]>([]);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLiveChat, setShowLiveChat] = useState(false);
  const [isLive] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const lastTrackedRef = useRef(-1);

  useEffect(() => {
    if (!videoId) {
      setError('No video specified');
      setLoading(false);
      return;
    }
    fetchVideoDetails();
    fetchRelatedVideos();
    incrementViewCount();
    lastTrackedRef.current = -1;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  const fetchVideoDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const response = (await videosApi.getVideoById(videoId!)) as { success: boolean; data: Video };
      if (response.success) {
        setVideo(response.data);
      }
    } catch (err: unknown) {
      console.error('Failed to fetch video:', err);
      setError(err instanceof Error ? err.message : 'Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatedVideos = async () => {
    try {
      const response = (await videosApi.getRecommended(videoId!, 20)) as { success: boolean; data: Video[] };
      if (response.success) {
        setRelatedVideos(response.data.filter((v: Video) => v.id !== videoId));
      }
    } catch (err) {
      console.error('Failed to fetch related videos:', err);
    }
  };

  const incrementViewCount = async () => {
    try {
      await apiClient.post(`/videos/${videoId}/view`);
    } catch (err) {
      console.error('Failed to increment view:', err);
    }
  };

  const formatViews = (views: bigint | number) => {
    const num = typeof views === 'bigint' ? Number(views) : views;
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'Just now';
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} week${Math.floor(diffDays / 7) > 1 ? 's' : ''} ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} month${Math.floor(diffDays / 30) > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffDays / 365)} year${Math.floor(diffDays / 365) > 1 ? 's' : ''} ago`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen gap-4">
        <svg className="w-16 h-16 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <h2 className="text-2xl font-bold">{error || 'Video not found'}</h2>
        <button onClick={() => navigate('/')} className="px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition">
          Return to home
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto py-6" style={{ maxWidth: '1920px' }}>
      <div className={`grid grid-cols-1 gap-6 ${isTheaterMode ? '' : 'lg:grid-cols-[1fr_400px]'}`}>
        {/* LEFT: Video Player and Details */}
        <div className="w-full">
          {/* Video Player */}
          <div className="mb-4 rounded-3xl overflow-hidden bg-black shadow-sm">
            <VideoPlayer
              videoId={video.id}
              hlsUrl={video.hlsUrl}
              title={video.title}
              autoplay={false}
              onTheaterModeChange={setIsTheaterMode}
              onTimeUpdate={(time) => {
                const sec = Math.floor(time);
                if (sec > 0 && sec % 30 === 0 && sec !== lastTrackedRef.current) {
                  lastTrackedRef.current = sec;
                  const token = apiClient.getToken();
                  if (token) {
                    apiClient
                      .post(`/videos/${video.id}/watch`, { watchDuration: sec })
                      .catch((err) => console.error('Failed to update watch history:', err));
                  }
                }
              }}
              onEnded={() => {
                if (relatedVideos.length > 0) {
                  navigate(`/watch?v=${relatedVideos[0].id}`);
                }
              }}
            />
          </div>

          {/* Video Title */}
          <h1 className="text-2xl font-bold mb-2 text-neutral-900">{video.title}</h1>

          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-600 mb-4">
            <span className="bg-neutral-100 px-2 py-1 rounded-full">
              {formatViews(video.views)} views
            </span>
            <span className="bg-neutral-100 px-2 py-1 rounded-full">
              {formatDate(video.publishedAt)}
            </span>
            {video.category && (
              <span className="bg-neutral-100 px-2 py-1 rounded-full uppercase tracking-wide">
                {video.category.replace('_', ' ')}
              </span>
            )}
          </div>

          {/* Engagement Bar */}
          <div className="bg-white border border-neutral-200 rounded-2xl p-3 shadow-sm">
            <VideoEngagement
              videoId={video.id}
              channelId={video.channel.id}
              channelName={video.channel.name}
              channelHandle={video.channel.handle}
              channelAvatar={video.channel.avatarUrl}
              subscriberCount={video.channel.subscriberCount}
              verified={video.channel.verified}
              likes={video.likes}
              dislikes={video.dislikes}
              views={typeof video.views === 'bigint' ? Number(video.views) : video.views}
            />
          </div>

          {/* Description */}
          <div className="mt-4 bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-3 text-sm font-semibold mb-2 text-neutral-700">
              <span>About this video</span>
            </div>
            <div className={`text-sm whitespace-pre-wrap ${showFullDescription ? '' : 'line-clamp-2'}`}>
              {video.description || 'No description provided.'}
            </div>
            {video.description && video.description.length > 100 && (
              <button
                onClick={() => setShowFullDescription(!showFullDescription)}
                className="text-sm font-semibold mt-2 text-neutral-700 hover:text-neutral-900"
              >
                {showFullDescription ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>

          {/* Comments Section */}
          <Comments videoId={video.id} totalComments={video.commentCount} />
        </div>

        {/* RIGHT: Toggle between Chat and Related Videos */}
        <div className="w-full">
          {/* Toggle bar */}
          <div className="flex items-center gap-2 mb-3">
            <button 
              onClick={() => setShowLiveChat(false)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                !showLiveChat ? 'bg-neutral-900 text-white' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
              }`}
            >
              Related
            </button>
            <button 
              onClick={() => setShowLiveChat(true)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                showLiveChat ? 'bg-neutral-900 text-white' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
              }`}
            >
              Live Chat
            </button>
          </div>

          {showLiveChat ? (
            <div className="sticky top-20 h-[calc(100vh-10rem)] rounded-2xl overflow-hidden shadow-lg">
              <LiveChat videoId={video.id} isLive={isLive} />
            </div>
          ) : (
            <div className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-neutral-700 mb-3">Up next</h3>
              {relatedVideos.length === 0 ? (
                <p className="text-sm text-neutral-400">No related videos found.</p>
              ) : (
                relatedVideos.map((relatedVideo) => (
                  <div key={relatedVideo.id} className="mb-3 last:mb-0">
                    <Link
                      to={`/watch?v=${relatedVideo.id}`}
                      className="flex gap-3 hover:bg-neutral-100 rounded-xl p-2 transition-colors"
                    >
                      <div className="relative shrink-0 w-40">
                        <img
                          src={relatedVideo.thumbnailUrl}
                          alt={relatedVideo.title}
                          className="w-full aspect-video object-cover rounded-xl"
                        />
                        <span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1 rounded">
                          {Math.floor(relatedVideo.duration / 60)}:{(relatedVideo.duration % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm line-clamp-2 mb-1 text-neutral-900">{relatedVideo.title}</h3>
                        <p className="text-xs text-neutral-600">{relatedVideo.channel.name}</p>
                        {relatedVideo.channel.verified && (
                          <svg className="inline w-3 h-3 text-neutral-500 ml-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                        <p className="text-xs text-neutral-500">
                          {formatViews(relatedVideo.views)} views &middot; {formatDate(relatedVideo.publishedAt)}
                        </p>
                      </div>
                    </Link>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
