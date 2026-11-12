import { useEffect, useState } from 'react';
import api from '../../api/client';
import StatCard from '../../components/StatCard';
import { Building2, Users, GraduationCap, Hourglass } from 'lucide-react';

export default function PlatformDashboard() {
  const [stats, setStats] = useState({ academies: 0, students: 0, teachers: 0, pendingAcademies: 0 });
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    api.get('/platform-owner/stats').then(({ data }) => setStats(data));
    api.get('/platform-owner/academies').then(({ data }) => setRecent(data.slice(0, 6)));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Platform overview</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Building2} label="Academies" value={stats.academies} />
        <StatCard icon={GraduationCap} label="Students" value={stats.students} />
        <StatCard icon={Users} label="Teachers" value={stats.teachers} />
        <StatCard icon={Hourglass} label="Pending approvals" value={stats.pendingAcademies} />
      </div>
      <div className="card p-6">
        <h2 className="font-semibold">Recent academies</h2>
        <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
          {recent.map((a) => (
            <div key={a.id} className="py-3 flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">{a.name}</p>
                <p className="text-xs text-slate-500">{a.slug} • {new Date(a.createdAt).toLocaleDateString()}</p>
              </div>
              <span className={
                a.status === 'active' ? 'badge-ok' :
                a.status === 'pending' ? 'badge-warn' :
                'badge-err'
              }>{a.status}</span>
            </div>
          ))}
          {!recent.length && <p className="py-6 text-sm text-slate-500">No academies yet.</p>}
        </div>
      </div>
    </div>
  );
}
