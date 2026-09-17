import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  MagnifyingGlassIcon, ShoppingCartIcon, TrashIcon, PlusIcon, MinusIcon, BanknotesIcon,
} from '@heroicons/react/24/outline';
import api from '../api';
import Modal from '../components/common/Modal';
import Empty from '../components/common/Empty';
import Receipt from '../components/Receipt';
import { money } from '../utils/format';
import { useAuth } from '../context/AuthContext';

export default function POS() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [cart, setCart] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [method, setMethod] = useState('cash');
  const [isCredit, setIsCredit] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadProducts = useCallback(() => {
    api.get('/products', { params: { search, categoryId } }).then((res) => setProducts(res.data));
  }, [search, categoryId]);

  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => { api.get('/categories').then((r) => setCategories(r.data)); }, []);
  useEffect(() => {
    if (customerSearch.length < 2) return undefined;
    let active = true;
    api.get('/customers', { params: { search: customerSearch } }).then((r) => {
      if (active) setCustomers(r.data);
    });
    return () => { active = false; };
  }, [customerSearch]);

  const addToCart = (variant, product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.variantId === variant.id);
      if (existing) return prev.map((i) => i.variantId === variant.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, {
        variantId: variant.id,
        name: `${product.name} — ${variant.name}`,
        unitPrice: Number(variant.sellingPrice),
        stock: variant.stock ?? 0,
        quantity: 1,
      }];
    });
  };

  const setQty = (variantId, qty) => {
    setCart((prev) => prev.map((i) => i.variantId === variantId ? { ...i, quantity: Math.max(1, qty) } : i));
  };

  const removeItem = (variantId) => setCart((prev) => prev.filter((i) => i.variantId !== variantId));

  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.quantity * i.unitPrice, 0), [cart]);
  const discountAmt = Number(discount) || 0;
  const total = Math.max(0, subtotal - discountAmt);

  const resetSale = () => {
    setCart([]); setCustomerId(''); setCustomerSearch('');
    setDiscount(0); setNotes(''); setIsCredit(false); setDueDate('');
  };

  const completeSale = async () => {
    if (cart.length === 0) return toast.error('Cart is empty');
    setSubmitting(true);
    try {
      const payload = {
        items: cart.map((i) => ({ variantId: i.variantId, quantity: i.quantity, unitPrice: i.unitPrice })),
        customerId: customerId || null,
        discount: discountAmt,
        isCredit,
        dueDate: isCredit && dueDate ? dueDate : null,
        notes,
        payments: isCredit && total > 0 ? [] : [{ method, amount: total, reference: null }],
      };
      const res = await api.post('/sales', payload);
      setReceipt(res.data);
      toast.success('Sale completed');
      setCheckoutOpen(false);
      resetSale();
      loadProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Sale failed');
    } finally {
      setSubmitting(false);
    }
  };

  const visibleCustomers = customerSearch.length >= 2 ? customers : [];
  const selectedCustomer = visibleCustomers.find((c) => c.id === customerId);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[calc(100vh-8rem)]">
      <div className="lg:col-span-2 ap-card flex flex-col overflow-hidden">
        <div className="p-4 border-b border-white/5 space-y-3">
          <div className="relative">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-paper-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products by name, SKU, barcode…"
              className="ap-input pl-9"
              autoFocus
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setCategoryId('')}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${!categoryId ? 'bg-brand-500 text-white' : 'bg-ink-700 text-paper-300'}`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoryId(c.id)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${categoryId === c.id ? 'bg-brand-500 text-white' : 'bg-ink-700 text-paper-300'}`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {products.length === 0 ? (
            <Empty title="No products" subtitle="Add products in the Products page." />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {products.flatMap((p) =>
                (p.variants || []).map((v) => (
                  <button
                    key={v.id}
                    onClick={() => addToCart(v, p)}
                    disabled={(v.stock ?? 0) <= 0}
                    className="text-left p-3 rounded-xl bg-ink-900 border border-white/5 hover:border-brand-500/40 hover:bg-ink-700/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <div className="h-20 rounded-lg bg-gradient-to-br from-brand-500/10 to-gold-500/5 mb-2 flex items-center justify-center overflow-hidden">
                       {(v.image || p.image) ? (
                       <img src={v.image || p.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                       <span className="text-lg font-bold text-brand-300">{p.name.charAt(0)}</span>
                       )}
                    </div>
                    <div className="text-xs font-semibold text-paper-100 truncate">{p.name}</div>
                    <div className="text-[10px] text-paper-400 truncate">{v.name}</div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-sm font-mono font-bold text-gold-400">{money(v.sellingPrice)}</span>
                      <span className={`text-[10px] ${(v.stock ?? 0) <= (v.reorderLevel ?? 5) ? 'text-danger' : 'text-paper-400'}`}>
                        {v.stock ?? 0} left
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      <div className="ap-card flex flex-col overflow-hidden">
        <div className="ap-card-header">
          <div className="ap-card-title flex items-center gap-2">
            <ShoppingCartIcon className="w-4 h-4" /> Current Sale
          </div>
          {cart.length > 0 && (
            <button onClick={resetSale} className="text-xs text-paper-400 hover:text-danger">Clear</button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.length === 0 ? (
            <Empty title="Cart is empty" subtitle="Tap a product to add it." />
          ) : (
            cart.map((item) => (
              <div key={item.variantId} className="p-3 rounded-lg bg-ink-900 border border-white/5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-paper-100 truncate">{item.name}</div>
                    <div className="text-xs text-paper-400 mt-0.5">{money(item.unitPrice)}</div>
                  </div>
                  <button onClick={() => removeItem(item.variantId)} className="text-paper-400 hover:text-danger">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <button onClick={() => setQty(item.variantId, item.quantity - 1)} className="w-7 h-7 rounded-lg bg-ink-700 text-paper-200 hover:bg-ink-600 flex items-center justify-center">
                      <MinusIcon className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center font-mono text-sm">{item.quantity}</span>
                    <button onClick={() => setQty(item.variantId, item.quantity + 1)} className="w-7 h-7 rounded-lg bg-ink-700 text-paper-200 hover:bg-ink-600 flex items-center justify-center">
                      <PlusIcon className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="font-mono font-semibold text-paper-100">
                    {money(item.quantity * item.unitPrice)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-white/5 p-4 space-y-3">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-paper-300">
              <span>Subtotal</span>
              <span className="font-mono">{money(subtotal)}</span>
            </div>
            <div className="flex justify-between items-center text-paper-300">
              <span>Discount</span>
              <input
                type="number" min="0" step="0.01" value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="w-24 ap-input text-right py-1"
              />
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-white/5">
              <span className="font-semibold text-paper-100">TOTAL</span>
              <span className="text-xl font-bold font-mono text-gold-400">{money(total)}</span>
            </div>
          </div>

          <button
            onClick={() => setCheckoutOpen(true)}
            disabled={cart.length === 0}
            className="ap-btn-gold w-full py-3 text-base"
          >
            <BanknotesIcon className="w-5 h-5" /> Checkout
          </button>
        </div>
      </div>

      <Modal open={checkoutOpen} onClose={() => setCheckoutOpen(false)} title="Complete Sale" size="md">
        <div className="space-y-4">
          <div>
            <label className="ap-label">Customer (optional)</label>
            <input
              type="text" value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Search by name or phone…"
              className="ap-input"
            />
            {visibleCustomers.length > 0 && !selectedCustomer && (
              <div className="mt-2 ap-card p-2 max-h-40 overflow-y-auto">
                {visibleCustomers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setCustomerId(c.id); setCustomerSearch(c.name); setCustomers([]); }}
                    className="w-full text-left px-3 py-2 rounded hover:bg-white/5 text-sm"
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="text-paper-400 ml-2">{c.phone}</span>
                  </button>
                ))}
              </div>
            )}
            {selectedCustomer && <div className="mt-2 text-xs text-success">Selected: {selectedCustomer.name}</div>}
          </div>

          <div>
            <label className="ap-label">Payment Method</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { v: 'cash', l: 'Cash' },
                { v: 'mpesa', l: 'M-Pesa' },
                { v: 'card', l: 'Card' },
                { v: 'bank', l: 'Bank' },
              ].map((m) => (
                <button
                  key={m.v}
                  onClick={() => { setMethod(m.v); setIsCredit(false); }}
                  className={`py-2 rounded-lg text-xs font-semibold ${method === m.v && !isCredit ? 'bg-brand-500 text-white' : 'bg-ink-700 text-paper-300 hover:bg-ink-600'}`}
                >
                  {m.l}
                </button>
              ))}
            </div>
          </div>

          {customerId && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isCredit} onChange={(e) => setIsCredit(e.target.checked)} />
              <span className="text-paper-200">Sale on credit (customer owes)</span>
            </label>
          )}
          {isCredit && (
            <div>
              <label className="ap-label">Due Date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="ap-input" />
            </div>
          )}

          <div>
            <label className="ap-label">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="ap-input" rows="2" />
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/5">
            <span className="text-paper-300">Amount Due</span>
            <span className="text-2xl font-bold font-mono text-gold-400">{money(total)}</span>
          </div>

          <div className="flex gap-2">
            <button onClick={() => setCheckoutOpen(false)} className="ap-btn-secondary flex-1">Cancel</button>
            <button onClick={completeSale} disabled={submitting} className="ap-btn-primary flex-1">
              {submitting ? 'Processing…' : 'Complete Sale'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="Sale Receipt" size="md">
        {receipt && (
          <div>
            <Receipt sale={receipt} business={user?.Business} />
            <button onClick={() => window.print()} className="ap-btn-secondary w-full mt-3">Print Receipt</button>
            <button onClick={() => setReceipt(null)} className="ap-btn-primary w-full mt-2">Close</button>
          </div>
        )}
      </Modal>
    </div>
  );
}
