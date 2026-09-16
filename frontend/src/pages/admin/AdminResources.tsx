import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import axios from "axios";
import {
  Archive,
  BookOpen,
  Eye,
  FilePlus2,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useDebounce } from "../../hooks/useDebounce";
import {
  useAdminResources,
  useDeleteResource,
  useSetResourceStatus,
  useUpdateResource,
  useUploadResource,
} from "../../hooks/useResources";
import { useToast } from "../../context/ToastContext";
import {
  RESOURCE_CATEGORIES,
  RESOURCE_CATEGORY_LABELS,
  type ResourceCategory,
  type ResourceListItem,
  type ResourceStatus,
} from "../../types/resource";
import { Alert, StatusIndicator, TableContainer } from "../../components/common/cards";
import { Button, PageContainer, PageHeader } from "../../components/common/ui";

const PAGE_SIZE = 15;
const statusTone: Record<ResourceStatus, "success" | "warning" | "danger" | "neutral"> = {
  READY: "success",
  PENDING: "warning",
  FAILED: "danger",
  ARCHIVED: "neutral",
};

function messageFrom(error: unknown) {
  if (axios.isAxiosError(error)) {
    return (error.response?.data as { error?: { message?: string } })?.error?.message ?? "The request could not be completed.";
  }
  return "The request could not be completed.";
}

function ResourceForm({ resource, onClose }: { resource?: ResourceListItem; onClose: () => void }) {
  const toast = useToast();
  const createResource = useUploadResource();
  const updateResource = useUpdateResource();
  const [title, setTitle] = useState(resource?.title ?? "");
  const [description, setDescription] = useState(resource?.description ?? "");
  const [category, setCategory] = useState<ResourceCategory>(resource?.category ?? "NOTES");
  const [error, setError] = useState("");
  const pending = createResource.isPending || updateResource.isPending;
  const valid = title.trim().length >= 2 && description.trim().length >= 20;

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => event.key === "Escape" && !pending && onClose();
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, pending]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!valid || pending) return;
    setError("");
    try {
      if (resource) {
        await updateResource.mutateAsync({
          id: resource.id,
          data: { title: title.trim(), description: description.trim(), category },
        });
        toast.success("Resource updated successfully.");
      } else {
        await createResource.mutateAsync({
          title: title.trim(),
          description: description.trim(),
          category,
        });
        toast.success("Resource created successfully.");
      }
      onClose();
    } catch (requestError) {
      setError(messageFrom(requestError));
    }
  };

  return createPortal(
    <div className="overlay-root" role="dialog" aria-modal="true" aria-labelledby="resource-form-title">
      <div className="dialog-surface max-w-xl overflow-hidden">
        <div className="dialog-header flex items-start justify-between gap-4 bg-gradient-to-br from-[#31256f] to-[#5143a6] p-6 text-white">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Resource library</span>
            <h2 id="resource-form-title" className="mt-1 text-xl font-extrabold">
              {resource ? "Edit resource" : "Create resource"}
            </h2>
            <p className="mt-1 text-sm text-white/70">{resource ? "Update the academic material details." : "Publish a text-based academic resource."}</p>
          </div>
          <button type="button" onClick={onClose} disabled={pending} aria-label="Close" className="rounded-xl p-2 text-white/80 transition hover:rotate-6 hover:bg-white/15 hover:text-white disabled:opacity-50">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="dialog-body space-y-4 p-6">
          {error && <Alert tone="danger">{error}</Alert>}
          <label className="block text-sm font-semibold text-content-secondary">
            Title
            <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} required className="mt-1.5 w-full rounded-xl border border-border bg-surface-card px-3.5 py-2.5 text-content-primary outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" />
          </label>
          <label className="block text-sm font-semibold text-content-secondary">
            Category
            <select value={category} onChange={(event) => setCategory(event.target.value as ResourceCategory)} className="mt-1.5 w-full rounded-xl border border-border bg-surface-card px-3.5 py-2.5 text-content-primary outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20">
              {RESOURCE_CATEGORIES.map((value) => <option key={value} value={value}>{RESOURCE_CATEGORY_LABELS[value]}</option>)}
            </select>
          </label>
          <label className="block text-sm font-semibold text-content-secondary">
            Content / description
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} minLength={20} maxLength={2000} rows={7} required className="mt-1.5 w-full resize-y rounded-xl border border-border bg-surface-card px-3.5 py-2.5 text-content-primary outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" />
            <span className="mt-1 flex justify-between text-xs font-normal text-content-muted"><span>Minimum 20 characters</span><span>{description.length}/2000</span></span>
          </label>
          <div className="flex justify-end gap-3 border-t border-border-subtle pt-4">
            <Button type="button" variant="secondary" onClick={onClose} disabled={pending}>Cancel</Button>
            <Button type="submit" loading={pending} disabled={!valid}>{resource ? "Save changes" : "Create resource"}</Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

