import { useMemo, useState } from "react";
import axios from "axios";
import { UserPlus, X, Check, Wifi, MapPin, Shuffle, CalendarClock, Phone, Mail, Link as LinkIcon, GraduationCap } from "lucide-react";
import { useOpportunities } from "../../hooks/useOpportunities";
import { EmptyState } from "../common/EmptyState";
import { FavoriteButton } from "../common/FavoriteButton";
import { ReportButton } from "../common/ReportButton";
import { MarketplaceCardSkeleton } from "./MarketplaceCardSkeleton";
import type { Opportunity, OpportunityMode } from "../../types/opportunity";

// The tutor application form (below) writes subjects, rate, contact info
// etc. into one free-text `description` in a fixed layout — there's no
// structured column for any of it yet. Parse that same fixed layout back
// out so the card/detail view can show real subjects, rate and contact
// info instead of a raw text blob. Listings that don't match (created
// some other way) just fall back to showing the raw description.
interface ParsedTutorListing {
  subjects?: string;
  rate?: string;
  level?: string;
  qualification?: string;
  availability?: string;
  phone?: string;
  email?: string;
  portfolio?: string;
  pitch?: string;
}

function parseTutorListing(description: string): ParsedTutorListing {
  const result: ParsedTutorListing = {};
  const pitchLines: string[] = [];
  let inPitch = false;

  for (const raw of description.split("\n")) {
    const line = raw.trim();
    if (!line) {
      if (Object.keys(result).length > 0) inPitch = true;
      continue;
    }
    if (!inPitch) {
      const match = line.match(/^(Subjects|Rate|Year\/Level|Qualification|Availability|Contact|Portfolio):\s*(.*)$/);
      if (match) {
        const [, key, value] = match;
        if (key === "Subjects") result.subjects = value;
        else if (key === "Rate") result.rate = value;
        else if (key === "Year/Level") result.level = value;
        else if (key === "Qualification") result.qualification = value;
        else if (key === "Availability") result.availability = value;
        else if (key === "Portfolio") result.portfolio = value;
        else if (key === "Contact") {
          const [phone, email] = value.split("·").map((s) => s.trim());
          result.phone = phone;
          result.email = email;
        }
        continue;
      }
    }
    inPitch = true;
    pitchLines.push(line);
  }

  if (pitchLines.length) result.pitch = pitchLines.join("\n").trim();
  return result;
}

const MODE_ICON: Record<OpportunityMode, typeof Wifi> = {
  ONLINE: Wifi,
  PHYSICAL: MapPin,
  HYBRID: Shuffle,
};
const MODE_LABEL: Record<OpportunityMode, string> = {
  ONLINE: "Online",
  PHYSICAL: "On campus",
  HYBRID: "Hybrid",
};

const AVAILABILITY_OPTIONS = ["Weekday evenings", "Weekends", "Before 12 PM", "After 9 PM", "Exam weeks only"];

const HOW_IT_WORKS = [
  {
    n: "1",
    title: "Apply with your details",
    body: "Subjects, rate, contact details, qualifications and availability — about five minutes.",
  },
  {
    n: "2",
    title: "Accept the tutor terms",
    body: "Including that JomDekan only connects you with students and isn't responsible for what happens in a session.",
  },
  {
    n: "3",
    title: "Your listing goes live",
    body: "It appears here for other students to find. Admins can still close a listing that breaks the academic-integrity policy.",
  },
  {
    n: "4",
    title: "Students reach out to you",
    body: "You arrange the schedule and payment directly with each other — JomDekan doesn't process payments or guarantee sessions.",
  },
];

const TERMS = [
  {
    key: "guidance",
    title: "Guidance and mentoring only",
    body: "I will explain concepts and review work, and never complete assignments, tests or assessed submissions for a student.",
  },
  {
    key: "accuracy",
    title: "Accurate information",
    body: "The subjects, rate and qualifications I've provided are accurate, and I understand JomDekan may close my listing if this turns out to be false.",
  },
  {
    key: "conduct",
    title: "Code of conduct",
    body: "I will keep sessions respectful and professional, and understand JomDekan can close my listing at its discretion for misconduct.",
  },
  {
    key: "independent",
    title: "Independent arrangement",
    body: "Payment, scheduling and the tutoring arrangement itself are agreed directly between me and the student — JomDekan does not process payments, verify session quality, or guarantee bookings.",
  },
  {
    key: "liability",
    title: "JomDekan's role and liability",
    body: "I understand JomDekan only connects tutors and students. JomDekan is not a party to, and holds no responsibility for, the outcome, quality, safety, or any dispute arising between the tutor and the student.",
  },
] as const;

