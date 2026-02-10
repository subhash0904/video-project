import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { apiClient } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useSidebar } from "../../hooks/useSidebar";

const topItems = [
  { label: "Home", path: "/", icon: "🏠" },
  { label: "Shorts", path: "/shorts", icon: "🎬" },
  { label: "Subscriptions", path: "/subscriptions", icon: "🧾" },
];

const youItems = [
  { label: "History", path: "/history", icon: "🕘" },
  { label: "Liked videos", path: "/liked", icon: "👍" },
];

const exploreItems = [
  { label: "Trending", path: "/search?q=trending", icon: "🔥" },
];

interface Subscription {
  id: string;
  channel: {
    id: string;
    name: string;
    handle: string;
    avatarUrl?: string;
  };
}

const MAX_VISIBLE_SUBSCRIPTIONS = 6;

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isOpen, toggleSidebar } = useSidebar();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [showAllSubscriptions, setShowAllSubscriptions] = useState(false);

  const fetchSubscriptions = useCallback(async () => {
    try {
      const response = await apiClient.get('/users/subscriptions') as { success: boolean; data: Subscription[] };
      if (response.success && response.data) {
        setSubscriptions(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchSubscriptions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const visibleSubscriptions = showAllSubscriptions 
    ? subscriptions 
    : subscriptions.slice(0, MAX_VISIBLE_SUBSCRIPTIONS);

  const handleNavigate = (path: string) => {
    navigate(path);
    // Close sidebar on mobile after navigation
    if (window.innerWidth < 768 && isOpen) {
      toggleSidebar();
    }
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside 
        className={`fixed top-16 left-0 h-[calc(100vh-64px)] bg-white border-r border-neutral-200 transition-all duration-300 z-40 ${
          isOpen 
            ? 'w-60 flex flex-col' 
            : 'w-0 md:w-16 md:flex hidden flex-col'
        }`}
      >
        <nav className="p-2 space-y-3 flex-1 overflow-y-auto">
          <div className="space-y-1">
            {topItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <div
                  key={item.label}
                  onClick={() => handleNavigate(item.path)}
                  className={`px-3 py-2 rounded-xl cursor-pointer flex items-center gap-3 text-sm transition ${
                    active ? "bg-neutral-100 font-semibold" : "hover:bg-neutral-100"
                  } ${isOpen ? '' : 'justify-center'}`}
                  title={!isOpen ? item.label : ''}
                >
                  <span className="text-lg">{item.icon}</span>
                  {isOpen && <span>{item.label}</span>}
                </div>
              );
            })}
          </div>

          {isOpen && (
            <>
              <div className="border-t border-neutral-200 pt-2">
                <p className="text-[11px] uppercase tracking-wide text-neutral-500 px-3 mb-2">You</p>
                {youItems.map((item) => {
                  const active = location.pathname === item.path;
                  return (
                    <div
                      key={item.label}
                      onClick={() => handleNavigate(item.path)}
                      className={`px-3 py-2 rounded-xl cursor-pointer flex items-center gap-3 text-sm transition ${
                        active ? 'bg-neutral-100 font-semibold' : 'hover:bg-neutral-100'
                      }`}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <span>{item.label}</span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-neutral-200 pt-2">
                <p className="text-[11px] uppercase tracking-wide text-neutral-500 px-3 mb-2">Explore</p>
                {exploreItems.map((item) => (
                  <div
                    key={item.label}
                    onClick={() => handleNavigate(item.path)}
                    className="px-3 py-2 rounded-xl cursor-pointer flex items-center gap-3 text-sm hover:bg-neutral-100 transition"
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>

              {user && subscriptions.length > 0 && (
                <div className="border-t border-neutral-200 pt-2">
                  <p className="text-[11px] uppercase tracking-wide text-neutral-500 px-3 mb-2">
                    Subscriptions
                  </p>
                  <div className="space-y-1">
                    {visibleSubscriptions.map((sub) => (
                      <div
                        key={sub.id}
                        onClick={() => handleNavigate(`/channel/${sub.channel.handle || sub.channel.id}`)}
                        className="px-3 py-2 rounded-xl cursor-pointer flex items-center gap-3 text-sm hover:bg-neutral-100 group transition"
                        title={sub.channel.name}
                      >
                        {sub.channel.avatarUrl ? (
                          <img
                            src={sub.channel.avatarUrl}
                            alt={sub.channel.name}
                            className="w-6 h-6 rounded-full"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-neutral-200 text-xs flex items-center justify-center text-neutral-700 font-semibold">
                            {sub.channel.name[0]}
                          </div>
                        )}
                        <span className="truncate group-hover:text-blue-600">{sub.channel.name}</span>
                      </div>
                    ))}

                    {subscriptions.length > MAX_VISIBLE_SUBSCRIPTIONS && (
                      <div className="relative">
                        <button
                          onClick={() => setShowAllSubscriptions(!showAllSubscriptions)}
                          className="w-full px-3 py-2 rounded-xl text-sm font-semibold text-blue-600 hover:bg-neutral-100 transition flex items-center justify-between"
                        >
                          <span>{showAllSubscriptions ? 'Show Less' : 'Show More'}</span>
                          <span className="text-xs bg-neutral-200 px-2 py-0.5 rounded-full">
                            +{subscriptions.length - MAX_VISIBLE_SUBSCRIPTIONS}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Footer links */}
              <div className="border-t border-neutral-200 pt-3 px-3 pb-4">
                <div className="text-[11px] text-neutral-400 space-y-1">
                  <p><span className="hover:text-neutral-600 cursor-pointer">About</span> &middot; <span className="hover:text-neutral-600 cursor-pointer">Press</span> &middot; <span className="hover:text-neutral-600 cursor-pointer">Copyright</span></p>
                  <p><span className="hover:text-neutral-600 cursor-pointer">Contact</span> &middot; <span className="hover:text-neutral-600 cursor-pointer">Creators</span> &middot; <span className="hover:text-neutral-600 cursor-pointer">Advertise</span></p>
                  <p><span className="hover:text-neutral-600 cursor-pointer">Terms</span> &middot; <span className="hover:text-neutral-600 cursor-pointer">Privacy</span> &middot; <span className="hover:text-neutral-600 cursor-pointer">Policy &amp; Safety</span></p>
                  <p className="pt-1">&copy; 2026 VideoPlatform</p>
                </div>
              </div>
            </>
          )}
        </nav>
      </aside>
    </>
  );
}
