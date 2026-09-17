import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  PlusIcon, CreditCardIcon, DevicePhoneMobileIcon,
} from '@heroicons/react/24/outline';
import api from '../api';
import Modal from '../components/common/Modal';
import Empty from '../components/common/Empty';
import PaymentModal from '../components/PaymentModal';
import { money, dateShort } from '../utils/format';

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [method, setMethod] = useState('');
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const [standaloneOpen, setStandaloneOpen] = useState(false);
  const [mpesaOpen, setMpesaOpen] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [mpesaStatus, setMpesaStatus] = useState({ configured: false });

  const [mpesaForm, setMpesaForm] = useState({ phone: '', amount: '', accountRef: '', description: '' });
  const [cardForm, setCardForm] = useState({ amount: '', reference: '' });

  const load = () => {
    setLoading(true);
    setRefreshKey((key) => key + 1);
  };

  useEffect(() => {
    let cancelled = false;

    api.get('/payments', { params: { method: method || undefined, type: type || undefined } })
      .then((r) => { if (!cancelled) setPayments(r.data); })
      .catch((err) => { if (!cancelled) toast.error(err.response?.data?.message || 'Failed to load payments'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [method, type, refreshKey]);

  useEffect(() => { api.get('/payments/mpesa/status').then((r) => setMpesaStatus(r.data)); }, []);

  const changeMethod = (value) => {
    setLoading(true);
    setMethod(value);
  };

  const changeType = (value) => {
    setLoading(true);
    setType(value);
  };

  const submitMpesa = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/payments/mpesa/initiate', mpesaForm);
      if (res.data.mock) {
        toast('M-Pesa is not configured yet. Configure Daraja credentials in backend .env to enable live STK push.', { icon: 'ℹ️', duration: 6000 });
      } else {
        toast.success('STK push sent. Ask the customer to enter their PIN.');
      }
      setMpesaOpen(false);
      setMpesaForm({ phone: '', amount: '', accountRef: '', description: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'M-Pesa request failed');
    }
  };

  const submitCard = async (e) => {
    e.preventDefault();
    try {
      await api.post('/payments', {
        amount: Number(cardForm.amount),
        method: 'card',
        reference: cardForm.reference || null,
        notes: 'Card terminal payment',
      });
      toast.success('Card payment recorded');
      setCardOpen(false);
      setCardForm({ amount: '', reference: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const totalThisView = payments.reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-paper-100">Payments</h1>
          <p className="text-sm text-paper-400 mt-1">
            {payments.length} records · total {money(totalThisView)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setCardOpen(true)} className="ap-btn-secondary">
            <CreditCardIcon className="w-4 h-4" /> Record card
          </button>
          <button
            onClick={() => setMpesaOpen(true)}
            className="ap-btn-secondary"
            title={mpesaStatus.configured ? '' : 'M-Pesa not configured — will use mock mode'}
          >
            <DevicePhoneMobileIcon className="w-4 h-4" /> M-Pesa STK push
            {!mpesaStatus.configured && <span className="ml-1 text-[10px] opacity-70">(mock)</span>}
          </button>
          <button onClick={() => setStandaloneOpen(true)} className="ap-btn-primary">
            <PlusIcon className="w-4 h-4" /> Record payment
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[11px] uppercase tracking-wider text-paper-400 font-semibold">Method</span>
        {['', 'cash', 'mpesa', 'bank', 'card', 'other'].map((m) => (
          <button
            key={m}
            onClick={() => changeMethod(m)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${method === m ? 'bg-brand-500 text-white' : 'bg-ink-700 text-paper-300'}`}
          >
            {m || 'All'}
          </button>
        ))}
        <span className="text-[11px] uppercase tracking-wider text-paper-400 font-semibold ml-4">Type</span>
        {[
          { v: '', l: 'All' },
          { v: 'sale', l: 'Sale' },
          { v: 'purchase', l: 'Supplier' },
          { v: 'debtor', l: 'Debtor' },
          { v: 'other', l: 'Other' },
        ].map((t) => (
          <button
            key={t.v}
            onClick={() => changeType(t.v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${type === t.v ? 'bg-brand-500 text-white' : 'bg-ink-700 text-paper-300'}`}
          >
            {t.l}
          </button>
        ))}
      </div>

      <div className="ap-card overflow-hidden">
        {loading ? (
          <div className="p-6 text-paper-400 text-sm">Loading payments…</div>
        ) : payments.length === 0 ? (
          <Empty title="No payments" subtitle="Complete a sale or record a manual payment." />
        ) : (
          <div className="overflow-x-auto">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Related to</th>
                  <th>Customer / Supplier</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th className="text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="text-xs">{dateShort(p.paymentDate)}</td>
                    <td>
                      <span className={`ap-badge-${
                        p.type === 'sale' ? 'info'
                        : p.type === 'purchase' ? 'warning'
                        : p.type === 'debtor' ? 'success'
                        : 'neutral'
                      } capitalize`}>
                        {p.type}
                      </span>
                    </td>
                    <td className="font-mono text-xs">
                      {p.sale?.invoiceNumber || p.purchase?.reference || '—'}
                    </td>
                    <td>{p.customer?.name || p.purchase?.supplier?.name || 'Walk-in'}</td>
                    <td className="capitalize text-xs">{p.method}</td>
                    <td className="text-xs text-paper-400">{p.reference || '—'}</td>
                    <td className="text-right font-mono text-success">{money(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Standalone payment */}
      <PaymentModal
        open={standaloneOpen}
        onClose={() => setStandaloneOpen(false)}
        onSaved={load}
        mode="standalone"
      />

      {/* M-Pesa STK push */}
      <Modal open={mpesaOpen} onClose={() => setMpesaOpen(false)} title="M-Pesa STK Push">
        <form onSubmit={submitMpesa} className="space-y-4">
          <div className={`p-3 rounded-lg text-xs ${mpesaStatus.configured ? 'bg-success/10 text-success border border-success/30' : 'bg-warning/10 text-warning border border-warning/30'}`}>
            {mpesaStatus.configured
              ? 'Live Daraja credentials detected. This will send a real STK push.'
              : 'M-Pesa Daraja is not configured. This will return a mock response so you can test the flow.'}
          </div>
          <div>
            <label className="ap-label">Customer phone</label>
            <input value={mpesaForm.phone} onChange={(e) => setMpesaForm({ ...mpesaForm, phone: e.target.value })} placeholder="+254712345678" className="ap-input" required />
          </div>
          <div>
            <label className="ap-label">Amount</label>
            <input type="number" value={mpesaForm.amount} onChange={(e) => setMpesaForm({ ...mpesaForm, amount: e.target.value })} className="ap-input" required />
          </div>
          <div>
            <label className="ap-label">Account reference</label>
            <input value={mpesaForm.accountRef} onChange={(e) => setMpesaForm({ ...mpesaForm, accountRef: e.target.value })} placeholder="INV-20250101-1234" className="ap-input" />
          </div>
          <div>
            <label className="ap-label">Description</label>
            <input value={mpesaForm.description} onChange={(e) => setMpesaForm({ ...mpesaForm, description: e.target.value })} className="ap-input" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setMpesaOpen(false)} className="ap-btn-secondary">Cancel</button>
            <button type="submit" className="ap-btn-primary">Send STK push</button>
          </div>
        </form>
      </Modal>

      {/* Card payment (post-terminal) */}
      <Modal open={cardOpen} onClose={() => setCardOpen(false)} title="Record Card Payment">
        <form onSubmit={submitCard} className="space-y-4">
          <div className="p-3 rounded-lg text-xs bg-info/10 text-info border border-info/30">
            Card payments are recorded after being processed on your card terminal. Enter the amount and the terminal reference below.
          </div>
          <div>
            <label className="ap-label">Amount</label>
            <input type="number" value={cardForm.amount} onChange={(e) => setCardForm({ ...cardForm, amount: e.target.value })} className="ap-input" required />
          </div>
          <div>
            <label className="ap-label">Terminal reference</label>
            <input value={cardForm.reference} onChange={(e) => setCardForm({ ...cardForm, reference: e.target.value })} placeholder="e.g. TXN-9182" className="ap-input" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCardOpen(false)} className="ap-btn-secondary">Cancel</button>
            <button type="submit" className="ap-btn-primary">Record</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
