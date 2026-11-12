import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../api/client';
import EmptyState from '../../components/EmptyState';
import { BookOpen, ChevronRight, Calendar } from 'lucide-react';

export default function StudentBatches() {
  const { slug } = useParams();
  const [list, setList] = useState([]);
  useEffect(() => { api.get('/batches').then(({ data }) => setList(data)); }, []);

  if (!list.length) return <EmptyState title="Not enrolled in any batch yet" message="Ask your teacher to enroll you." />;

  return (
    <div className="space-y-4">
      <h1 className="text-xl sm:text-2xl font-bold">My batches</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((b) => (
          <Link
            key={b.id}
            to={`/a/${slug}/batches/${b.id}`}
            className="card p-5 hover:shadow-lg transition group"
          >
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-tight">{b.name}</h3>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-brand transition shrink-0" />
                </div>
                {b.subject && <p className="text-xs text-slate-500 mt-0.5">{b.subject}</p>}
                {b.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">
                    {b.description}
                  </p>
                )}
                <div className="mt-3 flex items-center justify-between flex-wrap gap-2 text-sm">
                  <span className="font-semibold text-brand">₹{b.monthlyFee}/mo</span>
                  {b.schedule?.length > 0 && (
                    <span className="flex items-center gap-1 text-slate-500 text-xs">
                      <Calendar className="h-3 w-3" />
                      {b.schedule.length} class{b.schedule.length > 1 ? 'es' : ''}/week
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
