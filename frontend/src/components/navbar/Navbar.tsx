import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useSidebar } from "../../hooks/useSidebar";
import NotificationBell from "../notifications/NotificationBell";

export default function Navbar() {
  const [q, setQ] = useState("");
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<unknown>(null);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const { toggleSidebar } = useSidebar();
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Initialize Web Speech API
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      const inst = new SR();
      inst.continuous = false;
      inst.interimResults = false;
      inst.lang = 'en-US';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      inst.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((result: any) => result[0].transcript)
          .join('');
        if (transcript) {
          setQ(transcript);
          navigate(`/search?q=${encodeURIComponent(transcript)}`);
          setShowMobileSearch(false);
        }
        setIsListening(false);
      };

      inst.onerror = () => setIsListening(false);
      inst.onend = () => setIsListening(false);

      recognitionRef.current = inst;
    }
  }, [navigate]);

  // Close user menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleVoiceSearch = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = recognitionRef.current as any;
    if (rec) {
      if (isListening) {
        rec.stop();
        setIsListening(false);
      } else {
        setIsListening(true);
        rec.start();
      }
    }
  };

  const handleSearch = () => {
    if (q.trim()) {
      navigate(`/search?q=${encodeURIComponent(q.trim())}`);
      setShowMobileSearch(false);
    }
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
    navigate('/');
  };

  // Mobile search overlay
  if (showMobileSearch) {
    return (
      <header className="fixed top-0 inset-x-0 h-16 bg-white border-b border-neutral-200 z-50 flex items-center px-4 gap-2">
        <button
          onClick={() => setShowMobileSearch(false)}
          className="p-2 rounded-full hover:bg-neutral-100"
          aria-label="Back"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 flex items-center bg-white border border-neutral-300 rounded-full overflow-hidden">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="w-full px-4 py-2.5 outline-none text-sm"
            placeholder="Search"
          />
          <button onClick={handleSearch} className="px-4 py-2.5 bg-neutral-100 border-l border-neutral-300">
            <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
        <button onClick={handleVoiceSearch} className={`p-2 rounded-full ${isListening ? 'bg-red-500 text-white' : 'hover:bg-neutral-100'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </button>
      </header>
    );
  }

  return (
    <>
    {/* Voice Search Listening Overlay */}
    {isListening && (
      <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center" onClick={handleVoiceSearch}>
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className="absolute w-20 h-20 bg-red-100 rounded-full animate-ping opacity-50" />
            <div className="relative w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
          </div>
          <h2 className="text-lg font-semibold mb-2">Listening...</h2>
          <p className="text-neutral-500 text-sm mb-4">Say what you want to search for</p>
          <button
            onClick={handleVoiceSearch}
            className="px-6 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-full text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    )}
    <header className="fixed top-0 inset-x-0 h-16 bg-white border-b border-neutral-200 z-50 flex items-center px-4">
      <div className="flex items-center gap-3">
        <button 
          onClick={toggleSidebar}
          className="p-2 rounded-full hover:bg-neutral-100 transition"
          title="Toggle sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => navigate('/')}
        >
          <div className="w-9 h-6 rounded bg-red-600 flex items-center justify-center text-white">
            <svg className="w-4 h-4 ml-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6 4.5a1 1 0 011.515-.857l8 5a1 1 0 010 1.714l-8 5A1 1 0 016 14.5v-10z" />
            </svg>
          </div>
          <span className="hidden sm:inline brand-font text-lg font-semibold">VideoPlatform</span>
        </div>
      </div>

      {/* Desktop Search */}
      <div className="flex-1 mx-6 hidden md:flex items-center justify-center">
        <div className="flex items-center w-full max-w-2xl">
          <div className="flex items-center bg-white border border-neutral-300 rounded-full shadow-sm overflow-hidden w-full hover:shadow-md transition">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full px-4 py-2.5 outline-none text-sm"
              placeholder="Search"
              disabled={isListening}
            />
            <button
              onClick={handleSearch}
              className="px-5 py-2.5 bg-neutral-100 border-l border-neutral-300 hover:bg-neutral-200 transition"
              aria-label="Search"
              title="Search"
            >
              <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
          <button 
            onClick={handleVoiceSearch}
            className={`ml-3 p-2.5 rounded-full transition ${
              isListening 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-neutral-100 hover:bg-neutral-200'
            }`}
            aria-label="Voice search"
            title={isListening ? "Listening..." : "Voice search"}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Mobile Search Button */}
        <button
          onClick={() => setShowMobileSearch(true)}
          className="md:hidden p-2 rounded-full hover:bg-neutral-100 transition"
          aria-label="Search"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        {isAuthenticated ? (
          <>
            {/* Upload / Create */}
            <button
              onClick={() => navigate('/upload')}
              className="flex items-center gap-2 px-3 py-2 rounded-full border border-neutral-300 hover:bg-neutral-100 transition"
              title="Upload video"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden lg:inline text-sm">Create</span>
            </button>

            {/* Studio Button */}
            <button
              onClick={() => navigate('/studio')}
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-full hover:bg-neutral-100 transition text-neutral-700"
              title="Studio"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-2.625 0V5.625m0 0A1.125 1.125 0 014.5 4.5h15a1.125 1.125 0 011.125 1.125m-17.25 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h15.75m0 0A1.125 1.125 0 0120.625 6V5.625m0 1.5v11.25m0 0a1.125 1.125 0 01-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 2.625h-15.75M6 18.375v-1.5c0-.621.504-1.125 1.125-1.125h9.75c.621 0 1.125.504 1.125 1.125v1.5" />
              </svg>
              <span className="hidden lg:inline text-xs font-semibold">Studio</span>
            </button>

            <NotificationBell />

            {/* User Menu with Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center"
                aria-label="User menu"
              >
                {user?.avatarUrl ? (
                  <img 
                    src={user.avatarUrl} 
                    alt={user.displayName}
                    className="w-9 h-9 rounded-full cursor-pointer border-2 border-transparent hover:border-neutral-300 transition"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center text-sm font-semibold cursor-pointer text-white hover:ring-2 hover:ring-neutral-300 transition">
                    {user?.displayName?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 top-12 w-72 bg-white border border-neutral-200 rounded-xl shadow-lg overflow-hidden z-50">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-3">
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.displayName} className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-white font-semibold">
                        {user?.displayName?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">{user?.displayName}</p>
                      <p className="text-xs text-neutral-500 truncate">@{user?.username}</p>
                    </div>
                  </div>

                  <div className="py-1">
                    <button onClick={() => { navigate('/profile'); setShowUserMenu(false); }} className="w-full px-4 py-2.5 text-sm text-left hover:bg-neutral-50 flex items-center gap-3">
                      <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      Your profile
                    </button>
                    <button onClick={() => { navigate(`/channel/${user?.channel?.handle || user?.username}`); setShowUserMenu(false); }} className="w-full px-4 py-2.5 text-sm text-left hover:bg-neutral-50 flex items-center gap-3">
                      <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                      Your channel
                    </button>
                    <button onClick={() => { navigate('/studio'); setShowUserMenu(false); }} className="w-full px-4 py-2.5 text-sm text-left hover:bg-neutral-50 flex items-center gap-3">
                      <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      Studio
                    </button>
                  </div>

                  <div className="border-t border-neutral-100 py-1">
                    <button onClick={() => { navigate('/history'); setShowUserMenu(false); }} className="w-full px-4 py-2.5 text-sm text-left hover:bg-neutral-50 flex items-center gap-3">
                      <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      History
                    </button>
                    <button onClick={() => { navigate('/liked'); setShowUserMenu(false); }} className="w-full px-4 py-2.5 text-sm text-left hover:bg-neutral-50 flex items-center gap-3">
                      <svg className="w-5 h-5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
                      Liked videos
                    </button>
                  </div>

                  <div className="border-t border-neutral-100 py-1">
                    <button onClick={handleLogout} className="w-full px-4 py-2.5 text-sm text-left hover:bg-red-50 text-red-600 flex items-center gap-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition"
          >
            Sign In
          </button>
        )}
      </div>
    </header>
    </>
  );
}
