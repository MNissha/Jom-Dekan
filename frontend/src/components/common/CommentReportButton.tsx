import { useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { Check, Flag, ImagePlus, X } from "lucide-react";
import { useCreateReport } from "../../hooks/useReports";
import { useMyProfile } from "../../hooks/useProfile";
import type { ReportCategory } from "../../types/report";

const reasons: Array<{ value: ReportCategory; label: string }> = [
  { value: "HARASSMENT", label: "Harassment or bullying" },
  { value: "HATE_OR_ABUSIVE_CONTENT", label: "Hate or abusive content" },
  { value: "SPAM_OR_SCAM", label: "Spam" },
  { value: "INAPPROPRIATE_CONTENT", label: "Inappropriate content" },
  { value: "MISINFORMATION", label: "Misinformation" },
  { value: "ACADEMIC_DISHONESTY", label: "Academic misconduct" },
  { value: "SCAM_OR_SUSPICIOUS_ACTIVITY", label: "Scam or suspicious activity" },
  { value: "PRIVACY_CONCERN", label: "Personal information / privacy concern" },
  { value: "OTHER", label: "Other" },
];

export function CommentReportButton({ commentId, postId, commentText }: { commentId: string; postId: string; commentText: string }) {
  const { data: profile } = useMyProfile();
  const createReport = useCreateReport();
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [details, setDetails] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);

  const errorMessage = createReport.isError && axios.isAxiosError(createReport.error)
    ? (createReport.error.response?.data as { error?: { message?: string } })?.error?.message
    : null;

  const close = () => {
    if (createReport.isPending) return;
    setOpen(false);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!category) return;
    createReport.mutate(
      {
        targetType: "forum_comment",
        targetId: commentId,
        parentId: postId,
        category,
        reporterName: profile?.displayName ?? "JomDekan user",
        reporterPhone: profile?.phone ?? "Not provided",
        reporterEmail: profile?.email ?? "",
        description: details.trim(),
        screenshot,
      },
      { onSuccess: () => setSubmitted(true) },
    );
  };

  return (
    <>
      <button type="button" onClick={() => { setOpen(true); setSubmitted(false); }} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">
        <Flag className="h-3.5 w-3.5" aria-hidden="true" /> Report
      </button>
      {open && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-[2px] motion-safe:animate-[fadeIn_150ms_ease-out]" role="dialog" aria-modal="true" aria-labelledby="comment-report-title">
          <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl motion-safe:animate-[modalRise_220ms_ease-out]">
            <header className="flex items-start justify-between bg-gradient-to-br from-[#332475] to-[#4B3FD3] px-6 py-5 text-white">
              <div><span className="rounded-full bg-red-400/25 px-3 py-1 text-[11px] font-bold text-red-100">REPORT COMMENT</span><h2 id="comment-report-title" className="mt-3 text-2xl font-extrabold">{submitted ? "Report submitted" : "Why are you reporting this comment?"}</h2></div>
              <button type="button" onClick={close} aria-label="Close" className="rounded-xl border border-white/25 p-2 transition hover:rotate-90 hover:bg-white/10"><X className="h-5 w-5" /></button>
            </header>
            {submitted ? (
              <div className="p-8 text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><Check className="h-7 w-7" /></span><p className="mt-4 font-semibold text-slate-800">Report submitted successfully.</p><p className="mt-1 text-sm text-slate-500">Our moderation team will review it.</p><button type="button" onClick={close} className="mt-5 rounded-xl bg-[#4338CA] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#3730A3]">Close</button></div>
            ) : (
              <form onSubmit={submit} className="min-h-0 space-y-4 overflow-y-auto p-6">
                <div className="rounded-2xl border border-[#ECEBF7] bg-[#F8F8FD] p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Reported comment</p><p className="mt-2 line-clamp-3 text-sm text-slate-700">“{commentText}”</p></div>
                {errorMessage && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700" role="alert">{errorMessage}</p>}
                <fieldset><legend className="text-sm font-bold text-slate-800">Reason</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{reasons.map((reason, index) => <label key={`${reason.value}-${index}`} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${category === reason.value ? "border-red-300 bg-red-50 text-red-700" : "border-[#E4E3F2] hover:border-red-200"}`}><input type="radio" name="comment-report-reason" checked={category === reason.value} onChange={() => setCategory(reason.value)} />{reason.label}</label>)}</div></fieldset>
                <label className="block text-sm font-bold text-slate-700">Additional details <span className="font-normal text-slate-400">(optional)</span><textarea value={details} onChange={(event) => setDetails(event.target.value)} rows={3} maxLength={2000} placeholder="Tell us more about the issue..." className="mt-1.5 w-full rounded-xl border border-[#E4E3F2] bg-[#FBFBFE] p-3 text-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100" /></label>
                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#D8D4EC] p-3 text-sm text-slate-600 hover:border-red-300"><ImagePlus className="h-5 w-5 text-[#4338CA]" /><span className="min-w-0 flex-1 truncate">{screenshot?.name ?? "Screenshot evidence (optional, max 5 MB)"}</span><input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => setScreenshot(event.target.files?.[0] ?? null)} /></label>
                <footer className="flex justify-end gap-3 border-t border-[#ECEBF7] pt-4"><button type="button" onClick={close} className="rounded-xl border border-[#DDDCEC] px-5 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button><button type="submit" disabled={!category || createReport.isPending || Boolean(screenshot && screenshot.size > 5 * 1024 * 1024)} className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">{createReport.isPending ? "Submitting..." : "Submit report"}</button></footer>
              </form>
            )}
          </div>
        </div>, document.body)}
    </>
  );
}
