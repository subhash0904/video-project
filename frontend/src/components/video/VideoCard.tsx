import { useNavigate } from "react-router-dom";
import { useState } from "react";
import type { Video } from "../../types";
import { formatViews, formatTimeAgo, formatDuration } from "../../utils/format";

interface VideoCardProps {
  video: Video;
  isLiked?: boolean;
}

export default function VideoCard({ video, isLiked = false }: VideoCardProps) {
  const navigate = useNavigate();
  const [showPreview, setShowPreview] = useState(false);

  const handleMouseEnter = () => {
    setShowPreview(true);
  };

  const handleMouseLeave = () => {
    setShowPreview(false);
  };

  return (
    <div
      className="cursor-pointer group"
      onClick={() => navigate(`/watch?v=${video.id}`)}
    >
      <div 
        className={`relative aspect-video bg-neutral-200 rounded-xl overflow-hidden group transition-all ${isLiked ? 'ring-2 ring-blue-500' : ''}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <img
          src={video.thumbnailUrl}
          alt={video.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {video.duration && (
          <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-xs font-semibold text-white">
            {formatDuration(video.duration)}
          </div>
        )}
        
        {showPreview && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl">
            <div className="text-white text-center">
              <div className="text-3xl mb-2">▶️</div>
              <div className="text-sm font-semibold">Preview</div>
            </div>
          </div>
        )}
        
        {isLiked && (
          <div className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
            👍 Liked
          </div>
        )}
      </div>

      <div className="mt-3 flex gap-3">
        <div className="shrink-0">
          {video.channel.avatarUrl ? (
            <img 
              src={video.channel.avatarUrl} 
              alt={video.channel.name}
              className="w-9 h-9 rounded-full border border-neutral-200"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-neutral-200 flex items-center justify-center text-sm font-semibold text-neutral-700">
              {video.channel.name[0].toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm line-clamp-2 text-neutral-900 group-hover:text-black">
            {video.title}
          </h3>
          <p className="text-xs text-neutral-600 flex items-center gap-1 mt-1">
            {video.channel.name}
            {video.channel.verified && (
              <svg className="w-3 h-3 text-neutral-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </p>
          <p className="text-xs text-neutral-500">
            {formatViews(video.views)} views • {formatTimeAgo(video.publishedAt)}
          </p>
        </div>
      </div>
    </div>
  );
}
