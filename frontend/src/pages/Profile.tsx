import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import {
  ArrowLeft,
  ChevronRight,
  FileText,
  GraduationCap,
  Info,
  Lightbulb,
  LockKeyhole,
  Mail,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { updateProfileFormSchema, type UpdateProfileFormValues } from "../schemas/profileSchemas";
import { useMyProfile, useMyStats, useUpdateProfile } from "../hooks/useProfile";
import { useForgotPassword } from "../hooks/useAuth";
import { useUniversities } from "../hooks/useTaxonomy";
import { useSubmitSupportRequest } from "../hooks/useSupportRequests";
import { FIELDS_OF_STUDY } from "../constants/fieldsOfStudy";
import { SearchableSelect } from "../components/common/SearchableSelect";
import { TermsModal } from "../components/common/TermsModal";
import { useMinimumLoading } from "../hooks/useMinimumLoading";

const CURRENT_SEMESTER_OPTIONS = Array.from({ length: 10 }, (_, index) => index + 1);

type SettingsSection =
  | "personal"
  | "security"
  | "about"
  | "contact"
  | "suggestions"
  | "terms";

const SECTION_TITLES: Record<SettingsSection, string> = {
  personal: "Personal information",
  security: "Password & security",
  about: "About JomDekan",
  contact: "Contact support",
  suggestions: "Share a suggestion",
  terms: "Terms of service",
};

const CARD_CLASS = "mt-6 rounded-[22px] border border-[#ECEBF7] bg-white p-5 shadow-sm sm:p-6";
const INPUT_CLASS = "h-11 rounded-xl border border-[#E4E3F2] px-3 text-sm font-medium text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";
const TEXTAREA_CLASS = "rounded-xl border border-[#E4E3F2] px-3 py-3 text-sm font-medium text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500";

function isSettingsSection(value: string | null): value is SettingsSection {
  return Boolean(value && value in SECTION_TITLES);
}

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-[18px] py-[22px]" aria-label="Loading profile and settings">
      <div className="h-7 w-52 rounded bg-violet-100" />
      <div className="mt-2 h-4 w-80 max-w-full rounded bg-slate-100" />
      <div className="mt-6 flex items-center gap-4 rounded-[22px] bg-[#332475] p-6">
        <div className="h-16 w-16 rounded-[20px] bg-white/20" />
        <div className="flex-1 space-y-3">
          <div className="h-5 w-40 rounded bg-white/20" />
          <div className="h-4 w-64 max-w-full rounded bg-white/10" />
        </div>
      </div>
      <div className="mt-8 space-y-3">
        <div className="h-4 w-24 rounded bg-violet-100" />
        <div className="overflow-hidden rounded-[22px] border border-[#ECEBF7] bg-white">
          {[0, 1, 2].map((item) => <div key={item} className="h-20 border-b border-[#F1F0F8] last:border-0" />)}
        </div>
      </div>
    </div>
  );
}

function SettingsRow({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex min-h-[76px] w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-[#FAF9FF] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 sm:px-6"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EFEEFB] text-[#4338CA] transition group-hover:bg-[#E3E0FA]">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-slate-800">{title}</span>
        {description && <span className="mt-0.5 block text-xs leading-5 text-slate-500">{description}</span>}
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-primary-500" aria-hidden="true" />
    </button>
  );
}

function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  const headingId = "settings-" + title.toLowerCase();
  return (
    <section className="mt-7" aria-labelledby={headingId}>
      <h2 id={headingId} className="mb-2.5 px-1 text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">
        {title}
      </h2>
      <div className="divide-y divide-[#F1F0F8] overflow-hidden rounded-[22px] border border-[#ECEBF7] bg-white shadow-sm">
        {children}
      </div>
    </section>
  );
}

function DetailHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl pr-3 text-sm font-bold text-primary-700 transition hover:text-primary-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Profile &amp; Settings
      </button>
      <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{title}</h1>
    </div>
  );
}

