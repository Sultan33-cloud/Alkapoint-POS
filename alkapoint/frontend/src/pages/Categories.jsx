import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import api from '../api';
import Modal from '../components/common/Modal';
import Empty from '../components/common/Empty';
import ConfirmDialog from '../components/common/ConfirmDialog';
import useConfirm from '../hooks/useConfirm';

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const { confirm, confirmProps } = useConfirm();

  const load = () => api.get('/categories').then((r) => setCategories(r.data));
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/categories', form);
      toast.success('Category added');
      setOpen(false);
      setForm({ name: '', description: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const remove = async (id) => {
    const ok = await confirm({ title: 'Delete category?', message: 'Products in this category will keep their records but lose the category link.', confirmLabel: 'Delete' });
    if (!ok) return;
    try {
      await api.delete(`/categories/${id}`);
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot delete (may have products)');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-paper-100">Categories</h1>
          <p className="text-sm text-paper-400 mt-1">Group your products</p>
        </div>
        <button onClick={() => setOpen(true)} className="ap-btn-primary">
          <PlusIcon className="w-4 h-4" /> New Category
        </button>
      </div>

      <div className="ap-card overflow-hidden">
        {categories.length === 0 ? (
          <Empty title="No categories yet" />
        ) : (
          <table className="ap-table">
            <thead>
              <tr><th>Name</th><th>Description</th><th className="text-right">Actions</th></tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium">{c.name}</td>
                  <td className="text-paper-400">{c.description || '—'}</td>
                  <td className="text-right">
                    <button onClick={() => remove(c.id)} className="text-danger"><TrashIcon className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New Category">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="ap-label">Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="ap-input" required />
          </div>
          <div>
            <label className="ap-label">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="ap-input" rows="2" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="ap-btn-secondary">Cancel</button>
            <button type="submit" className="ap-btn-primary">Create</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog {...confirmProps} />
    </div>
  );
}