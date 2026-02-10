import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { apiClient } from '../lib/api';
import { useEffect, useState } from 'react';

interface StudioUser {
  displayName?: string;
  avatarUrl?: string;
}

export default function Studio() {
  const navigate = useNavigate();
  const [user, setUser] = useState<StudioUser | null>(null);

  const loadUserProfile = async () => {
    try {
      const response = await apiClient.get('/users/profile') as { data: { success: boolean; data: StudioUser } };
      if (response.data?.success) {
        setUser(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  useEffect(() => {
    const token = apiClient.getToken();
    if (!token) {
      navigate('/login');
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async profile fetch sets state intentionally
    loadUserProfile();
  }, [navigate]);

  const menuItems = [
    { path: '/studio', label: 'Dashboard', icon: <DashboardIcon /> },
    { path: '/studio/content', label: 'Content', icon: <ContentIcon /> },
    { path: '/studio/go-live', label: 'Go live', icon: <GoLiveIcon /> },
    { path: '/studio/analytics', label: 'Analytics', icon: <AnalyticsIcon /> },
    { path: '/studio/community', label: 'Community', icon: <CommunityIcon /> },
    { path: '/studio/subtitles', label: 'Subtitles', icon: <SubtitlesIcon /> },
    { path: '/studio/copyright', label: 'Content detection', icon: <CopyrightIcon /> },
    { path: '/studio/earn', label: 'Earn', icon: <EarnIcon /> },
    { path: '/studio/customization', label: 'Customization', icon: <CustomIcon /> },
    { path: '/studio/audio-library', label: 'Audio library', icon: <AudioIcon /> },
    { path: '/studio/settings', label: 'Settings', icon: <SettingsIcon /> },
    { path: '/studio/feedback', label: 'Send feedback', icon: <FeedbackIcon /> },
  ];

  return (
    <div className="flex h-screen bg-[#282828] overflow-hidden">
      {/* Sidebar */}
      <div className="w-60 bg-[#212121] flex flex-col border-r border-gray-800 h-full overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">Studio</span>
          </div>
        </div>

        {/* Channel Info + Create Button */}
        <div className="p-4 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3 mb-4">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-12 h-12 rounded-full" />
            ) : (
              <div className="w-12 h-12 bg-yellow-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                {user?.displayName?.[0] || 'U'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white text-sm truncate">Your channel</p>
              <p className="text-gray-400 text-xs truncate">{user?.displayName || 'User'}</p>
            </div>
          </div>
          {/* Create Button */}
          <button
            onClick={() => navigate('/upload')}
            className="w-full flex items-center justify-center gap-2 bg-white text-black font-semibold py-2.5 px-4 rounded-full hover:bg-gray-200 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            CREATE
          </button>
        </div>

        {/* Menu Items - Scrollable */}
        <nav className="flex-1 overflow-y-auto py-2">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/studio'}
              className={({ isActive }) =>
                `flex items-center gap-4 px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-[#3d3d3d] text-white font-medium'
                    : 'text-gray-300 hover:bg-[#3d3d3d]'
                }`
              }
            >
              <span className="w-5 h-5">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}

// Icons
function DashboardIcon() {
  return (
    <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
      <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
    </svg>
  );
}

function ContentIcon() {
  return (
    <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
      <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2z" />
    </svg>
  );
}

function AnalyticsIcon() {
  return (
    <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
    </svg>
  );
}

function CommunityIcon() {
  return (
    <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
    </svg>
  );
}

function SubtitlesIcon() {
  return (
    <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zM4 12h4v2H4v-2zm10 6H4v-2h10v2zm6 0h-4v-2h4v2zm0-4H10v-2h10v2z" />
    </svg>
  );
}

function CopyrightIcon() {
  return (
    <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm-.22-13H10V5h1.78v2zm.89 2.54h-2.67V19h2.67V9.54z" />
    </svg>
  );
}

function EarnIcon() {
  return (
    <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
      <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
    </svg>
  );
}

function CustomIcon() {
  return (
    <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
    </svg>
  );
}

function AudioIcon() {
  return (
    <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
    </svg>
  );
}

function FeedbackIcon() {
  return (
    <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM13 14h-2v-2h2v2zm0-4h-2V6h2v4z" />
    </svg>
  );
}

function GoLiveIcon() {
  return (
    <svg className="w-full h-full" fill="currentColor" viewBox="0 0 24 24">
      <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
    </svg>
  );
}
