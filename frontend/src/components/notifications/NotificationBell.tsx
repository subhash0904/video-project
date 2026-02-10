import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationClient, type AppNotification } from '../../utils/notificationService';

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnread = async () => {
    const count = await notificationClient.getUnreadCount();
    setUnreadCount(count);
  };

  // Fetch unread count on mount
  useEffect(() => {
    fetchUnread();
    const unsub = notificationClient.onNewNotification((n) => {
      setNotifications((prev) => [n, ...prev]);
      setUnreadCount((c) => c + 1);
    });
    notificationClient.startListening();

    return () => { unsub(); };
  }, []);

  // Click outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  async function toggleOpen() {
    if (!open) {
      setLoading(true);
      const { notifications: list } = await notificationClient.getAll(1, 30);
      setNotifications(list);
      setLoading(false);
    }
    setOpen(!open);
  }

  async function handleClick(n: AppNotification) {
    if (!n.read) {
      await notificationClient.markRead(n.id);
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    if (n.actionUrl) navigate(n.actionUrl);
    setOpen(false);
  }

  async function markAllRead() {
    await notificationClient.markAllRead();
    setNotifications((prev) => prev.map((x) => ({ ...x, read: true })));
    setUnreadCount(0);
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    // eslint-disable-next-line react-hooks/purity -- reading current time is intentional for relative time display
    const now = performance.now() + performance.timeOrigin;
    const sec = Math.floor((now - d.getTime()) / 1000);
    if (sec < 60) return 'just now';
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
    if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
    return d.toLocaleDateString();
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case 'NEW_VIDEO':
        return '🎬';
      case 'COMMENT':
      case 'COMMENT_REPLY':
        return '💬';
      case 'LIKE_MILESTONE':
        return '❤️';
      case 'SUBSCRIBER':
        return '🔔';
      case 'VIDEO_PROCESSED':
        return '✅';
      default:
        return '📢';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={toggleOpen}
        className="relative p-2 rounded-full hover:bg-neutral-100 transition"
        title="Notifications"
      >
        <svg className="w-6 h-6 text-neutral-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-600 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-xl shadow-2xl border border-neutral-200 z-50 max-h-[500px] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-blue-600 hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-8 text-center text-neutral-400 text-sm">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-neutral-400 text-sm">
                <svg className="w-12 h-12 mx-auto mb-2 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                No notifications yet
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-neutral-50 transition border-b border-neutral-100 last:border-0 ${
                    !n.read ? 'bg-blue-50/50' : ''
                  }`}
                >
                  {/* Icon / Thumbnail */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-lg">
                    {n.thumbnailUrl ? (
                      <img src={n.thumbnailUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      typeIcon(n.type)
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.read ? 'font-semibold' : 'font-normal'} text-neutral-900 line-clamp-1`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-neutral-600 line-clamp-2 mt-0.5">{n.body}</p>
                    <span className="text-[11px] text-neutral-400 mt-1 block">{formatTime(n.createdAt)}</span>
                  </div>

                  {/* Unread dot */}
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
