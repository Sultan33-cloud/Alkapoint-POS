import { useEffect, useState } from 'react';
import api from '../api';
import Empty from '../components/common/Empty';
import ExportButton from '../components/common/ExportButton';
import { money } from '../utils/format';

const today = new Date();
const defaultEndDate = today.toISOString().slice(0, 10);
const defaultStartDate = new Date(today.getTime() - 30 * 864e5).toISOString().slice(0, 10);

export default function Reports() {
  const [tab, setTab] = useState('sales');
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);
  const [sales, setSales] = useState(null);
  const [pl, setPl] = useState(null);
  const [inv, setInv] = useState(null);
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    api.get('/reports/sales', { params: { startDate, endDate, groupBy: 'day' } }).then((r) => setSales(r.data));
    api.get('/reports/profit-loss', { params: { startDate, endDate } }).then((r) => setPl(r.data));
    api.get('/reports/inventory-valuation').then((r) => setInv(r.data));
    api.get('/reports/customers').then((r) => setCustomers(r.data));
  }, [startDate, endDate]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-paper-100">Reports</h1>
        <p className="text-sm text-paper-400 mt-1">Business analytics and financial summaries</p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="ap-input max-w-[160px]" />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="ap-input max-w-[160px]" />
        <div className="flex gap-2">
          {[
            { k: 'sales', l: 'Sales' },
            { k: 'pl', l: 'P&L' },
            { k: 'inventory', l: 'Inventory' },
            { k: 'customers', l: 'Customers' },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${tab === t.k ? 'bg-brand-500 text-white' : 'bg-ink-700 text-paper-300'}`}
            >
              {t.l}
            </button>
          ))}
        </div>
      </div>

      {tab === 'sales' && sales && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <ExportButton
              filename={`sales-report-${startDate}-${endDate}.csv`}
              rows={(sales.groups || []).map((g) => ({
                date: g.key, revenue: g.revenue, cost: g.cost, profit: g.profit, orders: g.orders,
              }))}
              headers={['date', 'revenue', 'cost', 'profit', 'orders']}
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="ap-card p-3"><div className="ap-kpi-label">Revenue</div><div className="text-xl font-bold font-mono">{money(sales.summary.revenue)}</div></div>
            <div className="ap-card p-3"><div className="ap-kpi-label">Cost</div><div className="text-xl font-bold font-mono text-danger">{money(sales.summary.cost)}</div></div>
            <div className="ap-card p-3"><div className="ap-kpi-label">Profit</div><div className="text-xl font-bold font-mono text-success">{money(sales.summary.profit)}</div></div>
            <div className="ap-card p-3"><div className="ap-kpi-label">Orders</div><div className="text-xl font-bold font-mono">{sales.summary.orders}</div></div>
          </div>
          <div className="ap-card overflow-hidden">
            <table className="ap-table">
              <thead><tr><th>Date</th><th className="text-right">Revenue</th><th className="text-right">Cost</th><th className="text-right">Profit</th><th className="text-right">Orders</th></tr></thead>
              <tbody>
                {sales.groups.map((g) => (
                  <tr key={g.key}>
                    <td>{g.key}</td>
                    <td className="text-right font-mono">{money(g.revenue)}</td>
                    <td className="text-right font-mono text-danger">{money(g.cost)}</td>
                    <td className="text-right font-mono text-success">{money(g.profit)}</td>
                    <td className="text-right font-mono">{g.orders}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'pl' && pl && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="ap-card p-5 space-y-3">
            <div className="ap-card-title">Profit & Loss</div>
            <div className="flex justify-between"><span className="text-paper-300">Revenue</span><span className="font-mono">{money(pl.revenue)}</span></div>
            <div className="flex justify-between"><span className="text-paper-300">COGS</span><span className="font-mono text-danger">-{money(pl.cogs)}</span></div>
            <div className="flex justify-between pt-2 border-t border-white/5"><span className="text-paper-200 font-semibold">Gross Profit</span><span className="font-mono text-success">{money(pl.grossProfit)}</span></div>
            <div className="flex justify-between"><span className="text-paper-300">Operating Expenses</span><span className="font-mono text-danger">-{money(pl.expenses)}</span></div>
            <div className="flex justify-between pt-2 border-t border-white/5">
              <span className="text-paper-100 font-bold">Net Profit</span>
              <span className={`font-mono font-bold ${pl.netProfit >= 0 ? 'text-success' : 'text-danger'}`}>{money(pl.netProfit)}</span>
            </div>
          </div>
          <div className="ap-card p-5">
            <div className="ap-card-title mb-3">Expense Breakdown</div>
            {pl.expenseBreakdown.length === 0 ? <Empty title="No expenses" /> : (
              <ul className="space-y-2">
                {pl.expenseBreakdown.map((e) => (
                  <li key={e.category} className="flex justify-between text-sm">
                    <span className="text-paper-200">{e.category}</span>
                    <span className="font-mono text-danger">{money(e.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === 'inventory' && inv && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="ap-card p-4">
              <div className="ap-kpi-label">Total Inventory Value</div>
              <div className="text-2xl font-bold font-mono text-gold-400">{money(inv.totalValue)}</div>
            </div>
            <ExportButton
              filename={`inventory-valuation-${new Date().toISOString().slice(0, 10)}.csv`}
              rows={inv.items.map((it) => ({
                product: it.product, variant: it.variant,
                quantity: it.quantity, avgCost: it.avgCost, value: it.value,
              }))}
              headers={['product', 'variant', 'quantity', 'avgCost', 'value']}
            />
          </div>
          <div className="ap-card overflow-hidden">
            <table className="ap-table">
              <thead><tr><th>Product</th><th>Variant</th><th className="text-right">Qty</th><th className="text-right">Avg Cost</th><th className="text-right">Value</th></tr></thead>
              <tbody>
                {inv.items.map((it, i) => (
                  <tr key={i}>
                    <td>{it.product}</td>
                    <td>{it.variant}</td>
                    <td className="text-right font-mono">{it.quantity}</td>
                    <td className="text-right font-mono">{money(it.avgCost)}</td>
                    <td className="text-right font-mono">{money(it.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'customers' && (
        <div className="ap-card overflow-hidden">
          <table className="ap-table">
            <thead><tr><th>Customer</th><th>Phone</th><th className="text-right">Orders</th><th className="text-right">Spent</th><th className="text-right">Outstanding</th></tr></thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td className="font-mono text-xs">{c.phone}</td>
                  <td className="text-right font-mono">{c.orders}</td>
                  <td className="text-right font-mono text-success">{money(c.spent)}</td>
                  <td className="text-right font-mono text-danger">{money(c.outstanding)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
