import { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

interface Comment {
  id: string;
  userId: string;
  user: {
    displayName: string;
    avatarUrl: string;
  };
  content: string;
  likes: number;
  createdAt: string;
  parentId?: string;
  replies?: Comment[];
}

interface CommentsProps {
  videoId: string;
  totalComments: number;
}

export function Comments({ videoId, totalComments }: CommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [sortBy, setSortBy] = useState<'top' | 'new'>('top');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [likedComments, setLikedComments] = useState<Record<string, boolean>>({});

  useEffect (() => {
    fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, sortBy]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await apiClient.get(`/videos/${videoId}/comments?sort=${sortBy}`);
      if (data.success) {
        setComments(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const postComment = async () => {
    if (!newComment.trim()) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await apiClient.post(`/videos/${videoId}/comments`, { content: newComment });
      if (data.success) {
        setComments([data.data, ...comments]);
        setNewComment('');
      }
    } catch (error) {
      console.error('Failed to post comment:', error);
    }
  };

  const postReply = async (parentId: string) => {
    if (!replyText.trim()) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any = await apiClient.post(`/videos/${videoId}/comments`, { content: replyText, parentId });
      if (data.success) {
        fetchComments();
        setReplyText('');
        setReplyingTo(null);
      }
    } catch (error) {
      console.error('Failed to post reply:', error);
    }
  };

  const likeComment = async (commentId: string) => {
    try {
      await apiClient.post(`/videos/${videoId}/comments/${commentId}/like`);
      setLikedComments((prev) => ({ ...prev, [commentId]: true }));
      fetchComments();
    } catch (error) {
      console.error('Failed to like comment:', error);
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      await apiClient.delete(`/videos/${videoId}/comments/${commentId}`);
      fetchComments();
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 86400)} days ago`;
    if (seconds < 31536000) return `${Math.floor(seconds / 2592000)} months ago`;
    return `${Math.floor(seconds / 31536000)} years ago`;
  };

  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => (
    <div className={`flex gap-3 ${isReply ? 'ml-12 mt-3' : 'py-4'}`}>
      <img
        src={comment.user.avatarUrl}
        alt={comment.user.displayName}
        className="w-10 h-10 rounded-full shrink-0 border border-neutral-200"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-neutral-900">{comment.user.displayName}</span>
          <span className="text-neutral-500 text-xs">{formatTimeAgo(comment.createdAt)}</span>
        </div>
        <p className="mt-1 text-sm text-neutral-800">{comment.content}</p>
        
        <div className="flex items-center gap-4 mt-2">
          <button
            onClick={() => likeComment(comment.id)}
            className={`flex items-center gap-1 transition-colors ${
              likedComments[comment.id] ? 'text-red-600' : 'hover:text-red-600'
            }`}
            disabled={likedComments[comment.id]}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
            </svg>
            <span className="text-xs">{comment.likes}</span>
          </button>
          
          {!isReply && (
            <button
              onClick={() => setReplyingTo(comment.id)}
              className="text-xs font-semibold hover:text-red-600 transition-colors"
            >
              REPLY
            </button>
          )}

          {user?.id === comment.userId && (
            <button
              onClick={() => deleteComment(comment.id)}
              className="ml-auto text-xs text-neutral-500 hover:text-red-600"
            >
              Delete
            </button>
          )}
        </div>

        {/* Reply Input */}
        {replyingTo === comment.id && (
          <div className="mt-3 flex gap-3">
            <img
              src="https://ui-avatars.com/api/?name=You&size=40"
              alt="Your avatar"
              className="w-8 h-8 rounded-full shrink-0"
            />
            <div className="flex-1">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Add a reply..."
                className="w-full px-0 py-2 border-0 border-b-2 border-neutral-200 focus:border-red-600 focus:outline-none bg-transparent"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => {
                    setReplyingTo(null);
                    setReplyText('');
                  }}
                  className="px-4 py-2 text-sm font-semibold hover:bg-neutral-100 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={() => postReply(comment.id)}
                  disabled={!replyText.trim()}
                  className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-neutral-300 disabled:cursor-not-allowed"
                >
                  Reply
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3">
            {comment.replies.map(reply => (
              <CommentItem key={reply.id} comment={reply} isReply />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="mt-6 bg-white border border-neutral-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-8 mb-6">
        <h2 className="text-xl font-bold">{totalComments.toLocaleString()} Comments</h2>
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-neutral-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h5a1 1 0 000-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM13 16a1 1 0 102 0v-5.586l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 101.414 1.414L13 10.414V16z" />
          </svg>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'top' | 'new')}
            className="font-semibold border-none bg-transparent cursor-pointer focus:outline-none text-neutral-700"
          >
            <option value="top">Top comments</option>
            <option value="new">Newest first</option>
          </select>
        </div>
      </div>

      {/* New Comment Input */}
      <div className="flex gap-3 mb-6">
        <img
          src="https://ui-avatars.com/api/?name=You&size=40"
          alt="Your avatar"
          className="w-10 h-10 rounded-full shrink-0"
        />
        <div className="flex-1">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full px-0 py-2 border-0 border-b-2 border-neutral-200 focus:border-red-600 focus:outline-none bg-transparent"
          />
          {newComment && (
            <div className="flex gap-2 mt-2 justify-end">
              <button
                onClick={() => setNewComment('')}
                className="px-4 py-2 text-sm font-semibold hover:bg-neutral-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={postComment}
                disabled={!newComment.trim()}
                className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-neutral-300 disabled:cursor-not-allowed"
              >
                Comment
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Comments List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="divide-y divide-neutral-200">
          {comments.map(comment => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
          {comments.length === 0 && (
            <p className="text-center py-8 text-neutral-500">No comments yet. Be the first to comment!</p>
          )}
        </div>
      )}
    </div>
  );
}
