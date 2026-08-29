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


/**
 * The music itself is members-only, and the account has to have been approved.
 *
 * This is a redirect, not the protection: the database policies added in 0010
 * are what actually stop a signed-out request to the REST API returning songs.
 * What this does is give the person a page that explains itself instead of an
 * empty list.
 */
export function RequireApprovedMember() {
  const { status, profile } = useAuth();
  const location = useLocation();

  if (status === "loading") return <FullPageLoader />;

  if (status !== "authenticated") {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Deactivation comes first: telling somebody their account is off is more
  // use than telling them it is unapproved when it was approved months ago.
  if (profile && !profile.is_active) {
    return <Navigate to="/deactivated" replace />;
  }

  if (!profile?.approved_at) {
    return <Navigate to="/pending" replace />;
  }

  return <Outlet />;
}
