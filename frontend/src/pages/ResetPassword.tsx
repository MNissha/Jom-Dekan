import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { resetPasswordFormSchema, type ResetPasswordFormValues } from '../schemas/authSchemas';
import { useResetPassword } from '../hooks/useAuth';
import { PasswordField } from '../components/common/PasswordField';
import { PasswordRequirementsChecklist } from '../components/common/PasswordRequirements';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const resetPassword = useResetPassword();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordFormSchema) });

  const newPasswordValue = watch('newPassword') ?? '';

  const onSubmit = (values: ResetPasswordFormValues) => {
    if (!token) return;
    resetPassword.mutate({ token, newPassword: values.newPassword });
  };

  const serverError =
    resetPassword.isError && axios.isAxiosError(resetPassword.error)
      ? (resetPassword.error.response?.data as { error?: { message?: string } })?.error?.message
      : resetPassword.isError
        ? 'Something went wrong. Please try again.'
        : null;

  if (!token) {
    return (
      <div className="page-container flex min-h-[70vh] max-w-md flex-col justify-center py-grid-12">
        <h1 className="text-2xl font-heading leading-tight text-content-primary sm:text-page-title">Invalid reset link</h1>
        <p className="mt-2 text-sm text-slate-500">
          This password reset link is missing its token. Request a new one below.
        </p>
        <Link
          to="/forgot-password"
          className="mt-6 inline-block rounded-full bg-primary-600 px-4 py-2.5 text-center font-medium text-white hover:bg-primary-700"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="page-container flex min-h-[70vh] max-w-md flex-col justify-center py-grid-12">
      <h1 className="text-2xl font-heading leading-tight text-content-primary sm:text-page-title">Choose a new password</h1>
      <p className="mt-1 text-sm text-slate-500">This link can only be used once and expires after 1 hour.</p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        {serverError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {serverError}
          </div>
        )}

        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700">
            New password
          </label>
          <PasswordField
            id="newPassword"
            autoComplete="new-password"
            hasError={Boolean(errors.newPassword)}
            aria-describedby="new-password-requirements"
            {...register('newPassword')}
          />
          {errors.newPassword && <p className="mt-1 text-sm text-red-600">{errors.newPassword.message}</p>}
          <PasswordRequirementsChecklist id="new-password-requirements" password={newPasswordValue} />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700">
            Confirm new password
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

        <button
          type="submit"
          disabled={isSubmitting || resetPassword.isPending}
          className="w-full rounded-full bg-primary-600 px-4 py-2.5 font-medium text-white hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-60"
        >
          {resetPassword.isPending ? 'Resetting…' : 'Reset password'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Remembered your password?{' '}
        <Link to="/login" className="font-medium text-primary-700 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
