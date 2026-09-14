import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";
import { Pencil } from "lucide-react";
import { AdminPageShell } from "../../layouts/AdminPageShell";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { StatusBanner } from "../../components/common/StatusBanner";
import {
  useUniversities,
  useFaculties,
  useProgrammes,
  useCreateProgramme,
  useUpdateProgramme,
  useSetProgrammeStatus,
  useSubjects,
  useLinkSubjectToProgramme,
  useUnlinkSubjectFromProgramme,
} from "../../hooks/useTaxonomy";
import type { Programme, Subject } from "../../types/taxonomy";

const studyLevelOptions = ["DIPLOMA", "DEGREE", "MASTERS", "PHD"] as const;

const programmeCreateSchema = z.object({
  name: z.string().trim().min(2, "Enter at least 2 characters.").max(200),
  studyLevel: z.enum(studyLevelOptions).optional(),
});
type ProgrammeCreateValues = z.infer<typeof programmeCreateSchema>;

const programmeEditSchema = z.object({
  name: z.string().trim().min(2, "Enter at least 2 characters.").max(200),
  studyLevel: z.enum(studyLevelOptions).optional(),
});

function extractErrorMessage(error: unknown): string | null {
  if (!axios.isAxiosError(error)) return null;
  return (
    (error.response?.data as { error?: { message?: string } })?.error
      ?.message ?? null
  );
}

