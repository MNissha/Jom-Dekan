import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FileText, ImageOff, UploadCloud, Download, Search } from "lucide-react";
import { useResources, useFilePreviewUrl, useDownloadUrl } from "../hooks/useResources";
import { useCurrentUser } from "../hooks/useAuth";
import { FavoriteButton } from "../components/common/FavoriteButton";
import { ReportButton } from "../components/common/ReportButton";
import { PdfThumbnail } from "../components/common/PdfThumbnail";
import { UserLink } from "../components/common/UserLink";
import { SearchableSelect } from "../components/common/SearchableSelect";
import { useUniversities, useFaculties, useProgrammes, useSubjects } from "../hooks/useTaxonomy";
import { ResourcesPageSkeleton } from "../components/common/ResourcesPageSkeleton";
import { RESOURCE_CATEGORIES, RESOURCE_CATEGORY_LABELS, type ResourceCategory, type ResourceListItem } from "../types/resource";
import type { University } from "../types/taxonomy";
import { fileTypeBadge } from "../utils/fileTypeBadge";
import { useMinimumLoading } from "../hooks/useMinimumLoading";

const PAGE_SIZE = 12;
type SortBy = "newest" | "oldest" | "title";

function statusBadgeClass(status: ResourceListItem["status"]) {
  if (status === "PENDING") return "bg-amber-100 text-amber-700";
  if (status === "FAILED") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-500";
}

function downloadAsText(title: string, description: string | null) {
  const blob = new Blob([`${title}\n\n${description ?? ""}`], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^\w-]+/g, "_").slice(0, 80) || "resource"}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function ResourceThumbnail({ resource }: { resource: ResourceListItem }) {
  const isImage = resource.readyFileMimeType?.startsWith("image/") ?? false;
  const isPdf = resource.readyFileMimeType === "application/pdf";
  // Each card fetches its own short-lived signed URL — the backend
  // re-checks visibility on every request, so there's no shortcut that
  // skips that check just because this is a thumbnail, not a download.
  const { data: previewUrl, isLoading } = useFilePreviewUrl(
    isImage || isPdf ? (resource.readyFileId ?? undefined) : undefined,
  );

  return (
    <div className="flex aspect-video w-full items-center justify-center overflow-hidden rounded-t-2xl bg-slate-100">
      {isImage ? (
        previewUrl ? (
          <img
            src={previewUrl}
            alt={resource.title}
            className="h-full w-full object-cover"
          />
        ) : isLoading ? (
          <div className="h-full w-full animate-pulse bg-slate-200" />
        ) : (
          <ImageOff className="h-8 w-8 text-slate-300" aria-hidden="true" />
        )
      ) : isPdf ? (
        previewUrl ? (
          <PdfThumbnail url={previewUrl} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full animate-pulse bg-slate-200" />
        )
      ) : (
        <FileText className="h-10 w-10 text-slate-300" aria-hidden="true" />
      )}
    </div>
  );
}

// The page's own University/Faculty/Programme selects are scoped to
// whatever the *filter* has picked (useFaculties/useProgrammes require a
// parent id to query), so they can't resolve an arbitrary card's own
// university/programme names — each card resolves its own via the same
// hooks, scoped to its own ids instead of the filter's. React Query
// dedupes identical [key, id] queries, so cards sharing a university or
// faculty don't each fire a separate request.
function ResourceTaxonomyLine({
  resource,
  universities,
}: {
  resource: ResourceListItem;
  universities?: University[];
}) {
  const { data: faculties } = useFaculties(resource.universityId ?? undefined);
  const { data: programmes } = useProgrammes(resource.facultyId ?? undefined);

  const university = universities?.find((u) => u.id === resource.universityId);
  const faculty = faculties?.find((f) => f.id === resource.facultyId);
  const programme = programmes?.find((p) => p.id === resource.programmeId);

  const parts = [university?.name, faculty?.name, programme?.name].filter(Boolean);
  if (parts.length === 0) return null;

  return <p className="mt-1 truncate text-xs font-semibold text-slate-400">{parts.join(" · ")}</p>;
}

function DownloadButton({ resource }: { resource: ResourceListItem }) {
  const downloadUrl = useDownloadUrl();

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (resource.readyFileId) {
          downloadUrl.mutate(resource.readyFileId, {
            onSuccess: (url) => window.open(url, "_blank", "noopener,noreferrer"),
          });
        } else {
          downloadAsText(resource.title, resource.description);
        }
      }}
      disabled={downloadUrl.isPending}
      className="flex items-center gap-1.5 rounded-xl border border-primary-200 px-3.5 py-2 text-xs font-bold text-primary-700 transition motion-safe:duration-150 hover:-translate-y-0.5 hover:bg-primary-50 disabled:opacity-60"
    >
      <Download className="h-3.5 w-3.5" aria-hidden="true" />
      {downloadUrl.isPending ? "Preparing…" : "Download"}
    </button>
  );
}

