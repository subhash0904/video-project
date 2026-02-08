export default function Navbar() {
  return (
    <header className="fixed top-0 inset-x-0 h-14 bg-[#0f0f0f] border-b border-neutral-800 z-50 flex items-center px-4">
      <div className="flex items-center gap-3">
        <button className="p-2 rounded hover:bg-neutral-800">☰</button>
        <span className="font-semibold text-lg">VideoPlatform</span>
      </div>

      <div className="flex-1 mx-6 hidden md:block">
        <input
          className="w-full bg-neutral-900 border border-neutral-800 rounded-full px-4 py-2 outline-none"
          placeholder="Search"
        />
      </div>

      <div className="flex items-center gap-3">
        <button className="p-2 rounded hover:bg-neutral-800">＋</button>
        <button className="p-2 rounded hover:bg-neutral-800">🔔</button>
        <div className="w-8 h-8 rounded-full bg-neutral-700" />
      </div>
    </header>
  );
}
