export default function Empty({ title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-3">
        <span className="text-2xl">∅</span>
      </div>
      <div className="text-paper-200 font-semibold">{title}</div>
      {subtitle && <div className="text-paper-400 text-sm mt-1 max-w-sm">{subtitle}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}