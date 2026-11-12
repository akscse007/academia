import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import EmptyState from '../../components/EmptyState';
import { Plus } from 'lucide-react';

export default function TeacherBatches() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', subject: '', monthlyFee: 0, admissionFee: 0, capacity: '', startDate: ''
  });

  const load = async () => {
    const { data } = await api.get('/batches');
    setList(data);
  };
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post('/batches', form);
      toast.success('Batch created');
      setOpen(false);
      setForm({ name: '', description: '', subject: '', monthlyFee: 0, admissionFee: 0, capacity: '', startDate: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Batches</h1>
        <button className="btn-primary" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New batch
        </button>
      </div>

      {!list.length && <EmptyState title="No batches yet" message="Create your first batch to start enrolling students." />}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {list.map((b) => (
          <Link key={b.id} to={`/app/batches/${b.id}`} className="card p-5 hover:shadow-lg transition">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{b.name}</h3>
              <span className={b.status === 'active' ? 'badge-ok' : 'badge-muted'}>{b.status}</span>
            </div>
            {b.subject && <p className="text-xs text-slate-500 mt-1">{b.subject}</p>}
            <div className="mt-4 flex justify-between text-sm">
              <div><span className="text-slate-500">Monthly</span> ₹{b.monthlyFee}</div>
              <div><span className="text-slate-500">Enrolled</span> {b.enrolledCount || 0}{b.capacity ? `/${b.capacity}` : ''}</div>
            </div>
          </Link>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
          <form onSubmit={create} className="card p-6 w-full max-w-lg space-y-3">
            <h2 className="font-semibold text-lg">New batch</h2>
            <div>
              <label className="label">Name</label>
              <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Subject</label>
              <input className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea rows={2} className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Monthly fee</label>
                <input type="number" className="input" value={form.monthlyFee} onChange={(e) => setForm({ ...form, monthlyFee: +e.target.value })} />
              </div>
              <div>
                <label className="label">Admission fee</label>
                <input type="number" className="input" value={form.admissionFee} onChange={(e) => setForm({ ...form, admissionFee: +e.target.value })} />
              </div>
              <div>
                <label className="label">Capacity (optional)</label>
                <input type="number" min="1" className="input" placeholder="Unlimited"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Start date</label>
              <input type="date" className="input" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-outline" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn-primary">Create</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
