import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';
import { Mail, Phone, MapPin, User as UserIcon } from 'lucide-react';

export default function StudentProfile() {
  const { user, academy } = useAuth();
  const [pwd, setPwd] = useState({ current: '', next: '' });
  const [loading, setLoading] = useState(false);

  const changePwd = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/change-password', pwd);
      toast.success('Password changed');
      setPwd({ current: '', next: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-5 max-w-xl">
      <h1 className="text-xl sm:text-2xl font-bold">My profile</h1>
      <div className="card p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-brand text-white text-2xl font-bold flex items-center justify-center shrink-0">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-lg truncate">{user?.name}</p>
            <p className="text-xs text-slate-500 truncate">{academy?.name}</p>
            <span className={`mt-1 inline-block badge-ok text-[10px]`}>{user?.status}</span>
          </div>
        </div>
        <div className="mt-5 space-y-2.5 text-sm">
          <Row icon={Mail} label="Email" value={user?.email} />
          <Row icon={Phone} label="Phone" value={user?.phone || '—'} />
          <Row icon={UserIcon} label="Guardian" value={user?.profile?.guardian || user?.guardian || '—'} />
          <Row icon={UserIcon} label="Academic info" value={user?.profile?.academicInfo || user?.academicInfo || '—'} />
          <Row icon={MapPin} label="Address" value={user?.profile?.address || user?.address || '—'} />
        </div>
      </div>

      <form onSubmit={changePwd} className="card p-5 sm:p-6 space-y-3">
        <h2 className="font-semibold">Change password</h2>
        <div>
          <label className="label">Current</label>
          <input required type="password" className="input" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} />
        </div>
        <div>
          <label className="label">New</label>
          <input required type="password" minLength={6} className="input" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} />
        </div>
        <button className="btn-primary w-full sm:w-auto" disabled={loading}>
          {loading ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="truncate">{value}</p>
      </div>
    </div>
  );
}
