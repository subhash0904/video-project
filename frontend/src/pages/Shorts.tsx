const shorts = Array.from({ length: 8 }).map((_, i) => ({
  id: `short-${i}`,
  title: `Short clip #${i + 1}`,
  video: "https://www.w3schools.com/html/mov_bbb.mp4",
}));

export default function Shorts() {
  return (
    <div className="h-[calc(100vh-56px)] overflow-y-scroll snap-y snap-mandatory">
      {shorts.map((s) => (
        <div
          key={s.id}
          className="h-full snap-start flex items-center justify-center bg-black"
        >
          <div className="relative w-full max-w-md h-full">
            <video
              src={s.video}
              className="w-full h-full object-cover"
              autoPlay
              muted
              loop
              playsInline
            />

            {/* Overlay */}
            <div className="absolute bottom-20 left-4 text-white">
              <p className="font-semibold">{s.title}</p>
              <p className="text-sm text-neutral-300">@subhash</p>
            </div>

            {/* Actions */}
            <div className="absolute bottom-24 right-4 flex flex-col gap-4">
              <button className="w-10 h-10 rounded-full bg-neutral-800">👍</button>
              <button className="w-10 h-10 rounded-full bg-neutral-800">💬</button>
              <button className="w-10 h-10 rounded-full bg-neutral-800">↗️</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
