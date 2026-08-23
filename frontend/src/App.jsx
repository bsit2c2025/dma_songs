import { Routes, Route } from "react-router-dom";
import PublicLayout from "./layouts/PublicLayout";
import AdminLayout from "./layouts/AdminLayout";
import ProtectedRoute from "./routes/ProtectedRoute";

import Home from "./pages/Home";
import Music from "./pages/Music";
import SongDetail from "./pages/SongDetail";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

import Dashboard from "./pages/admin/Dashboard";
import AnnouncementAdmin from "./pages/admin/AnnouncementAdmin";
import SongsAdmin from "./pages/admin/SongsAdmin";
import VoicePartsAdmin from "./pages/admin/VoicePartsAdmin";
import CategoriesAdmin from "./pages/admin/CategoriesAdmin";
import UsersAdmin from "./pages/admin/UsersAdmin";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/music" element={<Music />} />
        <Route path="/music/:id" element={<SongDetail />} />
        <Route path="/login" element={<Login />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin" element={<Dashboard />} />
        <Route path="/admin/announcement" element={<AnnouncementAdmin />} />
        <Route path="/admin/songs" element={<SongsAdmin />} />
        <Route path="/admin/voice-parts" element={<VoicePartsAdmin />} />
        <Route path="/admin/categories" element={<CategoriesAdmin />} />
        <Route path="/admin/users" element={<UsersAdmin />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
