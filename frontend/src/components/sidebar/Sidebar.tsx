const items = [
  "Home",
  "Shorts",
  "Subscriptions",
  "Library",
  "History",
];

export default function Sidebar() {
  return (
    <aside className="fixed top-14 left-0 h-[calc(100vh-56px)] w-56 bg-[#0f0f0f] border-r border-neutral-800 hidden md:block">
      <nav className="p-2 space-y-1">
        {items.map((item) => (
          <div
            key={item}
            className="px-3 py-2 rounded-lg hover:bg-neutral-800 cursor-pointer"
          >
            {item}
          </div>
        ))}
      </nav>
    </aside>
  );
}
