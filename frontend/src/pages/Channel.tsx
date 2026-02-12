import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import VideoCard from '../components/video/VideoCard';
import type { Video } from '../types';
import { channelsApi, usersApi } from "../lib/api";

interface Channel {
  id: string;
  name: string;
  handle: string;
  description: string;
  avatarUrl: string;
  bannerUrl?: string;
  verified: boolean;
  subscriberCount: number;
  createdAt: string;
}

type Tab = 'home' | 'videos' | 'shorts' | 'playlists' | 'community' | 'about';
type SortOption = 'latest' | 'popular' | 'oldest';

export default function Channel() {
  const { handle } = useParams<{ handle: string }>();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('latest');

  const fetchChannelData = useCallback(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await channelsApi.getChannel(handle!);
      if (data.success) {
        setChannel(data.data);
        return data.data as Channel;
      }
    } catch (error) {
      console.error('Failed to fetch channel:', error);
    } finally {
      setLoading(false);
    }
    return null;
  }, [handle]);

  const fetchChannelVideos = useCallback(async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await channelsApi.getChannelVideos(handle!);
      if (data.success) {
        setVideos(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    }
  }, [handle]);

  useEffect(() => {
    if (!handle) return;

    const init = async () => {
      const channelData = await fetchChannelData();
      fetchChannelVideos();

      // Check subscription only after channel is loaded
      if (channelData) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const statusData: any = await usersApi.checkSubscription(channelData.id);
          if (statusData.success) {
            setIsSubscribed(statusData.data?.isSubscribed ?? false);
          }
        } catch {
          // Not subscribed or not authenticated
        }
      }
    };

    init();
  }, [handle, fetchChannelData, fetchChannelVideos]);

  const toggleSubscribe = async () => {
    if (!channel) return;
    try {
      if (isSubscribed) {
        await usersApi.unsubscribe(channel.id);
      } else {
        await usersApi.subscribe(channel.id);
      }
      setIsSubscribed(!isSubscribed);
      setChannel({
        ...channel,
        subscriberCount: channel.subscriberCount + (isSubscribed ? -1 : 1),
      });
    } catch (error) {
      console.error('Failed to toggle subscription:', error);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getSortedVideos = () => {
    const sorted = [...videos];
    switch (sortBy) {
      case 'popular':
        return sorted.sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0));
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.publishedAt).getTime() - new Date(b.publishedAt).getTime());
      default: // latest
        return sorted.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
    }
  };

  if (loading) {
    return (
       <div className="flex justify-center items-center min-h-screen">
        <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <h2 className="text-2xl font-bold mb-4">Channel not found</h2>
        <Link to="/" className="text-blue-600 hover:underline">Return to home</Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Channel Banner */}
      {channel.bannerUrl ? (
        <div className="w-full h-48">
          <img src={channel.bannerUrl} alt="Channel banner" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-full h-36 bg-gradient-to-r from-red-700 via-red-600 to-red-500" />
      )}

      {/* Channel Header */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row gap-6 py-6">
          <img
            src={channel.avatarUrl}
            alt={channel.name}
            className="w-32 h-32 rounded-full border-4 border-white shadow-lg"
          />
          
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{channel.name}</h1>
              {channel.verified && (
                <svg className="w-6 h-6 text-neutral-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <p className="text-neutral-600 mt-1">{channel.handle.startsWith('@') ? channel.handle : `@${channel.handle}`}</p>
            <div className="flex items-center gap-3 mt-2 text-sm text-neutral-600">
              <span>{formatNumber(channel.subscriberCount)} subscribers</span>
              <span>&middot;</span>
              <span>{videos.length} videos</span>
            </div>
            {channel.description && (
              <p className="mt-3 text-sm text-neutral-700 max-w-2xl line-clamp-2">{channel.description}</p>
            )}
          </div>

          <div className="flex items-start">
            <button
              onClick={toggleSubscribe}
              className={`px-6 py-2 rounded-full font-semibold transition ${
                isSubscribed
                  ? 'bg-neutral-200 hover:bg-neutral-300 text-black'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {isSubscribed ? 'Subscribed' : 'Subscribe'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-neutral-200 overflow-x-auto">
          <div className="flex gap-8">
            {(['home', 'videos', 'shorts', 'playlists', 'community', 'about'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 font-semibold capitalize border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-black text-black'
                    : 'border-transparent text-neutral-600 hover:text-black'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="py-6">
          {activeTab === 'home' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Latest Videos</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {videos.slice(0, 8).map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
              {videos.length === 0 && (
                <div className="text-center py-12 text-neutral-500">
                  <p className="text-lg font-semibold">No videos yet</p>
                  <p className="text-sm">This channel hasn't uploaded any videos</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'videos' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Uploads</h2>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="px-4 py-2 border border-neutral-200 rounded-full bg-white text-sm cursor-pointer"
                >
                  <option value="latest">Latest</option>
                  <option value="popular">Popular</option>
                  <option value="oldest">Oldest</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {getSortedVideos().map((video) => (
                  <VideoCard key={video.id} video={video} />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'shorts' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Shorts</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {videos.filter(v => v.duration < 60).map((video) => (
                  <Link
                    key={video.id}
                    to={`/shorts/${video.id}`}
                    className="aspect-9/16 rounded-xl overflow-hidden relative group hover:scale-105 transition-transform"
                  >
                    <img src={video.thumbnailUrl} alt={video.title} className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-linear-to-t from-black/80 to-transparent">
                      <h3 className="text-white font-semibold text-sm line-clamp-2">{video.title}</h3>
                      <p className="text-white/90 text-xs mt-1">
                        {formatNumber(typeof video.views === 'bigint' ? Number(video.views) : video.views)} views
                      </p>
                    </div>
                  </Link>
                ))}
                {videos.filter(v => v.duration < 60).length === 0 && (
                  <div className="col-span-full text-center py-12 text-neutral-500">
                    <p>No shorts yet</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'playlists' && (
            <div>
              <h2 className="text-xl font-bold mb-4">Created Playlists</h2>
              <div className="text-center py-12 text-neutral-500">
                <svg className="w-16 h-16 mx-auto mb-3 text-neutral-300" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                </svg>
                <p className="font-semibold">No playlists yet</p>
                <p className="text-sm mt-1">This channel hasn&apos;t created any playlists</p>
              </div>
            </div>
          )}

          {activeTab === 'community' && (
            <div className="max-w-3xl">
              <h2 className="text-xl font-bold mb-4">Community Posts</h2>
              <div className="text-center py-12 text-neutral-500">
                <svg className="w-16 h-16 mx-auto mb-3 text-neutral-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                </svg>
                <p className="font-semibold">No community posts yet</p>
                <p className="text-sm mt-1">This channel hasn&apos;t posted anything</p>
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="max-w-4xl">
              <h2 className="text-xl font-bold mb-6">About</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-neutral-700 whitespace-pre-wrap">{channel.description || 'No description provided.'}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-3">Channel Details</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-neutral-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        <span className="text-neutral-600">Joined {new Date(channel.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-neutral-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                        </svg>
                        <span className="text-neutral-600">{formatNumber(videos.reduce((sum, v) => sum + (typeof v.views === 'bigint' ? Number(v.views) : v.views), 0))} total views</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-3">Stats</h3>
                    <div className="space-y-2 text-sm text-neutral-700">
                      <p>{formatNumber(channel.subscriberCount)} subscribers</p>
                      <p>{videos.length} videos uploaded</p>
                      <p>{videos.filter(v => v.duration < 60).length} shorts</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
