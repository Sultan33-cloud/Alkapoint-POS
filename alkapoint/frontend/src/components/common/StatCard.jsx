export default function StatCard({ label, value, sub, tone = 'brand', icon: Icon }) {
  const tones = {
    brand: 'from-brand-500/20 to-brand-500/5 border-brand-500/30 text-brand-200',
    gold: 'from-gold-500/20 to-gold-500/5 border-gold-500/30 text-gold-400',
    success: 'from-success/20 to-success/5 border-success/30 text-success',
    danger: 'from-danger/20 to-danger/5 border-danger/30 text-danger',
    neutral: 'from-white/5 to-white/0 border-white/10 text-paper-200',
  };
  return (
    <div className={`ap-card p-4 bg-gradient-to-br ${tones[tone]}`}>
      <div className="flex items-start justify-between">
        <div className="ap-kpi-label">{label}</div>
        {Icon && <Icon className="w-5 h-5 opacity-70" />}
      </div>
      <div className="ap-kpi-value mt-2">{value}</div>
      {sub && <div className="text-xs text-paper-300 mt-1">{sub}</div>}
    </div>
  );
}