import { useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';

export default function StudentProfile() {
  const { user, academy } = useAuth();
  const [pwd, setPwd] = useState({ current: '', next: '' });

  const changePwd = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/change-password', pwd);
      toast.success('Password changed');
      setPwd({ current: '', next: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold">My profile</h1>
      <div className="card p-6 space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-16 w-16 rounded-full bg-brand text-white text-2xl font-bold flex items-center justify-center">
            {user?.name?.[0]}
          </div>
          <div>
            <p className="font-semibold">{user?.name}</p>
            <p className="text-sm text-slate-500">{user?.email}</p>
            <p className="text-xs text-slate-500">{academy?.name}</p>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-3 mt-4 text-sm">
          <div><span className="text-slate-500">Phone:</span> {user?.phone || '—'}</div>
          <div><span className="text-slate-500">Status:</span> <span className="capitalize">{user?.status}</span></div>
          <div><span className="text-slate-500">Academic info:</span> {user?.profile?.academicInfo || '—'}</div>
          <div><span className="text-slate-500">Guardian:</span> {user?.profile?.guardian || '—'}</div>
          <div className="sm:col-span-2"><span className="text-slate-500">Address:</span> {user?.profile?.address || '—'}</div>
        </div>
      </div>

      <form onSubmit={changePwd} className="card p-6 space-y-3">
        <h2 className="font-semibold">Change password</h2>
        <div>
          <label className="label">Current</label>
          <input required type="password" className="input" value={pwd.current} onChange={(e) => setPwd({ ...pwd, current: e.target.value })} />
        </div>
        <div>
          <label className="label">New</label>
          <input required type="password" minLength={6} className="input" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} />
        </div>
        <div className="flex justify-end">
          <button className="btn-primary">Update</button>
        </div>
      </form>
    </div>
  );
}
