import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../api/client';
import EmptyState from '../../components/EmptyState';
import { FileText, ChevronRight, Lock } from 'lucide-react';

export default function StudentNotes() {
  const { slug } = useParams();
  const [list, setList] = useState([]);
  useEffect(() => { api.get('/notes').then(({ data }) => setList(data)); }, []);

  const groups = list.reduce((acc, n) => {
    const k = n.folder || 'General';
    (acc[k] ||= []).push(n);
    return acc;
  }, {});

  if (!list.length) return <EmptyState title="No study materials yet" icon={FileText} />;

  return (
    <div className="space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold">Study materials</h1>
      {Object.entries(groups).map(([folder, items]) => (
        <section key={folder}>
          <h2 className="text-xs font-semibold uppercase text-slate-500 mb-2 tracking-wide">{folder}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {items.map((n) => (
              <Link
                key={n.id}
                to={`/a/${slug}/notes/${n.id}`}
                className="card p-4 hover:shadow-md transition flex items-center gap-3 group"
              >
                <div className="h-10 w-10 bg-brand/10 text-brand rounded-xl flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{n.title}</p>
                  {n.description && (
                    <p className="text-xs text-slate-500 truncate">{n.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                    <span>{(n.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                    {!n.recordingPermission && (
                      <span className="flex items-center gap-1"><Lock className="h-3 w-3" />protected</span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-brand shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
