import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Wallet, Trash2, Pencil, X } from 'lucide-react';

export default function TeacherBatchDetail() {
  const { id } = useParams();
  const [batch, setBatch] = useState(null);
  const [allStudents, setAllStudents] = useState([]);
  const [selected, setSelected] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data } = await api.get(`/batches/${id}`);
    setBatch(data);
  };
  useEffect(() => {
    load();
    api.get('/students', { params: { status: 'active' } }).then(({ data }) => setAllStudents(data));
  }, [id]);

  const enroll = async () => {
    if (!selected) return;
    try {
      await api.post(`/batches/${id}/enroll`, { studentId: selected });
      toast.success('Student enrolled');
      setSelected('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const remove = async (studentId) => {
    try {
      await api.post(`/batches/${id}/remove`, { studentId });
      toast.success('Removed');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const openEdit = () => {
    setForm({
      name: batch.name,
      description: batch.description || '',
      subject: batch.subject || '',
      monthlyFee: batch.monthlyFee,
      admissionFee: batch.admissionFee,
      capacity: batch.capacity || '',
      status: batch.status,
    });
    setEditOpen(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/batches/${id}`, form);
      toast.success('Batch updated');
      setEditOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  if (!batch) return <div className="p-8">Loading…</div>;

  const enrolled = batch.enrollments || [];
  const enrolledIds = new Set(enrolled.map((e) => String(e.studentId?.id)));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold truncate">{batch.name}</h1>
          <p className="text-sm text-slate-500">{batch.description || batch.subject}</p>
        </div>
        <button className="btn-outline shrink-0" onClick={openEdit}>
          <Pencil className="h-4 w-4" /> Edit
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4"><p className="text-xs uppercase text-slate-500">Monthly fee</p><p className="text-lg sm:text-xl font-bold mt-1">₹{batch.monthlyFee}</p></div>
        <div className="card p-4"><p className="text-xs uppercase text-slate-500">Admission</p><p className="text-lg sm:text-xl font-bold mt-1">₹{batch.admissionFee}</p></div>
        <div className="card p-4"><p className="text-xs uppercase text-slate-500">Enrolled</p><p className="text-lg sm:text-xl font-bold mt-1">{enrolled.length}{batch.capacity ? `/${batch.capacity}` : ''}</p>{!batch.capacity && <p className="text-xs text-slate-500">No limit</p>}</div>
        <div className="card p-4"><p className="text-xs uppercase text-slate-500">Status</p><p className="text-lg sm:text-xl font-bold mt-1 capitalize">{batch.status}</p></div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-3">Enroll student</h2>
        <div className="flex flex-col sm:flex-row gap-2">
          <select className="input flex-1" value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">Select a student…</option>
            {allStudents
              .filter((s) => !enrolledIds.has(String(s.id)))
              .map((s) => (
                <option key={s.id} value={s.id}>{s.name} — {s.email}</option>
              ))}
          </select>
          <button className="btn-primary" onClick={enroll} disabled={!selected}>Add</button>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-3">Enrolled students</h2>
        <div className="overflow-x-auto -mx-2 px-2">
          <table className="w-full text-sm min-w-[500px]">
            <thead className="text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="py-2">Name</th>
                <th className="py-2 hidden sm:table-cell">Email</th>
                <th className="py-2 hidden md:table-cell">Phone</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {enrolled.map((e) => (
                <tr key={e.id}>
                  <td className="py-2">{e.studentId?.name}</td>
                  <td className="py-2 hidden sm:table-cell">{e.studentId?.email}</td>
                  <td className="py-2 hidden md:table-cell">{e.studentId?.phone}</td>
                  <td className="py-2 text-right space-x-1 whitespace-nowrap">
                    <Link to={`/app/batches/${batch.id}/student/${e.studentId?.id}/fees`} className="btn-outline text-xs inline-flex">
                      <Wallet className="h-3 w-3" /> Fees
                    </Link>
                    <button className="btn-danger text-xs" onClick={() => remove(e.studentId?.id)}>
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
              {!enrolled.length && <tr><td colSpan={4} className="py-6 text-center text-slate-500">No students enrolled yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {editOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <form onSubmit={saveEdit} className="bg-white dark:bg-slate-900 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="sm:hidden flex justify-center pt-2 pb-1">
              <div className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
            </div>
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
              <h2 className="font-semibold">Edit batch</h2>
              <button type="button" className="btn-ghost -mr-2" onClick={() => setEditOpen(false)}><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-3">
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Monthly fee (₹)</label>
                  <input required type="number" min="0" className="input" value={form.monthlyFee} onChange={(e) => setForm({ ...form, monthlyFee: e.target.value })} />
                </div>
                <div>
                  <label className="label">Admission fee (₹)</label>
                  <input type="number" min="0" className="input" value={form.admissionFee} onChange={(e) => setForm({ ...form, admissionFee: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Capacity (optional)</label>
                  <input type="number" min="1" className="input" placeholder="Unlimited" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
                </div>
                <div>
                  <label className="label">Status</label>
                  <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
              <p className="text-xs text-slate-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 p-2 rounded-lg">
                Fee changes apply to <b>new months only</b>. Existing paid months keep their recorded amount; unpaid future months use the new fee.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button type="button" className="btn-outline" onClick={() => setEditOpen(false)}>Cancel</button>
                <button className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
