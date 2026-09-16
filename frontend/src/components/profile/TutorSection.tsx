import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import {
  CalendarCheck,
  CalendarPlus,
  Check,
  Clock,
  Download,
  FileText,
  GraduationCap,
  Unlink,
  Users,
  X,
} from "lucide-react";
import { RescheduleBookingButton } from "../common/RescheduleBookingButton";
import { SubjectMultiSelect } from "../common/SubjectMultiSelect";
import {
  useApplyAsTutor,
  useDecideBooking,
  useDisconnectGoogleCalendar,
  useGoogleCalendarAuthUrl,
  useMyBookingsAsTutor,
  useMyStudents,
  useMyTutorStatus,
  useProfileResumeUrl,
  useResumeUploadIntent,
  useUpdateTutorProfile,
} from "../../hooks/useTutor";
import { useMyProfile, useUpdateProfile } from "../../hooks/useProfile";
import { tutorService } from "../../service/tutorService";
import type { TutorProfile } from "../../types/tutor";
import type { Subject } from "../../types/taxonomy";
import { buttonClassName, controlClassName } from "../common/controlStyles";

const RESUME_ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const RESUME_MAX_SIZE_BYTES = 10 * 1024 * 1024;

const CARD_CLASS = "mt-6 rounded-[22px] border border-[#ECEBF7] bg-white p-5 shadow-sm sm:p-6";
const INPUT_CLASS = controlClassName(false);
const TEXTAREA_CLASS = controlClassName(false, "min-h-24 resize-y");
const PRIMARY_BUTTON = buttonClassName();
const SECONDARY_BUTTON = buttonClassName({ variant: "secondary" });

