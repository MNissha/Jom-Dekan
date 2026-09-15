import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { registerFormSchema, type RegisterFormValues } from '../schemas/authSchemas';
import { useRegister } from '../hooks/useAuth';
import { useUniversities } from '../hooks/useTaxonomy';
import { FIELDS_OF_STUDY } from '../constants/fieldsOfStudy';
import { SearchableSelect } from '../components/common/SearchableSelect';
import { PrivacyNoticeModal, TermsModal } from '../components/common/TermsModal';
import { PasswordField } from '../components/common/PasswordField';
import { PasswordRequirementsChecklist } from '../components/common/PasswordRequirements';
import { fieldClassName } from '../utils/inputStyles';

const CURRENT_SEMESTER_OPTIONS = Array.from({ length: 10 }, (_, i) => i + 1);

export default function Register() {
  const registerAccount = useRegister();
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerFormSchema),
    // universityId/fieldOfStudy are Controller-driven with no native input to
    // default their value, so without this they start out `undefined` — a
    // type mismatch zod treats as fatal, which silently skips the
    // password-match refine in authSchemas.ts on every empty first submit.
    defaultValues: { universityId: '', fieldOfStudy: '' },
  });

  const passwordValue = watch('password') ?? '';

  const {
    data: universities,
    isLoading: universitiesLoading,
    isError: universitiesError,
    refetch: refetchUniversities,
  } = useUniversities();
  const universityOptions = (universities ?? []).map((u) => ({ value: u.id, label: u.name }));
  const fieldOfStudyOptions = FIELDS_OF_STUDY.map((field) => ({ value: field, label: field }));

  const onSubmit = (values: RegisterFormValues) => registerAccount.mutate(values);

  const serverError =
    registerAccount.isError && axios.isAxiosError(registerAccount.error)
      ? (registerAccount.error.response?.data as { error?: { message?: string } })?.error?.message
      : registerAccount.isError
        ? 'Something went wrong. Please try again.'
        : null;

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12 motion-safe:animate-[fadeIn_320ms_ease-out]">
      <div className="motion-safe:animate-[modalRise_380ms_ease-out_both]">
        <h1 className="text-2xl font-bold text-slate-900">Create your JomDekan account</h1>
        <p className="mt-1 text-sm text-slate-500">
          For Malaysian university students — past papers, notes, discussions, and legitimate tutoring, all in one place.
        </p>
      </div>

      <form className="mt-8 space-y-5 motion-safe:animate-[notificationRise_440ms_80ms_ease-out_both]" onSubmit={handleSubmit(onSubmit)} noValidate>
        {serverError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {serverError}
          </div>
        )}

        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-slate-700">
            Full name
          </label>
          <input
            id="displayName"
            type="text"
            autoComplete="name"
            className={fieldClassName(Boolean(errors.displayName))}
            aria-invalid={Boolean(errors.displayName)}
            {...register('displayName')}
          />
          {errors.displayName && <p className="mt-1 text-sm text-red-600">{errors.displayName.message}</p>}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className={fieldClassName(Boolean(errors.email))}
            aria-invalid={Boolean(errors.email)}
            {...register('email')}
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700">
            Password
          </label>
          <PasswordField
            id="password"
            autoComplete="new-password"
            hasError={Boolean(errors.password)}
            aria-describedby="password-requirements"
            {...register('password')}
          />
          {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
          <PasswordRequirementsChecklist id="password-requirements" password={passwordValue} />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
            Confirm password
          </label>
          <PasswordField
            id="confirmPassword"
            autoComplete="new-password"
            hasError={Boolean(errors.confirmPassword)}
            aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p id="confirmPassword-error" className="mt-1 text-sm text-red-600">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <fieldset>
          <legend className="block text-sm font-medium text-slate-700">I am registering as a</legend>
          <div className="mt-1 flex gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="radio" value="STUDENT" {...register('academicRole')} defaultChecked />
              Student
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="radio" value="TUTOR" {...register('academicRole')} />
              Tutor
            </label>
          </div>
          {errors.academicRole && <p className="mt-1 text-sm text-red-600">{errors.academicRole.message}</p>}
        </fieldset>

        <div>
          <label htmlFor="universityId" className="block text-sm font-medium text-slate-700">
            University
          </label>
          <Controller
            control={control}
            name="universityId"
            render={({ field }) => (
              <SearchableSelect
                id="universityId"
                options={universityOptions}
                value={field.value ?? ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                disabled={universitiesLoading || universitiesError}
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
          {errors.universityId && <p className="mt-1 text-sm text-red-600">{errors.universityId.message}</p>}
          {universitiesError && (
            <p className="mt-1 text-sm text-red-600">
              Couldn't load the list of universities.{' '}
              <button type="button" onClick={() => refetchUniversities()} className="font-medium underline">
                Try again
              </button>
            </p>
          )}
        </div>

        <div>
          <label htmlFor="fieldOfStudy" className="block text-sm font-medium text-slate-700">
            Field of study
          </label>
          <Controller
            control={control}
            name="fieldOfStudy"
            render={({ field }) => (
              <SearchableSelect
                id="fieldOfStudy"
                options={fieldOfStudyOptions}
                value={field.value ?? ''}
                onChange={field.onChange}
                onBlur={field.onBlur}
                placeholder="Search for your field of study…"
                ariaInvalid={Boolean(errors.fieldOfStudy)}
              />
            )}
          />
          {errors.fieldOfStudy && <p className="mt-1 text-sm text-red-600">{errors.fieldOfStudy.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="currentYear" className="block text-sm font-medium text-slate-700">
              Current year of study
            </label>
            <input
              id="currentYear"
              type="number"
              min={1}
              max={8}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-invalid={Boolean(errors.currentYear)}
              {...register('currentYear')}
            />
            {errors.currentYear && <p className="mt-1 text-sm text-red-600">{errors.currentYear.message}</p>}
          </div>

          <div>
            <label htmlFor="currentSemester" className="block text-sm font-medium text-slate-700">
              Current semester
            </label>
            <select
              id="currentSemester"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-invalid={Boolean(errors.currentSemester)}
              {...register('currentSemester')}
            >
              <option value="">Select</option>
              {CURRENT_SEMESTER_OPTIONS.map((semester) => (
                <option key={semester} value={semester}>
                  Semester {semester}
                </option>
              ))}
            </select>
            {errors.currentSemester && <p className="mt-1 text-sm text-red-600">{errors.currentSemester.message}</p>}
          </div>
        </div>

        <div>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input type="checkbox" className="mt-0.5" {...register('termsAccepted')} />
            <span>
              I agree to the{' '}
              <button
                type="button"
                onClick={() => setIsTermsOpen(true)}
                className="font-medium text-primary-700 underline-offset-2 hover:underline"
              >
                Terms &amp; Conditions
              </button>
              {' '}and acknowledge the{' '}
              <button
                type="button"
                onClick={() => setIsPrivacyOpen(true)}
                className="font-medium text-primary-700 underline-offset-2 hover:underline"
              >
                Privacy Notice
              </button>
            </span>
          </label>
          {errors.termsAccepted && <p className="mt-1 text-sm text-red-600">{errors.termsAccepted.message}</p>}
        </div>

        <TermsModal
          isOpen={isTermsOpen}
          onClose={() => setIsTermsOpen(false)}
          onAccept={() => {
            setValue('termsAccepted', true, { shouldValidate: true });
            setIsTermsOpen(false);
          }}
        />
        <PrivacyNoticeModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />

        <button
          type="submit"
          disabled={isSubmitting || registerAccount.isPending}
          className="w-full rounded-full bg-primary-600 px-4 py-2.5 font-medium text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-md active:translate-y-0 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 motion-reduce:transform-none"
        >
          {registerAccount.isPending ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 motion-safe:animate-[fadeIn_500ms_160ms_ease-out_both]">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-primary-700 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
