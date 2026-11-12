import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';

const FIELDS = [
  ['name', 'Name'],
  ['photoUrl', 'Photo URL'],
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

  useEffect(() => {
    api.get('/platform-owner/developer').then(({ data }) => {
      setD(data);
      setSkillsText((data.skills || []).join(', '));
    });
  }, []);

  const save = async () => {
    try {
      const payload = { ...d, skills: skillsText.split(',').map((s) => s.trim()).filter(Boolean) };
      const { data } = await api.put('/platform-owner/developer', payload);
      setD(data);
      toast.success('Saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
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
      <h1 className="text-2xl font-bold">Developer profile</h1>
      <p className="text-sm text-slate-500">This content is shown on the public About Developer page.</p>
      <div className="card p-6 grid md:grid-cols-2 gap-4">
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
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Projects</h2>
          <button className="btn-outline text-sm" onClick={addProject}>+ Add project</button>
        </div>
        <div className="mt-4 space-y-3">
          {(d.projects || []).map((p, i) => (
            <div key={i} className="grid md:grid-cols-3 gap-3">
              <input placeholder="Title" className="input" value={p.title || ''} onChange={(e) => updProject(i, 'title', e.target.value)} />
              <input placeholder="Description" className="input" value={p.description || ''} onChange={(e) => updProject(i, 'description', e.target.value)} />
              <div className="flex gap-2">
                <input placeholder="URL" className="input" value={p.url || ''} onChange={(e) => updProject(i, 'url', e.target.value)} />
                <button className="btn-danger" onClick={() => rmProject(i)}>×</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-end">
        <button className="btn-primary" onClick={save}>Save changes</button>
      </div>
    </div>
  );
}
