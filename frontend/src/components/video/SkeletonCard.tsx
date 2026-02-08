export default function SkeletonCard() {
  return (
    <div className="animate-pulse">
      {/* Thumbnail */}
      <div className="w-full aspect-video bg-neutral-800 rounded-xl" />

      {/* Meta */}
      <div className="mt-3 flex gap-3">
        <div className="w-9 h-9 rounded-full bg-neutral-700" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-neutral-700 rounded w-11/12" />
          <div className="h-3 bg-neutral-700 rounded w-7/12" />
          <div className="h-3 bg-neutral-700 rounded w-5/12" />
        </div>
      </div>
    </div>
  );
}
