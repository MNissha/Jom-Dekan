import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ArrowLeft,
  FileText,
  ClipboardList,
  Presentation,
  Newspaper,
  FileSpreadsheet,
  BookOpenCheck,
  Sparkles,
  Check,
  UploadCloud,
  X,
} from "lucide-react";
import {
  uploadResourceFormSchema,
  type UploadResourceFormValues,
} from "../schemas/resourceSchemas";
import { useUploadResource } from "../hooks/useResources";
import {
  useUniversities,
  useFaculties,
  useProgrammes,
  useSubjects,
} from "../hooks/useTaxonomy";
import { useMyProfile } from "../hooks/useProfile";
import { SearchableSelect } from "../components/common/SearchableSelect";
import {
  RESOURCE_CATEGORIES,
  RESOURCE_CATEGORY_LABELS,
  type ResourceCategory,
} from "../types/resource";

const CATEGORY_ICON: Record<ResourceCategory, typeof FileText> = {
  PAST_PAPER: FileText,
  NOTES: ClipboardList,
  SLIDES: Presentation,
  ARTICLE: Newspaper,
  EXCEL: FileSpreadsheet,
  EXERCISES: BookOpenCheck,
};

export default function UploadResource() {
  const navigate = useNavigate();
  const uploadResource = useUploadResource();
  const { data: profile } = useMyProfile();
  const [progress, setProgress] = useState(0);
  const { data: universities } = useUniversities();
  const [universityId, setUniversityId] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [programmeId, setProgrammeId] = useState("");
  const { data: faculties } = useFaculties(universityId || undefined);
  const { data: programmes } = useProgrammes(facultyId || undefined);
  const { data: subjects } = useSubjects(programmeId || undefined);

  // Whether each SearchableSelect's own dropdown is currently open — the
  // "Can't find it?" link below each field is hidden while its dropdown
  // is open, since the dropdown is absolutely positioned (reserves no
  // layout space) and would otherwise render on top of/behind the link.
  const [isUniversityOpen, setIsUniversityOpen] = useState(false);
  const [isFacultyOpen, setIsFacultyOpen] = useState(false);
  const [isProgrammeOpen, setIsProgrammeOpen] = useState(false);

  // "Add a subject" is a separate mode rather than a schema field: it
  // needs a programme picked (local state, not RHF) before it makes
  // sense, and it replaces subjectId rather than adding to it.
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubjectCode, setNewSubjectCode] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectSemester, setNewSubjectSemester] = useState("");
  const [newSubjectIntakeYear, setNewSubjectIntakeYear] = useState("");
  const [newSubjectError, setNewSubjectError] = useState<string | null>(null);

  // Same self-service idea as subjects: naming a university/faculty/
  // programme that isn't in the catalogue yet doesn't block the upload —
  // it's created (or reused) as part of submitting this same resource,
  // and the resource is tagged with it immediately. An admin can still
  // edit or delete it afterward from the taxonomy admin pages. A single
  // combined panel can name whichever levels are missing at once — the
  // ones the user has already picked are simply carried by id, not
  // retyped.
  const [isRequestingTaxonomy, setIsRequestingTaxonomy] = useState(false);
  const [requestUniversityName, setRequestUniversityName] = useState("");
  const [requestFacultyName, setRequestFacultyName] = useState("");
  const [requestProgrammeName, setRequestProgrammeName] = useState("");
  const [requestSubjectCode, setRequestSubjectCode] = useState("");
  const [requestSubjectName, setRequestSubjectName] = useState("");

  const missingUniversity = !universityId;
  const missingFaculty = !facultyId;
  const missingProgramme = !programmeId;
  const hasMissingTaxonomy =
    missingUniversity || missingFaculty || missingProgramme;

  function resetTaxonomyRequest() {
    setIsRequestingTaxonomy(false);
    setRequestUniversityName("");
    setRequestFacultyName("");
    setRequestProgrammeName("");
    setRequestSubjectCode("");
    setRequestSubjectName("");
  }

  // A single combined panel, not one per level — shows an input only for
  // whichever of university/faculty/programme the user hasn't already
  // picked, plus a subject code/name pair when the programme itself is
  // missing (so find-or-create has no programme to attach the subject to).
  function renderTaxonomyRequestPanel() {
    if (!hasMissingTaxonomy || !isRequestingTaxonomy) return null;

    return (
      <div className="mt-3 space-y-3 rounded-xl border border-primary-200 bg-primary-50/40 p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs text-slate-500">
            Fill in whichever of these aren&apos;t in the list yet —
            they&apos;ll be created when you submit below and used
            immediately, no need to wait. An admin can still edit or
            remove them afterward. Anything you&apos;ve already picked
            above doesn&apos;t need to be retyped.
          </p>
          <button
            type="button"
            onClick={resetTaxonomyRequest}
            className="shrink-0 text-xs font-bold text-slate-500 hover:text-slate-700"
          >
            Hide
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {missingUniversity && (
            <div>
              <label className="block text-xs font-bold text-slate-600">
                University name
              </label>
              <input
                value={requestUniversityName}
                onChange={(e) => setRequestUniversityName(e.target.value)}
                placeholder="e.g. Universiti Contoh Malaysia"
                className="mt-1 w-full rounded-lg border border-[#E4E3F2] bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}
          {missingFaculty && (
            <div>
              <label className="block text-xs font-bold text-slate-600">
                Faculty name
              </label>
              <input
                value={requestFacultyName}
                onChange={(e) => setRequestFacultyName(e.target.value)}
                placeholder="e.g. Faculty of Applied Sciences"
                className="mt-1 w-full rounded-lg border border-[#E4E3F2] bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}
          {missingProgramme && (
            <div>
              <label className="block text-xs font-bold text-slate-600">
                Programme name
              </label>
              <input
                value={requestProgrammeName}
                onChange={(e) => setRequestProgrammeName(e.target.value)}
                placeholder="e.g. Bachelor of Data Science (Hons)"
                className="mt-1 w-full rounded-lg border border-[#E4E3F2] bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}
          {missingProgramme && (
            <div>
              <label className="block text-xs font-bold text-slate-600">
                Subject code &amp; name{" "}
                <span className="font-semibold text-slate-400">
                  · optional
                </span>
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  value={requestSubjectCode}
                  onChange={(e) => setRequestSubjectCode(e.target.value)}
                  placeholder="CSC577"
                  className="w-24 rounded-lg border border-[#E4E3F2] bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <input
                  value={requestSubjectName}
                  onChange={(e) => setRequestSubjectName(e.target.value)}
                  placeholder="Software Engineering"
                  className="flex-1 rounded-lg border border-[#E4E3F2] bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          )}
        </div>
        {newSubjectError && (
          <p className="text-xs text-red-600">{newSubjectError}</p>
        )}
      </div>
    );
  }

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UploadResourceFormValues>({
    resolver: zodResolver(uploadResourceFormSchema),
  });

  const category = watch("category");
  const files = watch("files") ?? [];
  const hasFile = files.length > 0;

  function startAddingSubject() {
    setValue("subjectId", "");
    setNewSubjectError(null);
    setIsAddingSubject(true);
  }

  function cancelAddingSubject() {
    setNewSubjectCode("");
    setNewSubjectName("");
    setNewSubjectSemester("");
    setNewSubjectIntakeYear("");
    setNewSubjectError(null);
    setIsAddingSubject(false);
  }

  const onSubmit = (values: UploadResourceFormValues) => {
    if (isAddingSubject) {
      if (
        newSubjectCode.trim().length < 2 ||
        newSubjectName.trim().length < 2
      ) {
        setNewSubjectError(
          "Enter both a subject code and a subject name (at least 2 characters each).",
        );
        return;
      }
      // Standing up a brand-new subject happens inline with a file
      // upload only — the text-only post endpoint doesn't take
      // subjectCode/subjectName, so a code/name typed here would
      // otherwise be silently dropped.
      if (!values.files || values.files.length === 0) {
        setNewSubjectError(
          "Attach a file to create a new subject, or pick an existing one from the list for a text post.",
        );
        return;
      }
    }
    // Same constraint as above, for a subject typed alongside a missing
    // programme — that combination only takes effect on the file-upload
    // path too.
    if (
      missingProgramme &&
      (requestSubjectCode.trim() || requestSubjectName.trim()) &&
      (!values.files || values.files.length === 0)
    ) {
      setNewSubjectError(
        "Attach a file to add a new subject along with a new programme, or leave the subject blank for a text post.",
      );
      return;
    }
    setNewSubjectError(null);
    setProgress(0);
    uploadResource.mutate(
      {
        title: values.title,
        description: values.description,
        category: values.category as ResourceCategory,
        universityId,
        facultyId,
        programmeId,
        requestedUniversityName: missingUniversity
          ? requestUniversityName.trim() || undefined
          : undefined,
        requestedFacultyName:
          !missingUniversity && missingFaculty
            ? requestFacultyName.trim() || undefined
            : undefined,
        requestedProgrammeName:
          !missingFaculty && missingProgramme
            ? requestProgrammeName.trim() || undefined
            : undefined,
        subjectId: isAddingSubject ? undefined : values.subjectId,
        subjectCode: isAddingSubject
          ? newSubjectCode
          : missingProgramme
            ? requestSubjectCode.trim() || undefined
            : undefined,
        subjectName: isAddingSubject
          ? newSubjectName
          : missingProgramme
            ? requestSubjectName.trim() || undefined
            : undefined,
        subjectSemester:
          isAddingSubject && newSubjectSemester
            ? Number(newSubjectSemester)
            : undefined,
        subjectCurriculumYear:
          isAddingSubject && newSubjectIntakeYear
            ? Number(newSubjectIntakeYear)
            : undefined,
        files: values.files,
        onProgress: setProgress,
      },
      {
        onSuccess: (result) => navigate(`/resources/${result.resource.id}`),
      },
    );
  };

  const serverError =
    uploadResource.isError && axios.isAxiosError(uploadResource.error)
      ? (
          uploadResource.error.response?.data as {
            error?: { message?: string };
          }
        )?.error?.message
      : null;

  return (
    <div className="page-container page-container-standard motion-safe:animate-content-enter">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="group mt-2 mb-2 inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 transition motion-safe:duration-150 hover:text-primary-700"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 transition-transform motion-safe:duration-150 group-hover:-translate-x-1 group-hover:border-primary-300 group-hover:bg-primary-50">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        </div>
        Back
      </button>

      <h1 className="break-words text-2xl font-heading leading-tight tracking-tight text-content-primary sm:text-page-title">
        Upload a resource
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Choose a category and either attach one or more files (PDF, Word, Excel,
        PowerPoint, JPEG, or PNG, up to 20MB each) or write the content directly
        as text. Every file is checked by its actual content before it&apos;s
        accepted — not just its name or extension.
      </p>

      {profile && (
        <div className="mt-4 rounded-xl border border-[#ECEBF7] bg-[#FBFBFE] px-4 py-3 text-sm text-slate-600">
          <p className="font-medium text-slate-800">Uploading as</p>
          <p className="mt-0.5">
            {profile.displayName}
            {profile.university?.name && <> · {profile.university.name}</>}
            {profile.fieldOfStudy && <> · {profile.fieldOfStudy}</>}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Your name and institution are attached to every resource you upload
            and stay visible to other users. Only upload material you have the
            right to share.
          </p>
        </div>
      )}

      <form
        className="mt-6 flex flex-col gap-5 rounded-[22px] border border-[#ECEBF7] bg-white p-6 shadow-sm"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        {serverError && (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 motion-safe:animate-[fadeIn_200ms_ease-out]"
          >
            {serverError}
          </div>
        )}

        <div>
          <label
            htmlFor="title"
            className="block text-sm font-bold text-slate-700"
          >
            Title<span className="text-red-500"> *</span>
          </label>
          <input
            id="title"
            className="mt-1.5 w-full rounded-xl border border-[#E4E3F2] bg-[#FBFBFE] px-3 py-2.5 text-sm text-slate-700 transition motion-safe:duration-150 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-invalid={Boolean(errors.title)}
            {...register("title")}
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
          )}
        </div>

        <section className="relative overflow-hidden rounded-[20px] border border-[#DDD9F1] bg-[#FAF9FF] p-4 shadow-[0_8px_24px_rgba(67,56,202,0.06)] sm:p-5" aria-labelledby="resource-category-heading">
          <div className="absolute inset-x-0 top-0 h-1 bg-[#F5C21A]" aria-hidden="true" />
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#4338CA] text-white shadow-sm">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 id="resource-category-heading" className="text-sm font-extrabold text-[#231C57] dark:text-brand-secondary">
                Category<span className="text-red-500"> *</span>
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">Choose the type that best describes this resource. It will appear on the resource card and in filters.</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {RESOURCE_CATEGORIES.map((c) => {
              const Icon = CATEGORY_ICON[c];
              const active = category === c;
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setValue("category", c, { shouldValidate: true })}
                  className={`group relative flex min-h-12 items-center gap-2.5 overflow-hidden rounded-xl border px-3.5 py-3 text-sm font-bold shadow-sm transition motion-safe:duration-200 ${
                    active
                      ? "border-[#4338CA] bg-[#4338CA] text-white shadow-[0_7px_18px_rgba(67,56,202,0.22)] motion-safe:-translate-y-0.5"
                      : "border-[#E4E3F2] bg-white text-slate-600 hover:border-primary-300 hover:text-primary-700 hover:shadow-md motion-safe:hover:-translate-y-0.5"
                  }`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition motion-safe:duration-200 ${active ? "bg-white/15 text-[#F5C21A]" : "bg-[#EFEEFB] text-[#4338CA] group-hover:bg-primary-100"}`}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="truncate">{RESOURCE_CATEGORY_LABELS[c]}</span>
                  {active && <Check className="ml-auto h-4 w-4 shrink-0 text-[#F5C21A] motion-safe:animate-[fadeIn_180ms_ease-out]" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
          {errors.category && (
            <p className="mt-1 text-sm text-red-600">
              {errors.category.message as string}
            </p>
          )}
        </section>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label
              htmlFor="universityId"
              className="block text-sm font-bold text-slate-700"
            >
              University
            </label>
            <SearchableSelect
              id="universityId"
              options={(universities ?? [])
                .filter((item) => item.isActive)
                .map((item) => ({ value: item.id, label: item.name }))}
              value={universityId}
              onChange={(value) => {
                setUniversityId(value);
                setFacultyId("");
                setProgrammeId("");
                setValue("facultyId", "");
                setValue("programmeId", "");
                setValue("subjectId", "");
                cancelAddingSubject();
                resetTaxonomyRequest();
              }}
              placeholder="Search for a university…"
              onOpenChange={setIsUniversityOpen}
              onCreateNew={(query) => {
                setRequestUniversityName(query);
                setIsRequestingTaxonomy(true);
              }}
            />
            {missingUniversity && !isUniversityOpen && !isRequestingTaxonomy && (
              <button type="button" onClick={() => setIsRequestingTaxonomy(true)} className="mt-grid-1 text-caption font-semibold text-brand-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                Can&apos;t find it? Add a university
              </button>
            )}
          </div>
          <div>
            <label
              htmlFor="facultyId"
              className="block text-sm font-bold text-slate-700"
            >
              Faculty
            </label>
            <SearchableSelect
              id="facultyId"
              options={(faculties ?? [])
                .filter((item) => item.isActive)
                .map((item) => ({ value: item.id, label: item.name }))}
              value={facultyId}
              onChange={(value) => {
                setFacultyId(value);
                setProgrammeId("");
                setValue("programmeId", "");
                setValue("subjectId", "");
                cancelAddingSubject();
                resetTaxonomyRequest();
              }}
              disabled={!universityId}
              placeholder={
                universityId
                  ? "Search for a faculty…"
                  : "Select a university first"
              }
              onOpenChange={setIsFacultyOpen}
              onCreateNew={
                universityId
                  ? (query) => {
                      setRequestFacultyName(query);
                      setIsRequestingTaxonomy(true);
                    }
                  : undefined
              }
            />
            {!missingUniversity && missingFaculty && !isFacultyOpen && !isRequestingTaxonomy && (
              <button type="button" onClick={() => setIsRequestingTaxonomy(true)} className="mt-grid-1 text-caption font-semibold text-brand-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                Can&apos;t find it? Add a faculty
              </button>
            )}
          </div>
          <div>
            <label
              htmlFor="programmeId"
              className="block text-sm font-bold text-slate-700"
            >
              Programme
            </label>
            <SearchableSelect
              id="programmeId"
              options={(programmes ?? [])
                .filter((item) => item.isActive)
                .map((item) => ({ value: item.id, label: item.name }))}
              value={programmeId}
              onChange={(value) => {
                setProgrammeId(value);
                setValue("subjectId", "");
                cancelAddingSubject();
                resetTaxonomyRequest();
              }}
              disabled={!facultyId}
              placeholder={
                facultyId ? "Search for a programme…" : "Select a faculty first"
              }
              onOpenChange={setIsProgrammeOpen}
              onCreateNew={
                facultyId
                  ? (query) => {
                      setRequestProgrammeName(query);
                      setIsRequestingTaxonomy(true);
                    }
                  : undefined
              }
            />
            {!missingFaculty && missingProgramme && !isProgrammeOpen && !isRequestingTaxonomy && (
              <button type="button" onClick={() => setIsRequestingTaxonomy(true)} className="mt-grid-1 text-caption font-semibold text-brand-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                Can&apos;t find it? Add a programme
              </button>
            )}
          </div>
          <div>
            <label
              htmlFor="subjectId"
              className="block text-sm font-bold text-slate-700"
            >
              Subject
            </label>
            {isAddingSubject ? (
              <div className="mt-1.5 space-y-3 rounded-xl border border-primary-200 bg-primary-50/40 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="newSubjectCode"
                      className="block text-xs font-bold text-slate-600"
                    >
                      Subject code<span className="text-red-500"> *</span>
                    </label>
                    <input
                      id="newSubjectCode"
                      value={newSubjectCode}
                      onChange={(e) => setNewSubjectCode(e.target.value)}
                      placeholder="e.g. CSC577"
                      className="mt-1 w-full rounded-lg border border-[#E4E3F2] bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="newSubjectName"
                      className="block text-xs font-bold text-slate-600"
                    >
                      Subject name<span className="text-red-500"> *</span>
                    </label>
                    <input
                      id="newSubjectName"
                      value={newSubjectName}
                      onChange={(e) => setNewSubjectName(e.target.value)}
                      placeholder="e.g. Software Engineering"
                      className="mt-1 w-full rounded-lg border border-[#E4E3F2] bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="newSubjectSemester"
                      className="block text-xs font-bold text-slate-600"
                    >
                      Semester
                    </label>
                    <select
                      id="newSubjectSemester"
                      value={newSubjectSemester}
                      onChange={(e) => setNewSubjectSemester(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-[#E4E3F2] bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Not sure</option>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((s) => (
                        <option key={s} value={s}>
                          Semester {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="newSubjectIntakeYear"
                      className="block text-xs font-bold text-slate-600"
                    >
                      Intake / curriculum year
                    </label>
                    <input
                      id="newSubjectIntakeYear"
                      type="number"
                      inputMode="numeric"
                      value={newSubjectIntakeYear}
                      onChange={(e) => setNewSubjectIntakeYear(e.target.value)}
                      placeholder={String(new Date().getFullYear())}
                      className="mt-1 w-full rounded-lg border border-[#E4E3F2] bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                {newSubjectError && (
                  <p className="text-xs text-red-600">{newSubjectError}</p>
                )}
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    Not in the catalogue yet — this adds it as a
                    community-submitted subject that&apos;s ready to use right
                    away. An admin will verify it later.
                  </p>
                  <button
                    type="button"
                    onClick={cancelAddingSubject}
                    className="shrink-0 text-xs font-bold text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <Controller
                  control={control}
                  name="subjectId"
                  render={({ field }) => (
                    <SearchableSelect
                      id="subjectId"
                      options={(subjects ?? [])
                        .filter((item) => item.isActive)
                        .map((item) => ({
                          value: item.id,
                          label: `${item.code ? `${item.code} · ${item.name}` : item.name}${
                            item.verificationStatus === "COMMUNITY_SUBMITTED"
                              ? " (community)"
                              : ""
                          }`,
                        }))}
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      disabled={!programmeId}
                      placeholder={
                        programmeId
                          ? "Search for a subject…"
                          : "Select a programme first"
                      }
                    />
                  )}
                />
                {programmeId && subjects && subjects.length === 0 && (
                  <p className="mt-1 text-xs text-slate-500">
                    No subjects are linked to this programme yet.
                  </p>
                )}
                {programmeId && (
                  <button
                    type="button"
                    onClick={startAddingSubject}
                    className="mt-grid-1 text-caption font-semibold text-brand-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  >
                    Can&apos;t find it? Add a new subject
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {renderTaxonomyRequestPanel()}

        <div>
          <label
            htmlFor="file"
            className="block text-sm font-bold text-slate-700"
          >
            Files{" "}
            <span className="font-semibold text-slate-400">· optional</span>
          </label>
          <p className="mt-0.5 text-xs text-slate-500">
            Leave this empty to post as text instead — write the content in the
            description field below. Attach multiple files (e.g. several scanned
            pages or slide decks) and they&apos;ll all belong to this one
            resource.
          </p>
          <Controller
            control={control}
            name="files"
            render={({ field: { onChange, onBlur, ref, value } }) => (
              <>
                <label
                  htmlFor="file"
                  className="mt-2 flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[#E4E3F2] bg-[#FBFBFE] px-4 py-6 text-center transition motion-safe:duration-150 hover:border-primary-300 hover:bg-primary-50/40"
                >
                  <UploadCloud
                    className="h-6 w-6 text-primary-500"
                    aria-hidden="true"
                  />
                  <span className="text-sm font-semibold text-slate-700">
                    {value && value.length > 0
                      ? `${value.length} file${value.length === 1 ? "" : "s"} selected — click to add more`
                      : "Click to choose one or more files"}
                  </span>
                  <span className="text-xs text-slate-400">
                    PDF, Word, Excel, PowerPoint, JPEG, or PNG — up to 20MB each
                  </span>
                  <input
                    id="file"
                    type="file"
                    multiple
                    accept="application/pdf,image/jpeg,image/png,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                    ref={ref}
                    onBlur={onBlur}
                    onChange={(e) => {
                      const picked = Array.from(e.target.files ?? []);
                      const combined = [...(value ?? []), ...picked];
                      onChange(combined.length > 0 ? combined : undefined);
                      // Reset so picking the same file again after removing it
                      // still fires a change event.
                      e.target.value = "";
                    }}
                    className="sr-only"
                  />
                </label>
                {value && value.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {value.map((file, index) => (
                      <li
                        key={`${file.name}-${file.size}-${index}`}
                        className="flex items-center justify-between gap-2 rounded-lg border border-[#E4E3F2] bg-[#FBFBFE] px-3 py-1.5 text-xs text-slate-600"
                      >
                        <span className="truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const next = value.filter((_, i) => i !== index);
                            onChange(next.length > 0 ? next : undefined);
                          }}
                          className="shrink-0 text-slate-400 transition hover:text-red-600"
                          aria-label={`Remove ${file.name}`}
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          />
          {errors.files && (
            <p className="mt-1 text-sm text-red-600">
              {errors.files.message as string}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-bold text-slate-700"
          >
            Description{" "}
            {hasFile ? (
              <span className="font-semibold text-slate-400">· optional</span>
            ) : (
              <span className="text-red-500">*</span>
            )}
          </label>
          {!hasFile && (
            <p className="mt-0.5 text-xs text-slate-500">
              No file attached — this text is the resource&apos;s content (at
              least 20 characters).
            </p>
          )}
          <textarea
            id="description"
            rows={hasFile ? 3 : 6}
            className="mt-1.5 w-full resize-y rounded-xl border border-[#E4E3F2] bg-[#FBFBFE] px-3 py-2.5 text-sm text-slate-700 transition motion-safe:duration-150 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            {...register("description")}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">
              {errors.description.message}
            </p>
          )}
        </div>

        {uploadResource.isPending && hasFile && (
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-primary-600 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || uploadResource.isPending}
          className="rounded-full bg-primary-600 px-5 py-2.5 font-bold text-white transition motion-safe:duration-150 hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploadResource.isPending
            ? hasFile
              ? `Uploading… ${progress}%`
              : "Posting…"
            : "Upload"}
        </button>
      </form>
    </div>
  );
}
