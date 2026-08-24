import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import Navbar from '../components/Navbar';
import api from '../utils/api';
import { isAuthenticated, getUser } from '../utils/auth';
import { useToast } from '../components/Toast';
import { downloadCsv } from '../utils/csv';

function StatusBadge({ status }) {
  const styles = {
    Success: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    Failed: 'bg-red-50 text-red-700 ring-1 ring-red-200',
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
      {[0, 1, 2, 3].map((i) => (
        <tr key={i} className="border-t border-ink-100">
          {Array.from({ length: 6 }).map((_, j) => (
            <td key={j} className="px-5 py-4">
              <div className="h-4 bg-ink-100 rounded animate-pulse" style={{ width: `${50 + (j % 3) * 20}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export default function TransactionsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingId, setDownloadingId] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  async function handleDownloadReceipt(transactionId) {
    setDownloadingId(transactionId);
    try {
      const res = await api.get(`/transaction/${transactionId}/receipt`, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `receipt-${transactionId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      showToast('Failed to download receipt', 'error');
    } finally {
      setDownloadingId(null);
    }
  }

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login');
      return;
    }
    const user = getUser();
    api.get(`/transaction/user/${user.userId}`)
      .then((res) => setTransactions(res.data.transactions))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load transactions'))
      .finally(() => setLoading(false));
  }, [router]);

  const totalPaid = transactions
    .filter((t) => t.Status === 'Success')
    .reduce((sum, t) => sum + Number(t.Amount), 0);
  const successCount = transactions.filter((t) => t.Status === 'Success').length;

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      !search ||
      t.Stock_Name.toLowerCase().includes(search.toLowerCase()) ||
      t.Ticker_Symbol.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || t.Status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  function handleExportCsv() {
    if (filteredTransactions.length === 0) {
      showToast('Nothing to export.', 'error');
      return;
    }
    downloadCsv(
      'transactions.csv',
      ['Date', 'Stock', 'Ticker', 'Amount', 'Round Up', 'Bank', 'Account No', 'Status', 'SIP ID'],
      filteredTransactions.map((t) => [
        new Date(t.Transaction_Date).toLocaleDateString('en-IN'),
        t.Stock_Name,
        t.Ticker_Symbol,
        Number(t.Amount),
        Number(t.Round_Up_Amount || 0),
        t.Bank_Name,
        t.Account_No,
        t.Status,
        t.SIP_ID
      ])
    );
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <Head>
        <title>Transactions · SIP Manager</title>
      </Head>
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-ink-900 tracking-tight">Transactions</h1>
          <p className="text-ink-500 mt-1">Full payment history across all of your SIPs.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <MiniStat label="Total paid" value={`₹${totalPaid.toLocaleString('en-IN')}`} />
          <MiniStat label="Successful payments" value={successCount} />
          <MiniStat label="Total transactions" value={transactions.length} />
        </div>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>
        )}

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
            <option value="Success">Success</option>
            <option value="Failed">Failed</option>
            <option value="Pending">Pending</option>
          </select>
          <button
            onClick={handleExportCsv}
            className="text-sm font-semibold px-4 py-2.5 rounded-lg border border-ink-200 text-ink-600 hover:bg-ink-50 hover:border-ink-300 transition-colors whitespace-nowrap"
          >
            ⬇ Export CSV
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-card border border-ink-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ink-50 text-ink-500 text-left border-b border-ink-200">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Date</th>
                <th className="px-5 py-3.5 font-semibold">Stock</th>
                <th className="px-5 py-3.5 font-semibold">Amount</th>
                <th className="px-5 py-3.5 font-semibold">Bank Account</th>
                <th className="px-5 py-3.5 font-semibold">Status</th>
                <th className="px-5 py-3.5 font-semibold">SIP</th>
                <th className="px-5 py-3.5 font-semibold">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton />
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <p className="text-ink-500 font-medium">No transactions yet</p>
                    <p className="text-ink-400 text-sm mt-1">Payments you make on installments will show up here.</p>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-16 text-center">
                    <p className="text-ink-500 font-medium">No matching transactions</p>
                    <p className="text-ink-400 text-sm mt-1">Try a different search or status filter.</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => (
                  <tr key={t.Transaction_ID} className="border-t border-ink-100 hover:bg-ink-50/60 transition-colors">
                    <td className="px-5 py-3.5 text-ink-700">
                      {new Date(t.Transaction_Date).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric'
                      })}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-ink-900">
                      {t.Stock_Name} <span className="text-ink-400 font-normal">({t.Ticker_Symbol})</span>
                    </td>
                    <td className="px-5 py-3.5 text-ink-700">
                      ₹{Number(t.Amount).toLocaleString('en-IN')}
                      {Number(t.Round_Up_Amount) > 0 && (
                        <span className="block text-[11px] text-amber-600">+₹{Number(t.Round_Up_Amount).toLocaleString('en-IN')} round-up</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-ink-500">{t.Bank_Name} · {t.Account_No}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={t.Status} /></td>
                    <td className="px-5 py-3.5">
                      <Link href={`/installments/${t.SIP_ID}`} className="text-primary-600 font-medium hover:text-primary-700">
                        SIP #{t.SIP_ID}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      {t.Status === 'Success' ? (
                        <button
                          onClick={() => handleDownloadReceipt(t.Transaction_ID)}
                          disabled={downloadingId === t.Transaction_ID}
                          className="text-primary-600 font-medium hover:text-primary-700 disabled:opacity-50"
                        >
                          {downloadingId === t.Transaction_ID ? 'Downloading...' : '📄 Download'}
                        </button>
                      ) : (
                        <span className="text-ink-300">—</span>
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
