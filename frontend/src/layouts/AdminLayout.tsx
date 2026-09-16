import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

const links = [
  { to: "/admin/moderation", label: "Moderation" },
  { to: "/admin/opportunities", label: "Marketplace Listings" },
  { to: "/admin/users", label: "Users" },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="page-container page-container-wide flex flex-col gap-grid-6 lg:flex-row">
      <aside className="shrink-0 lg:w-48">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Taxonomy admin
        </h2>
        <nav className="flex flex-col gap-1 text-sm">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-lg px-3 py-2 ${
                  isActive
                    ? "bg-brand-primary-soft font-medium text-brand-primary"
                    : "text-content-secondary hover:bg-surface-muted hover:text-content-primary"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex-1">{children}</div>
    </div>
  );
}
