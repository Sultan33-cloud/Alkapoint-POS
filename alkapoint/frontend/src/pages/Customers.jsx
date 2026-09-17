import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { PlusIcon, EyeIcon } from '@heroicons/react/24/outline';
import api from '../api';
import Modal from '../components/common/Modal';
import Empty from '../components/common/Empty';
import { money, dateShort } from '../utils/format';

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState({
    name: '', phone: '', altPhone: '', email: '', address: '', creditLimit: 0,
    openingBalance: 0, openingNote: '',
  });

  const load = () => api.get('/customers', { params: { search } }).then((r) => setCustomers(r.data));
  useEffect(() => { load(); }, [search]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/customers', form);
      toast.success('Customer added');
      setOpen(false);
      setForm({ name: '', phone: '', altPhone: '', email: '', address: '', creditLimit: 0, openingBalance: 0, openingNote: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const openDetail = async (id) => {
    const res = await api.get(`/customers/${id}`);
    setDetail(res.data);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-paper-100">Customers</h1>
          <p className="text-sm text-paper-400 mt-1">Manage your customer relationships</p>
        </div>
        <button onClick={() => setOpen(true)} className="ap-btn-primary">
          <PlusIcon className="w-4 h-4" /> New Customer
        </button>
      </div>

      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or phone…" className="ap-input max-w-md" />

      <div className="ap-card overflow-hidden">
        {customers.length === 0 ? (
          <Empty title="No customers yet" />
        ) : (
          <table className="ap-table">
            <thead>
              <tr><th>Name</th><th>Phone</th><th>Email</th><th className="text-right">Balance</th><th className="text-right">Actions</th></tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.name}</td>
                  <td className="font-mono text-xs">{c.phone}</td>
                  <td className="text-paper-400 text-xs">{c.email || '—'}</td>
                  <td className={`text-right font-mono ${Number(c.balance) > 0 ? 'text-danger' : 'text-paper-300'}`}>
                    {money(c.balance)}
                  </td>
                  <td className="text-right">
                    <button onClick={() => openDetail(c.id)} className="text-brand-300"><EyeIcon className="w-4 h-4 inline" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New Customer">
        <form onSubmit={submit} className="space-y-4">
          <div><label className="ap-label">Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="ap-input" required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="ap-label">Phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="ap-input" required /></div>
            <div><label className="ap-label">Alt Phone</label><input value={form.altPhone} onChange={(e) => setForm({ ...form, altPhone: e.target.value })} className="ap-input" /></div>
          </div>
          <div><label className="ap-label">Email</label><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="ap-input" /></div>
          <div><label className="ap-label">Address</label><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="ap-input" /></div>
          <div><label className="ap-label">Credit Limit</label><input type="number" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} className="ap-input" /></div>

          <div className="p-3 rounded-lg border border-gold-500/30 bg-gold-500/5 space-y-3">
            <div className="text-xs font-semibold text-gold-400 uppercase tracking-wider">
              Opening balance (optional)
            </div>
            <div className="text-xs text-paper-400 -mt-2">
              Use this if the customer already owes you money from a previous ledger.
            </div>
            <div>
              <label className="ap-label">Amount owed</label>
              <input
                type="number"
                value={form.openingBalance}
                onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
                placeholder="0.00"
                className="ap-input"
              />
            </div>
            {Number(form.openingBalance) > 0 && (
              <div>
                <label className="ap-label">Reason / note</label>
                <input
                  value={form.openingNote}
                  onChange={(e) => setForm({ ...form, openingNote: e.target.value })}
                  placeholder="e.g. Balance carried from paper ledger"
                  className="ap-input"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="ap-btn-secondary">Cancel</button>
            <button type="submit" className="ap-btn-primary">Create</button>
          </div>
        </form>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.customer?.name} size="lg">
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="ap-card p-3"><div className="ap-kpi-label">Orders</div><div className="text-xl font-bold font-mono">{detail.totals.orders}</div></div>
              <div className="ap-card p-3"><div className="ap-kpi-label">Spent</div><div className="text-xl font-bold font-mono text-success">{money(detail.totals.spent)}</div></div>
              <div className="ap-card p-3"><div className="ap-kpi-label">Balance</div><div className="text-xl font-bold font-mono text-danger">{money(detail.totals.balance)}</div></div>
            </div>
            <div>
              <div className="ap-card-title mb-2">Recent Orders</div>
              <table className="ap-table">
                <thead><tr><th>Invoice</th><th>Date</th><th className="text-right">Total</th><th className="text-right">Balance</th></tr></thead>
                <tbody>
                  {detail.sales.map((s) => (
                    <tr key={s.id}>
                      <td className="font-mono text-xs">{s.invoiceNumber}</td>
                      <td>{dateShort(s.saleDate)}</td>
                      <td className="text-right font-mono">{money(s.total)}</td>
                      <td className="text-right font-mono">{money(s.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}