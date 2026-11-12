import { useEffect, useState } from 'react';
import api from '../../api/client';
import StatCard from '../../components/StatCard';
import { Users, UserCheck, BookOpen, FileText, Wallet, AlertCircle, Clock, TrendingUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import ShareLinks from '../../components/ShareLinks';

export default function TeacherDashboard() {
  const { academy, user } = useAuth();
  const [stats, setStats] = useState({});
  const [reports, setReports] = useState({ monthly: [] });

  useEffect(() => {
    api.get('/academy/me/summary').then(({ data }) => setStats(data));
    api.get('/payments/reports/summary').then(({ data }) => setReports(data));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {user?.name}</h1>
        <p className="text-sm text-slate-500">{academy?.welcomeMessage}</p>
      </div>
      {/* Current month highlight — what needs attention NOW */}
      <div className="card p-5 bg-gradient-to-br from-amber-50 to-white dark:from-amber-900/20 dark:to-slate-900 border-l-4 border-amber-500">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-amber-700 dark:text-amber-300 font-semibold">
                Current month dues ({stats.currentMonth || '—'})
              </p>
              <p className="text-2xl sm:text-3xl font-extrabold mt-1">
                ₹{(stats.currentMonthOutstanding || 0).toLocaleString()}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {stats.studentsOutstanding || 0} student{stats.studentsOutstanding === 1 ? '' : 's'} haven't paid for this month yet
              </p>
            </div>
          </div>
          <div className="text-right text-sm">
            <p className="text-slate-500">Collected this month</p>
            <p className="text-lg font-bold text-emerald-600">
              ₹{(stats.currentMonthCollected || 0).toLocaleString()}
            </p>
            <p className="text-xs text-slate-400">
              of ₹{(stats.currentMonthExpected || 0).toLocaleString()} expected
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Active students" value={stats.totalStudents || 0} />
        <StatCard icon={UserCheck} label="Pending approvals" value={stats.pendingStudents || 0} />
        <StatCard icon={BookOpen} label="Active batches" value={stats.activeBatches || 0} />
        <StatCard icon={FileText} label="Study materials" value={stats.totalMaterials || 0} />
        <StatCard icon={TrendingUp} label="All-time collected" value={`₹${(stats.collected || 0).toLocaleString()}`} />
        <StatCard icon={AlertCircle} label="This-month dues" value={`₹${(stats.currentMonthOutstanding || 0).toLocaleString()}`} />
      </div>
      <ShareLinks academy={academy} />

      <div className="card p-6">
        <h2 className="font-semibold mb-4">Monthly revenue — {new Date().getFullYear()}</h2>
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={reports.monthly || []}>
              <XAxis dataKey="_id" tickFormatter={(v) => v?.slice(5)} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="rgb(var(--brand))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
