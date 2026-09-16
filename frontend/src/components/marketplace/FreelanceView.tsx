import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { Briefcase, Plus, X, Check, Phone, Mail, Link as LinkIcon, PenLine, ShieldCheck, Rocket, Handshake, Info, ChevronDown, Download, UserRound, ThumbsUp, ThumbsDown } from "lucide-react";
import { useOpportunities, useMyOpportunities, useOpportunityApplications, useDecideApplication } from "../../hooks/useOpportunities";
import { opportunityService } from "../../service/opportunityService";
import { useCurrentUser } from "../../hooks/useAuth";
import { useToast } from "../../context/ToastContext";
import { EmptyState } from "../common/EmptyState";
import { FavoriteButton } from "../common/FavoriteButton";
import { ReportButton } from "../common/ReportButton";
import { MarketplaceCardSkeleton } from "./MarketplaceCardSkeleton";
import type { Opportunity, OpportunityApplication, OpportunityApplicationStatus, OpportunityMode } from "../../types/opportunity";
import { useMinimumLoading } from "../../hooks/useMinimumLoading";
import { cardClassName } from "../common/cards";

const MODE_LABEL: Record<OpportunityMode, string> = {
  ONLINE: "Remote",
  PHYSICAL: "On campus",
  HYBRID: "Hybrid",
};

const SKILL_OPTIONS = ["Design", "Web dev", "Mobile dev", "Copywriting", "Video", "Data entry"];

function applicationStatusBadge(status: OpportunityApplicationStatus | null | undefined) {
  if (status === "pending") return { label: "Application pending", className: "bg-amber-50 text-amber-700" };
  if (status === "accepted") return { label: "Application accepted", className: "bg-emerald-50 text-emerald-700" };
  if (status === "declined") return { label: "Application declined", className: "bg-rose-50 text-rose-700" };
  return null;
}

const HOW_IT_WORKS = [
  {
    n: "1",
    icon: PenLine,
    accent: "from-violet-500 to-indigo-600",
    wash: "bg-violet-50",
    title: "Post your listing",
    body: "Job details, budget, deadline and contact details — about five minutes.",
  },
  {
    n: "2",
    icon: ShieldCheck,
    accent: "from-amber-400 to-orange-500",
    wash: "bg-amber-50",
    title: "Accept the poster terms",
    body: "Including that JomDekan only lists your opportunity and isn't responsible for what happens afterward.",
  },
  {
    n: "3",
    icon: Rocket,
    accent: "from-teal-400 to-emerald-600",
    wash: "bg-teal-50",
    title: "Your listing goes live",
    body: "It appears here for students to find and apply to. Admins can still close a listing that breaks the academic-integrity policy.",
  },
  {
    n: "4",
    icon: Handshake,
    accent: "from-rose-400 to-pink-600",
    wash: "bg-rose-50",
    title: "Students apply directly to you",
    body: "You review applicants and agree on payment and delivery directly — JomDekan doesn't process payments or verify the work.",
  },
];

const TERMS = [
  {
    key: "legit",
    title: "Genuine paid work",
    body: "This is real, lawful work with a real budget — not an unpaid “exposure” task or a recruitment funnel.",
  },
  {
    key: "integrity",
    title: "No academic dishonesty",
    body: "I will not ask a student to write, sit or complete any assignment, test or assessed submission on someone's behalf.",
  },
  {
    key: "pay",
    title: "Pay on agreed terms",
    body: "I will pay the agreed amount for work delivered as agreed. JomDekan does not process, hold or guarantee any payment.",
  },
  {
    key: "accurate",
    title: "Accurate listing",
    body: "My scope, budget, deadline and contact details are accurate, and I accept moderator review or removal of this listing.",
  },
  {
    key: "liability",
    title: "JomDekan's role and liability",
    body: "I understand JomDekan only lists this opportunity. JomDekan is not a party to, and holds no responsibility for, the outcome, payment, quality, safety, or any dispute arising between me and the student(s) who respond to it.",
  },
] as const;

type TermKey = (typeof TERMS)[number]["key"];

interface PostForm {
  title: string;
  org: string;
  budget: string;
  paymentType: string;
  mode: OpportunityMode;
  closes: string;
  phone: string;
  email: string;
  brief: string;
  scope: string;
}

const EMPTY_FORM: PostForm = {
  title: "",
  org: "",
  budget: "",
  paymentType: "",
  mode: "ONLINE",
  closes: "",
  phone: "",
  email: "",
  brief: "",
  scope: "",
};

