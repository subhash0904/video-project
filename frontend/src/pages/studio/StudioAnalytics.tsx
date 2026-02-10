import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api';

export default function StudioAnalytics() {
  const [stats, setStats] = useState({ views: 0, watchTimeHours: 0, subscribers: 0 });
  const [period, setPeriod] = useState<'7d' | '28d' | '90d' | 'all'>('28d');

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data: any = await apiClient.get(`/analytics/overview?period=${period}`);
        if (data.success && data.data) {
          setStats({
            views: data.data.views || 0,
            watchTimeHours: data.data.watchTimeHours || 0,
            subscribers: data.data.subscribers || 0,
          });
        }
      } catch {
        // API may not exist yet — leave defaults
      }
    };
    fetchAnalytics();
  }, [period]);

  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString();

  return (
    <div className="p-8 text-white">
      <h1 className="text-3xl font-semibold mb-4">Analytics</h1>

      {/* Period selector */}
      <div className="flex gap-2 mb-8">
        {(['7d', '28d', '90d', 'all'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-1.5 rounded-full text-sm ${period === p ? 'bg-white text-black' : 'bg-[#3d3d3d] text-gray-300 hover:bg-gray-700'}`}
          >
            {p === 'all' ? 'Lifetime' : `Last ${p}`}
          </button>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-[#212121] rounded-lg p-6">
          <h3 className="text-sm text-gray-400 mb-2">Views</h3>
          <div className="text-4xl font-bold">{fmt(stats.views)}</div>
          <p className="text-xs text-gray-500 mt-2">{period === 'all' ? 'All time' : `Last ${period}`}</p>
        </div>
        <div className="bg-[#212121] rounded-lg p-6">
          <h3 className="text-sm text-gray-400 mb-2">Watch time (hours)</h3>
          <div className="text-4xl font-bold">{fmt(stats.watchTimeHours)}</div>
          <p className="text-xs text-gray-500 mt-2">{period === 'all' ? 'All time' : `Last ${period}`}</p>
        </div>
        <div className="bg-[#212121] rounded-lg p-6">
          <h3 className="text-sm text-gray-400 mb-2">Subscribers</h3>
          <div className="text-4xl font-bold">{fmt(stats.subscribers)}</div>
          <p className="text-xs text-gray-500 mt-2">{period === 'all' ? 'All time' : `Last ${period}`}</p>
        </div>
      </div>

      <div className="mt-6 bg-[#212121] rounded-lg p-6 text-center py-12">
        <p className="text-gray-400">
          {stats.views > 0 ? 'Chart visualization coming soon' : 'Analytics data will appear once you publish videos'}
        </p>
      </div>
    </div>
  );
}
