import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api';

interface VideoEngagementProps {
  videoId: string;
  channelId: string;
  channelName: string;
  channelHandle: string;
  channelAvatar: string;
  subscriberCount: number;
  verified: boolean;
  likes: number;
  dislikes: number;
  views?: number;
}

export function VideoEngagement({
  videoId,
  channelId,
  channelName,
  channelHandle,
  channelAvatar,
  subscriberCount,
  verified,
  likes: initialLikes,
  dislikes: initialDislikes,
}: VideoEngagementProps) {
  const navigate = useNavigate();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [notificationsOn, setNotificationsOn] = useState(false);
  const [liked, setLiked] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [likes, setLikes] = useState(initialLikes);
  const [dislikes, setDislikes] = useState(initialDislikes);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [savedToWatchLater, setSavedToWatchLater] = useState(false);
  const [savedToFavorites, setSavedToFavorites] = useState(false);
  const [showNewPlaylist, setShowNewPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const nativeShare = (navigator as Navigator & { share?: (data: ShareData) => Promise<void> }).share;
  const canNativeShare = typeof nativeShare === 'function';

  const checkSubscriptionStatus = useCallback(async () => {
    try {
      const token = apiClient.getToken();
      if (!token) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await apiClient.get(`/channels/${channelId}/subscription`);
      if (data.success) {
        setIsSubscribed(data.data.isSubscribed);
        setNotificationsOn(data.data.notificationsOn || false);
      }
    } catch (error) {
      console.error('Failed to check subscription:', error);
    }
  }, [channelId]);

  const checkLikeStatus = useCallback(async () => {
    try {
      const token = apiClient.getToken();
      if (!token) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await apiClient.get(`/videos/${videoId}/like-status`);
      if (data.success) {
        setLiked(data.data.liked);
        setDisliked(data.data.disliked);
      }
    } catch (error) {
      console.error('Failed to check like status:', error);
    }
  }, [videoId]);

  /* eslint-disable react-hooks/set-state-in-effect -- async data fetch sets state intentionally */
  useEffect(() => {
    checkSubscriptionStatus();
    checkLikeStatus();
  }, [checkSubscriptionStatus, checkLikeStatus]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggleSubscribe = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = isSubscribed
        ? await apiClient.delete(`/channels/${channelId}/subscribe`)
        : await apiClient.post(`/channels/${channelId}/subscribe`, { notificationsOn: true });
      if (data.success) {
        setIsSubscribed(!isSubscribed);
      }
    } catch (error) {
      console.error('Failed to toggle subscription:', error);
    }
  };

  const toggleNotifications = async () => {
    try {
      await apiClient.patch(`/channels/${channelId}/notifications`, { notificationsOn: !notificationsOn });
      setNotificationsOn(!notificationsOn);
    } catch (error) {
      console.error('Failed to toggle notifications:', error);
    }
  };

  const handleLike = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await apiClient.post(`/videos/${videoId}/like`, { type: 'LIKE' });
      if (data.success) {
        if (liked) {
          setLiked(false);
          setLikes(likes - 1);
        } else {
          setLiked(true);
          setLikes(likes + 1);
          if (disliked) {
            setDisliked(false);
            setDislikes(dislikes - 1);
          }
        }
        setShowShareMenu(false);
      }
    } catch (error) {
      console.error('Failed to like video:', error);
    }
  };

  const handleDislike = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await apiClient.post(`/videos/${videoId}/like`, { type: 'DISLIKE' });
      if (data.success) {
        if (disliked) {
          setDisliked(false);
          setDislikes(dislikes - 1);
        } else {
          setDisliked(true);
          setDislikes(dislikes + 1);
          if (liked) {
            setLiked(false);
            setLikes(likes - 1);
          }
        }
      }
    } catch (error) {
      console.error('Failed to dislike video:', error);
    }
  };

  const handleShare = () => {
    const url = `${window.location.origin}/watch?v=${videoId}`;
    if (canNativeShare) {
      nativeShare({
        title: 'Check out this video!',
        url: url,
      });
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
    setShowShareMenu(false);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div className="flex items-center justify-between py-3">
      {/* Channel Info */}
      <div className="flex items-center gap-3">
        <img
          src={channelAvatar}
          alt={channelName}
          className="w-10 h-10 rounded-full cursor-pointer"
          onClick={() => navigate(`/channel/${channelHandle}`)}
        />
        <div className="flex-1">
          <div className="flex items-center gap-1">
            <h3 
              className="font-semibold cursor-pointer hover:text-gray-700"
              onClick={() => navigate(`/channel/${channelHandle}`)}
            >
              {channelName}
            </h3>
            {verified && (
              <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <p className="text-sm text-gray-600">{formatNumber(subscriberCount)} subscribers</p>
        </div>
        
        {/* Subscribe Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleSubscribe}
            className={`px-4 py-2 rounded-full font-semibold ${
              isSubscribed 
                ? 'bg-neutral-200 hover:bg-neutral-300 text-black' 
                : 'bg-red-600 hover:bg-red-700 text-white'
            }`}
          >
            {isSubscribed ? 'Subscribed' : 'Subscribe'}
          </button>
          
          {isSubscribed && (
            <button
              onClick={toggleNotifications}
              className={`p-2 rounded-full transition-colors ${
                notificationsOn ? 'bg-red-50 text-red-600' : 'hover:bg-neutral-200'
              }`}
              title={notificationsOn ? 'All notifications' : 'Notifications off'}
            >
              {notificationsOn ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                  <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Engagement Actions */}
      <div className="flex items-center gap-2">
        {/* Like/Dislike */}
        <div className="flex items-center bg-neutral-100 rounded-full">
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 px-4 py-2 rounded-l-full hover:bg-neutral-200 transition-colors ${
              liked ? 'text-red-600 bg-red-50' : 'text-neutral-700'
            }`}
          >
            <svg className="w-5 h-5" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
            </svg>
            <span className="font-semibold">{formatNumber(likes)}</span>
          </button>
          <div className="w-px h-6 bg-gray-300" />
          <button
            onClick={handleDislike}
            className={`px-4 py-2 rounded-r-full hover:bg-neutral-200 transition-colors ${
              disliked ? 'text-neutral-900 bg-neutral-200' : 'text-neutral-700'
            }`}
          >
            <svg className="w-5 h-5" fill={disliked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
            </svg>
          </button>
        </div>

        {/* Share */}
        <div className="relative">
          <button
            onClick={() => {
              if (canNativeShare) {
                handleShare();
                return;
              }
              setShowShareMenu(!showShareMenu);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
              showShareMenu ? 'bg-neutral-200 text-neutral-900' : 'bg-neutral-100 hover:bg-neutral-200'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span className="font-semibold">Share</span>
          </button>
          
          {showShareMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-2 z-10 border border-neutral-200">
              <button onClick={handleShare} className="w-full px-4 py-2 text-left hover:bg-neutral-100">Copy link</button>
              <button onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}`, '_blank')} className="w-full px-4 py-2 text-left hover:bg-neutral-100">Share on Twitter</button>
              <button onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank')} className="w-full px-4 py-2 text-left hover:bg-neutral-100">Share on Facebook</button>
            </div>
          )}
        </div>

        {/* Save to Playlist */}
        <div className="relative">
          <button
            onClick={() => setShowSaveMenu(!showSaveMenu)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${
              showSaveMenu ? 'bg-neutral-200 text-neutral-900' : 'bg-neutral-100 hover:bg-neutral-200'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            <span className="font-semibold">Save</span>
          </button>
          
          {showSaveMenu && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-xl py-2 z-10 border border-neutral-200">
              <div className="px-4 py-2 font-semibold border-b">Save to...</div>
              <button
                onClick={() => setSavedToWatchLater(!savedToWatchLater)}
                className="w-full px-4 py-2 text-left hover:bg-neutral-100 flex items-center justify-between"
              >
                <span>Watch later</span>
                <input type="checkbox" checked={savedToWatchLater} readOnly className="accent-red-600" />
              </button>
              <button
                onClick={() => setSavedToFavorites(!savedToFavorites)}
                className="w-full px-4 py-2 text-left hover:bg-neutral-100 flex items-center justify-between"
              >
                <span>Favorites</span>
                <input type="checkbox" checked={savedToFavorites} readOnly className="accent-red-600" />
              </button>
              <div className="border-t mt-2 pt-2">
                {showNewPlaylist ? (
                  <div className="px-4 py-2 space-y-2">
                    <input
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      placeholder="Playlist name"
                      className="w-full px-3 py-1.5 border border-neutral-300 rounded text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (newPlaylistName.trim()) {
                            alert(`Playlist "${newPlaylistName}" created`);
                            setNewPlaylistName('');
                            setShowNewPlaylist(false);
                          }
                        }}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                      >
                        Create
                      </button>
                      <button onClick={() => setShowNewPlaylist(false)} className="px-3 py-1 text-sm hover:bg-neutral-100 rounded">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowNewPlaylist(true)} className="w-full px-4 py-2 text-left text-red-600 hover:bg-neutral-100">+ Create new playlist</button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* More Options */}
        <div className="relative">
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className="p-2 hover:bg-neutral-200 rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
          {showMoreMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl py-1 z-10 border border-neutral-200">
              <button
                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/watch?v=${videoId}`); setShowMoreMenu(false); alert('Link copied!'); }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-100"
              >
                Copy link
              </button>
              <button
                onClick={() => { setShowMoreMenu(false); alert('Video removed from recommendations.'); }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-100"
              >
                Not interested
              </button>
              <button
                onClick={() => { setShowMoreMenu(false); alert('Thank you for reporting. We will review this content.'); }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-neutral-100"
              >
                Report
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
