import { useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { Check, GraduationCap, ListChecks, ShieldOff, Trash2, X } from "lucide-react";
import { AdminPageShell } from "../../layouts/AdminPageShell";
import { AdminOpportunities } from "./AdminOpportunities";
import {
  useAdminDecideTutorApplication,
  useAdminDeleteTutorApplication,
  useAdminRevokeTutorTag,
  useAdminTutorApplication,
  useAdminTutorApplications,
  useTutorProfile,
} from "../../hooks/useTutor";
import { useSubjects } from "../../hooks/useTaxonomy";
import type { TutorApplicationStatus } from "../../types/tutor";

type Section = "applications" | "listings";

const TABS: { value: TutorApplicationStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

function ApplicationDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: application, isLoading } = useAdminTutorApplication(id);
  const { data: subjects } = useSubjects();
  const { data: tutorProfile } = useTutorProfile(application?.status === "approved" ? application.userId : undefined);
  const deleteApplication = useAdminDeleteTutorApplication();
  const revokeTag = useAdminRevokeTutorTag();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingRevoke, setConfirmingRevoke] = useState(false);

  const subjectNames = (application?.subjects ?? []).map(
    (subjectId) => subjects?.find((s) => s.id === subjectId)?.name ?? subjectId,
  );
  const hasActiveTag = Boolean(tutorProfile);

  function handleDelete() {
    deleteApplication.mutate(id, { onSuccess: onClose });
  }

  function handleRevoke() {
    if (!application) return;
    revokeTag.mutate(application.userId, { onSuccess: () => setConfirmingRevoke(false) });
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tutor application detail"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-8"
      onClick={onClose}
    >
      <div className="w-full max-w-[560px] overflow-hidden rounded-[24px] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div
          className="flex items-start justify-between gap-4 p-[22px] text-white"
          style={{ background: "radial-gradient(120% 160% at 88% 8%, #4A3FD1 0%, #2E2372 55%, #231C57 100%)" }}
        >
          <div className="min-w-0">
            <span className="inline-block rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white">
              {application?.status.toUpperCase() ?? "APPLICATION"}
            </span>
            <h2 className="mt-2 text-xl font-extrabold">{application?.applicantName ?? "Tutor application"}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white hover:bg-white/20"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {isLoading || !application ? (
          <p className="p-[22px] text-sm text-slate-500">Loading…</p>
        ) : (
          <div className="flex flex-col gap-4 p-[22px]">
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Email</span>
                <p className="text-slate-700">{application.applicantEmail}</p>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Phone</span>
                <p className="text-slate-700">{application.applicantPhone ?? "Not provided"}</p>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Hourly rate</span>
                <p className="text-slate-700">{application.hourlyRate !== null ? `RM ${application.hourlyRate.toFixed(2)}` : "Not set"}</p>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Applied</span>
                <p className="text-slate-700">{new Date(application.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Subjects</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {subjectNames.map((name) => (
                  <span key={name} className="rounded-full bg-[#F1F0FA] px-2.5 py-1 text-xs font-bold text-primary-700">
                    {name}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Bio</span>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{application.bio}</p>
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Experience</span>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">{application.experience}</p>
            </div>

            {application.rejectionReason && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <span className="font-semibold">Rejection reason: </span>
                {application.rejectionReason}
              </div>
            )}

            {hasActiveTag && (
              <div className="border-t border-[#F1F0FA] pt-4">
                {confirmingRevoke ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-slate-600">
                      Revoke this user&apos;s verified tutor tag? Their application record is kept.
                    </span>
                    <button
                      type="button"
                      onClick={handleRevoke}
                      disabled={revokeTag.isPending}
                      className="inline-flex h-9 items-center rounded-lg bg-amber-600 px-3 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-60"
                    >
                      {revokeTag.isPending ? "Revoking…" : "Confirm revoke"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingRevoke(false)}
                      className="inline-flex h-9 items-center rounded-lg border border-[#E4E3F2] px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingRevoke(true)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-amber-200 px-3 text-sm font-bold text-amber-700 hover:bg-amber-50"
                  >
                    <ShieldOff className="h-4 w-4" aria-hidden="true" />
                    Revoke tutor tag
                  </button>
                )}
              </div>
            )}

            <div className="border-t border-[#F1F0FA] pt-4">
              {confirmingDelete ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-slate-600">
                    Permanently delete this application?
                    {hasActiveTag && " This user's verified tutor tag was granted from this application and will be revoked too."}
                  </span>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleteApplication.isPending}
                    className="inline-flex h-9 items-center rounded-lg bg-red-600 px-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    {deleteApplication.isPending ? "Deleting…" : "Confirm delete"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    className="inline-flex h-9 items-center rounded-lg border border-[#E4E3F2] px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-red-200 px-3 text-sm font-bold text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Delete application
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function SectionTabs({ section, onChange }: { section: Section; onChange: (section: Section) => void }) {
  return (
    <div className="flex gap-2 border-b border-[#ECEBF7] pb-3">
      {(
        [
          { value: "applications", label: "Applications", icon: GraduationCap },
          { value: "listings", label: "Listings", icon: ListChecks },
        ] as const
      ).map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={`flex items-center gap-1.5 rounded-t-lg border-b-2 px-3 py-2 text-sm font-bold transition ${
            section === tab.value
              ? "border-primary-600 text-primary-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <tab.icon className="h-4 w-4" aria-hidden="true" />
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function AdminTutorApplications({ embedded = false }: { embedded?: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = searchParams.get("section");
  const section: Section = requestedSection === "listings" ? "listings" : "applications";

  const [status, setStatus] = useState<TutorApplicationStatus>("pending");
  const { data: applications, isLoading } = useAdminTutorApplications(status);
  const decide = useAdminDecideTutorApplication();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);

  function handleApprove(id: string) {
    decide.mutate({ id, action: "approve" });
  }

  function startReject(id: string) {
    setRejectingId(id);
    setReason("");
  }

  function confirmReject(id: string) {
    if (!reason.trim()) return;
    decide.mutate(
      { id, action: "reject", reason: reason.trim() },
      { onSuccess: () => setRejectingId(null) },
    );
  }

  if (section === "listings") {
    return (
      <AdminPageShell embedded={embedded}>
        <div className="mx-auto max-w-6xl px-[18px] pt-[22px]">
          <SectionTabs section={section} onChange={(next) => setSearchParams(next === "applications" ? {} : { section: next })} />
        </div>
        <AdminOpportunities embedded category="tutoring" />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell embedded={embedded}>
      <div className="mx-auto max-w-6xl px-[18px] py-[22px]">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-slate-900">
          <GraduationCap className="h-6 w-6 text-primary-600" aria-hidden="true" />
          Tutoring
        </h1>
        <p className="mt-1 text-sm text-slate-500">Review applications to become a verified tutor, and manage live tutoring listings.</p>

        <SectionTabs section={section} onChange={(next) => setSearchParams(next === "applications" ? {} : { section: next })} />

        <div className="mt-5 flex gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatus(tab.value)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition ${
                status === tab.value ? "bg-primary-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : (applications ?? []).length === 0 ? (
            <p className="text-sm text-slate-500">No {status} applications.</p>
          ) : (
            <ul className="space-y-4">
              {(applications ?? []).map((application) => (
                <li key={application.id} className="rounded-[22px] border border-[#ECEBF7] bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <button
                        type="button"
                        onClick={() => setDetailId(application.id)}
                        className="font-semibold text-slate-800 hover:text-primary-700 hover:underline"
                      >
                        {application.applicantName ?? "Unnamed applicant"}
                      </button>
                      <p className="text-sm text-slate-500">{application.applicantEmail}</p>
                    </div>
                    {application.hourlyRate !== null && (
                      <span className="rounded-full bg-[#EFEEFB] px-3 py-1 text-sm font-bold text-[#4338CA]">
                        RM {application.hourlyRate.toFixed(2)} / hour
                      </span>
                    )}
                  </div>

                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{application.bio}</p>
                  {application.rejectionReason && (
                    <p className="mt-2 text-sm text-red-600">Rejected — {application.rejectionReason}</p>
                  )}

                  {status === "pending" && (
                    <div className="mt-4 border-t border-[#F1F0FA] pt-4">
                      {rejectingId === application.id ? (
                        <div className="flex flex-col gap-2">
                          <textarea
                            rows={2}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Reason for rejection (shown to the applicant)"
                            className="rounded-xl border border-[#E4E3F2] p-2.5 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => confirmReject(application.id)}
                              disabled={!reason.trim() || decide.isPending}
                              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-red-600 px-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60"
                            >
                              Confirm rejection
                            </button>
                            <button
                              type="button"
                              onClick={() => setRejectingId(null)}
                              className="inline-flex h-9 items-center rounded-lg border border-[#E4E3F2] px-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleApprove(application.id)}
                            disabled={decide.isPending}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                          >
                            <Check className="h-4 w-4" aria-hidden="true" />
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => startReject(application.id)}
                            disabled={decide.isPending}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E4E3F2] px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                          >
                            <X className="h-4 w-4" aria-hidden="true" />
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {detailId && <ApplicationDetailModal id={detailId} onClose={() => setDetailId(null)} />}
    </AdminPageShell>
  );
}

export default AdminTutorApplications;
