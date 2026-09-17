import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import api from '../api';
import Modal from '../components/common/Modal';
import Empty from '../components/common/Empty';
import ConfirmDialog from '../components/common/ConfirmDialog';
import useConfirm from '../hooks/useConfirm';
import { money, dateShort } from '../utils/format';

export default function Partners() {
  const [partners, setPartners] = useState([]);
  const [capital, setCapital] = useState({ total: 0, entries: [] });
  const [openPartner, setOpenPartner] = useState(false);
  const [editing, setEditing] = useState(null);
  const [openCapital, setOpenCapital] = useState(false);
  const [partnerForm, setPartnerForm] = useState({ name: '', phone: '', email: '', sharePercentage: 0, notes: '' });
  const [capitalForm, setCapitalForm] = useState({
    amount: '', type: 'capital', description: '',
    date: new Date().toISOString().slice(0, 10),
    contributorId: '',
  });
  const { confirm, confirmProps } = useConfirm();

  const load = () => {
    api.get('/partners').then((r) => setPartners(r.data));
    api.get('/capital').then((r) => setCapital(r.data));
  };
  useEffect(() => { load(); }, []);

  const resetPartnerForm = () => {
    setPartnerForm({ name: '', phone: '', email: '', sharePercentage: 0, notes: '' });
    setEditing(null);
  };

  const openCreate = () => { resetPartnerForm(); setOpenPartner(true); };
  const openEdit = (p) => {
    setEditing(p.id);
    setPartnerForm({
      name: p.name, phone: p.phone || '', email: p.email || '',
      sharePercentage: p.sharePercentage || 0, notes: p.notes || '',
    });
    setOpenPartner(true);
  };

  const submitPartner = async (e) => {
    e.preventDefault();
    try {
      if (editing) await api.put(`/partners/${editing}`, partnerForm);
      else await api.post('/partners', partnerForm);
      toast.success(editing ? 'Partner updated' : 'Partner added');
      setOpenPartner(false);
      resetPartnerForm();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const removePartner = async (p) => {
    const ok = await confirm({
      title: `Delete ${p.name}?`,
      message: 'This will remove the partner from your records. Capital history is preserved.',
      confirmLabel: 'Delete',
    });
    if (!ok) return;
    try {
      await api.delete(`/partners/${p.id}`);
      toast.success('Partner deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const submitCapital = async (e) => {
    e.preventDefault();
    try {
      await api.post('/capital', capitalForm);
      toast.success('Capital recorded');
      setOpenCapital(false);
      setCapitalForm({
        amount: '', type: 'capital', description: '',
        date: new Date().toISOString().slice(0, 10), contributorId: '',
      });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-paper-100">Partners &amp; Capital</h1>
          <p className="text-sm text-paper-400 mt-1">
            Total capital: <span className="font-mono text-gold-400">{money(capital.total)}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setOpenCapital(true)} className="ap-btn-secondary">+ Capital</button>
          <button onClick={openCreate} className="ap-btn-primary">
            <PlusIcon className="w-4 h-4" /> Partner
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="ap-card overflow-hidden">
          <div className="ap-card-header"><div className="ap-card-title">Partners</div></div>
          {partners.length === 0 ? <Empty title="No partners" subtitle="Add partners to track ownership." /> : (
            <table className="ap-table">
              <thead>
                <tr><th>Name</th><th>Contact</th><th className="text-right">Share %</th><th className="text-right">Actions</th></tr>
              </thead>
              <tbody>
                {partners.map((p) => (
                  <tr key={p.id}>
                    <td className="font-medium">{p.name}</td>
                    <td className="text-xs text-paper-400">
                      {p.phone && <div>{p.phone}</div>}
                      {p.email && <div>{p.email}</div>}
                    </td>
                    <td className="text-right font-mono">{p.sharePercentage}%</td>
                    <td className="text-right">
                      <button onClick={() => openEdit(p)} className="text-brand-300 hover:text-brand-200 mr-3">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => removePartner(p)} className="text-danger hover:brightness-125">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="ap-card overflow-hidden">
          <div className="ap-card-header"><div className="ap-card-title">Capital Ledger</div></div>
          {capital.entries.length === 0 ? <Empty title="No capital entries" /> : (
            <table className="ap-table">
              <thead>
                <tr><th>Date</th><th>Type</th><th>Description</th><th className="text-right">Amount</th></tr>
              </thead>
              <tbody>
                {capital.entries.map((e) => (
                  <tr key={e.id}>
                    <td className="text-xs">{dateShort(e.date)}</td>
                    <td><span className={`ap-badge-${e.type === 'capital' ? 'success' : 'warning'} capitalize`}>{e.type}</span></td>
                    <td>{e.description || '—'}</td>
                    <td className="text-right font-mono">{money(e.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal open={openPartner} onClose={() => { setOpenPartner(false); resetPartnerForm(); }} title={editing ? 'Edit Partner' : 'New Partner'}>
        <form onSubmit={submitPartner} className="space-y-4">
          <div><label className="ap-label">Name</label><input value={partnerForm.name} onChange={(e) => setPartnerForm({ ...partnerForm, name: e.target.value })} className="ap-input" required /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="ap-label">Phone</label><input value={partnerForm.phone} onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value })} className="ap-input" /></div>
            <div><label className="ap-label">Email</label><input type="email" value={partnerForm.email} onChange={(e) => setPartnerForm({ ...partnerForm, email: e.target.value })} className="ap-input" /></div>
          </div>
          <div><label className="ap-label">Share %</label><input type="number" step="0.01" value={partnerForm.sharePercentage} onChange={(e) => setPartnerForm({ ...partnerForm, sharePercentage: e.target.value })} className="ap-input" /></div>
          <div><label className="ap-label">Notes</label><textarea value={partnerForm.notes} onChange={(e) => setPartnerForm({ ...partnerForm, notes: e.target.value })} className="ap-input" rows="2" /></div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setOpenPartner(false); resetPartnerForm(); }} className="ap-btn-secondary">Cancel</button>
            <button type="submit" className="ap-btn-primary">{editing ? 'Save changes' : 'Create'}</button>
          </div>
        </form>
      </Modal>

      <Modal open={openCapital} onClose={() => setOpenCapital(false)} title="Record Capital">
        <form onSubmit={submitCapital} className="space-y-4">
          <div>
            <label className="ap-label">Type</label>
            <select value={capitalForm.type} onChange={(e) => setCapitalForm({ ...capitalForm, type: e.target.value })} className="ap-select">
              <option value="capital">Capital injection</option>
              <option value="withdrawal">Withdrawal</option>
            </select>
          </div>
          <div>
            <label className="ap-label">Contributor (optional)</label>
            <select value={capitalForm.contributorId} onChange={(e) => setCapitalForm({ ...capitalForm, contributorId: e.target.value })} className="ap-select">
              <option value="">Unassigned</option>
              {partners.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div><label className="ap-label">Amount</label><input type="number" value={capitalForm.amount} onChange={(e) => setCapitalForm({ ...capitalForm, amount: e.target.value })} className="ap-input" required /></div>
          <div><label className="ap-label">Description</label><input value={capitalForm.description} onChange={(e) => setCapitalForm({ ...capitalForm, description: e.target.value })} className="ap-input" /></div>
          <div><label className="ap-label">Date</label><input type="date" value={capitalForm.date} onChange={(e) => setCapitalForm({ ...capitalForm, date: e.target.value })} className="ap-input" /></div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpenCapital(false)} className="ap-btn-secondary">Cancel</button>
            <button type="submit" className="ap-btn-primary">Save</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog {...confirmProps} />
    </div>
  );
}