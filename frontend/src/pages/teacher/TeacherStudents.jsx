import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import EmptyState from '../../components/EmptyState';
import { Plus, KeyRound, Copy, X, Users } from 'lucide-react';

const STATUS = ['', 'pending', 'active', 'rejected', 'suspended'];

export default function TeacherStudents() {
  const [list, setList] = useState([]);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [batches, setBatches] = useState([]);
  const [openCreate, setOpenCreate] = useState(false);
  const [creds, setCreds] = useState(null);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '',
    academicInfo: '', guardian: '', address: '',
    batchIds: [],
  });

  const load = async () => {
    const { data } = await api.get('/students', { params: { status: status || undefined, q: q || undefined } });
    setList(data);
  };
  useEffect(() => { load(); }, [status]);
  useEffect(() => { api.get('/batches').then(({ data }) => setBatches(data)); }, []);

  const change = async (id, next) => {
    try {
      await api.put(`/students/${id}/status`, { status: next });
      toast.success(`Status: ${next}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const createStudent = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post('/students', form);
      toast.success('Student account created');
      setOpenCreate(false);
      setForm({ name: '', email: '', phone: '', password: '', academicInfo: '', guardian: '', address: '', batchIds: [] });
      setCreds({ ...data.credentials, name: data.student.name });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const resetPwd = async (s) => {
    if (!confirm(`Reset password for ${s.name}? The current password will stop working.`)) return;
    try {
      const { data } = await api.post(`/students/${s.id}/reset-password`);
      setCreds({ ...data, name: s.name });
      toast.success('New password generated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const copy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Students</h1>
        <div className="flex gap-2 flex-wrap">
          <input placeholder="Search name / email / phone" className="input w-64"
            value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()} />
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS.map((s) => <option key={s} value={s}>{s || 'All statuses'}</option>)}
          </select>
          <button className="btn-primary" onClick={() => setOpenCreate(true)}>
            <Plus className="h-4 w-4" /> Create student
          </button>
        </div>
      </div>

      {!list.length && (
        <EmptyState
          icon={Users}
          title="No students yet"
          message="Create student accounts directly here, or share your academy's registration URL so students can sign up themselves."
          action={<button className="btn-primary" onClick={() => setOpenCreate(true)}><Plus className="h-4 w-4" /> Create student</button>}
        />
      )}

      {list.length > 0 && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-left text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Registered</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {list.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-slate-500">{s.academicInfo}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{s.email}</div>
                    <div className="text-xs text-slate-500">{s.phone}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={
                      s.status === 'active' ? 'badge-ok' :
                      s.status === 'pending' ? 'badge-warn' :
                      'badge-err'
                    }>{s.status}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{new Date(s.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right space-x-1 whitespace-nowrap">
                    {s.status !== 'active' && <button className="btn-primary text-xs" onClick={() => change(s.id, 'active')}>Approve</button>}
                    {s.status === 'active' && <button className="btn-outline text-xs" onClick={() => change(s.id, 'suspended')}>Suspend</button>}
                    <button className="btn-outline text-xs" onClick={() => resetPwd(s)} title="Reset password">
                      <KeyRound className="h-3 w-3" /> Reset
                    </button>
                    {s.status !== 'rejected' && <button className="btn-danger text-xs" onClick={() => change(s.id, 'rejected')}>Reject</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {openCreate && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
          <form onSubmit={createStudent} className="card p-6 w-full max-w-lg space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Create student account</h2>
              <button type="button" onClick={() => setOpenCreate(false)} className="btn-ghost"><X className="h-4 w-4" /></button>
            </div>
            <p className="text-xs text-slate-500">
              The student will be auto-approved. You'll get login credentials to share.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Full name *</label>
                <input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="label">Email *</label>
                <input required type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="label">Password (leave blank to auto-generate)</label>
                <input type="text" className="input" placeholder="Auto-generated if blank"
                  value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
              <div>
                <label className="label">Academic info</label>
                <input className="input" value={form.academicInfo} onChange={(e) => setForm({ ...form, academicInfo: e.target.value })} />
              </div>
              <div>
                <label className="label">Guardian</label>
                <input className="input" value={form.guardian} onChange={(e) => setForm({ ...form, guardian: e.target.value })} />
              </div>
              <div>
                <label className="label">Address</label>
                <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="label">Enroll in batches (optional)</label>
                <select multiple className="input h-28"
                  value={form.batchIds}
                  onChange={(e) => setForm({ ...form, batchIds: Array.from(e.target.selectedOptions).map((o) => o.value) })}
                >
                  {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <p className="text-xs text-slate-500 mt-1">Hold Ctrl/Cmd to select multiple.</p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-outline" onClick={() => setOpenCreate(false)}>Cancel</button>
              <button className="btn-primary">Create account</button>
            </div>
          </form>
        </div>
      )}

      {creds && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="card p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Login credentials</h2>
              <button className="btn-ghost" onClick={() => setCreds(null)}><X className="h-4 w-4" /></button>
            </div>
            <p className="text-sm text-slate-500">
              Share these with <span className="font-medium text-slate-900 dark:text-slate-100">{creds.name}</span>.
              This password won't be shown again — copy it now.
            </p>
            <div className="space-y-2">
              <CredField label="Login URL" value={creds.loginUrl} onCopy={copy} />
              <CredField label="Email" value={creds.email} onCopy={copy} />
              <CredField label="Password" value={creds.password} onCopy={copy} mono />
            </div>
            <button
              className="btn-outline w-full"
              onClick={() => copy(
                `Your ${creds.name ? creds.name + ', ' : ''}login details:\nURL: ${creds.loginUrl}\nEmail: ${creds.email}\nPassword: ${creds.password}`
              )}
            >
              <Copy className="h-4 w-4" /> Copy all as message
            </button>
            <button className="btn-primary w-full" onClick={() => setCreds(null)}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}

function CredField({ label, value, onCopy, mono }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className={`text-sm truncate ${mono ? 'font-mono' : ''}`}>{value}</p>
      </div>
      <button className="btn-ghost" onClick={() => onCopy(value)} type="button">
        <Copy className="h-4 w-4" />
      </button>
    </div>
  );
}
