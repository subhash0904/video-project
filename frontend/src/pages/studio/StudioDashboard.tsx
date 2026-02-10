import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api';

export default function StudioDashboard() {
  const [stats, setStats] = useState({ views: 0, watchTime: 0, subscribers: 0, videos: 0, newSubs: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = await apiClient.get('/analytics/dashboard');
        if (data.success && data.data) {
          setStats({
            views: data.data.views || 0,
            watchTime: data.data.watchTime || 0,
            subscribers: data.data.subscribers || 0,
            videos: data.data.videos || 0,
            newSubs: data.data.newSubscribers || 0,
          });
        }
      } catch {
        // API may not exist yet — leave defaults
      }
    };
    fetchStats();
  }, []);

  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();

  return (
    <div className="p-8 text-white">
      <h1 className="text-4xl font-bold mb-8">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-[#212121] rounded-lg p-6">
          <div className="text-gray-400 text-sm mb-2">Views</div>
          <div className="text-3xl font-bold">{fmt(stats.views)}</div>
          <div className="text-gray-500 text-xs mt-1">Last 48 hours</div>
        </div>
        <div className="bg-[#212121] rounded-lg p-6">
          <div className="text-gray-400 text-sm mb-2">Watch time (mins)</div>
          <div className="text-3xl font-bold">{fmt(stats.watchTime)}</div>
          <div className="text-gray-500 text-xs mt-1">Last 48 hours</div>
        </div>
        <div className="bg-[#212121] rounded-lg p-6">
          <div className="text-gray-400 text-sm mb-2">Subscribers</div>
          <div className="text-3xl font-bold">{fmt(stats.subscribers)}</div>
          <div className="text-gray-500 text-xs mt-1">+{stats.newSubs} this week</div>
        </div>
        <div className="bg-[#212121] rounded-lg p-6">
          <div className="text-gray-400 text-sm mb-2">Videos</div>
          <div className="text-3xl font-bold">{stats.videos}</div>
          <div className="text-gray-500 text-xs mt-1">Published</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="bg-[#212121] rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Latest analytics</h2>
        <div className="text-center py-12 text-gray-400">
          <svg className="w-24 h-24 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p>No data available yet</p>
          <p className="text-sm text-gray-500 mt-2">
            Upload and publish videos to see analytics
          </p>
        </div>
      </div>
    </div>
  );
}
