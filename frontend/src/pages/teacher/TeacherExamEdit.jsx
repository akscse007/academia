import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client';
import Loader from '../../components/Loader';
import { ArrowLeft, Plus, Trash2, Save, Rocket, BarChart3, GripVertical } from 'lucide-react';

const blankQ = () => ({
  type: 'mcq', text: '', options: ['', '', '', ''], correctIndex: 0, correctText: '', marks: 1,
});

export default function TeacherExamEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [savingQ, setSavingQ] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);

  const load = () =>
    api.get(`/exams/${id}`).then(({ data }) => {
      setExam(data);
      setQuestions((data.questions || []).map((q) => ({
        type: q.type,
        text: q.text,
        options: q.options?.length ? q.options : ['', '', '', ''],
        correctIndex: q.correctIndex ?? 0,
        correctText: q.correctText || '',
        marks: q.marks,
      })));
    });

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const updateQ = (i, patch) => setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  const updateOpt = (qi, oi, val) => setQuestions((qs) => qs.map((q, idx) => {
    if (idx !== qi) return q;
    const options = [...q.options];
    options[oi] = val;
    return { ...q, options };
  }));
  const addQ = () => setQuestions((qs) => [...qs, blankQ()]);
  const removeQ = (i) => setQuestions((qs) => qs.filter((_, idx) => idx !== i));

  const saveQuestions = async () => {
    for (const q of questions) {
      if (!q.text.trim()) return toast.error('Every question needs text');
      if (q.type === 'mcq' && q.options.filter((o) => o.trim()).length < 2) {
        return toast.error('MCQ needs at least 2 options');
      }
    }
    setSavingQ(true);
    try {
      const payload = questions.map((q) => ({
        type: q.type,
        text: q.text,
        options: q.type === 'truefalse' ? ['True', 'False'] : q.options,
        correctIndex: q.type === 'short' ? null : Number(q.correctIndex),
        correctText: q.correctText,
        marks: Number(q.marks) || 1,
      }));
      const { data } = await api.put(`/exams/${id}/questions`, { questions: payload });
      toast.success(`Saved ${data.questions.length} questions · ${data.totalMarks} marks`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSavingQ(false); }
  };

  const setStatus = async (status) => {
    if (status === 'published' && questions.length === 0) {
      return toast.error('Add questions before publishing');
    }
    setSavingMeta(true);
    try {
      await api.put(`/exams/${id}`, { status });
      toast.success(status === 'published' ? 'Exam is now live for students' : `Exam ${status}`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSavingMeta(false); }
  };

  const del = async () => {
    if (!confirm('Delete this exam and all its questions + results?')) return;
    await api.delete(`/exams/${id}`);
    toast.success('Deleted');
    nav('/app/exams');
  };

  if (!exam) return <Loader />;

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between gap-2">
        <Link to="/app/exams" className="btn-ghost text-sm"><ArrowLeft className="h-4 w-4" /> Exams</Link>
        <div className="flex items-center gap-2">
          <Link to={`/app/exams/${id}/results`} className="btn-outline text-sm"><BarChart3 className="h-4 w-4" /> Results</Link>
          <button className="btn-ghost text-red-600 text-sm" onClick={del}><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-bold">{exam.title}</h1>
            <p className="text-xs text-slate-500 mt-1">
              {new Date(exam.startsAt).toLocaleString()} → {new Date(exam.endsAt).toLocaleString()} · {exam.durationMinutes}m
            </p>
          </div>
          <span className={`text-xs ${exam.status === 'published' ? 'badge-ok' : exam.status === 'closed' ? 'badge-err' : 'badge-muted'}`}>
            {exam.liveState}
          </span>
        </div>
        <div className="mt-4 flex gap-2 flex-wrap">
          {exam.status !== 'published' && (
            <button className="btn-primary" disabled={savingMeta} onClick={() => setStatus('published')}>
              <Rocket className="h-4 w-4" /> Publish live
            </button>
          )}
          {exam.status === 'published' && (
            <button className="btn-outline" disabled={savingMeta} onClick={() => setStatus('closed')}>Close exam</button>
          )}
          {exam.status === 'closed' && (
            <button className="btn-outline" disabled={savingMeta} onClick={() => setStatus('published')}>Re-open</button>
          )}
          {exam.status === 'published' && (
            <button className="btn-ghost" disabled={savingMeta} onClick={() => setStatus('draft')}>Unpublish (back to draft)</button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Questions ({questions.length})</h2>
        <button className="btn-outline text-sm" onClick={addQ}><Plus className="h-4 w-4" /> Add question</button>
      </div>

      <div className="space-y-4">
        {questions.map((q, i) => (
          <div key={i} className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <GripVertical className="h-4 w-4" /> Q{i + 1}
              </span>
              <div className="flex items-center gap-2">
                <select className="input py-1 text-xs w-32" value={q.type} onChange={(e) => updateQ(i, { type: e.target.value })}>
                  <option value="mcq">Multiple choice</option>
                  <option value="truefalse">True / False</option>
                  <option value="short">Short answer</option>
                </select>
                <input type="number" min="1" className="input py-1 w-16 text-xs" value={q.marks} onChange={(e) => updateQ(i, { marks: e.target.value })} title="Marks" />
                <button className="btn-ghost text-red-600" onClick={() => removeQ(i)}><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            <textarea rows={2} className="input" placeholder="Question text" value={q.text} onChange={(e) => updateQ(i, { text: e.target.value })} />

            {q.type === 'mcq' && (
              <div className="mt-3 space-y-2">
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${i}`}
                      checked={Number(q.correctIndex) === oi}
                      onChange={() => updateQ(i, { correctIndex: oi })}
                      className="accent-brand"
                    />
                    <input className="input py-1.5 flex-1" placeholder={`Option ${oi + 1}`} value={opt} onChange={(e) => updateOpt(i, oi, e.target.value)} />
                  </div>
                ))}
                <p className="text-xs text-slate-500">Select the radio for the correct answer.</p>
              </div>
            )}

            {q.type === 'truefalse' && (
              <div className="mt-3 flex gap-4">
                {['True', 'False'].map((lbl, oi) => (
                  <label key={lbl} className="flex items-center gap-2 text-sm">
                    <input type="radio" name={`correct-${i}`} checked={Number(q.correctIndex) === oi} onChange={() => updateQ(i, { correctIndex: oi })} className="accent-brand" />
                    {lbl}
                  </label>
                ))}
              </div>
            )}

            {q.type === 'short' && (
              <div className="mt-3">
                <label className="label">Correct answer (for auto-check, optional)</label>
                <input className="input" placeholder="Exact expected answer" value={q.correctText} onChange={(e) => updateQ(i, { correctText: e.target.value })} />
                <p className="text-xs text-slate-500 mt-1">Auto-marked correct if the student's answer matches (case-insensitive). Leave blank to grade manually later.</p>
              </div>
            )}
          </div>
        ))}
        {!questions.length && <p className="text-sm text-slate-500 text-center py-6">No questions yet. Click "Add question".</p>}
      </div>

      <div className="sticky bottom-0 bg-gradient-to-t from-slate-50 dark:from-slate-950 to-transparent py-3 flex justify-end">
        <button className="btn-primary" disabled={savingQ} onClick={saveQuestions}>
          <Save className="h-4 w-4" /> {savingQ ? 'Saving…' : 'Save questions'}
        </button>
      </div>
    </div>
  );
}
