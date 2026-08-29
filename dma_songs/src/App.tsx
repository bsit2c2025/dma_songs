import * as React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { RequireAdmin, RequireApprovedMember, RequireAuth } from "@/features/auth/guards";
import { VoicePartProvider } from "@/features/voice/VoicePartProvider";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { FullPageLoader } from "@/components/common/FullPageLoader";
import { AppErrorBoundary } from "@/components/common/AppErrorBoundary";
import { StorageNotice } from "@/components/common/StorageNotice";
import { useFavicon } from "@/hooks/useFavicon";
import { useRealtimeSync } from "@/hooks/useRealtimeSync";

// Eager: the landing page everyone sees first.
import Home from "@/pages/Home";

const Songs = React.lazy(() => import("@/pages/Songs"));
const SongDetail = React.lazy(() => import("@/pages/SongDetail"));
const PendingApproval = React.lazy(() => import("@/pages/PendingApproval"));
const Deactivated = React.lazy(() => import("@/pages/Deactivated"));
const Welcome = React.lazy(() => import("@/pages/Welcome"));
const AdminEvents = React.lazy(() => import("@/pages/admin/AdminEvents"));
const AdminEventAttendance = React.lazy(() => import("@/pages/admin/AdminEventAttendance"));

// Lazy: everything else, so a guest never downloads the dashboard.
const Announcements = React.lazy(() => import("@/pages/Announcements"));
const Login = React.lazy(() => import("@/pages/Login"));
const AdminLogin = React.lazy(() => import("@/pages/AdminLogin"));
const AuthCallback = React.lazy(() => import("@/pages/AuthCallback"));
const ResetPassword = React.lazy(() => import("@/pages/ResetPassword"));
const Profile = React.lazy(() => import("@/pages/Profile"));
const Unauthorized = React.lazy(() => import("@/pages/Unauthorized"));
const Privacy = React.lazy(() => import("@/pages/legal/Privacy"));
const Terms = React.lazy(() => import("@/pages/legal/Terms"));
const CopyrightPage = React.lazy(() => import("@/pages/legal/Copyright"));
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

      // Coming back to the app should show current data. This was off, which
      // is why a phone left open on the song list kept showing a song that had
      // been deleted on somebody's laptop an hour earlier.
      refetchOnWindowFocus: true,
      // A phone that loses signal in a rehearsal hall and picks it up again
      // should not have to be reopened to catch up.
      refetchOnReconnect: true,

      // Short enough that a returning tab refetches, long enough that moving
      // between pages does not re-request the same list every time.
      staleTime: 10 * 1000,
    },
  },
});

/**
 * Side effects that need the providers above them but render nothing.
 */
function Chrome() {
  useFavicon();
  useRealtimeSync();
  return null;
}

export default function App() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <VoicePartProvider>
              <Chrome />
              <React.Suspense fallback={<FullPageLoader />}>
                <Routes>
                  {/* Standalone pages without the site chrome */}
                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />

                  <Route element={<PublicLayout />}>
                    <Route index element={<Home />} />
                    <Route path="/pending" element={<PendingApproval />} />
                    <Route path="/deactivated" element={<Deactivated />} />
                    <Route path="/welcome" element={<Welcome />} />

                    {/* The music is members-only. The database enforces it;
                        this just redirects rather than showing an empty page. */}
                    <Route element={<RequireApprovedMember />}>
                      <Route path="/songs" element={<Songs />} />
                      <Route path="/songs/:id" element={<SongDetail />} />
                    </Route>
                    <Route path="/announcements" element={<Announcements />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/unauthorized" element={<Unauthorized />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="/terms" element={<Terms />} />
                    <Route path="/copyright" element={<CopyrightPage />} />

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
                      <Route path="events" element={<AdminEvents />} />
                      <Route path="events/:id" element={<AdminEventAttendance />} />
                      <Route path="voice-classifications" element={<AdminVoiceClassifications />} />
                      <Route path="settings" element={<AdminSettings />} />
                      <Route path="activity" element={<AdminActivity />} />
                      <Route path="*" element={<Navigate to="/admin" replace />} />
                    </Route>
                  </Route>
                </Routes>
              </React.Suspense>

              <StorageNotice />
              <Toaster position="top-center" richColors closeButton />
            </VoicePartProvider>
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </AppErrorBoundary>
  );
}
