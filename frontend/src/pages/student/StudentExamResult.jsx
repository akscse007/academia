import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../api/client';
import Loader from '../../components/Loader';
import { ArrowLeft, Check, X, Trophy } from 'lucide-react';

export default function StudentExamResult() {
  const { slug, id } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get(`/exams/${id}/my-result`)
      .then(({ data }) => setData(data))
      .catch((e) => setErr(e.response?.data?.message || 'No result'));
  }, [id]);

  if (err) return (
    <div className="max-w-md mx-auto card p-8 text-center mt-10">
      <p>{err}</p>
      <Link to={`/a/${slug}/exams`} className="btn-primary mt-4 inline-flex">Back to exams</Link>
    </div>
  );
  if (!data) return <Loader />;

  const pct = data.maxScore ? Math.round((data.score / data.maxScore) * 100) : 0;
  const ring = pct >= 60 ? 'text-emerald-500' : pct >= 40 ? 'text-amber-500' : 'text-red-500';

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <Link to={`/a/${slug}/exams`} className="btn-ghost text-sm"><ArrowLeft className="h-4 w-4" /> Exams</Link>

      <div className="card p-6 text-center">
        <Trophy className={`h-8 w-8 mx-auto ${ring}`} />
        <h1 className="text-lg font-bold mt-2">{data.exam.title}</h1>
        <p className="text-4xl font-extrabold mt-3">{data.score}<span className="text-xl text-slate-400">/{data.maxScore}</span></p>
        <p className={`text-sm font-semibold mt-1 ${ring}`}>{pct}%</p>
        <p className="text-xs text-slate-500 mt-2">Submitted {new Date(data.submittedAt).toLocaleString()}</p>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-3">Answer review</h2>
        <div className="space-y-4">
          {data.review.map((q, i) => {
            const ya = q.yourAnswer;
            const correct = ya?.correct;
            return (
              <div key={q.id} className="pb-4 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <div className="flex items-start gap-2">
                  <span className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${correct ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                    {correct ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">Q{i + 1}. {q.text}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{ya?.marks || 0}/{q.marks} marks</p>

                    {(q.type === 'mcq' || q.type === 'truefalse') && (
                      <div className="mt-2 space-y-1">
                        {(q.options || []).map((opt, oi) => {
                          const isCorrect = oi === q.correctIndex;
                          const isYours = ya?.answerIndex === oi;
                          return (
                            <div key={oi} className={`text-sm px-2 py-1 rounded flex items-center gap-2 ${
                              isCorrect ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' :
                              isYours ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' : ''
                            }`}>
                              {opt}
                              {isCorrect && <span className="text-xs">✓ correct</span>}
                              {isYours && !isCorrect && <span className="text-xs">your answer</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {q.type === 'short' && (
                      <div className="mt-2 text-sm space-y-1">
                        <p className="text-slate-500">Your answer: <span className="text-slate-900 dark:text-slate-100">{ya?.answerText || '—'}</span></p>
                        {q.correctText && <p className="text-emerald-600">Expected: {q.correctText}</p>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
