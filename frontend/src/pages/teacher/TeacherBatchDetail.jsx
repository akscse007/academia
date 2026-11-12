import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';

export default function TeacherBatchDetail() {
  const { id } = useParams();
  const [batch, setBatch] = useState(null);
  const [allStudents, setAllStudents] = useState([]);
  const [selected, setSelected] = useState('');

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

  if (!batch) return <div className="p-8">Loading…</div>;

  const enrolled = batch.enrollments || [];
  const enrolledIds = new Set(enrolled.map((e) => String(e.studentId?.id)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{batch.name}</h1>
        <p className="text-sm text-slate-500">{batch.description}</p>
      </div>
      <div className="grid md:grid-cols-4 gap-4">
        <div className="card p-5"><p className="text-xs uppercase text-slate-500">Monthly fee</p><p className="text-xl font-bold mt-1">₹{batch.monthlyFee}</p></div>
        <div className="card p-5"><p className="text-xs uppercase text-slate-500">Admission</p><p className="text-xl font-bold mt-1">₹{batch.admissionFee}</p></div>
        <div className="card p-5"><p className="text-xs uppercase text-slate-500">Enrolled</p><p className="text-xl font-bold mt-1">{enrolled.length}{batch.capacity ? `/${batch.capacity}` : ''}</p>{!batch.capacity && <p className="text-xs text-slate-500 mt-1">No limit</p>}</div>
        <div className="card p-5"><p className="text-xs uppercase text-slate-500">Status</p><p className="text-xl font-bold mt-1 capitalize">{batch.status}</p></div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-3">Enroll student</h2>
        <div className="flex gap-2">
          <select className="input" value={selected} onChange={(e) => setSelected(e.target.value)}>
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
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2">Name</th><th className="py-2">Email</th><th className="py-2">Phone</th><th></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {enrolled.map((e) => (
              <tr key={e.id}>
                <td className="py-2">{e.studentId?.name}</td>
                <td className="py-2">{e.studentId?.email}</td>
                <td className="py-2">{e.studentId?.phone}</td>
                <td className="py-2 text-right"><button className="btn-danger text-xs" onClick={() => remove(e.studentId?.id)}>Remove</button></td>
              </tr>
            ))}
            {!enrolled.length && <tr><td colSpan={4} className="py-6 text-center text-slate-500">No students enrolled yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
