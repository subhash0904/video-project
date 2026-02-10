import { useState, useEffect, useRef } from 'react';
import { apiClient } from '../../lib/api';
import { realtimeService, type CommentData } from '../../utils/realtimeService';

interface ChatMessage {
  id: string;
  username: string;
  displayName: string;
  message: string;
  timestamp: Date;
  avatarUrl?: string;
  badge?: 'verified' | 'member' | 'moderator';
  highlighted?: boolean;
  likes?: number;
  liked?: boolean;
}

interface LiveChatProps {
  videoId: string;
  isLive?: boolean;
  userId?: string;
  username?: string;
  displayName?: string;
}

interface ApiComment {
  id: string;
  content: string;
  createdAt: string;
  user?: {
    username?: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

export function LiveChat({
  videoId,
  userId,
  username = 'Anonymous',
  displayName = 'User',
}: LiveChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sortBy, setSortBy] = useState<'top' | 'new'>('new');
  const [showMenu, setShowMenu] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [likedMessages, setLikedMessages] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    // Connect to real-time service and join video
    realtimeService.connect();
    realtimeService.joinVideo(videoId, userId, username, displayName);

    // Load initial messages
    loadMessages();

    // Subscribe to real-time events
    const unsubNewComment = realtimeService.on('new-comment', (commentData: CommentData) => {
      const chatMsg: ChatMessage = {
        id: commentData.id,
        username: commentData.username,
        displayName: commentData.displayName,
        message: commentData.content,
        timestamp: new Date(commentData.timestamp),
        avatarUrl: commentData.avatarUrl,
        badge: commentData.badge,
      };

      setMessages((prev) => {
        const updated = [...prev, chatMsg];
        // Keep only last 50 messages
        return updated.slice(-50);
      });

      // Auto scroll to new message
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    // Cleanup on unmount
    return () => {
      unsubNewComment();
      realtimeService.leaveVideo();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- loadMessages intentionally omitted, runs on mount only
  }, [videoId, userId, username, displayName]);

  // Auto scroll when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      const response = (await apiClient.get(`/videos/${videoId}/comments`)) as {
        data: { success: boolean; data: ApiComment[] };
      };
      if (response.data?.success) {
        const chatMessages: ChatMessage[] = response.data.data.map((comment: ApiComment) => ({
          id: comment.id,
          username: comment.user?.username || 'Anonymous',
          displayName: comment.user?.displayName || comment.user?.username || 'User',
          message: comment.content,
          timestamp: new Date(comment.createdAt),
          avatarUrl: comment.user?.avatarUrl,
        }));
        setMessages(chatMessages.slice(-50)); // Last 50 messages
      }
    } catch (error) {
      console.error('Failed to load chat messages:', error);
      // Add placeholder messages
      addPlaceholderMessages();
    } finally {
      setIsLoading(false);
    }
  };

  const addPlaceholderMessages = () => {
    const placeholders: ChatMessage[] = [
      {
        id: '1',
        username: '@CreatorXYZ',
        displayName: 'CreatorXYZ',
        message: 'Thanks for watching everyone!',
        timestamp: new Date(Date.now() - 30000),
      },
      {
        id: '2',
        username: '@UserA',
        displayName: 'UserA',
        message: 'Love this content',
        timestamp: new Date(Date.now() - 25000),
        badge: 'member',
      },
      {
        id: '3',
        username: '@UserB',
        displayName: 'UserB',
        message: 'Amazing quality!',
        timestamp: new Date(Date.now() - 20000),
      },
      {
        id: '4',
        username: '@UserC',
        displayName: 'UserC',
        message: 'Can you explain more?',
        timestamp: new Date(Date.now() - 15000),
      },
      {
        id: '5',
        username: '@UserD',
        displayName: 'UserD',
        message: 'Best video ever 🔥',
        timestamp: new Date(Date.now() - 10000),
      },
      {
        id: '6',
        username: '@UserE',
        displayName: 'UserE',
        message: 'When is next upload?',
        timestamp: new Date(Date.now() - 5000),
      },
      {
        id: '7',
        username: '@CreatorXYZ',
        displayName: 'CreatorXYZ',
        message: 'Next video coming tomorrow!',
        timestamp: new Date(Date.now() - 2000),
        badge: 'verified',
      },
    ];

    setMessages(placeholders);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageToSend = newMessage;
    setNewMessage('');

    try {
      // Send via real-time service
      realtimeService.sendComment(videoId, username, displayName, messageToSend, userId);

      // Also send to backend API for persistence
      await apiClient.post(`/videos/${videoId}/comments`, {
        content: messageToSend,
      });
    } catch (error) {
      console.error('Failed to send comment:', error);
      setNewMessage(messageToSend); // Restore message on error
    }
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);

    // Notify typing
    if (!isTyping) {
      setIsTyping(true);
      realtimeService.notifyTyping(videoId, displayName, true);
    }

    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to clear typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      realtimeService.notifyTyping(videoId, displayName, false);
    }, 1000);
  };

  const handleLikeMessage = (messageId: string) => {
    setLikedMessages((prev) => {
      const updated = new Set(prev);
      if (updated.has(messageId)) {
        updated.delete(messageId);
      } else {
        updated.add(messageId);
      }
      return updated;
    });

    // Notify backend of reaction
    realtimeService.reactToComment(videoId, messageId, 'like');
  };

  const handlePinMessage = (messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, highlighted: !msg.highlighted } : msg))
    );
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  const getBadgeColor = (badge?: string) => {
    switch (badge) {
      case 'verified':
        return 'bg-blue-500';
      case 'member':
        return 'bg-orange-500';
      case 'moderator':
        return 'bg-red-500';
      default:
        return '';
    }
  };

  const sortedMessages = [...messages].sort((a, b) => {
    if (sortBy === 'top') {
      return (b.timestamp.getTime() - a.timestamp.getTime()) * Math.random() - 0.5;
    }
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  return (
    <div className="flex flex-col h-full bg-neutral-900 border-l border-neutral-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-neutral-800/50">
        <h3 className="text-sm font-semibold text-white">Live Chat</h3>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 hover:bg-neutral-700 rounded-full transition text-neutral-400"
            title="Chat options"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </button>

          {showMenu && (
            <div className="absolute right-0 top-full mt-1 bg-neutral-800 rounded-lg shadow-lg z-10 min-w-[200px]">
              <button
                onClick={() => {
                  setSortBy(sortBy === 'top' ? 'new' : 'top');
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-700 transition first:rounded-t-lg last:rounded-b-lg"
              >
                Sort by: {sortBy === 'top' ? 'Top' : 'New'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages Container */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto px-3 py-3 space-y-2 scrollbar-thin scrollbar-thumb-neutral-700 scrollbar-track-neutral-800"
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-neutral-500">
            <span className="text-sm">Loading chat...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-neutral-500 text-center px-2">
            <span className="text-sm">No messages yet. Be the first to chat!</span>
          </div>
        ) : (
          sortedMessages.map((msg) => (
            <div
              key={msg.id}
              onMouseEnter={() => setHoveredMessageId(msg.id)}
              onMouseLeave={() => setHoveredMessageId(null)}
              className={`group p-2 rounded transition text-xs ${msg.highlighted ? 'bg-yellow-500/10 border-l-2 border-yellow-500' : 'hover:bg-neutral-800/50'}`}
            >
              <div className="flex items-top gap-2">
                {/* Avatar */}
                {msg.avatarUrl ? (
                  <img
                    src={msg.avatarUrl}
                    alt={msg.displayName}
                    className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0 mt-0.5 text-white text-[10px] font-bold">
                    {msg.displayName.charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Message */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap justify-between mb-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-neutral-200 truncate">{msg.displayName}</span>

                      {msg.badge && (
                        <span
                          className={`${getBadgeColor(msg.badge)} text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold`}
                        >
                          {msg.badge === 'verified'
                            ? '✓'
                            : msg.badge === 'member'
                              ? 'MEMBER'
                              : 'MOD'}
                        </span>
                      )}

                      <span className="text-neutral-500 text-[11px] flex-shrink-0">{formatTime(msg.timestamp)}</span>
                    </div>

                    {/* Hover Actions */}
                    {hoveredMessageId === msg.id && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button
                          onClick={() => handleLikeMessage(msg.id)}
                          className={`p-1 rounded hover:bg-neutral-700 transition ${
                            likedMessages.has(msg.id) ? 'text-red-500' : 'text-neutral-400'
                          }`}
                          title="Like"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                          </svg>
                        </button>

                        <button
                          onClick={() => handlePinMessage(msg.id)}
                          className="p-1 rounded hover:bg-neutral-700 transition text-neutral-400"
                          title="Pin"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M16 9V3H8v6H2l7 7v8l2-2v-6h2v6l2 2v-8l7-7h-6z" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-neutral-300 break-words text-xs mt-0.5">{msg.message}</p>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSendMessage}
        className="border-t border-neutral-800 p-3 bg-neutral-800/50 space-y-2"
      >
        <input
          type="text"
          value={newMessage}
          onChange={handleTyping}
          placeholder="Add a comment..."
          maxLength={200}
          className="w-full bg-neutral-700 text-white placeholder-neutral-500 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
        />

        <div className="flex items-center justify-between">
          <span className="text-[11px] text-neutral-500">{newMessage.length}/200</span>
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="rounded px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:bg-neutral-700 disabled:text-neutral-500 transition"
          >
            Comment
          </button>
        </div>
      </form>
    </div>
  );
}
