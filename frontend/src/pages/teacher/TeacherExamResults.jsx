import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client';
import Loader from '../../components/Loader';
import { ArrowLeft, Trophy, Users, Target } from 'lucide-react';

export default function TeacherExamResults() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => { api.get(`/exams/${id}/results`).then(({ data }) => setData(data)); }, [id]);
  if (!data) return <Loader />;

  const pct = (a) => (a.maxScore ? Math.round((a.score / a.maxScore) * 100) : 0);

  return (
    <div className="space-y-5 max-w-3xl">
      <Link to={`/app/exams/${id}`} className="btn-ghost text-sm"><ArrowLeft className="h-4 w-4" /> Back to exam</Link>
      <h1 className="text-xl sm:text-2xl font-bold">{data.exam.title} — results</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={Users} label="Attempts" value={data.stats.attempts} />
        <Kpi icon={Target} label="Submitted" value={data.stats.submitted} />
        <Kpi icon={Trophy} label="Highest" value={`${data.stats.highest}/${data.exam.totalMarks}`} />
        <Kpi icon={Target} label="Average" value={`${data.stats.average}/${data.exam.totalMarks}`} />
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-3">Leaderboard</h2>
        {!data.results.length ? (
          <p className="text-sm text-slate-500">No attempts yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-sm min-w-[480px]">
              <thead className="text-left text-xs uppercase text-slate-500">
                <tr><th className="py-2">#</th><th>Student</th><th>Score</th><th>%</th><th>Status</th><th>Submitted</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.results.map((a, i) => (
                  <tr key={a.id}>
                    <td className="py-2">{i + 1}</td>
                    <td>
                      <div className="font-medium">{a.student?.name}</div>
                      <div className="text-xs text-slate-500">{a.student?.email}</div>
                    </td>
                    <td className="font-semibold">{a.status === 'submitted' ? `${a.score}/${a.maxScore}` : '—'}</td>
                    <td>{a.status === 'submitted' ? `${pct(a)}%` : '—'}</td>
                    <td>
                      <span className={a.status === 'submitted' ? 'badge-ok' : 'badge-warn'}>
                        {a.status === 'submitted' ? 'done' : 'in progress'}
                      </span>
                    </td>
                    <td className="text-xs text-slate-500">{a.submittedAt ? new Date(a.submittedAt).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value }) {
  return (
    <div className="card p-3 sm:p-4">
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-brand/10 text-brand flex items-center justify-center"><Icon className="h-4 w-4" /></div>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
      <p className="mt-2 text-lg sm:text-xl font-bold">{value}</p>
    </div>
  );
}
