import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { lazy, Suspense } from "react";
import AppLayout from "./components/layout/AppLayout";

// Eager-load critical path (Home renders first)
import Home from "./pages/Home";

// Lazy-load all other pages for code-splitting
const Watch = lazy(() => import("./pages/Watch"));
const Shorts = lazy(() => import("./pages/Shorts"));
const Search = lazy(() => import("./pages/Search"));
const Login = lazy(() => import("./pages/Login"));
const Upload = lazy(() => import("./pages/Upload"));
const Channel = lazy(() => import("./pages/Channel"));
const Profile = lazy(() => import("./pages/Profile"));
const History = lazy(() => import("./pages/History"));
const Liked = lazy(() => import("./pages/Liked"));
const Subscriptions = lazy(() => import("./pages/Subscriptions"));
const Studio = lazy(() => import("./pages/Studio"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const StudioDashboard = lazy(() => import("./pages/studio/StudioDashboard"));
const StudioContent = lazy(() => import("./pages/studio/StudioContent"));
const StudioAnalytics = lazy(() => import("./pages/studio/StudioAnalytics"));
const StudioCommunity = lazy(() => import("./pages/studio/StudioCommunity"));
const StudioSubtitles = lazy(() => import("./pages/studio/StudioSubtitles"));
const StudioCopyright = lazy(() => import("./pages/studio/StudioCopyright"));
const StudioEarn = lazy(() => import("./pages/studio/StudioEarn"));
const StudioCustomization = lazy(() => import("./pages/studio/StudioCustomization"));
const StudioUpload = lazy(() => import("./pages/studio/StudioUpload"));
const StudioAudioLibrary = lazy(() => import("./pages/studio/StudioAudioLibrary"));
const StudioSettings = lazy(() => import("./pages/studio/StudioSettings"));
const StudioFeedback = lazy(() => import("./pages/studio/StudioFeedback"));
const StudioGoLive = lazy(() => import("./pages/studio/StudioGoLive"));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-8 h-8 border-4 border-neutral-200 border-t-red-600 rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Main Layout */}
          <Route element={<AppLayout><Outlet /></AppLayout>}>
            <Route path="/" element={<Home />} />
            <Route path="/watch" element={<Watch />} />
            <Route path="/shorts" element={<Shorts />} />
            <Route path="/shorts/:id" element={<Shorts />} />
            <Route path="/search" element={<Search />} />
            <Route path="/channel/:handle" element={<Channel />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/history" element={<History />} />
            <Route path="/liked" element={<Liked />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            
            {/* Studio Routes */}
            <Route path="/studio" element={<Studio />}>
              <Route index element={<StudioDashboard />} />
              <Route path="content" element={<StudioContent />} />
              <Route path="analytics" element={<StudioAnalytics />} />
              <Route path="community" element={<StudioCommunity />} />
              <Route path="subtitles" element={<StudioSubtitles />} />
              <Route path="copyright" element={<StudioCopyright />} />
              <Route path="earn" element={<StudioEarn />} />
              <Route path="customization" element={<StudioCustomization />} />
              <Route path="audio-library" element={<StudioAudioLibrary />} />
              <Route path="go-live" element={<StudioGoLive />} />
              <Route path="settings" element={<StudioSettings />} />
              <Route path="feedback" element={<StudioFeedback />} />
            </Route>
          </Route>
          
          {/* Modals/Overlays (outside main layout) */}
          <Route path="/studio/upload-modal" element={<StudioUpload />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
