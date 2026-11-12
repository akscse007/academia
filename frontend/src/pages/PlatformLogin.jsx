import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { GraduationCap } from 'lucide-react';

export default function PlatformLogin() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState('owner');
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const role = mode === 'owner' ? 'platform_owner' : 'teacher';
      const data = await login({ ...form, role });
      toast.success('Welcome back');
      if (data.user.role === 'platform_owner') nav('/platform');
      else nav('/app');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand/5 to-slate-50 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 font-bold justify-center mb-6">
          <GraduationCap className="h-6 w-6 text-brand" /> EduSuite
        </div>
        <div className="card p-8">
          <div className="flex rounded-lg bg-slate-100 dark:bg-slate-800 p-1 text-sm">
            {['owner', 'teacher'].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-1.5 rounded-md font-medium capitalize transition ${
                  mode === m
                    ? 'bg-white dark:bg-slate-900 text-brand shadow-sm'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {m === 'owner' ? 'Platform owner' : 'Teacher'}
              </button>
            ))}
          </div>
          <h1 className="text-2xl font-bold mt-6">
            {mode === 'owner' ? 'Platform owner sign in' : 'Teacher sign in'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {mode === 'owner'
              ? 'Access to platform-wide administration.'
              : 'Access to your academy dashboard.'}
          </p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                required type="email" className="input"
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                required type="password" className="input"
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <button className="btn-primary w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          {mode === 'teacher' && (
            <p className="mt-4 text-center text-sm">
              New academy?{' '}
              <Link to="/register-academy" className="text-brand font-medium">Register here</Link>
            </p>
          )}
          <p className="mt-2 text-center text-xs text-slate-500">
            Student? Visit your academy's login page at /a/&lt;slug&gt;/login
          </p>
        </div>
      </div>
    </div>
  );
}
