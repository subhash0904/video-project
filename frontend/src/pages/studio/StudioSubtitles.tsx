import { useState } from 'react';

type SubTab = 'all' | 'drafts' | 'published';

export default function StudioSubtitles() {
  const [activeTab, setActiveTab] = useState<SubTab>('all');

  const tabs: { id: SubTab; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'drafts', label: 'Drafts' },
    { id: 'published', label: 'Published' },
  ];

  return (
    <div className="p-8 text-white">
      <h1 className="text-3xl font-semibold mb-8">Channel subtitles</h1>

      {/* Tabs */}
      <div className="flex gap-6 mb-8 border-b border-gray-700">
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

      {/* Table Header */}
      <div className="bg-[#212121] rounded-lg overflow-hidden">
        <div className="grid grid-cols-3 gap-4 p-4 bg-[#3d3d3d] text-sm font-medium">
          <div>Video</div>
          <div>Languages</div>
          <div>Modified on</div>
        </div>

        {/* Empty State */}
        <div className="p-16 text-center">
          <p className="text-gray-400">
            {activeTab === 'drafts' ? 'No draft subtitles' : activeTab === 'published' ? 'No published subtitles' : 'No subtitles yet'}
          </p>
        </div>
      </div>
    </div>
  );
}
