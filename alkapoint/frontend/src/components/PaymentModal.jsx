import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api';
import Modal from './common/Modal';
import { money } from '../utils/format';

/**
 * Unified payment modal.
 *
 * mode="standalone"  → any customer, any amount (with optional credit apply)
 * mode="supplier"    → requires purchaseId, amount pre-capped to outstanding
 * mode="debtor"      → customerId + applyToCredit forced true
 *
 * Props:
 *   open, onClose, onSaved
 *   mode = 'standalone' | 'supplier' | 'debtor'
 *   fixedCustomerId  — pre-select a customer (debtor mode)
 *   fixedPurchase    — { id, reference, totalCost, amountPaid, supplierName }
 */
export default function PaymentModal({
  open, onClose, onSaved,
  mode = 'standalone',
  fixedCustomerId = null,
  fixedPurchase = null,
}) {
  if (!open) return null;

  return (
    <PaymentModalForm
      onClose={onClose}
      onSaved={onSaved}
      mode={mode}
      fixedCustomerId={fixedCustomerId}
      fixedPurchase={fixedPurchase}
    />
  );
}

function PaymentModalForm({ onClose, onSaved, mode, fixedCustomerId, fixedPurchase }) {
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [form, setForm] = useState(() => ({
    amount: mode === 'supplier' && fixedPurchase
      ? String((Number(fixedPurchase.totalCost) - Number(fixedPurchase.amountPaid || 0)).toFixed(2))
      : '',
    method: 'cash',
    reference: '',
    phoneNumber: '',
    notes: '',
    applyToCredit: mode === 'debtor',
  }));
  const [submitting, setSubmitting] = useState(false);

  // The form is mounted only while open, so its state is initialized fresh for each payment.
  useEffect(() => {
    if (fixedCustomerId) {
      api.get(`/customers/${fixedCustomerId}`).then((r) => {
        setSelectedCustomer(r.data.customer);
      }).catch(() => {});
    }
  }, [fixedCustomerId]);

  // -------- Customer search (only in standalone / debtor) --------
  useEffect(() => {
    if (mode === 'supplier') return;
    if (customerSearch.length < 2) return;
    api.get('/customers', { params: { search: customerSearch } })
      .then((r) => setCustomers(r.data));
  }, [customerSearch, mode]);

  const submit = async (e) => {
    e.preventDefault();
    const amt = Number(form.amount);
    if (!amt || amt <= 0) return toast.error('Enter a valid amount');

    if (mode === 'supplier' && !fixedPurchase) {
      return toast.error('No purchase selected');
    }
    if (mode === 'debtor' && !selectedCustomer) {
      return toast.error('Customer is required');
    }

    setSubmitting(true);
    try {
      const payload = {
        amount: amt,
        method: form.method,
        reference: form.reference || null,
        phoneNumber: form.phoneNumber || null,
        notes: form.notes || null,
      };

      if (mode === 'supplier') {
        payload.purchaseId = fixedPurchase.id;
      } else if (mode === 'debtor') {
        payload.customerId = selectedCustomer.id;
        payload.applyToCredit = true;
      } else {
        payload.customerId = selectedCustomer?.id || null;
        payload.applyToCredit = !!form.applyToCredit && !!selectedCustomer;
      }

      const res = await api.post('/payments', payload);

      if (mode === 'supplier') {
        if (res.data.purchaseFullyPaid) {
          toast.success(`Purchase ${fixedPurchase.reference} fully paid`);
        } else {
          toast.success(
            `${money(amt)} paid · ${money(res.data.purchaseBalance)} still outstanding`
          );
        }
      } else if (res.data.appliedToCredit > 0) {
        toast.success(
          `${money(amt)} recorded · ${money(res.data.appliedToCredit)} applied to credit`
        );
      } else {
        toast.success(`${money(amt)} payment recorded`);
      }

      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  const titleMap = {
    standalone: 'Record Payment',
    supplier: `Pay Supplier${fixedPurchase?.supplierName ? ` — ${fixedPurchase.supplierName}` : ''}`,
    debtor: `Record Debtor Payment${selectedCustomer?.name ? ` — ${selectedCustomer.name}` : ''}`,
  };

  return (
    <Modal open={open} onClose={onClose} title={titleMap[mode]} size="md">
      <form onSubmit={submit} className="space-y-4">

        {/* ---------- Supplier summary ---------- */}
        {mode === 'supplier' && fixedPurchase && (
          <div className="p-4 rounded-lg bg-ink-900 border border-white/10 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-paper-400">Reference</span><span className="font-mono">{fixedPurchase.reference}</span></div>
            <div className="flex justify-between"><span className="text-paper-400">Purchase total</span><span className="font-mono">{money(fixedPurchase.totalCost)}</span></div>
            <div className="flex justify-between"><span className="text-paper-400">Already paid</span><span className="font-mono text-success">{money(fixedPurchase.amountPaid || 0)}</span></div>
            <div className="flex justify-between pt-1.5 border-t border-white/5">
              <span className="text-paper-200 font-semibold">Outstanding</span>
              <span className="font-mono font-bold text-danger">
                {money(Number(fixedPurchase.totalCost) - Number(fixedPurchase.amountPaid || 0))}
              </span>
            </div>
          </div>
        )}

        {/* ---------- Customer picker (standalone / debtor) ---------- */}
        {mode !== 'supplier' && (
          <div>
            <label className="ap-label">
              Customer {mode === 'debtor' ? '' : '(optional)'}
            </label>
            {selectedCustomer ? (
              <div className="flex items-center justify-between p-3 rounded-lg bg-ink-900 border border-white/10">
                <div>
                  <div className="text-sm font-medium text-paper-100">{selectedCustomer.name}</div>
                  <div className="text-xs text-paper-400">
                    {selectedCustomer.phone || '—'} · Balance: {money(selectedCustomer.balance)}
                  </div>
                </div>
                {mode !== 'debtor' && (
                  <button type="button" onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }} className="text-xs text-paper-400 hover:text-danger">
                    Clear
                  </button>
                )}
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search by name or phone…"
                  className="ap-input"
                  disabled={mode === 'debtor' && !!fixedCustomerId}
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
        )}

        {/* ---------- Amount + method ---------- */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="ap-label">Amount</label>
            <input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="ap-input"
              required
            />
          </div>
          <div>
            <label className="ap-label">Method</label>
            <select
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value })}
              className="ap-select"
            >
              <option value="cash">Cash</option>
              <option value="mpesa">M-Pesa</option>
              <option value="bank">Bank</option>
              <option value="card">Card</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {(form.method === 'mpesa') && (
          <div>
            <label className="ap-label">Phone (optional)</label>
            <input
              value={form.phoneNumber}
              onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
              placeholder="+254712345678"
              className="ap-input"
            />
          </div>
        )}

        <div>
          <label className="ap-label">Reference (optional)</label>
          <input
            value={form.reference}
            onChange={(e) => setForm({ ...form, reference: e.target.value })}
            placeholder="Receipt / transaction / slip no."
            className="ap-input"
          />
        </div>

        {/* ---------- Apply-to-credit checkbox (standalone only) ---------- */}
        {mode === 'standalone' && selectedCustomer && Number(selectedCustomer.balance) > 0 && (
          <label className="flex items-center gap-2 p-3 rounded-lg bg-gold-500/10 border border-gold-500/30 text-sm">
            <input
              type="checkbox"
              checked={form.applyToCredit}
              onChange={(e) => setForm({ ...form, applyToCredit: e.target.checked })}
            />
            <span className="text-paper-100">
              Apply to outstanding credit ({money(selectedCustomer.balance)})
            </span>
          </label>
        )}

        <div>
          <label className="ap-label">Notes (optional)</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="ap-input"
            rows="2"
            placeholder={
              mode === 'supplier'
                ? 'e.g. Partial settlement, cheque no. 0091'
                : 'e.g. Advance deposit for February order'
            }
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
          <button type="button" onClick={onClose} className="ap-btn-secondary">Cancel</button>
          <button type="submit" disabled={submitting} className="ap-btn-primary">
            {submitting ? 'Recording…' : 'Record payment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