// New listings from this form always write a labeled block into the
// existing `description` column (no schema change) — parsed back out
// below for display. Anything posted before this form existed (or
// posted elsewhere) just falls back to showing the raw description.
function buildDescription(f: PostForm, skills: string[]) {
  return [
    `Organisation/client: ${f.org}`,
    `Budget: RM ${f.budget}`,
    `Payment type: ${f.paymentType}`,
    `Applications close: ${f.closes}`,
    skills.length ? `Skills needed: ${skills.join(", ")}` : null,
    `Contact: ${f.phone} · ${f.email}`,
    `Brief/website: ${f.brief}`,
    `\n${f.scope.trim()}`,
  ]
    .filter(Boolean)
    .join("\n");
}

interface ParsedListing {
  org?: string;
  budget?: string;
  paymentType?: string;
  closes?: string;
  skills: string[];
  phone?: string;
  email?: string;
  brief?: string;
  scope?: string;
}

function parseListing(description: string): ParsedListing {
  const result: ParsedListing = { skills: [] };
  const scopeLines: string[] = [];
  let inScope = false;

  for (const raw of description.split("\n")) {
    const line = raw.trim();
    if (!line) {
      if (result.org !== undefined || result.budget !== undefined || result.brief !== undefined) inScope = true;
      continue;
    }
    if (!inScope) {
      const match = line.match(/^(Organisation\/client|Budget|Payment type|Applications close|Skills needed|Contact|Brief\/website):\s*(.*)$/);
      if (match) {
        const [, key, value] = match;
        if (key === "Organisation/client") result.org = value;
        else if (key === "Budget") result.budget = value;
        else if (key === "Payment type") result.paymentType = value;
        else if (key === "Applications close") result.closes = value;
        else if (key === "Skills needed") result.skills = value.split(",").map((s) => s.trim()).filter(Boolean);
        else if (key === "Brief/website") result.brief = value;
        else if (key === "Contact") {
          const [phone, email] = value.split("·").map((s) => s.trim());
          result.phone = phone;
          result.email = email;
        }
        continue;
      }
    }
    inScope = true;
    scopeLines.push(line);
  }

  if (scopeLines.length) result.scope = scopeLines.join("\n").trim();
  return result;
}

