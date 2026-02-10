import { useState } from 'react';

type Tab = 'comments' | 'posts' | 'mentions';
type SortOrder = 'newest' | 'oldest' | 'popular';

export default function StudioCommunity() {
  const [activeTab, setActiveTab] = useState<Tab>('comments');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [filters, setFilters] = useState({ keywords: false, questions: false, publicSubs: false });

  const tabs: { id: Tab; label: string }[] = [
    { id: 'comments', label: 'Comments' },
    { id: 'posts', label: 'Viewer posts' },
    { id: 'mentions', label: 'Mentions' },
  ];

  const toggleFilter = (key: keyof typeof filters) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const emptyMessages: Record<Tab, string> = {
    comments: 'Comments will appear here once viewers start engaging with your videos',
    posts: 'Viewer posts will appear here',
    mentions: 'Mentions of your channel will appear here',
  };

  return (
    <div className="p-8 text-white">
      <h1 className="text-3xl font-semibold mb-8">Community</h1>

      {/* Tabs */}
      <div className="flex gap-6 mb-6 border-b border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 px-2 border-b-2 transition ${
              activeTab === tab.id ? 'border-white text-white' : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <button className="flex items-center gap-2 px-4 py-2 bg-[#3d3d3d] hover:bg-gray-700 rounded">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z" />
          </svg>
          Published
        </button>
        <div className="relative">
          <button
            onClick={() => { setShowSortMenu(!showSortMenu); setShowFilterMenu(false); }}
            className="flex items-center gap-2 px-4 py-2 bg-[#3d3d3d] hover:bg-gray-700 rounded"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 18h6v-2H3v2zM3 6v2h18V6H3zm0 7h12v-2H3v2z" />
            </svg>
            Sort by: {sortOrder}
          </button>
          {showSortMenu && (
            <div className="absolute top-full left-0 mt-1 w-44 bg-[#282828] border border-gray-700 rounded-lg shadow-xl z-10">
              {(['newest', 'oldest', 'popular'] as SortOrder[]).map((order) => (
                <button
                  key={order}
                  onClick={() => { setSortOrder(order); setShowSortMenu(false); }}
                  className={`w-full px-4 py-2.5 text-left text-sm hover:bg-[#3d3d3d] capitalize ${sortOrder === order ? 'text-blue-400' : 'text-white'}`}
                >
                  {order}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="relative">
          <button
            onClick={() => { setShowFilterMenu(!showFilterMenu); setShowSortMenu(false); }}
            className={`flex items-center gap-2 px-4 py-2 rounded ${showFilterMenu ? 'bg-gray-700' : 'bg-[#3d3d3d] hover:bg-gray-700'}`}
          >
            Filter
          </button>
          {showFilterMenu && (
            <div className="absolute top-full left-0 mt-1 bg-[#212121] rounded-lg p-4 w-56 shadow-xl z-10 border border-gray-700">
              <div className="space-y-2">
                <button onClick={() => toggleFilter('keywords')} className="flex items-center gap-3 p-2 hover:bg-[#3d3d3d] rounded w-full text-left">
                  <input type="checkbox" checked={filters.keywords} readOnly className="w-4 h-4 accent-blue-500" />
                  <span className="text-sm">Keywords</span>
                </button>
                <button onClick={() => toggleFilter('questions')} className="flex items-center gap-3 p-2 hover:bg-[#3d3d3d] rounded w-full text-left">
                  <input type="checkbox" checked={filters.questions} readOnly className="w-4 h-4 accent-blue-500" />
                  <span className="text-sm">Contains questions</span>
                </button>
                <button onClick={() => toggleFilter('publicSubs')} className="flex items-center gap-3 p-2 hover:bg-[#3d3d3d] rounded w-full text-left">
                  <input type="checkbox" checked={filters.publicSubs} readOnly className="w-4 h-4 accent-blue-500" />
                  <span className="text-sm">Public subscribers</span>
                </button>
                <div className="border-t border-gray-700 my-2" />
                <button
                  onClick={() => { localStorage.setItem('communityFilters', JSON.stringify(filters)); setShowFilterMenu(false); }}
                  className="p-2 text-sm text-blue-400 hover:bg-[#3d3d3d] rounded w-full text-left"
                >
                  Set current filters as default
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Empty State */}
      <div className="text-center py-16">
        <div className="inline-block mb-6">
          <svg className="w-32 h-32 text-gray-600" viewBox="0 0 200 200" fill="currentColor">
            <circle cx="100" cy="60" r="30" />
            <path d="M100 100 Q80 120, 70 140 L130 140 Q120 120, 100 100Z" />
            <ellipse cx="100" cy="160" rx="40" ry="15" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold mb-3">No content available</h3>
        <p className="text-gray-400">{emptyMessages[activeTab]}</p>
      </div>
    </div>
  );
}
