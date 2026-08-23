import * as React from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getOwnRoles, getProfile } from "@/services/members";
import type { AppRole } from "@/types/database";
import type { Profile, VoiceClassification } from "@/types/models";

export interface AuthState {
  status: "loading" | "authenticated" | "anonymous";
  session: Session | null;
  user: User | null;
  profile: (Profile & { voice_classifications: VoiceClassification | null }) | null;
  roles: AppRole[];
  /**
   * UI hint only. It decides which links are rendered — never whether an
   * action succeeds. Every write is checked again by RLS in the database, so
   * flipping this in devtools reveals a dashboard whose every query fails.
   */
  isAdmin: boolean;
  /**
   * Set when the profile or role lookup itself failed, as opposed to
   * succeeding and finding no admin role. Without this the two are
   * indistinguishable and a broken policy looks exactly like "not an admin".
   */
  identityError: string | null;
  refreshProfile: () => Promise<void>;
}

const AuthContext = React.createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [profile, setProfile] = React.useState<AuthState["profile"]>(null);
  const [roles, setRoles] = React.useState<AppRole[]>([]);
  const [status, setStatus] = React.useState<AuthState["status"]>("loading");
  const [identityError, setIdentityError] = React.useState<string | null>(null);

  const loadIdentity = React.useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null);
      setRoles([]);
      setIdentityError(null);
      return;
    }

    const [profileResult, rolesResult] = await Promise.allSettled([
      getProfile(userId),
      getOwnRoles(userId),
    ]);

    setProfile(profileResult.status === "fulfilled" ? profileResult.value : null);
    setRoles(rolesResult.status === "fulfilled" ? rolesResult.value : []);

    // A failed lookup is reported rather than swallowed. Swallowing it turns
    // "the database refused to tell us your roles" into a silent
    // "you are not an administrator", which is a miserable thing to debug.
    const failures = [
      profileResult.status === "rejected"
        ? `profile: ${(profileResult.reason as Error)?.message ?? "unknown error"}`
        : null,
      rolesResult.status === "rejected"
        ? `roles: ${(rolesResult.reason as Error)?.message ?? "unknown error"}`
        : null,
    ].filter(Boolean);

    if (failures.length > 0) {
      console.error("[dma_songs] identity lookup failed —", failures.join(" | "));
      setIdentityError(failures.join(" | "));
    } else {
      setIdentityError(null);
      if (profileResult.status === "fulfilled" && !profileResult.value) {
        console.warn(
          "[dma_songs] signed in, but there is no profiles row for this account. " +
            "See the backfill at the bottom of supabase/diagnose.sql.",
        );
      }
    }
  }, []);

  React.useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadIdentity(data.session?.user.id);
      if (active) setStatus(data.session ? "authenticated" : "anonymous");
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (event === "SIGNED_OUT") {
        setProfile(null);
        setRoles([]);
        setStatus("anonymous");
        return;
      }
      if (nextSession?.user.id && nextSession.user.id !== profile?.id) {
        await loadIdentity(nextSession.user.id);
      }
      setStatus(nextSession ? "authenticated" : "anonymous");
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
    // profile?.id is intentionally omitted: re-subscribing on every profile
    // change would tear down the auth listener mid-session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadIdentity]);

  const refreshProfile = React.useCallback(async () => {
    await loadIdentity(session?.user.id);
  }, [loadIdentity, session?.user.id]);

  const value = React.useMemo<AuthState>(
    () => ({
      status,
      session,
      user: session?.user ?? null,
      profile,
      roles,
      isAdmin: roles.includes("admin"),
      identityError,
      refreshProfile,
    }),
    [status, session, profile, roles, identityError, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>.");
  return context;
}
