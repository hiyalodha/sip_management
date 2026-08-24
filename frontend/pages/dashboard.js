import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import Navbar from '../components/Navbar';
import StatCard from '../components/StatCard';
import { BadgeStrip } from '../components/BadgeStrip';
import { WalletIcon, TrendingUpIcon, ClockIcon } from '../components/Icons';
import api from '../utils/api';
import { isAuthenticated, getUser } from '../utils/auth';

function daysLabel(days) {
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `Due in ${days}d`;
}

function UpcomingPayments({ upcoming, loading }) {
  if (loading) {
    return <div className="h-40 rounded-2xl bg-white border border-ink-200 animate-pulse" />;
  }

  return (
    <div className="bg-white rounded-2xl shadow-card border border-ink-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-ink-900">Upcoming payments</h2>
        <span className="text-xs text-ink-400">Next 30 days</span>
      </div>
      {upcoming.length === 0 ? (
        <p className="text-sm text-ink-400">Nothing due in the next 30 days. You're all caught up.</p>
      ) : (
        <div className="space-y-2">
          {upcoming.map((u) => (
            <Link
              key={u.instId}
              href={`/installments/${u.sipId}`}
              className="flex items-center justify-between px-3.5 py-3 rounded-xl border border-ink-100 hover:border-primary-200 hover:bg-primary-50/60 transition-colors"
            >
              <div>
                <p className="text-sm font-semibold text-ink-900">
                  {u.stockName} <span className="text-ink-400 font-normal">({u.ticker})</span>
                </p>
                <p className="text-xs text-ink-400">{u.dueDate}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-ink-900">₹{u.amount.toLocaleString('en-IN')}</p>
                <p className={`text-[11px] font-semibold ${u.daysUntilDue < 0 ? 'text-red-600' : u.daysUntilDue <= 3 ? 'text-amber-600' : 'text-ink-400'}`}>
                  {daysLabel(u.daysUntilDue)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [upcomingLoading, setUpcomingLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    const u = getUser();
    setUser(u);
    api.get(`/dashboard/${u.userId}`)
      .then((res) => setStats(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load dashboard'))
      .finally(() => setLoading(false));
    api.get(`/dashboard/${u.userId}/upcoming`)
      .then((res) => setUpcoming(res.data.upcoming))
      .catch(() => {})
      .finally(() => setUpcomingLoading(false));
  }, [router]);

  return (
    <div className="min-h-screen bg-ink-50">
      <Head>
        <title>Dashboard · SIP Manager</title>
      </Head>
      <Navbar />

      {/* Hero banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900">
        <div className="absolute -top-16 -right-10 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 w-80 h-80 rounded-full bg-white/5 blur-3xl" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <p className="text-primary-200 text-sm font-medium">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-1">
            {user ? `Welcome back, ${user.firstName}` : 'Dashboard'}
          </h1>
          <p className="text-primary-100 mt-2">Here&apos;s a snapshot of your SIP investments.</p>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-14">
        {error && (
          <div className="mb-6 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {stats && stats.overdueInstallments > 0 && (
          <Link
            href="/sip"
            className="mb-6 flex items-center justify-between text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 hover:bg-red-100 transition-colors"
          >
            <span className="font-medium">
              {stats.overdueInstallments} installment{stats.overdueInstallments > 1 ? 's are' : ' is'} overdue.
            </span>
            <span className="font-semibold">Pay now →</span>
          </Link>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-32 rounded-2xl bg-white border border-ink-200 animate-pulse" />
            ))}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <StatCard
              label="Total Invested"
              value={`₹${Number(stats.totalInvested).toLocaleString('en-IN')}`}
              icon={<WalletIcon />}
              tone="green"
              infoText="The total amount you've successfully paid across all your SIP installments so far."
            />
            <StatCard
              label="Active SIPs"
              value={stats.activeSips}
              icon={<TrendingUpIcon />}
              tone="primary"
              infoText="A SIP (Systematic Investment Plan) is a fixed amount you invest at regular intervals — like a subscription, but for investing."
            />
            <StatCard
              label="Pending Installments"
              value={stats.pendingInstallments}
              icon={<ClockIcon />}
              tone="amber"
              infoText="An installment is one scheduled payment in your SIP. This counts installments that are due today or earlier and haven't been paid yet."
            />
          </div>
        ) : null}

        <div className="mt-8">
          <UpcomingPayments upcoming={upcoming} loading={upcomingLoading} />
        </div>

        <div className="mt-8">
          <BadgeStrip compact />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-8">
          <Link
            href="/sip"
            className="group bg-white rounded-2xl shadow-card border border-ink-200 p-6 flex items-center justify-between hover:shadow-card-lg hover:border-primary-200 transition-all"
          >
            <div>
              <p className="font-bold text-ink-900">Start a new SIP</p>
              <p className="text-sm text-ink-500 mt-1">Pick a stock and set up recurring installments.</p>
            </div>
            <span className="text-primary-600 text-xl font-bold group-hover:translate-x-1 transition-transform">→</span>
          </Link>
          <Link
            href="/sip"
            className="group bg-white rounded-2xl shadow-card border border-ink-200 p-6 flex items-center justify-between hover:shadow-card-lg hover:border-primary-200 transition-all"
          >
            <div>
              <p className="font-bold text-ink-900">Review your SIPs</p>
              <p className="text-sm text-ink-500 mt-1">Check status, pay installments, or cancel a plan.</p>
            </div>
            <span className="text-primary-600 text-xl font-bold group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
