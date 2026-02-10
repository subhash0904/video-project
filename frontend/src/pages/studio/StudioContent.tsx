import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../lib/api';

interface StudioVideo {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl: string;
  publishedAt: string;
  views: number | string;
  commentCount?: number;
  likes?: number;
  status?: string;
  visibility?: string;
}

export default function StudioContent() {
  const [videos, setVideos] = useState<StudioVideo[]>([]);
  const [filter, setFilter] = useState<'all' | 'published' | 'drafts'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      // Fetch current user's channel videos (not global feed)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await apiClient.get('/videos/my-videos') as any;
      if (response.success || response.data) {
        setVideos((response.data || response.videos || []).slice(0, 50));
      } else {
        // Fallback: try fetching via channel
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const feedResponse = await apiClient.get('/videos/feed') as any;
        if (feedResponse.success || feedResponse.data) {
          setVideos((feedResponse.data || []).slice(0, 10));
        }
      }
    } catch (error) {
      console.error('Failed to load videos:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 text-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-semibold">Channel content</h1>
        <Link
          to="/upload"
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18 13h-5v5c0 .55-.45 1-1 1s-1-.45-1-1v-5H6c-.55 0-1-.45-1-1s.45-1 1-1h5V6c0-.55.45-1 1-1s1 .45 1 1v5h5c.55 0 1 .45 1 1s-.45 1-1 1z"/>
          </svg>
          CREATE
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6 border-b border-gray-700">
        <button
          onClick={() => setFilter('all')}
          className={`pb-3 px-2 border-b-2 transition ${
            filter === 'all' ? 'border-white text-white' : 'border-transparent text-gray-400'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('published')}
          className={`pb-3 px-2 border-b-2 transition ${
            filter === 'published' ? 'border-white text-white' : 'border-transparent text-gray-400'
          }`}
        >
          Published
        </button>
        <button
          onClick={() => setFilter('drafts')}
          className={`pb-3 px-2 border-b-2 transition ${
            filter === 'drafts' ? 'border-white text-white' : 'border-transparent text-gray-400'
          }`}
        >
          Drafts
        </button>
      </div>

      {/* Videos Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : videos.filter(v => {
        if (filter === 'published') return v.status === 'PUBLISHED' || v.visibility === 'PUBLIC';
        if (filter === 'drafts') return v.status === 'DRAFT' || v.visibility === 'DRAFT';
        return true;
      }).length === 0 && videos.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📹</div>
          <h3 className="text-xl font-semibold mb-2">No videos yet</h3>
          <p className="text-gray-400 mb-6">Upload your first video to get started</p>
          <Link
            to="/upload"
            className="inline-block px-6 py-2.5 bg-blue-600 hover:bg-blue-700 rounded"
          >
            Upload video
          </Link>
        </div>
      ) : (
        <div className="bg-[#212121] rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-[#3d3d3d]">
              <tr>
                <th className="text-left p-4 font-medium">Video</th>
                <th className="text-left p-4 font-medium">Visibility</th>
                <th className="text-left p-4 font-medium">Date</th>
                <th className="text-left p-4 font-medium">Views</th>
                <th className="text-left p-4 font-medium">Comments</th>
                <th className="text-left p-4 font-medium">Likes</th>
              </tr>
            </thead>
            <tbody>
              {videos.filter(v => {
                if (filter === 'published') return v.status === 'PUBLISHED' || v.visibility === 'PUBLIC';
                if (filter === 'drafts') return v.status === 'DRAFT' || v.visibility === 'DRAFT';
                return true;
              }).map((video) => (
                <tr key={video.id} className="border-t border-gray-700 hover:bg-[#3d3d3d]">
                  <td className="p-4">
                    <div className="flex gap-3">
                      <img
                        src={video.thumbnailUrl}
                        alt={video.title}
                        className="w-32 h-18 object-cover rounded"
                      />
                      <div>
                        <p className="font-medium mb-1 line-clamp-2">{video.title}</p>
                        <p className="text-sm text-gray-400">{video.description?.slice(0, 60)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-sm">
                    <span className="px-2 py-1 bg-green-900 text-green-200 rounded">
                      Public
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-300">
                    {new Date(video.publishedAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-sm">{Number(video.views).toLocaleString()}</td>
                  <td className="p-4 text-sm">{video.commentCount || 0}</td>
                  <td className="p-4 text-sm">{video.likes || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
