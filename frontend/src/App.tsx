import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";

function Home() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Home Feed</h1>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}
