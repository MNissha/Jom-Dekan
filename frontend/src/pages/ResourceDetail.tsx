import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import {
  useResource,
  useUpdateResource,
  useSetResourceStatus,
  useDeleteResource,
  useFilePreviewUrl,
  useResourceComments,
  useCreateResourceComment,
  useUpdateResourceComment,
  useDeleteResourceComment,
} from "../hooks/useResources";
import { useCurrentUser } from "../hooks/useAuth";
import {
  useUniversities,
  useFaculties,
  useProgrammes,
  useSubjects,
} from "../hooks/useTaxonomy";
import { FavoriteButton } from "../components/common/FavoriteButton";
import { ReportButton } from "../components/common/ReportButton";
import { PdfThumbnail } from "../components/common/PdfThumbnail";
import { UserLink } from "../components/common/UserLink";
import { AiSummarySection } from "../components/resource/AiSummarySection";
import { ResourceFileList } from "../components/resource/ResourceFileList";
import { ResourceAgentPanel } from "../components/resources/ResourceAgentPanel";
import { SearchableSelect } from "../components/common/SearchableSelect";
import { useMinimumLoading } from "../hooks/useMinimumLoading";

import {
  editResourceFormSchema,
  type EditResourceFormValues,
} from "../schemas/resourceSchemas";

// Mirrors Resources.tsx's own ResourceTaxonomyLine — same university ·
// faculty · programme breadcrumb, resolved the same way (each consumer
// scopes useFaculties/useProgrammes to its own ids rather than a shared
// filter selection), so a resource reads identically on its card and on
// this detail page.
function ResourceTaxonomyLine({
  universityId,
  facultyId,
  programmeId,
}: {
  universityId: string | null;
  facultyId: string | null;
  programmeId: string | null;
}) {
  const { data: universities } = useUniversities();
  const { data: faculties } = useFaculties(universityId ?? undefined);
  const { data: programmes } = useProgrammes(facultyId ?? undefined);

  const university = universities?.find((u) => u.id === universityId);
  const faculty = faculties?.find((f) => f.id === facultyId);
  const programme = programmes?.find((p) => p.id === programmeId);

  const parts = [university?.name, faculty?.name, programme?.name].filter(Boolean);
  if (parts.length === 0) return null;

  return <p className="mt-1 text-xs font-semibold text-slate-400">{parts.join(" · ")}</p>;
}

// Same subject badge as the Resources page card — resolved via
// useSubjects(programmeId), same scoping the card uses.
function ResourceSubjectBadge({
  programmeId,
  subjectId,
}: {
  programmeId: string | null;
  subjectId: string | null;
}) {
  const { data: subjects } = useSubjects(programmeId ?? undefined);
  const subject = subjects?.find((s) => s.id === subjectId);
  if (!subject) return null;

  return (
    <span className="mt-2 inline-block rounded-full bg-[#F1F0FA] px-2.5 py-1 text-[11px] font-bold text-primary-700">
      {subject.code} · {subject.name}
    </span>
  );
}