type TermKey = (typeof TERMS)[number]["key"];

interface ApplyForm {
  subjects: string;
  rate: string;
  level: string;
  mode: OpportunityMode;
  phone: string;
  email: string;
  portfolio: string;
  qualification: string;
  grade: string;
  pitch: string;
}

const EMPTY_FORM: ApplyForm = {
  subjects: "",
  rate: "",
  level: "",
  mode: "ONLINE",
  phone: "",
  email: "",
  portfolio: "",
  qualification: "",
  grade: "",
  pitch: "",
};

export function TutoringView() {
  const { opportunities, isLoading, createOpportunity, applyToOpportunity } = useOpportunities();

  const tutors = useMemo(
    () => (opportunities as Opportunity[]).filter((o) => o.listing_type === "TUTORING" && o.status === "active"),
    [opportunities],
  );

  const [howOpen, setHowOpen] = useState(false);

  const [applyOpen, setApplyOpen] = useState(false);
  const [applyStep, setApplyStep] = useState<1 | 2>(1);
  const [applyDone, setApplyDone] = useState(false);
  const [form, setForm] = useState<ApplyForm>(EMPTY_FORM);
  const [availability, setAvailability] = useState<Record<string, boolean>>({ "Weekday evenings": true });
  const [terms, setTerms] = useState<Record<TermKey, boolean>>({
    guidance: false,
    accuracy: false,
    conduct: false,
    independent: false,
    liability: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const [selectedOpp, setSelectedOpp] = useState<string | null>(null);
  const [coverMessage, setCoverMessage] = useState("");
  const [detailOppId, setDetailOppId] = useState<string | null>(null);
  const detailOpp = tutors.find((t) => t.id === detailOppId) ?? null;

  function updateForm<K extends keyof ApplyForm>(key: K, value: ApplyForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openApply() {
    setApplyOpen(true);
    setApplyDone(false);
    setApplyStep(1);
  }
  function closeApply() {
    setApplyOpen(false);
  }

  const emailOk = /.+@.+\..+/.test(form.email);
  const rateOk = /^\d+(\.\d{1,2})?$/.test(form.rate) && Number(form.rate) > 0;
  const levelOk = /^\d+$/.test(form.level) && Number(form.level) > 0;
  const phoneOk = /^\d+$/.test(form.phone);
  const step1Ready =
    form.subjects.trim() &&
    rateOk &&
    levelOk &&
    phoneOk &&
    emailOk &&
    form.portfolio.trim() &&
    form.qualification.trim() &&
    form.grade.trim();
  const termsReady = Object.values(terms).every(Boolean);

  async function handleSubmit() {
    if (!termsReady) return;
    setSubmitting(true);
    const availabilityList = Object.entries(availability)
      .filter(([, on]) => on)
      .map(([label]) => label);

    const description = [
      `Subjects: ${form.subjects}`,
      `Rate: RM ${form.rate}/hr`,
      `Year/Level: ${form.level}`,
      `Qualification: ${form.qualification} (${form.grade})`,
      availabilityList.length ? `Availability: ${availabilityList.join(", ")}` : null,
      `Contact: ${form.phone} · ${form.email}`,
      `Portfolio: ${form.portfolio}`,
      form.pitch.trim() ? `\n${form.pitch.trim()}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await createOpportunity({
        title: `Tutoring — ${form.subjects}`.slice(0, 120),
        description,
        listingType: "TUTORING",
        mode: form.mode,
      });
      setApplyDone(true);
      setForm(EMPTY_FORM);
      setAvailability({ "Weekday evenings": true });
      setTerms({ guidance: false, accuracy: false, conduct: false, independent: false, liability: false });
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data as { error?: { message?: string } })?.error?.message
        : undefined;
      alert(message || "Failed to submit your tutor listing");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApplyToTutor(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOpp) return;
    try {
      await applyToOpportunity({ opportunityId: selectedOpp, coverMessage });
      setSelectedOpp(null);
      setCoverMessage("");
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data as { error?: { message?: string } })?.error?.message
        : undefined;
      alert(message || "Failed to submit application");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tutoring</h1>
        <p className="mt-1 text-sm text-slate-500">Verified senior students and lecturers. Mentoring and guidance only.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-[#ECEBF7] bg-white p-5">
        <div className="min-w-0 flex-1">
          <h2 className="text-[16.5px] font-bold text-slate-900">Earn by tutoring your juniors</h2>
          <p className="mt-1 text-sm text-slate-500">
            Set your own rate and hours. JomDekan doesn&apos;t process payment or guarantee sessions — you arrange that directly with your student.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={openApply}
            className="flex items-center gap-2 rounded-xl bg-[#F5C21A] px-4 py-2.5 text-sm font-bold text-[#231C57] transition motion-safe:duration-150 hover:-translate-y-0.5 hover:bg-[#FFD24D] active:translate-y-0"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Apply to tutor
          </button>
          <button
            type="button"
            onClick={() => setHowOpen((v) => !v)}
            aria-expanded={howOpen}
            className="rounded-xl border border-[#E4E3F2] bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition motion-safe:duration-150 hover:border-primary-300 hover:text-primary-700"
          >
            How it works
          </button>
        </div>
      </div>

      {howOpen && (
        <section className="flex flex-col gap-4 rounded-[22px] border border-[#ECEBF7] bg-white p-5 motion-safe:animate-[fadeIn_150ms_ease-out]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[16.5px] font-bold text-slate-900">How tutoring on JomDekan works</h2>
              <p className="mt-0.5 text-sm text-slate-500">Four steps from application to your first student.</p>
            </div>
            <button
              type="button"
              onClick={() => setHowOpen(false)}
              aria-label="Close"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E4E3F2] text-slate-500 hover:bg-slate-50"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {HOW_IT_WORKS.map((s) => (
              <div key={s.n} className="rounded-xl border border-[#ECEBF7] p-4">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#EFEEFB] text-sm font-bold text-[#4338CA]">
                  {s.n}
                </span>
                <p className="mt-2 text-sm font-bold text-slate-800">{s.title}</p>
                <p className="mt-1 text-xs text-slate-500">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl bg-[#F8F8FD] p-4 text-xs font-semibold text-slate-600">
            JomDekan only connects tutors and students — we're not a party to your arrangement and aren't responsible for
            payment, scheduling, or what happens in a session. Contract cheating or completing graded work for a student
            is never allowed.
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-5 lg:flex-nowrap">
        <div className="min-w-0 flex-[2] basis-[480px]">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <MarketplaceCardSkeleton key={i} />
              ))}
            </div>
          ) : tutors.length === 0 ? (
            <EmptyState icon={UserPlus} title="No tutors listed yet" description="Be the first to apply — your listing will show up here for other students to find.">
              <button
                type="button"
                onClick={openApply}
                className="mt-6 rounded-full bg-primary-600 px-5 py-2.5 text-sm font-medium text-white transition motion-safe:duration-150 hover:-translate-y-0.5 hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                Apply to tutor
              </button>
            </EmptyState>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {tutors.map((opp) => {
                const ModeIcon = MODE_ICON[opp.mode];
                const initials = (opp.owner_name || "JD")
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                const parsed = parseTutorListing(opp.description);
                const subjectTags = parsed.subjects
                  ? parsed.subjects.split(",").map((s) => s.trim()).filter(Boolean)
                  : [];
                return (
                  <article
                    key={opp.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setDetailOppId(opp.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setDetailOppId(opp.id);
                      }
                    }}
                    className="flex cursor-pointer flex-col gap-3 rounded-[20px] border border-[#ECEBF7] bg-white p-[18px] text-left transition motion-safe:duration-150 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4338CA] to-[#6D63E8] text-sm font-bold text-white">
                          {initials}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[15.5px] font-bold text-slate-900">{opp.owner_name || "A JomDekan student"}</p>
                          {opp.subject_name && <p className="truncate text-xs font-semibold text-primary-600">{opp.subject_name}</p>}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <FavoriteButton targetType="opportunity" targetId={opp.id} />
                        <ReportButton targetType="opportunity" targetId={opp.id} />
                      </div>
                    </div>
                    {subjectTags.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {subjectTags.map((s) => (
                          <span key={s} className="rounded-full bg-[#F1F0FA] px-2.5 py-1 text-[11px] font-bold text-primary-700">
                            {s}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="line-clamp-2 text-sm text-slate-600">{opp.description}</p>
                    )}
                    <div className="flex items-center justify-between gap-3 border-t border-[#F4F3FB] pt-3">
                      <div className="flex flex-col gap-1">
                        {parsed.rate && <span className="text-sm font-extrabold text-slate-900">{parsed.rate}</span>}
                        <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                          <ModeIcon className="h-3.5 w-3.5" aria-hidden="true" />
                          {MODE_LABEL[opp.mode]}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOpp(opp.id);
                        }}
                        className="rounded-full bg-primary-600 px-4 py-2 text-xs font-bold text-white transition motion-safe:duration-150 hover:-translate-y-0.5 hover:bg-primary-700"
                      >
                        Apply / Inquire
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 basis-[300px] rounded-[22px] border border-[#ECEBF7] bg-white p-5">
          <h2 className="text-[16.5px] font-bold text-slate-900">Your booked sessions</h2>
          {/* Honest empty state — there's no scheduling/booking system yet
              (same reasoning as the dashboard's Upcoming Sessions), so
              nothing real to list here rather than fabricated bookings. */}
          <div className="mt-4 flex flex-col items-start gap-2">
            <CalendarClock className="h-6 w-6 text-slate-300" aria-hidden="true" />
            <p className="text-sm text-slate-500">
              No sessions booked yet. Message a tutor above, or apply to tutor yourself.
            </p>
          </div>
        </div>
      </div>

      {/* Apply-to-tutor listing modal */}
      {applyOpen && (
        <div role="dialog" aria-modal="true" aria-label="Tutor application" className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-8">
          <div className="w-full max-w-[640px] overflow-hidden rounded-[24px] bg-white shadow-2xl">
            <div
              className="flex items-start justify-between gap-4 p-[22px] text-white"
              style={{ background: "radial-gradient(120% 160% at 88% 8%, #4A3FD1 0%, #2E2372 55%, #231C57 100%)" }}
            >
              <div className="min-w-0">
                <span className="inline-block rounded-full bg-[rgba(245,194,26,.2)] px-2.5 py-1 text-[11px] font-bold tracking-wide text-[#FFE9A6]">
                  {applyDone ? "DONE" : `STEP ${applyStep} OF 2`}
                </span>
                <h2 className="mt-2 text-xl font-extrabold">
                  {applyDone ? "Listing submitted" : "Apply to tutor on JomDekan"}
                </h2>
                <p className="mt-1 text-sm font-medium text-[#C6C2EC]">
                  {applyDone
                    ? "Your listing is live in the marketplace for students to find."
                    : applyStep === 2
                      ? "Review and accept the tutor terms to publish your listing."
                      : "Tell us what you can teach and how students can reach you."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeApply}
                aria-label="Close"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {applyDone ? (
              <div className="flex flex-col items-center gap-3 p-10 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E4F5EC] text-[#1B7A55]">
                  <Check className="h-7 w-7" aria-hidden="true" />
                </span>
                <p className="max-w-sm text-sm text-slate-500">
                  Students can now find and message you from the tutoring page. You can close your listing any time from
                  the marketplace.
                </p>
                <button type="button" onClick={closeApply} className="mt-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-700">
                  Back to tutoring
                </button>
              </div>
            ) : applyStep === 1 ? (
              <div className="flex max-h-[65vh] flex-col gap-5 overflow-y-auto p-[22px]">
                <section className="flex flex-col gap-3">
                  <h3 className="text-xs font-bold tracking-wide text-primary-700">TEACHING DETAILS</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Subjects you can teach" required hint="e.g. CSC510, CS241" value={form.subjects} onChange={(v) => updateForm("subjects", v)} />
                    <Field label="Hourly rate (RM)" required hint="e.g. 25" type="number" inputMode="decimal" min="0.01" step="0.01" invalid={!!form.rate && !rateOk} value={form.rate} onChange={(v) => /^\d*(\.\d{0,2})?$/.test(v) && updateForm("rate", v)} />
                    <Field label="Year / level" required hint="e.g. 3" type="number" inputMode="numeric" min="1" step="1" invalid={!!form.level && !levelOk} value={form.level} onChange={(v) => /^\d*$/.test(v) && updateForm("level", v)} />
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-slate-500">
                        Preferred mode<span className="text-red-500"> *</span>
                      </span>
                      <select
                        value={form.mode}
                        onChange={(e) => updateForm("mode", e.target.value as OpportunityMode)}
                        className="h-11 rounded-xl border border-[#E4E3F2] bg-[#FBFBFE] px-3 text-sm font-semibold text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        {(["ONLINE", "PHYSICAL", "HYBRID"] as OpportunityMode[]).map((m) => (
                          <option key={m} value={m}>
                            {MODE_LABEL[m]}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </section>

                <section className="flex flex-col gap-3">
                  <h3 className="text-xs font-bold tracking-wide text-primary-700">
                    CONTACT DETAILS <span className="font-semibold text-slate-400">· all required</span>
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Phone number" required hint="e.g. 60123456789" note="Numbers only · WhatsApp-capable number" inputMode="numeric" invalid={!!form.phone && !phoneOk} value={form.phone} onChange={(v) => /^\d*$/.test(v) && updateForm("phone", v)} />
                    <Field
                      label="Email address"
                      required
                      hint="name@student.uitm.edu.my"
                      note="Student email preferred"
                      invalid={!!form.email && !emailOk}
                      value={form.email}
                      onChange={(v) => updateForm("email", v)}
                    />
                    <Field
                      label="Portfolio / profile link"
                      required
                      hint="https://…"
                      note="Website, LinkedIn, GitHub or Notion"
                      value={form.portfolio}
                      onChange={(v) => updateForm("portfolio", v)}
                    />
                  </div>
                </section>

                <section className="flex flex-col gap-3">
                  <h3 className="text-xs font-bold tracking-wide text-primary-700">QUALIFICATIONS</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Highest qualification" required hint="e.g. Diploma in Computer Science" value={form.qualification} onChange={(v) => updateForm("qualification", v)} />
                    <Field label="CGPA / subject grade" required hint="e.g. 3.72 or A for CSC510" value={form.grade} onChange={(v) => updateForm("grade", v)} />
                  </div>
                  <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-[#D9D7EE] p-3.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F1F0FA] text-primary-700">
                      <UserPlus className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-800">Transcript or result slip</p>
                      <p className="text-xs text-slate-500">Document verification isn&apos;t available yet</p>
                    </div>
                    <button type="button" disabled title="Coming soon" className="cursor-not-allowed rounded-lg border border-[#E4E3F2] px-3 py-2 text-xs font-bold text-slate-400">
                      Choose file
                    </button>
                  </div>
                </section>

                <section className="flex flex-col gap-2">
                  <h3 className="text-xs font-bold tracking-wide text-primary-700">AVAILABILITY</h3>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABILITY_OPTIONS.map((label) => {
                      const on = !!availability[label];
                      return (
                        <button
                          key={label}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setAvailability((a) => ({ ...a, [label]: !a[label] }))}
                          className={`h-9 rounded-full border px-3.5 text-xs font-bold transition motion-safe:duration-150 ${
                            on ? "border-primary-500 bg-primary-50 text-primary-700" : "border-[#E4E3F2] text-slate-600 hover:border-primary-300"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <label className="flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-slate-500">Why you&apos;d be a good tutor</span>
                  <textarea
                    rows={3}
                    placeholder="Grades in the subject, past mentoring, lab demonstrator roles…"
                    value={form.pitch}
                    onChange={(e) => updateForm("pitch", e.target.value)}
                    className="resize-y rounded-xl border border-[#E4E3F2] bg-[#FBFBFE] p-3 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </label>

                <div className="flex flex-wrap justify-end gap-3 border-t border-[#F1F0FA] pt-4">
                  <button type="button" onClick={closeApply} className="rounded-xl border border-[#E4E3F2] px-5 py-3 text-sm font-bold text-slate-700 hover:border-primary-300 hover:text-primary-700">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => step1Ready && setApplyStep(2)}
                    disabled={!step1Ready}
                    title={step1Ready ? undefined : "Fill in every required field, including a valid email"}
                    className={`rounded-xl px-5 py-3 text-sm font-bold transition motion-safe:duration-150 ${
                      step1Ready ? "cursor-pointer bg-primary-600 text-white hover:bg-primary-700" : "cursor-not-allowed bg-slate-200 text-slate-400"
                    }`}
                  >
                    Continue to terms
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4 p-[22px]">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Tutor terms &amp; conditions</h3>
                  <p className="mt-1 text-sm text-slate-500">Tick each item to publish your listing.</p>
                </div>
                <div className="flex flex-col gap-2.5">
                  {TERMS.map((t) => {
                    const on = terms[t.key];
                    return (
                      <button
                        key={t.key}
                        type="button"
                        aria-pressed={on}
                        onClick={() => setTerms((s) => ({ ...s, [t.key]: !s[t.key] }))}
                        className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition motion-safe:duration-150 ${
                          on ? "border-primary-200 bg-primary-50/60" : "border-[#ECEBF7] bg-white hover:border-primary-100"
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border-2 ${
                            on ? "border-primary-600 bg-primary-600 text-white" : "border-slate-300 text-transparent"
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        </span>
                        <span>
                          <span className="block text-sm font-bold text-slate-900">{t.title}</span>
                          <span className="mt-0.5 block text-xs text-slate-500">{t.body}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs font-semibold text-slate-400">
                  By registering you confirm your details are accurate and consent to JomDekan reviewing your listing.
                </p>
                <div className="flex flex-wrap justify-between gap-3 border-t border-[#F1F0FA] pt-4">
                  <button type="button" onClick={() => setApplyStep(1)} className="rounded-xl border border-[#E4E3F2] px-5 py-3 text-sm font-bold text-slate-700 hover:border-primary-300 hover:text-primary-700">
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!termsReady || submitting}
                    title={termsReady ? undefined : "Accept all five terms to register"}
                    className={`rounded-xl px-5 py-3 text-sm font-bold transition motion-safe:duration-150 ${
                      termsReady && !submitting ? "cursor-pointer bg-[#F5C21A] text-[#231C57] hover:bg-[#FFD24D]" : "cursor-not-allowed bg-slate-200 text-slate-400"
                    }`}
                  >
                    {submitting ? "Submitting…" : "Register as tutor"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Apply / inquire to an existing tutor listing — reuses the same
          real applyToOpportunity mutation the generic marketplace uses. */}
      {selectedOpp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold text-slate-900">Submit application</h3>
            <form onSubmit={handleApplyToTutor} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Cover message / approach</label>
                <textarea
                  rows={4}
                  value={coverMessage}
                  onChange={(e) => setCoverMessage(e.target.value)}
                  placeholder="Explain what you need help with…"
                  className="w-full rounded-xl border border-slate-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setSelectedOpp(null)} className="rounded-full px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
                  Cancel
                </button>
                <button type="submit" className="rounded-full bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700">
                  Send application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tutor detail view — opened by clicking a card. Shows the real
          contact info the tutor submitted (currently buried in the
          description text and shown nowhere else), so a student can
          actually reach them directly, plus a way into the existing
          apply/inquire flow. */}
      {detailOpp && (() => {
        const parsed = parseTutorListing(detailOpp.description);
        const ModeIcon = MODE_ICON[detailOpp.mode];
        const subjectTags = parsed.subjects
          ? parsed.subjects.split(",").map((s) => s.trim()).filter(Boolean)
          : [];
        const initials = (detailOpp.owner_name || "JD")
          .split(" ")
          .map((p) => p[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();

        return (
          <div role="dialog" aria-modal="true" aria-label="Tutor details" className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-8">
            <div className="w-full max-w-[560px] overflow-hidden rounded-[24px] bg-white shadow-2xl">
              <div
                className="flex items-start justify-between gap-4 p-[22px] text-white"
                style={{ background: "radial-gradient(120% 160% at 88% 8%, #4A3FD1 0%, #2E2372 55%, #231C57 100%)" }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-sm font-bold text-white">
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-extrabold">{detailOpp.owner_name || "A JomDekan student"}</h2>
                    {detailOpp.subject_name && <p className="truncate text-sm font-medium text-[#C6C2EC]">{detailOpp.subject_name}</p>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDetailOppId(null)}
                  aria-label="Close"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <div className="flex max-h-[65vh] flex-col gap-5 overflow-y-auto p-[22px]">
                <div className="flex flex-wrap gap-4">
                  {parsed.rate && (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Rate</p>
                      <p className="text-sm font-extrabold text-slate-900">{parsed.rate}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Mode</p>
                    <p className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
                      <ModeIcon className="h-3.5 w-3.5" aria-hidden="true" />
                      {MODE_LABEL[detailOpp.mode]}
                    </p>
                  </div>
                  {parsed.level && (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Year / level</p>
                      <p className="text-sm font-bold text-slate-700">{parsed.level}</p>
                    </div>
                  )}
                </div>

                {subjectTags.length > 0 && (
                  <section>
                    <h3 className="text-xs font-bold tracking-wide text-primary-700">SUBJECTS TAUGHT</h3>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {subjectTags.map((s) => (
                        <span key={s} className="rounded-full bg-[#F1F0FA] px-2.5 py-1 text-[11px] font-bold text-primary-700">
                          {s}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {parsed.qualification && (
                  <section className="flex items-start gap-3 rounded-xl border border-[#ECEBF7] p-3.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#F1F0FA] text-primary-700">
                      <GraduationCap className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800">Qualification</p>
                      <p className="text-xs text-slate-500">{parsed.qualification}</p>
                    </div>
                  </section>
                )}

                {parsed.availability && (
                  <section>
                    <h3 className="text-xs font-bold tracking-wide text-primary-700">AVAILABILITY</h3>
                    <p className="mt-1.5 text-sm text-slate-600">{parsed.availability}</p>
                  </section>
                )}

                {parsed.pitch && (
                  <section>
                    <h3 className="text-xs font-bold tracking-wide text-primary-700">WHY THIS TUTOR</h3>
                    <p className="mt-1.5 whitespace-pre-line text-sm text-slate-600">{parsed.pitch}</p>
                  </section>
                )}

                {!parsed.subjects && !parsed.rate && (
                  <p className="whitespace-pre-line text-sm text-slate-600">{detailOpp.description}</p>
                )}

                {(parsed.phone || parsed.email || parsed.portfolio) && (
                  <section className="flex flex-col gap-2 rounded-xl bg-[#F8F8FD] p-4">
                    <h3 className="text-xs font-bold tracking-wide text-primary-700">CONTACT</h3>
                    {parsed.phone && (
                      <a href={`tel:${parsed.phone.replace(/\s+/g, "")}`} className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-primary-700">
                        <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {parsed.phone}
                      </a>
                    )}
                    {parsed.email && (
                      <a href={`mailto:${parsed.email}`} className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-primary-700">
                        <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                        {parsed.email}
                      </a>
                    )}
                    {parsed.portfolio && (
                      <a
                        href={parsed.portfolio.startsWith("http") ? parsed.portfolio : `https://${parsed.portfolio}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 truncate text-sm font-semibold text-slate-700 hover:text-primary-700"
                      >
                        <LinkIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{parsed.portfolio}</span>
                      </a>
                    )}
                  </section>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-[#F1F0FA] p-[22px]">
                <button
                  type="button"
                  onClick={() => setDetailOppId(null)}
                  className="rounded-xl border border-[#E4E3F2] px-5 py-3 text-sm font-bold text-slate-700 hover:border-primary-300 hover:text-primary-700"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOpp(detailOpp.id);
                    setDetailOppId(null);
                  }}
                  className="rounded-xl bg-primary-600 px-5 py-3 text-sm font-bold text-white hover:bg-primary-700"
                >
                  Apply / Inquire
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function Field({
  label,
  hint,
  note,
  required,
  invalid,
  value,
  onChange,
  type = "text",
  inputMode,
  min,
  step,
}: {
  label: string;
  hint: string;
  note?: string;
  required?: boolean;
  invalid?: boolean;
  value: string;
  onChange: (v: string) => void;
  type?: React.HTMLInputTypeAttribute;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  min?: string;
  step?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-bold text-slate-500">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <input
        type={type}
        inputMode={inputMode}
        min={min}
        step={step}
        placeholder={hint}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-11 rounded-xl border px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
          invalid ? "border-red-300" : "border-[#E4E3F2] focus:border-primary-500"
        }`}
      />
      {note && <span className="text-[11px] font-semibold text-slate-400">{note}</span>}
    </label>
  );
}
