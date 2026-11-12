import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { assetUrl } from '../../utils/assetUrl';
import { Upload, Trash2, UserRound } from 'lucide-react';

const FIELDS = [
  ['name', 'Name'],
  ['intro', 'Short introduction'],
  ['about', 'About (long)'],
  ['email', 'Contact email'],
  ['website', 'Website'],
  ['github', 'GitHub'],
  ['linkedin', 'LinkedIn'],
  ['twitter', 'Twitter'],
  ['instagram', 'Instagram'],
];

export default function PlatformDeveloper() {
  const [d, setD] = useState({ skills: [], projects: [] });
  const [skillsText, setSkillsText] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const load = () => api.get('/platform-owner/developer').then(({ data }) => {
    setD(data);
    setSkillsText((data.skills || []).join(', '));
  });

  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      const payload = {
        ...d,
        skills: skillsText.split(',').map((s) => s.trim()).filter(Boolean),
      };
      delete payload.photoUrl; // photo is managed via dedicated upload endpoint
      const { data } = await api.put('/platform-owner/developer', payload);
      setD((prev) => ({ ...data, photoUrl: prev.photoUrl })); // keep current photo
      toast.success('Saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const uploadPhoto = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Please choose an image');
    if (file.size > 2 * 1024 * 1024) return toast.error('Image must be under 2 MB');
    const fd = new FormData();
    fd.append('file', file);
    setUploading(true);
    try {
      const { data } = await api.post('/platform-owner/developer/photo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setD((prev) => ({ ...prev, photoUrl: data.photoUrl }));
      toast.success('Photo updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const clearPhoto = async () => {
    if (!confirm('Remove developer photo?')) return;
    try {
      const { data } = await api.put('/platform-owner/developer', { ...d, photoUrl: '', skills: skillsText.split(',').map((s) => s.trim()).filter(Boolean) });
      setD(data);
      toast.success('Removed');
    } catch (err) { toast.error('Failed'); }
  };

  const addProject = () => setD({ ...d, projects: [...(d.projects || []), { title: '', description: '', url: '' }] });
  const updProject = (i, key, val) => {
    const next = [...d.projects];
    next[i] = { ...next[i], [key]: val };
    setD({ ...d, projects: next });
  };
  const rmProject = (i) => setD({ ...d, projects: d.projects.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">Developer profile</h1>
        <p className="text-sm text-slate-500 mt-1">This content is shown on the public About Developer page.</p>
      </div>

      {/* Photo upload */}
      <div className="card p-5 sm:p-6">
        <h2 className="font-semibold mb-3">Profile photo</h2>
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
          <div className="h-28 w-28 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
            {d.photoUrl ? (
              <img src={assetUrl(d.photoUrl)} alt="" className="h-full w-full object-cover" />
            ) : (
              <UserRound className="h-12 w-12 text-slate-400" />
            )}
          </div>
          <div className="flex-1 w-full">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => uploadPhoto(e.target.files?.[0])}
            />
            <div className="flex flex-wrap gap-2">
              <button
                className="btn-primary"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-4 w-4" /> {uploading ? 'Uploading…' : d.photoUrl ? 'Replace photo' : 'Upload from device'}
              </button>
              {d.photoUrl && (
                <button className="btn-outline text-red-600" onClick={clearPhoto}>
                  <Trash2 className="h-4 w-4" /> Remove
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              JPG, PNG, or WEBP. Up to 2 MB. Image is stored securely in the database and shown on the public About Developer page.
            </p>
          </div>
        </div>
      </div>

      <div className="card p-5 sm:p-6 grid md:grid-cols-2 gap-4">
        {FIELDS.map(([k, label]) => (
          <div key={k} className={k === 'about' ? 'md:col-span-2' : ''}>
            <label className="label">{label}</label>
            {k === 'about' ? (
              <textarea rows={5} className="input" value={d[k] || ''} onChange={(e) => setD({ ...d, [k]: e.target.value })} />
            ) : (
              <input className="input" value={d[k] || ''} onChange={(e) => setD({ ...d, [k]: e.target.value })} />
            )}
          </div>
        ))}
        <div className="md:col-span-2">
          <label className="label">Skills (comma-separated)</label>
          <input className="input" value={skillsText} onChange={(e) => setSkillsText(e.target.value)} />
        </div>
      </div>

      <div className="card p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Projects</h2>
          <button className="btn-outline text-sm" onClick={addProject}>+ Add project</button>
        </div>
        <div className="mt-4 space-y-3">
          {(d.projects || []).map((p, i) => (
            <div key={i} className="grid sm:grid-cols-3 gap-3">
              <input placeholder="Title" className="input" value={p.title || ''} onChange={(e) => updProject(i, 'title', e.target.value)} />
              <input placeholder="Description" className="input" value={p.description || ''} onChange={(e) => updProject(i, 'description', e.target.value)} />
              <div className="flex gap-2">
                <input placeholder="URL" className="input" value={p.url || ''} onChange={(e) => updProject(i, 'url', e.target.value)} />
                <button className="btn-danger" onClick={() => rmProject(i)}>×</button>
              </div>
            </div>
          ))}
          {!(d.projects || []).length && (
            <p className="text-sm text-slate-500">No projects yet. Click <span className="font-medium">+ Add project</span> to add one.</p>
          )}
        </div>
      </div>

      <div className="flex justify-end sticky bottom-0 bg-gradient-to-t from-slate-50 dark:from-slate-950 to-transparent py-3 -mx-3 sm:-mx-4 lg:-mx-8 px-3 sm:px-4 lg:px-8">
        <button className="btn-primary" onClick={save}>Save changes</button>
      </div>
    </div>
  );
}
