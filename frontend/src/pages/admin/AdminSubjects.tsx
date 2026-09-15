import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";
import { Pencil, Archive, RotateCcw, Trash2, Check, X } from "lucide-react";
import { AdminPageShell } from "../../layouts/AdminPageShell";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { StatusBanner } from "../../components/common/StatusBanner";
import { RowAction } from "../../components/common/RowAction";
import {
  subjectFormSchema,
  type SubjectFormValues,
} from "../../schemas/taxonomySchemas";
import {
  useSubjects,
  useCreateSubject,
  useUpdateSubject,
  useSetSubjectStatus,
  useDeleteSubject,
} from "../../hooks/useTaxonomy";
import type { Subject } from "../../types/taxonomy";

// Editing a subject only changes its name — the code is immutable once
// created, matching updateSubjectSchema on the backend.
const subjectNameSchema = z.object({
  name: z.string().trim().min(2, "Enter at least 2 characters.").max(200),
});

function extractErrorMessage(error: unknown): string | null {
  if (!axios.isAxiosError(error)) return null;
  return (
    (error.response?.data as { error?: { message?: string } })?.error
      ?.message ?? null
  );
}

export default function AdminSubjects({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const { data: subjects, isLoading, isError } = useSubjects();
  const createSubject = useCreateSubject();
  const updateSubject = useUpdateSubject();
  const setStatus = useSetSubjectStatus();
  const deleteSubject = useDeleteSubject();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Subject | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SubjectFormValues>({ resolver: zodResolver(subjectFormSchema) });

  const onSubmit = (values: SubjectFormValues) =>
    createSubject.mutate(values, {
      onSuccess: () => {
        reset();
        setBanner({ type: "success", message: "Subject added." });
      },
    });

  const serverError = createSubject.isError
    ? extractErrorMessage(createSubject.error)
    : null;

  const startEdit = (s: Subject) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError(null);
  };

  const saveEdit = (id: string) => {
    const result = subjectNameSchema.safeParse({ name: editName });
    if (!result.success) {
      setEditError(result.error.issues[0]?.message ?? "Invalid value.");
      return;
    }
    updateSubject.mutate(
      { id, data: result.data },
      {
        onSuccess: () => {
          setEditingId(null);
          setBanner({ type: "success", message: "Subject updated." });
        },
        onError: (err) =>
          setEditError(extractErrorMessage(err) ?? "Could not update subject."),
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
          setBanner({ type: "success", message: `${target.code} archived.` }),
        onError: (err) =>
          setBanner({
            type: "error",
            message: extractErrorMessage(err) ?? "Could not archive subject.",
          }),
      },
    );
  };

  const restore = (s: Subject) => {
    setStatus.mutate(
      { id: s.id, isActive: true },
      {
        onSuccess: () =>
          setBanner({ type: "success", message: `${s.code} restored.` }),
        onError: (err) =>
          setBanner({
            type: "error",
            message: extractErrorMessage(err) ?? "Could not restore subject.",
          }),
      },
    );
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    deleteSubject.mutate(target.id, {
      onSuccess: () =>
        setBanner({ type: "success", message: `${target.code} deleted.` }),
      onError: (err) =>
        setBanner({
          type: "error",
          message: extractErrorMessage(err) ?? "Could not delete subject.",
        }),
    });
  };

  return (
    <AdminPageShell embedded={embedded}>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Subjects</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Subjects are standalone (e.g. CSC510) and get linked to programmes
        separately.
      </p>

      {banner && (
        <StatusBanner
          type={banner.type}
          message={banner.message}
          onDismiss={() => setBanner(null)}
        />
      )}

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
            htmlFor="code"
            className="block text-sm font-medium text-slate-700"
          >
            Code
          </label>
          <input
            id="code"
            placeholder="CSC510"
            className="mt-1 w-32 rounded-lg border border-slate-300 px-3 py-2 uppercase focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-invalid={Boolean(errors.code)}
            {...register("code")}
          />
          {errors.code && (
            <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>
          )}
        </div>
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-slate-700"
          >
            Name
          </label>
          <input
            id="name"
            className="mt-1 w-64 rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-invalid={Boolean(errors.name)}
            {...register("name")}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={isSubmitting || createSubject.isPending}
          className="rounded-full bg-primary-600 px-5 py-2.5 font-medium text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {createSubject.isPending ? "Adding…" : "Add subject"}
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        {isLoading ? (
          <p className="p-4 text-sm text-slate-500">Loading…</p>
        ) : isError ? (
          <p className="p-4 text-sm text-red-600">Could not load subjects.</p>
        ) : subjects && subjects.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((s) => {
                const isEditing = editingId === s.id;
                return (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="px-4 py-2 font-medium text-slate-800">
                      {s.code}
                    </td>
                    {isEditing ? (
                      <>
                        <td className="px-4 py-2">
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-56 rounded-lg border border-slate-300 px-2 py-1 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            aria-label="Subject name"
                          />
                          {editError && (
                            <p className="mt-1 text-xs text-red-600">
                              {editError}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                            {s.isActive ? "Active" : "Archived"}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex justify-end gap-2">
                            <RowAction
                              title="Save"
                              onClick={() => saveEdit(s.id)}
                              disabled={updateSubject.isPending}
                              className="border-emerald-100 text-emerald-600 hover:bg-emerald-50"
                            >
                              <Check />
                            </RowAction>
                            <RowAction
                              title="Cancel"
                              onClick={cancelEdit}
                              className="border-stone-200 text-stone-500 hover:bg-stone-50"
                            >
                              <X />
                            </RowAction>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-2 text-slate-600">{s.name}</td>
                        <td className="px-4 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              s.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {s.isActive ? "Active" : "Archived"}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex justify-end gap-2">
                            <RowAction
                              title="Edit subject"
                              onClick={() => startEdit(s)}
                              className="border-indigo-100 text-indigo-600 hover:bg-indigo-50"
                            >
                              <Pencil />
                            </RowAction>
                            {s.isActive ? (
                              <RowAction
                                title="Archive subject"
                                onClick={() => setArchiveTarget(s)}
                                disabled={setStatus.isPending}
                                className="border-amber-100 text-amber-600 hover:bg-amber-50"
                              >
                                <Archive />
                              </RowAction>
                            ) : (
                              <RowAction
                                title="Restore subject"
                                onClick={() => restore(s)}
                                disabled={setStatus.isPending}
                                className="border-emerald-100 text-emerald-600 hover:bg-emerald-50"
                              >
                                <RotateCcw />
                              </RowAction>
                            )}
                            <RowAction
                              title="Delete subject"
                              onClick={() => setDeleteTarget(s)}
                              disabled={deleteSubject.isPending}
                              className="border-red-100 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 />
                            </RowAction>
                          </div>
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
            No subjects yet — add one above.
          </p>
        )}
      </div>

      <ConfirmDialog
        isOpen={archiveTarget !== null}
        title="Archive subject?"
        message={`"${archiveTarget?.code} · ${archiveTarget?.name}" will be hidden from new programme links. Existing links and resources are unaffected, and you can restore it any time.`}
        confirmLabel="Archive"
        destructive
        isConfirming={setStatus.isPending}
        onConfirm={confirmArchive}
        onCancel={() => setArchiveTarget(null)}
      />
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete subject?"
        message={`"${deleteTarget?.code} · ${deleteTarget?.name}" will be permanently deleted. This cannot be undone, and only works if it isn't linked to any programme or resource.`}
        confirmLabel="Delete"
        destructive
        isConfirming={deleteSubject.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminPageShell>
  );
}
