import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import EmptyState from '../../components/EmptyState';
import { CalendarCheck, Check, X, Clock, Save, Users } from 'lucide-react';

const STATUS_OPTS = [
  { key: 'present', label: 'Present', icon: Check, cls: 'bg-emerald-500 text-white border-emerald-500' },
  { key: 'absent', label: 'Absent', icon: X, cls: 'bg-red-500 text-white border-red-500' },
  { key: 'late', label: 'Late', icon: Clock, cls: 'bg-amber-500 text-white border-amber-500' },
];

export default function TeacherAttendance() {
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/batches').then(({ data }) => {
      setBatches(data);
      if (data[0]) setBatchId(data[0].id);
    });
  }, []);

  const load = async () => {
    if (!batchId || !date) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/attendance/batch/${batchId}`, { params: { date } });
      setRoster(data.roster);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [batchId, date]);

  const setStatus = (studentId, status) =>
    setRoster((r) => r.map((s) => (s.studentId === studentId ? { ...s, status } : s)));

  const markAll = (status) => setRoster((r) => r.map((s) => ({ ...s, status })));

  const save = async () => {
    const records = roster.filter((s) => s.status).map((s) => ({ studentId: s.studentId, status: s.status, note: s.note }));
    if (!records.length) return toast.error('Mark at least one student');
    setSaving(true);
    try {
      await api.post(`/attendance/batch/${batchId}`, { date, records });
      toast.success('Attendance saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const presentCount = roster.filter((s) => s.status === 'present' || s.status === 'late').length;

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
        <CalendarCheck className="h-6 w-6 text-brand" /> Attendance
      </h1>

      <div className="card p-4 flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex-1">
          <label className="label">Batch</label>
          <select className="input" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
            {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Date</label>
          <input type="date" className="input" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} />
        </div>
      </div>

      {!batches.length && <EmptyState title="No batches yet" message="Create a batch first to take attendance." />}

      {batches.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <p className="text-sm text-slate-500 flex items-center gap-1">
              <Users className="h-4 w-4" /> {presentCount}/{roster.length} present
            </p>
            <div className="flex gap-2">
              <button className="btn-outline text-xs" onClick={() => markAll('present')}>All present</button>
              <button className="btn-outline text-xs" onClick={() => markAll('absent')}>All absent</button>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500 py-6 text-center">Loading…</p>
          ) : !roster.length ? (
            <p className="text-sm text-slate-500 py-6 text-center">No active students enrolled in this batch.</p>
          ) : (
            <div className="space-y-2">
              {roster.map((s) => (
                <div key={s.studentId} className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{s.name}</p>
                    <p className="text-xs text-slate-500 truncate">{s.email}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {STATUS_OPTS.map((o) => {
                      const active = s.status === o.key;
                      return (
                        <button
                          key={o.key}
                          onClick={() => setStatus(s.studentId, o.key)}
                          className={`h-9 w-9 rounded-lg border flex items-center justify-center transition ${
                            active ? o.cls : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600'
                          }`}
                          title={o.label}
                        >
                          <o.icon className="h-4 w-4" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {roster.length > 0 && (
            <div className="mt-4 flex justify-end sticky bottom-0 bg-white dark:bg-slate-900 pt-3">
              <button className="btn-primary" disabled={saving} onClick={save}>
                <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save attendance'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
