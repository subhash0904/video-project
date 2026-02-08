import Navbar from "../navbar/Navbar";
import Sidebar from "../sidebar/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <Sidebar />
      <main className="pt-14 md:pl-56 min-h-screen bg-[#0f0f0f]">
        {children}
      </main>
    </>
  );
}
