import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthProvider";
import { FullPageLoader } from "@/components/common/FullPageLoader";

/** Requires a signed-in account. Content protection still lives in RLS. */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") return <FullPageLoader label="Checking your session" />;
  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

/**
 * Requires the admin role. This only decides what is *rendered*: the
 * dashboard's data all comes from admin-only policies and RPCs, so a user who
 * forces their way past this component sees a shell of failed requests.
 */
export function RequireAdmin() {
  const { status, isAdmin } = useAuth();
  const location = useLocation();

  if (status === "loading") return <FullPageLoader label="Checking your access" />;
  if (status === "anonymous") {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }
  if (!isAdmin) return <Navigate to="/unauthorized" replace />;
  return <Outlet />;
}
