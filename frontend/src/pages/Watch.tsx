import { useParams } from "react-router-dom";
import VideoCard from "../components/video/VideoCard";

const recommended = Array.from({ length: 12 }).map((_, i) => ({
  id: `rec-${i}`,
  title: `Recommended Video ${i + 1}`,
  channel: "Subhash Chowdary",
  views: `${(i + 5) * 10}K views`,
  uploaded: `${i + 1} days ago`,
  thumbnail: `https://picsum.photos/seed/rec${i}/640/360`,
}));

export default function Watch() {
  const { id } = useParams();

  return (
    <div className="p-4 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
      {/* LEFT: Player */}
      <div>
        <div className="w-full aspect-video bg-black rounded-xl overflow-hidden">
          <video
            className="w-full h-full"
            controls
            src=""
          />
        </div>

        <h1 className="mt-4 text-xl font-bold">
          How I built a Video Platform – {id}
        </h1>

        <div className="mt-2 flex items-center justify-between">
          <div>
            <p className="font-semibold">Subhash Chowdary</p>
            <p className="text-sm text-neutral-400">120K subscribers</p>
          </div>

          <div className="flex gap-2">
            <button className="px-4 py-2 rounded-full bg-neutral-800 hover:bg-neutral-700">
              👍 Like
            </button>
            <button className="px-4 py-2 rounded-full bg-neutral-800 hover:bg-neutral-700">
              🔔 Subscribe
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT: Recommendations */}
      <div className="space-y-4">
        {recommended.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </div>
  );
}
