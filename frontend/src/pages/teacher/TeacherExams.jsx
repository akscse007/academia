import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import EmptyState from '../../components/EmptyState';
import { FileQuestion, Plus, Users, Clock, X, ChevronRight } from 'lucide-react';

const stateBadge = {
  draft: 'badge-muted',
  upcoming: 'badge-warn',
  live: 'badge-ok',
  ended: 'badge-muted',
  closed: 'badge-err',
};

export default function TeacherExams() {
  const [list, setList] = useState([]);
  const [batches, setBatches] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', durationMinutes: 30,
    startsAt: '', endsAt: '', batchIds: [],
  });
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/exams').then(({ data }) => setList(data));
  useEffect(() => {
    load();
    api.get('/batches').then(({ data }) => setBatches(data));
  }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!form.batchIds.length) return toast.error('Select at least one batch');
    setSaving(true);
    try {
      const { data } = await api.post('/exams', form);
      toast.success('Exam created — now add questions');
      setOpen(false);
      setForm({ title: '', description: '', durationMinutes: 30, startsAt: '', endsAt: '', batchIds: [] });
      load();
      // navigate to edit happens via the card link
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <FileQuestion className="h-6 w-6 text-brand" /> Exams & tests
        </h1>
        <button className="btn-primary" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> New exam
        </button>
      </div>

      {!list.length && <EmptyState title="No exams yet" message="Create a test, add questions, and publish it live for your batches." icon={FileQuestion} />}

      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((e) => (
          <Link key={e.id} to={`/app/exams/${e.id}`} className="card p-4 hover:shadow-lg transition group">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold truncate">{e.title}</h3>
                <p className="text-xs text-slate-500 truncate">{e.batchNames.join(', ') || 'No batch'}</p>
              </div>
              <span className={`${stateBadge[e.liveState]} text-xs shrink-0`}>{e.liveState}</span>
            </div>
            <div className="mt-3 flex items-center gap-3 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1"><FileQuestion className="h-3 w-3" /> {e.questionCount} Qs</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {e.durationMinutes}m</span>
              <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {e.attemptCount} attempts</span>
              <span>{e.totalMarks} marks</span>
            </div>
            <div className="mt-2 text-xs text-slate-400">
              {new Date(e.startsAt).toLocaleString()} → {new Date(e.endsAt).toLocaleString()}
            </div>
            <div className="mt-2 text-right">
              <span className="text-xs text-brand inline-flex items-center gap-1 group-hover:underline">
                Manage <ChevronRight className="h-3 w-3" />
              </span>
            </div>
          </Link>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
          <form onSubmit={create} className="bg-white dark:bg-slate-900 w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
              <h2 className="font-semibold">New exam</h2>
              <button type="button" className="btn-ghost -mr-2" onClick={() => setOpen(false)}><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="label">Title *</label>
                <input required className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label className="label">Description / instructions</label>
                <textarea rows={2} className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Starts at *</label>
                  <input required type="datetime-local" className="input" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} />
                </div>
                <div>
                  <label className="label">Ends at *</label>
                  <input required type="datetime-local" className="input" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Duration (minutes)</label>
                <input type="number" min="1" className="input" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} />
                <p className="text-xs text-slate-500 mt-1">Each student gets this many minutes from when they start, within the window above.</p>
              </div>
              <div>
                <label className="label">Batches *</label>
                <select multiple className="input h-28"
                  value={form.batchIds}
                  onChange={(e) => setForm({ ...form, batchIds: Array.from(e.target.selectedOptions).map((o) => o.value) })}>
                  {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <p className="text-xs text-slate-500 mt-1">Hold Ctrl/Cmd for multiple.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button type="button" className="btn-outline" onClick={() => setOpen(false)}>Cancel</button>
                <button className="btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Create & add questions'}</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
