import { useState } from 'react';

export default function StudioSettings() {
  const [defaultUploadVisibility, setDefaultUploadVisibility] = useState('public');
  const [defaultCategory, setDefaultCategory] = useState('ENTERTAINMENT');
  const [allowComments, setAllowComments] = useState(true);
  const [notifySubscribers, setNotifySubscribers] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // Save settings to localStorage or API
    localStorage.setItem('studioSettings', JSON.stringify({
      defaultUploadVisibility,
      defaultCategory,
      allowComments,
      notifySubscribers,
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Channel Settings</h1>

      <div className="max-w-2xl space-y-8">
        {/* Upload Defaults */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Upload Defaults</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Default Visibility</label>
              <select
                value={defaultUploadVisibility}
                onChange={(e) => setDefaultUploadVisibility(e.target.value)}
                className="w-full max-w-xs px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
              >
                <option value="public">Public</option>
                <option value="unlisted">Unlisted</option>
                <option value="private">Private</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">Default Category</label>
              <select
                value={defaultCategory}
                onChange={(e) => setDefaultCategory(e.target.value)}
                className="w-full max-w-xs px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none"
              >
                <option value="ENTERTAINMENT">Entertainment</option>
                <option value="MUSIC">Music</option>
                <option value="GAMING">Gaming</option>
                <option value="EDUCATION">Education</option>
                <option value="SCIENCE_TECH">Science & Tech</option>
                <option value="SPORTS">Sports</option>
                <option value="NEWS_POLITICS">News & Politics</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
        </section>

        {/* Community */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Community</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={allowComments}
                onChange={(e) => setAllowComments(e.target.checked)}
                className="w-4 h-4 accent-red-600"
              />
              <span className="text-sm text-neutral-700">Allow comments on new videos by default</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={notifySubscribers}
                onChange={(e) => setNotifySubscribers(e.target.checked)}
                className="w-4 h-4 accent-red-600"
              />
              <span className="text-sm text-neutral-700">Notify subscribers when uploading a new video</span>
            </label>
          </div>
        </section>

        {/* Save */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition-colors"
          >
            Save settings
          </button>
          {saved && <span className="text-green-600 text-sm font-medium">Settings saved!</span>}
        </div>
      </div>
    </div>
  );
}
