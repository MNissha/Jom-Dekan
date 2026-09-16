import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import AdminUniversities from "./AdminUniversities";
import AdminFaculties from "./AdminFaculties";
import AdminProgrammes from "./AdminProgrammes";
import AdminSubjects from "./AdminSubjects";
import AdminTaxonomyRequests from "./AdminTaxonomyRequests";
import { PageContainer, PageHeader } from "../../components/common/ui";

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
  <PageContainer wide>
    <PageHeader eyebrow="Admin panel" title="Taxonomy management" description="Manage universities, faculties, programmes, and subjects." actions={
      <nav
        className="surface-card flex flex-wrap gap-1 rounded-xl p-1"
        aria-label="Taxonomy sections"
      >
        {sections.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => { setSection(item.key); setSearchParams({ section: item.key }); }}
            className={`interactive-control rounded-lg px-3 py-2 text-sm font-medium ${section === item.key ? "bg-brand-primary text-white" : "text-content-secondary hover:bg-surface-muted"}`}
          >
            {item.label}
          </button>
        ))}
      </nav>
    } />
    <div className="mt-5">
      {section === "universities" && <AdminUniversities embedded />}
      {section === "faculties" && <AdminFaculties embedded />}
      {section === "programmes" && <AdminProgrammes embedded />}
      {section === "subjects" && <AdminSubjects embedded />}
      {section === "requests" && <AdminTaxonomyRequests embedded />}
    </div>
  </PageContainer>
);
}
