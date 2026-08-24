import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { logout, getUser } from '../utils/auth';
import ThemeToggle from './ThemeToggle';

export default function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    setUser(getUser());
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [router.pathname]);

  function handleLogout() {
    logout();
    router.push('/login');
  }

  // Don't render anything until the browser has mounted.
  // This prevents the server/client HTML mismatch.
  if (!mounted || !user) return null;

  const linkClass = (path) =>
    `px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
      router.pathname === path
        ? 'bg-primary-600 text-white shadow-card'
        : 'text-ink-500 hover:text-ink-900 hover:bg-ink-100'
    }`;

  const mobileLinkClass = (path) =>
    `block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
      router.pathname === path
        ? 'bg-primary-600 text-white'
        : 'text-ink-600 hover:bg-ink-100'
    }`;

  const initials = `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();

  return (
    <nav className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-ink-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 text-white text-sm font-bold shadow-card">
              S
            </span>
            <span className="font-bold text-ink-900 tracking-tight hidden sm:inline">
              SIP Manager
            </span>
          </Link>

          <div className="hidden sm:flex items-center gap-1">
            <Link href="/dashboard" className={linkClass('/dashboard')}>
              Dashboard
            </Link>
            <Link href="/sip" className={linkClass('/sip')}>
              My SIPs
            </Link>
            <Link href="/goals" className={linkClass('/goals')}>
              Goals
            </Link>
            <Link href="/quiz" className={linkClass('/quiz')}>
              Risk Quiz
            </Link>
            <Link href="/transactions" className={linkClass('/transactions')}>
              Transactions
            </Link>
            <Link href="/reports" className={linkClass('/reports')}>
              Reports
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle className="hidden sm:grid" />
          <Link
            href="/profile"
            className="hidden sm:flex items-center gap-2.5 pl-1 rounded-lg hover:bg-ink-100 px-2 py-1 -mx-2 transition-colors"
          >
            <span className="grid place-items-center w-8 h-8 rounded-full bg-primary-100 text-primary-700 text-xs font-bold">
              {initials || 'U'}
            </span>
            <span className="text-sm font-medium text-ink-700">
              {user.firstName} {user.lastName}
            </span>
          </Link>

          <button
            onClick={handleLogout}
            className="hidden sm:inline-block text-sm font-medium px-3.5 py-2 rounded-lg border border-ink-200 text-ink-600 hover:bg-ink-50 hover:border-ink-300 transition-colors"
          >
            Logout
          </button>

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="sm:hidden grid place-items-center w-9 h-9 rounded-lg border border-ink-200 text-ink-600 hover:bg-ink-50"
            aria-label="Toggle menu"
          >
            <span className="text-lg leading-none">{menuOpen ? '×' : '☰'}</span>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="sm:hidden border-t border-ink-200 dark:border-ink-700 bg-white dark:bg-ink-900 px-4 py-3 space-y-1">
          <div className="flex items-center justify-between px-4 py-2 mb-1">
            <Link href="/profile" className="flex items-center gap-2.5 rounded-lg hover:bg-ink-100 dark:hover:bg-ink-800 -ml-2 pl-2 py-1">
              <span className="grid place-items-center w-8 h-8 rounded-full bg-primary-100 text-primary-700 text-xs font-bold">
                {initials || 'U'}
              </span>
              <span className="text-sm font-medium text-ink-700 dark:text-ink-200">
                {user.firstName} {user.lastName}
              </span>
            </Link>
            <ThemeToggle />
          </div>
          <Link href="/dashboard" className={mobileLinkClass('/dashboard')}>Dashboard</Link>
          <Link href="/sip" className={mobileLinkClass('/sip')}>My SIPs</Link>
          <Link href="/goals" className={mobileLinkClass('/goals')}>Goals</Link>
          <Link href="/quiz" className={mobileLinkClass('/quiz')}>Risk Quiz</Link>
          <Link href="/transactions" className={mobileLinkClass('/transactions')}>Transactions</Link>
          <Link href="/reports" className={mobileLinkClass('/reports')}>Reports</Link>
          <Link href="/profile" className={mobileLinkClass('/profile')}>Profile</Link>
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
