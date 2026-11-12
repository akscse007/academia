import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import EmptyState from '../../components/EmptyState';

const STATUS = ['pending', 'active', 'suspended', 'deactivated'];

export default function PlatformAcademies() {
  const [list, setList] = useState([]);
  const [filter, setFilter] = useState('');
  const [q, setQ] = useState('');

  const load = async () => {
    const { data } = await api.get('/platform-owner/academies', { params: { status: filter || undefined, q: q || undefined } });
    setList(data);
  };

  useEffect(() => { load(); }, [filter]);

  const changeStatus = async (a, status) => {
    try {
      await api.put(`/platform-owner/academies/${a.id}/status`, { status });
      toast.success(`Status updated to ${status}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Academies</h1>
        <div className="flex gap-2">
          <input placeholder="Search…" className="input w-48" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} />
          <select className="input" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">All statuses</option>
            {STATUS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>
      {list.length === 0 && <EmptyState title="No academies match" />}
      <div className="grid gap-4">
        {list.map((a) => (
          <div key={a.id} className="card p-5 flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
            <div className="flex items-center gap-4">
              {a.logoUrl ? (
                <img src={a.logoUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-brand text-white font-bold flex items-center justify-center">{a.name[0]}</div>
              )}
              <div>
                <p className="font-semibold">{a.name}</p>
                <p className="text-xs text-slate-500">/{a.slug} • Owner: {a.ownerName} • Registered {new Date(a.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={
                a.status === 'active' ? 'badge-ok' :
                a.status === 'pending' ? 'badge-warn' :
                'badge-err'
              }>{a.status}</span>
              {a.status !== 'active' && (
                <button className="btn-primary text-xs" onClick={() => changeStatus(a, 'active')}>Approve / Activate</button>
              )}
              {a.status !== 'suspended' && (
                <button className="btn-outline text-xs" onClick={() => changeStatus(a, 'suspended')}>Suspend</button>
              )}
              {a.status !== 'deactivated' && (
                <button className="btn-danger text-xs" onClick={() => changeStatus(a, 'deactivated')}>Deactivate</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
