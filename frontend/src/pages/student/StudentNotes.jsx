import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../api/client';
import EmptyState from '../../components/EmptyState';
import { FileText } from 'lucide-react';

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
      <h1 className="text-2xl font-bold">Study materials</h1>
      {Object.entries(groups).map(([folder, items]) => (
        <section key={folder}>
          <h2 className="text-sm font-semibold uppercase text-slate-500">{folder}</h2>
          <div className="mt-2 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {items.map((n) => (
              <Link key={n.id} to={`/a/${slug}/notes/${n.id}`}
                className="card p-4 hover:shadow-lg transition flex items-start gap-3">
                <div className="h-10 w-10 bg-brand/10 text-brand rounded-lg flex items-center justify-center">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate">{n.title}</p>
                  <p className="text-xs text-slate-500 truncate">{n.description}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {(n.fileSize / 1024 / 1024).toFixed(2)} MB
                    {n.recordingPermission ? ' • recording allowed' : ''}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
