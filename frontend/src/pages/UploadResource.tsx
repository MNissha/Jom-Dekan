import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, FileText, ClipboardList, Presentation, Newspaper, FileSpreadsheet, UploadCloud, X } from "lucide-react";
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
  useCreateTaxonomyRequest,
} from "../hooks/useTaxonomy";
import { useMyProfile } from "../hooks/useProfile";
import { SearchableSelect } from "../components/common/SearchableSelect";
import { RESOURCE_CATEGORIES, RESOURCE_CATEGORY_LABELS, type ResourceCategory } from "../types/resource";

const CATEGORY_ICON: Record<ResourceCategory, typeof FileText> = {
  PAST_PAPER: FileText,
  NOTES: ClipboardList,
  SLIDES: Presentation,
  ARTICLE: Newspaper,
  EXCEL: FileSpreadsheet,
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

  // "Add a subject" is a separate mode rather than a schema field: it
  // needs a programme picked (local state, not RHF) before it makes
  // sense, and it replaces subjectId rather than adding to it.
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubjectCode, setNewSubjectCode] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newSubjectSemester, setNewSubjectSemester] = useState("");
  const [newSubjectIntakeYear, setNewSubjectIntakeYear] = useState("");
  const [newSubjectError, setNewSubjectError] = useState<string | null>(null);

  // Unlike subjects, universities/faculties/programmes have no
  // self-service creation — this just files a request for an admin to
  // review, so it never creates the picker option on the spot. Each of
  // University/Faculty/Programme gets its own inline request link right
  // under its own box; only one can be open at a time, tracked by level.
  const createTaxonomyRequest = useCreateTaxonomyRequest();
  const [requestingLevel, setRequestingLevel] =
    useState<"university" | "faculty" | "programme" | null>(null);
  const [requestName, setRequestName] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [submittedLevel, setSubmittedLevel] =
    useState<"university" | "faculty" | "programme" | null>(null);

  function startRequestingTaxonomy(level: "university" | "faculty" | "programme") {
    setRequestingLevel(level);
    setRequestName("");
    setRequestNote("");
    setSubmittedLevel(null);
  }

  function cancelRequestingTaxonomy() {
    setRequestingLevel(null);
    setRequestName("");
    setRequestNote("");
  }

  function submitTaxonomyRequest() {
    if (!requestingLevel || requestName.trim().length < 2) return;
    createTaxonomyRequest.mutate(
      {
        universityId: universityId || undefined,
        facultyId: facultyId || undefined,
        requestedUniversityName: requestingLevel === "university" ? requestName.trim() : undefined,
        requestedFacultyName: requestingLevel === "faculty" ? requestName.trim() : undefined,
        requestedProgrammeName: requestingLevel === "programme" ? requestName.trim() : undefined,
        note: requestNote.trim() || undefined,
      },
      {
        onSuccess: () => {
          setSubmittedLevel(requestingLevel);
          setRequestingLevel(null);
          setRequestName("");
          setRequestNote("");
        },
      },
    );
  }

  // Rendered under each of the University/Faculty/Programme boxes —
  // collapses to a text link, expands into a small inline form when that
  // box's link is clicked, and shows a confirmation after submitting.
  function renderTaxonomyRequestLink(
    level: "university" | "faculty" | "programme",
    label: string,
    placeholder: string,
  ) {
    if (requestingLevel === level) {
      return (
        <div className="mt-2 space-y-3 rounded-xl border border-primary-200 bg-primary-50/40 p-3">
          <div>
            <label className="block text-xs font-bold text-slate-600">
              {label} name<span className="text-red-500"> *</span>
            </label>
            <input
              autoFocus
              value={requestName}
              onChange={(e) => setRequestName(e.target.value)}
              placeholder={placeholder}
              className="mt-1 w-full rounded-lg border border-[#E4E3F2] bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600">
              Note <span className="font-semibold text-slate-400">· optional</span>
            </label>
            <textarea
              rows={2}
              value={requestNote}
              onChange={(e) => setRequestNote(e.target.value)}
              placeholder="Anything that helps an admin add it correctly (campus, official site, etc.)"
              className="mt-1 w-full resize-y rounded-lg border border-[#E4E3F2] bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          {createTaxonomyRequest.isError && (
            <p className="text-xs text-red-600">Couldn&apos;t submit that request. Please try again.</p>
          )}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={cancelRequestingTaxonomy}
              className="text-xs font-bold text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={requestName.trim().length < 2 || createTaxonomyRequest.isPending}
              onClick={submitTaxonomyRequest}
              className="rounded-full bg-primary-600 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createTaxonomyRequest.isPending ? "Submitting…" : "Submit request"}
            </button>
          </div>
        </div>
      );
    }
    if (submittedLevel === level) {
      return (
        <p className="mt-1 text-xs font-bold text-emerald-600">
          Request submitted — an admin will review it shortly.
        </p>
      );
    }
    return (
      <button
        type="button"
        onClick={() => startRequestingTaxonomy(level)}
        className="mt-1 text-xs font-bold text-primary-600 hover:text-primary-700"
      >
        Can&apos;t find your {label.toLowerCase()}? Request it
      </button>
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
      if (newSubjectCode.trim().length < 2 || newSubjectName.trim().length < 2) {
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
        subjectId: isAddingSubject ? undefined : values.subjectId,
        subjectCode: isAddingSubject ? newSubjectCode : undefined,
        subjectName: isAddingSubject ? newSubjectName : undefined,
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
    <div className="mx-auto max-w-6xl px-[18px] py-[22px] motion-safe:animate-[fadeIn_300ms_ease-out]">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Upload a resource</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Choose a category and either attach one or more files (PDF, Word, Excel, PowerPoint, JPEG, or PNG, up to 20MB each) or write the
        content directly as text. Every file is checked by its actual content before it&apos;s accepted — not just its name or extension.
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
            Your name and institution are attached to every resource you upload and stay visible to other users. Only
            upload material you have the right to share.
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
          <label htmlFor="title" className="block text-sm font-bold text-slate-700">
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

        <div>
          <span className="block text-sm font-bold text-slate-700">
            Category<span className="text-red-500"> *</span>
          </span>
          <p className="mt-0.5 text-xs text-slate-500">Pick one — this shows on the resource card and can be filtered on.</p>
          <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {RESOURCE_CATEGORIES.map((c) => {
              const Icon = CATEGORY_ICON[c];
              const active = category === c;
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setValue("category", c, { shouldValidate: true })}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-bold transition motion-safe:duration-150 ${
                    active
                      ? "border-primary-500 bg-primary-50 text-primary-700"
                      : "border-[#E4E3F2] text-slate-600 hover:-translate-y-0.5 hover:border-primary-200"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {RESOURCE_CATEGORY_LABELS[c]}
                </button>
              );
            })}
          </div>
          {errors.category && (
            <p className="mt-1 text-sm text-red-600">{errors.category.message as string}</p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="universityId" className="block text-sm font-bold text-slate-700">
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
                cancelRequestingTaxonomy();
                setSubmittedLevel(null);
              }}
              placeholder="Search for a university…"
            />
            {!universityId && renderTaxonomyRequestLink("university", "University", "e.g. Universiti Contoh Malaysia")}
          </div>
          <div>
            <label htmlFor="facultyId" className="block text-sm font-bold text-slate-700">
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
                cancelRequestingTaxonomy();
                setSubmittedLevel(null);
              }}
              disabled={!universityId}
              placeholder={universityId ? "Search for a faculty…" : "Select a university first"}
            />
            {universityId && !facultyId &&
              renderTaxonomyRequestLink("faculty", "Faculty", "e.g. Faculty of Applied Sciences")}
          </div>
          <div>
            <label htmlFor="programmeId" className="block text-sm font-bold text-slate-700">
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
                cancelRequestingTaxonomy();
                setSubmittedLevel(null);
              }}
              disabled={!facultyId}
              placeholder={facultyId ? "Search for a programme…" : "Select a faculty first"}
            />
            {facultyId && !programmeId &&
              renderTaxonomyRequestLink("programme", "Programme", "e.g. Bachelor of Data Science (Hons)")}
          </div>
          <div>
            <label htmlFor="subjectId" className="block text-sm font-bold text-slate-700">
              Subject
            </label>
            {isAddingSubject ? (
              <div className="mt-1.5 space-y-3 rounded-xl border border-primary-200 bg-primary-50/40 p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="newSubjectCode" className="block text-xs font-bold text-slate-600">
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
                    <label htmlFor="newSubjectName" className="block text-xs font-bold text-slate-600">
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
                    <label htmlFor="newSubjectSemester" className="block text-xs font-bold text-slate-600">
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
                    <label htmlFor="newSubjectIntakeYear" className="block text-xs font-bold text-slate-600">
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
                    Not in the catalogue yet — this adds it as a community-submitted
                    subject that&apos;s ready to use right away. An admin will verify it later.
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
                          label: `${item.code} · ${item.name}${
                            item.verificationStatus === "COMMUNITY_SUBMITTED"
                              ? " (community)"
                              : ""
                          }`,
                        }))}
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      disabled={!programmeId}
                      placeholder={programmeId ? "Search for a subject…" : "Select a programme first"}
                    />
                  )}
                />
                {programmeId && subjects && subjects.length === 0 && (
                  <p className="mt-1 text-xs text-slate-500">
                    No subjects are linked to this programme yet.
                  </p>
                )}
                <button
                  type="button"
                  disabled={!programmeId}
                  onClick={startAddingSubject}
                  className="mt-1 text-xs font-bold text-primary-600 hover:text-primary-700 disabled:cursor-not-allowed disabled:text-slate-400"
                >
                  Can&apos;t find it? Add a new subject
                </button>
              </>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="file" className="block text-sm font-bold text-slate-700">
            Files <span className="font-semibold text-slate-400">· optional</span>
          </label>
          <p className="mt-0.5 text-xs text-slate-500">
            Leave this empty to post as text instead — write the content in the description field below. Attach
            multiple files (e.g. several scanned pages or slide decks) and they&apos;ll all belong to this one resource.
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
                  <UploadCloud className="h-6 w-6 text-primary-500" aria-hidden="true" />
                  <span className="text-sm font-semibold text-slate-700">
                    {value && value.length > 0
                      ? `${value.length} file${value.length === 1 ? "" : "s"} selected — click to add more`
                      : "Click to choose one or more files"}
                  </span>
                  <span className="text-xs text-slate-400">PDF, Word, Excel, PowerPoint, JPEG, or PNG — up to 20MB each</span>
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
          <label htmlFor="description" className="block text-sm font-bold text-slate-700">
            Description {hasFile ? <span className="font-semibold text-slate-400">· optional</span> : <span className="text-red-500">*</span>}
          </label>
          {!hasFile && (
            <p className="mt-0.5 text-xs text-slate-500">No file attached — this text is the resource&apos;s content (at least 20 characters).</p>
          )}
          <textarea
            id="description"
            rows={hasFile ? 3 : 6}
            className="mt-1.5 w-full resize-y rounded-xl border border-[#E4E3F2] bg-[#FBFBFE] px-3 py-2.5 text-sm text-slate-700 transition motion-safe:duration-150 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            {...register("description")}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
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
          {uploadResource.isPending ? (hasFile ? `Uploading… ${progress}%` : "Posting…") : "Upload"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mt-5 flex items-center gap-1.5 text-sm font-bold text-slate-500 transition motion-safe:duration-150 hover:-translate-x-0.5 hover:text-primary-700"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back
      </button>
    </div>
  );
}