export default function ResourceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const { data, isLoading, isError } = useResource(id);
  const updateResource = useUpdateResource();
  const setStatus = useSetResourceStatus();
  const deleteResource = useDeleteResource();
  const [isEditing, setIsEditing] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState("");
  const { data: comments } = useResourceComments(id);
  const createComment = useCreateResourceComment();
  const updateComment = useUpdateResourceComment();
  const deleteComment = useDeleteResourceComment();

  const [isAgentPanelOpen, setAgentPanelOpen] = useState(false);
  const agentLauncherRef = useRef<HTMLButtonElement>(null);
  const summarySectionRef = useRef<HTMLElement>(null);
  // Explicit AI-source selection for a multi-file resource — lives here
  // (not inside AiSummarySection) because both the summary card and the
  // agent panel must read the exact same selection. Undefined means "no
  // explicit choice yet", which the backend resolves to its own
  // deterministic recommendation — never an arbitrary/ambiguous file.
  const [selectedAiFileId, setSelectedAiFileId] = useState<string | undefined>(undefined);

  const handleViewFullSummary = () => {
    setAgentPanelOpen(false);
    // Wait a frame so the panel's own close (and any layout it affects)
    // settles before scrolling, then move both scroll and focus to the
    // summary card — this never re-fetches or regenerates the summary.
    requestAnimationFrame(() => {
      summarySectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      summarySectionRef.current?.focus();
    });
  };

  const { register, handleSubmit, reset, control, setValue } = useForm<EditResourceFormValues>({
    resolver: zodResolver(editResourceFormSchema),
    values: data
      ? {
          title: data.resource.title,
          description: data.resource.description ?? undefined,
          universityId: data.resource.universityId ?? "",
          facultyId: data.resource.facultyId ?? "",
          programmeId: data.resource.programmeId ?? "",
          subjectId: data.resource.subjectId ?? "",
        }
      : undefined,
  });

  // Local, RHF-independent copies of the cascade's own parent ids — the
  // SearchableSelect options for faculty/programme/subject need to be
  // scoped to *these*, not the raw form values, so changing university
  // can reset the lower levels before the next render reads them.
  const [editUniversityId, setEditUniversityId] = useState("");
  const [editFacultyId, setEditFacultyId] = useState("");
  const [editProgrammeId, setEditProgrammeId] = useState("");

  useEffect(() => {
    if (!data) return;
    setEditUniversityId(data.resource.universityId ?? "");
    setEditFacultyId(data.resource.facultyId ?? "");
    setEditProgrammeId(data.resource.programmeId ?? "");
  }, [data]);

  const { data: universities } = useUniversities();
  const { data: editFaculties } = useFaculties(editUniversityId || undefined);
  const { data: editProgrammes } = useProgrammes(editFacultyId || undefined);
  const { data: editSubjects } = useSubjects(editProgrammeId || undefined);

  const readyFiles = data?.files.filter((f) => f.status === "READY") ?? [];
  const readyFile = readyFiles[0];
  const isImage = readyFile?.detectedMimeType?.startsWith("image/") ?? false;
  const isPdf = readyFile?.detectedMimeType === "application/pdf";
  // Hooks must run unconditionally on every render (before the early
  // returns below), so this is fetched here even though it's only
  // rendered further down once `data` is confirmed present.
  const { data: previewUrl } = useFilePreviewUrl(
    isImage || isPdf ? readyFile?.id : undefined,
  );
  const showSkeleton = useMinimumLoading(isLoading, 2000);

  if (showSkeleton)
    return (
      <div className="mx-auto max-w-3xl animate-pulse px-[18px] py-[22px]" aria-label="Loading academic resource">
        <div className="h-4 w-24 rounded bg-violet-100" />
        <div className="mt-5 overflow-hidden rounded-[22px] border border-[#ECEBF7] bg-white shadow-sm">
          <div className="h-48 bg-slate-100" />
          <div className="space-y-3 p-6"><div className="h-7 w-2/3 rounded bg-violet-100" /><div className="h-4 w-full rounded bg-slate-100" /><div className="h-4 w-4/5 rounded bg-slate-100" /></div>
        </div>
      </div>
    );

  if (isLoading)
    return (
      <p className="mx-auto max-w-3xl px-[18px] py-[22px] text-sm text-slate-500">
        Loading…
      </p>
    );

  if (isError || !data)
    return (
      <div className="mx-auto max-w-3xl px-[18px] py-[22px]">
        <p className="text-sm text-red-600">
          This resource does not exist, or you don't have access to it.
        </p>
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
      </div>
    );

  const { resource } = data;
  // UX-only check — the buttons this gates are a convenience, not a
  // security boundary. The server enforces ownership on every request
  // regardless of what this renders.
  const isOwner = user?.id === resource.ownerId;
  const canManage = isOwner || user?.role === "ADMIN";

  const onSave = (values: EditResourceFormValues) => {
    updateResource.mutate(
      {
        id: resource.id,
        data: {
          title: values.title,
          description: values.description,
          universityId: values.universityId || undefined,
          facultyId: values.facultyId || undefined,
          programmeId: values.programmeId || undefined,
          subjectId: values.subjectId || undefined,
        },
      },
      { onSuccess: () => setIsEditing(false) },
    );
  };

  const handleDelete = () => {
    if (
      !window.confirm(
        `Delete "${resource.title}" permanently? This cannot be undone.`,
      )
    )
      return;
    deleteResource.mutate(resource.id, {
      onSuccess: () => navigate("/resources"),
    });
  };

  const handleAddComment = (event: React.FormEvent) => {
    event.preventDefault();
    if (!commentBody.trim()) return;
    createComment.mutate(
      { resourceId: resource.id, body: commentBody },
      { onSuccess: () => setCommentBody("") },
    );
  };

  const handleSaveComment = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingCommentId || !editingCommentBody.trim()) return;
    updateComment.mutate(
      {
        resourceId: resource.id,
        commentId: editingCommentId,
        body: editingCommentBody,
      },
      { onSuccess: () => setEditingCommentId(null) },
    );
  };

  return (
    <div className="mx-auto max-w-3xl px-[18px] py-[22px]">
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

      <div className="mt-4 rounded-2xl border border-[#ECEBF7] bg-white p-6">
        {isEditing ? (
          <form onSubmit={handleSubmit(onSave)} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-slate-700"
              >
                Title
              </label>
              <input
                id="title"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                {...register("title")}
              />
            </div>
            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-slate-700"
              >
                Description
              </label>
              <textarea
                id="description"
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                {...register("description")}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="edit-universityId" className="block text-sm font-medium text-slate-700">
                  University
                </label>
                <Controller
                  control={control}
                  name="universityId"
                  render={({ field }) => (
                    <SearchableSelect
                      id="edit-universityId"
                      options={(universities ?? [])
                        .filter((u) => u.isActive)
                        .map((u) => ({ value: u.id, label: u.name }))}
                      value={field.value ?? ""}
                      onChange={(value) => {
                        field.onChange(value);
                        setEditUniversityId(value);
                        setEditFacultyId("");
                        setEditProgrammeId("");
                        setValue("facultyId", "");
                        setValue("programmeId", "");
                        setValue("subjectId", "");
                      }}
                      placeholder="Search for a university…"
                    />
                  )}
                />
              </div>

              <div>
                <label htmlFor="edit-facultyId" className="block text-sm font-medium text-slate-700">
                  Faculty
                </label>
                <Controller
                  control={control}
                  name="facultyId"
                  render={({ field }) => (
                    <SearchableSelect
                      id="edit-facultyId"
                      options={(editFaculties ?? [])
                        .filter((f) => f.isActive)
                        .map((f) => ({ value: f.id, label: f.name }))}
                      value={field.value ?? ""}
                      onChange={(value) => {
                        field.onChange(value);
                        setEditFacultyId(value);
                        setEditProgrammeId("");
                        setValue("programmeId", "");
                        setValue("subjectId", "");
                      }}
                      disabled={!editUniversityId}
                      placeholder={editUniversityId ? "Search for a faculty…" : "Select a university first"}
                    />
                  )}
                />
              </div>

              <div>
                <label htmlFor="edit-programmeId" className="block text-sm font-medium text-slate-700">
                  Programme
                </label>
                <Controller
                  control={control}
                  name="programmeId"
                  render={({ field }) => (
                    <SearchableSelect
                      id="edit-programmeId"
                      options={(editProgrammes ?? [])
                        .filter((p) => p.isActive)
                        .map((p) => ({ value: p.id, label: p.name }))}
                      value={field.value ?? ""}
                      onChange={(value) => {
                        field.onChange(value);
                        setEditProgrammeId(value);
                        setValue("subjectId", "");
                      }}
                      disabled={!editFacultyId}
                      placeholder={editFacultyId ? "Search for a programme…" : "Select a faculty first"}
                    />
                  )}
                />
              </div>

              <div>
                <label htmlFor="edit-subjectId" className="block text-sm font-medium text-slate-700">
                  Subject
                </label>
                <Controller
                  control={control}
                  name="subjectId"
                  render={({ field }) => (
                    <SearchableSelect
                      id="edit-subjectId"
                      options={(editSubjects ?? [])
                        .filter((s) => s.isActive)
                        .map((s) => ({ value: s.id, label: `${s.code} · ${s.name}` }))}
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      disabled={!editProgrammeId}
                      placeholder={editProgrammeId ? "Search for a subject…" : "Select a programme first"}
                    />
                  )}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={updateResource.isPending}
                className="rounded-full bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  reset();
                  setEditUniversityId(resource.universityId ?? "");
                  setEditFacultyId(resource.facultyId ?? "");
                  setEditProgrammeId(resource.programmeId ?? "");
                  setIsEditing(false);
                }}
                className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl font-bold text-slate-900">
                {resource.title}
              </h1>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                  resource.status === "READY"
                    ? "bg-green-100 text-green-700"
                    : resource.status === "PENDING"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-slate-100 text-slate-500"
                }`}
              >
                {resource.status}
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              Uploaded by{" "}
              {resource.ownerName ? (
                <UserLink userId={resource.ownerId} name={resource.ownerName} className="font-semibold text-slate-500 hover:text-primary-700 hover:underline" />
              ) : (
                "A JomDekan student"
              )}
              {" · "}
              {new Date(resource.createdAt).toLocaleDateString()}
            </p>
            <ResourceTaxonomyLine
              universityId={resource.universityId}
              facultyId={resource.facultyId}
              programmeId={resource.programmeId}
            />
            <ResourceSubjectBadge
              programmeId={resource.programmeId}
              subjectId={resource.subjectId}
            />

            {resource.description && (
              <p className="mt-2 whitespace-pre-wrap text-slate-600">
                {resource.description}
              </p>
            )}

            {isImage && previewUrl && (
              <img
                src={previewUrl}
                alt={readyFile?.originalFilename ?? resource.title}
                className="mt-4 max-h-96 w-full rounded-lg border border-slate-200 object-contain"
              />
            )}

            {isPdf && previewUrl && (
              <div className="mt-4 flex max-h-96 w-full items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                <PdfThumbnail url={previewUrl} className="max-h-96 w-full object-contain" />
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-2">
              <FavoriteButton targetType="resource" targetId={resource.id} variant="pill" />
              {canManage && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setStatus.mutate({
                        id: resource.id,
                        action:
                          resource.status === "ARCHIVED"
                            ? "RESTORE"
                            : "ARCHIVE",
                      })
                    }
                    disabled={setStatus.isPending}
                    className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-60"
                  >
                    {resource.status === "ARCHIVED" ? "Restore" : "Archive"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleteResource.isPending}
                    className="rounded-full bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
                  >
                    {deleteResource.isPending ? "Deleting…" : "Delete"}
                  </button>
                </>
              )}

              {!isOwner && (
                <ReportButton targetType="resource" targetId={resource.id} />
              )}
            </div>

          </>
        )}
      </div>

      <ResourceFileList files={data.files} />

      <AiSummarySection
        ref={summarySectionRef}
        resourceId={resource.id}
        resourceTitle={resource.title}
        onOpenAgent={() => setAgentPanelOpen(true)}
        isAgentOpen={isAgentPanelOpen}
        launcherButtonRef={agentLauncherRef}
        resourceFileId={selectedAiFileId}
        onSelectFileId={setSelectedAiFileId}
      />

      <ResourceAgentPanel
        key={`${resource.id}:${selectedAiFileId ?? "default"}`}
        resourceId={resource.id}
        resourceTitle={resource.title}
        isOpen={isAgentPanelOpen}
        onClose={() => setAgentPanelOpen(false)}
        launcherButtonRef={agentLauncherRef}
        resourceFileId={selectedAiFileId}
        onViewFullSummary={handleViewFullSummary}
      />

      <section className="mt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Discussion</h2>
            <p className="mt-1 text-sm text-slate-500">
              Ask a question or share context about this resource.
            </p>
          </div>
          <span className="text-sm text-slate-400">
            {comments?.length ?? 0} comment{comments?.length === 1 ? "" : "s"}
          </span>
        </div>

        <form
          onSubmit={handleAddComment}
          className="mt-4 rounded-2xl border border-[#ECEBF7] bg-white p-4"
        >
          <textarea
            value={commentBody}
            onChange={(event) => setCommentBody(event.target.value)}
            placeholder="Add to the discussion…"
            required
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            type="submit"
            disabled={createComment.isPending}
            className="mt-3 rounded-full bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {createComment.isPending ? "Posting…" : "Comment"}
          </button>
        </form>

        <div className="mt-4 flex flex-col gap-3">
          {(comments ?? []).map((comment) => {
            const canManageComment =
              user?.id === comment.authorId || user?.role === "ADMIN";
            return (
              <article
                key={comment.id}
                className="rounded-2xl border border-[#ECEBF7] bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      <UserLink userId={comment.authorId} name={comment.authorName} className="font-semibold text-slate-800 hover:text-primary-700 hover:underline" />
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {canManageComment && editingCommentId !== comment.id && (
                    <div className="flex gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCommentId(comment.id);
                          setEditingCommentBody(comment.body);
                        }}
                        className="text-primary-700 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            window.confirm(
                              "Delete this comment? This cannot be undone.",
                            )
                          )
                            deleteComment.mutate({
                              resourceId: resource.id,
                              commentId: comment.id,
                            });
                        }}
                        className="text-red-700 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
                {editingCommentId === comment.id ? (
                  <form onSubmit={handleSaveComment} className="mt-3">
                    <textarea
                      value={editingCommentBody}
                      onChange={(event) =>
                        setEditingCommentBody(event.target.value)
                      }
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        type="submit"
                        disabled={updateComment.isPending}
                        className="rounded-full bg-primary-600 px-3 py-1.5 text-xs font-medium text-white"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingCommentId(null)}
                        className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">
                    {comment.body}
                  </p>
                )}
              </article>
            );
          })}
          {(comments ?? []).length === 0 && (
            <p className="rounded-2xl border border-[#ECEBF7] bg-white p-4 text-sm text-slate-500">
              No comments yet — start the discussion.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
