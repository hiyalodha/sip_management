import { useEffect, useState } from 'react';
import api from '../utils/api';
import { getUser } from '../utils/auth';

// Shared badge-fetching + rendering used on both the Dashboard (compact strip)
// and Profile page (full grid with descriptions).
export function useBadges() {
  const [badges, setBadges] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    api.get(`/badges/${user.userId}`)
      .then((res) => setBadges(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { badges, loading };
}

export function BadgeStrip({ compact = false }) {
  const { badges, loading } = useBadges();

  if (loading) {
    return <div className="h-20 rounded-2xl bg-white border border-ink-200 animate-pulse" />;
  }
  if (!badges) return null;

  return (
    <div className="bg-white rounded-2xl shadow-card border border-ink-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-ink-900">Achievements</h2>
        <span className="text-sm font-semibold text-primary-600">
          {badges.earnedCount}/{badges.totalCount} unlocked
        </span>
      </div>
      <div className={`grid grid-cols-3 sm:grid-cols-4 ${compact ? 'md:grid-cols-7' : 'md:grid-cols-4'} gap-3`}>
        {badges.badges.map((b) => (
          <div
            key={b.key}
            title={b.description}
            className={`flex flex-col items-center text-center gap-1.5 rounded-xl p-3 border transition-colors ${
              b.earned
                ? 'bg-primary-50 border-primary-200'
                : 'bg-ink-50 border-ink-100 opacity-50 grayscale'
            }`}
          >
            <span className="text-2xl">{b.icon}</span>
            <span className={`text-[11px] font-semibold leading-tight ${b.earned ? 'text-primary-800' : 'text-ink-500'}`}>
              {b.label}
            </span>
            {!compact && <span className="text-[10px] text-ink-400 leading-snug">{b.description}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
