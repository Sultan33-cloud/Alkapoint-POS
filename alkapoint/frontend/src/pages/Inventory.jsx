import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import api from '../api';
import Modal from '../components/common/Modal';
import Empty from '../components/common/Empty';
import { money, dateShort } from '../utils/format';

export default function Inventory() {
  const [stock, setStock] = useState([]);
  const [movements, setMovements] = useState([]);
  const [filter, setFilter] = useState('all');
  const [adjustFor, setAdjustFor] = useState(null);
  const [newQty, setNewQty] = useState('');
  const [reason, setReason] = useState('');

  const loadStock = () => api.get('/inventory/stock').then((r) => setStock(r.data));
  const loadMovements = () => api.get('/inventory/movements?limit=50').then((r) => setMovements(r.data));

  useEffect(() => { loadStock(); loadMovements(); }, []);

  const filtered = stock.filter((s) => {
    if (filter === 'low') return s.isLow && !s.isOut;
    if (filter === 'out') return s.isOut;
    return true;
  });

  const submitAdjust = async (e) => {
    e.preventDefault();
    try {
      await api.post('/inventory/adjust', {
        variantId: adjustFor.variantId,
        newQuantity: Number(newQty),
        reason,
      });
      toast.success('Stock adjusted');
      setAdjustFor(null);
      setNewQty('');
      setReason('');
      loadStock();
      loadMovements();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Adjustment failed');
    }
  };

  const totalValue = stock.reduce((s, x) => s + x.stockValue, 0);
  const lowCount = stock.filter((s) => s.isLow && !s.isOut).length;
  const outCount = stock.filter((s) => s.isOut).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-paper-100">Inventory</h1>
          <p className="text-sm text-paper-400 mt-1">
            Total value: <span className="text-gold-400 font-mono">{money(totalValue)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          {[
            { k: 'all', l: `All (${stock.length})` },
            { k: 'low', l: `Low (${lowCount})` },
            { k: 'out', l: `Out (${outCount})` },
          ].map((b) => (
            <button
              key={b.k}
              onClick={() => setFilter(b.k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${filter === b.k ? 'bg-brand-500 text-white' : 'bg-ink-700 text-paper-300'}`}
            >
              {b.l}
            </button>
          ))}
        </div>
      </div>

      <div className="ap-card overflow-hidden">
        <div className="ap-card-header">
          <div className="ap-card-title">Stock Levels</div>
          <button onClick={loadStock} className="text-xs text-paper-400 hover:text-paper-200 flex items-center gap-1">
            <ArrowPathIcon className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
        {filtered.length === 0 ? (
          <Empty title="No stock items" />
        ) : (
          <div className="overflow-x-auto">
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Product</th><th>Variant</th>
                  <th className="text-right">In Stock</th>
                  <th className="text-right">Reorder</th>
                  <th className="text-right">Value</th>
                  <th>Status</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.variantId}>
                    <td className="font-medium">{s.productName}</td>
                    <td>{s.variantName}</td>
                    <td className="text-right font-mono">{s.stock}</td>
                    <td className="text-right font-mono text-paper-400">{s.reorderLevel}</td>
                    <td className="text-right font-mono">{money(s.stockValue)}</td>
                    <td>
                      {s.isOut ? <span className="ap-badge-danger">Out</span>
                        : s.isLow ? <span className="ap-badge-warning">Low</span>
                        : <span className="ap-badge-success">OK</span>}
                    </td>
                    <td className="text-right">
                      <button
                        onClick={() => { setAdjustFor(s); setNewQty(s.stock); }}
                        className="text-brand-300 hover:text-brand-200 text-xs"
                      >
                        Adjust
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="ap-card overflow-hidden">
        <div className="ap-card-header"><div className="ap-card-title">Recent Movements</div></div>
        {movements.length === 0 ? (
          <Empty title="No movements yet" />
        ) : (
          <table className="ap-table">
            <thead>
              <tr><th>Date</th><th>Variant</th><th>Type</th><th className="text-right">Qty</th><th>Notes</th></tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id}>
                  <td className="text-xs">{dateShort(m.createdAt)}</td>
                  <td>{m.variant?.name || '—'}</td>
                  <td><span className="ap-badge-neutral capitalize">{m.type}</span></td>
                  <td className={`text-right font-mono ${m.quantity > 0 ? 'text-success' : 'text-danger'}`}>
                    {m.quantity > 0 ? '+' : ''}{m.quantity}
                  </td>
                  <td className="text-xs text-paper-400">{m.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={!!adjustFor} onClose={() => setAdjustFor(null)} title="Adjust Stock">
        {adjustFor && (
          <form onSubmit={submitAdjust} className="space-y-4">
            <div className="p-3 rounded-lg bg-ink-900 border border-white/5">
              <div className="text-sm font-medium">{adjustFor.productName}</div>
              <div className="text-xs text-paper-400">{adjustFor.variantName}</div>
              <div className="text-xs text-paper-400 mt-1">Current stock: {adjustFor.stock}</div>
            </div>
            <div>
              <label className="ap-label">New Quantity</label>
              <input type="number" value={newQty} onChange={(e) => setNewQty(e.target.value)} className="ap-input" required />
            </div>
            <div>
              <label className="ap-label">Reason</label>
              <input value={reason} onChange={(e) => setReason(e.target.value)} className="ap-input" placeholder="Damage / correction / restock" />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setAdjustFor(null)} className="ap-btn-secondary">Cancel</button>
              <button type="submit" className="ap-btn-primary">Save adjustment</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}