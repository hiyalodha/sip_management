import { useEffect, useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { isAuthenticated } from '../utils/auth';

export default function NotFoundPage() {
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    setLoggedIn(isAuthenticated());
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-auth-gradient px-4">
      <Head>
        <title>Page not found · SIP Manager</title>
      </Head>
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <span className="grid place-items-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white text-2xl font-bold shadow-card-lg">
            S
          </span>
        </div>

        <div className="bg-white rounded-2xl shadow-card-lg border border-ink-200 p-8">
          <p className="text-6xl font-extrabold text-primary-600 tracking-tight">404</p>
          <h1 className="text-xl font-bold text-ink-900 mt-3">This page took a detour</h1>
          <p className="text-sm text-ink-500 mt-2">
            The page you're looking for doesn't exist, or the link may be outdated. Let's get you back on track.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={loggedIn ? '/dashboard' : '/login'}
              className="bg-primary-600 hover:bg-primary-700 text-white rounded-lg py-2.5 px-5 text-sm font-semibold shadow-card transition-colors"
            >
              {loggedIn ? 'Back to Dashboard' : 'Go to Login'}
            </Link>
            <Link
              href={loggedIn ? '/sip' : '/signup'}
              className="border border-ink-200 hover:bg-ink-50 text-ink-600 rounded-lg py-2.5 px-5 text-sm font-semibold transition-colors"
            >
              {loggedIn ? 'My SIPs' : 'Sign up'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
