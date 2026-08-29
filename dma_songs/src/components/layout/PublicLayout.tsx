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

  // While the panel is open the page behind it must not scroll, or a swipe
  // moves the wrong thing — the classic mobile drawer annoyance.
  React.useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

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

      </header>

      {/*
        A slide-in panel rather than a dropdown inside the header.

        The dropdown grew the sticky header itself, so on a short Android
        viewport — where Chrome's URL bar eats another 56px — the last items
        fell off the bottom with nothing to scroll. This is fixed to the
        viewport, sized in dvh so it tracks the URL bar as it hides, and
        scrolls internally when the list is longer than the screen.
      */}
      {menuOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-ink/50 backdrop-blur-[2px] md:hidden"
            onClick={() => setMenuOpen(false)}
            aria-label="Close the menu"
          />
          <nav
            id="mobile-nav"
            aria-label="Mobile"
            className="fixed inset-y-0 right-0 z-50 flex h-[100dvh] w-[86%] max-w-xs flex-col border-l border-border bg-card shadow-2xl md:hidden"
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-4">
              <Logo />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMenuOpen(false)}
                aria-label="Close the menu"
              >
                <X />
              </Button>
            </div>

            <ul className="flex-1 overflow-y-auto overscroll-contain p-3">
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        // 48px minimum: a comfortable tap target on a phone.
                        "flex min-h-12 items-center gap-3 rounded-md px-3 py-3 text-base font-semibold",
                        isActive ? "bg-secondary text-secondary-foreground" : "text-foreground hover:bg-accent",
                      )
                    }
                  >
                    <item.icon className="h-5 w-5 shrink-0" aria-hidden />
                    {item.label}
                  </NavLink>
                </li>
              ))}

              <li className="my-2 border-t border-border" />

              <li>
                <NavLink
                  to={status === "authenticated" ? "/profile" : "/login"}
                  className="flex min-h-12 items-center gap-3 rounded-md px-3 py-3 text-base font-semibold hover:bg-accent"
                >
                  <UserRound className="h-5 w-5 shrink-0" aria-hidden />
                  {status === "authenticated" ? "Your profile" : "Sign in"}
                </NavLink>
              </li>

              {isAdmin ? (
                <li>
                  <NavLink
                    to="/admin"
                    className="flex min-h-12 items-center gap-3 rounded-md px-3 py-3 text-base font-semibold hover:bg-accent"
                  >
                    <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden />
                    Dashboard
                  </NavLink>
                </li>
              ) : null}

              {myPart ? (
                <li className="px-3 py-3">
                  <p className="mb-1.5 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
                    Your voice part
                  </p>
                  <VoicePartChip part={myPart} size="md" />
                </li>
              ) : null}
            </ul>

            {/* Padded for the Android gesture bar. */}
            <div className="shrink-0 border-t border-border p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                <Link to="/privacy">Privacy</Link>
                <Link to="/terms">Terms</Link>
                <Link to="/copyright">Copyright</Link>
              </div>
            </div>
          </nav>
        </>
      ) : null}


      <main id="main" className="container flex-1 py-8">
        <Outlet />
      </main>

      <footer className="mt-8 border-t border-border bg-card">
        <div className="container flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
          <Logo size="sm" />
          <div className="flex flex-col gap-1 text-sm text-muted-foreground sm:items-end">
            <p>
              © {new Date().getFullYear()} DLL Music and Arts. Music and arrangements remain the
              property of their rights holders.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link className="hover:text-foreground" to="/privacy">
                Privacy
              </Link>
              <Link className="hover:text-foreground" to="/terms">
                Terms
              </Link>
              <Link className="hover:text-foreground" to="/copyright">
                Copyright
              </Link>
              {contactEmail ? (
                <a className="hover:text-foreground" href={`mailto:${contactEmail}`}>
                  Contact
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
