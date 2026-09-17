import { useEffect, useState, Fragment } from 'react';
import toast from 'react-hot-toast';
import {
  PlusIcon, TrashIcon, BanknotesIcon, EyeIcon,
} from '@heroicons/react/24/outline';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import api from '../api';
import Modal from '../components/common/Modal';
import Empty from '../components/common/Empty';
import PaymentModal from '../components/PaymentModal';
import { money, dateShort } from '../utils/format';

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [aging, setAging] = useState(null);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    supplierId: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    transportCost: 0, otherCosts: 0, notes: '', paidAmount: 0,
    items: [{ variantId: '', quantity: 1, unitCost: 0 }],
  });

  const [payFor, setPayFor] = useState(null);        // purchase being paid
  const [drawerFor, setDrawerFor] = useState(null);  // purchase whose payment history is shown
  const [drawerData, setDrawerData] = useState(null);

  const load = () => {
    api.get('/purchases').then((r) => setPurchases(r.data));
    api.get('/payments/supplier-aging').then((r) => setAging(r.data)).catch(() => {});
  };

  useEffect(() => {
    load();
    api.get('/suppliers').then((r) => setSuppliers(r.data));
    api.get('/products').then((r) => setProducts(r.data));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (form.items.some((i) => !i.variantId)) return toast.error('Select a variant for each item');
    try {
      await api.post('/purchases', form);
      toast.success('Purchase recorded');
      setOpen(false);
      setForm({
        supplierId: '',
        purchaseDate: new Date().toISOString().slice(0, 10),
        transportCost: 0, otherCosts: 0, notes: '', paidAmount: 0,
        items: [{ variantId: '', quantity: 1, unitCost: 0 }],
      });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const updateItem = (i, field, value) => {
    const items = [...form.items];
    items[i][field] = value;
    setForm({ ...form, items });
  };

  const addSupplier = async () => {
    const name = prompt('Supplier name');
    if (!name) return;
    const res = await api.post('/suppliers', { name });
    setSuppliers([...suppliers, res.data]);
    setForm({ ...form, supplierId: res.data.id });
  };

  const openDrawer = async (purchaseId) => {
    setDrawerFor(purchaseId);
    setDrawerData(null);
    try {
      const res = await api.get(`/payments/purchase/${purchaseId}`);
      setDrawerData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load history');
    }
  };

  const allVariants = products.flatMap((p) =>
    (p.variants || []).map((v) => ({ id: v.id, label: `${p.name} — ${v.name}`, cost: v.costPrice }))
  );

  const estTotal = form.items.reduce(
    (s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitCost) || 0), 0
  ) + Number(form.transportCost || 0) + Number(form.otherCosts || 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-paper-100">Purchases</h1>
          <p className="text-sm text-paper-400 mt-1">Record stock coming in, allocate costs, pay suppliers</p>
        </div>
        <button onClick={() => setOpen(true)} className="ap-btn-primary">
          <PlusIcon className="w-4 h-4" /> New Purchase
        </button>
      </div>

      {/* Supplier aging summary */}
      {aging && aging.totals.totalOutstanding > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="ap-card p-4">
            <div className="ap-kpi-label">Total Purchased</div>
            <div className="text-xl font-bold font-mono">{money(aging.totals.totalPurchases)}</div>
          </div>
          <div className="ap-card p-4">
            <div className="ap-kpi-label">Total Paid</div>
            <div className="text-xl font-bold font-mono text-success">{money(aging.totals.totalPaid)}</div>
          </div>
          <div className="ap-card p-4">
            <div className="ap-kpi-label">Outstanding to Suppliers</div>
            <div className="text-xl font-bold font-mono text-danger">{money(aging.totals.totalOutstanding)}</div>
          </div>
        </div>
      )}

      <div className="ap-card overflow-hidden">
        {purchases.length === 0 ? (
          <Empty title="No purchases yet" subtitle="Record your first purchase to add stock." />
        ) : (
          <div className="overflow-x-auto">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Date</th>
                  <th>Supplier</th>
                  <th className="text-right">Items</th>
                  <th className="text-right">Total Cost</th>
                  <th className="text-right">Paid</th>
                  <th className="text-right">Outstanding</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => {
                  const outstanding = Number(p.outstanding ?? (Number(p.totalCost) - Number(p.amountPaid || 0)));
                  return (
                    <tr key={p.id}>
                      <td className="font-mono text-xs">{p.reference}</td>
                      <td>{dateShort(p.purchaseDate)}</td>
                      <td>{p.supplier?.name || '—'}</td>
                      <td className="text-right">{p.items?.length || 0}</td>
                      <td className="text-right font-mono">{money(p.totalCost)}</td>
                      <td className="text-right font-mono text-success">{money(p.amountPaid || 0)}</td>
                      <td className={`text-right font-mono ${outstanding > 0.01 ? 'text-danger' : 'text-paper-400'}`}>
                        {money(outstanding)}
                      </td>
                      <td>
                        <span className={`ap-badge-${
                          p.paymentStatus === 'paid' ? 'success'
                          : p.paymentStatus === 'partial' ? 'warning'
                          : 'danger'
                        } capitalize`}>
                          {p.paymentStatus}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openDrawer(p.id)} className="text-paper-300 hover:text-paper-100" title="Payment history">
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          {outstanding > 0.01 && (
                            <button
                              onClick={() => setPayFor({
                                id: p.id,
                                reference: p.reference,
                                totalCost: Number(p.totalCost),
                                amountPaid: Number(p.amountPaid || 0),
                                supplierName: p.supplier?.name,
                              })}
                              className="ap-btn-primary text-xs py-1.5 px-3"
                            >
                              <BanknotesIcon className="w-3.5 h-3.5" /> Pay
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New purchase modal */}
      <Modal open={open} onClose={() => setOpen(false)} title="New Purchase" size="lg">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="ap-label">Supplier</label>
              <div className="flex gap-2">
                <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} className="ap-select flex-1">
                  <option value="">Select or add…</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button type="button" onClick={addSupplier} className="ap-btn-secondary">+</button>
              </div>
            </div>
            <div>
              <label className="ap-label">Purchase Date</label>
              <input type="date" value={form.purchaseDate} onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })} className="ap-input" />
            </div>
            <div>
              <label className="ap-label">Transport Cost</label>
              <input type="number" value={form.transportCost} onChange={(e) => setForm({ ...form, transportCost: e.target.value })} className="ap-input" />
            </div>
            <div>
              <label className="ap-label">Other Costs</label>
              <input type="number" value={form.otherCosts} onChange={(e) => setForm({ ...form, otherCosts: e.target.value })} className="ap-input" />
            </div>
            <div>
              <label className="ap-label">Amount Paid Now</label>
              <input type="number" value={form.paidAmount} onChange={(e) => setForm({ ...form, paidAmount: e.target.value })} className="ap-input" />
            </div>
            <div className="flex items-end">
              <div className="ap-card p-3 w-full">
                <div className="ap-kpi-label">Estimated Total</div>
                <div className="font-mono font-bold text-gold-400">{money(estTotal)}</div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="ap-card-title">Items</div>
              <button
                type="button"
                onClick={() => setForm({ ...form, items: [...form.items, { variantId: '', quantity: 1, unitCost: 0 }] })}
                className="text-xs text-brand-300"
              >
                + Add line
              </button>
            </div>
            <div className="space-y-2">
              {form.items.map((it, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <select
                    value={it.variantId}
                    onChange={(e) => {
                      const v = allVariants.find((x) => x.id === e.target.value);
                      updateItem(i, 'variantId', e.target.value);
                      if (v) updateItem(i, 'unitCost', v.cost);
                    }}
                    className="ap-select col-span-6"
                  >
                    <option value="">Select variant…</option>
                    {allVariants.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                  </select>
                  <input type="number" placeholder="Qty" value={it.quantity} onChange={(e) => updateItem(i, 'quantity', e.target.value)} className="ap-input col-span-2" />
                  <input type="number" placeholder="Unit cost" value={it.unitCost} onChange={(e) => updateItem(i, 'unitCost', e.target.value)} className="ap-input col-span-3" />
                  {form.items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) })}
                      className="col-span-1 text-danger"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="ap-label">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="ap-input" rows="2" />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
            <button type="button" onClick={() => setOpen(false)} className="ap-btn-secondary">Cancel</button>
            <button type="submit" className="ap-btn-primary">Save Purchase</button>
          </div>
        </form>
      </Modal>

      {/* Pay supplier modal */}
      <PaymentModal
        open={!!payFor}
        onClose={() => setPayFor(null)}
        onSaved={load}
        mode="supplier"
        fixedPurchase={payFor}
      />

      {/* Payment history drawer */}
      <Transition show={!!drawerFor} as={Fragment}>
        <Dialog onClose={() => { setDrawerFor(null); setDrawerData(null); }} className="relative z-[70]">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
            leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/60" />
          </Transition.Child>
          <div className="fixed inset-y-0 right-0 flex max-w-full">
            <Transition.Child
              as={Fragment}
              enter="transform transition ease-out duration-200"
              enterFrom="translate-x-full" enterTo="translate-x-0"
              leave="transform transition ease-in duration-150"
              leaveFrom="translate-x-0" leaveTo="translate-x-full"
            >
              <Dialog.Panel className="w-screen max-w-md bg-ink-800 border-l border-white/5 p-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-bold text-paper-100">
                    Payment History
                  </Dialog.Title>
                  <button onClick={() => { setDrawerFor(null); setDrawerData(null); }} className="p-1 rounded hover:bg-white/5">
                    <XMarkIcon className="w-5 h-5 text-paper-400" />
                  </button>
                </div>

                {!drawerData ? (
                  <div className="text-paper-400 text-sm">Loading…</div>
                ) : (
                  <div className="space-y-4">
                    <div className="ap-card p-4 space-y-1.5 text-sm">
                      <div className="flex justify-between"><span className="text-paper-400">Reference</span><span className="font-mono">{drawerData.purchase.reference}</span></div>
                      <div className="flex justify-between"><span className="text-paper-400">Supplier</span><span>{drawerData.purchase.supplier?.name || '—'}</span></div>
                      <div className="flex justify-between"><span className="text-paper-400">Date</span><span>{dateShort(drawerData.purchase.purchaseDate)}</span></div>
                      <div className="flex justify-between pt-1.5 border-t border-white/5"><span className="text-paper-400">Subtotal</span><span className="font-mono">{money(drawerData.purchase.subtotal)}</span></div>
                      <div className="flex justify-between"><span className="text-paper-400">Transport</span><span className="font-mono">{money(drawerData.purchase.transportCost)}</span></div>
                      <div className="flex justify-between"><span className="text-paper-400">Other</span><span className="font-mono">{money(drawerData.purchase.otherCosts)}</span></div>
                      <div className="flex justify-between font-semibold pt-1.5 border-t border-white/5"><span>Total</span><span className="font-mono text-gold-400">{money(drawerData.purchase.totalCost)}</span></div>
                      <div className="flex justify-between"><span className="text-paper-400">Paid</span><span className="font-mono text-success">{money(drawerData.purchase.amountPaid)}</span></div>
                      <div className="flex justify-between"><span className="text-paper-400">Outstanding</span><span className="font-mono text-danger">{money(drawerData.purchase.outstanding)}</span></div>
                    </div>

                    <div className="ap-card overflow-hidden">
                      <div className="ap-card-header"><div className="ap-card-title">Payments</div></div>
                      {drawerData.payments.length === 0 ? (
                        <div className="p-4 text-sm text-paper-400">No payments recorded yet.</div>
                      ) : (
                        <table className="ap-table">
                          <thead>
                            <tr><th>Date</th><th>Method</th><th>Reference</th><th className="text-right">Amount</th></tr>
                          </thead>
                          <tbody>
                            {drawerData.payments.map((p) => (
                              <tr key={p.id}>
                                <td className="text-xs">{dateShort(p.paymentDate)}</td>
                                <td className="capitalize text-xs">{p.method}</td>
                                <td className="text-xs text-paper-400">{p.reference || '—'}</td>
                                <td className="text-right font-mono text-success">{money(p.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}