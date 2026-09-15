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
  useUniversities,
  useFaculties,
  useCreateFaculty,
  useUpdateFaculty,
  useSetFacultyStatus,
  useDeleteFaculty,
} from "../../hooks/useTaxonomy";
import type { Faculty } from "../../types/taxonomy";

// Only "name" is collected here — universityId comes from the picker
// below, not from this form, so the schema stays deliberately small.
const facultyNameSchema = z.object({
  name: z.string().trim().min(2, "Enter at least 2 characters.").max(200),
});
type FacultyNameValues = z.infer<typeof facultyNameSchema>;

function extractErrorMessage(error: unknown): string | null {
  if (!axios.isAxiosError(error)) return null;
  return (
    (error.response?.data as { error?: { message?: string } })?.error
      ?.message ?? null
  );
}

export default function AdminFaculties({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const { data: universities } = useUniversities();
  const [universityId, setUniversityId] = useState("");

  const {
    data: faculties,
    isLoading,
    isError,
  } = useFaculties(universityId || undefined);
  const createFaculty = useCreateFaculty();
  const updateFaculty = useUpdateFaculty();
  const setStatus = useSetFacultyStatus();
  const deleteFaculty = useDeleteFaculty();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Faculty | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Faculty | null>(null);
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FacultyNameValues>({ resolver: zodResolver(facultyNameSchema) });

  const onSubmit = (values: FacultyNameValues) => {
    if (!universityId) return;
    createFaculty.mutate(
      { universityId, name: values.name },
      {
        onSuccess: () => {
          reset();
          setBanner({ type: "success", message: "Faculty added." });
        },
      },
    );
  };

  const serverError = createFaculty.isError
    ? extractErrorMessage(createFaculty.error)
    : null;

  const startEdit = (f: Faculty) => {
    setEditingId(f.id);
    setEditName(f.name);
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError(null);
  };

  const saveEdit = (id: string) => {
    const result = facultyNameSchema.safeParse({ name: editName });
    if (!result.success) {
      setEditError(result.error.issues[0]?.message ?? "Invalid value.");
      return;
    }
    updateFaculty.mutate(
      { id, data: result.data },
      {
        onSuccess: () => {
          setEditingId(null);
          setBanner({ type: "success", message: "Faculty updated." });
        },
        onError: (err) =>
          setEditError(extractErrorMessage(err) ?? "Could not update faculty."),
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
            message: extractErrorMessage(err) ?? "Could not archive faculty.",
          }),
      },
    );
  };

  const restore = (f: Faculty) => {
    setStatus.mutate(
      { id: f.id, isActive: true },
      {
        onSuccess: () =>
          setBanner({ type: "success", message: `${f.name} restored.` }),
        onError: (err) =>
          setBanner({
            type: "error",
            message: extractErrorMessage(err) ?? "Could not restore faculty.",
          }),
      },
    );
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    deleteFaculty.mutate(target.id, {
      onSuccess: () =>
        setBanner({ type: "success", message: `${target.name} deleted.` }),
      onError: (err) =>
        setBanner({
          type: "error",
          message: extractErrorMessage(err) ?? "Could not delete faculty.",
        }),
    });
  };

  return (
    <AdminPageShell embedded={embedded}>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Faculties</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Pick a university to manage its faculties. Only admins can create, edit,
        or archive.
      </p>

      {banner && (
        <StatusBanner
          type={banner.type}
          message={banner.message}
          onDismiss={() => setBanner(null)}
        />
      )}

      <div className="mt-6">
        <label
          htmlFor="universityId"
          className="block text-sm font-medium text-slate-700"
        >
          University
        </label>
        <select
          id="universityId"
          value={universityId}
          onChange={(e) => setUniversityId(e.target.value)}
          className="mt-1 w-72 rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Select a university…</option>
          {universities?.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>

      {universityId && (
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
                Faculty name
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
            <button
              type="submit"
              disabled={isSubmitting || createFaculty.isPending}
              className="rounded-full bg-primary-600 px-5 py-2.5 font-medium text-white hover:bg-primary-700 disabled:opacity-60"
            >
              {createFaculty.isPending ? "Adding…" : "Add faculty"}
            </button>
          </form>

          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
            {isLoading ? (
              <p className="p-4 text-sm text-slate-500">Loading…</p>
            ) : isError ? (
              <p className="p-4 text-sm text-red-600">
                Could not load faculties.
              </p>
            ) : faculties && faculties.length > 0 ? (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {faculties.map((f) => {
                    const isEditing = editingId === f.id;
                    return (
                      <tr key={f.id} className="border-t border-slate-100">
                        {isEditing ? (
                          <>
                            <td className="px-4 py-2">
                              <input
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                className="w-48 rounded-lg border border-slate-300 px-2 py-1 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                aria-label="Faculty name"
                              />
                              {editError && (
                                <p className="mt-1 text-xs text-red-600">
                                  {editError}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                                {f.isActive ? "Active" : "Archived"}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex justify-end gap-2">
                                <RowAction
                                  title="Save"
                                  onClick={() => saveEdit(f.id)}
                                  disabled={updateFaculty.isPending}
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
                            <td className="px-4 py-2 font-medium text-slate-800">
                              {f.name}
                            </td>
                            <td className="px-4 py-2">
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                  f.isActive
                                    ? "bg-green-100 text-green-700"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {f.isActive ? "Active" : "Archived"}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex justify-end gap-2">
                                <RowAction
                                  title="Edit faculty"
                                  onClick={() => startEdit(f)}
                                  className="border-indigo-100 text-indigo-600 hover:bg-indigo-50"
                                >
                                  <Pencil />
                                </RowAction>
                                {f.isActive ? (
                                  <RowAction
                                    title="Archive faculty"
                                    onClick={() => setArchiveTarget(f)}
                                    disabled={setStatus.isPending}
                                    className="border-amber-100 text-amber-600 hover:bg-amber-50"
                                  >
                                    <Archive />
                                  </RowAction>
                                ) : (
                                  <RowAction
                                    title="Restore faculty"
                                    onClick={() => restore(f)}
                                    disabled={setStatus.isPending}
                                    className="border-emerald-100 text-emerald-600 hover:bg-emerald-50"
                                  >
                                    <RotateCcw />
                                  </RowAction>
                                )}
                                <RowAction
                                  title="Delete faculty"
                                  onClick={() => setDeleteTarget(f)}
                                  disabled={deleteFaculty.isPending}
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
                No faculties yet for this university — add one above.
              </p>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        isOpen={archiveTarget !== null}
        title="Archive faculty?"
        message={`"${archiveTarget?.name}" will be hidden from new picks (programme creation). Existing profiles and resources that reference it are unaffected, and you can restore it any time.`}
        confirmLabel="Archive"
        destructive
        isConfirming={setStatus.isPending}
        onConfirm={confirmArchive}
        onCancel={() => setArchiveTarget(null)}
      />
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete faculty?"
        message={`"${deleteTarget?.name}" will be permanently deleted. This cannot be undone, and only works if it has no programmes.`}
        confirmLabel="Delete"
        destructive
        isConfirming={deleteFaculty.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </AdminPageShell>
  );
}
