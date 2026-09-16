import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router-dom';
import { loginFormSchema, type LoginFormValues } from '../schemas/authSchemas';
import { useLogin } from '../hooks/useAuth';
import { PasswordField } from '../components/common/PasswordField';
import { fieldClassName } from '../utils/inputStyles';
import axios from 'axios';

interface ApiErrorBody {
  error?: {
    code?: string;
    message?: string;
    meta?: { lockoutUntil?: string; attemptsRemaining?: number };
  };
}

function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function Login() {
  const login = useLogin();
  const [searchParams] = useSearchParams();
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginFormSchema) });

  const idleLogout = searchParams.get('reason') === 'idle';
  const sessionExpired = searchParams.get('reason') === 'session_expired';

  const apiError = axios.isAxiosError(login.error)
    ? (login.error.response?.data as ApiErrorBody | undefined)?.error
    : undefined;

  // Keep a live countdown while the account is locked out, and clear it
  // once time's up so the form re-enables without needing another failed
  // submit to notice.
  useEffect(() => {
    if (apiError?.code !== 'ACCOUNT_LOCKED' || !apiError.meta?.lockoutUntil) {
      setLockoutUntil(null);
      return;
    }
    setLockoutUntil(new Date(apiError.meta.lockoutUntil).getTime());
  }, [apiError]);

  useEffect(() => {
    if (!lockoutUntil) return;
    const interval = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= lockoutUntil) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutUntil]);

  const isLockedOut = Boolean(lockoutUntil && lockoutUntil > now);
  // Once the lockout has actually expired, the stale "account is locked"
  // message would be confusing — let the user just try submitting again.
  const lockoutJustExpired = Boolean(lockoutUntil && lockoutUntil <= now);

  const onSubmit = (values: LoginFormValues) => login.mutate(values);

  const serverError =
    login.isError && !lockoutJustExpired ? apiError?.message ?? 'Something went wrong. Please try again.' : null;

  return (
    <div className="page-container flex min-h-[70vh] max-w-md flex-col justify-center py-grid-12 motion-safe:animate-content-enter">
      <div className="motion-safe:animate-[modalRise_380ms_ease-out_both]">
        <h1 className="text-2xl font-heading leading-tight tracking-tight text-content-primary sm:text-page-title">Log in to JomDekan</h1>
        <p className="mt-1 text-sm text-slate-500">Find past papers, notes, and study help for your course.</p>
      </div>

      <form
        className="mt-8 space-y-5 motion-safe:animate-[notificationRise_440ms_80ms_ease-out_both]"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        {idleLogout && !serverError && (
          <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 motion-safe:animate-[notificationRise_220ms_ease-out]">
            You were signed out after a period of inactivity, for your security. Please log in again.
          </div>
        )}

        {sessionExpired && !serverError && (
          <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 motion-safe:animate-[notificationRise_220ms_ease-out]">
            Your session expired or is no longer valid. Please log in again.
          </div>
        )}

        {serverError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 motion-safe:animate-[notificationRise_220ms_ease-out]">
            <p>{serverError}</p>
            {isLockedOut && lockoutUntil && (
              <p className="mt-1 font-medium">Try again in {formatCountdown(lockoutUntil - now)}.</p>
            )}
            {!isLockedOut && (
              <p className="mt-1">
                New here?{' '}
                <Link to="/register" className="font-medium underline">
                  Create an account
                </Link>
                .
              </p>
            )}
          </div>
        )}

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
            aria-describedby={errors.email ? 'email-error' : undefined}
            {...register('email')}
          />
          {errors.email && (
            <p id="email-error" className="mt-1 text-sm text-red-600">
              {errors.email.message}
            </p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <Link to="/forgot-password" className="rounded text-sm font-medium text-primary-700 underline-offset-4 transition-colors hover:text-primary-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
              Forgot password?
            </Link>
          </div>
          <PasswordField
            id="password"
            autoComplete="current-password"
            hasError={Boolean(errors.password)}
            aria-describedby={errors.password ? 'password-error' : undefined}
            {...register('password')}
          />
          {errors.password && (
            <p id="password-error" className="mt-1 text-sm text-red-600">
              {errors.password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || login.isPending || isLockedOut}
          className="w-full rounded-full bg-primary-600 px-4 py-2.5 font-medium text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary-700 hover:shadow-md active:translate-y-0 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 motion-reduce:transform-none"
        >
          {isLockedOut
            ? `Locked (${formatCountdown(lockoutUntil! - now)})`
            : login.isPending
              ? 'Logging in…'
              : 'Log in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 motion-safe:animate-[fadeIn_500ms_160ms_ease-out_both]">
        New to JomDekan?{' '}
        <Link to="/register" className="rounded font-medium text-primary-700 underline-offset-4 transition-colors hover:text-primary-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
          Create an account
        </Link>
      </p>
    </div>
  );
}
