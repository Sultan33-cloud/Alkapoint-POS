import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import api from '../api';
import Modal from '../components/common/Modal';
import Empty from '../components/common/Empty';
import ConfirmDialog from '../components/common/ConfirmDialog';
import useConfirm from '../hooks/useConfirm';
import { money, dateShort } from '../utils/format';

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    categoryId: '', amount: '', description: '',
    expenseDate: new Date().toISOString().slice(0, 10),
    paymentMethod: 'cash', reference: '',
  });
  const { confirm, confirmProps } = useConfirm();

  const load = () => {
    api.get('/expenses').then((r) => setExpenses(r.data));
    api.get('/expenses/categories').then((r) => setCategories(r.data));
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/expenses', form);
      toast.success('Expense added');
      setOpen(false);
      setForm({
        categoryId: '', amount: '', description: '',
        expenseDate: new Date().toISOString().slice(0, 10),
        paymentMethod: 'cash', reference: '',
      });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const remove = async (id) => {
    const ok = await confirm({ title: 'Delete expense?', message: 'This action cannot be undone.', confirmLabel: 'Delete' });
    if (!ok) return;
    await api.delete(`/expenses/${id}`);
    toast.success('Deleted');
    load();
  };

  const addCategory = async () => {
    const name = prompt('Category name');
    if (!name) return;
    const res = await api.post('/expenses/categories', { name });
    setCategories([...categories, res.data]);
  };

  const total = expenses.reduce((s, x) => s + Number(x.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-paper-100">Expenses</h1>
          <p className="text-sm text-paper-400 mt-1">
            Total: <span className="font-mono text-danger">{money(total)}</span>
          </p>
        </div>
        <button onClick={() => setOpen(true)} className="ap-btn-primary">
          <PlusIcon className="w-4 h-4" /> New Expense
        </button>
      </div>

      <div className="ap-card overflow-hidden">
        {expenses.length === 0 ? (
          <Empty title="No expenses" />
        ) : (
          <table className="ap-table">
            <thead>
              <tr><th>Date</th><th>Category</th><th>Description</th><th>Method</th><th className="text-right">Amount</th><th></th></tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id}>
                  <td className="text-xs">{dateShort(e.expenseDate)}</td>
                  <td><span className="ap-badge-info">{e.category?.name}</span></td>
                  <td>{e.description}</td>
                  <td className="capitalize text-xs">{e.paymentMethod}</td>
                  <td className="text-right font-mono text-danger">{money(e.amount)}</td>
                  <td className="text-right">
                    <button onClick={() => remove(e.id)} className="text-danger"><TrashIcon className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="New Expense">
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="ap-label">Category</label>
            <div className="flex gap-2">
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="ap-select flex-1" required>
                <option value="">Select…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button type="button" onClick={addCategory} className="ap-btn-secondary">+</button>
            </div>
          </div>
          <div><label className="ap-label">Amount</label><input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="ap-input" required /></div>
          <div><label className="ap-label">Description</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="ap-input" /></div>
          <div><label className="ap-label">Date</label><input type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} className="ap-input" /></div>
          <div>
            <label className="ap-label">Payment Method</label>
            <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="ap-select">
              <option value="cash">Cash</option>
              <option value="mpesa">M-Pesa</option>
              <option value="bank">Bank</option>
            </select>
          </div>
          <div><label className="ap-label">Reference</label><input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="ap-input" /></div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="ap-btn-secondary">Cancel</button>
            <button type="submit" className="ap-btn-primary">Save</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog {...confirmProps} />
    </div>
  );
}