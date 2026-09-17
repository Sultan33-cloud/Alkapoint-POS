import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon, LockClosedIcon } from '@heroicons/react/24/outline';
import api from '../api';
import Modal from '../components/common/Modal';
import Empty from '../components/common/Empty';
import ConfirmDialog from '../components/common/ConfirmDialog';
import useConfirm from '../hooks/useConfirm';

const PERMISSION_GROUPS = [
  { label: 'Dashboard', items: [{ key: 'view_dashboard', label: 'View dashboard' }] },
  {
    label: 'Sales',
    items: [
      { key: 'create_sale', label: 'Create sale' },
      { key: 'view_sales', label: 'View sales' },
      { key: 'cancel_sale', label: 'Cancel / refund sale' },
    ],
  },
  {
    label: 'Products',
    items: [
      { key: 'manage_products', label: 'Manage products (create, edit, delete)' },
      { key: 'view_products', label: 'View products' },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { key: 'manage_inventory', label: 'Manage inventory (adjust, purchases)' },
      { key: 'view_inventory', label: 'View inventory' },
    ],
  },
  {
    label: 'Customers',
    items: [
      { key: 'manage_customers', label: 'Manage customers' },
      { key: 'view_customers', label: 'View customers' },
    ],
  },
  {
    label: 'Debtors',
    items: [
      { key: 'manage_debtors', label: 'Manage debtors (record payments)' },
      { key: 'view_debtors', label: 'View debtors' },
    ],
  },
  {
    label: 'Expenses',
    items: [
      { key: 'manage_expenses', label: 'Manage expenses' },
      { key: 'view_expenses', label: 'View expenses' },
    ],
  },
  {
    label: 'Reports',
    items: [
      { key: 'view_reports', label: 'View reports' },
      { key: 'view_financials', label: 'View financials (P&L, profit)' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { key: 'manage_users', label: 'Manage users & roles' },
      { key: 'manage_settings', label: 'Manage business settings' },
      { key: 'manage_partners', label: 'Manage partners & capital' },
    ],
  },
];

const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.key));

export default function Roles() {
  const [roles, setRoles] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', permissions: [] });
  const { confirm, confirmProps } = useConfirm();

  const load = () => api.get('/roles').then((r) => setRoles(r.data));
  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ name: '', description: '', permissions: [] });
    setEditing(null);
  };

  const openCreate = () => { resetForm(); setOpen(true); };

  const openEdit = (role) => {
    setEditing(role.id);
    setForm({
      name: role.name,
      description: role.description || '',
      permissions: Array.isArray(role.permissions) ? [...role.permissions] : [],
    });
    setOpen(true);
  };

  const togglePermission = (key) => {
    setForm((f) => {
      const has = f.permissions.includes(key);
      return {
        ...f,
        permissions: has
          ? f.permissions.filter((p) => p !== key)
          : [...f.permissions, key],
      };
    });
  };

  const toggleGroup = (group) => {
    const keys = group.items.map((i) => i.key);
    const allOn = keys.every((k) => form.permissions.includes(k));
    setForm((f) => ({
      ...f,
      permissions: allOn
        ? f.permissions.filter((p) => !keys.includes(p))
        : Array.from(new Set([...f.permissions, ...keys])),
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Role name is required');
    try {
      if (editing) await api.put(`/roles/${editing}`, form);
      else await api.post('/roles', form);
      toast.success(editing ? 'Role updated' : 'Role created');
      setOpen(false);
      resetForm();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const remove = async (role) => {
    const ok = await confirm({
      title: `Delete role "${role.name}"?`,
      message: 'Users assigned to this role must be reassigned first. This cannot be undone.',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await api.delete(`/roles/${role.id}`);
      toast.success('Role deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-paper-100">Roles &amp; Permissions</h1>
          <p className="text-sm text-paper-400 mt-1">Define what each type of staff can see and do</p>
        </div>
        <button onClick={openCreate} className="ap-btn-primary">
          <PlusIcon className="w-4 h-4" /> New Role
        </button>
      </div>

      <div className="ap-card overflow-hidden">
        {roles.length === 0 ? (
          <Empty title="No roles yet" subtitle="Create a role to control what staff can access." />
        ) : (
          <table className="ap-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Description</th>
                <th className="text-right">Permissions</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((r) => {
                const isOwner = r.name === 'Owner';
                const perms = Array.isArray(r.permissions) ? r.permissions : [];
                return (
                  <tr key={r.id}>
                    <td className="font-medium">
                      <span className="flex items-center gap-2">
                        {isOwner && <LockClosedIcon className="w-3.5 h-3.5 text-gold-400" />}
                        {r.name}
                      </span>
                    </td>
                    <td className="text-paper-400 text-sm">{r.description || '—'}</td>
                    <td className="text-right font-mono text-sm">
                      {isOwner ? <span className="text-gold-400">Full access</span> : `${perms.length} / ${ALL_PERMISSIONS.length}`}
                    </td>
                    <td className="text-right">
                      <button onClick={() => openEdit(r)} className="text-brand-300 hover:text-brand-200 mr-3" title="Edit">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      {!isOwner && (
                        <button onClick={() => remove(r)} className="text-danger hover:brightness-125" title="Delete">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => { setOpen(false); resetForm(); }}
        title={editing ? 'Edit Role' : 'New Role'}
        size="lg"
      >
        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="ap-label">Role name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Store Manager"
                className="ap-input"
                required
              />
            </div>
            <div>
              <label className="ap-label">Description</label>
              <input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Short summary of who this role is for"
                className="ap-input"
              />
            </div>
          </div>

          <div className="border-t border-white/5 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="ap-card-title">Permissions</div>
              <div className="flex gap-2 text-xs">
                <button type="button" onClick={() => setForm({ ...form, permissions: [...ALL_PERMISSIONS] })} className="text-brand-300 hover:text-brand-200">
                  Select all
                </button>
                <span className="text-paper-600">·</span>
                <button type="button" onClick={() => setForm({ ...form, permissions: [] })} className="text-paper-400 hover:text-paper-200">
                  Clear all
                </button>
              </div>
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {PERMISSION_GROUPS.map((group) => {
                const keys = group.items.map((i) => i.key);
                const allOn = keys.every((k) => form.permissions.includes(k));
                const someOn = keys.some((k) => form.permissions.includes(k));

                return (
                  <div key={group.label} className="rounded-lg border border-white/5 bg-ink-900/40 p-3">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={allOn}
                        ref={(el) => { if (el) el.indeterminate = someOn && !allOn; }}
                        onChange={() => toggleGroup(group)}
                      />
                      <span className="text-xs font-semibold uppercase tracking-wider text-gold-400">
                        {group.label}
                      </span>
                      <span className="text-[10px] text-paper-400">
                        {keys.filter((k) => form.permissions.includes(k)).length} / {keys.length}
                      </span>
                    </label>
                    <div className="mt-2 ml-7 grid grid-cols-1 md:grid-cols-2 gap-1.5">
                      {group.items.map((item) => (
                        <label key={item.key} className="flex items-center gap-2 text-sm text-paper-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.permissions.includes(item.key)}
                            onChange={() => togglePermission(item.key)}
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-white/5">
            <button type="button" onClick={() => { setOpen(false); resetForm(); }} className="ap-btn-secondary">
              Cancel
            </button>
            <button type="submit" className="ap-btn-primary">
              {editing ? 'Save changes' : 'Create role'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog {...confirmProps} />
    </div>
  );
}