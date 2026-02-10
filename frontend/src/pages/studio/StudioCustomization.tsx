import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function StudioCustomization() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'profile' | 'home'>('profile');
  const [channelName, setChannelName] = useState('');
  const [handle, setHandle] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [links, setLinks] = useState<{ title: string; url: string }[]>([]);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const watermarkInputRef = useRef<HTMLInputElement>(null);
  const channelUrl = `${window.location.origin}/channel/${handle || 'your-handle'}`;

  const markDirty = () => { if (!dirty) setDirty(true); };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setBannerPreview(URL.createObjectURL(file)); markDirty(); }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setAvatarPreview(URL.createObjectURL(file)); markDirty(); }
  };

  const handleWatermarkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { markDirty(); alert(`Watermark "${file.name}" selected`); }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(channelUrl);
      alert('Channel URL copied!');
    } catch { /* ignore */ }
  };

  const handleAddLink = () => {
    if (newLinkTitle.trim() && newLinkUrl.trim()) {
      setLinks((prev) => [...prev, { title: newLinkTitle.trim(), url: newLinkUrl.trim() }]);
      setNewLinkTitle('');
      setNewLinkUrl('');
      setShowLinkForm(false);
      markDirty();
    }
  };

  const handleCancel = () => {
    setChannelName(''); setHandle(''); setDescription(''); setEmail('');
    setBannerPreview(null); setAvatarPreview(null); setLinks([]);
    setDirty(false);
  };

  const handlePublish = () => {
    // In production, this would POST to the API
    localStorage.setItem('channelCustomization', JSON.stringify({
      channelName, handle, description, email, links,
    }));
    setSaved(true);
    setDirty(false);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-8 text-white">
      <div className="max-w-5xl">
        <h1 className="text-3xl font-semibold mb-8">Channel customization</h1>

        {/* Tabs */}
        <div className="flex gap-6 mb-8 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-3 px-2 border-b-2 ${
              activeTab === 'profile' ? 'border-white' : 'border-transparent text-gray-400'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab('home')}
            className={`pb-3 px-2 border-b-2 ${
              activeTab === 'home' ? 'border-white' : 'border-transparent text-gray-400'
            }`}
          >
            Home tab
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-4 mb-8 items-center">
          <button onClick={() => navigate(`/channel/${handle || 'me'}`)} className="px-4 py-2 text-blue-400 hover:bg-[#3d3d3d] rounded">
            View channel
          </button>
          <button onClick={handleCancel} disabled={!dirty} className="px-4 py-2 text-gray-400 hover:bg-[#3d3d3d] rounded disabled:opacity-40">
            Cancel
          </button>
          <button onClick={handlePublish} disabled={!dirty} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-40">
            Publish
          </button>
          {saved && <span className="text-green-400 text-sm">Published!</span>}
        </div>

        {activeTab === 'profile' && (
          <div className="space-y-8">
            {/* Banner Image */}
            <div className="bg-[#212121] rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Banner image</h3>
              <p className="text-sm text-gray-400 mb-4">
                This image will appear across the top of your channel
              </p>
              <div className="flex items-center gap-6">
                <div className="w-64 h-36 bg-red-600 rounded flex items-center justify-center relative overflow-hidden">
                  {bannerPreview ? (
                    <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-16 h-16 text-white/50 absolute" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM5 17l3.5-4.5 2.5 3.01L14.5 11l4.5 6H5z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-400 mb-3">
                    For the best results on all devices, use an image that's at least 2048 x 1152 pixels and 6MB or less.
                  </p>
                  <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
                  <button onClick={() => bannerInputRef.current?.click()} className="px-4 py-2 bg-[#3d3d3d] hover:bg-gray-700 rounded">
                    Upload
                  </button>
                </div>
              </div>
            </div>

            {/* Picture */}
            <div className="bg-[#212121] rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Picture</h3>
              <p className="text-sm text-gray-400 mb-4">
                Your profile picture will appear where your channel is presented on YouTube, like next to your videos and comments
              </p>
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 bg-yellow-600 rounded-full flex items-center justify-center text-3xl font-bold text-white overflow-hidden">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : 'U'}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-400 mb-3">
                    It's recommended to use a picture that's at least 98 x 98 pixels and 4MB or less. Use a PNG or GIF (no animations) file. Make sure your picture follows the YouTube Community Guidelines.
                  </p>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  <div className="flex gap-3">
                    <button onClick={() => avatarInputRef.current?.click()} className="px-4 py-2 bg-[#3d3d3d] hover:bg-gray-700 rounded">
                      Change
                    </button>
                    <button onClick={() => { setAvatarPreview(null); markDirty(); }} className="px-4 py-2 bg-[#3d3d3d] hover:bg-gray-700 rounded text-red-400">
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Name */}
            <div className="bg-[#212121] rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Name</h3>
              <p className="text-sm text-gray-400 mb-4">
                Choose a channel name that represents you and your content. Changes made to your name and picture are visible only on YouTube and not other Google services. You can change your name twice in 14 days.
              </p>
              <input
                type="text"
                value={channelName}
                onChange={(e) => { setChannelName(e.target.value); markDirty(); }}
                placeholder="Your channel name"
                className="w-full px-4 py-3 bg-[#3d3d3d] rounded border border-gray-700 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Handle */}
            <div className="bg-[#212121] rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Handle</h3>
              <p className="text-sm text-gray-400 mb-4">
                Choose your unique handle by adding letters and numbers. You can change your handle back within 14 days. Handles can be changed twice every 14 days.
              </p>
              <input
                type="text"
                value={handle}
                onChange={(e) => { setHandle(e.target.value); markDirty(); }}
                placeholder="@yourhandle"
                className="w-full px-4 py-3 bg-[#3d3d3d] rounded border border-gray-700 focus:border-blue-500 outline-none mb-2"
              />
              <p className="text-xs text-gray-500">
                {window.location.origin}/channel/{handle || 'yourhandle'}
              </p>
            </div>

            {/* Description */}
            <div className="bg-[#212121] rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Description</h3>
              <textarea
                value={description}
                onChange={(e) => { setDescription(e.target.value); markDirty(); }}
                placeholder="Tell viewers about your channel. Your description will appear in the About section of your channel and search results, among other places."
                rows={5}
                className="w-full px-4 py-3 bg-[#3d3d3d] rounded border border-gray-700 focus:border-blue-500 outline-none resize-none"
              />
              <button onClick={() => alert('Language selection coming soon')} className="mt-3 text-blue-400 hover:underline text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                </svg>
                Add language
              </button>
            </div>

            {/* Channel URL */}
            <div className="bg-[#212121] rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Channel URL</h3>
              <p className="text-sm text-gray-400 mb-4">
                This is the standard web address for your channel. It includes your unique channel ID, which is the numbers and letters at the end of the URL.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={channelUrl}
                  readOnly
                  className="flex-1 px-4 py-3 bg-[#3d3d3d] rounded border border-gray-700 text-gray-400"
                />
                <button onClick={handleCopyUrl} className="p-3 bg-[#3d3d3d] hover:bg-gray-700 rounded" title="Copy URL">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Links */}
            <div className="bg-[#212121] rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Links</h3>
              <p className="text-sm text-gray-400 mb-4">
                Share external links with your viewers. They'll be visible on your channel profile and about page.
              </p>
              {links.length > 0 && (
                <div className="space-y-2 mb-4">
                  {links.map((link, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-[#3d3d3d] rounded">
                      <div>
                        <p className="text-sm font-medium">{link.title}</p>
                        <p className="text-xs text-blue-400">{link.url}</p>
                      </div>
                      <button onClick={() => { setLinks((prev) => prev.filter((_, idx) => idx !== i)); markDirty(); }} className="text-red-400 text-sm hover:underline">Remove</button>
                    </div>
                  ))}
                </div>
              )}
              {showLinkForm ? (
                <div className="space-y-3 p-4 bg-[#3d3d3d] rounded mb-3">
                  <input value={newLinkTitle} onChange={(e) => setNewLinkTitle(e.target.value)} placeholder="Link title" className="w-full px-3 py-2 bg-[#282828] rounded border border-gray-700 focus:border-blue-500 outline-none text-sm" />
                  <input value={newLinkUrl} onChange={(e) => setNewLinkUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2 bg-[#282828] rounded border border-gray-700 focus:border-blue-500 outline-none text-sm" />
                  <div className="flex gap-2">
                    <button onClick={handleAddLink} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-sm">Add</button>
                    <button onClick={() => setShowLinkForm(false)} className="px-4 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-sm">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowLinkForm(true)} className="flex items-center gap-2 px-4 py-2 bg-[#3d3d3d] hover:bg-gray-700 rounded">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                  </svg>
                  Add link
                </button>
              )}
            </div>

            {/* Contact Info */}
            <div className="bg-[#212121] rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Contact info</h3>
              <p className="text-sm text-gray-400 mb-4">
                Let people know how to contact you with business inquiries. The email address you enter may appear in the About section of your channel and be visible to viewers.
              </p>
              <div>
                <label className="block text-sm mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); markDirty(); }}
                  placeholder="Email address"
                  className="w-full px-4 py-3 bg-[#3d3d3d] rounded border border-gray-700 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Video Watermark */}
            <div className="bg-[#212121] rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Video watermark</h3>
              <p className="text-sm text-gray-400 mb-4">
                The watermark will appear on your videos in the right-hand corner of the video player
              </p>
              <div className="flex items-center gap-6">
                <div className="w-32 h-24 bg-[#3d3d3d] rounded flex items-center justify-center">
                  <svg className="w-12 h-12 text-red-500" viewBox="0 0 40 40" fill="currentColor">
                    <pattern id="pattern" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                      <rect x="0" y="0" width="5" height="5" fill="currentColor" />
                      <rect x="5" y="5" width="5" height="5" fill="currentColor" />
                    </pattern>
                    <rect width="40" height="40" fill="url(#pattern)" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-400 mb-3">
                    An image that's 150 x 150 pixels is recommended. Use a PNG, GIF (no animations), BMP, or JPEG file that's 1MB or less.
                  </p>
                  <input ref={watermarkInputRef} type="file" accept="image/*" className="hidden" onChange={handleWatermarkUpload} />
                  <button onClick={() => watermarkInputRef.current?.click()} className="px-4 py-2 bg-[#3d3d3d] hover:bg-gray-700 rounded">
                    Upload
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
