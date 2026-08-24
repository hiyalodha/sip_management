import InfoTip from './InfoTip';

export default function StatCard({ label, value, icon, tone = 'primary', infoText }) {
  const tones = {
    primary: 'bg-primary-50 text-primary-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600'
  };

  return (
    <div className="bg-white rounded-2xl shadow-card border border-ink-200 p-6 flex items-start justify-between hover:shadow-card-lg transition-shadow">
      <div>
        <p className="text-sm font-medium text-ink-500">
          {label}
          {infoText && <InfoTip text={infoText} className="ml-1.5" />}
        </p>
        <p className="mt-2 text-3xl font-extrabold text-ink-900 tracking-tight">{value}</p>
      </div>
      {icon && (
        <span className={`grid place-items-center w-11 h-11 rounded-xl shrink-0 ${tones[tone] || tones.primary}`}>
          {icon}
        </span>
      )}
    </div>
  );
}
