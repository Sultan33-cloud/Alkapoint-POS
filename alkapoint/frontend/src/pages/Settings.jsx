import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api';
import Modal from '../components/common/Modal';

export default function Settings() {
  const [tab, setTab] = useState('business');
  const [business, setBusiness] = useState({ name: '', phone: '', email: '', address: '', currency: 'KES' });
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [mpesa, setMpesa] = useState({ configured: false });

  const [userModal, setUserModal] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', email: '', phone: '', password: '', roleId: '' });

  const [branchModal, setBranchModal] = useState(false);
  const [branchForm, setBranchForm] = useState({ name: '', location: '', phone: '' });

  const load = () => {
    api.get('/settings/business').then((r) => setBusiness(r.data));
    api.get('/settings/branches').then((r) => setBranches(r.data));
    api.get('/users').then((r) => setUsers(r.data));
    api.get('/roles').then((r) => setRoles(r.data));
    api.get('/payments/mpesa/status').then((r) => setMpesa(r.data));
  };
  useEffect(() => { load(); }, []);

  const saveBusiness = async (e) => {
    e.preventDefault();
    await api.put('/settings/business', business);
    toast.success('Business updated');
  };

  const createUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', userForm);
      toast.success('User created');
      setUserModal(false);
      setUserForm({ name: '', email: '', phone: '', password: '', roleId: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const createBranch = async (e) => {
    e.preventDefault();
    await api.post('/settings/branches', branchForm);
    toast.success('Branch created');
    setBranchModal(false);
    setBranchForm({ name: '', location: '', phone: '' });
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-paper-100">Settings</h1>
        <p className="text-sm text-paper-400 mt-1">Configure your business</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { k: 'business', l: 'Business' },
          { k: 'branches', l: 'Branches' },
          { k: 'users', l: 'Users' },
          { k: 'payments', l: 'Payments' },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${tab === t.k ? 'bg-brand-500 text-white' : 'bg-ink-700 text-paper-300'}`}
          >
            {t.l}
          </button>
        ))}
      </div>

      {tab === 'business' && (
        <form onSubmit={saveBusiness} className="ap-card p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><label className="ap-label">Business Name</label><input value={business.name} onChange={(e) => setBusiness({ ...business, name: e.target.value })} className="ap-input" required /></div>
          <div><label className="ap-label">Currency</label><input value={business.currency} onChange={(e) => setBusiness({ ...business, currency: e.target.value })} className="ap-input" /></div>
          <div><label className="ap-label">Phone</label><input value={business.phone || ''} onChange={(e) => setBusiness({ ...business, phone: e.target.value })} className="ap-input" /></div>
          <div><label className="ap-label">Email</label><input value={business.email || ''} onChange={(e) => setBusiness({ ...business, email: e.target.value })} className="ap-input" /></div>
          <div className="md:col-span-2"><label className="ap-label">Address</label><input value={business.address || ''} onChange={(e) => setBusiness({ ...business, address: e.target.value })} className="ap-input" /></div>
          <div className="md:col-span-2 flex justify-end"><button type="submit" className="ap-btn-primary">Save changes</button></div>
        </form>
      )}

      {tab === 'branches' && (
        <div className="space-y-4">
          <button onClick={() => setBranchModal(true)} className="ap-btn-primary">+ New Branch</button>
          <div className="ap-card overflow-hidden">
            <table className="ap-table">
              <thead><tr><th>Name</th><th>Location</th><th>Phone</th></tr></thead>
              <tbody>
                {branches.map((b) => (
                  <tr key={b.id}><td>{b.name}</td><td>{b.location}</td><td>{b.phone || '—'}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="space-y-4">
          <button onClick={() => setUserModal(true)} className="ap-btn-primary">+ New User</button>
          <div className="ap-card overflow-hidden">
            <table className="ap-table">
              <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th></tr></thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td className="font-mono text-xs">{u.email}</td>
                    <td>{u.phone || '—'}</td>
                    <td><span className="ap-badge-info">{u.Role?.name || '—'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'payments' && (
        <div className="ap-card p-5">
          <div className="ap-card-title mb-3">M-Pesa Integration</div>
          <div className={`p-3 rounded-lg border ${mpesa.configured ? 'border-success/30 bg-success/10 text-success' : 'border-warning/30 bg-warning/10 text-warning'}`}>
            {mpesa.configured
              ? '✓ M-Pesa Daraja is configured. Live STK push is enabled.'
              : '! M-Pesa is not configured. Set MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, and MPESA_PASSKEY in backend .env to enable live M-Pesa.'}
          </div>
        </div>
      )}

      <Modal open={userModal} onClose={() => setUserModal(false)} title="New User">
        <form onSubmit={createUser} className="space-y-4">
          <div><label className="ap-label">Name</label><input value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} className="ap-input" required /></div>
          <div><label className="ap-label">Email</label><input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} className="ap-input" required /></div>
          <div><label className="ap-label">Phone</label><input value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} className="ap-input" /></div>
          <div><label className="ap-label">Password</label><input type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} className="ap-input" required /></div>
          <div>
            <label className="ap-label">Role</label>
            <select value={userForm.roleId} onChange={(e) => setUserForm({ ...userForm, roleId: e.target.value })} className="ap-select" required>
              <option value="">Select…</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setUserModal(false)} className="ap-btn-secondary">Cancel</button>
            <button type="submit" className="ap-btn-primary">Create</button>
          </div>
        </form>
      </Modal>

      <Modal open={branchModal} onClose={() => setBranchModal(false)} title="New Branch">
        <form onSubmit={createBranch} className="space-y-4">
          <div><label className="ap-label">Name</label><input value={branchForm.name} onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })} className="ap-input" required /></div>
          <div><label className="ap-label">Location</label><input value={branchForm.location} onChange={(e) => setBranchForm({ ...branchForm, location: e.target.value })} className="ap-input" /></div>
          <div><label className="ap-label">Phone</label><input value={branchForm.phone} onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })} className="ap-input" /></div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setBranchModal(false)} className="ap-btn-secondary">Cancel</button>
            <button type="submit" className="ap-btn-primary">Create</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}