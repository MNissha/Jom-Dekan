import { useState } from "react";
import { createPortal } from "react-dom";
import { Flag, X, Check, ImagePlus } from "lucide-react";
import { useCreateReport } from "../../hooks/useReports";
import { useMyProfile } from "../../hooks/useProfile";
import { REPORT_CATEGORIES, REPORT_CATEGORY_LABELS, type ReportCategory, type ReportTargetType } from "../../types/report";
import axios from "axios";

interface ReportForm {
  category: ReportCategory | null;
  reporterName: string;
  reporterPhone: string;
  reporterEmail: string;
  description: string;
  screenshot: File | null;
}

const EMPTY_FORM: ReportForm = {
  category: null,
  reporterName: "",
  reporterPhone: "",
  reporterEmail: "",
  description: "",
  screenshot: null,
};

/**
 * Red "Report" trigger + the report modal, bundled as one drop-in
 * component — used on resource cards, forum post rows, and tutoring/
 * freelance listings. Owns its own open/submitted state so callers just
 * render <ReportButton targetType="..." targetId="..." />.
 */
export function ReportButton({ targetType, targetId }: { targetType: ReportTargetType; targetId: string }) {
  const { data: profile } = useMyProfile();
  const createReport = useCreateReport();
  const [isOpen, setIsOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<ReportForm>(EMPTY_FORM);

  function open(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setSubmitted(false);
    setForm({
      ...EMPTY_FORM,
      reporterName: profile?.displayName ?? "",
      reporterPhone: profile?.phone ?? "",
      reporterEmail: profile?.email ?? "",
    });
    setIsOpen(true);
  }

  function close() {
    setIsOpen(false);
  }

  function updateForm<K extends keyof ReportForm>(key: K, value: ReportForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const emailOk = /.+@.+\..+/.test(form.reporterEmail);
  const ready =
    form.category &&
    form.reporterName.trim().length >= 2 &&
    form.reporterPhone.trim().length >= 5 &&
    emailOk &&
    form.description.trim().length >= 20;
  const screenshotOk = !form.screenshot || form.screenshot.size <= 5 * 1024 * 1024;

  const serverError =
    createReport.isError && axios.isAxiosError(createReport.error)
      ? (() => {
          const error = createReport.error.response?.data as {
            error?: {
              message?: string;
              details?: Array<{ field?: string; message: string }>;
            };
          };
          return error.error?.details?.[0]?.message ?? error.error?.message;
        })()
      : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || !screenshotOk || !form.category) return;
    createReport.mutate(
      {
        targetType,
        targetId,
        category: form.category,
        reporterName: form.reporterName.trim(),
        reporterPhone: form.reporterPhone.trim(),
        reporterEmail: form.reporterEmail.trim(),
        description: form.description.trim(),
        screenshot: form.screenshot,
      },
      { onSuccess: () => setSubmitted(true) },
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label="Report"
        title="Report"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-red-200 bg-white text-red-500 transition motion-safe:duration-150 hover:-translate-y-0.5 hover:border-red-400 hover:bg-red-50 hover:text-red-600 hover:shadow-sm"
      >
        <Flag className="h-4 w-4" aria-hidden="true" />
      </button>

      {isOpen &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Report content"
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-8"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
          <div className="w-full max-w-[560px] overflow-hidden rounded-[24px] bg-white shadow-2xl dark:bg-[#1B1836] dark:text-slate-100">
            <div
              className="flex items-start justify-between gap-4 p-[22px] text-white"
              style={{ background: "radial-gradient(120% 160% at 88% 8%, #DC2626 0%, #7F1D1D 55%, #450A0A 100%)" }}
            >
              <div className="min-w-0">
                <span className="inline-block rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white">
                  {submitted ? "DONE" : "REPORT"}
                </span>
                <h2 className="mt-2 text-xl font-extrabold">{submitted ? "Report submitted" : "Report this content"}</h2>
                <p className="mt-1 text-sm font-medium text-red-100">
                  {submitted
                    ? "Our admin team has been notified and will look into it."
                    : "Tell us what's wrong and how to reach you — admins are notified immediately."}
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {submitted ? (
              <div className="flex flex-col items-center gap-3 p-10 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FEE2E2] text-red-600">
                  <Check className="h-7 w-7" aria-hidden="true" />
                </span>
                <p className="max-w-sm text-sm text-slate-500">
                  Thanks for flagging this. An admin will review it and may follow up with you.
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="mt-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-700"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex max-h-[65vh] flex-col gap-5 overflow-y-auto p-[22px]">
                {serverError && (
                  <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                    {serverError}
                  </div>
                )}

                <section className="flex flex-col gap-2">
                  <h3 className="text-xs font-bold tracking-wide text-red-700">
                    REASON<span className="text-red-500"> *</span>
                  </h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {REPORT_CATEGORIES.map((c) => {
                      const active = form.category === c;
                      return (
                        <button
                          key={c}
                          type="button"
                          aria-pressed={active}
                          onClick={() => updateForm("category", c)}
                          className={`rounded-xl border px-3 py-2.5 text-left text-sm font-bold transition motion-safe:duration-150 ${
                            active
                              ? "border-red-400 bg-red-50 text-red-700 dark:bg-red-400/15 dark:text-red-200"
                              : "border-[#E4E3F2] text-slate-600 hover:border-red-200 dark:border-[#494174] dark:text-slate-300 dark:hover:border-red-400/70 dark:hover:bg-red-400/10 dark:hover:text-slate-100"
                          }`}
                        >
                          {REPORT_CATEGORY_LABELS[c]}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="flex flex-col gap-3">
                  <h3 className="text-xs font-bold tracking-wide text-red-700">
                    YOUR CONTACT DETAILS <span className="font-semibold text-slate-400">· all required</span>
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-slate-500">
                        Name<span className="text-red-500"> *</span>
                      </span>
                      <input
                        value={form.reporterName}
                        onChange={(e) => updateForm("reporterName", e.target.value)}
                        className="h-11 rounded-xl border border-[#E4E3F2] bg-[#FBFBFE] px-3 text-sm text-slate-700 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400 dark:border-[#494174] dark:bg-[#231E4A] dark:text-slate-100"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-slate-500">
                        Phone number<span className="text-red-500"> *</span>
                      </span>
                      <input
                        value={form.reporterPhone}
                        onChange={(e) => updateForm("reporterPhone", e.target.value)}
                        placeholder="+60 12-345 6789"
                        className="h-11 rounded-xl border border-[#E4E3F2] bg-[#FBFBFE] px-3 text-sm text-slate-700 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400 dark:border-[#494174] dark:bg-[#231E4A] dark:text-slate-100 dark:placeholder:text-slate-400"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5 sm:col-span-2">
                      <span className="text-xs font-bold text-slate-500">
                        Email<span className="text-red-500"> *</span>
                      </span>
                      <input
                        type="email"
                        value={form.reporterEmail}
                        onChange={(e) => updateForm("reporterEmail", e.target.value)}
                        className={`h-11 rounded-xl border px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-400 dark:bg-[#231E4A] dark:text-slate-100 ${
                          form.reporterEmail && !emailOk ? "border-red-300" : "border-[#E4E3F2] focus:border-red-400"
                        }`}
                      />
                    </label>
                  </div>
                </section>

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-slate-500">
                    What's wrong<span className="text-red-500"> *</span>
                  </span>
                  <textarea
                    rows={4}
                    value={form.description}
                    onChange={(e) => updateForm("description", e.target.value)}
                    placeholder="Describe the issue in at least 20 characters…"
                    className="resize-y rounded-xl border border-[#E4E3F2] bg-[#FBFBFE] p-3 text-sm text-slate-700 focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-400 dark:border-[#494174] dark:bg-[#231E4A] dark:text-slate-100 dark:placeholder:text-slate-400"
                  />
                </label>

                <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-[#D8D4EC] bg-[#FBFBFE] p-4 transition hover:border-red-300 hover:bg-red-50/40 dark:border-[#494174] dark:bg-[#231E4A] dark:hover:border-red-400/70 dark:hover:bg-red-400/10">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EFEEFB] text-[#4338CA]">
                    <ImagePlus className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-slate-700">Add screenshot evidence <span className="font-medium text-slate-400">(optional)</span></span>
                    <span className={`mt-0.5 block truncate text-xs ${screenshotOk ? "text-slate-400" : "text-red-600"}`}>
                      {form.screenshot ? form.screenshot.name : "PNG, JPG, or WebP · maximum 5 MB"}
                    </span>
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="sr-only"
                    onChange={(event) => updateForm("screenshot", event.target.files?.[0] ?? null)}
                  />
                  {form.screenshot && (
                    <button type="button" onClick={(event) => { event.preventDefault(); updateForm("screenshot", null); }} aria-label="Remove screenshot" className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-red-600">
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </label>

                <div className="flex flex-wrap justify-end gap-3 border-t border-[#F1F0FA] pt-4 dark:border-[#332C63]">
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-xl border border-[#E4E3F2] px-5 py-3 text-sm font-bold text-slate-700 hover:border-slate-300 dark:border-[#494174] dark:text-slate-200 dark:hover:border-slate-400 dark:hover:bg-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!ready || !screenshotOk || createReport.isPending}
                    title={ready ? undefined : "Fill in every required field, including a valid email"}
                    className={`rounded-xl px-5 py-3 text-sm font-bold transition motion-safe:duration-150 ${
                      ready && screenshotOk && !createReport.isPending
                        ? "cursor-pointer bg-red-600 text-white hover:bg-red-700"
                        : "cursor-not-allowed bg-slate-200 text-slate-400"
                    }`}
                  >
                    {createReport.isPending ? "Submitting…" : "Submit report"}
                  </button>
                </div>
              </form>
            )}
          </div>
          </div>,
          document.body,
        )}
    </>
  );
}
