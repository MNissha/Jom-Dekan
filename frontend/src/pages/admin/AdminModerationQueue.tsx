import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { ShieldCheck, X } from "lucide-react";
import { useModeration } from "../../hooks/useModeration";
import type {
  ModerationDecision,
  ModerationQueueItem,
} from "../../types/moderation";
import { AdminPageShell } from "../../layouts/AdminPageShell";
import { moderationService } from "../../service/moderationService";
import { useSearchParams } from "react-router-dom";

type ReportSection = "resources" | "discussions" | "tutoring" | "freelance" | "users";
type DiscussionFilter = "all" | "threads" | "comments";
type Decision = "approve" | "reject";

interface ResponseTemplate {
  decision: ModerationDecision;
  outcome: Decision;
  label: string;
  responseTitle: string;
  responseMessage: string;
  notificationTitle: string;
  notificationMessage: string;
}

const templates: ResponseTemplate[] = [
  { decision: "CONTENT_REMOVAL", outcome: "approve", label: "Content Removal", responseTitle: "Reported Content Removed", responseMessage: "Thank you for your report. We confirmed that the content violates JomDekan's Community Guidelines. The content has been removed and appropriate moderation action has been taken.", notificationTitle: "Action Taken on Your Report", notificationMessage: 'We confirmed a violation regarding "{ContentTitle}" and removed the reported content.' },
  { decision: "POLICY_WARNING", outcome: "approve", label: "Policy Warning", responseTitle: "Policy Warning Issued", responseMessage: "We confirmed a guidelines violation and issued a formal warning to the user responsible.", notificationTitle: "Action Taken on Your Report", notificationMessage: 'A violation regarding "{ContentTitle}" was confirmed and a formal warning was issued.' },
  { decision: "CONTENT_RESTRICTION", outcome: "approve", label: "Content Restriction", responseTitle: "Reported Content Restricted", responseMessage: "Our moderation team identified concerns under JomDekan's Community Guidelines. Access to the content has been restricted.", notificationTitle: "Reported Content Restricted", notificationMessage: 'The reported content "{ContentTitle}" has been restricted following our review.' },
  { decision: "ACCOUNT_WARNING", outcome: "approve", label: "Account Warning", responseTitle: "Warning Issued to Reported Account", responseMessage: "We confirmed that the reported activity violates our guidelines. A warning has been issued to the account involved.", notificationTitle: "Action Taken Against Reported Account", notificationMessage: 'A violation regarding "{ContentTitle}" was confirmed and an account warning was issued.' },
  { decision: "LISTING_SUSPENSION", outcome: "approve", label: "Listing Suspension", responseTitle: "Reported Listing Suspended", responseMessage: "We identified issues that violate JomDekan's guidelines. The listing has been suspended and is no longer publicly available.", notificationTitle: "Reported Listing Suspended", notificationMessage: 'The listing "{ContentTitle}" was suspended after a violation was confirmed.' },
  { decision: "NO_VIOLATION_FOUND", outcome: "reject", label: "No Violation Found", responseTitle: "No Violation Found", responseMessage: "After reviewing the content, we found that it does not violate JomDekan's Community Guidelines. No action will be taken.", notificationTitle: "Your Report Has Been Reviewed", notificationMessage: 'We found no guidelines violation regarding "{ContentTitle}".' },
  { decision: "INSUFFICIENT_EVIDENCE", outcome: "reject", label: "Insufficient Evidence", responseTitle: "Unable to Confirm Violation", responseMessage: "Based on the information available, we could not confirm a clear violation. The report has been closed without action.", notificationTitle: "Report Closed — Insufficient Evidence", notificationMessage: 'There was insufficient evidence to confirm a violation regarding "{ContentTitle}".' },
  { decision: "CONTENT_WITHIN_GUIDELINES", outcome: "reject", label: "Content Within Guidelines", responseTitle: "Content Within Community Guidelines", responseMessage: "We determined that the content falls within JomDekan's Community Guidelines. It will remain available.", notificationTitle: "Your Report Has Been Reviewed", notificationMessage: 'The content "{ContentTitle}" falls within our guidelines and will remain available.' },
  { decision: "REPORT_NOT_APPLICABLE", outcome: "reject", label: "Report Not Applicable", responseTitle: "Report Closed — Not Applicable", responseMessage: "The reported issue does not fall under JomDekan's moderation policies. The report has been closed.", notificationTitle: "Your Report Has Been Closed", notificationMessage: 'The issue regarding "{ContentTitle}" does not fall under our moderation policies.' },
  { decision: "DUPLICATE_REPORT", outcome: "reject", label: "Duplicate Report", responseTitle: "Report Closed — Duplicate", responseMessage: "This content or issue is already being handled under an existing case. This duplicate report has been closed.", notificationTitle: "Duplicate Report Closed", notificationMessage: 'Your report regarding "{ContentTitle}" duplicates an existing case.' },
];

