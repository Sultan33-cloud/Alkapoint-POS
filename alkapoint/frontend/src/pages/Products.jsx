import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import api from '../api';
import Modal from '../components/common/Modal';
import ImageUpload from '../components/common/ImageUpload';
import Empty from '../components/common/Empty';
import ConfirmDialog from '../components/common/ConfirmDialog';
import useConfirm from '../hooks/useConfirm';
import { money } from '../utils/format';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const { confirm, confirmProps } = useConfirm();
  const [form, setForm] = useState({
    name: '', categoryId: '', sku: '', barcode: '', description: '', image: '',
    variants: [{ name: '', costPrice: '', sellingPrice: '', reorderLevel: 5 }],
  });

  const load = useCallback(() => api.get('/products', { params: { search } }).then((r) => setProducts(r.data)), [search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get('/categories').then((r) => setCategories(r.data)); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: '', categoryId: '', sku: '', barcode: '', description: '', image: '',
      variants: [{ name: '', costPrice: '', sellingPrice: '', reorderLevel: 5 }],
    });
    setOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p.id);
    setForm({
      name: p.name, categoryId: p.categoryId, sku: p.sku || '', barcode: p.barcode || '',
      description: p.description || '', image: p.image || '',
      variants: (p.variants || []).map((v) => ({
        id: v.id, name: v.name, costPrice: v.costPrice, sellingPrice: v.sellingPrice, reorderLevel: v.reorderLevel,
      })),
    });
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editing) await api.put(`/products/${editing}`, form);
      else await api.post('/products', form);
      toast.success('Saved');
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    }
  };

  const remove = async (id) => {
    const ok = await confirm({
      title: 'Delete product?',
      message: 'This will remove the product and its variants from your catalog. Existing sales history is preserved.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const updateVariant = (i, field, value) => {
    const vs = [...form.variants];
    vs[i][field] = value;
    setForm({ ...form, variants: vs });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-paper-100">Products</h1>
          <p className="text-sm text-paper-400 mt-1">Manage your catalog and pricing</p>
        </div>
        <button onClick={openCreate} className="ap-btn-primary">
          <PlusIcon className="w-4 h-4" /> New Product
        </button>
      </div>

      <input
        value={search} onChange={(e) => setSearch(e.target.value)}
        placeholder="Search products…" className="ap-input max-w-md"
      />

      <div className="ap-card overflow-hidden">
        {products.length === 0 ? (
          <Empty title="No products yet" subtitle="Create your first product to get started." />
        ) : (
          <div className="overflow-x-auto">
            <table className="ap-table">
              <thead>
                <tr><th>Product</th><th>Category</th><th>Variants</th><th className="text-right">Actions</th></tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-3">
                       {p.image ? (
                      <img src={p.image} alt="" className="w-10 h-10 rounded-lg object-cover border border-white/10" />
                       ) : (
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-500/20 to-gold-500/10 flex items-center justify-center text-brand-300 font-bold text-sm">
                       {p.name.charAt(0)}
                      </div>
                       )}
                      <div>
                       <div className="font-medium">{p.name}</div>
                       {p.sku && <div className="text-xs text-paper-400">SKU: {p.sku}</div>}
                       </div>
                       </div>
                    </td>
                    <td>{p.category?.name || '—'}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {(p.variants || []).map((v) => (
                          <span key={v.id} className="ap-badge-neutral">
                            {v.name} · {money(v.sellingPrice)} · {v.stock ?? 0} in stock
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="text-right">
                      <button onClick={() => openEdit(p)} className="text-brand-300 hover:text-brand-200 mr-3">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => remove(p.id)} className="text-danger hover:brightness-125">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? 'Edit Product' : 'New Product'} size="lg">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="ap-label">Product Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="ap-input" required />
            </div>
            <div>
              <label className="ap-label">Category</label>
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="ap-select" required>
                <option value="">Select…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="ap-label">SKU</label>
              <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="ap-input" />
            </div>
            <div>
              <label className="ap-label">Barcode</label>
              <input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className="ap-input" />
            </div>
            <div className="col-span-2">
              <label className="ap-label">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="ap-input" rows="2" />
            </div>
            <div className="col-span-2">
              <ImageUpload
                label="Product image"
                value={form.image}
                onChange={(v) => setForm({ ...form, image: v })}
             />
            </div>
          </div>

          <div className="border-t border-white/5 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="ap-card-title">Variants</div>
              <button
                type="button"
                onClick={() => setForm({ ...form, variants: [...form.variants, { name: '', costPrice: '', sellingPrice: '', reorderLevel: 5 }] })}
                className="text-xs text-brand-300 hover:text-brand-200"
              >
                + Add variant
              </button>
            </div>
            <div className="space-y-2">
              {form.variants.map((v, i) => (
                <div key={i} className="grid grid-cols-5 gap-2 items-end">
                  <input value={v.name} onChange={(e) => updateVariant(i, 'name', e.target.value)} placeholder="Variant name" className="ap-input col-span-2" required />
                  <input type="number" value={v.costPrice} onChange={(e) => updateVariant(i, 'costPrice', e.target.value)} placeholder="Cost" className="ap-input" required />
                  <input type="number" value={v.sellingPrice} onChange={(e) => updateVariant(i, 'sellingPrice', e.target.value)} placeholder="Selling" className="ap-input" required />
                  <div className="flex gap-2">
                    <input type="number" value={v.reorderLevel} onChange={(e) => updateVariant(i, 'reorderLevel', e.target.value)} placeholder="Reorder" className="ap-input" />
                    {form.variants.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, variants: form.variants.filter((_, idx) => idx !== i) })}
                        className="text-danger"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-white/5">
            <button type="button" onClick={() => setOpen(false)} className="ap-btn-secondary">Cancel</button>
            <button type="submit" className="ap-btn-primary">{editing ? 'Save changes' : 'Create product'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog {...confirmProps} />
    </div>
  );
}
