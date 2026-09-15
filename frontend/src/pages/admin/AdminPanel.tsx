import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import AdminUniversities from "./AdminUniversities";
import AdminFaculties from "./AdminFaculties";
import AdminProgrammes from "./AdminProgrammes";
import AdminSubjects from "./AdminSubjects";
import AdminTaxonomyRequests from "./AdminTaxonomyRequests";

type TaxonomySection =
  | "universities"
  | "faculties"
  | "programmes"
  | "subjects"
  | "requests";
const sections: { key: TaxonomySection; label: string }[] = [
  { key: "universities", label: "Universities" },
  { key: "faculties", label: "Faculties" },
  { key: "programmes", label: "Programmes" },
  { key: "subjects", label: "Subjects" },
  { key: "requests", label: "Requests" },
];

export default function AdminPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("section");
  const initialSection: TaxonomySection =
    requested === "faculties" ||
    requested === "programmes" ||
    requested === "subjects" ||
    requested === "requests"
      ? requested
      : "universities";
  const [section, setSection] = useState<TaxonomySection>(initialSection);

  return (
  <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-700 dark:text-primary-400">
          Admin panel
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Taxonomy management
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage universities, faculties, programmes, and subjects.
        </p>
      </div>
      <nav
        className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
        aria-label="Taxonomy sections"
      >
        {sections.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => { setSection(item.key); setSearchParams({ section: item.key }); }}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${section === item.key ? "bg-primary-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
    <div className="mt-5">
      {section === "universities" && <AdminUniversities embedded />}
      {section === "faculties" && <AdminFaculties embedded />}
      {section === "programmes" && <AdminProgrammes embedded />}
      {section === "subjects" && <AdminSubjects embedded />}
      {section === "requests" && <AdminTaxonomyRequests embedded />}
    </div>
  </div>
);
}
