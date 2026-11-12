import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export default function StudentNoteViewer() {
  const { id, slug } = useParams();
  const { user, academy } = useAuth();
  const [note, setNote] = useState(null);
  const [doc, setDoc] = useState(null);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1.2);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Metadata
  useEffect(() => {
    api.get(`/notes/${id}`).then(({ data }) => setNote(data))
      .catch((err) => toast.error(err.response?.data?.message || 'Failed'));
  }, [id]);

  // Load PDF via authed fetch
  useEffect(() => {
    if (!note) return;
    const token = localStorage.getItem('token');
    fetch(`/api/notes/${id}/stream`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (!r.ok) throw new Error('Load failed');
        const buf = await r.arrayBuffer();
        const loading = pdfjsLib.getDocument({ data: buf });
        const d = await loading.promise;
        setDoc(d);
      })
      .catch((err) => toast.error(err.message));
  }, [note, id]);

  // Render page
  useEffect(() => {
    if (!doc || !canvasRef.current) return;
    let cancelled = false;
    (async () => {
      const p = await doc.getPage(page);
      if (cancelled) return;
      const viewport = p.getViewport({ scale });
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await p.render({ canvasContext: ctx, viewport }).promise;
    })();
    return () => { cancelled = true; };
  }, [doc, page, scale]);

  // Protection: disable right-click, selection, common shortcuts
  useEffect(() => {
    const prevent = (e) => e.preventDefault();
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && ['s', 'p', 'u', 'c'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        toast('Action disabled for this material', { icon: '🔒' });
      }
      if (e.key === 'PrintScreen') {
        toast('Please note: screen capture is discouraged', { icon: '⚠️' });
      }
    };
    const container = containerRef.current;
    container?.addEventListener('contextmenu', prevent);
    container?.addEventListener('dragstart', prevent);
    window.addEventListener('keydown', onKey);
    return () => {
      container?.removeEventListener('contextmenu', prevent);
      container?.removeEventListener('dragstart', prevent);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  if (!note) return <div className="p-8">Loading…</div>;

  const watermark = `${user?.name} • ${academy?.name}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Link to={`/a/${slug}/notes`} className="btn-ghost">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <div>
          <h1 className="text-lg font-bold">{note.title}</h1>
          {note.description && <p className="text-xs text-slate-500">{note.description}</p>}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <button className="btn-outline" onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft className="h-4 w-4" /></button>
          <span>{page} / {doc?.numPages || '…'}</span>
          <button className="btn-outline" onClick={() => setPage((p) => Math.min(doc?.numPages || 1, p + 1))}><ChevronRight className="h-4 w-4" /></button>
          <button className="btn-outline" onClick={() => setScale((s) => Math.max(0.6, s - 0.2))}>−</button>
          <button className="btn-outline" onClick={() => setScale((s) => Math.min(2.5, s + 0.2))}>+</button>
        </div>
      </div>

      <div ref={containerRef} className="pdf-viewer relative inline-block mx-auto card p-4 bg-slate-100 dark:bg-slate-900 overflow-auto max-w-full">
        <canvas ref={canvasRef} className="mx-auto shadow-lg bg-white" />
        <div className="pdf-watermark">
          {Array.from({ length: 15 }).map((_, i) => <span key={i}>{watermark}</span>)}
        </div>
      </div>

      <p className="text-xs text-slate-500 text-center max-w-2xl mx-auto">
        This viewer disables right-click, downloads, and common shortcuts. Browser-level protections cannot
        prevent all screenshots or external screen-recording tools; your name appears as a watermark on every page.
      </p>
    </div>
  );
}
