import { useState, type FormEvent, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { Calendar, Check, X } from "lucide-react";
import { useRequestBooking } from "../../hooks/useTutor";
import { useSubjects } from "../../hooks/useTaxonomy";
import { useMyProfile } from "../../hooks/useProfile";

const DURATION_OPTIONS = [30, 60, 90, 120];

const DEFAULT_TRIGGER_CLASS =
  "flex h-9 items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 text-sm font-bold text-white transition hover:bg-white/25";

export function BookSessionButton({
  tutorUserId,
  specialtySubjectIds,
  triggerClassName,
  label = "Book a session",
}: {
  tutorUserId: string;
  /** Subject ids the tutor applied/was verified for — the student can
   * only pick among these, not the full catalogue. */
  specialtySubjectIds: string[];
  /** Overrides the default trigger style, which assumes a dark/gradient
   * background (as on a profile header) — pass this on plain white
   * surfaces (e.g. a marketplace card) so the button stays visible. */
  triggerClassName?: string;
  label?: string;
}) {
  const { data: allSubjects } = useSubjects();
  const specialties = (allSubjects ?? []).filter((s) => specialtySubjectIds.includes(s.id));
  const { data: profile } = useMyProfile();
  const requestBooking = useRequestBooking();
  const [isOpen, setIsOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [subjectId, setSubjectId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [message, setMessage] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  function open(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setSubmitted(false);
    requestBooking.reset();
    setContactEmail(profile?.email ?? "");
    setContactPhone(profile?.phone ?? "");
    setIsOpen(true);
  }

  function close() {
    setIsOpen(false);
  }

  const emailOk = /.+@.+\..+/.test(contactEmail);
  const phoneOk = contactPhone.trim().length >= 5;
  const ready = Boolean(date && time && subjectId && emailOk && phoneOk);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!ready) return;
    requestBooking.mutate(
      {
        tutorUserId,
        data: {
          subjectId,
          requestedStartAt: new Date(`${date}T${time}`).toISOString(),
          durationMinutes,
          message: message.trim() || undefined,
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim(),
        },
      },
      { onSuccess: () => setSubmitted(true) },
    );
  }

  const serverError =
    requestBooking.isError && axios.isAxiosError(requestBooking.error)
      ? (() => {
          const error = requestBooking.error.response?.data as {
            error?: { message?: string; details?: Array<{ field?: string; message: string }> };
          };
          return error.error?.details?.[0]?.message ?? error.error?.message;
        })()
      : null;

  return (
    <>
      <button type="button" onClick={open} className={triggerClassName ?? DEFAULT_TRIGGER_CLASS}>
        <Calendar className="h-4 w-4" aria-hidden="true" />
        {label}
      </button>

      {isOpen &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Book a tutoring session"
            className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-8"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <div className="w-full max-w-[520px] overflow-hidden rounded-[24px] bg-white shadow-2xl">
              <div
                className="flex items-start justify-between gap-4 p-[22px] text-white"
                style={{ background: "radial-gradient(120% 160% at 88% 8%, #4A3FD1 0%, #2E2372 55%, #231C57 100%)" }}
              >
                <div className="min-w-0">
                  <span className="inline-block rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white">
                    {submitted ? "REQUESTED" : "BOOK A SESSION"}
                  </span>
                  <h2 className="mt-2 text-xl font-extrabold">{submitted ? "Request sent" : "Request a tutoring session"}</h2>
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
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#EFEEFB] text-[#4338CA]">
                    <Check className="h-7 w-7" aria-hidden="true" />
                  </span>
                  <p className="max-w-sm text-sm text-slate-500">
                    Your request was sent. The tutor will accept or decline it, and you&apos;ll be notified either way.
                  </p>
                  <button type="button" onClick={close} className="mt-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-700">
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-[22px]">
                  {serverError && (
                    <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                      {serverError}
                    </div>
                  )}
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-slate-500">
                      Subject you need help with<span className="text-red-500"> *</span>
                    </span>
                    <select
                      required
                      value={subjectId}
                      onChange={(e) => setSubjectId(e.target.value)}
                      className="h-11 rounded-xl border border-[#E4E3F2] px-3 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="" disabled>
                        Select a subject this tutor teaches…
                      </option>
                      {specialties.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    {specialties.length === 0 && (
                      <span className="text-xs text-slate-400">This tutor hasn&apos;t listed any specialties yet.</span>
                    )}
                  </label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-slate-500">
                        Day<span className="text-red-500"> *</span>
                      </span>
                      <input
                        type="date"
                        required
                        min={new Date().toISOString().slice(0, 10)}
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="h-11 rounded-xl border border-[#E4E3F2] px-3 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-slate-500">
                        Time<span className="text-red-500"> *</span>
                      </span>
                      <input
                        type="time"
                        required
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="h-11 rounded-xl border border-[#E4E3F2] px-3 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-slate-500">Duration</span>
                      <select
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(Number(e.target.value))}
                        className="h-11 rounded-xl border border-[#E4E3F2] px-3 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        {DURATION_OPTIONS.map((minutes) => (
                          <option key={minutes} value={minutes}>
                            {minutes} minutes
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <p className="text-xs text-slate-400">
                    The tutor will confirm this time — you&apos;ll be notified once they accept or decline.
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-slate-500">
                        Your email<span className="text-red-500"> *</span>
                      </span>
                      <input
                        type="email"
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="you@example.com"
                        className={`h-11 rounded-xl border px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                          contactEmail && !emailOk ? "border-red-300" : "border-[#E4E3F2] focus:border-primary-500"
                        }`}
                      />
                    </label>
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-slate-500">
                        Your phone number<span className="text-red-500"> *</span>
                      </span>
                      <input
                        required
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="+60 12-345 6789"
                        className="h-11 rounded-xl border border-[#E4E3F2] px-3 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </label>
                  </div>
                  <p className="text-xs text-slate-400">
                    Shared with the tutor so they can reach you about this session.
                  </p>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-slate-500">Message (optional)</span>
                    <textarea
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="What would you like to cover in this session?"
                      className="resize-y rounded-xl border border-[#E4E3F2] p-3 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </label>
                  <div className="flex flex-wrap justify-end gap-3 border-t border-[#F1F0FA] pt-4">
                    <button type="button" onClick={close} className="rounded-xl border border-[#E4E3F2] px-5 py-3 text-sm font-bold text-slate-700 hover:border-slate-300">
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!ready || requestBooking.isPending}
                      className="cursor-pointer rounded-xl bg-primary-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {requestBooking.isPending ? "Sending…" : "Send request"}
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

export default BookSessionButton;
