import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
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

const PRESETS = [
  { label: '💻 New Laptop', amount: 60000 },
  { label: '🎓 College Fees', amount: 100000 },
  { label: '✈️ Trip with Friends', amount: 25000 },
  { label: '🏍️ Bike', amount: 80000 },
  { label: '📚 Course / Certification', amount: 15000 },
  { label: '🆘 Emergency Fund', amount: 20000 }
];

// Countdown helpers for a goal's target date — surfaces urgency (or "overdue")
// right next to the deadline instead of leaving the user to do the math.
function daysLeftValue(targetDate) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

function daysLeftLabel(targetDate) {
  const days = daysLeftValue(targetDate);
  if (days < 0) return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'due today';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

function daysLeftClass(targetDate) {
  const days = daysLeftValue(targetDate);
  if (days < 0) return 'text-red-600 font-semibold';
  if (days <= 7) return 'text-amber-600 font-semibold';
  return 'text-ink-400';
}

function GoalCard({ goal, sips, contributors, onDelete, onLeave, onLink, onUnlink, onCopyCode, expandedId, setExpandedId, availableSips, currentUserId }) {
  const pct = Math.min(100, Math.round((goal.Invested / goal.Target_Amount) * 100));
  const isExpanded = expandedId === goal.Goal_ID;
  const [selectedSip, setSelectedSip] = useState('');
  const isShared = goal.MemberCount > 0;

  return (
    <div className="bg-white rounded-2xl shadow-card border border-ink-200 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-ink-900 flex items-center gap-2">
            {goal.Goal_Name}
            {isShared && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-700 ring-1 ring-violet-200">
                👥 {goal.MemberCount + 1} people
              </span>
            )}
          </h3>
          <p className="text-sm text-ink-500 mt-0.5">
            ₹{goal.Invested.toLocaleString('en-IN')} of ₹{goal.Target_Amount.toLocaleString('en-IN')}
            {goal.Target_Date && ` · by ${new Date(goal.Target_Date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
            {goal.Target_Date && !goal.Achieved && (
              <span className={daysLeftClass(goal.Target_Date)}> · {daysLeftLabel(goal.Target_Date)}</span>
            )}
          </p>
        </div>
        {goal.Achieved && (
          <span className="shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
            🎉 Achieved
          </span>
        )}
      </div>

      <div className="mt-4">
        <div className="h-3 rounded-full bg-ink-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${goal.Achieved ? 'bg-emerald-500' : 'bg-primary-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-ink-500 mt-1.5">
          {pct}% funded · {goal.LinkedSips} SIP{goal.LinkedSips !== 1 ? 's' : ''} linked
          {goal.RoundUpTotal > 0 && (
            <span className="text-amber-600"> · 🪙 +₹{goal.RoundUpTotal.toLocaleString('en-IN')} from round-ups</span>
          )}
        </p>
      </div>

      <div className="flex items-center gap-4 mt-4 flex-wrap">
        <button
          onClick={() => setExpandedId(isExpanded ? null : goal.Goal_ID)}
          className="text-sm text-primary-600 font-semibold hover:text-primary-700"
        >
          {isExpanded ? 'Hide details' : 'Manage / Invite'}
        </button>
        {goal.IsOwner ? (
          <button
            onClick={() => onDelete(goal.Goal_ID)}
            className="text-sm text-red-600 font-semibold hover:text-red-700"
          >
            Delete goal
          </button>
        ) : (
          <button
            onClick={() => onLeave(goal.Goal_ID)}
            className="text-sm text-red-600 font-semibold hover:text-red-700"
          >
            Leave goal
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-ink-100 space-y-4">
          <div className="flex items-center justify-between bg-ink-50 rounded-lg px-3.5 py-2.5">
            <div>
              <p className="text-[11px] text-ink-400">Invite code — share with friends to split this goal</p>
              <p className="text-sm font-mono font-bold text-ink-900 tracking-widest">{goal.Invite_Code || '——————'}</p>
            </div>
            <button
              onClick={() => onCopyCode(goal.Invite_Code)}
              className="text-xs font-semibold text-primary-600 hover:text-primary-700"
            >
              Copy
            </button>
          </div>

          {contributors && contributors.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-ink-500 mb-2">Contributors</p>
              <div className="space-y-1.5">
                {contributors.map((c) => (
                  <div key={c.userId} className="flex items-center justify-between text-sm">
                    <span className="text-ink-700">{c.name}</span>
                    <span className="font-semibold text-ink-900">₹{c.contributed.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-ink-500 mb-2">SIPs linked</p>
            {sips.length === 0 ? (
              <p className="text-sm text-ink-400">No SIPs linked yet.</p>
            ) : (
              <div className="space-y-2">
                {sips.map((s) => (
                  <div key={s.SIP_ID} className="flex items-center justify-between border border-ink-100 rounded-lg px-3.5 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-ink-800">
                        {s.Stock_Name} <span className="text-ink-400 font-normal">({s.Ticker_Symbol})</span>
                      </p>
                      <p className="text-xs text-ink-400">
                        ₹{Number(s.Amount).toLocaleString('en-IN')} · {s.Frequency} · {s.First_Name} {s.Last_Name}
                      </p>
                    </div>
                    {s.User_ID === currentUserId && (
                      <button
                        onClick={() => onUnlink(s.SIP_ID)}
                        className="text-xs font-semibold text-ink-500 hover:text-red-600"
                      >
                        Unlink
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {availableSips.length > 0 && (
              <div className="flex gap-2 pt-2">
                <select
                  value={selectedSip}
                  onChange={(e) => setSelectedSip(e.target.value)}
                  className="flex-1 border border-ink-200 rounded-lg px-3 py-2 text-sm text-ink-900"
                >
                  <option value="">Select one of your SIPs to link...</option>
                  {availableSips.map((s) => (
                    <option key={s.SIP_ID} value={s.SIP_ID}>
                      {s.Stock_Name} ({s.Ticker_Symbol}) · ₹{Number(s.Amount).toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    if (!selectedSip) return;
                    onLink(selectedSip, goal.Goal_ID);
                    setSelectedSip('');
                  }}
                  className="shrink-0 bg-ink-900 hover:bg-ink-800 text-white rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
                >
                  Link
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function GoalsPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [goals, setGoals] = useState([]);
  const [allSips, setAllSips] = useState([]);
  const [goalSipsMap, setGoalSipsMap] = useState({});
  const [contributorsMap, setContributorsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const [form, setForm] = useState({ goalName: '', targetAmount: '', targetDate: '' });
  const [creating, setCreating] = useState(false);

  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  const [confirmState, setConfirmState] = useState({ open: false });

  async function loadData() {
    const user = getUser();
    try {
      const [goalsRes, sipsRes] = await Promise.all([
        api.get(`/goals/user/${user.userId}`),
        api.get(`/sip/user/${user.userId}`)
      ]);
      setGoals(goalsRes.data.goals);
      setAllSips(sipsRes.data.sips);

      const sipsByGoal = {};
      const contributorsByGoal = {};
      await Promise.all(
        goalsRes.data.goals.map(async (g) => {
          const [sipsRes2, contribRes] = await Promise.all([
            api.get(`/goals/${g.Goal_ID}/sips`),
            api.get(`/goals/${g.Goal_ID}/contributors`)
          ]);
          sipsByGoal[g.Goal_ID] = sipsRes2.data.sips;
          contributorsByGoal[g.Goal_ID] = contribRes.data.contributors;
        })
      );
      setGoalSipsMap(sipsByGoal);
      setContributorsMap(contributorsByGoal);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to load goals', 'error');
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

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    try {
      await api.post('/goals/create', form);
      showToast('Goal created.');
      setForm({ goalName: '', targetAmount: '', targetDate: '' });
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to create goal', 'error');
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      const res = await api.post('/goals/join', { inviteCode: joinCode.trim() });
      showToast(res.data.message);
      setJoinCode('');
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to join goal', 'error');
    } finally {
      setJoining(false);
    }
  }

  function handleCopyCode(code) {
    if (!code) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code);
      showToast('Invite code copied.');
    } else {
      showToast(`Invite code: ${code}`);
    }
  }

  function handleDelete(goalId) {
    setConfirmState({
      open: true,
      title: 'Delete this goal?',
      message: 'Linked SIPs stay untouched — they just stop being tied to this goal. Members lose access too.',
      confirmLabel: 'Delete goal',
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/goals/${goalId}`);
          showToast('Goal deleted.');
          loadData();
        } catch (err) {
          showToast(err.response?.data?.error || 'Failed to delete goal', 'error');
        }
      }
    });
  }

  function handleLeave(goalId) {
    setConfirmState({
      open: true,
      title: 'Leave this shared goal?',
      message: 'Your SIPs linked to it will be unlinked, but kept as-is.',
      confirmLabel: 'Leave goal',
      danger: true,
      onConfirm: async () => {
        try {
          await api.delete(`/goals/${goalId}/leave`);
          showToast('Left the goal.');
          loadData();
        } catch (err) {
          showToast(err.response?.data?.error || 'Failed to leave goal', 'error');
        }
      }
    });
  }

  async function handleLink(sipId, goalId) {
    try {
      await api.put('/goals/link', { sipId, goalId });
      showToast('SIP linked to goal.');
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to link SIP', 'error');
    }
  }

  async function handleUnlink(sipId) {
    try {
      await api.put('/goals/link', { sipId, goalId: null });
      showToast('SIP unlinked.');
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to unlink SIP', 'error');
    }
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <Head>
        <title>Goals · SIP Manager</title>
      </Head>
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div>
          <h1 className="text-3xl font-extrabold text-ink-900 tracking-tight">Savings Goals</h1>
          <p className="text-ink-500 mt-1">Tie your SIPs to something real — a laptop, fees, a trip — and watch it fill up.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-card border border-ink-200 p-6">
            <h2 className="text-lg font-bold text-ink-900 mb-4">
              Create a goal
              <InfoTip
                className="ml-1.5"
                text="A goal ties a target amount (like a laptop's price) to one or more SIPs. As those SIPs pay off, your goal fills up — nothing extra to manage."
              />
            </h2>

            <div className="flex flex-wrap gap-2 mb-4">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setForm({ ...form, goalName: p.label, targetAmount: String(p.amount) })}
                  className="text-xs font-medium px-3 py-1.5 rounded-full bg-ink-100 text-ink-600 hover:bg-primary-50 hover:text-primary-700 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div className="sm:col-span-2">
                <label className={labelClass}>Goal name</label>
                <input
                  required
                  value={form.goalName}
                  onChange={(e) => setForm({ ...form, goalName: e.target.value })}
                  placeholder="e.g. New Laptop"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Target amount (₹)</label>
                <input
                  type="number" min="1" required
                  value={form.targetAmount}
                  onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Target date (optional)</label>
                <input
                  type="date"
                  value={form.targetDate}
                  onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
                  className={inputClass}
                />
              </div>
              <button
                type="submit" disabled={creating}
                className="sm:col-span-4 bg-primary-600 hover:bg-primary-700 text-white rounded-lg py-2.5 text-sm font-semibold shadow-card disabled:opacity-60 transition-colors"
              >
                {creating ? 'Creating...' : 'Create goal'}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-2xl shadow-card border border-ink-200 p-6">
            <h2 className="text-lg font-bold text-ink-900 mb-1.5">
              👥 Join a friend's goal
              <InfoTip
                className="ml-1.5"
                text="Splitting a goal with friends? Whoever created it can share a 6-character invite code from the goal's 'Manage / Invite' panel. Enter it here to join and link your own SIPs to it."
              />
            </h2>
            <p className="text-xs text-ink-400 mb-4">Got an invite code from a friend? Enter it to join their shared goal.</p>
            <form onSubmit={handleJoin} className="space-y-3">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. 7XQ2KP"
                maxLength={8}
                className={`${inputClass} uppercase tracking-widest font-mono text-center`}
              />
              <button
                type="submit" disabled={joining || !joinCode.trim()}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-lg py-2.5 text-sm font-semibold shadow-card disabled:opacity-60 transition-colors"
              >
                {joining ? 'Joining...' : 'Join goal'}
              </button>
            </form>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[0, 1].map((i) => (
              <div key={i} className="h-48 rounded-2xl bg-white border border-ink-200 animate-pulse" />
            ))}
          </div>
        ) : goals.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-card border border-ink-200 p-10 text-center">
            <p className="text-ink-500 font-medium">No goals yet</p>
            <p className="text-ink-400 text-sm mt-1">Pick a preset above or create your own to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {goals.map((g) => (
              <GoalCard
                key={g.Goal_ID}
                goal={g}
                sips={goalSipsMap[g.Goal_ID] || []}
                contributors={contributorsMap[g.Goal_ID] || []}
                onDelete={handleDelete}
                onLeave={handleLeave}
                onLink={handleLink}
                onUnlink={handleUnlink}
                onCopyCode={handleCopyCode}
                expandedId={expandedId}
                setExpandedId={setExpandedId}
                availableSips={allSips.filter((s) => s.Goal_ID !== g.Goal_ID)}
                currentUserId={getUser()?.userId}
              />
            ))}
          </div>
        )}
      </main>

      <ConfirmDialog state={confirmState} onClose={() => setConfirmState({ open: false })} />
    </div>
  );
}
