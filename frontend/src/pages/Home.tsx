import VideoCard from "../components/video/videocard";

const mockVideos = Array.from({ length: 20 }).map((_, i) => ({
  id: String(i),
  title: `How I built a Video Platform – Part ${i + 1}`,
  channel: "Subhash Chowdary",
  views: `${(i + 3) * 12}K views`,
  uploaded: `${i + 1} days ago`,
  thumbnail: `https://picsum.photos/seed/${i}/640/360`,
}));

export default function Home() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Home Feed</h1>

      <div
        className="
          grid gap-4
          grid-cols-1
          sm:grid-cols-2
          md:grid-cols-3
          lg:grid-cols-4
          xl:grid-cols-5
        "
      >
        {mockVideos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </div>
  );
}
