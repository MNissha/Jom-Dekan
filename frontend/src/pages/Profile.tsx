import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { updateProfileFormSchema, type UpdateProfileFormValues } from '../schemas/profileSchemas';
import { useMyProfile, useMyStats, useUpdateProfile } from '../hooks/useProfile';
import { useForgotPassword } from '../hooks/useAuth';
import { useUniversities } from '../hooks/useTaxonomy';
import { FIELDS_OF_STUDY } from '../constants/fieldsOfStudy';
import { SearchableSelect } from '../components/common/SearchableSelect';
import { useMinimumLoading } from '../hooks/useMinimumLoading';

const CURRENT_SEMESTER_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-[1000px] animate-pulse px-[18px] py-[22px]" aria-label="Loading profile and settings">
      <div className="h-7 w-52 rounded bg-violet-100" />
      <div className="mt-2 h-4 w-80 max-w-full rounded bg-slate-100" />
      <div className="mt-6 flex items-center gap-4 rounded-[22px] bg-[#332475] p-6"><div className="h-16 w-16 rounded-[20px] bg-white/20" /><div className="flex-1 space-y-3"><div className="h-5 w-40 rounded bg-white/20" /><div className="h-4 w-28 rounded bg-white/10" /></div></div>
      <div className="mt-6 space-y-4 rounded-[22px] border border-[#ECEBF7] bg-white p-6 shadow-sm"><div className="h-6 w-36 rounded bg-violet-100" /><div className="grid gap-4 sm:grid-cols-2">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-11 rounded-xl bg-slate-100" />)}</div></div>
    </div>
  );
}

