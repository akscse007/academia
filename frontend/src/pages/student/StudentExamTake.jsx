import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import Loader from '../../components/Loader';
import { Clock, ChevronLeft, ChevronRight, Send } from 'lucide-react';

export default function StudentExamTake() {
  const { slug, id } = useParams();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [idx, setIdx] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const submittedRef = useRef(false);

  useEffect(() => {
    api.post(`/exams/${id}/start`)
      .then(({ data }) => {
        setData(data);
        const saved = {};
        (data.savedAnswers || []).forEach((a) => { saved[a.questionId] = a; });
        setAnswers(saved);
      })
      .catch((err) => setError(err.response?.data?.message || 'Cannot start exam'));
  }, [id]);

  const submit = useCallback(async (auto = false) => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    try {
      const payload = Object.values(answers);
      const { data: res } = await api.post(`/exams/${id}/submit`, { answers: payload });
      toast.success(auto ? "Time's up — submitted" : 'Submitted');
      nav(`/a/${slug}/exams/${id}/result`, { replace: true });
    } catch (err) {
      submittedRef.current = false;
      toast.error(err.response?.data?.message || 'Submit failed');
    } finally { setSubmitting(false); }
  }, [answers, id, nav, slug]);

  // Countdown
  useEffect(() => {
    if (!data?.deadline) return;
    const tick = () => {
      const ms = new Date(data.deadline).getTime() - Date.now();
      setRemaining(Math.max(0, Math.floor(ms / 1000)));
      if (ms <= 0) submit(true);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [data, submit]);

  if (error) return (
    <div className="max-w-md mx-auto card p-8 text-center mt-10">
      <p className="text-slate-600 dark:text-slate-300">{error}</p>
      <button className="btn-primary mt-4" onClick={() => nav(`/a/${slug}/exams`)}>Back to exams</button>
    </div>
  );
  if (!data) return <Loader />;

  const q = data.questions[idx];
  const setAnswer = (patch) => setAnswers((a) => ({ ...a, [q.id]: { questionId: q.id, ...a[q.id], ...patch } }));
  const answered = Object.keys(answers).filter((k) => {
    const a = answers[k];
    return a && (a.answerIndex != null || (a.answerText && a.answerText.trim()));
  }).length;

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const lowTime = remaining <= 60;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Sticky header with timer */}
      <div className="sticky top-16 z-10 card p-3 flex items-center justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-sm truncate">{data.exam.title}</p>
          <p className="text-xs text-slate-500">{answered}/{data.questions.length} answered</p>
        </div>
        <div className={`flex items-center gap-1.5 font-mono font-bold px-3 py-1.5 rounded-lg ${lowTime ? 'bg-red-500 text-white animate-pulse' : 'bg-brand/10 text-brand'}`}>
          <Clock className="h-4 w-4" /> {mm}:{ss}
        </div>
      </div>

      {data.exam.instructions && idx === 0 && (
        <div className="card p-3 text-xs text-slate-600 dark:text-slate-300 bg-amber-50 dark:bg-amber-900/20">
          {data.exam.instructions}
        </div>
      )}

      {/* Question */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-500">Question {idx + 1} of {data.questions.length}</span>
          <span className="text-xs text-slate-500">{q.marks} mark{q.marks > 1 ? 's' : ''}</span>
        </div>
        <p className="font-medium whitespace-pre-line">{q.text}</p>

        <div className="mt-4 space-y-2">
          {(q.type === 'mcq' || q.type === 'truefalse') && (q.options || []).map((opt, oi) => {
            const active = answers[q.id]?.answerIndex === oi;
            return (
              <button
                key={oi}
                onClick={() => setAnswer({ answerIndex: oi })}
                className={`w-full text-left p-3 rounded-lg border transition flex items-center gap-3 ${
                  active ? 'border-brand bg-brand/10 text-brand font-medium' : 'border-slate-200 dark:border-slate-700 hover:border-brand/50'
                }`}
              >
                <span className={`h-5 w-5 rounded-full border-2 flex items-center justify-center shrink-0 ${active ? 'border-brand' : 'border-slate-300'}`}>
                  {active && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}
                </span>
                {opt}
              </button>
            );
          })}
          {q.type === 'short' && (
            <textarea
              rows={3}
              className="input"
              placeholder="Type your answer…"
              value={answers[q.id]?.answerText || ''}
              onChange={(e) => setAnswer({ answerText: e.target.value })}
            />
          )}
        </div>
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between gap-2">
        <button className="btn-outline" disabled={idx === 0} onClick={() => setIdx((i) => i - 1)}>
          <ChevronLeft className="h-4 w-4" /> Prev
        </button>
        {idx < data.questions.length - 1 ? (
          <button className="btn-primary" onClick={() => setIdx((i) => i + 1)}>
            Next <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button className="btn-primary" disabled={submitting} onClick={() => {
            if (confirm(`Submit exam? You answered ${answered}/${data.questions.length} questions.`)) submit(false);
          }}>
            <Send className="h-4 w-4" /> {submitting ? 'Submitting…' : 'Submit exam'}
          </button>
        )}
      </div>

      {/* Question palette */}
      <div className="card p-3">
        <p className="text-xs text-slate-500 mb-2">Jump to question</p>
        <div className="flex flex-wrap gap-1.5">
          {data.questions.map((qq, i) => {
            const a = answers[qq.id];
            const done = a && (a.answerIndex != null || (a.answerText && a.answerText.trim()));
            return (
              <button
                key={qq.id}
                onClick={() => setIdx(i)}
                className={`h-8 w-8 rounded-lg text-xs font-medium border transition ${
                  i === idx ? 'border-brand ring-2 ring-brand/30' : 'border-slate-200 dark:border-slate-700'
                } ${done ? 'bg-brand text-white' : 'bg-white dark:bg-slate-900'}`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
