import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { forgotPasswordFormSchema, type ForgotPasswordFormValues } from '../schemas/authSchemas';
import { useForgotPassword } from '../hooks/useAuth';

export default function ForgotPassword() {
  const forgotPassword = useForgotPassword();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordFormSchema) });

  const onSubmit = (values: ForgotPasswordFormValues) => forgotPassword.mutate(values);

  return (
    <div className="page-container flex min-h-[70vh] max-w-md flex-col justify-center py-grid-12">
      <h1 className="text-2xl font-heading leading-tight tracking-tight text-content-primary sm:text-page-title">Reset your password</h1>
      <p className="mt-1 text-sm text-slate-500">
        Enter the email on your account and we'll send you a link to reset your password.
      </p>

      {forgotPassword.isSuccess ? (
        <div role="status" className="mt-8 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          If that email is registered, we've sent a link to reset your password. Check your inbox.
        </div>
      ) : (
        <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : undefined}
              {...register('email')}
            />
            {errors.email && (
              <p id="email-error" className="mt-1 text-sm text-red-600">
                {errors.email.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || forgotPassword.isPending}
            className="w-full rounded-full bg-primary-600 px-4 py-2.5 font-medium text-white hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-60"
          >
            {forgotPassword.isPending ? 'Sending link…' : 'Send reset link'}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-slate-500">
        Remembered your password?{' '}
        <Link to="/login" className="font-medium text-primary-700 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