export default function AdminProgrammes({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const { data: universities } = useUniversities();
  const [universityId, setUniversityId] = useState("");
  const { data: faculties } = useFaculties(universityId || undefined);
  const [facultyId, setFacultyId] = useState("");

  const {
    data: programmes,
    isLoading,
    isError,
  } = useProgrammes(facultyId || undefined);
  const createProgramme = useCreateProgramme();
  const updateProgramme = useUpdateProgramme();
  const setStatus = useSetProgrammeStatus();

  const [manageProgrammeId, setManageProgrammeId] = useState("");
  const { data: allSubjects } = useSubjects();
  const { data: linkedSubjects } = useSubjects(manageProgrammeId || undefined);
  const linkSubject = useLinkSubjectToProgramme();
  const unlinkSubject = useUnlinkSubjectFromProgramme();
  const [subjectToLink, setSubjectToLink] = useState("");
  const [unlinkTarget, setUnlinkTarget] = useState<Subject | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    name: string;
    studyLevel: "" | (typeof studyLevelOptions)[number];
  }>({ name: "", studyLevel: "" });
  const [editError, setEditError] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Programme | null>(null);
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProgrammeCreateValues>({
    resolver: zodResolver(programmeCreateSchema),
  });

  const onSubmit = (values: ProgrammeCreateValues) => {
    if (!facultyId) return;
    createProgramme.mutate(
      { facultyId, ...values },
      {
        onSuccess: () => {
          reset();
          setBanner({ type: "success", message: "Programme added." });
        },
      },
    );
  };

  const serverError = createProgramme.isError
    ? extractErrorMessage(createProgramme.error)
    : null;

  const startEdit = (p: Programme) => {
    setEditingId(p.id);
    setEditValues({
      name: p.name,
      studyLevel: (p.studyLevel as (typeof studyLevelOptions)[number]) || "",
    });
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError(null);
  };

  const saveEdit = (id: string) => {
    const result = programmeEditSchema.safeParse({
      name: editValues.name,
      studyLevel: editValues.studyLevel || undefined,
    });
    if (!result.success) {
      setEditError(result.error.issues[0]?.message ?? "Invalid values.");
      return;
    }
    updateProgramme.mutate(
      { id, data: result.data },
      {
        onSuccess: () => {
          setEditingId(null);
          setBanner({ type: "success", message: "Programme updated." });
        },
        onError: (err) =>
          setEditError(
            extractErrorMessage(err) ?? "Could not update programme.",
          ),
      },
    );
  };

  const confirmArchive = () => {
    if (!archiveTarget) return;
    const target = archiveTarget;
    setArchiveTarget(null);
    setStatus.mutate(
      { id: target.id, isActive: false },
      {
        onSuccess: () =>
          setBanner({ type: "success", message: `${target.name} archived.` }),
        onError: (err) =>
          setBanner({
            type: "error",
            message: extractErrorMessage(err) ?? "Could not archive programme.",
          }),
      },
    );
  };

  const restore = (p: Programme) => {
    setStatus.mutate(
      { id: p.id, isActive: true },
      {
        onSuccess: () =>
          setBanner({ type: "success", message: `${p.name} restored.` }),
        onError: (err) =>
          setBanner({
            type: "error",
            message: extractErrorMessage(err) ?? "Could not restore programme.",
          }),
      },
    );
  };

  const confirmUnlink = () => {
    if (!unlinkTarget || !manageProgrammeId) return;
    const target = unlinkTarget;
    setUnlinkTarget(null);
    unlinkSubject.mutate(
      { programmeId: manageProgrammeId, subjectId: target.id },
      {
        onSuccess: () =>
          setBanner({
            type: "success",
            message: `${target.code} unlinked from programme.`,
          }),
        onError: (err) =>
          setBanner({
            type: "error",
            message: extractErrorMessage(err) ?? "Could not unlink subject.",
          }),
      },
    );
  };

  return (
    <AdminPageShell embedded={embedded}>
      <h1 className="text-2xl font-bold text-slate-900">Programmes</h1>
      <p className="mt-1 text-sm text-slate-500">
        Pick a university, then a faculty, to manage its programmes.
      </p>

      {banner && (
        <StatusBanner
          type={banner.type}
          message={banner.message}
          onDismiss={() => setBanner(null)}
        />
      )}

      <div className="mt-6 flex flex-wrap gap-4">
        <div>
          <label
            htmlFor="universityId"
            className="block text-sm font-medium text-slate-700"
          >
            University
          </label>
          <select
            id="universityId"
            value={universityId}
            onChange={(e) => {
              setUniversityId(e.target.value);
              setFacultyId(""); // parent changed, so the stale child selection must be cleared
            }}
            className="mt-1 w-64 rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Select a university…</option>
            {universities?.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="facultyId"
            className="block text-sm font-medium text-slate-700"
          >
            Faculty
          </label>
          <select
            id="facultyId"
            value={facultyId}
            onChange={(e) => setFacultyId(e.target.value)}
            disabled={!universityId}
            className="mt-1 w-64 rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-slate-100"
          >
            <option value="">Select a faculty…</option>
            {faculties?.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {facultyId && (
        <>
          <form
            className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            {serverError && (
              <div
                role="alert"
                className="w-full rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700"
              >
                {serverError}
              </div>
            )}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-slate-700"
              >
                Programme name
              </label>
              <input
                id="name"
                className="mt-1 w-64 rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-invalid={Boolean(errors.name)}
                {...register("name")}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="studyLevel"
                className="block text-sm font-medium text-slate-700"
              >
                Study level
              </label>
              <select
                id="studyLevel"
                className="mt-1 w-40 rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                {...register("studyLevel")}
              >
                <option value="">—</option>
                <option value="DIPLOMA">Diploma</option>
                <option value="DEGREE">Degree</option>
                <option value="MASTERS">Masters</option>
                <option value="PHD">PhD</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={isSubmitting || createProgramme.isPending}
              className="rounded-full bg-primary-600 px-5 py-2.5 font-medium text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {createProgramme.isPending ? "Adding…" : "Add programme"}
            </button>
          </form>

          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            {isLoading ? (
              <p className="p-4 text-sm text-slate-500">Loading…</p>
            ) : isError ? (
              <p className="p-4 text-sm text-red-600">
                Could not load programmes.
              </p>
            ) : programmes && programmes.length > 0 ? (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Level</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {programmes.map((p) => {
                    const isEditing = editingId === p.id;
                    return (
                      <tr key={p.id} className="border-t border-slate-100">
                        {isEditing ? (
                          <>
                            <td className="px-4 py-2">
                              <input
                                value={editValues.name}
                                onChange={(e) =>
                                  setEditValues((v) => ({
                                    ...v,
                                    name: e.target.value,
                                  }))
                                }
                                className="w-48 rounded-lg border border-slate-300 px-2 py-1 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                aria-label="Programme name"
                              />
                              {editError && (
                                <p className="mt-1 text-xs text-red-600">
                                  {editError}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              <select
                                value={editValues.studyLevel}
                                onChange={(e) =>
                                  setEditValues((v) => ({
                                    ...v,
                                    studyLevel: e.target
                                      .value as typeof editValues.studyLevel,
                                  }))
                                }
                                className="w-32 rounded-lg border border-slate-300 px-2 py-1 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                aria-label="Study level"
                              >
                                <option value="">—</option>
                                <option value="DIPLOMA">Diploma</option>
                                <option value="DEGREE">Degree</option>
                                <option value="MASTERS">Masters</option>
                                <option value="PHD">PhD</option>
                              </select>
                            </td>
                            <td className="px-4 py-2">
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                                {p.isActive ? "Active" : "Archived"}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => saveEdit(p.id)}
                                disabled={updateProgramme.isPending}
                                className="mr-3 text-sm font-medium text-primary-700 hover:underline disabled:opacity-60"
                              >
                                {updateProgramme.isPending
                                  ? "Saving…"
                                  : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="text-sm font-medium text-slate-500 hover:underline"
                              >
                                Cancel
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-2 font-medium text-slate-800">
                              {p.name}
                            </td>
                            <td className="px-4 py-2 text-slate-600">
                              {p.studyLevel ?? "—"}
                            </td>
                            <td className="px-4 py-2">
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                  p.isActive
                                    ? "bg-green-100 text-green-700"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {p.isActive ? "Active" : "Archived"}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-right">
                              <button
                                type="button"
                                onClick={() => startEdit(p)}
                                className="mr-3 inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:underline"
                              >
                                <Pencil
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setManageProgrammeId(
                                    manageProgrammeId === p.id ? "" : p.id,
                                  )
                                }
                                className="mr-3 text-sm font-medium text-primary-700 hover:underline"
                              >
                                {manageProgrammeId === p.id
                                  ? "Hide subjects"
                                  : "Subjects"}
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  p.isActive
                                    ? setArchiveTarget(p)
                                    : restore(p)
                                }
                                disabled={setStatus.isPending}
                                className="text-sm font-medium text-primary-700 hover:underline disabled:opacity-60"
                              >
                                {p.isActive ? "Archive" : "Restore"}
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="p-4 text-sm text-slate-500">
                No programmes yet for this faculty — add one above.
              </p>
            )}
          </div>

          {manageProgrammeId && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="font-semibold text-slate-800">
                Subjects for{" "}
                {programmes?.find((p) => p.id === manageProgrammeId)?.name}
              </h3>
              <p className="mt-0.5 text-sm text-slate-500">
                These are the subjects offered to the subject picker on
                Upload Resource once this programme is selected.
              </p>

              <div className="mt-3 flex flex-wrap items-end gap-3">
                <div>
                  <label
                    htmlFor="subjectToLink"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Add a subject
                  </label>
                  <select
                    id="subjectToLink"
                    value={subjectToLink}
                    onChange={(e) => setSubjectToLink(e.target.value)}
                    className="mt-1 w-64 rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select a subject…</option>
                    {allSubjects
                      ?.filter(
                        (s) => !linkedSubjects?.some((ls) => ls.id === s.id),
                      )
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.code} · {s.name}
                        </option>
                      ))}
                  </select>
                </div>
                <button
                  type="button"
                  disabled={!subjectToLink || linkSubject.isPending}
                  onClick={() =>
                    linkSubject.mutate(
                      {
                        programmeId: manageProgrammeId,
                        subjectId: subjectToLink,
                      },
                      {
                        onSuccess: () => {
                          setSubjectToLink("");
                          setBanner({
                            type: "success",
                            message: "Subject linked to programme.",
                          });
                        },
                        onError: (err) =>
                          setBanner({
                            type: "error",
                            message:
                              extractErrorMessage(err) ??
                              "Could not link subject.",
                          }),
                      },
                    )
                  }
                  className="rounded-full bg-primary-600 px-5 py-2.5 font-medium text-white hover:bg-primary-700 disabled:opacity-60"
                >
                  {linkSubject.isPending ? "Adding…" : "Link subject"}
                </button>
              </div>

              <ul className="mt-4 flex flex-col gap-2">
                {linkedSubjects && linkedSubjects.length > 0 ? (
                  linkedSubjects.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <span>
                        <span className="font-medium text-slate-800">
                          {s.code}
                        </span>{" "}
                        <span className="text-slate-600">{s.name}</span>
                      </span>
                      <button
                        type="button"
                        disabled={unlinkSubject.isPending}
                        onClick={() => setUnlinkTarget(s)}
                        className="text-sm font-medium text-red-600 hover:underline disabled:opacity-60"
                      >
                        Unlink
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-slate-500">
                    No subjects linked to this programme yet.
                  </li>
                )}
              </ul>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        isOpen={archiveTarget !== null}
        title="Archive programme?"
        message={`"${archiveTarget?.name}" will be hidden from new picks (subject linking, uploads). Existing links and resources are unaffected, and you can restore it any time.`}
        confirmLabel="Archive"
        destructive
        isConfirming={setStatus.isPending}
        onConfirm={confirmArchive}
        onCancel={() => setArchiveTarget(null)}
      />

      <ConfirmDialog
        isOpen={unlinkTarget !== null}
        title="Unlink subject?"
        message={`"${unlinkTarget?.code} · ${unlinkTarget?.name}" will no longer appear as an offered subject for this programme.`}
        confirmLabel="Unlink"
        destructive
        isConfirming={unlinkSubject.isPending}
        onConfirm={confirmUnlink}
        onCancel={() => setUnlinkTarget(null)}
      />
    </AdminPageShell>
  );
}
