export function SkeletonLine({ w = 'w-full', h = 'h-3' }) {
  return <div className={`${w} ${h} rounded bg-white/5 animate-pulse-soft`} />;
}

export function SkeletonCard() {
  return (
    <div className="ap-card p-4 space-y-3">
      <SkeletonLine w="w-24" h="h-3" />
      <SkeletonLine w="w-40" h="h-6" />
      <SkeletonLine w="w-32" h="h-3" />
    </div>
  );
}

export function SkeletonTable({ rows = 6, cols = 5 }) {
  return (
    <div className="ap-card overflow-hidden">
      <table className="ap-table">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => <th key={i}><SkeletonLine w="w-20" h="h-3" /></th>)}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => <td key={c}><SkeletonLine w="w-full" h="h-3" /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SkeletonGrid({ items = 8 }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="ap-card p-3">
          <div className="h-20 rounded-lg bg-white/5 animate-pulse-soft mb-2" />
          <SkeletonLine w="w-3/4" h="h-3" />
          <div className="mt-2"><SkeletonLine w="w-1/2" h="h-3" /></div>
        </div>
      ))}
    </div>
  );
}