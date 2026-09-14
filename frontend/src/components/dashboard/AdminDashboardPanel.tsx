import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import AdminUsers from "../../pages/admin/AdminUsers";
import AdminUserDetail from "../../pages/admin/AdminUserDetail";
import AdminModerationQueue from "../../pages/admin/AdminModerationQueue";
import AdminOpportunities from "../../pages/admin/AdminOpportunities";

type AdminSection = "users" | "moderation" | "opportunities";

export function AdminDashboardPanel() {
  const [searchParams] = useSearchParams();
  const requestedSection = searchParams.get("section");
  const initialSection: AdminSection | null =
    requestedSection === "users" ||
    requestedSection === "moderation" ||
    requestedSection === "opportunities"
      ? requestedSection
      : null;
  const [section, setSection] = useState<AdminSection | null>(initialSection);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const toolsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (
      requestedSection === "users" ||
      requestedSection === "moderation" ||
      requestedSection === "opportunities"
    ) {
      setSection(requestedSection);
      setSelectedUserId(null);
    }
  }, [requestedSection]);

  useEffect(() => {
    if (section) {
      requestAnimationFrame(() =>
        toolsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      );
    }
  }, [section]);

  if (!section) return null;

  return (
    <section ref={toolsRef} aria-label="Admin dashboard tools">
      <div className="mb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-400">
            Dashboard tools
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Users, moderation and marketplace
          </h2>
        </div>
      </div>

      {section === "users" && selectedUserId ? (
        <AdminUserDetail
          embedded
          userId={selectedUserId}
          onBack={() => setSelectedUserId(null)}
        />
      ) : section === "users" ? (
        <AdminUsers embedded onSelectUser={setSelectedUserId} />
      ) : null}
      {section === "moderation" && <AdminModerationQueue embedded />}
      {section === "opportunities" && <AdminOpportunities embedded />}
    </section>
  );
}
