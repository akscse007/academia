import { useEffect, useState } from 'react';
import api from '../../api/client';
import EmptyState from '../../components/EmptyState';
import { CalendarCheck, Check, X, Clock } from 'lucide-react';

const statusMeta = {
  present: { label: 'Present', cls: 'badge-ok', icon: Check },
  late: { label: 'Late', cls: 'badge-warn', icon: Clock },
  absent: { label: 'Absent', cls: 'badge-err', icon: X },
  excused: { label: 'Excused', cls: 'badge-muted', icon: Check },
};

export default function StudentAttendance() {
  const [data, setData] = useState(null);

  useEffect(() => { api.get('/attendance/mine').then(({ data }) => setData(data)); }, []);
  if (!data) return null;

  if (!data.total) return <EmptyState title="No attendance recorded yet" message="Your teacher hasn't marked attendance for your batches yet." icon={CalendarCheck} />;

  const ring = data.percent >= 75 ? 'text-emerald-500' : data.percent >= 50 ? 'text-amber-500' : 'text-red-500';

  return (
    <div className="space-y-5">
      <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
        <CalendarCheck className="h-6 w-6 text-brand" /> My attendance
      </h1>

      <div className="card p-5 flex items-center gap-5">
        <div className="relative h-24 w-24 shrink-0">
          <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
            <path className="text-slate-100 dark:text-slate-800" stroke="currentColor" strokeWidth="3.5" fill="none" d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31" />
            <path className={ring} stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" fill="none" strokeDasharray={`${data.percent}, 100`} d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-xl font-bold">{data.percent}%</span>
          </div>
        </div>
        <div>
          <p className="text-sm text-slate-500">Overall attendance</p>
          <p className="text-lg font-semibold">{data.present} / {data.total} classes</p>
          <p className="text-xs text-slate-400 mt-1">Present + late count toward attendance.</p>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-3">History</h2>
        <div className="space-y-1.5">
          {data.records.map((r) => {
            const m = statusMeta[r.status] || statusMeta.absent;
            return (
              <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{new Date(r.date).toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  <p className="text-xs text-slate-500 truncate">{r.batch?.name}{r.note ? ` · ${r.note}` : ''}</p>
                </div>
                <span className={`${m.cls} text-xs shrink-0`}>{m.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
