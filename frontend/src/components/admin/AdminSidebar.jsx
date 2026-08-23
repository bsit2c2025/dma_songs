import { NavLink } from "react-router-dom";

const LINKS = [
  { to: "/admin", label: "Overview", end: true },
  { to: "/admin/announcement", label: "Announcement" },
  { to: "/admin/songs", label: "Songs" },
  { to: "/admin/voice-parts", label: "Voice Parts" },
  { to: "/admin/categories", label: "Categories" },
  { to: "/admin/users", label: "Users" },
];

export default function AdminSidebar() {
  return (
    <aside className="w-full shrink-0 border-b border-primary/10 pb-4 sm:w-56 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Admin</p>
      <nav className="flex flex-row flex-wrap gap-1 sm:flex-col">
        {LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `rounded-md px-3 py-2 text-sm font-medium ${
                isActive ? "bg-accent/10 text-accent" : "text-primary hover:bg-primary/5"
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
