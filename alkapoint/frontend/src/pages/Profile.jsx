import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import ImageUpload from '../components/common/ImageUpload';

export default function Profile() {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: '', phone: '', email: '', avatar: '' });
  const [pwd, setPwd] = useState({ next: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || '',
        avatar: user.avatar || '',
      });
    }
  }, [user]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/users/${user.id}`, {
        name: form.name,
        phone: form.phone,
        avatar: form.avatar,
      });
      toast.success('Profile updated — reload to see changes everywhere');
      // Refresh cached user so the topbar avatar updates
      const fresh = await api.get('/auth/me');
      localStorage.setItem('alkapoint_user', JSON.stringify(fresh.data));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwd.next.length < 6) return toast.error('Password must be at least 6 characters');
    if (pwd.next !== pwd.confirm) return toast.error('Passwords do not match');
    try {
      await api.put(`/users/${user.id}`, { password: pwd.next });
      toast.success('Password changed');
      setPwd({ next: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-paper-100">My Profile</h1>
        <p className="text-sm text-paper-400 mt-1">Manage your account details</p>
      </div>

      <form onSubmit={saveProfile} className="ap-card p-5 space-y-4">
        <div className="ap-card-title">Personal details</div>
        <ImageUpload
          label="Avatar"
          value={form.avatar}
          onChange={(v) => setForm({ ...form, avatar: v })}
          maxSize={256}
        />
        <div>
          <label className="ap-label">Name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="ap-input" required />
        </div>
        <div>
          <label className="ap-label">Phone</label>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="ap-input" />
        </div>
        <div>
          <label className="ap-label">Email (read-only)</label>
          <input value={form.email} disabled className="ap-input opacity-60" />
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="ap-btn-primary">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>

      <form onSubmit={changePassword} className="ap-card p-5 space-y-4">
        <div className="ap-card-title">Change password</div>
        <div>
          <label className="ap-label">New password</label>
          <input type="password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} className="ap-input" required />
        </div>
        <div>
          <label className="ap-label">Confirm new password</label>
          <input type="password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} className="ap-input" required />
        </div>
        <div className="flex justify-end">
          <button type="submit" className="ap-btn-primary">Update password</button>
        </div>
      </form>
    </div>
  );
}