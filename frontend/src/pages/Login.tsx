import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router-dom';
import { loginFormSchema, type LoginFormValues } from '../schemas/authSchemas';
import { useLogin } from '../hooks/useAuth';
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
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900">Log in to JomDekan</h1>
      <p className="mt-1 text-sm text-slate-500">Find past papers, notes, and study help for your course.</p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        {idleLogout && !serverError && (
          <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            You were signed out after a period of inactivity, for your security. Please log in again.
          </div>
        )}

        {serverError && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
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

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700">
              Password
            </label>
            <Link to="/forgot-password" className="text-sm font-medium text-primary-700 hover:underline">
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-invalid={Boolean(errors.password)}
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
          className="w-full rounded-full bg-primary-600 px-4 py-2.5 font-medium text-white hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-60"
        >
          {isLockedOut
            ? `Locked (${formatCountdown(lockoutUntil! - now)})`
            : login.isPending
              ? 'Logging in…'
              : 'Log in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        New to JomDekan?{' '}
        <Link to="/register" className="font-medium text-primary-700 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
