import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { BanknotesIcon, PlusIcon } from '@heroicons/react/24/outline';
import api from '../api';
import Modal from '../components/common/Modal';
import Empty from '../components/common/Empty';
import ExportButton from '../components/common/ExportButton';
import PaymentModal from '../components/PaymentModal';
import { money } from '../utils/format';

export default function Debtors() {
  const [debtors, setDebtors] = useState([]);
  const [aging, setAging] = useState(null);
  const [payFor, setPayFor] = useState(null);
  const [newDebtOpen, setNewDebtOpen] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [debtForm, setDebtForm] = useState({ amount: '', description: '', dueDate: '', reference: '' });

  const load = () => {
    api.get('/debtors').then((r) => setDebtors(r.data));
    api.get('/debtors/aging').then((r) => setAging(r.data));
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (customerSearch.length < 2) { setCustomers([]); return; }
    api.get('/customers', { params: { search: customerSearch } }).then((r) => setCustomers(r.data));
  }, [customerSearch]);

  const resetDebtForm = () => {
    setDebtForm({ amount: '', description: '', dueDate: '', reference: '' });
    setSelectedCustomer(null);
    setCustomerSearch('');
    setCustomers([]);
  };

  const submitManualDebt = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return toast.error('Select a customer');
    const amt = Number(debtForm.amount);
    if (!amt || amt <= 0) return toast.error('Enter a valid amount');

    try {
      await api.post('/debtors/manual', {
        customerId: selectedCustomer.id,
        amount: amt,
        description: debtForm.description || 'Manual debt entry',
        dueDate: debtForm.dueDate || null,
        reference: debtForm.reference || null,
      });
      toast.success(`Debt of ${money(amt)} added to ${selectedCustomer.name}`);
      setNewDebtOpen(false);
      resetDebtForm();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-paper-100">Debtors</h1>
          <p className="text-sm text-paper-400 mt-1">Outstanding customer credit</p>
        </div>
        <div className="flex gap-2">
          <ExportButton
            filename={`debtors-${new Date().toISOString().slice(0, 10)}.csv`}
            rows={debtors.map((d) => ({
              name: d.name, phone: d.phone, balance: d.balance,
              current: d.aging.current, days30: d.aging.days30,
              days60: d.aging.days60, days90: d.aging.days90, days90plus: d.aging.days90plus,
            }))}
            headers={['name', 'phone', 'balance', 'current', 'days30', 'days60', 'days90', 'days90plus']}
          />
          <button onClick={() => setNewDebtOpen(true)} className="ap-btn-primary">
            <PlusIcon className="w-4 h-4" /> Add debt manually
          </button>
        </div>
      </div>

      {aging && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="ap-card p-3"><div className="ap-kpi-label">Current</div><div className="text-lg font-mono text-success">{money(aging.current)}</div></div>
          <div className="ap-card p-3"><div className="ap-kpi-label">1-30 days</div><div className="text-lg font-mono text-warning">{money(aging.days30)}</div></div>
          <div className="ap-card p-3"><div className="ap-kpi-label">31-60 days</div><div className="text-lg font-mono text-warning">{money(aging.days60)}</div></div>
          <div className="ap-card p-3"><div className="ap-kpi-label">61-90 days</div><div className="text-lg font-mono text-danger">{money(aging.days90)}</div></div>
          <div className="ap-card p-3"><div className="ap-kpi-label">90+ days</div><div className="text-lg font-mono text-danger">{money(aging.days90plus)}</div></div>
        </div>
      )}

      <div className="ap-card overflow-hidden">
        {debtors.length === 0 ? (
          <Empty title="No debtors" subtitle="All customers are paid up, or no customers yet." />
        ) : (
          <table className="ap-table">
            <thead>
              <tr><th>Customer</th><th>Phone</th><th className="text-right">Balance</th><th className="text-right">Credit Limit</th><th>Aging</th><th className="text-right">Action</th></tr>
            </thead>
            <tbody>
              {debtors.map((d) => (
                <tr key={d.id}>
                  <td className="font-medium">{d.name}</td>
                  <td className="font-mono text-xs">{d.phone}</td>
                  <td className="text-right font-mono text-danger">{money(d.balance)}</td>
                  <td className="text-right font-mono text-paper-400">{money(d.creditLimit)}</td>
                  <td className="text-xs">
                    {d.aging.days90plus > 0 && <span className="ap-badge-danger mr-1">90+: {money(d.aging.days90plus)}</span>}
                    {d.aging.days60 > 0 && <span className="ap-badge-warning mr-1">60: {money(d.aging.days60)}</span>}
                    {d.aging.days30 > 0 && <span className="ap-badge-info mr-1">30: {money(d.aging.days30)}</span>}
                  </td>
                  <td className="text-right">
                    <button onClick={() => setPayFor(d)} className="ap-btn-primary text-xs py-1.5 px-3">
                      <BanknotesIcon className="w-3.5 h-3.5" /> Pay
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <PaymentModal
        open={!!payFor}
        onClose={() => setPayFor(null)}
        onSaved={load}
        mode="debtor"
        fixedCustomerId={payFor?.id}
      />

      <Modal open={newDebtOpen} onClose={() => { setNewDebtOpen(false); resetDebtForm(); }} title="Add Debt Manually">
        <form onSubmit={submitManualDebt} className="space-y-4">
          <div className="p-3 rounded-lg text-xs bg-warning/10 text-warning border border-warning/30">
            Use this to add an opening balance, migrate from a paper ledger, or record a charge
            that wasn't tied to a product sale. It flows through aging and statements exactly like a credit sale.
          </div>

          <div>
            <label className="ap-label">Customer</label>
            {selectedCustomer ? (
              <div className="flex items-center justify-between p-3 rounded-lg bg-ink-900 border border-white/10">
                <div>
                  <div className="text-sm font-medium text-paper-100">{selectedCustomer.name}</div>
                  <div className="text-xs text-paper-400">
                    {selectedCustomer.phone || '—'} · Current balance: {money(selectedCustomer.balance)}
                  </div>
                </div>
                <button type="button" onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }} className="text-xs text-paper-400 hover:text-danger">
                  Change
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search by name or phone…"
                  className="ap-input"
                />
                {customers.length > 0 && customerSearch.length >= 2 && (
                  <div className="mt-2 ap-card p-2 max-h-40 overflow-y-auto">
                    {customers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { setSelectedCustomer(c); setCustomers([]); }}
                        className="w-full text-left px-3 py-2 rounded hover:bg-white/5 text-sm"
                      >
                        <span className="font-medium">{c.name}</span>
                        <span className="text-paper-400 ml-2">{c.phone}</span>
                        {Number(c.balance) > 0 && (
                          <span className="text-danger ml-2 text-xs">Owes {money(c.balance)}</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div>
            <label className="ap-label">Amount</label>
            <input type="number" step="0.01" value={debtForm.amount} onChange={(e) => setDebtForm({ ...debtForm, amount: e.target.value })} className="ap-input" required />
          </div>

          <div>
            <label className="ap-label">Reason / description</label>
            <input
              value={debtForm.description}
              onChange={(e) => setDebtForm({ ...debtForm, description: e.target.value })}
              placeholder="e.g. Opening balance from paper ledger"
              className="ap-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="ap-label">Due date (optional)</label>
              <input type="date" value={debtForm.dueDate} onChange={(e) => setDebtForm({ ...debtForm, dueDate: e.target.value })} className="ap-input" />
            </div>
            <div>
              <label className="ap-label">Reference (optional)</label>
              <input value={debtForm.reference} onChange={(e) => setDebtForm({ ...debtForm, reference: e.target.value })} placeholder="e.g. LEDGER-014" className="ap-input" />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
            <button type="button" onClick={() => { setNewDebtOpen(false); resetDebtForm(); }} className="ap-btn-secondary">Cancel</button>
            <button type="submit" className="ap-btn-primary">Record debt</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}