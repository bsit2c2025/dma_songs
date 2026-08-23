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
  refreshProfile: () => Promise<void>;
}

const AuthContext = React.createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [profile, setProfile] = React.useState<AuthState["profile"]>(null);
  const [roles, setRoles] = React.useState<AppRole[]>([]);
  const [status, setStatus] = React.useState<AuthState["status"]>("loading");

  const loadIdentity = React.useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null);
      setRoles([]);
      return;
    }
    const [nextProfile, nextRoles] = await Promise.all([
      getProfile(userId).catch(() => null),
      getOwnRoles(userId).catch(() => [] as AppRole[]),
    ]);
    setProfile(nextProfile);
    setRoles(nextRoles);
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
      refreshProfile,
    }),
    [status, session, profile, roles, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>.");
  return context;
}
