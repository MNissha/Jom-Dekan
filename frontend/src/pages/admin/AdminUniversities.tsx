import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { Pencil } from "lucide-react";
import { AdminPageShell } from "../../layouts/AdminPageShell";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { StatusBanner } from "../../components/common/StatusBanner";
import {
  universityFormSchema,
  type UniversityFormValues,
} from "../../schemas/taxonomySchemas";
import {
  useUniversities,
  useCreateUniversity,
  useUpdateUniversity,
  useSetUniversityStatus,
} from "../../hooks/useTaxonomy";
import type { University } from "../../types/taxonomy";

function extractErrorMessage(error: unknown): string | null {
  if (!axios.isAxiosError(error)) return null;
  return (
    (error.response?.data as { error?: { message?: string } })?.error
      ?.message ?? null
  );
}

export default function AdminUniversities({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const { data: universities, isLoading, isError } = useUniversities();
  const createUniversity = useCreateUniversity();
  const updateUniversity = useUpdateUniversity();
  const setStatus = useSetUniversityStatus();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ name: "", country: "" });
  const [editError, setEditError] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<University | null>(null);
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UniversityFormValues>({
    resolver: zodResolver(universityFormSchema),
  });

  const onSubmit = (values: UniversityFormValues) =>
    createUniversity.mutate(values, {
      onSuccess: () => {
        reset();
        setBanner({ type: "success", message: "University added." });
      },
    });

  const serverError = createUniversity.isError
    ? extractErrorMessage(createUniversity.error)
    : null;

  const startEdit = (u: University) => {
    setEditingId(u.id);
    setEditValues({ name: u.name, country: u.country });
    setEditError(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditError(null);
  };

  const saveEdit = (id: string) => {
    const result = universityFormSchema.safeParse(editValues);
    if (!result.success) {
      setEditError(result.error.issues[0]?.message ?? "Invalid values.");
      return;
    }
    updateUniversity.mutate(
      { id, data: result.data },
      {
        onSuccess: () => {
          setEditingId(null);
          setBanner({ type: "success", message: "University updated." });
        },
        onError: (err) =>
          setEditError(
            extractErrorMessage(err) ?? "Could not update university.",
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
            message: extractErrorMessage(err) ?? "Could not archive university.",
          }),
      },
    );
  };

  const restore = (u: University) => {
    setStatus.mutate(
      { id: u.id, isActive: true },
      {
        onSuccess: () =>
          setBanner({ type: "success", message: `${u.name} restored.` }),
        onError: (err) =>
          setBanner({
            type: "error",
            message: extractErrorMessage(err) ?? "Could not restore university.",
          }),
      },
    );
  };

  return (
    <AdminPageShell embedded={embedded}>
      <h1 className="text-2xl font-bold text-slate-900">Universities</h1>
      <p className="mt-1 text-sm text-slate-500">
        Only admins can create, edit, or archive universities here. "Archive"
        hides a university from new picks without deleting it, so existing
        profiles/resources that reference it stay intact.
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
        <div>
          <label
            htmlFor="country"
            className="block text-sm font-medium text-slate-700"
          >
            Country
          </label>
          <input
            id="country"
            defaultValue="Malaysia"
            className="mt-1 w-40 rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            {...register("country")}
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting || createUniversity.isPending}
          className="rounded-full bg-primary-600 px-5 py-2.5 font-medium text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {createUniversity.isPending ? "Adding…" : "Add university"}
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white">
        {isLoading ? (
          <p className="p-4 text-sm text-slate-500">Loading…</p>
        ) : isError ? (
          <p className="p-4 text-sm text-red-600">
            Could not load universities.
          </p>
        ) : universities && universities.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Country</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {universities.map((u) => {
                const isEditing = editingId === u.id;
                return (
                  <tr key={u.id} className="border-t border-slate-100">
                    {isEditing ? (
                      <>
                        <td className="px-4 py-2" colSpan={2}>
                          <div className="flex flex-wrap gap-2">
                            <input
                              value={editValues.name}
                              onChange={(e) =>
                                setEditValues((v) => ({
                                  ...v,
                                  name: e.target.value,
                                }))
                              }
                              className="w-48 rounded-lg border border-slate-300 px-2 py-1 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                              aria-label="University name"
                            />
                            <input
                              value={editValues.country}
                              onChange={(e) =>
                                setEditValues((v) => ({
                                  ...v,
                                  country: e.target.value,
                                }))
                              }
                              className="w-32 rounded-lg border border-slate-300 px-2 py-1 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                              aria-label="Country"
                            />
                          </div>
                          {editError && (
                            <p className="mt-1 text-xs text-red-600">
                              {editError}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                            {u.isActive ? "Active" : "Archived"}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => saveEdit(u.id)}
                            disabled={updateUniversity.isPending}
                            className="mr-3 text-sm font-medium text-primary-700 hover:underline disabled:opacity-60"
                          >
                            {updateUniversity.isPending ? "Saving…" : "Save"}
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
                          {u.name}
                        </td>
                        <td className="px-4 py-2 text-slate-600">
                          {u.country}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              u.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {u.isActive ? "Active" : "Archived"}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            type="button"
                            onClick={() => startEdit(u)}
                            className="mr-3 inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:underline"
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              u.isActive ? setArchiveTarget(u) : restore(u)
                            }
                            disabled={setStatus.isPending}
                            className="text-sm font-medium text-primary-700 hover:underline disabled:opacity-60"
                          >
                            {u.isActive ? "Archive" : "Restore"}
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
            No universities yet — add one above.
          </p>
        )}
      </div>

      <ConfirmDialog
        isOpen={archiveTarget !== null}
        title="Archive university?"
        message={`"${archiveTarget?.name}" will be hidden from new picks (registration, faculty creation). Existing profiles and resources that reference it are unaffected, and you can restore it any time.`}
        confirmLabel="Archive"
        destructive
        isConfirming={setStatus.isPending}
        onConfirm={confirmArchive}
        onCancel={() => setArchiveTarget(null)}
      />
    </AdminPageShell>
  );
}
