import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import EmptyState from '../../components/EmptyState';
import { Megaphone, Trash2 } from 'lucide-react';

export default function TeacherAnnouncements() {
  const [list, setList] = useState([]);
  const [batches, setBatches] = useState([]);
  const [form, setForm] = useState({ title: '', message: '', targetType: 'all', batchIds: [] });

  const load = async () => {
    const { data } = await api.get('/announcements');
    setList(data);
  };
  useEffect(() => {
    load();
    api.get('/batches').then(({ data }) => setBatches(data));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/announcements', form);
      toast.success('Published');
      setForm({ title: '', message: '', targetType: 'all', batchIds: [] });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const del = async (id) => {
    if (!confirm('Delete this announcement?')) return;
    await api.delete(`/announcements/${id}`);
    load();
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Announcements</h1>
      <form onSubmit={submit} className="card p-5 space-y-3">
        <div>
          <label className="label">Title</label>
          <input required className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div>
          <label className="label">Message</label>
          <textarea required rows={3} className="input" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Audience</label>
            <select className="input" value={form.targetType} onChange={(e) => setForm({ ...form, targetType: e.target.value })}>
              <option value="all">All students</option>
              <option value="batch">Specific batches</option>
            </select>
          </div>
          {form.targetType === 'batch' && (
            <div className="flex-1 min-w-48">
              <label className="label">Batches</label>
              <select multiple className="input h-24"
                value={form.batchIds}
                onChange={(e) => setForm({ ...form, batchIds: Array.from(e.target.selectedOptions).map((o) => o.value) })}
              >
                {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}
          <button className="btn-primary">Publish</button>
        </div>
      </form>

      {!list.length && <EmptyState title="No announcements yet" icon={Megaphone} />}

      <div className="space-y-3">
        {list.map((a) => (
          <div key={a.id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{a.title}</h3>
                <p className="text-xs text-slate-500">
                  {new Date(a.createdAt).toLocaleString()} • {a.targetType}
                  {a.targetType === 'batch' && ` • ${a.batchIds.map((b) => b.name).join(', ')}`}
                </p>
                <p className="mt-2 text-sm whitespace-pre-line">{a.message}</p>
              </div>
              <button className="btn-danger text-xs" onClick={() => del(a.id)}><Trash2 className="h-3 w-3" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
