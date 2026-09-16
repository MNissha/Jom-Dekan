import { useNavigate, useParams, Navigate } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { useUserProfile } from "../hooks/useProfile";
import { useCurrentUser } from "../hooks/useAuth";
import { useTutorProfile } from "../hooks/useTutor";
import { ReportButton } from "../components/common/ReportButton";
import { MessageButton } from "../components/common/MessageButton";
import { BookSessionButton } from "../components/common/BookSessionButton";
import { cardClassName } from "../components/common/cards";

const STUDY_LEVEL_LABELS: Record<string, string> = {
  DIPLOMA: "Diploma",
  DEGREE: "Degree",
  MASTERS: "Master's",
  PHD: "PhD",
};

export default function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useCurrentUser();
  const { data: profile, isLoading, isError } = useUserProfile(id);
  const { data: tutorProfile } = useTutorProfile(id);

  // Your own username links here too — send you to the editable version
  // of the same information instead of a read-only duplicate.
  if (currentUser && id && currentUser.id === id) {
    return <Navigate to="/profile" replace />;
  }

  if (isLoading) {
    return (
      <div className="page-container page-container-reading text-body-sm text-content-muted">
        Loading profile…
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="page-container page-container-reading">
        <p className="text-sm text-red-600">This user could not be found.</p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-2 inline-block text-sm text-primary-700 hover:underline"
        >
          ← Back
        </button>
      </div>
    );
  }

  return (
    <div className="page-container page-container-reading">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="text-sm text-primary-700 hover:underline"
      >
        ← Back
      </button>

      <div
        className="mt-grid-4 flex min-w-0 flex-col items-stretch gap-grid-5 overflow-hidden rounded-feature p-grid-6 text-white shadow-card sm:flex-row sm:items-center sm:justify-between"
        style={{ background: "radial-gradient(120% 140% at 85% 10%, #4A3FD1 0%, #2E2372 55%, #231C57 100%)" }}
      >
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-[#F5C21A] text-xl font-extrabold text-[#231C57]">
            {profile.displayName[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0">
            <h1 className="break-words text-xl font-extrabold tracking-tight">{profile.displayName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="break-words text-sm font-medium text-primary-100">
                {profile.academicRole === "TUTOR" ? "Tutor" : "Student"}
              </p>
              {tutorProfile && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#F5C21A] px-2.5 py-1 text-xs font-bold text-[#231C57]">
                  <GraduationCap className="h-3.5 w-3.5" aria-hidden="true" />
                  Verified Tutor
                </span>
              )}
            </div>
          </div>
        </div>

        {currentUser && (
          <div className="flex shrink-0 items-center gap-2">
            {tutorProfile && tutorProfile.isActive && (
              <BookSessionButton tutorUserId={profile.id} specialtySubjectIds={tutorProfile.subjects} />
            )}
            <MessageButton targetUserId={profile.id} />
            <ReportButton targetType="user" targetId={profile.id} />
          </div>
        )}
      </div>

      {tutorProfile && (
        <div className={cardClassName("static", "mt-grid-6")}>
          <h2 className="text-card-title text-content-primary">Tutoring</h2>
          <p className="mt-grid-2 whitespace-pre-wrap break-words text-body-sm text-content-secondary">{tutorProfile.bio}</p>
          {tutorProfile.hourlyRate !== null && (
            <p className="mt-grid-3 text-body-sm font-semibold text-content-primary">RM {tutorProfile.hourlyRate.toFixed(2)} / hour</p>
          )}
          {tutorProfile.openToOtherUniversities && (
            <span className="mt-grid-3 inline-block rounded-full bg-emerald-50 px-2.5 py-1 text-caption font-semibold text-emerald-700">
              Open to students from other universities/programmes
            </span>
          )}
        </div>
      )}

      <div className={cardClassName("static", "mt-grid-6")}>
        <h2 className="text-card-title text-content-primary">About</h2>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-overline uppercase text-content-muted">University</dt>
            <dd className="mt-grid-1 break-words text-body-sm font-medium text-content-primary">{profile.university?.name ?? "Not provided"}</dd>
          </div>
          <div>
            <dt className="text-overline uppercase text-content-muted">Field of study</dt>
            <dd className="mt-grid-1 break-words text-body-sm font-medium text-content-primary">{profile.fieldOfStudy ?? "Not provided"}</dd>
          </div>
          <div>
            <dt className="text-overline uppercase text-content-muted">Study level</dt>
            <dd className="mt-grid-1 break-words text-body-sm font-medium text-content-primary">
              {profile.studyLevel ? (STUDY_LEVEL_LABELS[profile.studyLevel] ?? profile.studyLevel) : "Not provided"}
            </dd>
          </div>
          <div>
            <dt className="text-overline uppercase text-content-muted">Member since</dt>
            <dd className="mt-grid-1 break-words text-body-sm font-medium text-content-primary">
              {new Date(profile.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
