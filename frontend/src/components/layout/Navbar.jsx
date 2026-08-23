import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Navbar() {
  const { isAuthenticated, isAdmin, logout, profile } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-primary/10 bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-3">
          <LogoMark />
          <span className="hidden text-sm font-semibold uppercase tracking-wide text-primary sm:inline">
            DMA Music &amp; Arts
          </span>
        </Link>

        <nav className="flex items-center gap-4 text-sm font-medium text-primary">
          <NavLink to="/" className={({ isActive }) => (isActive ? "text-accent" : "hover:text-accent")} end>
            Home
          </NavLink>
          <NavLink to="/music" className={({ isActive }) => (isActive ? "text-accent" : "hover:text-accent")}>
            Music
          </NavLink>

          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) => (isActive ? "text-accent" : "hover:text-accent")}
            >
              Dashboard
            </NavLink>
          )}

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-muted sm:inline">{profile?.email}</span>
              <button onClick={logout} className="text-muted hover:text-accent">
                Log out
              </button>
            </div>
          ) : (
            <NavLink to="/login" className={({ isActive }) => (isActive ? "text-accent" : "hover:text-accent")}>
              Admin Login
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}

// Simple monochrome placeholder mark, standing in for dma-logo.jpg until the
// real logo asset is dropped into src/assets/dma-logo.jpg (see README).
function LogoMark() {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-primary text-xs font-bold text-primary">
      DMA
    </div>
  );
}
