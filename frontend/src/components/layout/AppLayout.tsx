import Navbar from "../navbar/Navbar";
import Sidebar from "../sidebar/Sidebar";
import { useSidebar } from "../../hooks/useSidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isOpen } = useSidebar();

  return (
    <div className="min-h-screen bg-transparent">
      <Navbar />
      <Sidebar />
      <main className={`pt-16 transition-all duration-300 px-4 md:px-6 pb-10 ${
        isOpen ? 'md:pl-60' : 'md:pl-16'
      }`}>
        {children}
      </main>
    </div>
  );
}
