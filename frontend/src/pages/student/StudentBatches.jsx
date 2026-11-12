import { useEffect, useState } from 'react';
import api from '../../api/client';
import EmptyState from '../../components/EmptyState';

export default function StudentBatches() {
  const [list, setList] = useState([]);
  useEffect(() => { api.get('/batches').then(({ data }) => setList(data)); }, []);

  if (!list.length) return <EmptyState title="Not enrolled in any batch yet" message="Ask your teacher to enroll you." />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My batches</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {list.map((b) => (
          <div key={b.id} className="card p-5">
            <h3 className="font-semibold">{b.name}</h3>
            {b.subject && <p className="text-xs text-slate-500 mt-1">{b.subject}</p>}
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{b.description}</p>
            <div className="mt-3 flex justify-between text-sm">
              <span>₹{b.monthlyFee}/mo</span>
              {b.schedule?.length > 0 && (
                <span className="text-slate-500 text-xs">
                  {b.schedule.map((s) => `${s.day} ${s.from}-${s.to}`).join(', ')}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
