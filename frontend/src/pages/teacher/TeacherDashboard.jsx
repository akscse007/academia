import { useEffect, useState } from 'react';
import api from '../../api/client';
import StatCard from '../../components/StatCard';
import { Users, UserCheck, BookOpen, FileText, Wallet, AlertCircle } from 'lucide-react';
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Users} label="Active students" value={stats.totalStudents || 0} />
        <StatCard icon={UserCheck} label="Pending approvals" value={stats.pendingStudents || 0} />
        <StatCard icon={BookOpen} label="Active batches" value={stats.activeBatches || 0} />
        <StatCard icon={FileText} label="Study materials" value={stats.totalMaterials || 0} />
        <StatCard icon={Wallet} label="Collected" value={`₹${(stats.collected || 0).toLocaleString()}`} />
        <StatCard icon={AlertCircle} label="Outstanding" value={`₹${(stats.outstanding || 0).toLocaleString()}`} />
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
