import { useCallback, useEffect, useState } from 'react';
import api from '../api';
import Empty from '../components/common/Empty';
import ExportButton from '../components/common/ExportButton';
import OrderDrawer from '../components/OrderDrawer';
import { money, dateTime } from '../utils/format';

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    api.get('/sales', { params: { startDate: startDate || undefined, endDate: endDate || undefined } })
      .then((r) => setSales(r.data.sales));
  }, [startDate, endDate]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-paper-100">Sales History</h1>
          <p className="text-sm text-paper-400 mt-1">All completed sales and invoices</p>
        </div>
        <ExportButton
          filename={`sales-${startDate || 'all'}-${endDate || 'all'}.csv`}
          rows={sales.map((s) => ({
            invoice: s.invoiceNumber, date: s.saleDate,
            customer: s.customer?.name || 'Walk-in',
            status: s.status, total: s.total, paid: s.amountPaid, balance: s.balance,
          }))}
          headers={['invoice', 'date', 'customer', 'status', 'total', 'paid', 'balance']}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="ap-input max-w-[160px]" />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="ap-input max-w-[160px]" />
      </div>

      <div className="ap-card overflow-hidden">
        {sales.length === 0 ? <Empty title="No sales" /> : (
          <table className="ap-table">
            <thead>
              <tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Status</th><th className="text-right">Total</th><th className="text-right">Paid</th><th className="text-right">Balance</th></tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id} onClick={() => setSelected(s)} className="cursor-pointer">
                  <td className="font-mono text-xs">{s.invoiceNumber}</td>
                  <td className="text-xs">{dateTime(s.saleDate)}</td>
                  <td>{s.customer?.name || 'Walk-in'}</td>
                  <td>
                    <span className={`ap-badge-${s.status === 'completed' ? 'success' : s.status === 'cancelled' ? 'danger' : 'warning'} capitalize`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="text-right font-mono">{money(s.total)}</td>
                  <td className="text-right font-mono text-success">{money(s.amountPaid)}</td>
                  <td className={`text-right font-mono ${Number(s.balance) > 0 ? 'text-danger' : ''}`}>{money(s.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <OrderDrawer open={!!selected} onClose={() => setSelected(null)} sale={selected} />
    </div>
  );
}
