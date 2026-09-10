import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import Navbar from '../../components/Navbar';
import { useToast } from '../../components/Toast';
import api from '../../utils/api';
import { isAuthenticated, getUser } from '../../utils/auth';
import { downloadCsv } from '../../utils/csv';

const inputClass =
  'border border-ink-200 rounded-lg px-3.5 py-2.5 text-sm text-ink-900 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow';

function StatusBadge({ status }) {
  const styles = {
    Paid: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    Overdue: 'bg-red-50 text-red-700 ring-1 ring-red-200',
    Pending: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
  };
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.Pending}`}>
      {status}
    </span>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="bg-white rounded-2xl shadow-card border border-ink-200 p-5">
      <p className="text-xs font-medium text-ink-500">{label}</p>
      <p className="mt-1.5 text-2xl font-extrabold text-ink-900">{value}</p>
    </div>
  );
}

function TableSkeleton() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <tr key={i} className="border-t border-ink-100">
          {Array.from({ length: 5 }).map((_, j) => (
            <td key={j} className="px-5 py-4">
              <div className="h-4 bg-ink-100 rounded animate-pulse" style={{ width: `${50 + (j % 3) * 20}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function InstallmentsPage() {
  const router = useRouter();
  const { sipId } = router.query;
  const { showToast } = useToast();

  const [installments, setInstallments] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [sipStatus, setSipStatus] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState(null);

  // Add-bank-account inline form state
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [accountForm, setAccountForm] = useState({ accountNo: '', bankName: '', ifscCode: '' });

  // Today's date as YYYY-MM-DD (matches the Due_Date string format from the API)
  function todayStr() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function isPayable(inst) {
    return sipStatus === 'Active' && inst.Status !== 'Paid' && inst.Due_Date <= todayStr();
  }

  async function loadData() {
    if (!sipId) return;
    const user = getUser();
    try {
      const [instRes, acctRes] = await Promise.all([
        api.get(`/installments/${sipId}`),
        api.get(`/bank/user/${user.userId}`)
      ]);
      setInstallments(instRes.data.installments);
      setSipStatus(instRes.data.sipStatus);
      setAccounts(acctRes.data.accounts);
      if (acctRes.data.accounts.length > 0) {
        setSelectedAccount(String(acctRes.data.accounts[0].Account_ID));
      }
    } catch (err) {
      setLoadError(err.response?.data?.error || 'Failed to load installments');
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
  }, [router, sipId]);

  async function handlePay(installmentId) {
    if (!selectedAccount) {
      showToast('Add and select a bank account first.', 'error');
      return;
    }
    setPayingId(installmentId);
    try {
      const res = await api.post('/transaction/pay', { installmentId, accountId: selectedAccount });
      if (res.data.roundUpAmount > 0) {
        showToast(`Payment successful — rounded up ₹${res.data.roundUpAmount} into "${res.data.goalName}" 🪙`);
      } else {
        showToast('Payment successful.');
      }
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Payment failed', 'error');
    } finally {
      setPayingId(null);
    }
  }

  async function handleAddAccount(e) {
    e.preventDefault();
    try {
      await api.post('/bank/create', accountForm);
      showToast('Bank account added.');
      setAccountForm({ accountNo: '', bankName: '', ifscCode: '' });
      setShowAddAccount(false);
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to add bank account', 'error');
    }
  }

  function handleExportCsv() {
    if (installments.length === 0) return;
    downloadCsv(
      `sip-${sipId}-installments.csv`,
      ['Due Date', 'Amount', 'Status', 'Paid Date'],
      installments.map((i) => [i.Due_Date, Number(i.Amount), i.Status, i.Paid_Date || ''])
    );
  }

  const paidCount = installments.filter((i) => i.Status === 'Paid').length;
  const pendingCount = installments.filter((i) => i.Status !== 'Paid').length;
  const paidAmount = installments
    .filter((i) => i.Status === 'Paid')
    .reduce((sum, i) => sum + Number(i.Amount), 0);

  return (
    <div className="min-h-screen bg-ink-50">
      <Head>
        <title>Installments · SIP Manager</title>
      </Head>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div>
          <Link href="/sip" className="text-sm text-ink-500 hover:text-primary-600 font-medium">
            ← Back to My SIPs
          </Link>
          <div className="flex items-center justify-between flex-wrap gap-3 mt-2">
            <h1 className="text-3xl font-extrabold text-ink-900 tracking-tight">
              Installments <span className="text-ink-400 font-semibold">— SIP #{sipId}</span>
            </h1>
            {installments.length > 0 && (
              <button
                onClick={handleExportCsv}
                className="text-sm font-semibold px-4 py-2.5 rounded-lg border border-ink-200 text-ink-600 hover:bg-ink-50 hover:border-ink-300 transition-colors whitespace-nowrap"
              >
                ⬇ Export CSV
              </button>
            )}
          </div>
        </div>

        {sipStatus === 'Paused' && (
          <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            This SIP is paused. Resume it from the My SIPs page before paying any installments.
          </div>
        )}
        {sipStatus === 'Cancelled' && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            This SIP is cancelled. Installments can no longer be paid.
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <MiniStat label="Paid so far" value={`₹${paidAmount.toLocaleString('en-IN')}`} />
          <MiniStat label="Installments paid" value={`${paidCount} / ${installments.length}`} />
          <MiniStat label="Remaining" value={pendingCount} />
        </div>

        {loadError && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{loadError}</div>
        )}

        <div className="bg-white rounded-2xl shadow-card border border-ink-200 p-5 flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-ink-600">Pay from</label>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            className={inputClass}
          >
            {accounts.length === 0 && <option value="">No bank accounts</option>}
            {accounts.map((a) => (
              <option key={a.Account_ID} value={a.Account_ID}>
                {a.Bank_Name} — {a.Account_No}
              </option>
            ))}
          </select>
          <button
            onClick={() => setShowAddAccount(!showAddAccount)}
            className="text-sm text-primary-600 font-semibold hover:text-primary-700"
          >
            {showAddAccount ? 'Cancel' : '+ Add bank account'}
          </button>
        </div>

        {showAddAccount && (
          <form onSubmit={handleAddAccount} className="bg-white rounded-2xl shadow-card border border-ink-200 p-5 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <input
              placeholder="Account number" required
              value={accountForm.accountNo}
              onChange={(e) => setAccountForm({ ...accountForm, accountNo: e.target.value })}
              className={inputClass}
            />
            <input
              placeholder="Bank name" required
              value={accountForm.bankName}
              onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })}
              className={inputClass}
            />
            <input
              placeholder="IFSC code" required
              value={accountForm.ifscCode}
              onChange={(e) => setAccountForm({ ...accountForm, ifscCode: e.target.value.toUpperCase() })}
              className={`${inputClass} uppercase`}
            />
            <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white rounded-lg py-2.5 text-sm font-semibold shadow-card transition-colors">
              Save account
            </button>
          </form>
        )}

        <div className="bg-white rounded-2xl shadow-card border border-ink-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-ink-500 text-left border-b border-ink-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Due Date</th>
                <th className="px-5 py-3.5 font-semibold">Amount</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 font-semibold">Paid Date</th>
                <th className="px-5 py-3.5 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton />
              ) : installments.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-ink-400">No installments found.</td></tr>
              ) : (
                installments.map((inst) => (
                  <tr key={inst.Inst_ID} className="border-t border-ink-100 hover:bg-ink-50/60 transition-colors">
                    <td className="px-5 py-3.5 text-ink-700">{inst.Due_Date}</td>
                    <td className="px-5 py-3.5 font-medium text-ink-900">₹{Number(inst.Amount).toLocaleString('en-IN')}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={inst.Status} /></td>
                    <td className="px-5 py-3.5 text-ink-500">{inst.Paid_Date || '—'}</td>
                    <td className="px-5 py-3.5">
                      {inst.Status === 'Paid' ? (
                        <span className="text-ink-400 text-xs font-medium">Paid</span>
                      ) : isPayable(inst) ? (
                        <button
                          onClick={() => handlePay(inst.Inst_ID)}
                          disabled={payingId === inst.Inst_ID}
                          className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg shadow-card disabled:opacity-60 transition-colors"
                        >
                          {payingId === inst.Inst_ID ? 'Paying...' : 'Pay'}
                        </button>
                      ) : (
                        <span
                          className="text-ink-400 text-xs font-medium bg-ink-100 px-2.5 py-1 rounded-full"
                          title={sipStatus !== 'Active' ? 'This SIP is not active' : 'You can only pay once this installment is due'}
                        >
                          {sipStatus === 'Paused' ? 'SIP paused' : sipStatus === 'Cancelled' ? 'SIP cancelled' : 'Not due yet'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
