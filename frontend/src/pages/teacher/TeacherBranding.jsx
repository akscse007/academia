import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';
import { assetUrl } from '../../utils/assetUrl';

export default function TeacherBranding() {
  const { academy, refresh } = useAuth();
  const { setBranding } = useBranding();
  const [form, setForm] = useState({
    name: '',
    description: '',
    welcomeMessage: '',
    address: '',
    contactNumber: '',
    email: '',
    ownerName: '',
    theme: { primaryColor: '#2563eb', mode: 'light' },
  });

  useEffect(() => {
    if (academy) setForm({
      name: academy.name,
      description: academy.description || '',
      welcomeMessage: academy.welcomeMessage || '',
      address: academy.address || '',
      contactNumber: academy.contactNumber || '',
      email: academy.email || '',
      ownerName: academy.ownerName || '',
      theme: academy.theme || { primaryColor: '#2563eb', mode: 'light' },
    });
  }, [academy]);

  const save = async () => {
    try {
      const { data } = await api.put('/academy/me', form);
      toast.success('Saved');
      setBranding(data);
      refresh();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const uploadLogo = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    try {
      const { data } = await api.post('/academy/me/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Logo updated');
      refresh();
    } catch (err) { toast.error('Upload failed'); }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Academy branding</h1>
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-4">
          {academy?.logoUrl ? (
            <img src={assetUrl(academy.logoUrl)} alt="" className="h-16 w-16 rounded-xl object-cover" />
          ) : (
            <div className="h-16 w-16 rounded-xl bg-brand text-white text-2xl font-bold flex items-center justify-center">
              {academy?.name?.[0]}
            </div>
          )}
          <div>
            <p className="font-semibold">{academy?.name}</p>
            <p className="text-xs text-slate-500">yourplatform.com/a/{academy?.slug}</p>
            <label className="btn-outline text-xs mt-2 cursor-pointer">
              Upload new logo
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
            </label>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label">Academy name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Owner / teacher name</label>
            <input className="input" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
          </div>
          <div>
            <label className="label">Contact number</label>
            <input className="input" value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Address</label>
            <input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Welcome message</label>
            <input className="input" value={form.welcomeMessage} onChange={(e) => setForm({ ...form, welcomeMessage: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Description</label>
            <textarea rows={3} className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="label">Primary colour</label>
            <input type="color" className="h-10 w-20 border rounded cursor-pointer" value={form.theme?.primaryColor || '#2563eb'}
              onChange={(e) => setForm({ ...form, theme: { ...form.theme, primaryColor: e.target.value } })} />
          </div>
          <div>
            <label className="label">Theme mode</label>
            <select className="input" value={form.theme?.mode || 'light'}
              onChange={(e) => setForm({ ...form, theme: { ...form.theme, mode: e.target.value } })}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end">
          <button className="btn-primary" onClick={save}>Save branding</button>
        </div>
      </div>
    </div>
  );
}
