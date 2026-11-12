import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useBranding } from '../context/BrandingContext';
import Loader from '../components/Loader';

export default function AcademyRegister() {
  const { slug } = useParams();
  const nav = useNavigate();
  const { setBranding } = useBranding();
  const [academy, setAcademy] = useState(null);
  const [err, setErr] = useState('');
  const [form, setForm] = useState({
    name: '', email: '', phone: '', password: '',
    address: '', academicInfo: '', guardian: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get(`/academy/public/${slug}`)
      .then(({ data }) => {
        setAcademy(data);
        setBranding(data);
      })
      .catch((e) => setErr(e.response?.data?.message || 'Academy not found'));
  }, [slug, setBranding]);

  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/auth/register-student/${slug}`, form);
      toast.success('Registered. Awaiting teacher approval.');
      nav(`/a/${slug}/login`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (err) return <div className="min-h-screen flex items-center justify-center text-slate-500">{err}</div>;
  if (!academy) return <Loader />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand/10 to-slate-50 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-xl">
        <div className="flex flex-col items-center text-center mb-6">
          {academy.logoUrl ? (
            <img src={academy.logoUrl} alt="" className="h-16 w-16 rounded-2xl object-cover" />
          ) : (
            <div className="h-16 w-16 rounded-2xl bg-brand text-white text-2xl font-bold flex items-center justify-center">
              {academy.name[0]}
            </div>
          )}
          <h1 className="mt-3 text-xl font-bold">{academy.name}</h1>
          <p className="text-sm text-slate-500">Student registration</p>
        </div>
        <div className="card p-8">
          <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Full name</label>
              <input required className="input" value={form.name} onChange={upd('name')} />
            </div>
            <div>
              <label className="label">Email</label>
              <input required type="email" className="input" value={form.email} onChange={upd('email')} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={upd('phone')} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Password</label>
              <input required type="password" minLength={6} className="input" value={form.password} onChange={upd('password')} />
            </div>
            <div>
              <label className="label">Academic info (grade / class)</label>
              <input className="input" value={form.academicInfo} onChange={upd('academicInfo')} />
            </div>
            <div>
              <label className="label">Guardian name</label>
              <input className="input" value={form.guardian} onChange={upd('guardian')} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Address</label>
              <input className="input" value={form.address} onChange={upd('address')} />
            </div>
            <div className="md:col-span-2 flex justify-between items-center mt-2">
              <Link to={`/a/${slug}/login`} className="text-brand text-sm">Already registered? Sign in</Link>
              <button className="btn-primary" disabled={loading}>
                {loading ? 'Submitting…' : 'Register'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
