import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid,
} from 'recharts';
import {
  BanknotesIcon, ShoppingBagIcon, UsersIcon, CubeIcon,
  ArrowTrendingUpIcon, ArrowTrendingDownIcon, ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import api from '../api';
import StatCard from '../components/common/StatCard';
import Empty from '../components/common/Empty';
import { money, compact, timeAgo, percent } from '../utils/format';

const PIE_COLORS = ['#0f6e7c', '#d4a24c', '#2ea043', '#388bfd', '#da3633', '#8b949e'];

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [breakdown, setBreakdown] = useState([]);
  const [top, setTop] = useState([]);
  const [activity, setActivity] = useState([]);
  const [period, setPeriod] = useState('30d');
  const [loadedPeriod, setLoadedPeriod] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get('/dashboard/summary'),
      api.get(`/dashboard/sales-trend?period=${period}`),
      api.get('/dashboard/payment-breakdown'),
      api.get('/dashboard/top-products'),
      api.get('/dashboard/recent-activity'),
    ])
      .then(([s, t, b, tp, a]) => {
        if (!active) return;
        setSummary(s.data);
        setTrend(t.data);
        setBreakdown(b.data);
        setTop(tp.data);
        setActivity(a.data);
      })
      .finally(() => {
        if (active) setLoadedPeriod(period);
      });
    return () => { active = false; };
  }, [period]);

  const loading = !summary || loadedPeriod !== period;

  if (loading && !summary) {
    return <div className="text-paper-400 text-sm">Loading dashboard…</div>;
  }

  const currency = summary?.currency || 'KES';
  const growth = summary?.today?.growthPct;
  const isPositive = (growth ?? 0) >= 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-paper-100">Business Overview</h1>
          <p className="text-sm text-paper-400 mt-1">
            Live performance for {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          {['today', '7d', '30d', '90d', '1y'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                period === p ? 'bg-brand-500 text-white' : 'bg-ink-700 text-paper-300 hover:bg-ink-600'
              }`}
            >
              {p === 'today' ? 'Today' : p === '7d' ? '7 days' : p === '30d' ? '30 days' : p === '90d' ? '90 days' : '1 year'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Today's Sales"
          value={money(summary?.today?.sales || 0, currency)}
          sub={
            growth !== null && growth !== undefined ? (
              <span className={`flex items-center gap-1 ${isPositive ? 'text-success' : 'text-danger'}`}>
                {isPositive ? <ArrowTrendingUpIcon className="w-3 h-3" /> : <ArrowTrendingDownIcon className="w-3 h-3" />}
                {percent(Math.abs(growth))} vs yesterday
              </span>
            ) : 'No comparison data'
          }
          tone="brand"
          icon={BanknotesIcon}
        />
        <StatCard label="Today's Profit" value={money(summary?.today?.profit || 0, currency)} sub={`${summary?.today?.count || 0} orders today`} tone="success" icon={ArrowTrendingUpIcon} />
        <StatCard label="Month Revenue" value={money(summary?.month?.sales || 0, currency)} sub={`Net profit ${money(summary?.month?.netProfit || 0, currency)}`} tone="gold" icon={ShoppingBagIcon} />
        <StatCard label="Outstanding Debt" value={money(summary?.totals?.outstandingDebt || 0, currency)} sub={`${summary?.totals?.customers || 0} customers`} tone="danger" icon={UsersIcon} />
        <StatCard label="Total Revenue" value={money(summary?.totals?.revenue || 0, currency)} sub={`Total profit ${money(summary?.totals?.profit || 0, currency)}`} tone="neutral" icon={BanknotesIcon} />
        <StatCard label="Inventory Value" value={money(summary?.totals?.inventoryValue || 0, currency)} sub={`${summary?.totals?.products || 0} active variants`} tone="neutral" icon={CubeIcon} />
        <StatCard label="Month Expenses" value={money(summary?.month?.expenses || 0, currency)} sub="Operating costs this month" tone="neutral" icon={BanknotesIcon} />
        <StatCard label="Low Stock Items" value={summary?.lowStock?.length || 0} sub="Need restocking" tone={summary?.lowStock?.length ? 'danger' : 'success'} icon={ExclamationTriangleIcon} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="ap-card lg:col-span-2">
          <div className="ap-card-header">
            <div>
              <div className="ap-card-title">Sales Trend</div>
              <div className="ap-card-sub">Revenue and profit over time</div>
            </div>
          </div>
          <div className="p-4 h-72">
            {trend.length === 0 ? (
              <Empty title="No sales yet" subtitle="Complete your first sale to see the trend." />
            ) : (
              <ResponsiveContainer>
                <LineChart data={trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8b949e' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#8b949e' }} />
                  <Tooltip
                    contentStyle={{ background: '#1c2128', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => money(v, currency)}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#0f6e7c" strokeWidth={2} dot={false} name="Revenue" />
                  <Line type="monotone" dataKey="profit" stroke="#d4a24c" strokeWidth={2} dot={false} name="Profit" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="ap-card">
          <div className="ap-card-header"><div className="ap-card-title">Payment Methods</div></div>
          <div className="p-4 h-72 flex flex-col">
            {breakdown.length === 0 ? (
              <Empty title="No payments yet" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={breakdown} dataKey="total" nameKey="method" innerRadius={45} outerRadius={70} paddingAngle={2}>
                      {breakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => money(v, currency)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-1 text-xs">
                  {breakdown.map((b, i) => (
                    <div key={b.method} className="flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="capitalize text-paper-200">{b.method}</span>
                      </span>
                      <span className="font-mono text-paper-300">
                        {compact(b.total)} <span className="text-paper-400">({b.percentage}%)</span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="ap-card">
          <div className="ap-card-header">
            <div className="ap-card-title">Top Selling Products</div>
            <Link to="/reports" className="text-xs text-brand-300 hover:text-brand-200">View all →</Link>
          </div>
          <div className="p-4">
            {top.length === 0 ? (
              <Empty title="No sales yet" />
            ) : (
              <ul className="space-y-3">
                {top.slice(0, 5).map((p, i) => (
                  <li key={p.variantId} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-500/15 flex items-center justify-center text-brand-200 font-bold text-xs">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-paper-100 truncate">{p.product}</div>
                      <div className="text-xs text-paper-400">{p.variant}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono font-semibold text-paper-100">{p.units}</div>
                      <div className="text-[10px] text-paper-400">sold</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="ap-card">
          <div className="ap-card-header">
            <div className="ap-card-title">Low Stock Alerts</div>
            <Link to="/inventory" className="text-xs text-brand-300 hover:text-brand-200">Manage →</Link>
          </div>
          <div className="p-4">
            {!summary?.lowStock?.length ? (
              <Empty title="All stocked up" subtitle="No items need restocking right now." />
            ) : (
              <ul className="space-y-2">
                {summary.lowStock.slice(0, 6).map((item) => (
                  <li key={item.id} className="flex items-center justify-between py-1.5">
                    <span className="text-sm text-paper-200 truncate">{item.name}</span>
                    <span className="text-xs font-mono text-danger">{item.stock} / {item.reorderLevel}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="ap-card">
          <div className="ap-card-header">
            <div className="ap-card-title">Recent Sales</div>
            <Link to="/sales" className="text-xs text-brand-300 hover:text-brand-200">View all →</Link>
          </div>
          <div className="p-4">
            {activity.length === 0 ? (
              <Empty title="No recent activity" />
            ) : (
              <ul className="space-y-3">
                {activity.slice(0, 6).map((s) => (
                  <li key={s.id} className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="text-sm text-paper-100 truncate">{s.invoiceNumber}</div>
                      <div className="text-xs text-paper-400 truncate">{s.customer} · {timeAgo(s.date)}</div>
                    </div>
                    <div className="text-sm font-mono font-semibold text-paper-100">{money(s.total, currency)}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
