import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../api/client';
import EmptyState from '../../components/EmptyState';
import { FileQuestion, Clock, ChevronRight, CheckCircle2 } from 'lucide-react';

export default function StudentExams() {
  const { slug } = useParams();
  const [list, setList] = useState([]);
  useEffect(() => { api.get('/exams').then(({ data }) => setList(data)); }, []);

  if (!list.length) return <EmptyState title="No exams yet" message="Your teacher hasn't posted any tests for your batches." icon={FileQuestion} />;

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
        <FileQuestion className="h-6 w-6 text-brand" /> Exams & tests
      </h1>

      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((e) => {
          const done = e.attempt?.status === 'submitted';
          const canTake = e.liveState === 'live' && !done;
          return (
            <div key={e.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{e.title}</h3>
                  <p className="text-xs text-slate-500">{e.questionCount} questions · {e.totalMarks} marks · {e.durationMinutes}m</p>
                </div>
                <span className={`text-xs shrink-0 ${
                  e.liveState === 'live' ? 'badge-ok' :
                  e.liveState === 'upcoming' ? 'badge-warn' : 'badge-muted'
                }`}>{e.liveState}</span>
              </div>

              <p className="text-xs text-slate-400 mt-2">
                {new Date(e.startsAt).toLocaleString()} → {new Date(e.endsAt).toLocaleString()}
              </p>

              <div className="mt-3">
                {done ? (
                  <Link to={`/a/${slug}/exams/${e.id}/result`} className="btn-outline w-full justify-center text-sm">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Scored {e.attempt.score}/{e.attempt.maxScore} — view result
                  </Link>
                ) : canTake ? (
                  <Link to={`/a/${slug}/exams/${e.id}`} className="btn-primary w-full justify-center text-sm">
                    Start exam <ChevronRight className="h-4 w-4" />
                  </Link>
                ) : e.liveState === 'upcoming' ? (
                  <button disabled className="btn-outline w-full justify-center text-sm opacity-60">
                    <Clock className="h-4 w-4" /> Opens {new Date(e.startsAt).toLocaleString()}
                  </button>
                ) : (
                  <button disabled className="btn-outline w-full justify-center text-sm opacity-60">Closed</button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