export default function Profile() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedSection = searchParams.get("section");
  const activeSection = isSettingsSection(requestedSection) ? requestedSection : null;
  const { data: profile, isLoading } = useMyProfile();
  const { data: stats, isLoading: statsLoading } = useMyStats();
  const updateProfile = useUpdateProfile();
  const forgotPassword = useForgotPassword();
  const submitRequest = useSubmitSupportRequest();
  const [resetSent, setResetSent] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [suggestionMessage, setSuggestionMessage] = useState("");
  const showSkeleton = useMinimumLoading(isLoading || statsLoading, 2000);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UpdateProfileFormValues>({ resolver: zodResolver(updateProfileFormSchema) });

  const {
    data: universities,
    isLoading: universitiesLoading,
    isError: universitiesError,
    refetch: refetchUniversities,
  } = useUniversities();
  const universityOptions = (universities ?? []).map((university) => ({ value: university.id, label: university.name }));
  const fieldOfStudyOptions = FIELDS_OF_STUDY.map((field) => ({ value: field, label: field }));

  function resetFromProfile() {
    if (!profile) return;
    reset({
      displayName: profile.displayName,
      email: profile.email,
      phone: profile.phone ?? "",
      academicRole: profile.academicRole,
      universityId: profile.university?.id ?? "",
      fieldOfStudy: (profile.fieldOfStudy ?? "") as UpdateProfileFormValues["fieldOfStudy"],
      currentYear: profile.currentYear ?? 1,
      currentSemester: profile.currentSemester ?? 1,
    });
  }

  useEffect(() => {
    resetFromProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, reset]);

  useEffect(() => {
    setIsEditing(false);
    setResetSent(false);
  }, [activeSection]);

  const onSubmit = (values: UpdateProfileFormValues) => {
    updateProfile.mutate(
      {
        displayName: values.displayName,
        email: values.email,
        phone: values.phone,
        academicRole: values.academicRole,
        universityId: values.universityId,
        fieldOfStudy: values.fieldOfStudy,
        currentYear: values.currentYear,
        currentSemester: values.currentSemester,
      },
      {
        onSuccess: () => setIsEditing(false),
        onError: (error) => {
          const message = axios.isAxiosError(error)
            ? (error.response?.data as { error?: { message?: string } })?.error?.message
            : undefined;
          if (message?.toLowerCase().includes("email")) {
            setError("email", { type: "server", message });
          }
        },
      },
    );
  };

  const rawServerError =
    updateProfile.isError && axios.isAxiosError(updateProfile.error)
      ? (updateProfile.error.response?.data as { error?: { message?: string } })?.error?.message
      : updateProfile.isError
        ? "Something went wrong. Please try again."
        : null;
  const serverError = rawServerError && !rawServerError.toLowerCase().includes("email") ? rawServerError : null;

  function handleSupportSubmit(event: FormEvent) {
    event.preventDefault();
    submitRequest.mutate(
      { type: "SUPPORT", subject: supportSubject, message: supportMessage },
      {
        onSuccess: () => {
          setSupportSubject("");
          setSupportMessage("");
        },
      },
    );
  }

  function handleSuggestionSubmit(event: FormEvent) {
    event.preventDefault();
    submitRequest.mutate(
      { type: "SUGGESTION", message: suggestionMessage },
      { onSuccess: () => setSuggestionMessage("") },
    );
  }

  if (showSkeleton) return <ProfileSkeleton />;
  if (isLoading || !profile) {
    return <div className="mx-auto max-w-6xl px-[18px] py-[22px] text-sm text-slate-500">Loading profile…</div>;
  }

  function openSection(section: SettingsSection) {
    setSearchParams({ section });
  }

  function renderPersonalInformation() {
    return (
      <form onSubmit={handleSubmit(onSubmit)} noValidate className={CARD_CLASS}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-bold text-slate-800">Profile information</h2>
            <p className="mt-1 text-sm text-slate-500">Keep your account and academic details up to date.</p>
          </div>
          {!isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="rounded-xl border border-[#E4E3F2] px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-primary-300 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              Edit information
            </button>
          )}
        </div>

        {serverError && (
          <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {serverError}
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Full name<span className="text-red-500"> *</span></span>
            <input type="text" disabled={!isEditing} className={INPUT_CLASS} aria-invalid={Boolean(errors.displayName)} {...register("displayName")} />
            {errors.displayName && <span className="text-xs text-red-600">{errors.displayName.message}</span>}
          </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Student email<span className="text-red-500"> *</span>
              </span>
              <input
                type="email"
                disabled={!isEditing}
                className="h-11 rounded-xl border border-[#E4E3F2] px-3 text-sm font-medium text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                aria-invalid={Boolean(errors.email)}
                {...register('email')}
              />
              {errors.email && <span className="text-xs text-red-600">{errors.email.message}</span>}
              {isEditing && (
                <span className="text-[11px] text-slate-400">
                  Changing this sends a new verification link to the new address.
                </span>
              )}
            </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Phone number<span className="text-red-500"> *</span></span>
            <input type="tel" disabled={!isEditing} placeholder="+60 12-345 6789" className={INPUT_CLASS} aria-invalid={Boolean(errors.phone)} {...register("phone")} />
            {errors.phone && <span className="text-xs text-red-600">{errors.phone.message}</span>}
            <span className="text-[11px] text-slate-400">Used to auto-fill contact details on forms like reports.</span>
          </label>

          {profile?.role !== "ADMIN" && (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Registering as</span>
                <select
                  disabled={!isEditing}
                  className="h-11 rounded-xl border border-[#E4E3F2] px-3 text-sm font-medium text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                  {...register('academicRole')}
                >
                  <option value="STUDENT">Student</option>
                  <option value="TUTOR">Tutor</option>
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  University<span className="text-red-500"> *</span>
                </span>
                <Controller
                  control={control}
                  name="universityId"
                  render={({ field }) => (
                    <SearchableSelect
                      options={universityOptions}
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      disabled={!isEditing || universitiesLoading || universitiesError}
                      placeholder={
                        universitiesLoading
                          ? 'Loading universities…'
                          : universitiesError
                            ? 'Could not load universities.'
                            : 'Search for your university…'
                      }
                      ariaInvalid={Boolean(errors.universityId)}
                    />
                  )}
                />
                {errors.universityId && <span className="text-xs text-red-600">{errors.universityId.message}</span>}
                {universitiesError && (
                  <span className="text-xs text-red-600">
                    Couldn't load the list of universities.{' '}
                    <button type="button" onClick={() => refetchUniversities()} className="font-medium underline">
                      Try again
                    </button>
                  </span>
                )}
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Field of study<span className="text-red-500"> *</span>
                </span>
                <Controller
                  control={control}
                  name="fieldOfStudy"
                  render={({ field }) => (
                    <SearchableSelect
                      options={fieldOfStudyOptions}
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      placeholder="Search for your field of study…"
                      ariaInvalid={Boolean(errors.fieldOfStudy)}
                      disabled={!isEditing}
                    />
                  )}
                />
                {errors.fieldOfStudy && <span className="text-xs text-red-600">{errors.fieldOfStudy.message}</span>}
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Current year</span>
                <input
                  type="number"
                  disabled={!isEditing}
                  min={1}
                  max={8}
                  className="h-11 rounded-xl border border-[#E4E3F2] px-3 text-sm font-medium text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                  aria-invalid={Boolean(errors.currentYear)}
                  {...register('currentYear')}
                />
                {errors.currentYear && <span className="text-xs text-red-600">{errors.currentYear.message}</span>}
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Current semester</span>
                <select
                  disabled={!isEditing}
                  className="h-11 rounded-xl border border-[#E4E3F2] px-3 text-sm font-medium text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                  aria-invalid={Boolean(errors.currentSemester)}
                  {...register('currentSemester')}
                >
                  {CURRENT_SEMESTER_OPTIONS.map((semester) => (
                    <option key={semester} value={semester}>
                      Semester {semester}
                    </option>
                  ))}
                </select>
                {errors.currentSemester && (
                  <span className="text-xs text-red-600">{errors.currentSemester.message}</span>
                )}
              </label>
            </>
          )}
          </div>

        {isEditing && (
          <div className="mt-6 flex flex-wrap gap-3 border-t border-[#F1F0F8] pt-5">
            <button type="submit" disabled={isSubmitting || updateProfile.isPending} className="h-11 rounded-xl bg-primary-600 px-5 text-sm font-bold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60">
              {updateProfile.isPending ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={() => {
                resetFromProfile();
                setIsEditing(false);
              }}
              disabled={updateProfile.isPending}
              className="h-11 rounded-xl border border-[#E4E3F2] px-5 text-sm font-bold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        )}
      </form>
    );
  }

  function renderDetail() {
    if (!activeSection || !profile) return null;

    if (activeSection === "personal") return renderPersonalInformation();

    if (activeSection === "security") {
      return (
        <section className={CARD_CLASS}>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EFEEFB] text-[#4338CA]">
            <LockKeyhole className="h-6 w-6" aria-hidden="true" />
          </div>
          <h2 className="mt-4 font-bold text-slate-800">Reset your password</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            JomDekan will send a secure password-reset link to {profile.email}.
          </p>
          <button
            type="button"
            onClick={() => forgotPassword.mutate({ email: profile.email }, { onSuccess: () => setResetSent(true) })}
            disabled={forgotPassword.isPending || resetSent}
            className="mt-5 min-h-11 rounded-xl bg-primary-600 px-5 text-sm font-bold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {resetSent ? "Reset link sent — check your email" : forgotPassword.isPending ? "Sending…" : "Send me a reset link"}
          </button>
        </section>
      );
    }

    if (activeSection === "about") {
      return (
        <section className={CARD_CLASS}>
          <div className="h-1.5 rounded-full bg-gradient-to-r from-[#4338CA] via-[#6D5CE7] to-[#F5C21A]" />
          <div className="mt-6 flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F5C21A] text-[#231C57]">
              <GraduationCap className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold text-[#231C57]">Made for student life</h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                JomDekan is a platform built for Malaysian university students to find and share academic
                resources — past papers, notes, and study materials — searchable by university, programme,
                subject, and year. Students can discuss coursework and get help through moderated forum
                discussions, and connect with verified tutors for legitimate, moderated tutoring and
                mentoring. JomDekan is built and maintained to make student life a little easier, one
                resource at a time.
              </p>
            </div>
          </div>
        </section>
      );
    }

    if (activeSection === "contact") {
      return (
        <section className={CARD_CLASS}>
          <h2 className="font-bold text-slate-800">How can we help?</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">Send us the details and our team will get back to you by email.</p>
          <form onSubmit={handleSupportSubmit} className="mt-5 max-w-3xl space-y-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Subject<span className="text-red-500"> *</span></span>
              <input type="text" required minLength={3} maxLength={200} value={supportSubject} onChange={(event) => setSupportSubject(event.target.value)} placeholder="e.g. Can't download a resource" className={INPUT_CLASS} />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Message<span className="text-red-500"> *</span></span>
              <textarea required minLength={10} maxLength={3000} rows={6} value={supportMessage} onChange={(event) => setSupportMessage(event.target.value)} placeholder="Tell us what's going on…" className={TEXTAREA_CLASS} />
            </label>
            <button type="submit" disabled={submitRequest.isPending} className="h-11 rounded-xl bg-primary-600 px-5 text-sm font-bold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60">
              {submitRequest.isPending ? "Sending…" : "Send request"}
            </button>
          </form>
        </section>
      );
    }

    if (activeSection === "suggestions") {
      return (
        <section className={CARD_CLASS}>
          <h2 className="font-bold text-slate-800">Help improve JomDekan</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">Got an idea to make JomDekan better? We&apos;d love to hear it.</p>
          <form onSubmit={handleSuggestionSubmit} className="mt-5 max-w-3xl space-y-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">Your suggestion<span className="text-red-500"> *</span></span>
              <textarea required minLength={10} maxLength={3000} rows={6} value={suggestionMessage} onChange={(event) => setSuggestionMessage(event.target.value)} placeholder="What would you like to see improved or added?" className={TEXTAREA_CLASS} />
            </label>
            <button type="submit" disabled={submitRequest.isPending} className="h-11 rounded-xl bg-primary-600 px-5 text-sm font-bold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60">
              {submitRequest.isPending ? "Sending…" : "Submit suggestion"}
            </button>
          </form>
        </section>
      );
    }

    return (
      <section className={CARD_CLASS}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-800">JomDekan Terms of Service</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Review the existing agreement that governs your use of JomDekan.</p>
          </div>
          <button type="button" onClick={() => setIsTermsOpen(true)} className="h-11 shrink-0 rounded-xl bg-primary-600 px-5 text-sm font-bold text-white transition hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
            View terms
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-[18px] py-[22px]">
      {activeSection ? (
        <>
          <DetailHeader title={SECTION_TITLES[activeSection]} onBack={() => setSearchParams({})} />
          {renderDetail()}
        </>
      ) : (
        <>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Profile &amp; Settings</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage your account, security and support in one place.</p>

          <section
            className="mt-6 overflow-hidden rounded-[24px] text-white shadow-sm"
            aria-label="Profile summary"
            style={{ background: "radial-gradient(120% 140% at 85% 10%, #4A3FD1 0%, #2E2372 55%, #231C57 100%)" }}
          >
            <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[20px] bg-[#F5C21A] text-xl font-extrabold text-[#231C57] ring-4 ring-white/10">
                  {profile.photoPath ? <img src={profile.photoPath} alt="" className="h-full w-full object-cover" /> : profile.displayName[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xl font-extrabold tracking-tight">{profile.displayName}</p>
                  <p className="mt-0.5 truncate text-sm text-[#D5D1F4]">{profile.email}</p>
                  <p className="mt-1 truncate text-xs font-semibold text-[#B9B4E4]">
                    {[profile.fieldOfStudy, profile.university?.name].filter(Boolean).join(" · ") ||
                      (profile.role === "ADMIN" ? "Administrator" : profile.academicRole === "TUTOR" ? "Tutor" : "Student")}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => openSection("personal")} className="min-h-11 shrink-0 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C21A]">
                View profile information
              </button>
            </div>
            <div className="grid grid-cols-3 border-t border-white/10 bg-white/[.06] sm:grid-cols-5">
              {[
                { label: "Uploads", value: stats?.resourceCount ?? "—" },
                { label: "Favourites", value: stats?.favoriteCount ?? "—" },
                { label: "Threads", value: stats?.forumPostCount ?? "—" },
                { label: "Tutor", value: stats?.tutorListingCount ?? "—" },
                { label: "Freelance", value: stats?.freelanceListingCount ?? "—" },
              ].map(({ label, value }, index) => (
                <div key={label} className={"flex min-w-0 flex-col items-center gap-1 px-2 py-3 " + (index > 0 ? "border-l border-white/10 " : "") + (index >= 3 ? "border-t border-white/10 sm:border-t-0" : "")}>
                  <span className="text-lg font-extrabold leading-none">{value}</span>
                  <span className="max-w-full truncate text-[10px] font-bold uppercase tracking-wide text-[#B9B4E4]">{label}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="w-full">
            <SettingsGroup title="Account">
              <SettingsRow icon={UserRound} title="Personal information" description="Name, contact details and academic information" onClick={() => openSection("personal")} />
            </SettingsGroup>
            <SettingsGroup title="Security">
              <SettingsRow icon={LockKeyhole} title="Password & security" description="Request a secure password-reset link" onClick={() => openSection("security")} />
            </SettingsGroup>
            <SettingsGroup title="Support">
              <SettingsRow icon={Info} title="About JomDekan" description="Learn more about the JomDekan student community" onClick={() => openSection("about")} />
              <SettingsRow icon={Mail} title="Contact support" description="Get help with a question or problem" onClick={() => openSection("contact")} />
              <SettingsRow icon={Lightbulb} title="Share a suggestion" description="Tell us how JomDekan could be improved" onClick={() => openSection("suggestions")} />
              <SettingsRow icon={FileText} title="Terms of service" description="Review the agreement for using JomDekan" onClick={() => openSection("terms")} />
            </SettingsGroup>
          </div>
        </>
      )}
      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
    </div>
  );
}
