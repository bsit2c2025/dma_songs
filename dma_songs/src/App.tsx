import * as React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { RequireAdmin, RequireAuth } from "@/features/auth/guards";
import { VoicePartProvider } from "@/features/voice/VoicePartProvider";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { FullPageLoader } from "@/components/common/FullPageLoader";
import { AppErrorBoundary } from "@/components/common/AppErrorBoundary";

// Eager: the pages almost everyone lands on.
import Home from "@/pages/Home";
import Songs from "@/pages/Songs";
import SongDetail from "@/pages/SongDetail";

// Lazy: everything else, so a guest never downloads the dashboard.
const Announcements = React.lazy(() => import("@/pages/Announcements"));
const Login = React.lazy(() => import("@/pages/Login"));
const AdminLogin = React.lazy(() => import("@/pages/AdminLogin"));
const AuthCallback = React.lazy(() => import("@/pages/AuthCallback"));
const ResetPassword = React.lazy(() => import("@/pages/ResetPassword"));
const Profile = React.lazy(() => import("@/pages/Profile"));
const Unauthorized = React.lazy(() => import("@/pages/Unauthorized"));
const NotFound = React.lazy(() => import("@/pages/NotFound"));

const Dashboard = React.lazy(() => import("@/pages/admin/Dashboard"));
const AdminSongs = React.lazy(() => import("@/pages/admin/AdminSongs"));
const AdminSongEditor = React.lazy(() => import("@/pages/admin/AdminSongEditor"));
const AdminAnnouncements = React.lazy(() => import("@/pages/admin/AdminAnnouncements"));
const AdminAnnouncementEditor = React.lazy(() => import("@/pages/admin/AdminAnnouncementEditor"));
const AdminUsers = React.lazy(() => import("@/pages/admin/AdminUsers"));
const AdminVoiceRequests = React.lazy(() => import("@/pages/admin/AdminVoiceRequests"));
const AdminVoiceClassifications = React.lazy(() => import("@/pages/admin/AdminVoiceClassifications"));
const AdminSettings = React.lazy(() => import("@/pages/admin/AdminSettings"));
const AdminActivity = React.lazy(() => import("@/pages/admin/AdminActivity"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Never retry a permission failure: the answer will not change.
        const code = (error as { code?: string })?.code;
        if (code === "42501" || code === "PGRST301") return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000,
    },
  },
});

export default function App() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <VoicePartProvider>
              <React.Suspense fallback={<FullPageLoader />}>
                <Routes>
                  {/* Standalone pages without the site chrome */}
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />

                  <Route element={<PublicLayout />}>
                    <Route index element={<Home />} />
                    <Route path="/songs" element={<Songs />} />
                    <Route path="/songs/:id" element={<SongDetail />} />
                    <Route path="/announcements" element={<Announcements />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/unauthorized" element={<Unauthorized />} />

                    <Route element={<RequireAuth />}>
                      <Route path="/profile" element={<Profile />} />
                    </Route>

                    <Route path="*" element={<NotFound />} />
                  </Route>

                  <Route element={<RequireAdmin />}>
                    <Route path="/admin" element={<AdminLayout />}>
                      <Route index element={<Dashboard />} />
                      <Route path="songs" element={<AdminSongs />} />
                      <Route path="songs/new" element={<AdminSongEditor />} />
                      <Route path="songs/:id/edit" element={<AdminSongEditor />} />
                      <Route path="announcements" element={<AdminAnnouncements />} />
                      <Route path="announcements/new" element={<AdminAnnouncementEditor />} />
                      <Route path="announcements/:id/edit" element={<AdminAnnouncementEditor />} />
                      <Route path="users" element={<AdminUsers />} />
                      <Route path="voice-requests" element={<AdminVoiceRequests />} />
                      <Route path="voice-classifications" element={<AdminVoiceClassifications />} />
                      <Route path="settings" element={<AdminSettings />} />
                      <Route path="activity" element={<AdminActivity />} />
                      <Route path="*" element={<Navigate to="/admin" replace />} />
                    </Route>
                  </Route>
                </Routes>
              </React.Suspense>

              <Toaster position="top-center" richColors closeButton />
            </VoicePartProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
