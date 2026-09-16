import { useState, type FormEvent } from "react";
import {
  CalendarCheck,
  CalendarPlus,
  Check,
  Clock,
  GraduationCap,
  Unlink,
  Users,
  X,
} from "lucide-react";
import { useSubjects } from "../../hooks/useTaxonomy";
import { RescheduleBookingButton } from "../common/RescheduleBookingButton";
import {
  useApplyAsTutor,
  useDecideBooking,
  useDisconnectGoogleCalendar,
  useGoogleCalendarAuthUrl,
  useMyBookingsAsTutor,
  useMyStudents,
  useMyTutorStatus,
  useUpdateTutorProfile,
} from "../../hooks/useTutor";
import type { TutorProfile } from "../../types/tutor";

const CARD_CLASS = "mt-6 rounded-[22px] border border-[#ECEBF7] bg-white p-5 shadow-sm sm:p-6";
const INPUT_CLASS =
  "h-11 rounded-xl border border-[#E4E3F2] px-3 text-sm font-medium text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500";
const TEXTAREA_CLASS =
  "rounded-xl border border-[#E4E3F2] px-3 py-3 text-sm font-medium text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500";
const PRIMARY_BUTTON =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 text-sm font-bold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60";
const SECONDARY_BUTTON =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#E4E3F2] bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";

function ApplyForm({ isReapply }: { isReapply?: boolean }) {
  const { data: subjects } = useSubjects();
  const applyAsTutor = useApplyAsTutor();
  const [bio, setBio] = useState("");
  const [experience, setExperience] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  function toggleSubject(id: string) {
    setSelectedSubjects((current) =>
      current.includes(id) ? current.filter((s) => s !== id) : [...current, id],
    );
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (selectedSubjects.length === 0) {
      setFormError("Select at least one subject you can tutor.");
      return;
    }
    applyAsTutor.mutate({
      bio,
      experience,
      subjects: selectedSubjects,
      hourlyRate: hourlyRate ? Number(hourlyRate) : undefined,
    });
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
          <div className="grid max-h-48 grid-cols-1 gap-1.5 overflow-y-auto rounded-xl border border-[#E4E3F2] p-3 sm:grid-cols-2">
            {(subjects ?? []).map((subject) => (
              <label key={subject.id} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={selectedSubjects.includes(subject.id)}
                  onChange={() => toggleSubject(subject.id)}
                  className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                {subject.name}
              </label>
            ))}
          </div>
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

        {(formError || applyAsTutor.isError) && (
          <p className="text-sm font-medium text-red-600">
            {formError ?? "Something went wrong submitting your application. Please try again."}
          </p>
        )}

        <div>
          <button type="submit" disabled={applyAsTutor.isPending} className={PRIMARY_BUTTON}>
            {applyAsTutor.isPending ? "Submitting…" : "Submit application"}
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

function TutorDashboard({ profile }: { profile: TutorProfile | null }) {
  const updateProfile = useUpdateTutorProfile();
  const [bio, setBio] = useState(profile?.bio ?? "");
  const [hourlyRate, setHourlyRate] = useState(profile?.hourlyRate?.toString() ?? "");
  const [isActive, setIsActive] = useState(profile?.isActive ?? true);

  function handleSave(event: FormEvent) {
    event.preventDefault();
    updateProfile.mutate({ bio, hourlyRate: hourlyRate ? Number(hourlyRate) : null, isActive });
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
          <div>
            <button type="submit" disabled={updateProfile.isPending} className={PRIMARY_BUTTON}>
              {updateProfile.isPending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>

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
