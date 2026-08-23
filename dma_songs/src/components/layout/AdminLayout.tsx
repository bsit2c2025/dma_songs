import * as React from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Activity, ChevronLeft, LayoutDashboard, LogOut, Megaphone, Menu, Music4,
  Settings, Users, Waves, X, UserRound,
} from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/features/auth/AuthProvider";
import { signOut } from "@/services/auth";
import { logAdminEvent } from "@/services/activity";
import { cn, initials } from "@/lib/utils";
import { toast } from "sonner";

const SECTIONS = [
  {
    label: null,
    items: [{ to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true }],
  },
  {
    label: "Content",
    items: [
      { to: "/admin/songs", label: "Songs", icon: Music4, end: false },
      { to: "/admin/announcements", label: "Announcements", icon: Megaphone, end: false },
    ],
  },
  {
    label: "People",
    items: [
      { to: "/admin/users", label: "Members", icon: Users, end: false },
      { to: "/admin/voice-classifications", label: "Voice parts", icon: Waves, end: false },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/admin/activity", label: "Activity log", icon: Activity, end: false },
      { to: "/admin/settings", label: "Settings", icon: Settings, end: false },
    ],
  },
] as const;

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-6 p-4" aria-label="Dashboard">
      {SECTIONS.map((section, index) => (
        <div key={section.label ?? index} className="space-y-1">
          {section.label ? (
            <p className="px-3 pb-1 font-mono text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
              {section.label}
            </p>
          ) : null}
          {section.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )
              }
            >
              <item.icon className="h-4 w-4 shrink-0" aria-hidden />
              {item.label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  );
}

export function AdminLayout() {
  const { profile, user } = useAuth();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => setDrawerOpen(false), [location.pathname]);

  async function handleSignOut() {
    try {
      await logAdminEvent("auth.admin_signed_out");
      await signOut();
      navigate("/", { replace: true });
      toast.success("Signed out");
    } catch {
      toast.error("Sign out didn't complete. Try again.");
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <div className="border-b border-border p-4">
          <Logo to="/admin" size="sm" />
        </div>
        <div className="flex-1 overflow-y-auto">
          <SidebarNav />
        </div>
        <div className="border-t border-border p-4">
          <Link
            to="/profile"
            className="mb-3 flex items-center gap-3 rounded-md p-1 hover:bg-accent"
          >
            <Avatar className="h-9 w-9">
              {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt="" /> : null}
              <AvatarFallback>{initials(profile?.display_name)}</AvatarFallback>
            </Avatar>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{profile?.display_name || "Administrator"}</span>
              <span className="block truncate text-xs text-muted-foreground">{user?.email}</span>
            </span>
          </Link>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="flex-1">
              <Link to="/">
                <ChevronLeft aria-hidden /> Site
              </Link>
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut aria-hidden /> Sign out
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-3 border-b border-border bg-card px-4 lg:hidden">
          <Logo to="/admin" size="sm" showWordmark={false} />
          <span className="font-display text-lg">Dashboard</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open dashboard menu"
            aria-expanded={drawerOpen}
          >
            <Menu />
          </Button>
        </header>

        {drawerOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-foreground/40"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
            />
            <div className="absolute inset-y-0 right-0 flex w-72 flex-col bg-card shadow-xl">
              <div className="flex items-center justify-between border-b border-border p-4">
                <Logo to="/admin" size="sm" showWordmark={false} />
                <Button variant="ghost" size="icon" onClick={() => setDrawerOpen(false)} aria-label="Close menu">
                  <X />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <SidebarNav onNavigate={() => setDrawerOpen(false)} />
                <Separator />
                <div className="space-y-1 p-4">
                  <Link to="/profile" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold">
                    <UserRound className="h-4 w-4" aria-hidden /> Profile
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold text-destructive"
                  >
                    <LogOut className="h-4 w-4" aria-hidden /> Sign out
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
