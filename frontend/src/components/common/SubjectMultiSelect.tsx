import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import {
  useFindOrCreateSubjectStandalone,
  useFindOrCreateUniversity,
  useSubjectSearch,
  useUniversities,
} from "../../hooks/useTaxonomy";
import { SearchableSelect } from "./SearchableSelect";
import { controlClassName } from "./controlStyles";
import type { Subject } from "../../types/taxonomy";

const DEBOUNCE_MS = 250;

/**
 * Search-and-select over the subjects catalogue, scoped to one
 * university at a time (a subject's code is only unique within a
 * university — see migration 041 — so "CSC577" can mean something
 * different at UiTM than at UM). Has an inline "Add subject" fallback
 * for when nothing matches: the subject is created immediately as
 * COMMUNITY_SUBMITTED (usable right away, no admin approval needed to
 * select it) via taxonomyService's standalone find-or-create — same
 * crowdsourcing idea as the resource-upload flow's programme-scoped
 * equivalent, just without a programme to attach to.
 */
export function SubjectMultiSelect({
  selected,
  onChange,
}: {
  selected: Subject[];
  onChange: (subjects: Subject[]) => void;
}) {
  const { data: universities } = useUniversities();
  const findOrCreate = useFindOrCreateSubjectStandalone();
  const findOrCreateUniversity = useFindOrCreateUniversity();

  const [universityId, setUniversityId] = useState("");
  const [isUniversityOpen, setIsUniversityOpen] = useState(false);
  const [isAddingUniversity, setIsAddingUniversity] = useState(false);
  const [addUniversityName, setAddUniversityName] = useState("");
  const [addUniversityError, setAddUniversityError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addCode, setAddCode] = useState("");
  const [addName, setAddName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results, isFetching } = useSubjectSearch(universityId || undefined, debouncedQuery);

  const selectedIds = useMemo(() => new Set(selected.map((s) => s.id)), [selected]);
  const universityName = (id: string | null) => universities?.find((u) => u.id === id)?.name;

  const suggestions = useMemo(
    () => (results ?? []).filter((s) => !selectedIds.has(s.id)).slice(0, 8),
    [results, selectedIds],
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectSubject(subject: Subject) {
    onChange([...selected, subject]);
    setQuery("");
    setIsOpen(false);
  }

  function removeSubject(id: string) {
    onChange(selected.filter((s) => s.id !== id));
  }

  function handleAddUniversity() {
    setAddUniversityError(null);
    if (addUniversityName.trim().length < 2) {
      setAddUniversityError("Enter at least 2 characters.");
      return;
    }
    findOrCreateUniversity.mutate(
      { name: addUniversityName.trim() },
      {
        onSuccess: ({ university }) => {
          setUniversityId(university.id);
          setIsAddingUniversity(false);
          setAddUniversityName("");
        },
        onError: () => setAddUniversityError("Something went wrong adding that university. Please try again."),
      },
    );
  }

  function openAddForm() {
    setAddName(query.trim());
    setAddCode("");
    setAddError(null);
    setIsAdding(true);
  }

  function handleAddSubject() {
    setAddError(null);
    if (!universityId) {
      setAddError("Select a university first.");
      return;
    }
    if (!addName.trim()) {
      setAddError("Subject name is required.");
      return;
    }
    findOrCreate.mutate(
      { code: addCode.trim() || undefined, name: addName, universityId },
      {
        onSuccess: ({ subject }) => {
          if (!selectedIds.has(subject.id)) onChange([...selected, subject]);
          setIsAdding(false);
          setIsOpen(false);
          setQuery("");
        },
        onError: () => setAddError("Something went wrong adding that subject. Please try again."),
      },
    );
  }

  const showEmptyState = universityId && debouncedQuery && !isFetching && suggestions.length === 0 && !isAdding;

  return (
    <div ref={containerRef} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-slate-600">University</span>
        <SearchableSelect
          options={(universities ?? []).map((u) => ({ value: u.id, label: u.name }))}
          value={universityId}
          onChange={(value) => {
            setUniversityId(value);
            setIsAdding(false);
          }}
          placeholder="Search universities…"
          onOpenChange={setIsUniversityOpen}
        />
        {!universityId && !isUniversityOpen && !isAddingUniversity && (
          <button
            type="button"
            onClick={() => {
              setAddUniversityError(null);
              setIsAddingUniversity(true);
            }}
            className="self-start text-xs font-semibold text-primary-700 hover:underline"
          >
            Can&apos;t find it? Add a university
          </button>
        )}
        {isAddingUniversity && (
          <div className="space-y-3 rounded-xl border border-primary-200 bg-primary-50/40 p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs text-slate-500">
                Not in the list yet — it&apos;ll be created when you add it below and used
                immediately, no need to wait. An admin can still edit or remove it afterward.
              </p>
              <button
                type="button"
                onClick={() => setIsAddingUniversity(false)}
                className="shrink-0 text-xs font-bold text-slate-500 hover:text-slate-700"
              >
                Hide
              </button>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600">University name</label>
              <input
                type="text"
                value={addUniversityName}
                onChange={(e) => setAddUniversityName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddUniversity();
                  }
                }}
                placeholder="e.g. Universiti Contoh Malaysia"
                className="mt-1 w-full rounded-lg border border-[#E4E3F2] bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoFocus
              />
            </div>
            {addUniversityError && <p className="text-xs text-red-600">{addUniversityError}</p>}
            <div>
              <button
                type="button"
                onClick={handleAddUniversity}
                disabled={findOrCreateUniversity.isPending}
                className="rounded-full bg-primary-600 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {findOrCreateUniversity.isPending ? "Adding…" : "Add university"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="text"
            value={query}
            disabled={!universityId}
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            placeholder={universityId ? "Search by subject code or name…" : "Select a university first"}
            className={controlClassName(false, "pl-9")}
          />

          {isOpen && universityId && (
            <div className="absolute z-10 mt-1.5 w-full overflow-hidden rounded-xl border border-[#E4E3F2] bg-white shadow-lg">
              {suggestions.length > 0 ? (
                <ul role="listbox" className="max-h-56 overflow-y-auto py-1">
                  {suggestions.map((subject) => (
                    <li key={subject.id}>
                      <button
                        type="button"
                        onClick={() => selectSubject(subject)}
                        className="flex w-full flex-col items-start px-3.5 py-2 text-left text-sm hover:bg-[#FAF9FF]"
                      >
                        <span className="font-semibold text-slate-800">
                          {subject.code ? `${subject.code} — ${subject.name}` : subject.name}
                        </span>
                        {universityName(subject.universityId) && (
                          <span className="text-xs text-slate-500">{universityName(subject.universityId)}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : showEmptyState ? (
                <div className="p-3">
                  <p className="px-1 text-sm text-slate-500">No matching subject found.</p>
                  <button
                    type="button"
                    onClick={openAddForm}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-primary-700 hover:bg-[#FAF9FF]"
                  >
                    <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
                    Add &quot;{debouncedQuery}&quot; as a new subject
                  </button>
                </div>
              ) : isFetching ? (
                <p className="px-3.5 py-3 text-sm text-slate-500">Searching…</p>
              ) : (
                <p className="px-3.5 py-3 text-sm text-slate-500">Type to search, or add a new subject.</p>
              )}
            </div>
          )}
        </div>
        {universityId && !isOpen && !isAdding && (
          <button
            type="button"
            onClick={openAddForm}
            className="self-start text-xs font-semibold text-primary-700 hover:underline"
          >
            Can&apos;t find it? Add a new subject
          </button>
        )}
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((subject) => (
            <span
              key={subject.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#F1F0FA] py-1 pl-3 pr-1.5 text-xs font-bold text-primary-700"
            >
              {subject.code ? `${subject.code} — ${subject.name}` : subject.name}
              {universityName(subject.universityId) && (
                <span className="font-medium text-primary-700/70">{universityName(subject.universityId)}</span>
              )}
              {subject.verificationStatus === "COMMUNITY_SUBMITTED" && (
                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">
                  Pending review
                </span>
              )}
              <button
                type="button"
                onClick={() => removeSubject(subject.id)}
                aria-label={`Remove ${subject.name}`}
                className="rounded-full p-0.5 text-primary-700/70 hover:bg-primary-100 hover:text-primary-900"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}

      {isAdding && (
        <div className="space-y-3 rounded-xl border border-primary-200 bg-primary-50/40 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs text-slate-500">
              Not in the list yet — it&apos;ll be created when you add it below and used
              immediately, no need to wait. An admin can still edit or remove it afterward.
              {universityName(universityId) ? ` For ${universityName(universityId)}.` : ""}
            </p>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="shrink-0 text-xs font-bold text-slate-500 hover:text-slate-700"
            >
              Hide
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-600">
                Subject code <span className="font-semibold text-slate-400">· optional</span>
              </label>
              <input
                type="text"
                value={addCode}
                onChange={(e) => setAddCode(e.target.value)}
                placeholder="e.g. CSC520"
                className="mt-1 w-full rounded-lg border border-[#E4E3F2] bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600">Subject name</label>
              <input
                type="text"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddSubject();
                  }
                }}
                placeholder="e.g. Algorithm Analysis and Design"
                className="mt-1 w-full rounded-lg border border-[#E4E3F2] bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {addError && <p className="text-xs text-red-600">{addError}</p>}

          <div>
            <button
              type="button"
              onClick={handleAddSubject}
              disabled={findOrCreate.isPending}
              className="rounded-full bg-primary-600 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {findOrCreate.isPending ? "Adding…" : "Add subject"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SubjectMultiSelect;
