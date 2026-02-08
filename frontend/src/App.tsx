import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import Home from "./pages/Home";
import Watch from "./pages/Watch";
import Shorts from "./pages/Shorts";

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/watch/:id" element={<Watch />} />
          <Route path="/shorts" element={<Shorts />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}
