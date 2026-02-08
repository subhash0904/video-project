import { useNavigate } from "react-router-dom";

const items = [
  { label: "Home", path: "/" },
  { label: "Shorts", path: "/shorts" },
  { label: "Subscriptions", path: "/" },
  { label: "Library", path: "/" },
  { label: "History", path: "/" },
];

export default function Sidebar() {
  const navigate = useNavigate();

  return (
    <aside className="fixed top-14 left-0 h-[calc(100vh-56px)] w-56 bg-[#0f0f0f] border-r border-neutral-800 hidden md:block">
      <nav className="p-2 space-y-1">
        {items.map((item) => (
          <div
            key={item.label}
            onClick={() => navigate(item.path)}
            className="px-3 py-2 rounded-lg hover:bg-neutral-800 cursor-pointer"
          >
            {item.label}
          </div>
        ))}
      </nav>
    </aside>
  );
}
