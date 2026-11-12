import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import Loader from '../components/Loader';
import { assetUrl } from '../utils/assetUrl';

export default function AcademyLogin() {
  const { slug } = useParams();
  const { login } = useAuth();
  const { setBranding } = useBranding();
  const nav = useNavigate();
  const [academy, setAcademy] = useState(null);
  const [form, setForm] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get(`/academy/public/${slug}`)
      .then(({ data }) => {
        setAcademy(data);
        setBranding(data);
      })
      .catch((e) => setErr(e.response?.data?.message || 'Academy not found'));
  }, [slug, setBranding]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login({ ...form, academySlug: slug, role: 'student' });
      toast.success('Welcome back');
      nav(`/a/${slug}/dashboard`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  if (err) return <div className="min-h-screen flex items-center justify-center text-slate-500">{err}</div>;
  if (!academy) return <Loader />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand/10 to-slate-50 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-6">
          {academy.logoUrl ? (
            <img src={assetUrl(academy.logoUrl)} alt="" className="h-16 w-16 rounded-2xl object-cover" />
          ) : (
            <div className="h-16 w-16 rounded-2xl bg-brand text-white text-2xl font-bold flex items-center justify-center">
              {academy.name[0]}
            </div>
          )}
          <h1 className="mt-3 text-xl font-bold">{academy.name}</h1>
          <p className="text-sm text-slate-500">{academy.welcomeMessage}</p>
        </div>
        <div className="card p-8">
          <h2 className="text-xl font-bold">Student sign in</h2>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="label">Email</label>
              <input required type="email" className="input"
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label">Password</label>
              <input required type="password" className="input"
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <button className="btn-primary w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <p className="mt-4 text-center text-sm">
            New student?{' '}
            <Link to={`/a/${slug}/register`} className="text-brand font-medium">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
