import { useState } from 'react';

const audioCategories = ['All', 'Music', 'Sound Effects', 'Ambient', 'Royalty Free'];

const sampleTracks = [
  { id: '1', title: 'Upbeat Corporate', artist: 'Audio Library', duration: '3:24', genre: 'Music', mood: 'Happy' },
  { id: '2', title: 'Calm Piano', artist: 'Audio Library', duration: '2:45', genre: 'Music', mood: 'Calm' },
  { id: '3', title: 'Whoosh Transition', artist: 'Sound Effects', duration: '0:03', genre: 'Sound Effects', mood: 'Neutral' },
  { id: '4', title: 'Rain Ambience', artist: 'Nature Sounds', duration: '5:00', genre: 'Ambient', mood: 'Calm' },
  { id: '5', title: 'Pop Beat', artist: 'Audio Library', duration: '4:12', genre: 'Music', mood: 'Energetic' },
  { id: '6', title: 'Click Sound', artist: 'Sound Effects', duration: '0:01', genre: 'Sound Effects', mood: 'Neutral' },
];

export default function StudioAudioLibrary() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [playing, setPlaying] = useState<string | null>(null);

  const filtered = sampleTracks.filter((t) => {
    const matchCategory = activeCategory === 'All' || t.genre === activeCategory;
    const matchSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.artist.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Audio Library</h1>
      <p className="text-neutral-600 mb-6">
        Browse free music and sound effects to use in your videos.
      </p>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search audio tracks..."
          className="w-full max-w-md px-4 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
        />
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {audioCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Tracks list */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-neutral-50 text-sm font-semibold text-neutral-600 border-b">
          <div className="col-span-5">Track</div>
          <div className="col-span-2">Genre</div>
          <div className="col-span-2">Mood</div>
          <div className="col-span-1">Duration</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>
        {filtered.length === 0 ? (
          <div className="px-4 py-8 text-center text-neutral-500">No tracks found</div>
        ) : (
          filtered.map((track) => (
            <div key={track.id} className="grid grid-cols-12 gap-4 px-4 py-3 border-b border-neutral-100 items-center hover:bg-neutral-50">
              <div className="col-span-5">
                <p className="font-medium text-neutral-900">{track.title}</p>
                <p className="text-sm text-neutral-500">{track.artist}</p>
              </div>
              <div className="col-span-2 text-sm text-neutral-600">{track.genre}</div>
              <div className="col-span-2 text-sm text-neutral-600">{track.mood}</div>
              <div className="col-span-1 text-sm text-neutral-600">{track.duration}</div>
              <div className="col-span-2 flex justify-end gap-2">
                <button
                  onClick={() => setPlaying(playing === track.id ? null : track.id)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${playing === track.id ? 'bg-neutral-900 text-white' : 'bg-neutral-100 hover:bg-neutral-200'}`}
                >
                  {playing === track.id ? 'Stop' : 'Preview'}
                </button>
                <button
                  onClick={() => { navigator.clipboard.writeText(track.title); alert(`"${track.title}" added to your project`); }}
                  className="px-3 py-1.5 text-sm bg-red-600 text-white hover:bg-red-700 rounded-lg transition-colors"
                >
                  Use
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
