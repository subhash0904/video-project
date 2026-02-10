import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { usersApi } from "../lib/api";

interface ProfileData {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
  channel?: {
    id: string;
    handle: string;
    name: string;
    description?: string;
    bannerUrl?: string;
    subscriberCount: number;
    videoCount: number;
    totalViews: number;
    verified: boolean;
  };
}

export default function Profile() {
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    const loadProfile = async () => {
      try {
        const response = (await usersApi.getProfile()) as { success: boolean; data: ProfileData };
        if (response.success) {
          setProfile(response.data);
          setEditName(response.data.displayName);
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [isAuthenticated, navigate]);

  const handleSaveProfile = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    setError('');
    try {
      const response = (await usersApi.updateProfile({ displayName: editName.trim() })) as { success: boolean; data: unknown };
      if (response.success) {
        setProfile(prev => prev ? { ...prev, displayName: editName.trim() } : prev);
        setEditing(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-neutral-600">Profile unavailable.</p>
        <button onClick={() => window.location.reload()} className="text-red-600 hover:underline text-sm">Try again</button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pt-4">
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="shrink-0">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt={profile.displayName}
                className="w-24 h-24 rounded-full border border-neutral-200"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-neutral-200 flex items-center justify-center text-2xl font-semibold text-neutral-700">
                {profile.displayName?.[0]?.toUpperCase() || "U"}
              </div>
            )}
          </div>
          <div className="flex-1">
            {editing ? (
              <div className="space-y-3">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="text-2xl font-bold text-neutral-900 border border-neutral-300 rounded-xl px-3 py-1 w-full max-w-xs focus:outline-none focus:border-red-500"
                  placeholder="Display name"
                />
                {error && <p className="text-red-600 text-sm">{error}</p>}
                <div className="flex gap-2">
                  <button onClick={handleSaveProfile} disabled={saving} className="px-4 py-2 bg-red-600 text-white rounded-full text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => { setEditing(false); setEditName(profile.displayName); setError(''); }} className="px-4 py-2 border border-neutral-300 rounded-full text-sm font-semibold hover:bg-neutral-100">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-neutral-900">{profile.displayName}</h1>
                  <button onClick={() => setEditing(true)} className="p-1.5 rounded-full hover:bg-neutral-100" title="Edit profile">
                    <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
                <p className="text-neutral-600">@{profile.username}</p>
              </>
            )}
            {profile.channel && (
              <div className="mt-3 text-sm text-neutral-600">
                <div>{profile.channel.subscriberCount.toLocaleString()} subscribers</div>
                <div>{profile.channel.videoCount} videos &middot; {profile.channel.totalViews.toLocaleString()} views</div>
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            {profile.channel && (
              <button
                onClick={() => navigate(`/channel/${profile.channel?.handle}`)}
                className="px-4 py-2 rounded-full bg-neutral-100 hover:bg-neutral-200 text-sm font-semibold"
              >
                View Channel
              </button>
            )}
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-full border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => navigate("/history")}
          className="bg-white border border-neutral-200 rounded-2xl p-4 text-left hover:bg-neutral-50 transition"
        >
          <div className="text-sm text-neutral-500">History</div>
          <div className="text-lg font-semibold">Watch history</div>
        </button>
        <button
          onClick={() => navigate("/liked")}
          className="bg-white border border-neutral-200 rounded-2xl p-4 text-left hover:bg-neutral-50 transition"
        >
          <div className="text-sm text-neutral-500">Likes</div>
          <div className="text-lg font-semibold">Liked videos</div>
        </button>
        <button
          onClick={() => navigate("/subscriptions")}
          className="bg-white border border-neutral-200 rounded-2xl p-4 text-left hover:bg-neutral-50 transition"
        >
          <div className="text-sm text-neutral-500">Channels</div>
          <div className="text-lg font-semibold">Subscriptions</div>
        </button>
      </div>
    </div>
  );
}
