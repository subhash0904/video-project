import { useState } from 'react';

interface StreamSettings {
  title: string;
  description: string;
  category: string;
  visibility: 'public' | 'unlisted' | 'private';
  enableChat: boolean;
  enableDvr: boolean;
  latencyMode: 'normal' | 'low' | 'ultra-low';
}

export default function StudioGoLive() {
  const [isLive, setIsLive] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [settings, setSettings] = useState<StreamSettings>({
    title: '',
    description: '',
    category: 'Gaming',
    visibility: 'public',
    enableChat: true,
    enableDvr: true,
    latencyMode: 'normal',
  });

  // Generate a mock stream key
  const streamKey = 'xxxx-xxxx-xxxx-xxxx-xxxx';
  const rtmpUrl = 'rtmp://live.vidplatform.com/live';

  const handleGoLive = () => {
    if (!settings.title.trim()) {
      alert('Please enter a stream title');
      return;
    }
    setIsLive(true);
  };

  const handleEndStream = () => {
    if (confirm('Are you sure you want to end the stream?')) {
      setIsLive(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="p-8 text-white min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Go live</h1>
            <p className="text-gray-400 mt-1">Stream directly to your audience</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowScheduleModal(true)}
              className="px-4 py-2 bg-[#3d3d3d] hover:bg-[#4d4d4d] rounded-lg transition-colors"
            >
              Schedule stream
            </button>
            {isLive ? (
              <button
                onClick={handleEndStream}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <span className="w-3 h-3 bg-white rounded-full animate-pulse"></span>
                End stream
              </button>
            ) : (
              <button
                onClick={handleGoLive}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition-colors flex items-center gap-2"
              >
                <LiveIcon />
                Go live
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Preview */}
            <div className="bg-[#212121] rounded-xl overflow-hidden">
              <div className="aspect-video bg-black flex items-center justify-center relative">
                {isLive ? (
                  <>
                    <div className="absolute top-4 left-4 px-3 py-1 bg-red-600 rounded text-sm font-semibold flex items-center gap-2">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                      LIVE
                    </div>
                    <div className="absolute top-4 right-4 px-3 py-1 bg-black/60 rounded text-sm">
                      <span className="text-red-500">●</span> 0 watching
                    </div>
                    <div className="text-gray-500 text-center">
                      <CameraIcon className="w-16 h-16 mx-auto mb-2" />
                      <p>Live preview will appear here</p>
                      <p className="text-sm text-gray-600">Connect your streaming software to see the preview</p>
                    </div>
                  </>
                ) : (
                  <div className="text-gray-500 text-center">
                    <CameraIcon className="w-16 h-16 mx-auto mb-2" />
                    <p>Your stream preview will appear here</p>
                    <p className="text-sm text-gray-600">Connect your streaming software and go live</p>
                  </div>
                )}
              </div>
            </div>

            {/* Stream Settings */}
            <div className="bg-[#212121] rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Stream settings</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Title (required)</label>
                  <input
                    type="text"
                    value={settings.title}
                    onChange={(e) => setSettings({ ...settings, title: e.target.value })}
                    placeholder="Enter stream title..."
                    className="w-full bg-[#121212] border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none"
                    disabled={isLive}
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-1">Description</label>
                  <textarea
                    value={settings.description}
                    onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                    placeholder="Tell viewers about your stream..."
                    rows={3}
                    className="w-full bg-[#121212] border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none resize-none"
                    disabled={isLive}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Category</label>
                    <select
                      value={settings.category}
                      onChange={(e) => setSettings({ ...settings, category: e.target.value })}
                      className="w-full bg-[#121212] border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none"
                      disabled={isLive}
                    >
                      <option value="Gaming">Gaming</option>
                      <option value="Music">Music</option>
                      <option value="Education">Education</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="Sports">Sports</option>
                      <option value="News">News</option>
                      <option value="Technology">Technology</option>
                      <option value="Talk Shows">Talk Shows</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Visibility</label>
                    <select
                      value={settings.visibility}
                      onChange={(e) => setSettings({ ...settings, visibility: e.target.value as StreamSettings['visibility'] })}
                      className="w-full bg-[#121212] border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none"
                      disabled={isLive}
                    >
                      <option value="public">Public</option>
                      <option value="unlisted">Unlisted</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Stream Health */}
            {isLive && (
              <div className="bg-[#212121] rounded-xl p-6">
                <h2 className="text-xl font-semibold mb-4">Stream health</h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-[#121212] rounded-lg p-4">
                    <div className="text-gray-400 text-sm">Status</div>
                    <div className="text-green-500 font-semibold flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                      Excellent
                    </div>
                  </div>
                  <div className="bg-[#121212] rounded-lg p-4">
                    <div className="text-gray-400 text-sm">Bitrate</div>
                    <div className="font-semibold">-- kbps</div>
                  </div>
                  <div className="bg-[#121212] rounded-lg p-4">
                    <div className="text-gray-400 text-sm">Dropped frames</div>
                    <div className="font-semibold">0%</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Right column */}
          <div className="space-y-6">
            {/* Stream Key */}
            <div className="bg-[#212121] rounded-xl p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <KeyIcon className="w-5 h-5" />
                Stream key
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Use this key in your streaming software (OBS, Streamlabs, etc.)
              </p>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Stream URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={rtmpUrl}
                      readOnly
                      className="flex-1 bg-[#121212] border border-gray-700 rounded px-3 py-2 text-sm text-gray-300"
                    />
                    <button
                      onClick={() => copyToClipboard(rtmpUrl)}
                      className="px-3 py-2 bg-[#3d3d3d] hover:bg-[#4d4d4d] rounded text-sm transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Stream key</label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={streamKey}
                      readOnly
                      className="flex-1 bg-[#121212] border border-gray-700 rounded px-3 py-2 text-sm text-gray-300"
                    />
                    <button
                      onClick={() => copyToClipboard(streamKey)}
                      className="px-3 py-2 bg-[#3d3d3d] hover:bg-[#4d4d4d] rounded text-sm transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>

              <button className="w-full mt-4 px-4 py-2 border border-gray-600 rounded-lg text-sm hover:bg-[#3d3d3d] transition-colors">
                Reset stream key
              </button>
            </div>

            {/* Advanced Options */}
            <div className="bg-[#212121] rounded-xl p-6">
              <h3 className="font-semibold mb-4">Advanced options</h3>
              
              <div className="space-y-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm">Enable live chat</span>
                  <input
                    type="checkbox"
                    checked={settings.enableChat}
                    onChange={(e) => setSettings({ ...settings, enableChat: e.target.checked })}
                    className="w-5 h-5 rounded bg-[#121212] border-gray-600"
                    disabled={isLive}
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm">Enable DVR</span>
                  <input
                    type="checkbox"
                    checked={settings.enableDvr}
                    onChange={(e) => setSettings({ ...settings, enableDvr: e.target.checked })}
                    className="w-5 h-5 rounded bg-[#121212] border-gray-600"
                    disabled={isLive}
                  />
                </label>

                <div>
                  <label className="block text-sm mb-2">Latency</label>
                  <select
                    value={settings.latencyMode}
                    onChange={(e) => setSettings({ ...settings, latencyMode: e.target.value as StreamSettings['latencyMode'] })}
                    className="w-full bg-[#121212] border border-gray-700 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                    disabled={isLive}
                  >
                    <option value="normal">Normal latency (~15-30s)</option>
                    <option value="low">Low latency (~5-10s)</option>
                    <option value="ultra-low">Ultra low latency (~2-5s)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-[#212121] rounded-xl p-6">
              <h3 className="font-semibold mb-4">Quick actions</h3>
              <div className="space-y-2">
                <button className="w-full px-4 py-2 text-left text-sm hover:bg-[#3d3d3d] rounded-lg transition-colors flex items-center gap-3">
                  <ShareIcon className="w-4 h-4" />
                  Share stream
                </button>
                <button className="w-full px-4 py-2 text-left text-sm hover:bg-[#3d3d3d] rounded-lg transition-colors flex items-center gap-3">
                  <PollIcon className="w-4 h-4" />
                  Create poll
                </button>
                <button className="w-full px-4 py-2 text-left text-sm hover:bg-[#3d3d3d] rounded-lg transition-colors flex items-center gap-3">
                  <ClipIcon className="w-4 h-4" />
                  Create clip
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-[#212121] rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Schedule a stream</h2>
            <p className="text-gray-400 text-sm mb-4">
              Set a date and time to go live. Your subscribers will be notified.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Date</label>
                <input
                  type="date"
                  className="w-full bg-[#121212] border border-gray-700 rounded-lg px-4 py-3 text-white"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Time</label>
                <input
                  type="time"
                  className="w-full bg-[#121212] border border-gray-700 rounded-lg px-4 py-3 text-white"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="flex-1 px-4 py-2 bg-[#3d3d3d] hover:bg-[#4d4d4d] rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Icons
function LiveIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" />
    </svg>
  );
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function KeyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  );
}

function ShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
    </svg>
  );
}

function PollIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}

function ClipIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
