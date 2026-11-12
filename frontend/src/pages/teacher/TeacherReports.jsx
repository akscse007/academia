import { useEffect, useState } from 'react';
import api from '../../api/client';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FileDown } from 'lucide-react';

const COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#6366f1', '#64748b'];

export default function TeacherReports() {
  const [reports, setReports] = useState({ monthly: [], byBatch: [], statusCounts: [] });
  const [batches, setBatches] = useState([]);
  const [month, setMonth] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [status, setStatus] = useState('successful');

  useEffect(() => {
    api.get('/payments/reports/summary', { params: { year } }).then(({ data }) => setReports(data));
    api.get('/batches').then(({ data }) => setBatches(data));
  }, [year]);

  const batchName = (id) => batches.find((b) => String(b.id) === String(id))?.name || '—';

  const downloadUrl = (ext) => {
    const q = new URLSearchParams();
    q.append('status', status);
    if (month) q.append('month', month);
    if (year) q.append('year', year);
    const token = localStorage.getItem('token');
    // Use <a> with a side-effect fetch for auth. Simplest: open with token as query -- here we'll use a form POST-less approach
    return `/api/reports/payments.${ext}?${q.toString()}`;
  };

  const download = async (ext) => {
    const res = await api.get(`/reports/payments.${ext}`, {
      params: { status, month: month || undefined, year: year || undefined },
      responseType: 'blob',
    });
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments-report.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Financial reports</h1>
        <div className="flex gap-2 flex-wrap items-center">
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            {['successful', 'pending', 'awaiting_verification', 'rejected', ''].map((s) => (
              <option key={s} value={s}>{s || 'all'}</option>
            ))}
          </select>
          <select className="input" value={month} onChange={(e) => setMonth(e.target.value)}>
            <option value="">All months</option>
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i} value={i + 1}>{new Date(2000, i).toLocaleString('en', { month: 'long' })}</option>
            ))}
          </select>
          <input className="input w-24" type="number" value={year} onChange={(e) => setYear(e.target.value)} />
          <button className="btn-outline" onClick={() => download('pdf')}><FileDown className="h-4 w-4" /> PDF</button>
          <button className="btn-outline" onClick={() => download('xlsx')}><FileDown className="h-4 w-4" /> Excel</button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-semibold mb-3">Monthly revenue — {year}</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={reports.monthly}>
                <XAxis dataKey="_id" tickFormatter={(v) => v?.slice(5)} />
                <YAxis />
                <Tooltip />
                <Line dataKey="total" stroke="rgb(var(--brand))" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-6">
          <h2 className="font-semibold mb-3">Revenue by batch</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={reports.byBatch.map((b) => ({ name: batchName(b.id), total: b.total }))}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="rgb(var(--brand))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-6 lg:col-span-2">
          <h2 className="font-semibold mb-3">Payment status distribution</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={reports.statusCounts} dataKey="count" nameKey="_id" outerRadius={100} label>
                  {reports.statusCounts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
