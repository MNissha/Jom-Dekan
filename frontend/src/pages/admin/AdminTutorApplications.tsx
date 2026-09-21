import { useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, CheckCircle2, Clock3, GraduationCap, ListChecks, ShieldOff, Trash2, X, XCircle } from "lucide-react";
import { AdminPageShell } from "../../layouts/AdminPageShell";
import { AdminOpportunities } from "./AdminOpportunities";
import {
  useAdminDecideTutorApplication,
  useAdminDeleteTutorApplication,
  useAdminRevokeTutorTag,
  useAdminTutorApplication,
  useAdminTutorApplications,
  useApplicationResumeUrl,
  useTutorProfile,
} from "../../hooks/useTutor";
import { useSubjects } from "../../hooks/useTaxonomy";
import type { TutorApplicationStatus, TutorSessionMode } from "../../types/tutor";

type Section = "applications" | "listings";

const TABS: { value: TutorApplicationStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const MODE_LABEL: Record<TutorSessionMode, string> = {
  ONLINE: "Online",
  ON_CAMPUS: "On campus",
  HYBRID: "Hybrid",
};

function ApplicationDetailModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { data: application, isLoading } = useAdminTutorApplication(id);
  const { data: subjects } = useSubjects();
  const { data: tutorProfile } = useTutorProfile(application?.status === "approved" ? application.userId : undefined);
  const deleteApplication = useAdminDeleteTutorApplication();
  const revokeTag = useAdminRevokeTutorTag();
  const getResumeUrl = useApplicationResumeUrl();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [confirmingRevoke, setConfirmingRevoke] = useState(false);

  function downloadResume(applicationId: string) {
    getResumeUrl.mutate(applicationId, {
      onSuccess: ({ url }) => window.open(url, "_blank", "noopener,noreferrer"),
    });
  }

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
      className="overlay-root"
      onClick={onClose}
    >
      <div className="dialog-surface max-w-[560px]" onClick={(e) => e.stopPropagation()}>
        <div
          className="dialog-header flex items-start justify-between gap-4 p-[22px] text-white"
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
          <div className="dialog-body flex flex-col gap-4 p-[22px]">
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
              <div>
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Session mode</span>
                <p className="text-slate-700">{MODE_LABEL[application.mode]}</p>
              </div>
              {application.locationAddress && (
                <div>
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Location address</span>
                  <p className="text-slate-700">{application.locationAddress}</p>
                </div>
              )}
              {application.onlinePlatform && (
                <div>
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Online platform</span>
                  <p className="text-slate-700">{application.onlinePlatform}</p>
                </div>
              )}
              <div>
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Open to other universities</span>
                <p className="text-slate-700">{application.openToOtherUniversities ? "Yes" : "No"}</p>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Resume / CV</span>
                {application.resumeFilename ? (
                  <button
                    type="button"
                    onClick={() => downloadResume(application.id)}
                    disabled={getResumeUrl.isPending}
                    className="mt-0.5 block text-left text-primary-700 hover:underline disabled:opacity-60"
                  >
                    {getResumeUrl.isPending ? "Preparing…" : application.resumeFilename}
                  </button>
                ) : (
                  <p className="text-slate-500">Not provided</p>
                )}
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Portfolio</span>
                {application.portfolioUrl ? (
                  <a
                    href={application.portfolioUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 block break-all text-primary-700 hover:underline"
                  >
                    {application.portfolioUrl}
                  </a>
                ) : (
                  <p className="text-slate-500">Not provided</p>
                )}
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

        <div className="dialog-footer border-t border-[#F1F0FA] p-[22px] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#E4E3F2] px-4 text-sm font-bold text-slate-700 transition hover:-translate-x-0.5 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </button>
        </div>
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
          { value: "listings", label: "Listings", icon: ListChecks },
          { value: "applications", label: "Applications", icon: GraduationCap },
        ] as const
      ).map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          aria-pressed={section === tab.value}
          className={`nav-item flex min-h-control items-center gap-1.5 border-b-2 px-3 text-sm font-bold ${
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
        <div className="page-container page-container-standard pb-0">
          <SectionTabs section={section} onChange={(next) => setSearchParams(next === "applications" ? {} : { section: next })} />
        </div>
        <AdminOpportunities embedded category="tutoring" />
      </AdminPageShell>
    );
  }

  return (
    <AdminPageShell embedded={embedded}>
      <div className="page-container page-container-standard motion-safe:animate-panel-enter">
        <SectionTabs section={section} onChange={(next) => setSearchParams(next === "applications" ? {} : { section: next })} />

        <header className="relative mt-5 overflow-hidden rounded-[26px] bg-gradient-to-r from-[#332475] via-[#4338CA] to-[#6558DD] p-6 text-white shadow-lg">
          <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-amber-300/20 blur-2xl" />
          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-[#DDD8FF]">Marketplace administration</p>
            <h1 className="mt-grid-1 break-words text-2xl font-heading leading-tight sm:text-page-title">Tutor Applications</h1>
            <p className="mt-1 text-sm text-[#D5D0F7]">Review applicants and manage verified tutor access.</p>
          </div>
        </header>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatus(tab.value)}
              aria-pressed={status === tab.value}
              className={`flex items-center gap-3 rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                status === tab.value
                  ? "border-primary-300 bg-primary-50 ring-2 ring-primary-100"
                  : "border-[#E8E5F7] bg-white hover:border-primary-200"
              }`}
            >
              <span className={`rounded-xl p-2.5 ${
                tab.value === "pending"
                  ? "bg-amber-50 text-amber-600"
                  : tab.value === "approved"
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-red-50 text-red-600"
              }`}>
                {tab.value === "pending" ? <Clock3 className="h-5 w-5" /> : tab.value === "approved" ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              </span>
              <span>
                <span className="block text-xs font-semibold text-slate-500">{tab.label}</span>
                <span className="block text-base font-bold text-slate-900">View applications</span>
              </span>
            </button>
          ))}
        </div>

        <div className="mt-5 overflow-hidden rounded-[22px] border border-[#E8E5F7] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b bg-[#F8F7FD] px-5 py-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{status} applications</p>
              <p className="mt-0.5 text-sm text-slate-500">Select an applicant to review their full submission.</p>
            </div>
            {!isLoading && <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-primary-700 shadow-sm">{(applications ?? []).length}</span>}
          </div>
          {isLoading ? (
            <div className="space-y-3 p-5" role="status" aria-label="Loading applications">
              {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-xl bg-slate-100" />)}
              <span className="sr-only">Loading applications...</span>
            </div>
          ) : (applications ?? []).length === 0 ? (
            <div className="p-10 text-center">
              <GraduationCap className="mx-auto h-9 w-9 text-slate-300" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-slate-600">No {status} applications</p>
              <p className="mt-1 text-xs text-slate-400">Applications will appear here when their status matches this view.</p>
            </div>
          ) : (
            <ul className="divide-y divide-[#F0EEF8]">
              {(applications ?? []).map((application) => (
                <li key={application.id} className="p-5 transition hover:bg-[#FAF9FF]">
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
