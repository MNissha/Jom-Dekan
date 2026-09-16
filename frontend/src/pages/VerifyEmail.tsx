import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useVerifyEmail } from '../hooks/useAuth';

export default function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const verifyEmail = useVerifyEmail();
  const attempted = useRef(false);

  useEffect(() => {
    if (token && !attempted.current) {
      attempted.current = true;
      verifyEmail.mutate({ token });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const serverError =
    verifyEmail.isError && axios.isAxiosError(verifyEmail.error)
      ? (verifyEmail.error.response?.data as { error?: { message?: string } })?.error?.message
      : verifyEmail.isError
        ? 'Something went wrong. Please try again.'
        : null;

  return (
    <div className="page-container flex min-h-[70vh] max-w-md flex-col justify-center py-grid-12 text-center">
      {!token && (
        <>
          <h1 className="text-2xl font-heading leading-tight text-content-primary sm:text-page-title">Invalid verification link</h1>
          <p className="mt-2 text-sm text-slate-500">This link is missing its token.</p>
        </>
      )}

      {token && verifyEmail.isPending && (
        <>
          <h1 className="text-2xl font-heading leading-tight text-content-primary sm:text-page-title">Verifying your email…</h1>
        </>
      )}

      {token && verifyEmail.isSuccess && (
        <>
          <h1 className="text-2xl font-heading leading-tight text-content-primary sm:text-page-title">Email verified</h1>
          <p className="mt-2 text-sm text-slate-500">Your email address has been confirmed. You're all set.</p>
        </>
      )}

      {token && verifyEmail.isError && (
        <>
          <h1 className="text-2xl font-heading leading-tight text-content-primary sm:text-page-title">Verification failed</h1>
          <p className="mt-2 text-sm text-red-600">{serverError}</p>
        </>
      )}

      <Link
        to="/dashboard"
        className="mt-6 inline-block rounded-full bg-primary-600 px-4 py-2.5 text-center font-medium text-white hover:bg-primary-700"
      >
        Go to dashboard
      </Link>
    </div>
  );
}