export default function Profile() {
  const { data: profile, isLoading } = useMyProfile();
  const { data: stats, isLoading: statsLoading } = useMyStats();
  const updateProfile = useUpdateProfile();
  const forgotPassword = useForgotPassword();
  const [resetSent, setResetSent] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
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
  const universityOptions = (universities ?? []).map((u) => ({ value: u.id, label: u.name }));
  const fieldOfStudyOptions = FIELDS_OF_STUDY.map((field) => ({ value: field, label: field }));

  function resetFromProfile() {
    if (!profile) return;
    reset({
      displayName: profile.displayName,
      email: profile.email,
      phone: profile.phone ?? '',
      academicRole: profile.academicRole,
      universityId: profile.university?.id ?? '',
      fieldOfStudy: (profile.fieldOfStudy ?? '') as UpdateProfileFormValues['fieldOfStudy'],
      currentYear: profile.currentYear ?? 1,
      currentSemester: profile.currentSemester ?? 1,
    });
  }

  useEffect(() => {
    resetFromProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, reset]);

  function handleEdit() {
    setIsEditing(true);
  }

  function handleCancel() {
    resetFromProfile();
    setIsEditing(false);
  }

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
        onError: (err) => {
          const message = axios.isAxiosError(err)
            ? (err.response?.data as { error?: { message?: string } })?.error?.message
            : undefined;
          // Duplicate-email conflicts belong under the email field itself,
          // not the generic top-of-form banner.
          if (message?.toLowerCase().includes('email')) {
            setError('email', { type: 'server', message });
          }
        },
      },
    );
  };

  function handleSendResetLink() {
    if (!profile?.email) return;
    forgotPassword.mutate({ email: profile.email }, { onSuccess: () => setResetSent(true) });
  }

  const rawServerError =
    updateProfile.isError && axios.isAxiosError(updateProfile.error)
      ? (updateProfile.error.response?.data as { error?: { message?: string } })?.error?.message
      : updateProfile.isError
        ? 'Something went wrong. Please try again.'
        : null;
  // Suppressed here when it's the email-conflict case — that one renders
  // under the email field instead (see onError above).
  const serverError = rawServerError && !rawServerError.toLowerCase().includes('email') ? rawServerError : null;

  if (showSkeleton) return <ProfileSkeleton />;

  if (isLoading || !profile) {
    return <div className="mx-auto max-w-[1000px] px-[18px] py-[22px] text-sm text-slate-500">Loading profile…</div>;
  }

  return (
    <div className="mx-auto max-w-[1000px] px-[18px] py-[22px]">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Profile &amp; Settings</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Your details, contribution record and notification preferences.</p>

      {/* Hero — same gradient family as the dashboard's hero card. Stacks
          to a column below `sm` rather than relying on flex-wrap: with
          five stat tiles the wrapped grid's own minimum width no longer
          reliably loses the fight to the avatar block on narrow screens,
          which used to leave the two visually overlapping. */}
      <div
        className="mt-6 flex flex-col items-stretch gap-5 rounded-[22px] p-[22px] text-white sm:flex-row sm:items-center sm:justify-between"
        style={{ background: 'radial-gradient(120% 140% at 85% 10%, #4A3FD1 0%, #2E2372 55%, #231C57 100%)' }}
      >
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] bg-[#F5C21A] text-xl font-extrabold text-[#231C57]">
            {profile.email[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xl font-extrabold tracking-tight">{profile.displayName}</p>
            <p className="truncate text-sm font-medium text-[#C6C2EC]">
              {profile.role === 'ADMIN' ? 'Administrator' : profile.academicRole === 'TUTOR' ? 'Tutor' : 'Student'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-0 overflow-hidden rounded-2xl border border-white/[.16] bg-white/[.09] sm:min-w-[300px] sm:flex-1 sm:grid-cols-5">
          {[
            { label: 'Uploads', value: stats?.resourceCount ?? '—' },
            { label: 'Tutor', value: stats?.tutorListingCount ?? '—' },
            { label: 'Freelance', value: stats?.freelanceListingCount ?? '—' },
            { label: 'Fav', value: stats?.favoriteCount ?? '—' },
            { label: 'Threads', value: stats?.forumPostCount ?? '—' },
          ].map(({ label, value }, i) => (
            <div
              key={label}
              className={`flex flex-col items-center gap-1 px-2 py-4 ${i % 2 === 1 ? 'border-l border-white/[.12]' : ''} ${i >= 2 ? 'border-t border-white/[.12]' : ''} sm:border-t-0 ${i > 0 ? 'sm:border-l sm:border-white/[.12]' : 'sm:border-l-0'}`}
            >
              <span className="text-xl font-extrabold leading-none">{value}</span>
              <span className="text-[11px] font-bold uppercase tracking-wide text-[#B9B4E4]">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="mt-6 rounded-[22px] border border-[#ECEBF7] bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-semibold text-slate-800">Account details</h2>
            {!isEditing && (
              <button
                type="button"
                onClick={handleEdit}
                className="rounded-xl border border-[#E4E3F2] px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-primary-300 hover:text-primary-700"
              >
                Edit
              </button>
            )}
          </div>

          {serverError && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {serverError}
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Full name<span className="text-red-500"> *</span>
              </span>
              <input
                type="text"
                disabled={!isEditing}
                className="h-11 rounded-xl border border-[#E4E3F2] px-3 text-sm font-medium text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                aria-invalid={Boolean(errors.displayName)}
                {...register('displayName')}
              />
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
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Phone number<span className="text-red-500"> *</span>
              </span>
              <input
                type="tel"
                disabled={!isEditing}
                placeholder="+60 12-345 6789"
                className="h-11 rounded-xl border border-[#E4E3F2] px-3 text-sm font-medium text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500"
                aria-invalid={Boolean(errors.phone)}
                {...register('phone')}
              />
              {errors.phone && <span className="text-xs text-red-600">{errors.phone.message}</span>}
              <span className="text-[11px] text-slate-400">Used to auto-fill contact details on forms like reports.</span>
            </label>

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
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {isEditing && (
              <>
                <button
                  type="submit"
                  disabled={isSubmitting || updateProfile.isPending}
                  className="h-11 rounded-xl bg-primary-600 px-5 text-sm font-bold text-white transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {updateProfile.isPending ? 'Saving…' : 'Save changes'}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={updateProfile.isPending}
                  className="h-11 rounded-xl border border-[#E4E3F2] px-5 text-sm font-bold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </form>

      <div className="mt-6 rounded-[22px] border border-[#ECEBF7] bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-slate-800">Password &amp; security</h2>
        <div className="mt-4 rounded-xl border border-[#ECEBF7] p-4">
          <p className="text-xs font-medium text-slate-400">
            Direct password changes aren&apos;t available yet — use the email reset link below instead.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={handleSendResetLink}
              disabled={forgotPassword.isPending || resetSent}
              className="h-11 rounded-xl bg-slate-100 px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              {resetSent
                ? 'Reset link sent — check your email'
                : forgotPassword.isPending
                  ? 'Sending…'
                  : 'Send me a reset link'}
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled
            title="Coming soon — no account-deletion endpoint yet"
            className="h-11 cursor-not-allowed rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-400"
          >
            Delete account
          </button>
        </div>
      </div>
    </div>
  );
}