function ApplyForm({ isReapply }: { isReapply?: boolean }) {
  const applyAsTutor = useApplyAsTutor();
  const resumeUploadIntent = useResumeUploadIntent();
  const { data: profile } = useMyProfile();
  const updateProfile = useUpdateProfile();

  const [bio, setBio] = useState("");
  const [experience, setExperience] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([]);
  const [openToOtherUniversities, setOpenToOtherUniversities] = useState(false);
  const [phone, setPhone] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUploadProgress, setResumeUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Phone comes from the account's own profile — pre-filled once it
  // loads, editable here, and saved back to the profile on submit so
  // it stays the single source of truth rather than a second copy.
  useEffect(() => {
    if (profile?.phone) setPhone((current) => current || profile.phone!);
  }, [profile?.phone]);

  function handleResumeChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setFormError(null);
    if (file && !RESUME_ALLOWED_TYPES.includes(file.type)) {
      setFormError("Resume must be a PDF or Word (.docx) document.");
      event.target.value = "";
      return;
    }
    if (file && file.size > RESUME_MAX_SIZE_BYTES) {
      setFormError("Resume is too large. Maximum size is 10MB.");
      event.target.value = "";
      return;
    }
    setResumeFile(file);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (selectedSubjects.length === 0) {
      setFormError("Select at least one subject you can tutor.");
      return;
    }
    if (!resumeFile) {
      setFormError("Attach your resume/CV (PDF or Word).");
      return;
    }
    if (!phone.trim()) {
      setFormError("A contact phone number is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (phone.trim() !== (profile?.phone ?? "")) {
        await updateProfile.mutateAsync({ phone: phone.trim() });
      }

      setResumeUploadProgress(0);
      const intent = await resumeUploadIntent.mutateAsync({
        fileName: resumeFile.name,
        contentType: resumeFile.type,
        sizeBytes: resumeFile.size,
      });
      await tutorService.uploadResumeFile(intent.uploadUrl, resumeFile, setResumeUploadProgress);

      await applyAsTutor.mutateAsync({
        bio,
        experience,
        subjects: selectedSubjects.map((s) => s.id),
        hourlyRate: hourlyRate ? Number(hourlyRate) : undefined,
        openToOtherUniversities,
        resumeStorageKey: intent.key,
        resumeOriginalFilename: resumeFile.name,
        resumeMimeType: resumeFile.type,
        resumeSizeBytes: resumeFile.size,
        portfolioUrl: portfolioUrl.trim() || undefined,
      });
    } catch {
      setFormError("Something went wrong submitting your application. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={CARD_CLASS}>
      <h3 className="font-semibold text-slate-800">{isReapply ? "Re-apply to become a tutor" : "Apply to become a Tutor"}</h3>
      <p className="mt-1 text-sm text-slate-500">
        Tell students about yourself. Your application is reviewed by an admin before your tutor tag and listings go live.
      </p>

      <div className="mt-5 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-400">About you</span>
          <textarea
            className={TEXTAREA_CLASS}
            rows={4}
            required
            minLength={20}
            maxLength={2000}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Share your background, teaching style, and what students can expect."
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Subjects you can tutor</span>
          <SubjectMultiSelect selected={selectedSubjects} onChange={setSelectedSubjects} />
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Relevant experience</span>
          <textarea
            className={TEXTAREA_CLASS}
            rows={3}
            required
            minLength={10}
            maxLength={2000}
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            placeholder="Academic achievements, past tutoring experience, certifications, etc."
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Resume / CV</span>
          <input
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleResumeChange}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-sm file:font-bold file:text-primary-700 hover:file:bg-primary-100"
          />
          <span className="text-xs text-slate-500">
            {resumeFile ? `Selected: ${resumeFile.name}` : "PDF or Word (.docx), up to 10MB."}
            {isSubmitting && resumeUploadProgress > 0 && resumeUploadProgress < 100 && ` · Uploading ${resumeUploadProgress}%`}
          </span>
        </label>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Contact email</span>
            <input type="email" readOnly disabled value={profile?.email ?? ""} className={INPUT_CLASS} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Contact phone</span>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +60 12-345 6789"
              className={INPUT_CLASS}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Portfolio website <span className="normal-case text-slate-400">(optional)</span>
          </span>
          <input
            type="text"
            value={portfolioUrl}
            onChange={(e) => setPortfolioUrl(e.target.value)}
            placeholder="e.g. https://yourportfolio.com"
            className={INPUT_CLASS}
          />
        </label>

        <label className="flex max-w-xs flex-col gap-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Hourly rate (RM, optional)</span>
          <input
            type="number"
            min={0}
            step="0.01"
            className={INPUT_CLASS}
            value={hourlyRate}
            onChange={(e) => setHourlyRate(e.target.value)}
          />
        </label>

        <label className="flex items-start gap-2.5 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={openToOtherUniversities}
            onChange={(e) => setOpenToOtherUniversities(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
          />
          <span>
            <span className="font-medium">Open to students from other universities or programmes</span>
            <span className="block text-xs text-slate-500">
              For the subjects above, let students outside your own university/programme book you too.
            </span>
          </span>
        </label>

        {formError && <p className="text-sm font-medium text-red-600">{formError}</p>}

        <div>
          <button type="submit" disabled={isSubmitting} className={PRIMARY_BUTTON}>
            {isSubmitting ? "Submitting…" : "Submit application"}
          </button>
        </div>
      </div>
    </form>
  );
}

function GoogleCalendarCard({ connected, email }: { connected: boolean; email: string | null }) {
  const getAuthUrl = useGoogleCalendarAuthUrl();
  const disconnect = useDisconnectGoogleCalendar();

  function handleConnect() {
    getAuthUrl.mutate(undefined, {
      onSuccess: (result) => {
        window.location.href = result.url;
      },
    });
  }

  return (
    <div className={CARD_CLASS}>
      <h3 className="flex items-center gap-2 font-semibold text-slate-800">
        <CalendarCheck className="h-5 w-5 text-primary-600" aria-hidden="true" />
        Google Calendar
      </h3>
      <p className="mt-1 text-sm text-slate-500">
        {connected
          ? "Accepted bookings automatically create a calendar event with your student invited."
          : "Connect your Google Calendar so accepted bookings automatically create a calendar event and invite your student."}
      </p>
      <div className="mt-4">
        {connected ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">
              Connected{email ? ` · ${email}` : ""}
            </span>
            <button
              type="button"
              onClick={() => disconnect.mutate()}
              disabled={disconnect.isPending}
              className={`${SECONDARY_BUTTON} h-9 px-4`}
            >
              <Unlink className="h-4 w-4" aria-hidden="true" />
              Disconnect
            </button>
          </div>
        ) : (
          <button type="button" onClick={handleConnect} disabled={getAuthUrl.isPending} className={PRIMARY_BUTTON}>
            <CalendarPlus className="h-4 w-4" aria-hidden="true" />
            {getAuthUrl.isPending ? "Redirecting…" : "Connect Google Calendar"}
          </button>
        )}
        {getAuthUrl.isError && (
          <p className="mt-2 text-sm text-red-600">Couldn&apos;t start the connection. Please try again.</p>
        )}
      </div>
    </div>
  );
}

function BookingsCard() {
  const { data: bookings, isLoading } = useMyBookingsAsTutor();
  const decideBooking = useDecideBooking();
  const pending = (bookings ?? []).filter((b) => b.status === "pending");
  const decided = (bookings ?? []).filter((b) => b.status !== "pending");

  return (
    <div className={CARD_CLASS}>
      <h3 className="flex items-center gap-2 font-semibold text-slate-800">
        <Clock className="h-5 w-5 text-primary-600" aria-hidden="true" />
        Booking requests
      </h3>
      {isLoading ? (
        <p className="mt-2 text-sm text-slate-500">Loading…</p>
      ) : (bookings ?? []).length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">No booking requests yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {[...pending, ...decided].map((booking) => (
            <li key={booking.id} className="rounded-xl border border-[#ECEBF7] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-slate-800">
                  {booking.studentName ?? "A student"}
                  {booking.subjectName ? ` · ${booking.subjectName}` : ""}
                </p>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase ${
                    booking.status === "accepted"
                      ? "bg-emerald-50 text-emerald-700"
                      : booking.status === "declined"
                        ? "bg-red-50 text-red-700"
                        : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {booking.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {new Date(booking.requestedStartAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} ·{" "}
                {booking.durationMinutes} min
              </p>
              {booking.message && <p className="mt-2 text-sm text-slate-600">{booking.message}</p>}
              {booking.status === "pending" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => decideBooking.mutate({ bookingId: booking.id, status: "accepted" })}
                    disabled={decideBooking.isPending}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => decideBooking.mutate({ bookingId: booking.id, status: "declined" })}
                    disabled={decideBooking.isPending}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#E4E3F2] px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    Decline
                  </button>
                  <RescheduleBookingButton bookingId={booking.id} />
                </div>
              )}
              {booking.status === "accepted" && (
                <div className="mt-3">
                  <RescheduleBookingButton bookingId={booking.id} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StudentsCard() {
  const { data: students, isLoading } = useMyStudents();
  return (
    <div className={CARD_CLASS}>
      <h3 className="flex items-center gap-2 font-semibold text-slate-800">
        <Users className="h-5 w-5 text-primary-600" aria-hidden="true" />
        Your students
      </h3>
      {isLoading ? (
        <p className="mt-2 text-sm text-slate-500">Loading…</p>
      ) : (students ?? []).length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">Accepted bookings will show your students here.</p>
      ) : (
        <ul className="mt-4 divide-y divide-[#ECEBF7]">
          {(students ?? []).map((student) => (
            <li key={student.studentId} className="flex items-center justify-between py-3 text-sm">
              <span className="font-semibold text-slate-800">{student.studentName ?? student.studentEmail}</span>
              <span className="text-slate-500">
                {student.sessionCount} session{student.sessionCount === 1 ? "" : "s"} · last{" "}
                {new Date(student.lastSessionAt).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ResumeCard({ profile }: { profile: TutorProfile | null }) {
  const getResumeUrl = useProfileResumeUrl();

  function handleDownload() {
    if (!profile) return;
    getResumeUrl.mutate(profile.userId, {
      onSuccess: ({ url }) => window.open(url, "_blank", "noopener,noreferrer"),
    });
  }

  if (!profile?.resumeFilename && !profile?.portfolioUrl) return null;

  return (
    <div className={CARD_CLASS}>
      <h3 className="flex items-center gap-2 font-semibold text-slate-800">
        <FileText className="h-5 w-5 text-primary-600" aria-hidden="true" />
        Resume &amp; portfolio
      </h3>
      <div className="mt-3 flex flex-col gap-2 text-sm">
        {profile.resumeFilename && (
          <button
            type="button"
            onClick={handleDownload}
            disabled={getResumeUrl.isPending}
            className="inline-flex w-fit items-center gap-2 rounded-lg border border-[#E4E3F2] px-3 py-2 font-semibold text-primary-700 hover:bg-[#FAF9FF] disabled:opacity-60"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {getResumeUrl.isPending ? "Preparing download…" : profile.resumeFilename}
          </button>
        )}
        {profile.portfolioUrl && (
          <a
            href={profile.portfolioUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-fit text-primary-700 hover:underline"
          >
            {profile.portfolioUrl}
          </a>
        )}
      </div>
    </div>
  );
}

function TutorDashboard({ profile }: { profile: TutorProfile | null }) {
  const updateProfile = useUpdateTutorProfile();
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [hourlyRate, setHourlyRate] = useState(profile?.hourlyRate?.toString() ?? "");
  const [isActive, setIsActive] = useState(profile?.isActive ?? true);
  const [openToOtherUniversities, setOpenToOtherUniversities] = useState(
    profile?.openToOtherUniversities ?? false,
  );

  function handleSave(event: FormEvent) {
    event.preventDefault();
    updateProfile.mutate({
      bio,
      hourlyRate: hourlyRate ? Number(hourlyRate) : null,
      isActive,
      openToOtherUniversities,
    });
  }

  return (
    <>
      <div className={CARD_CLASS}>
        <h3 className="flex items-center gap-2 font-semibold text-slate-800">
          <GraduationCap className="h-5 w-5 text-primary-600" aria-hidden="true" />
          Verified Tutor
        </h3>
        <form onSubmit={handleSave} className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Bio</span>
            <textarea className={TEXTAREA_CLASS} rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
          </label>
          <label className="flex max-w-xs flex-col gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Hourly rate (RM)</span>
            <input
              type="number"
              min={0}
              step="0.01"
              className={INPUT_CLASS}
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            Accepting new booking requests
          </label>
          <label className="flex items-start gap-2.5 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={openToOtherUniversities}
              onChange={(e) => setOpenToOtherUniversities(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <span>
              <span className="font-medium">Open to students from other universities or programmes</span>
              <span className="block text-xs text-slate-500">
                For your listed subjects, let students outside your own university/programme book you too.
              </span>
            </span>
          </label>
          <div>
            <button type="submit" disabled={updateProfile.isPending} className={PRIMARY_BUTTON}>
              {updateProfile.isPending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>

      <ResumeCard profile={profile} />
      <GoogleCalendarCard connected={profile?.googleCalendarConnected ?? false} email={profile?.googleCalendarEmail ?? null} />
      <BookingsCard />
      <StudentsCard />
    </>
  );
}

export function TutorSection() {
  const { data: status, isLoading } = useMyTutorStatus();

  if (isLoading) {
    return <div className={CARD_CLASS}>Loading…</div>;
  }

  if (status?.isVerifiedTutor && status.profile) {
    return <TutorDashboard profile={status.profile} />;
  }

  if (status?.application?.status === "pending") {
    return (
      <div className={CARD_CLASS}>
        <h3 className="flex items-center gap-2 font-semibold text-slate-800">
          <Clock className="h-5 w-5 text-amber-600" aria-hidden="true" />
          Application under review
        </h3>
        <p className="mt-2 text-sm text-slate-500">
          We&apos;ll notify you here and by email once an admin has reviewed your tutor application.
        </p>
      </div>
    );
  }

  if (status?.application?.status === "rejected") {
    return (
      <>
        <div className={CARD_CLASS}>
          <h3 className="flex items-center gap-2 font-semibold text-slate-800">
            <X className="h-5 w-5 text-red-600" aria-hidden="true" />
            Application declined
          </h3>
          {status.application.rejectionReason && (
            <p className="mt-2 text-sm text-slate-500">Reason: {status.application.rejectionReason}</p>
          )}
        </div>
        <ApplyForm isReapply />
      </>
    );
  }

  return <ApplyForm />;
}

export default TutorSection;
