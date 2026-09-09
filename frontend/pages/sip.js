import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import Navbar from '../components/Navbar';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import InfoTip from '../components/InfoTip';
import api from '../utils/api';
import { isAuthenticated, getUser } from '../utils/auth';

const inputClass =
  'w-full border border-ink-200 rounded-lg px-3.5 py-2.5 text-sm text-ink-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow';
const labelClass = 'text-xs font-medium text-ink-500 mb-1 block';

function timeAgo(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function StatusBadge({ status }) {
  const styles = {
    Active: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    Cancelled: 'bg-red-50 text-red-700 ring-1 ring-red-200',
    Paused: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    Completed: 'bg-ink-100 text-ink-600 ring-1 ring-ink-200'
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.Completed}`}>
      {status}
    </span>
  );
}

function TableSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <tr key={i} className="border-t border-ink-100">
          {Array.from({ length: 6 }).map((_, j) => (
            <td key={j} className="px-5 py-4">
              <div className="h-4 bg-ink-100 rounded animate-pulse" style={{ width: `${60 + (j % 3) * 20}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function SipPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [sips, setSips] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [form, setForm] = useState({ stockId: '', amount: '', frequency: 'Monthly', startDate: '', roundUpEnabled: false });
  const [expectedReturn, setExpectedReturn] = useState('12');
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmState, setConfirmState] = useState({ open: false });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  async function loadData() {
    const user = getUser();
    try {
      const [sipRes, stockRes] = await Promise.all([
        api.get(`/sip/user/${user.userId}`),
        api.get('/stocks')
      ]);
      setSips(sipRes.data.sips);
      setStocks(stockRes.data.stocks);
    } catch (err) {
      setLoadError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  // Deep-link from the Risk Quiz ("Start a SIP" on a recommended stock)
  useEffect(() => {
    if (router.query.stockId) {
      setForm((f) => ({ ...f, stockId: String(router.query.stockId) }));
    }
  }, [router.query.stockId]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/sip/create', form);
      showToast('SIP created with auto-generated installments.');
      setForm({ stockId: '', amount: '', frequency: 'Monthly', startDate: '', roundUpEnabled: false });
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to create SIP', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function handleCancel(sipId) {
    setConfirmState({
      open: true,
      title: 'Cancel this SIP?',
      message: 'You can still view its history, but no further installments can be paid.',
      confirmLabel: 'Cancel SIP',
      danger: false,
      onConfirm: async () => {
        try {
          await api.put(`/sip/${sipId}`, { status: 'Cancelled' });
          showToast('SIP cancelled.');
          loadData();
        } catch (err) {
          showToast(err.response?.data?.error || 'Failed to update SIP', 'error');
        }
      }
    });
  }

  async function handlePause(sipId) {
    try {
      await api.put(`/sip/${sipId}`, { status: 'Paused' });
      showToast('SIP paused. No installments can be paid until you resume it.');
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to pause SIP', 'error');
    }
  }

  async function handleResume(sipId) {
    try {
      await api.put(`/sip/${sipId}`, { status: 'Active' });
      showToast('SIP resumed.');
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to resume SIP', 'error');
    }
  }

  async function handleToggleRoundUp(sip) {
    try {
      await api.put(`/sip/${sip.SIP_ID}`, { roundUpEnabled: !sip.Round_Up_Enabled });
      showToast(sip.Round_Up_Enabled ? 'Round-up turned off.' : 'Round-up turned on.');
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update round-up setting', 'error');
    }
  }

  // Projected returns calculator — a SIP currently generates 1 year of
  // installments (12 monthly or 4 quarterly), so the projection covers that
  // same 1-year horizon. Uses the standard SIP future-value annuity-due formula.
  const amountNum = parseFloat(form.amount) || 0;
  const periodsPerYear = form.frequency === 'Quarterly' ? 4 : 12;
  const annualRatePct = parseFloat(expectedReturn) || 0;
  const periodicRate = annualRatePct / 100 / periodsPerYear;
  const totalInvestedProjection = amountNum * periodsPerYear;
  const maturityValue = amountNum <= 0
    ? 0
    : periodicRate === 0
      ? totalInvestedProjection
      : amountNum * (((Math.pow(1 + periodicRate, periodsPerYear) - 1) / periodicRate) * (1 + periodicRate));
  const estimatedGain = maturityValue - totalInvestedProjection;

  const selectedStock = stocks.find((s) => String(s.Stock_ID) === String(form.stockId));
  const activeCount = sips.filter((s) => s.Status === 'Active').length;
  const totalMonthly = sips
    .filter((s) => s.Status === 'Active')
    .reduce((sum, s) => sum + Number(s.Amount), 0);

  const filteredSips = sips.filter((s) => {
    const matchesSearch =
      !search ||
      s.Stock_Name.toLowerCase().includes(search.toLowerCase()) ||
      s.Ticker_Symbol.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || s.Status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-ink-50">
      <Head>
        <title>My SIPs · SIP Manager</title>
      </Head>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-ink-900 tracking-tight">My SIPs</h1>
          <p className="text-ink-500 mt-1">Create and manage your systematic investment plans.</p>
        </div>

        {loadError && (
          <div className="mb-6 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            {loadError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Create SIP form — sidebar on large screens */}
          <div className="lg:col-span-1 lg:sticky lg:top-24 space-y-5">
            <div className="bg-white rounded-2xl shadow-card border border-ink-200 p-6">
              <div className="flex items-center gap-3 mb-5">
                <span className="grid place-items-center w-9 h-9 rounded-lg bg-primary-50 text-primary-600 font-bold">+</span>
                <h2 className="text-lg font-bold text-ink-900">Create a new SIP</h2>
              </div>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className={labelClass}>
                    Stock
                    <InfoTip
                      className="ml-1"
                      text="Each SIP invests in one stock. Sector is the industry it belongs to, and Risk Level shows how much its price tends to swing — Low is steadier, High can move more."
                    />
                  </label>
                  <select name="stockId" required value={form.stockId} onChange={handleChange} className={inputClass}>
                    <option value="">Select stock</option>
                    {stocks.map((s) => (
                      <option key={s.Stock_ID} value={s.Stock_ID}>
                        {s.Stock_Name} ({s.Ticker_Symbol})
                      </option>
                    ))}
                  </select>
                  {selectedStock && (
                    <p className="text-xs text-ink-400 mt-1.5">
                      {selectedStock.Sector} · Risk: {selectedStock.Risk_Level} · ₹{Number(selectedStock.Current_Price).toLocaleString('en-IN')}
                      {selectedStock.Last_Updated && (
                        <>
                          {' '}· <span className="text-emerald-600">live</span>{' '}
                          <span title={new Date(selectedStock.Last_Updated).toLocaleString('en-IN')}>
                            (updated {timeAgo(selectedStock.Last_Updated)})
                          </span>
                        </>
                      )}
                    </p>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Amount (₹)</label>
                  <input name="amount" type="number" min="1" step="0.01" required value={form.amount} onChange={handleChange} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>
                    Frequency
                    <InfoTip
                      className="ml-1"
                      text="How often an installment is due. Monthly gives you 12 payments a year, Quarterly gives you 4 — same total commitment, fewer bigger payments."
                    />
                  </label>
                  <select name="frequency" value={form.frequency} onChange={handleChange} className={inputClass}>
                    <option value="Monthly">Monthly</option>
                    <option value="Quarterly">Quarterly</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Start date</label>
                  <input
                    name="startDate" type="date" required
                    min={new Date().toISOString().slice(0, 10)}
                    value={form.startDate} onChange={handleChange} className={inputClass}
                  />
                </div>

                <label className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-100 px-3.5 py-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.roundUpEnabled}
                    onChange={(e) => setForm({ ...form, roundUpEnabled: e.target.checked })}
                    className="mt-0.5 accent-amber-600"
                  />
                  <span>
                    <span className="block text-xs font-semibold text-amber-800">🪙 Round up payments</span>
                    <span className="block text-[11px] text-amber-600 mt-0.5">
                      Rounds each payment up to the nearest ₹50 — the spare change goes toward a goal you link this SIP to.
                    </span>
                  </span>
                </label>

                {amountNum > 0 && (
                  <div className="rounded-xl bg-primary-50 border border-primary-100 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-xs font-medium text-primary-700">Expected annual return</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number" min="0" max="100" step="0.5"
                          value={expectedReturn}
                          onChange={(e) => setExpectedReturn(e.target.value)}
                          className="w-16 border border-primary-200 rounded-md px-2 py-1 text-xs text-right text-primary-800 bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                        <span className="text-xs font-medium text-primary-700">%</span>
                      </div>
                    </div>
                    <div className="text-xs text-primary-600">
                      Projected over the {periodsPerYear === 12 ? '12 monthly' : '4 quarterly'} installments this SIP generates (1 year).
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div>
                        <p className="text-[11px] text-primary-500">Total invested</p>
                        <p className="text-sm font-bold text-primary-900">₹{totalInvestedProjection.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-primary-500">Est. maturity value</p>
                        <p className="text-sm font-bold text-primary-900">₹{maturityValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                      </div>
                    </div>
                    <div className="pt-1 border-t border-primary-100">
                      <p className="text-[11px] text-primary-500 mt-2">Estimated gain</p>
                      <p className="text-sm font-bold text-emerald-700">
                        +₹{Math.max(0, estimatedGain).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <p className="text-[11px] text-primary-400">
                      Illustrative only — actual returns depend on real market performance, not guaranteed.
                    </p>
                  </div>
                )}

                <button
                  type="submit" disabled={submitting}
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-lg py-2.5 text-sm font-semibold shadow-card disabled:opacity-60 transition-colors"
                >
                  {submitting ? 'Creating...' : 'Create SIP'}
                </button>
              </form>
            </div>

            <div className="bg-white rounded-2xl shadow-card border border-ink-200 p-6">
              <h3 className="text-sm font-semibold text-ink-500 mb-4">Summary</h3>
              <div className="flex items-center justify-between py-2 border-b border-ink-100">
                <span className="text-sm text-ink-600">Active SIPs</span>
                <span className="text-sm font-bold text-ink-900">{activeCount}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-ink-600">Monthly commitment</span>
                <span className="text-sm font-bold text-ink-900">₹{totalMonthly.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* SIP table */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by stock or ticker..."
                className="flex-1 min-w-[200px] border border-ink-200 rounded-lg px-3.5 py-2.5 text-sm text-ink-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-ink-200 rounded-lg px-3.5 py-2.5 text-sm text-ink-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="All">All statuses</option>
                <option value="Active">Active</option>
                <option value="Paused">Paused</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div className="bg-white rounded-2xl shadow-card border border-ink-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-ink-50 text-ink-500 text-left border-b border-ink-200">
                <tr>
                  <th className="px-5 py-3.5 font-semibold">Stock</th>
                  <th className="px-5 py-3.5 font-semibold">Amount</th>
                  <th className="px-5 py-3.5 font-semibold">Frequency</th>
                  <th className="px-5 py-3.5 font-semibold">Start Date</th>
                  <th className="px-5 py-3.5 font-semibold">Status</th>
                  <th className="px-5 py-3.5 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableSkeleton />
                ) : sips.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <p className="text-ink-500 font-medium">No SIPs yet</p>
                      <p className="text-ink-400 text-sm mt-1">Create one using the form to get started.</p>
                    </td>
                  </tr>
                ) : filteredSips.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center">
                      <p className="text-ink-500 font-medium">No matching SIPs</p>
                      <p className="text-ink-400 text-sm mt-1">Try a different search or status filter.</p>
                    </td>
                  </tr>
                ) : (
                  filteredSips.map((sip) => (
                    <tr key={sip.SIP_ID} className="border-t border-ink-100 hover:bg-ink-50/60 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-ink-900">
                        {sip.Stock_Name} <span className="text-ink-400 font-normal">({sip.Ticker_Symbol})</span>
                        {sip.Goal_Name && (
                          <span className="block mt-1 text-xs font-normal text-primary-600">
                            🎯 {sip.Goal_Name}
                          </span>
                        )}
                        {sip.Round_Up_Enabled ? (
                          <button
                            onClick={() => handleToggleRoundUp(sip)}
                            className="block mt-1 text-xs font-normal text-amber-600 hover:text-amber-700"
                          >
                            🪙 Round-up: ON
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleRoundUp(sip)}
                            className="block mt-1 text-xs font-normal text-ink-400 hover:text-amber-600"
                          >
                            🪙 Round-up: off
                          </button>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-ink-700">₹{Number(sip.Amount).toLocaleString('en-IN')}</td>
                      <td className="px-5 py-3.5 text-ink-700">{sip.Frequency}</td>
                      <td className="px-5 py-3.5 text-ink-700">{sip.Start_Date}</td>
                      <td className="px-5 py-3.5"><StatusBadge status={sip.Status} /></td>
                      <td className="px-5 py-3.5 space-x-4">
                        <Link href={`/installments/${sip.SIP_ID}`} className="text-primary-600 font-medium hover:text-primary-700">
                          Installments
                        </Link>
                        {sip.Status === 'Active' && (
                          <>
                            <button onClick={() => handlePause(sip.SIP_ID)} className="text-ink-600 font-medium hover:text-ink-800">
                              Pause
                            </button>
                            <button onClick={() => handleCancel(sip.SIP_ID)} className="text-amber-600 font-medium hover:text-amber-700">
                              Cancel
                            </button>
                          </>
                        )}
                        {sip.Status === 'Paused' && (
                          <>
                            <button onClick={() => handleResume(sip.SIP_ID)} className="text-emerald-600 font-medium hover:text-emerald-700">
                              Resume
                            </button>
                            <button onClick={() => handleCancel(sip.SIP_ID)} className="text-amber-600 font-medium hover:text-amber-700">
                              Cancel
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </main>

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState({ open: false })} />
    </div>
  );
}
