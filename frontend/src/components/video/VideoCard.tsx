import { useNavigate } from "react-router-dom";

type Video = {
  id: string;
  title: string;
  channel: string;
  views: string;
  uploaded: string;
  thumbnail: string;
};

export default function VideoCard({ video }: { video: Video }) {
  const navigate = useNavigate();

  return (
    <div
      className="cursor-pointer"
      onClick={() => navigate(`/watch/${video.id}`)}
    >
      {/* Thumbnail */}
      <div className="relative w-full aspect-video bg-neutral-800 rounded-xl overflow-hidden">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Meta */}
      <div className="mt-3 flex gap-3">
        <div className="w-9 h-9 rounded-full bg-neutral-700 flex-shrink-0" />

        <div>
          <h3 className="font-semibold text-sm leading-snug line-clamp-2">
            {video.title}
          </h3>

          <p className="text-xs text-neutral-400 mt-1">
            {video.channel}
          </p>

          <p className="text-xs text-neutral-400">
            {video.views} • {video.uploaded}
          </p>
        </div>
      </div>
    </div>
  );
}
