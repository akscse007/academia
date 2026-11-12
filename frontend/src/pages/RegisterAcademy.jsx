import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/client';
import { GraduationCap } from 'lucide-react';

export default function RegisterAcademy() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    academyName: '',
    address: '',
    contactNumber: '',
    academyEmail: '',
    description: '',
    welcomeMessage: '',
    primaryColor: '#2563eb',
    upiId: '',
  });
  const [loading, setLoading] = useState(false);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register-academy', form);
      toast.success(data.message || 'Registered. Awaiting approval.');
      nav('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand/5 to-slate-50 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center py-10 px-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-2 font-bold justify-center mb-6">
          <GraduationCap className="h-6 w-6 text-brand" /> EduSuite
        </div>
        <div className="card p-8">
          <h1 className="text-2xl font-bold">Register your academy</h1>
          <p className="text-sm text-slate-500 mt-1">
            Fill the details below. Your account becomes active after the platform owner approves.
          </p>
          <form onSubmit={submit} className="mt-6 grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <h2 className="text-sm font-semibold text-brand uppercase tracking-wide">Owner details</h2>
            </div>
            <div>
              <label className="label">Your full name</label>
              <input required className="input" value={form.name} onChange={update('name')} />
            </div>
            <div>
              <label className="label">Phone number</label>
              <input className="input" value={form.phone} onChange={update('phone')} />
            </div>
            <div>
              <label className="label">Email</label>
              <input required type="email" className="input" value={form.email} onChange={update('email')} />
            </div>
            <div>
              <label className="label">Password</label>
              <input required minLength={6} type="password" className="input" value={form.password} onChange={update('password')} />
            </div>

            <div className="md:col-span-2 mt-2">
              <h2 className="text-sm font-semibold text-brand uppercase tracking-wide">Academy details</h2>
            </div>
            <div className="md:col-span-2">
              <label className="label">Academy / tuition centre name</label>
              <input required className="input" value={form.academyName} onChange={update('academyName')} />
            </div>
            <div>
              <label className="label">Contact number</label>
              <input className="input" value={form.contactNumber} onChange={update('contactNumber')} />
            </div>
            <div>
              <label className="label">Academy email</label>
              <input type="email" className="input" value={form.academyEmail} onChange={update('academyEmail')} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Address</label>
              <input className="input" value={form.address} onChange={update('address')} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Description</label>
              <textarea rows={3} className="input" value={form.description} onChange={update('description')} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Welcome message (shown to students)</label>
              <input className="input" value={form.welcomeMessage} onChange={update('welcomeMessage')} />
            </div>
            <div>
              <label className="label">Primary brand colour</label>
              <input type="color" className="h-10 w-16 border rounded cursor-pointer" value={form.primaryColor} onChange={update('primaryColor')} />
            </div>
            <div>
              <label className="label">UPI ID (for payments)</label>
              <input className="input" placeholder="yourhandle@upi" value={form.upiId} onChange={update('upiId')} />
            </div>
            <div className="md:col-span-2 flex justify-between items-center mt-4">
              <Link to="/login" className="text-sm text-brand hover:underline">Already registered? Sign in</Link>
              <button className="btn-primary" disabled={loading}>
                {loading ? 'Submitting…' : 'Register academy'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
