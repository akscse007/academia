import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import EmptyState from '../../components/EmptyState';
import { Plus, FileText, Trash2, Eye, EyeOff } from 'lucide-react';

export default function TeacherNotes() {
  const [list, setList] = useState([]);
  const [batches, setBatches] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', folder: 'General', batchIds: [], recordingPermission: false, published: true, file: null,
  });

  const load = async () => {
    const { data } = await api.get('/notes');
    setList(data);
  };
  useEffect(() => {
    load();
    api.get('/batches').then(({ data }) => setBatches(data));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.file) return toast.error('Choose a PDF');
    const fd = new FormData();
    fd.append('file', form.file);
    fd.append('title', form.title);
    fd.append('description', form.description);
    fd.append('folder', form.folder);
    fd.append('batchIds', JSON.stringify(form.batchIds));
    fd.append('recordingPermission', String(form.recordingPermission));
    fd.append('published', String(form.published));
    try {
      await api.post('/notes', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Uploaded');
      setOpen(false);
      setForm({ title: '', description: '', folder: 'General', batchIds: [], recordingPermission: false, published: true, file: null });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const toggle = async (n, key) => {
    try {
      await api.put(`/notes/${n.id}`, { [key]: !n[key] });
      load();
    } catch { toast.error('Failed'); }
  };

  const del = async (n) => {
    if (!confirm('Delete this note?')) return;
    await api.delete(`/notes/${n.id}`);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Study materials</h1>
        <button className="btn-primary" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Upload PDF</button>
      </div>

      {!list.length && <EmptyState title="No materials yet" message="Upload PDFs and assign them to batches." icon={FileText} />}

      <div className="grid gap-3">
        {list.map((n) => (
          <div key={n.id} className="card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-brand/10 text-brand rounded-lg flex items-center justify-center"><FileText className="h-5 w-5" /></div>
              <div>
                <p className="font-medium">{n.title}</p>
                <p className="text-xs text-slate-500">
                  {n.folder} • {(n.fileSize / 1024 / 1024).toFixed(2)} MB •{' '}
                  {(n.batchIds || []).map((b) => b.name).join(', ') || 'No batch'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-xs flex items-center gap-1">
                <input type="checkbox" checked={n.recordingPermission} onChange={() => toggle(n, 'recordingPermission')} />
                Recording
              </label>
              <button onClick={() => toggle(n, 'published')} className="btn-outline text-xs">
                {n.published ? <><Eye className="h-3 w-3" /> Published</> : <><EyeOff className="h-3 w-3" /> Draft</>}
              </button>
              <button onClick={() => del(n)} className="btn-danger text-xs"><Trash2 className="h-3 w-3" /></button>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
          <form onSubmit={submit} className="card p-6 w-full max-w-lg space-y-3">
            <h2 className="font-semibold text-lg">Upload study material</h2>
            <div>
              <label className="label">Title</label>
              <input required className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="label">Folder / category</label>
              <input className="input" value={form.folder} onChange={(e) => setForm({ ...form, folder: e.target.value })} />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea rows={2} className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="label">Assign to batches</label>
              <select
                multiple
                className="input h-28"
                value={form.batchIds}
                onChange={(e) => setForm({ ...form, batchIds: Array.from(e.target.selectedOptions).map((o) => o.value) })}
              >
                {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.recordingPermission} onChange={(e) => setForm({ ...form, recordingPermission: e.target.checked })} />
                Recording permission
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
                Publish now
              </label>
            </div>
            <div>
              <label className="label">PDF file</label>
              <input required type="file" accept="application/pdf" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] })} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="btn-outline" onClick={() => setOpen(false)}>Cancel</button>
              <button className="btn-primary">Upload</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