export function FreelanceView({ initialDetailId = null }: { initialDetailId?: string | null }) {
  const currentUser = useCurrentUser();
  const toast = useToast();
  const { opportunities, isLoading, createOpportunity, applyToOpportunity } = useOpportunities();
  const { myOpportunities, isLoading: isLoadingMine } = useMyOpportunities();
  const showSkeleton = useMinimumLoading(isLoading, 600);

  const [view, setView] = useState<"browse" | "mine">("browse");

  const gigs = useMemo(
    () => (opportunities as Opportunity[]).filter((o) => o.listing_type !== "TUTORING" && o.status === "active"),
    [opportunities],
  );

  const myGigs = useMemo(
    () => (myOpportunities as Opportunity[]).filter((o) => o.listing_type !== "TUTORING"),
    [myOpportunities],
  );

  const [howOpen, setHowOpen] = useState(false);

  const [postOpen, setPostOpen] = useState(false);
  const [postStep, setPostStep] = useState<1 | 2>(1);
  const [postDone, setPostDone] = useState(false);
  const [form, setForm] = useState<PostForm>(EMPTY_FORM);
  const [skills, setSkills] = useState<Record<string, boolean>>({});
  const [customSkills, setCustomSkills] = useState<string[]>([]);
  const [customSkillInput, setCustomSkillInput] = useState("");
  const [terms, setTerms] = useState<Record<TermKey, boolean>>({
    legit: false,
    integrity: false,
    pay: false,
    accurate: false,
    liability: false,
  });
  const [submitting, setSubmitting] = useState(false);

  const [selectedOpp, setSelectedOpp] = useState<string | null>(null);
  const [coverMessage, setCoverMessage] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvUrl, setCvUrl] = useState("");
  const [portfolioFile, setPortfolioFile] = useState<File | null>(null);
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [applying, setApplying] = useState(false);
  const [detailOppId, setDetailOppId] = useState<string | null>(initialDetailId);
  const detailOpp = gigs.find((g) => g.id === detailOppId) ?? null;

  function addCustomSkill() {
    const trimmed = customSkillInput.trim();
    if (!trimmed || customSkills.includes(trimmed)) return;
    setCustomSkills((s) => [...s, trimmed]);
    setCustomSkillInput("");
  }

  function updateForm<K extends keyof PostForm>(key: K, value: PostForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function openPost() {
    setPostOpen(true);
    setPostDone(false);
    setPostStep(1);
  }
  function closePost() {
    setPostOpen(false);
  }

  const emailOk = /.+@.+\..+/.test(form.email);
  const budgetOk = /^\d+(\.\d{1,2})?$/.test(form.budget) && Number(form.budget) > 0;
  const closeDateOk = /^\d{4}-\d{2}-\d{2}$/.test(form.closes) && !Number.isNaN(Date.parse(`${form.closes}T00:00:00`));
  const phoneOk = /^\d+$/.test(form.phone);
  const step1Ready =
    form.title.trim() &&
    form.org.trim() &&
    budgetOk &&
    form.paymentType.trim() &&
    closeDateOk &&
    form.scope.trim().length >= 20 &&
    phoneOk &&
    emailOk &&
    form.brief.trim();
  const termsReady = Object.values(terms).every(Boolean);

  async function handleSubmit() {
    if (!termsReady) return;
    setSubmitting(true);
    const skillList = [
      ...Object.entries(skills)
        .filter(([, on]) => on)
        .map(([label]) => label),
      ...customSkills,
    ];

    try {
      await createOpportunity({
        title: form.title.slice(0, 120),
        description: buildDescription(form, skillList),
        // No dedicated "freelance" category exists in the backend yet —
        // PROJECT_MENTORSHIP is the closest existing listing type, so
        // freelance gigs post under that rather than fabricating a new
        // enum value.
        listingType: "PROJECT_MENTORSHIP",
        mode: form.mode,
        applicationDeadline: form.closes || undefined,
      });
      setPostDone(true);
      setForm(EMPTY_FORM);
      setSkills({});
      setCustomSkills([]);
      setCustomSkillInput("");
      setTerms({ legit: false, integrity: false, pay: false, accurate: false, liability: false });
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data as { error?: { message?: string } })?.error?.message
        : undefined;
      toast.error(message || "Failed to post your listing");
    } finally {
      setSubmitting(false);
    }
  }

  function resetApplyForm() {
    setSelectedOpp(null);
    setCoverMessage("");
    setCvFile(null);
    setCvUrl("");
    setPortfolioFile(null);
    setPortfolioUrl("");
  }

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedOpp) return;
    setApplying(true);
    try {
      await applyToOpportunity({
        opportunityId: selectedOpp,
        coverMessage,
        cvFile: cvFile ?? undefined,
        cvUrl: cvUrl.trim() || undefined,
        portfolioFile: portfolioFile ?? undefined,
        portfolioUrl: portfolioUrl.trim() || undefined,
      });
      resetApplyForm();
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data as { error?: { message?: string } })?.error?.message
        : undefined;
      toast.error(message || "Failed to submit application");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Freelance Opportunities</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Paid student gigs from campus clubs, startups and lecturers.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={openPost}
            className="flex items-center gap-2 rounded-xl bg-[#F5C21A] px-4 py-2.5 text-sm font-bold text-[#231C57] transition motion-safe:duration-150 hover:-translate-y-0.5 hover:bg-[#FFD24D] active:translate-y-0"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Post an opportunity
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

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
        Every listing is manually reviewed. Academic ghost-writing requests are rejected and reported.
      </div>

      {currentUser && (
        <div className="inline-flex w-fit rounded-xl border border-[#E4E3F2] bg-white p-1">
          <button
            type="button"
            onClick={() => setView("browse")}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition motion-safe:duration-150 ${
              view === "browse" ? "bg-primary-600 text-white" : "text-slate-600 hover:text-primary-700"
            }`}
          >
            Browse
          </button>
          <button
            type="button"
            onClick={() => setView("mine")}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition motion-safe:duration-150 ${
              view === "mine" ? "bg-primary-600 text-white" : "text-slate-600 hover:text-primary-700"
            }`}
          >
            My listings
          </button>
        </div>
      )}

      {view === "mine" ? (
        <MyListings listings={myGigs} isLoading={isLoadingMine} onPost={openPost} />
      ) : (
        <>
      {howOpen && (
        <section className="relative flex flex-col gap-5 overflow-hidden rounded-[24px] border border-[#DDD9F1] bg-white p-5 shadow-[0_14px_40px_rgba(67,56,202,0.08)] motion-safe:animate-[modalRise_240ms_ease-out] sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-violet-200/35 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 h-40 w-40 rounded-full bg-amber-100/50 blur-3xl" />
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="relative">
              <span className="inline-flex rounded-full bg-[#EFEEFB] px-3 py-1 text-[11px] font-bold uppercase tracking-[.16em] text-[#4338CA]">Simple and transparent</span>
              <h2 className="mt-2 text-xl font-bold text-slate-900">How freelance opportunities work</h2>
              <p className="mt-1 text-sm text-slate-500">Four clear steps from posting to getting work done.</p>
            </div>
            <button
              type="button"
              onClick={() => setHowOpen(false)}
              aria-label="Close"
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#E4E3F2] bg-white text-slate-500 shadow-sm transition motion-safe:duration-200 hover:rotate-90 hover:border-violet-200 hover:bg-violet-50 hover:text-[#4338CA]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {HOW_IT_WORKS.map((s, index) => (
              <div key={s.n} className={`group relative overflow-hidden rounded-2xl border border-[#E8E5F7] ${s.wash} p-5 transition motion-safe:duration-300 motion-safe:animate-[notificationRise_320ms_ease-out_both] hover:-translate-y-1 hover:border-violet-200 hover:shadow-lg`} style={{ animationDelay: `${index * 80}ms` }}>
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${s.accent}`} />
                <div className="flex items-start justify-between gap-3">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${s.accent} text-white shadow-md transition motion-safe:duration-300 group-hover:rotate-3 group-hover:scale-110`}><s.icon className="h-5 w-5" aria-hidden="true" /></span>
                  <span className="text-3xl font-black text-slate-900/10 transition group-hover:text-[#4338CA]/20">0{s.n}</span>
                </div>
                <p className="mt-4 text-sm font-bold text-slate-800 transition group-hover:text-[#332475]">{s.title}</p>
                <p className="mt-1.5 text-xs leading-5 text-slate-600">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="relative flex items-start gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-violet-50 p-4 text-xs font-semibold leading-5 text-slate-700">
            <span className="rounded-xl bg-[#F5C21A] p-2 text-[#231C57] shadow-sm"><Info className="h-4 w-4" aria-hidden="true" /></span>
            <p>JomDekan only lists opportunities — we're not a party to any arrangement between a poster and a student, and aren't responsible for payment, delivery, or what happens afterward. Ghost-writing or completing graded work for someone is never allowed.</p>
          </div>
        </section>
      )}

      {showSkeleton ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <MarketplaceCardSkeleton key={i} />
          ))}
        </div>
      ) : gigs.length === 0 ? (
        <EmptyState icon={Briefcase} title="No opportunities posted yet" description="Be the first to post one — students will see it here.">
          <button
            type="button"
            onClick={openPost}
            className="mt-6 rounded-full bg-primary-600 px-5 py-2.5 text-sm font-medium text-white transition motion-safe:duration-150 hover:-translate-y-0.5 hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            Post an opportunity
          </button>
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-4">
          {gigs.map((opp) => {
            const parsed = parseListing(opp.description);
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
                className={cardClassName("opportunity", "flex cursor-pointer flex-wrap items-center gap-4 text-left")}
              >
                <div className="min-w-0 flex-1">
                  <h3 className="text-[16px] font-bold text-slate-900">{opp.title}</h3>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {parsed.org || opp.owner_name || "A JomDekan student"} &middot; {MODE_LABEL[opp.mode]}
                    {parsed.closes ? ` · closes ${parsed.closes}` : ""}
                  </p>
                  {parsed.skills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {parsed.skills.map((s) => (
                        <span key={s} className="rounded-full bg-[#F1F0FA] px-2.5 py-1 text-[11px] font-bold text-slate-600">
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                  {!parsed.budget && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{opp.description}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  {parsed.budget && <span className="text-lg font-extrabold text-[#2E2372]">{parsed.budget}</span>}
                  <FavoriteButton targetType="opportunity" targetId={opp.id} />
                  <ReportButton targetType="opportunity" targetId={opp.id} />
                  {opp.owner_id !== currentUser?.id && (() => {
                    const badge = applicationStatusBadge(opp.my_application_status);
                    return badge ? (
                      <span className={`rounded-xl px-5 py-2.5 text-sm font-bold ${badge.className}`}>{badge.label}</span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOpp(opp.id);
                        }}
                        className="rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white transition motion-safe:duration-150 hover:-translate-y-0.5 hover:bg-primary-700"
                      >
                        Apply
                      </button>
                    );
                  })()}
                </div>
              </article>
            );
          })}
        </div>
      )}
        </>
      )}

      {/* Post-a-listing modal */}
      {postOpen && createPortal(
        <div role="dialog" aria-modal="true" aria-label="Post a freelance opportunity" className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-8">
          <div className="w-full max-w-[640px] overflow-hidden rounded-[24px] bg-white shadow-2xl">
            <div
              className="flex items-start justify-between gap-4 p-[22px] text-white"
              style={{ background: "radial-gradient(120% 160% at 88% 8%, #4A3FD1 0%, #2E2372 55%, #231C57 100%)" }}
            >
              <div className="min-w-0">
                <span className="inline-block rounded-full bg-[rgba(245,194,26,.2)] px-2.5 py-1 text-[11px] font-bold tracking-wide text-[#FFE9A6]">
                  {postDone ? "DONE" : `STEP ${postStep} OF 2`}
                </span>
                <h2 className="mt-2 text-xl font-extrabold">
                  {postDone ? "Listing submitted" : "Post a freelance opportunity"}
                </h2>
                <p className="mt-1 text-sm font-medium text-[#C6C2EC]">
                  {postDone
                    ? "Your listing is live in the marketplace for students to find."
                    : postStep === 2
                      ? "Review and accept the poster terms to publish your listing."
                      : "Describe the work, the budget and how students can reach you."}
                </p>
              </div>
              <button
                type="button"
                onClick={closePost}
                aria-label="Close"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {postDone ? (
              <div className="flex flex-col items-center gap-3 p-10 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E4F5EC] text-[#1B7A55]">
                  <Check className="h-7 w-7" aria-hidden="true" />
                </span>
                <p className="max-w-sm text-sm text-slate-500">
                  Students can now find and apply to your listing from this page. You can close it any time from the
                  marketplace.
                </p>
                <button type="button" onClick={closePost} className="mt-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-700">
                  Back to opportunities
                </button>
              </div>
            ) : postStep === 1 ? (
              <div className="flex max-h-[65vh] flex-col gap-5 overflow-y-auto p-[22px]">
                <section className="flex flex-col gap-3">
                  <h3 className="text-xs font-bold tracking-wide text-primary-700">JOB DETAILS</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Job title" required hint="e.g. Poster design for MPP Week" value={form.title} onChange={(v) => updateForm("title", v)} />
                    <Field label="Organisation / client" required hint="e.g. UiTM Student Council" value={form.org} onChange={(v) => updateForm("org", v)} />
                    <Field label="Budget (RM)" required hint="e.g. 250" type="number" inputMode="decimal" min="0.01" step="0.01" invalid={!!form.budget && !budgetOk} value={form.budget} onChange={(v) => /^\d*(\.\d{0,2})?$/.test(v) && updateForm("budget", v)} />
                    <Field label="Payment type" required hint="Fixed, hourly or milestone" value={form.paymentType} onChange={(v) => updateForm("paymentType", v)} />
                    <label className="flex flex-col gap-1.5">
                      <span className="text-xs font-bold text-slate-500">
                        Work mode / location<span className="text-red-500"> *</span>
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
                    <Field label="Applications close" required hint="YYYY-MM-DD" type="date" invalid={!!form.closes && !closeDateOk} value={form.closes} onChange={(v) => updateForm("closes", v)} />
                  </div>
                  <label className="flex flex-col gap-1.5">
                    <span className="text-xs font-bold text-slate-500">
                      Scope of work<span className="text-red-500"> *</span>
                    </span>
                    <textarea
                      rows={4}
                      placeholder="Deliverables, timeline, tools, and what a good submission looks like…"
                      value={form.scope}
                      onChange={(e) => updateForm("scope", e.target.value)}
                      className="resize-y rounded-xl border border-[#E4E3F2] bg-[#FBFBFE] p-3 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </label>
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
                      hint="name@organisation.com"
                      note="Applications are sent here"
                      invalid={!!form.email && !emailOk}
                      value={form.email}
                      onChange={(v) => updateForm("email", v)}
                    />
                    <Field label="Brief / website link" required hint="https://…" note="Full brief, portfolio spec or company page" value={form.brief} onChange={(v) => updateForm("brief", v)} />
                  </div>
                </section>

                <section className="flex flex-col gap-2">
                  <h3 className="text-xs font-bold tracking-wide text-primary-700">SKILLS NEEDED</h3>
                  <div className="flex flex-wrap gap-2">
                    {SKILL_OPTIONS.map((label) => {
                      const on = !!skills[label];
                      return (
                        <button
                          key={label}
                          type="button"
                          aria-pressed={on}
                          onClick={() => setSkills((s) => ({ ...s, [label]: !s[label] }))}
                          className={`h-9 rounded-full border px-3.5 text-xs font-bold transition motion-safe:duration-150 ${
                            on ? "border-primary-500 bg-primary-50 text-primary-700" : "border-[#E4E3F2] text-slate-600 hover:border-primary-300"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                    {customSkills.map((label) => (
                      <span
                        key={label}
                        className="flex h-9 items-center gap-1.5 rounded-full border border-primary-500 bg-primary-50 pl-3.5 pr-2 text-xs font-bold text-primary-700"
                      >
                        {label}
                        <button
                          type="button"
                          onClick={() => setCustomSkills((s) => s.filter((skill) => skill !== label))}
                          aria-label={`Remove ${label}`}
                          className="rounded-full p-0.5 text-primary-600 hover:bg-primary-100"
                        >
                          <X className="h-3 w-3" aria-hidden="true" />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      value={customSkillInput}
                      onChange={(e) => setCustomSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCustomSkill();
                        }
                      }}
                      placeholder="Add a skill that isn't listed above…"
                      className="h-9 flex-1 rounded-full border border-[#E4E3F2] bg-[#FBFBFE] px-3.5 text-xs font-semibold text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <button
                      type="button"
                      onClick={addCustomSkill}
                      disabled={!customSkillInput.trim()}
                      className="flex h-9 items-center gap-1 rounded-full bg-primary-600 px-3.5 text-xs font-bold text-white transition motion-safe:duration-150 hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      Add
                    </button>
                  </div>
                </section>

                <div className="flex flex-wrap justify-end gap-3 border-t border-[#F1F0FA] pt-4">
                  <button type="button" onClick={closePost} className="rounded-xl border border-[#E4E3F2] px-5 py-3 text-sm font-bold text-slate-700 hover:border-primary-300 hover:text-primary-700">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => step1Ready && setPostStep(2)}
                    disabled={!step1Ready}
                    title={step1Ready ? undefined : "Fill in every required field, including scope of work and a valid email"}
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
                  <h3 className="text-lg font-bold text-slate-900">Poster terms &amp; conditions</h3>
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
                  By posting you confirm this listing is accurate and lawful, and accept moderator review or removal.
                </p>
                <div className="flex flex-wrap justify-between gap-3 border-t border-[#F1F0FA] pt-4">
                  <button type="button" onClick={() => setPostStep(1)} className="rounded-xl border border-[#E4E3F2] px-5 py-3 text-sm font-bold text-slate-700 hover:border-primary-300 hover:text-primary-700">
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!termsReady || submitting}
                    title={termsReady ? undefined : "Accept all five terms to publish"}
                    className={`rounded-xl px-5 py-3 text-sm font-bold transition motion-safe:duration-150 ${
                      termsReady && !submitting ? "cursor-pointer bg-[#F5C21A] text-[#231C57] hover:bg-[#FFD24D]" : "cursor-not-allowed bg-slate-200 text-slate-400"
                    }`}
                  >
                    {submitting ? "Publishing…" : "Publish listing"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}

      {/* Apply to an existing listing — reuses the same real
          applyToOpportunity mutation the tutoring/generic marketplace
          views use. */}
      {selectedOpp && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 py-8">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-bold text-slate-900">Submit application</h3>
            <form onSubmit={handleApply} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Cover message / approach</label>
                <textarea
                  rows={4}
                  value={coverMessage}
                  onChange={(e) => setCoverMessage(e.target.value)}
                  placeholder="Explain how you plan to help or deliver this…"
                  className="w-full rounded-xl border border-slate-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  CV <span className="font-semibold text-slate-400">· optional</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,image/jpeg,image/png"
                  onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-primary-700 hover:file:bg-primary-100"
                />
                <input
                  type="url"
                  value={cvUrl}
                  onChange={(e) => setCvUrl(e.target.value)}
                  placeholder="…or paste a link (Google Drive, etc.)"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Portfolio <span className="font-semibold text-slate-400">· optional</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,image/jpeg,image/png"
                  onChange={(e) => setPortfolioFile(e.target.files?.[0] ?? null)}
                  className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-primary-50 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-primary-700 hover:file:bg-primary-100"
                />
                <input
                  type="url"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  placeholder="…or paste a link (website, Behance, etc.)"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 p-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={resetApplyForm} className="rounded-full px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={applying}
                  className="rounded-full bg-primary-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {applying ? "Sending…" : "Send application"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      )}

      {/* Listing detail view — opened by clicking a card. Shows the real
          contact info the poster submitted (currently buried in the
          description text and shown nowhere else), so a student can
          actually reach them directly, plus a way into the existing
          apply flow. */}
      {detailOpp && (() => {
        const parsed = parseListing(detailOpp.description);
        return createPortal(
          <div role="dialog" aria-modal="true" aria-label="Listing details" className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 py-8">
            <div className="w-full max-w-[560px] overflow-hidden rounded-[24px] bg-white shadow-2xl">
              <div
                className="flex items-start justify-between gap-4 p-[22px] text-white"
                style={{ background: "radial-gradient(120% 160% at 88% 8%, #4A3FD1 0%, #2E2372 55%, #231C57 100%)" }}
              >
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-extrabold">{detailOpp.title}</h2>
                  <p className="mt-1 truncate text-sm font-medium text-[#C6C2EC]">
                    {parsed.org || detailOpp.owner_name || "A JomDekan student"}
                  </p>
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
                  {parsed.budget && (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Budget</p>
                      <p className="text-sm font-extrabold text-slate-900">{parsed.budget}</p>
                    </div>
                  )}
                  {parsed.paymentType && (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Payment type</p>
                      <p className="text-sm font-bold text-slate-700">{parsed.paymentType}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Mode</p>
                    <p className="text-sm font-bold text-slate-700">{MODE_LABEL[detailOpp.mode]}</p>
                  </div>
                  {parsed.closes && (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Applications close</p>
                      <p className="text-sm font-bold text-slate-700">{parsed.closes}</p>
                    </div>
                  )}
                </div>

                {parsed.skills.length > 0 && (
                  <section>
                    <h3 className="text-xs font-bold tracking-wide text-primary-700">SKILLS NEEDED</h3>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {parsed.skills.map((s) => (
                        <span key={s} className="rounded-full bg-[#F1F0FA] px-2.5 py-1 text-[11px] font-bold text-slate-600">
                          {s}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {parsed.scope && (
                  <section>
                    <h3 className="text-xs font-bold tracking-wide text-primary-700">SCOPE OF WORK</h3>
                    <p className="mt-1.5 whitespace-pre-line text-sm text-slate-600">{parsed.scope}</p>
                  </section>
                )}

                {!parsed.org && !parsed.budget && (
                  <p className="whitespace-pre-line text-sm text-slate-600">{detailOpp.description}</p>
                )}

                {(parsed.phone || parsed.email || parsed.brief) && (
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
                    {parsed.brief && (
                      <a
                        href={parsed.brief.startsWith("http") ? parsed.brief : `https://${parsed.brief}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 truncate text-sm font-semibold text-slate-700 hover:text-primary-700"
                      >
                        <LinkIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="truncate">{parsed.brief}</span>
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
                {detailOpp.owner_id !== currentUser?.id && (() => {
                  const badge = applicationStatusBadge(detailOpp.my_application_status);
                  return badge ? (
                    <span className={`rounded-xl px-5 py-3 text-sm font-bold ${badge.className}`}>{badge.label}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOpp(detailOpp.id);
                        setDetailOppId(null);
                      }}
                      className="rounded-xl bg-primary-600 px-5 py-3 text-sm font-bold text-white hover:bg-primary-700"
                    >
                      Apply
                    </button>
                  );
                })()}
              </div>
            </div>
          </div>,
          document.body,
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

const STATUS_BADGE: Record<Opportunity["status"], string> = {
  active: "bg-emerald-50 text-emerald-700",
  closed: "bg-slate-100 text-slate-500",
};

const APPLICATION_STATUS_BADGE: Record<OpportunityApplication["status"], string> = {
  pending: "bg-amber-50 text-amber-700",
  accepted: "bg-emerald-50 text-emerald-700",
  declined: "bg-red-50 text-red-700",
};

function MyListings({
  listings,
  isLoading,
  onPost,
}: {
  listings: Opportunity[];
  isLoading: boolean;
  onPost: () => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <MarketplaceCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <EmptyState icon={Briefcase} title="You haven't posted any listings yet" description="Post a freelance opportunity to start receiving applications.">
        <button
          type="button"
          onClick={onPost}
          className="mt-6 rounded-full bg-primary-600 px-5 py-2.5 text-sm font-medium text-white transition motion-safe:duration-150 hover:-translate-y-0.5 hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          Post an opportunity
        </button>
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {listings.map((opp) => {
        const expanded = expandedId === opp.id;
        return (
          <div key={opp.id} className="rounded-[20px] border border-[#ECEBF7] bg-white p-[18px]">
            <button
              type="button"
              onClick={() => setExpandedId(expanded ? null : opp.id)}
              className="flex w-full flex-wrap items-center gap-4 text-left"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[16px] font-bold text-slate-900">{opp.title}</h3>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${STATUS_BADGE[opp.status]}`}>
                    {opp.status}
                  </span>
                </div>
                {opp.application_deadline && (
                  <p className="mt-0.5 text-sm text-slate-500">Applications close {opp.application_deadline}</p>
                )}
              </div>
              <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
            {expanded && <ListingApplicantsPanel opportunityId={opp.id} />}
          </div>
        );
      })}
    </div>
  );
}

function ListingApplicantsPanel({ opportunityId }: { opportunityId: string }) {
  const toast = useToast();
  const { applications, isLoading } = useOpportunityApplications(opportunityId);
  const decideMutation = useDecideApplication(opportunityId);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  async function handleDownload(applicationId: string, kind: "cv" | "portfolio", applicantName: string) {
    setDownloadingId(`${applicationId}-${kind}`);
    try {
      await opportunityService.downloadApplicationFile(applicationId, kind, `${applicantName}-${kind}`);
    } catch {
      toast.error("Failed to download the file.");
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleDecide(applicationId: string, status: "accepted" | "declined") {
    try {
      await decideMutation.mutateAsync({ applicationId, status });
    } catch (err) {
      const message = axios.isAxiosError(err)
        ? (err.response?.data as { error?: { message?: string } })?.error?.message
        : undefined;
      toast.error(message || "Failed to update the application");
    }
  }

  if (isLoading) {
    return <p className="mt-4 text-sm text-slate-500">Loading applications…</p>;
  }

  if (applications.length === 0) {
    return <p className="mt-4 text-sm text-slate-500">No applications yet.</p>;
  }

  return (
    <div className="mt-4 flex flex-col gap-3 border-t border-[#F1F0FA] pt-4">
      {applications.map((app) => {
        const name = app.applicant_name || app.applicant_email;
        return (
          <div key={app.id} className="rounded-xl border border-[#ECEBF7] bg-[#FBFBFE] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#EFEEFB] text-[#4338CA]">
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-900">{name}</p>
                  <p className="text-xs text-slate-500">{app.applicant_email}</p>
                </div>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${APPLICATION_STATUS_BADGE[app.status]}`}>
                {app.status}
              </span>
            </div>
            <p className="mt-3 whitespace-pre-line text-sm text-slate-600">{app.cover_message}</p>
            {(app.has_cv || app.cv_url || app.has_portfolio || app.portfolio_url) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {app.has_cv && (
                  <button
                    type="button"
                    onClick={() => handleDownload(app.id, "cv", name)}
                    disabled={downloadingId === `${app.id}-cv`}
                    className="flex items-center gap-1.5 rounded-full border border-[#E4E3F2] px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-primary-300 hover:text-primary-700"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    {downloadingId === `${app.id}-cv` ? "Downloading…" : "Download CV"}
                  </button>
                )}
                {app.cv_url && (
                  <a href={app.cv_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-full border border-[#E4E3F2] px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-primary-300 hover:text-primary-700">
                    <LinkIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    CV link
                  </a>
                )}
                {app.has_portfolio && (
                  <button
                    type="button"
                    onClick={() => handleDownload(app.id, "portfolio", name)}
                    disabled={downloadingId === `${app.id}-portfolio`}
                    className="flex items-center gap-1.5 rounded-full border border-[#E4E3F2] px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-primary-300 hover:text-primary-700"
                  >
                    <Download className="h-3.5 w-3.5" aria-hidden="true" />
                    {downloadingId === `${app.id}-portfolio` ? "Downloading…" : "Download portfolio"}
                  </button>
                )}
                {app.portfolio_url && (
                  <a href={app.portfolio_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-full border border-[#E4E3F2] px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-primary-300 hover:text-primary-700">
                    <LinkIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    Portfolio link
                  </a>
                )}
              </div>
            )}
            {app.status === "pending" && (
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => handleDecide(app.id, "accepted")}
                  disabled={decideMutation.isPending}
                  className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => handleDecide(app.id, "declined")}
                  disabled={decideMutation.isPending}
                  className="flex items-center gap-1.5 rounded-full border border-red-200 px-3.5 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
                  Reject
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