function DeleteDialog({ resource, onClose }: { resource: ResourceListItem; onClose: () => void }) {
  const remove = useDeleteResource();
  const toast = useToast();
  const [error, setError] = useState("");
  const confirm = async () => {
    setError("");
    try {
      await remove.mutateAsync(resource.id);
      toast.success("Resource permanently deleted.");
      onClose();
    } catch (requestError) {
      setError(messageFrom(requestError));
    }
  };
  return createPortal(
    <div className="overlay-root" role="alertdialog" aria-modal="true" aria-labelledby="delete-resource-title">
      <div className="dialog-surface max-w-md p-6">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600"><Trash2 className="h-6 w-6" /></div>
        <h2 id="delete-resource-title" className="mt-4 text-center text-xl font-bold text-content-primary">Delete this resource?</h2>
        <p className="mt-2 text-center text-sm text-content-muted"><strong className="text-content-primary">{resource.title}</strong> and its uploaded files will be permanently removed. This cannot be undone.</p>
        {error && <Alert tone="danger" className="mt-4">{error}</Alert>}
        <div className="mt-6 flex justify-center gap-3">
          <Button variant="secondary" onClick={onClose} disabled={remove.isPending}>Cancel</Button>
          <Button variant="danger" onClick={confirm} loading={remove.isPending}>Delete permanently</Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function AdminResources() {
  const toast = useToast();
  const [searchInput, setSearchInput] = useState("");
  const search = useDebounce(searchInput, 400);
  const [status, setStatus] = useState<ResourceStatus | "">("");
  const [category, setCategory] = useState<ResourceCategory | "">("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<ResourceListItem | "new" | null>(null);
  const [deleting, setDeleting] = useState<ResourceListItem | null>(null);
  const statusMutation = useSetResourceStatus();
  const query = useAdminResources({ q: search || undefined, status: status || undefined, category: category || undefined, page, pageSize: PAGE_SIZE, sortBy: "newest" });
  const resources = query.data?.data ?? [];
  const total = query.data?.meta.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const changeStatus = async (resource: ResourceListItem) => {
    try {
      const action = resource.status === "ARCHIVED" ? "RESTORE" : "ARCHIVE";
      await statusMutation.mutateAsync({ id: resource.id, action });
      toast.success(action === "ARCHIVE" ? "Resource archived." : "Resource restored.");
    } catch (error) {
      toast.error(messageFrom(error));
    }
  };

  return (
    <PageContainer size="dashboard">
      <PageHeader eyebrow="Content management" title="Resources" description="Create, review, update, archive, restore, and remove academic resources." actions={
        <Button onClick={() => setEditing("new")}><FilePlus2 className="h-4 w-4" />Create resource</Button>
      } />

      <div className="mb-5 grid gap-3 rounded-card border border-border bg-surface-card p-4 shadow-sm md:grid-cols-[1fr_190px_190px]">
        <label className="relative">
          <span className="sr-only">Search resources</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-content-muted" />
          <input value={searchInput} onChange={(event) => { setSearchInput(event.target.value); setPage(1); }} placeholder="Search title, content, or subject…" className="h-11 w-full rounded-xl border border-border bg-surface-card pl-10 pr-3 text-sm text-content-primary outline-none transition hover:border-primary-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20" />
        </label>
        <select aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value as ResourceStatus | ""); setPage(1); }} className="h-11 rounded-xl border border-border bg-surface-card px-3 text-sm text-content-primary outline-none transition hover:border-primary-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20">
          <option value="">All statuses</option>{(["READY", "PENDING", "ARCHIVED", "FAILED"] as ResourceStatus[]).map((value) => <option key={value} value={value}>{value[0] + value.slice(1).toLowerCase()}</option>)}
        </select>
        <select aria-label="Filter by category" value={category} onChange={(event) => { setCategory(event.target.value as ResourceCategory | ""); setPage(1); }} className="h-11 rounded-xl border border-border bg-surface-card px-3 text-sm text-content-primary outline-none transition hover:border-primary-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20">
          <option value="">All categories</option>{RESOURCE_CATEGORIES.map((value) => <option key={value} value={value}>{RESOURCE_CATEGORY_LABELS[value]}</option>)}
        </select>
      </div>

      {query.isError && <Alert tone="danger" className="mb-4">Could not load resources. <button className="font-bold underline" onClick={() => query.refetch()}>Try again</button></Alert>}
      <TableContainer>
        <table className="min-w-[900px] w-full text-left text-sm">
          <thead className="bg-surface-muted text-xs uppercase tracking-wide text-content-muted"><tr><th className="px-5 py-3.5">Resource</th><th className="px-4 py-3.5">Category</th><th className="px-4 py-3.5">Owner</th><th className="px-4 py-3.5">Status</th><th className="px-4 py-3.5">Created</th><th className="px-5 py-3.5 text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-border-subtle">
            {query.isLoading ? Array.from({ length: 5 }).map((_, index) => <tr key={index}><td colSpan={6} className="px-5 py-4"><div className="h-8 animate-pulse rounded-lg bg-surface-muted motion-reduce:animate-none" /></td></tr>) : resources.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-16 text-center"><BookOpen className="mx-auto h-9 w-9 text-content-muted" /><p className="mt-3 font-semibold text-content-primary">No resources found</p><p className="mt-1 text-content-muted">Try changing the filters or create a new resource.</p></td></tr>
            ) : resources.map((resource) => (
              <tr key={resource.id} className="group transition-colors hover:bg-primary-50/40 dark:hover:bg-primary-950/20">
                <td className="max-w-sm px-5 py-4"><p className="truncate font-semibold text-content-primary">{resource.title}</p><p className="mt-1 truncate text-xs text-content-muted">{resource.description || "No description"}</p></td>
                <td className="px-4 py-4 text-content-secondary">{RESOURCE_CATEGORY_LABELS[resource.category]}</td>
                <td className="px-4 py-4 text-content-secondary">{resource.ownerName || "Unknown"}</td>
                <td className="px-4 py-4"><StatusIndicator tone={statusTone[resource.status]}>{resource.status[0] + resource.status.slice(1).toLowerCase()}</StatusIndicator></td>
                <td className="whitespace-nowrap px-4 py-4 text-content-muted">{new Date(resource.createdAt).toLocaleDateString()}</td>
                <td className="px-5 py-4"><div className="flex justify-end gap-1">
                  <Link to={`/resources/${resource.id}`} aria-label={`View ${resource.title}`} title="View" className="rounded-lg p-2 text-content-muted transition hover:-translate-y-0.5 hover:bg-blue-50 hover:text-blue-700"><Eye className="h-4 w-4" /></Link>
                  <button onClick={() => setEditing(resource)} aria-label={`Edit ${resource.title}`} title="Edit" className="rounded-lg p-2 text-content-muted transition hover:-translate-y-0.5 hover:bg-primary-50 hover:text-primary-700"><Pencil className="h-4 w-4" /></button>
                  {(resource.status === "READY" || resource.status === "ARCHIVED") && <button onClick={() => changeStatus(resource)} disabled={statusMutation.isPending} aria-label={`${resource.status === "ARCHIVED" ? "Restore" : "Archive"} ${resource.title}`} title={resource.status === "ARCHIVED" ? "Restore" : "Archive"} className="rounded-lg p-2 text-content-muted transition hover:-translate-y-0.5 hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50">{resource.status === "ARCHIVED" ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}</button>}
                  <button onClick={() => setDeleting(resource)} aria-label={`Delete ${resource.title}`} title="Delete" className="rounded-lg p-2 text-content-muted transition hover:-translate-y-0.5 hover:bg-red-50 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableContainer>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-content-muted"><span>{total.toLocaleString()} resource{total === 1 ? "" : "s"}</span><div className="flex items-center gap-2"><Button size="small" variant="secondary" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1}>Previous</Button><span className="px-2">Page {page} of {totalPages}</span><Button size="small" variant="secondary" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages}>Next</Button></div></div>

      {editing && <ResourceForm resource={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
      {deleting && <DeleteDialog resource={deleting} onClose={() => setDeleting(null)} />}
    </PageContainer>
  );
}