export default function Resources() {
  const user = useCurrentUser();
  // Lets the header search bar (?search=) and the "My Uploads" profile
  // menu item (?mine=true) deep-link here with real state instead of
  // needing their own pages for the same data.
  const [searchParams] = useSearchParams();
  const [mine, setMine] = useState(searchParams.get("mine") === "true");
  const [searchInput, setSearchInput] = useState(searchParams.get("search") ?? "");
  const [q, setQ] = useState<string | undefined>(searchParams.get("search") ?? undefined);
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [universityId, setUniversityId] = useState<string | undefined>(undefined);
  const [facultyId, setFacultyId] = useState<string | undefined>(undefined);
  const [programmeId, setProgrammeId] = useState<string | undefined>(undefined);
  const [subjectId, setSubjectId] = useState<string | undefined>(undefined);
  const [category, setCategory] = useState<ResourceCategory | undefined>(undefined);
  const [page, setPage] = useState(1);

  // Debounce the search box so every keystroke doesn't trigger a request.
  useEffect(() => {
    const handle = setTimeout(() => {
      setQ(searchInput.trim() || undefined);
      setPage(1);
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const { data: universities } = useUniversities();
  const { data: faculties } = useFaculties(universityId);
  const { data: programmes } = useProgrammes(facultyId);
  // Scoped to the selected programme, same as Upload Resource — when no
  // programme is picked this falls back to the full catalogue, which is
  // also correct for resolving badges on cards that span programmes.
  const { data: subjects } = useSubjects(programmeId);

  const { data, isLoading, isError } = useResources({
    mine,
    universityId,
    facultyId,
    programmeId,
    subjectId,
    category,
    q,
    sortBy,
    page,
    pageSize: PAGE_SIZE,
  });
  const showSkeleton = useMinimumLoading(isLoading, 2000);
  const resources = data?.data ?? [];
  const total = data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function handleUniversityChange(value: string) {
    setUniversityId(value || undefined);
    setFacultyId(undefined);
    setProgrammeId(undefined);
    setSubjectId(undefined);
    setPage(1);
  }

  function handleFacultyChange(value: string) {
    setFacultyId(value || undefined);
    setProgrammeId(undefined);
    setSubjectId(undefined);
    setPage(1);
  }

  function handleProgrammeChange(value: string) {
    setProgrammeId(value || undefined);
    setSubjectId(undefined);
    setPage(1);
  }

  function handleSubjectChange(value: string) {
    setSubjectId(value || undefined);
    setPage(1);
  }

  function handleCategoryChange(value: ResourceCategory | undefined) {
    setCategory(value);
    setPage(1);
  }

  return (
    <div className="mx-auto max-w-6xl px-[18px] py-[22px]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Academic Resources</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {total > 0 ? `${total} resources` : "Browse resources"} — filter by university, programme, subject or
            category.
          </p>
        </div>
        <Link
          to="/resources/upload"
          className="flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white transition motion-safe:duration-150 hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-md"
        >
          <UploadCloud className="h-4 w-4" aria-hidden="true" />
          Upload resource
        </Link>
      </div>

      {user && (
        <div className="mt-6 flex gap-2 text-sm">
          <button
            type="button"
            onClick={() => {
              setMine(false);
              setPage(1);
            }}
            className={`rounded-full px-4 py-1.5 font-bold transition motion-safe:duration-150 ${
              !mine
                ? "bg-primary-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All resources
          </button>
          <button
            type="button"
            onClick={() => {
              setMine(true);
              setPage(1);
            }}
            className={`rounded-full px-4 py-1.5 font-bold transition motion-safe:duration-150 ${
              mine
                ? "bg-primary-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            My uploads
          </button>
        </div>
      )}

      {/* Filter panel — matches the reference's labeled-dropdown layout,
          using our real taxonomy fields (university/faculty/programme/
          subject) rather than the reference's sample "Year" filter,
          which has no backing data in this schema. */}
      <div className="mt-6 rounded-[22px] border border-[#ECEBF7] bg-white p-5 shadow-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search resources…"
            className="w-full rounded-xl border border-[#E4E3F2] bg-[#FBFBFE] py-2.5 pl-9 pr-3 text-sm text-slate-700 transition motion-safe:duration-150 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400">University</label>
            <div className="mt-1.5">
              <SearchableSelect
                options={[
                  { value: "", label: "All universities" },
                  ...(universities ?? []).map((u) => ({ value: u.id, label: u.name })),
                ]}
                value={universityId ?? ""}
                onChange={handleUniversityChange}
                placeholder="Search universities…"
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Faculty</label>
            <div className="mt-1.5">
              <SearchableSelect
                options={[
                  { value: "", label: "All faculties" },
                  ...(faculties ?? []).map((f) => ({ value: f.id, label: f.name })),
                ]}
                value={facultyId ?? ""}
                onChange={handleFacultyChange}
                disabled={!universityId}
                placeholder={universityId ? "Search faculties…" : "Select a university first"}
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Programme</label>
            <div className="mt-1.5">
              <SearchableSelect
                options={[
                  { value: "", label: "All programmes" },
                  ...(programmes ?? []).map((p) => ({ value: p.id, label: p.name })),
                ]}
                value={programmeId ?? ""}
                onChange={handleProgrammeChange}
                disabled={!facultyId}
                placeholder={facultyId ? "Search programmes…" : "Select a faculty first"}
              />
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Subject</label>
            <div className="mt-1.5">
              <SearchableSelect
                options={[
                  { value: "", label: "All subjects" },
                  ...(subjects ?? []).map((s) => ({ value: s.id, label: `${s.code} · ${s.name}` })),
                ]}
                value={subjectId ?? ""}
                onChange={handleSubjectChange}
                disabled={!programmeId}
                placeholder={programmeId ? "Search subjects…" : "Select a programme first"}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleCategoryChange(undefined)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition motion-safe:duration-150 ${
              !category ? "bg-primary-600 text-white" : "border border-[#E4E3F2] text-slate-600 hover:border-primary-200"
            }`}
          >
            All
          </button>
          {RESOURCE_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => handleCategoryChange(c)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition motion-safe:duration-150 ${
                category === c
                  ? "bg-primary-600 text-white"
                  : "border border-[#E4E3F2] text-slate-600 hover:border-primary-200"
              }`}
            >
              {RESOURCE_CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={(e) => {
            setSortBy(e.target.value as SortBy);
            setPage(1);
          }}
          className="rounded-xl border border-[#E4E3F2] bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="title">Title A–Z</option>
        </select>
      </div>

      <div className="mt-6">
        {showSkeleton ? (
          <ResourcesPageSkeleton count={PAGE_SIZE} />
        ) : isError ? (
          <p className="rounded-2xl border border-[#ECEBF7] bg-white p-4 text-sm text-red-600">
            Could not load resources.
          </p>
        ) : resources.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resources.map((r, i) => {
              const badge = fileTypeBadge(r);
              const subject = subjects?.find((s) => s.id === r.subjectId);
              return (
                <Link
                  key={r.id}
                  to={`/resources/${r.id}`}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className="flex flex-col overflow-hidden rounded-2xl border border-[#ECEBF7] bg-white shadow-sm transition motion-safe:duration-150 motion-safe:animate-[fadeIn_300ms_ease-out_both] hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md"
                >
                  <ResourceThumbnail resource={r} />
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-start justify-between gap-2">
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${badge.className}`}>
                        {badge.label}
                      </span>
                      <div className="flex shrink-0 items-center gap-2">
                        {r.status !== "READY" && (
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusBadgeClass(r.status)}`}>
                            {r.status}
                          </span>
                        )}
                        <FavoriteButton targetType="resource" targetId={r.id} />
                        <ReportButton targetType="resource" targetId={r.id} />
                      </div>
                    </div>

                    <h2 className="mt-3 line-clamp-2 text-[15.5px] font-bold text-slate-900">{r.title}</h2>
                    <ResourceTaxonomyLine resource={r} universities={universities} />

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {subject && (
                        <span className="rounded-full bg-[#F1F0FA] px-2.5 py-1 text-[11px] font-bold text-primary-700">
                          {subject.code}
                        </span>
                      )}
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                        {RESOURCE_CATEGORY_LABELS[r.category]}
                      </span>
                    </div>

                    <div className="mt-4 flex flex-1 items-end justify-between gap-3 border-t border-[#F4F3FB] pt-3">
                      <span className="min-w-0 truncate text-xs font-semibold text-slate-500">
                        {r.ownerName ? (
                          <UserLink userId={r.ownerId} name={r.ownerName} className="font-semibold text-slate-500 hover:text-primary-700 hover:underline" />
                        ) : (
                          "A JomDekan student"
                        )}
                        <span className="block text-[11px] font-medium text-slate-400">
                          Uploaded {new Date(r.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </span>
                      <DownloadButton resource={r} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="rounded-2xl border border-[#ECEBF7] bg-white p-4 text-sm text-slate-500">
            {q
              ? "No resources match your search."
              : mine
                ? "You haven't uploaded anything yet."
                : "No resources yet — be the first to upload one."}
          </p>
        )}
      </div>

      {resources.length > 0 && (
        <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
          <span>
            Page {page} of {totalPages} ({total} result{total === 1 ? "" : "s"})
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-full bg-slate-100 px-4 py-1.5 font-medium text-slate-600 transition motion-safe:duration-150 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-full bg-slate-100 px-4 py-1.5 font-medium text-slate-600 transition motion-safe:duration-150 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
