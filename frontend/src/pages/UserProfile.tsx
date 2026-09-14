import { useNavigate, useParams, Navigate } from "react-router-dom";
import { useUserProfile } from "../hooks/useProfile";
import { useCurrentUser } from "../hooks/useAuth";
import { ReportButton } from "../components/common/ReportButton";

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

  // Your own username links here too — send you to the editable version
  // of the same information instead of a read-only duplicate.
  if (currentUser && id && currentUser.id === id) {
    return <Navigate to="/profile" replace />;
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[720px] px-[18px] py-[22px] text-sm text-slate-500">
        Loading profile…
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="mx-auto max-w-[720px] px-[18px] py-[22px]">
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
    <div className="mx-auto max-w-[720px] px-[18px] py-[22px]">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="text-sm text-primary-700 hover:underline"
      >
        ← Back
      </button>

      <div
        className="mt-4 flex flex-col items-stretch gap-5 rounded-[22px] p-[22px] text-white sm:flex-row sm:items-center sm:justify-between"
        style={{ background: "radial-gradient(120% 140% at 85% 10%, #4A3FD1 0%, #2E2372 55%, #231C57 100%)" }}
      >
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-[#F5C21A] text-xl font-extrabold text-[#231C57]">
            {profile.displayName[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xl font-extrabold tracking-tight">{profile.displayName}</p>
            <p className="truncate text-sm font-medium text-[#C6C2EC]">
              {profile.academicRole === "TUTOR" ? "Tutor" : "Student"}
            </p>
          </div>
        </div>

        {currentUser && (
          <div className="shrink-0">
            <ReportButton targetType="user" targetId={profile.id} />
          </div>
        )}
      </div>

      <div className="mt-6 rounded-[22px] border border-[#ECEBF7] bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-800">About</h2>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">University</dt>
            <dd className="mt-1 text-sm font-medium text-slate-700">{profile.university?.name ?? "Not provided"}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Field of study</dt>
            <dd className="mt-1 text-sm font-medium text-slate-700">{profile.fieldOfStudy ?? "Not provided"}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Study level</dt>
            <dd className="mt-1 text-sm font-medium text-slate-700">
              {profile.studyLevel ? (STUDY_LEVEL_LABELS[profile.studyLevel] ?? profile.studyLevel) : "Not provided"}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">Member since</dt>
            <dd className="mt-1 text-sm font-medium text-slate-700">
              {new Date(profile.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
