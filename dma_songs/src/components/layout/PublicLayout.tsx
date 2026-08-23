import * as React from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { LogIn, Menu, Music4, Megaphone, Home, UserRound, X, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/features/auth/AuthProvider";
import { useVoicePart } from "@/features/voice/VoicePartProvider";
import { VoicePartChip } from "@/components/common/VoicePartChip";
import { useSettings } from "@/hooks/useSettings";
import { settingString } from "@/services/settings";
import { cn, initials } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home", icon: Home, end: true },
  { to: "/songs", label: "Songs", icon: Music4, end: false },
  { to: "/announcements", label: "Announcements", icon: Megaphone, end: false },
];

export function PublicLayout() {
  const { status, profile, isAdmin } = useAuth();
  const { myPart } = useVoicePart();
  const { data: settings } = useSettings();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const location = useLocation();

  React.useEffect(() => setMenuOpen(false), [location.pathname]);

  const contactEmail = settingString(settings, "app.contact_email", "");

  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container flex h-16 items-center justify-between gap-4">
          <Logo />

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-2 text-sm font-semibold transition-colors",
                    isActive ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground",
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {myPart ? (
              <Link to="/songs" className="hidden sm:block" aria-label={`Your part: ${myPart.name}. Browse songs.`}>
                <VoicePartChip part={myPart} size="md" />
              </Link>
            ) : null}

            {status === "authenticated" ? (
              <Link to="/profile" className="rounded-full focus-visible:ring-2 focus-visible:ring-ring" aria-label="Your profile">
                <Avatar className="h-9 w-9">
                  {profile?.avatar_url ? <AvatarImage src={profile.avatar_url} alt="" /> : null}
                  <AvatarFallback>{initials(profile?.display_name)}</AvatarFallback>
                </Avatar>
              </Link>
            ) : (
              <Button asChild size="sm" variant="outline" className="hidden sm:inline-flex">
                <Link to="/login">
                  <LogIn aria-hidden /> Sign in
                </Link>
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              {menuOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </div>

        {menuOpen ? (
          <nav id="mobile-nav" className="border-t border-border bg-card md:hidden" aria-label="Mobile">
            <ul className="container flex flex-col py-2">
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-md px-2 py-3 text-sm font-semibold",
                        isActive ? "text-primary" : "text-foreground",
                      )
                    }
                  >
                    <item.icon className="h-4 w-4" aria-hidden />
                    {item.label}
                  </NavLink>
                </li>
              ))}
              <li>
                <NavLink
                  to={status === "authenticated" ? "/profile" : "/login"}
                  className="flex items-center gap-3 rounded-md px-2 py-3 text-sm font-semibold"
                >
                  <UserRound className="h-4 w-4" aria-hidden />
                  {status === "authenticated" ? "Your profile" : "Sign in"}
                </NavLink>
              </li>
              {isAdmin ? (
                <li>
                  <NavLink to="/admin" className="flex items-center gap-3 rounded-md px-2 py-3 text-sm font-semibold">
                    <ShieldCheck className="h-4 w-4" aria-hidden />
                    Dashboard
                  </NavLink>
                </li>
              ) : null}
            </ul>
          </nav>
        ) : null}
      </header>

      <main id="main" className="container flex-1 py-8">
        <Outlet />
      </main>

      <footer className="mt-8 border-t border-border bg-card">
        <div className="container flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <Logo size="sm" />
          <div className="flex flex-col gap-1 text-sm text-muted-foreground sm:items-end">
            <p>© {new Date().getFullYear()} DLL Music and Arts. All rights reserved.</p>
            <div className="flex gap-4">
              {contactEmail ? (
                <a className="hover:text-foreground" href={`mailto:${contactEmail}`}>
                  Contact us
                </a>
              ) : null}
              <Link className="hover:text-foreground" to={isAdmin ? "/admin" : "/admin/login"}>
                {isAdmin ? "Dashboard" : "Admin"}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