function reportSection(item: ModerationQueueItem): ReportSection | null {
  if (item.target_type === "resource") return "resources";
  if (item.target_type === "forum_post" || item.target_type === "forum_comment") return "discussions";
  if (item.target_type === "user") return "users";
  if (item.target_type !== "opportunity") return null;
  return item.listing_type === "TUTORING" ? "tutoring" : "freelance";
}

const readable = (value: string | null) =>
  value ? value.replace(/_/g, " ").toLowerCase() : "not provided";

export function AdminModerationQueue({ embedded = false }: { embedded?: boolean }) {
  const { queue, isLoadingQueue, handleAction } = useModeration();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = searchParams.get("section");
  const requestedDiscussionFilter = searchParams.get("discussion");
  const [section, setSection] = useState<ReportSection>(
    requestedSection === "discussions" ||
      requestedSection === "tutoring" ||
      requestedSection === "freelance" ||
      requestedSection === "users"
      ? requestedSection
      : "resources",
  );
  const [selected, setSelected] = useState<ModerationQueueItem | null>(null);
  const [discussionFilter, setDiscussionFilter] = useState<DiscussionFilter>(
    requestedDiscussionFilter === "threads" || requestedDiscussionFilter === "comments"
      ? requestedDiscussionFilter
      : "all",
  );
  const [decision, setDecision] = useState<Decision>("approve");
  const [selectedTemplate, setSelectedTemplate] = useState<ResponseTemplate>(
    templates[0],
  );
  const [responseTitle, setResponseTitle] = useState(templates[0].responseTitle);
  const [response, setResponse] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const visibleReports = useMemo(() =>
    (queue as ModerationQueueItem[]).filter((item) => {
      if (reportSection(item) !== section) return false;
      if (section !== "discussions" || discussionFilter === "all") return true;
      return discussionFilter === "comments"
        ? item.target_type === "forum_comment"
        : item.target_type === "forum_post";
    }), [queue, section, discussionFilter]);
  const discussionCounts = useMemo(() => {
    const reports = (queue as ModerationQueueItem[]).filter((item) => reportSection(item) === "discussions");
    return {
      all: reports.length,
      threads: reports.filter((item) => item.target_type === "forum_post").length,
      comments: reports.filter((item) => item.target_type === "forum_comment").length,
    };
  }, [queue]);
  const reportCounts = useMemo(
    () =>
      (queue as ModerationQueueItem[]).reduce<Record<ReportSection, number>>(
        (counts, item) => {
          const itemSection = reportSection(item);
          if (itemSection) counts[itemSection] += 1;
          return counts;
        },
        { resources: 0, discussions: 0, tutoring: 0, freelance: 0, users: 0 },
      ),
    [queue],
  );

  useEffect(() => {
    if (requestedSection === "discussions") {
      setSection("discussions");
      setDiscussionFilter(
        requestedDiscussionFilter === "threads" || requestedDiscussionFilter === "comments"
          ? requestedDiscussionFilter
          : "all",
      );
    }
  }, [requestedSection, requestedDiscussionFilter]);

  useEffect(() => {
    if (!selected) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) {
        setSelected(null);
        setSearchParams({ section });
      }
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [selected, submitting, section, setSearchParams]);

  useEffect(() => {
    if (!selected?.has_evidence || selected.entity_type !== "report") {
      setEvidenceUrl(null);
      return;
    }
    let objectUrl: string | null = null;
    let cancelled = false;
    setEvidenceLoading(true);
    moderationService
      .getReportEvidence(selected.id)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setEvidenceUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setEvidenceUrl(null);
      })
      .finally(() => {
        if (!cancelled) setEvidenceLoading(false);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [selected]);

  const openReview = (item: ModerationQueueItem) => {
    const template = templates.find((entry) => entry.outcome === "approve")!;
    setSelected(item);
    setDecision("approve");
    setSelectedTemplate(template);
    setResponseTitle(template.responseTitle);
    setResponse(template.responseMessage);
    const itemSection = reportSection(item) ?? section;
    setSection(itemSection);
    setSearchParams({ section: itemSection, report: item.id });
  };

  useEffect(() => {
    const reportId = searchParams.get("report");
    if (!reportId || selected?.id === reportId || isLoadingQueue) return;
    const report = (queue as ModerationQueueItem[]).find(
      (item) => item.id === reportId,
    );
    if (!report) return;
    const template = templates.find((entry) => entry.outcome === "approve")!;
    setSelected(report);
    setDecision("approve");
    setSelectedTemplate(template);
    setResponseTitle(template.responseTitle);
    setResponse(template.responseMessage);
    const itemSection = reportSection(report) ?? "resources";
    setSection(itemSection);
  }, [queue, isLoadingQueue, searchParams, selected]);

  const chooseDecision = (next: Decision) => {
    const template = templates.find((entry) => entry.outcome === next)!;
    setDecision(next);
    setSelectedTemplate(template);
    setResponseTitle(template.responseTitle);
    setResponse(template.responseMessage);
  };

  const chooseTemplate = (moderationDecision: string) => {
    const template = templates.find(
      (entry) => entry.decision === moderationDecision,
    );
    if (!template) return;
    setSelectedTemplate(template);
    setResponseTitle(template.responseTitle);
    setResponse(template.responseMessage);
  };

  const submit = async () => {
    if (!selected || response.trim().length < 5 || !responseTitle.trim()) return;
    setSubmitting(true);
    try {
      const contentTitle = selected.target_title ?? "reported content";
      const contentType =
        selected.target_type === "resource"
          ? "Academic Resource"
          : selected.target_type === "forum_post"
            ? "Discussion Thread"
          : selected.target_type === "forum_comment"
            ? "Discussion Comment"
          : selected.target_type === "user"
            ? "User Account"
          : selected.listing_type === "TUTORING"
            ? "Tutoring Listing"
            : "Freelance Opportunity";
      const notificationMessage = selectedTemplate.notificationMessage.replace(
        "{ContentTitle}",
        contentTitle,
      );
      await handleAction({
        targetType: selected.entity_type,
        id: selected.id,
        action: decision,
        reason: response.trim(),
        resolution: {
          moderationDecision: selectedTemplate.decision,
          responseTitle: responseTitle.trim(),
          notificationTitle: selectedTemplate.notificationTitle,
          notificationMessage,
          emailSubject: `${responseTitle.trim()} — Report #${selected.id}`,
          emailBody: `Hello ${selected.reporter_name || "there"},\n\n${response.trim()}\n\nReport ID: #${selected.id}\nReported Content: ${contentTitle}\nContent Type: ${contentType}\nDecision: ${selectedTemplate.label}\n\nBest regards,\nJomDekan Moderation Team`,
        },
      });
      setSelected(null);
      setSearchParams({ section });
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data as { error?: { message?: string } })?.error?.message
        : undefined;
      alert(message ?? "Failed to process the report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminPageShell embedded={embedded}>
      <div className="page-container page-container-standard py-grid-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700 dark:text-teal-400">Admin safety</p>
        <h1 className="mt-grid-1 break-words text-2xl font-heading leading-tight tracking-tight text-content-primary sm:text-page-title">Moderation queue</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Review reports and respond directly to reporters.</p>

        <nav className="mt-5 flex w-fit flex-wrap gap-1 rounded-xl border border-[#ECEBF7] bg-white p-1 shadow-sm" aria-label="Report types">
          {([
            ["resources", "Academic resources"],
            ["discussions", "Discussions"],
            ["tutoring", "Tutoring"],
            ["freelance", "Freelance opportunities"],
            ["users", "Users"],
          ] as const).map(([key, text]) => (
              <button key={key} type="button" onClick={() => { setSection(key); setSearchParams({ section: key }); }} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition motion-safe:duration-150 ${section === key ? "bg-[#4338CA] text-white shadow-sm" : "text-slate-600 hover:-translate-y-0.5 hover:bg-[#F4F3FB] hover:text-[#4338CA]"}`}>
              {text}
              {reportCounts[key] > 0 && <span className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold ${section === key ? "bg-red-500 text-white" : "bg-red-50 text-red-600"}`}>{reportCounts[key]}</span>}
            </button>
          ))}
        </nav>

        {section === "discussions" && (
          <nav className="mt-3 flex w-fit gap-1 rounded-xl border border-[#ECEBF7] bg-white p-1 shadow-sm" aria-label="Discussion report types">
            {([['all', 'All'], ['threads', 'Threads'], ['comments', 'Comments']] as const).map(([key, label]) => (
              <button key={key} type="button" onClick={() => { setDiscussionFilter(key); setSearchParams({ section: "discussions", discussion: key }); }} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${discussionFilter === key ? "bg-[#332475] text-white" : "text-slate-600 hover:bg-[#F4F3FB] hover:text-[#4338CA]"}`}>
                {label}<span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${discussionFilter === key ? "bg-red-500 text-white" : "bg-red-50 text-red-600"}`}>{discussionCounts[key]}</span>
              </button>
            ))}
          </nav>
        )}

        <div key={section} className="card-base admin-table-container mt-4 overflow-hidden motion-safe:animate-panel-enter">
          {isLoadingQueue ? (
            <p className="p-8 text-center text-stone-500">Loading moderation queue...</p>
          ) : visibleReports.length === 0 ? (
            <p className="p-8 text-center text-stone-500">No pending reports in this section.</p>
          ) : (
            <table className="w-full border-collapse text-left">
              <thead className="border-b bg-stone-100 text-sm text-stone-700">
                <tr><th className="p-4">Reported item</th>{section === "discussions" && <th className="p-4">Type</th>}<th className="p-4">Category</th><th className="p-4">Report description</th><th className="p-4">Action</th></tr>
              </thead>
              <tbody>
                {visibleReports.map((item) => (
                  <tr key={item.id} className="border-b bg-red-50/40 text-sm transition motion-safe:duration-150 last:border-0 hover:bg-red-50/80">
                    <td className="p-4 font-medium text-stone-800">
                      <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" aria-label="Pending response" />
                      {item.target_title ?? "Unavailable item"}
                      <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700">Pending</span>
                    </td>
                    {section === "discussions" && <td className="p-4"><span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold uppercase text-violet-700">{item.target_type === "forum_comment" ? "Comment" : "Thread"}</span></td>}
                    <td className="p-4 capitalize text-stone-600">{readable(item.category)}</td>
                    <td className="max-w-md p-4 text-stone-600"><p className="line-clamp-2">{item.details}</p></td>
                    <td className="whitespace-nowrap p-4"><button type="button" onClick={() => openReview(item)} className="whitespace-nowrap rounded-full bg-[#4338CA] px-4 py-2 text-xs font-semibold text-white transition motion-safe:duration-150 hover:-translate-y-0.5 hover:bg-[#3730A3] hover:shadow-md active:translate-y-0">Review</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selected && createPortal(
        <div className="overlay-root" role="dialog" aria-modal="true" aria-labelledby="review-title">
          <div className="dialog-surface max-w-2xl">
            <header className="dialog-header flex items-start justify-between bg-gradient-to-br from-[#332475] to-[#4B3FD3] px-6 py-5 text-white">
              <div>
                <span className="inline-flex rounded-full bg-amber-400/25 px-3 py-1 text-[11px] font-bold tracking-wide text-amber-200">REVIEW REPORT</span>
                <h2 id="review-title" className="mt-3 text-2xl font-extrabold">Moderation decision</h2>
                <p className="mt-1 text-sm text-[#C9C5EF]">Review the submitted report and reply to the user.</p>
              </div>
              <button type="button" onClick={() => { setSelected(null); setSearchParams({ section }); }} disabled={submitting} aria-label="Close review" className="rounded-xl border border-white/25 p-2 text-white transition hover:rotate-90 hover:bg-white/10 disabled:opacity-50"><X className="h-5 w-5" /></button>
            </header>

            <div className="dialog-body flex-1 space-y-5 p-6">
              <div className="rounded-2xl border border-[#ECEBF7] bg-[#F8F8FD] p-4 dark:border-[#3B3564] dark:bg-[#1F1B40]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-[#4338CA]" />
                  <h3 className="font-bold text-slate-900">{selected.target_title ?? "Reported item"}</h3>
                </div>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{readable(selected.category)}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{selected.details}</p>
              </div>

              {selected.target_type === "forum_comment" && (
                <section className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-[#ECEBF7] bg-white p-4 dark:border-[#3B3564] dark:bg-[#1F1B40]">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#4338CA]">Reported comment</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{selected.target_description ?? "Comment unavailable"}</p>
                  </div>
                  <div className="rounded-2xl border border-[#ECEBF7] bg-white p-4 dark:border-[#3B3564] dark:bg-[#1F1B40]">
                    <p className="text-xs font-bold uppercase tracking-wide text-[#4338CA]">Thread context</p>
                    <h3 className="mt-2 font-bold text-slate-900">{selected.parent_title ?? "Discussion unavailable"}</h3>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">{selected.parent_description ?? "Thread content unavailable."}</p>
                    {selected.parent_id && <p className="mt-3 break-all text-xs text-slate-400">Thread ID: {selected.parent_id}</p>}
                  </div>
                </section>
              )}

              {selected.target_type === "forum_post" && (
                <section className="rounded-2xl border border-[#E4E0FA] bg-gradient-to-br from-white to-[#F8F7FF] p-4 dark:border-primary-400/20 dark:from-[#231E4A] dark:to-[#1F1B40]">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#4338CA]">Reported discussion thread</p>
                  <h3 className="mt-2 font-bold text-slate-900">{selected.target_title ?? "Discussion unavailable"}</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{selected.target_description ?? "Thread content unavailable."}</p>
                </section>
              )}

              {selected.target_type === "resource" && (
                <section className="rounded-2xl border border-[#DDE9F8] bg-gradient-to-br from-white to-[#F2F7FF] p-4 dark:border-blue-400/20 dark:from-[#1B2A4A] dark:to-[#1B2440]">
                  <p className="text-xs font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">Reported academic resource</p>
                  <h3 className="mt-2 font-bold text-slate-900">{selected.target_title ?? "Resource unavailable"}</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{selected.target_description ?? "Resource description unavailable."}</p>
                </section>
              )}

              {selected.target_type === "opportunity" && (
                <section className="rounded-2xl border border-[#E4E0FA] bg-gradient-to-br from-white to-[#F8F7FF] p-4 dark:border-primary-400/20 dark:from-[#231E4A] dark:to-[#1F1B40]">
                  <p className="text-xs font-bold uppercase tracking-wide text-[#4338CA]">{selected.listing_type === "TUTORING" ? "Reported tutoring profile" : "Reported freelance opportunity"}</p>
                  <h3 className="mt-2 font-bold text-slate-900">{selected.target_title ?? "Listing unavailable"}</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{selected.target_description ?? "Listing details unavailable."}</p>
                </section>
              )}

              {selected.target_type !== "user" && (
                <dl className="grid gap-2 rounded-2xl border border-[#ECEBF7] p-4 text-sm sm:grid-cols-2 dark:border-[#3B3564] dark:bg-[#1B1836]">
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Exact content type</dt><dd className="mt-1 font-semibold text-slate-700">{selected.target_type === "opportunity" ? readable(selected.listing_type) : readable(selected.target_type)}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Content ID</dt><dd className="mt-1 break-all font-mono text-xs text-slate-700">{selected.entity_id}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Owner / author ID</dt><dd className="mt-1 break-all font-mono text-xs text-slate-700">{selected.target_owner_id ?? "Unavailable"}</dd></div>
                  <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Report submitted</dt><dd className="mt-1 font-semibold text-slate-700">{new Date(selected.created_at).toLocaleString()}</dd></div>
                </dl>
              )}

              <dl className="grid gap-2 rounded-2xl border border-[#ECEBF7] p-4 text-sm sm:grid-cols-3">
                <div><dt className="text-xs text-slate-400">Report ID</dt><dd className="mt-0.5 break-all font-medium text-slate-700">#{selected.id}</dd></div>
                <div><dt className="text-xs text-slate-400">Status</dt><dd className="mt-0.5 font-bold uppercase text-red-600">{readable(selected.moderation_status)}</dd></div>
                <div><dt className="text-xs text-slate-400">Submitted</dt><dd className="mt-0.5 font-medium text-slate-700">{new Date(selected.created_at).toLocaleString()}</dd></div>
              </dl>

              {selected.has_evidence && (
                <section>
                  <h3 className="text-sm font-bold text-slate-900">Screenshot evidence</h3>
                  <div className="mt-2 overflow-hidden rounded-2xl border border-[#ECEBF7] bg-[#F8F8FD] p-2">
                    {evidenceLoading ? (
                      <div className="h-44 animate-pulse rounded-xl bg-slate-200" aria-label="Loading screenshot evidence" />
                    ) : evidenceUrl ? (
                      <a href={evidenceUrl} target="_blank" rel="noreferrer" title="Open full-size screenshot">
                        <img src={evidenceUrl} alt="Screenshot evidence submitted with this report" className="max-h-72 w-full rounded-xl object-contain transition motion-safe:duration-200 hover:scale-[1.01]" />
                      </a>
                    ) : (
                      <p className="p-4 text-sm text-slate-500">The screenshot could not be loaded.</p>
                    )}
                  </div>
                </section>
              )}

              <section>
                <h3 className="text-sm font-bold text-slate-900">Reporter details</h3>
                <dl className="mt-2 grid gap-2 rounded-2xl border border-[#ECEBF7] p-4 text-sm sm:grid-cols-3">
                  <div><dt className="text-xs text-slate-400">Name</dt><dd className="mt-0.5 font-medium text-slate-700">{selected.reporter_name ?? "Not provided"}</dd></div>
                  <div><dt className="text-xs text-slate-400">Email</dt><dd className="mt-0.5 break-all font-medium text-slate-700">{selected.reporter_email ?? "Not provided"}</dd></div>
                  <div><dt className="text-xs text-slate-400">Phone</dt><dd className="mt-0.5 font-medium text-slate-700">{selected.reporter_phone ?? "Not provided"}</dd></div>
                </dl>
              </section>

              <section>
                <h3 className="text-sm font-bold text-slate-900">Decision and response</h3>
                  <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-[#F4F3FB] p-1 dark:bg-[#1B1836]">
                  <button type="button" onClick={() => chooseDecision("approve")} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${decision === "approve" ? "bg-white text-emerald-700 shadow-sm dark:bg-[#30295D] dark:text-emerald-300" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}>Resolve issue</button>
                  <button type="button" onClick={() => chooseDecision("reject")} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${decision === "reject" ? "bg-white text-red-600 shadow-sm dark:bg-[#30295D] dark:text-red-300" : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}>Reject report</button>
                </div>
                <label className="mt-3 block text-sm font-semibold text-slate-700">Standard response
                  <select value={selectedTemplate.decision} onChange={(event) => chooseTemplate(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#DDDCEC] bg-white px-3 py-2.5 outline-none transition focus:border-[#4338CA] focus:ring-2 focus:ring-[#4338CA]/15 dark:border-[#494174] dark:bg-[#1B1836] dark:text-slate-100 dark:focus:border-primary-400">
                    {templates.filter((template) => template.outcome === decision && (selected.target_type !== "forum_comment" || template.decision !== "LISTING_SUSPENSION") && (selected.target_type !== "user" || template.decision !== "LISTING_SUSPENSION")).map((template) => <option key={template.decision} value={template.decision}>{selected.target_type === "forum_comment" && template.decision === "CONTENT_REMOVAL" ? "Remove Comment" : selected.target_type === "forum_comment" && template.decision === "CONTENT_RESTRICTION" ? "Restrict Comment" : template.label}</option>)}
                  </select>
                </label>
                <label className="mt-3 block text-sm font-semibold text-slate-700">Response title
                  <input value={responseTitle} onChange={(event) => setResponseTitle(event.target.value)} maxLength={160} className="mt-1.5 w-full rounded-xl border border-[#DDDCEC] px-3 py-2.5 outline-none transition focus:border-[#4338CA] focus:ring-2 focus:ring-[#4338CA]/15" />
                </label>
                <label className="mt-3 block text-sm font-semibold text-slate-700">Message to reporter
                  <textarea value={response} onChange={(event) => setResponse(event.target.value)} rows={3} maxLength={2000} className="mt-1.5 w-full resize-y rounded-xl border border-[#DDDCEC] px-3 py-2.5 outline-none transition focus:border-[#4338CA] focus:ring-2 focus:ring-[#4338CA]/15" />
                </label>
                <p className="mt-1.5 text-xs text-slate-500">Sent by email and added to the user's notifications.</p>
              </section>
            </div>

            <footer className="dialog-footer flex justify-end gap-3 px-6 py-4">
              <button type="button" onClick={() => { setSelected(null); setSearchParams({ section }); }} disabled={submitting} className="rounded-xl border border-[#DDDCEC] px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              <button type="button" onClick={() => void submit()} disabled={submitting || response.trim().length < 5} className={`rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:translate-y-0 disabled:opacity-50 ${decision === "approve" ? "bg-[#4338CA] hover:bg-[#3730A3]" : "bg-red-600 hover:bg-red-700"}`}>
                {submitting ? "Sending..." : decision === "approve" ? "Resolve & send" : "Reject & send"}
              </button>
            </footer>
          </div>
        </div>,
        document.body,
      )}
    </AdminPageShell>
  );
}

export default AdminModerationQueue;
