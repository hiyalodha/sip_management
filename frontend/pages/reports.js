import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import { isAuthenticated, getUser } from '../utils/auth';
import InfoTip from '../components/InfoTip';

const BAR_COLORS = ['bg-primary-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-sky-500', 'bg-violet-500'];

const RISK_COLORS = { Low: 'bg-emerald-500', Medium: 'bg-amber-500', High: 'bg-red-500' };

const STATUS_STYLES = {
  Active: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  Paused: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  Cancelled: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  Completed: 'bg-ink-100 text-ink-600 ring-1 ring-ink-200'
};

function Card({ title, description, children, infoText }) {
  return (
    <div className="bg-white rounded-2xl shadow-card border border-ink-200 p-6">
      <h2 className="text-lg font-bold text-ink-900">
        {title}
        {infoText && <InfoTip text={infoText} className="ml-1.5" />}
      </h2>
      {description && <p className="text-sm text-ink-500 mt-1 mb-5">{description}</p>}
      {!description && <div className="mb-5" />}
      {children}
    </div>
  );
}

function BreakdownBars({ data, colorFor }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-ink-400">No investment data yet.</p>;
  }
  const max = Math.max(...data.map((d) => d.total));
  const total = data.reduce((sum, d) => sum + d.total, 0);

  return (
    <div className="space-y-4">
      {data.map((d, i) => (
        <div key={d.label}>
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="font-medium text-ink-700">{d.label}</span>
            <span className="text-ink-500">
              ₹{d.total.toLocaleString('en-IN')} <span className="text-ink-400">({total > 0 ? Math.round((d.total / total) * 100) : 0}%)</span>
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-ink-100 overflow-hidden">
            <div
              className={`h-full rounded-full ${colorFor(d, i)}`}
              style={{ width: `${max > 0 ? (d.total / max) * 100 : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function MonthlyTrendChart({ data }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-ink-400">No transactions yet.</p>;
  }
  const max = Math.max(...data.map((d) => d.total));

  return (
    <div className="flex items-end gap-3 h-48 pt-4">
      {data.map((d) => (
        <div key={d.month} className="flex-1 flex flex-col items-center justify-end h-full gap-2">
          <span className="text-[11px] font-semibold text-ink-700">
            ₹{d.total >= 1000 ? `${(d.total / 1000).toFixed(1)}k` : d.total}
          </span>
          <div
            className="w-full max-w-8 rounded-t-md bg-primary-500"
            style={{ height: `${max > 0 ? Math.max((d.total / max) * 100, 4) : 4}%` }}
          />
          <span className="text-[11px] text-ink-400">
            {new Date(`${d.month}-01`).toLocaleDateString('en-IN', { month: 'short' })}
          </span>
        </div>
      ))}
    </div>
  );
}

function StreakHeatmap({ dailyActivity, currentStreakMonths, longestStreakMonths }) {
  const activityMap = {};
  let maxAmount = 0;
  (dailyActivity || []).forEach((d) => {
    activityMap[d.date] = d.total;
    if (d.total > maxAmount) maxAmount = d.total;
  });

  // Build a 26-week grid (182 days) ending today, aligned so each column is one week (Sun-Sat).
  const DAYS = 182;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - (DAYS - 1) - today.getDay());

  const weeks = [];
  let cursor = new Date(start);
  while (cursor <= today) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      const iso = cursor.toISOString().slice(0, 10);
      week.push({
        date: iso,
        inRange: cursor >= start && cursor <= today,
        future: cursor > today,
        amount: activityMap[iso] || 0
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  function levelClass(amount) {
    if (amount <= 0) return 'bg-ink-100';
    if (maxAmount <= 0) return 'bg-primary-200';
    const ratio = amount / maxAmount;
    if (ratio > 0.75) return 'bg-primary-700';
    if (ratio > 0.5) return 'bg-primary-600';
    if (ratio > 0.25) return 'bg-primary-400';
    return 'bg-primary-200';
  }

  const monthLabels = [];
  let lastMonth = null;
  weeks.forEach((week, i) => {
    const d = new Date(week[0].date);
    const m = d.getMonth();
    if (m !== lastMonth) {
      monthLabels.push({ index: i, label: d.toLocaleDateString('en-IN', { month: 'short' }) });
      lastMonth = m;
    }
  });

  return (
    <Card
      title="Payment consistency"
      description="A green square means a SIP payment was made that day. Keep the streak alive."
    >
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="px-4 py-2.5 rounded-xl bg-orange-50 text-orange-700 ring-1 ring-orange-200 text-sm font-semibold flex items-center gap-1.5">
          🔥 Current streak: {currentStreakMonths} month{currentStreakMonths !== 1 ? 's' : ''}
        </div>
        <div className="px-4 py-2.5 rounded-xl bg-violet-50 text-violet-700 ring-1 ring-violet-200 text-sm font-semibold flex items-center gap-1.5">
          🏆 Longest streak: {longestStreakMonths} month{longestStreakMonths !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="inline-block min-w-full">
          <div className="flex gap-[3px] mb-1 pl-6" style={{ minWidth: weeks.length * 15 }}>
            {monthLabels.map((m) => (
              <span
                key={`${m.label}-${m.index}`}
                className="text-[10px] text-ink-400"
                style={{ position: 'relative', left: m.index * 15, width: 0 }}
              >
                {m.label}
              </span>
            ))}
          </div>
          <div className="flex gap-[3px]">
            <div className="flex flex-col gap-[3px] justify-between pr-1 text-[10px] text-ink-400 h-[87px]">
              <span>Sun</span>
              <span>Wed</span>
              <span>Sat</span>
            </div>
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((day) => (
                  <div
                    key={day.date}
                    title={day.amount > 0 ? `${day.date}: ₹${day.amount.toLocaleString('en-IN')} paid` : day.date}
                    className={`w-3 h-3 rounded-sm ${day.future ? 'bg-transparent' : levelClass(day.amount)}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-3 text-[11px] text-ink-400">
        <span>Less</span>
        <span className="w-3 h-3 rounded-sm bg-ink-100" />
        <span className="w-3 h-3 rounded-sm bg-primary-200" />
        <span className="w-3 h-3 rounded-sm bg-primary-400" />
        <span className="w-3 h-3 rounded-sm bg-primary-600" />
        <span className="w-3 h-3 rounded-sm bg-primary-700" />
        <span>More</span>
      </div>
    </Card>
  );
}

export default function ReportsPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    const user = getUser();
    api.get(`/reports/${user.userId}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load reports'))
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div className="min-h-screen bg-ink-50">
      <Head>
        <title>Reports · SIP Manager</title>
      </Head>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-ink-900 tracking-tight">Reports</h1>
          <p className="text-ink-500 mt-1">Aggregate insights across all of your SIP investments.</p>
        </div>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-56 rounded-2xl bg-white border border-ink-200 animate-pulse" />
            ))}
          </div>
        ) : data ? (
          <>
            {data.topStock && (
              <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl shadow-card-lg p-6 flex items-center justify-between text-white">
                <div>
                  <p className="text-primary-200 text-xs font-medium uppercase tracking-wide">Most invested stock</p>
                  <p className="text-2xl font-extrabold mt-1">
                    {data.topStock.name} <span className="text-primary-200 font-semibold text-lg">({data.topStock.ticker})</span>
                  </p>
                </div>
                <p className="text-2xl font-extrabold">₹{data.topStock.total.toLocaleString('en-IN')}</p>
              </div>
            )}

            <StreakHeatmap
              dailyActivity={data.dailyActivity}
              currentStreakMonths={data.currentStreakMonths}
              longestStreakMonths={data.longestStreakMonths}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card
                title="Investment by sector"
                description="Where your money is allocated, by industry sector."
                infoText="A sector is an industry group, like Banking, IT, or Energy. Spreading investments across sectors is called diversification — it means one bad sector doesn't sink your whole portfolio."
              >
                <BreakdownBars data={data.bySector} colorFor={(_, i) => BAR_COLORS[i % BAR_COLORS.length]} />
              </Card>

              <Card
                title="Investment by risk level"
                description="How your portfolio splits across risk categories."
                infoText="Risk level reflects how much a stock's price tends to move. Low-risk stocks are steadier but usually grow slower; High-risk stocks can grow faster but can also drop more."
              >
                <BreakdownBars data={data.byRisk} colorFor={(d) => RISK_COLORS[d.label] || 'bg-ink-400'} />
              </Card>
            </div>

            <Card title="Monthly investment trend" description="Successful payments made per month.">
              <MonthlyTrendChart data={data.monthlyTrend} />
            </Card>

            <Card title="SIP status breakdown">
              {data.sipStatusBreakdown.length === 0 ? (
                <p className="text-sm text-ink-400">No SIPs yet.</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {data.sipStatusBreakdown.map((s) => (
                    <div
                      key={s.label}
                      className={`px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-medium ${STATUS_STYLES[s.label] || STATUS_STYLES.Completed}`}
                    >
                      <span>{s.label}</span>
                      <span className="font-bold">{s.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        ) : null}
      </main>
    </div>
  );
}
