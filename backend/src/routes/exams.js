import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// Compute the live-status of an exam relative to now
function liveState(exam) {
  const now = new Date();
  if (exam.status === 'draft') return 'draft';
  if (exam.status === 'closed') return 'closed';
  if (now < new Date(exam.startsAt)) return 'upcoming';
  if (now > new Date(exam.endsAt)) return 'ended';
  return 'live';
}

function examBatchIds(exam) {
  return (exam.batches || []).map((b) => b.batchId);
}

/* ------------------------------- TEACHER ------------------------------- */

// List exams for the academy
router.get('/', requireRole('teacher', 'student'), async (req, res, next) => {
  try {
    if (req.user.role === 'teacher') {
      const exams = await prisma.exam.findMany({
        where: { academyId: req.user.academyId },
        orderBy: { createdAt: 'desc' },
        include: {
          batches: { include: { batch: { select: { id: true, name: true } } } },
          _count: { select: { questions: true, attempts: true } },
        },
      });
      return res.json(
        exams.map((e) => ({
          ...e,
          liveState: liveState(e),
          questionCount: e._count.questions,
          attemptCount: e._count.attempts,
          batchNames: e.batches.map((b) => b.batch?.name).filter(Boolean),
        }))
      );
    }

    // Student: exams for their enrolled batches that are published
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: req.user.id, status: 'active' },
      select: { batchId: true },
    });
    const batchIds = enrollments.map((e) => e.batchId);
    const exams = await prisma.exam.findMany({
      where: {
        academyId: req.user.academyId,
        status: { in: ['published', 'closed'] },
        batches: { some: { batchId: { in: batchIds } } },
      },
      orderBy: { startsAt: 'desc' },
      include: {
        _count: { select: { questions: true } },
        attempts: { where: { studentId: req.user.id } },
      },
    });
    res.json(
      exams.map((e) => {
        const attempt = e.attempts[0] || null;
        return {
          id: e.id,
          title: e.title,
          description: e.description,
          durationMinutes: e.durationMinutes,
          startsAt: e.startsAt,
          endsAt: e.endsAt,
          totalMarks: e.totalMarks,
          questionCount: e._count.questions,
          liveState: liveState(e),
          attempt: attempt
            ? { id: attempt.id, status: attempt.status, score: attempt.score, maxScore: attempt.maxScore, submittedAt: attempt.submittedAt }
            : null,
        };
      })
    );
  } catch (err) {
    next(err);
  }
});

// Create exam
router.post('/', requireRole('teacher'), async (req, res, next) => {
  try {
    const { title, description, instructions, durationMinutes, startsAt, endsAt, batchIds = [], shuffle } = req.body;
    if (!title || !startsAt || !endsAt) {
      return res.status(400).json({ message: 'Title, start and end time are required' });
    }
    const exam = await prisma.exam.create({
      data: {
        academyId: req.user.academyId,
        title,
        description: description || '',
        instructions: instructions || '',
        durationMinutes: Number(durationMinutes) || 30,
        startsAt: new Date(startsAt),
        endsAt: new Date(endsAt),
        shuffle: !!shuffle,
        status: 'draft',
        createdById: req.user.id,
        batches: { create: batchIds.map((id) => ({ batchId: id })) },
      },
    });
    res.status(201).json(exam);
  } catch (err) {
    next(err);
  }
});

// Get one exam (teacher: full with questions+answers; also used for editing)
router.get('/:id', async (req, res, next) => {
  try {
    const exam = await prisma.exam.findFirst({
      where: { id: req.params.id, academyId: req.user.academyId },
      include: {
        batches: { include: { batch: { select: { id: true, name: true } } } },
        questions: { orderBy: { order: 'asc' } },
      },
    });
    if (!exam) return res.status(404).json({ message: 'Not found' });

    if (req.user.role === 'teacher') {
      return res.json({ ...exam, liveState: liveState(exam), batchIds: examBatchIds(exam) });
    }
    // Students shouldn't fetch answers here
    return res.status(403).json({ message: 'Use the attempt endpoints' });
  } catch (err) {
    next(err);
  }
});

// Update exam meta
router.put('/:id', requireRole('teacher'), async (req, res, next) => {
  try {
    const existing = await prisma.exam.findFirst({
      where: { id: req.params.id, academyId: req.user.academyId },
    });
    if (!existing) return res.status(404).json({ message: 'Not found' });

    const b = req.body || {};
    const data = {};
    for (const k of ['title', 'description', 'instructions']) if (k in b) data[k] = b[k];
    if ('durationMinutes' in b) data.durationMinutes = Number(b.durationMinutes) || 30;
    if ('startsAt' in b) data.startsAt = new Date(b.startsAt);
    if ('endsAt' in b) data.endsAt = new Date(b.endsAt);
    if ('shuffle' in b) data.shuffle = !!b.shuffle;
    if ('status' in b && ['draft', 'published', 'closed'].includes(b.status)) data.status = b.status;

    if (Array.isArray(b.batchIds)) {
      await prisma.examBatch.deleteMany({ where: { examId: existing.id } });
      data.batches = { create: b.batchIds.map((id) => ({ batchId: id })) };
    }

    const exam = await prisma.exam.update({ where: { id: existing.id }, data });
    res.json(exam);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireRole('teacher'), async (req, res, next) => {
  try {
    const existing = await prisma.exam.findFirst({
      where: { id: req.params.id, academyId: req.user.academyId },
    });
    if (!existing) return res.status(404).json({ message: 'Not found' });
    await prisma.exam.delete({ where: { id: existing.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// Replace all questions for an exam (simple bulk save)
router.put('/:id/questions', requireRole('teacher'), async (req, res, next) => {
  try {
    const exam = await prisma.exam.findFirst({
      where: { id: req.params.id, academyId: req.user.academyId },
    });
    if (!exam) return res.status(404).json({ message: 'Not found' });
    const questions = Array.isArray(req.body.questions) ? req.body.questions : [];

    let totalMarks = 0;
    const clean = questions.map((q, i) => {
      const marks = Number(q.marks) || 1;
      totalMarks += marks;
      const type = ['mcq', 'truefalse', 'short'].includes(q.type) ? q.type : 'mcq';
      // True/False always has fixed options so the student UI can render them
      // even when the client didn't send any.
      let options = Array.isArray(q.options) ? q.options.filter((o) => String(o).trim() !== '') : [];
      if (type === 'truefalse') options = ['True', 'False'];
      if (type === 'short') options = [];
      return {
        examId: exam.id,
        order: i,
        type,
        text: String(q.text || '').trim(),
        options,
        correctIndex: type === 'short' ? null : (q.correctIndex == null ? 0 : Number(q.correctIndex)),
        correctText: String(q.correctText || ''),
        marks,
      };
    }).filter((q) => q.text);

    await prisma.$transaction([
      prisma.question.deleteMany({ where: { examId: exam.id } }),
      ...clean.map((q) => prisma.question.create({ data: q })),
      prisma.exam.update({ where: { id: exam.id }, data: { totalMarks } }),
    ]);

    const saved = await prisma.question.findMany({ where: { examId: exam.id }, orderBy: { order: 'asc' } });
    res.json({ questions: saved, totalMarks });
  } catch (err) {
    next(err);
  }
});

// Teacher: results for an exam
router.get('/:id/results', requireRole('teacher'), async (req, res, next) => {
  try {
    const exam = await prisma.exam.findFirst({
      where: { id: req.params.id, academyId: req.user.academyId },
    });
    if (!exam) return res.status(404).json({ message: 'Not found' });
    const attempts = await prisma.examAttempt.findMany({
      where: { examId: exam.id },
      include: { student: { select: { id: true, name: true, email: true } } },
      orderBy: [{ score: 'desc' }],
    });
    const submitted = attempts.filter((a) => a.status === 'submitted');
    const avg = submitted.length
      ? Math.round(submitted.reduce((s, a) => s + a.score, 0) / submitted.length)
      : 0;
    res.json({
      exam: { id: exam.id, title: exam.title, totalMarks: exam.totalMarks },
      stats: {
        attempts: attempts.length,
        submitted: submitted.length,
        average: avg,
        highest: submitted.length ? Math.max(...submitted.map((a) => a.score)) : 0,
      },
      results: attempts.map((a) => ({
        id: a.id,
        student: a.student,
        status: a.status,
        score: a.score,
        maxScore: a.maxScore,
        startedAt: a.startedAt,
        submittedAt: a.submittedAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------- STUDENT ------------------------------- */

// Start (or resume) an attempt — returns questions WITHOUT correct answers
router.post('/:id/start', requireRole('student'), async (req, res, next) => {
  try {
    const exam = await prisma.exam.findFirst({
      where: { id: req.params.id, academyId: req.user.academyId },
      include: { questions: { orderBy: { order: 'asc' } }, batches: true },
    });
    if (!exam) return res.status(404).json({ message: 'Not found' });
    if (exam.status !== 'published') return res.status(403).json({ message: 'Exam not available' });

    // Must be enrolled in one of the exam's batches
    const batchIds = examBatchIds(exam);
    const enrolled = await prisma.enrollment.findFirst({
      where: { studentId: req.user.id, batchId: { in: batchIds }, status: 'active' },
    });
    if (!enrolled) return res.status(403).json({ message: 'You are not enrolled for this exam' });

    const state = liveState(exam);
    if (state === 'upcoming') return res.status(403).json({ message: 'Exam has not started yet' });
    if (state === 'ended' || state === 'closed') return res.status(403).json({ message: 'Exam has ended' });

    let attempt = await prisma.examAttempt.findUnique({
      where: { examId_studentId: { examId: exam.id, studentId: req.user.id } },
    });
    if (attempt?.status === 'submitted') {
      return res.status(400).json({ message: 'You have already submitted this exam' });
    }
    if (!attempt) {
      attempt = await prisma.examAttempt.create({
        data: {
          examId: exam.id,
          studentId: req.user.id,
          maxScore: exam.totalMarks,
          status: 'in_progress',
        },
      });
    }

    // deadline = min(attempt.startedAt + duration, exam.endsAt)
    const byDuration = new Date(new Date(attempt.startedAt).getTime() + exam.durationMinutes * 60 * 1000);
    const deadline = byDuration < new Date(exam.endsAt) ? byDuration : new Date(exam.endsAt);

    const questions = exam.questions.map((q) => ({
      id: q.id,
      order: q.order,
      type: q.type,
      text: q.text,
      options: q.options,
      marks: q.marks,
    }));
    if (exam.shuffle) questions.sort(() => Math.random() - 0.5);

    res.json({
      attemptId: attempt.id,
      exam: { id: exam.id, title: exam.title, instructions: exam.instructions, durationMinutes: exam.durationMinutes, totalMarks: exam.totalMarks },
      startedAt: attempt.startedAt,
      deadline,
      questions,
      savedAnswers: attempt.answers || [],
    });
  } catch (err) {
    next(err);
  }
});

// Submit answers — auto-grade MCQ/truefalse; short answers graded if correctText matches
router.post('/:id/submit', requireRole('student'), async (req, res, next) => {
  try {
    const exam = await prisma.exam.findFirst({
      where: { id: req.params.id, academyId: req.user.academyId },
      include: { questions: true },
    });
    if (!exam) return res.status(404).json({ message: 'Not found' });

    const attempt = await prisma.examAttempt.findUnique({
      where: { examId_studentId: { examId: exam.id, studentId: req.user.id } },
    });
    if (!attempt) return res.status(400).json({ message: 'No attempt found — start the exam first' });
    if (attempt.status === 'submitted') return res.status(400).json({ message: 'Already submitted' });

    const submitted = Array.isArray(req.body.answers) ? req.body.answers : [];
    const byQ = Object.fromEntries(submitted.map((a) => [a.questionId, a]));

    let score = 0;
    const graded = exam.questions.map((q) => {
      const a = byQ[q.id] || {};
      let correct = false;
      if (q.type === 'mcq' || q.type === 'truefalse') {
        correct = a.answerIndex != null && Number(a.answerIndex) === q.correctIndex;
      } else if (q.type === 'short') {
        const given = String(a.answerText || '').trim().toLowerCase();
        const want = String(q.correctText || '').trim().toLowerCase();
        correct = want.length > 0 && given === want;
      }
      const marks = correct ? q.marks : 0;
      score += marks;
      return {
        questionId: q.id,
        answerIndex: a.answerIndex ?? null,
        answerText: a.answerText ?? '',
        correct,
        marks,
      };
    });

    const updated = await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: {
        answers: graded,
        score,
        maxScore: exam.totalMarks,
        status: 'submitted',
        submittedAt: new Date(),
      },
    });

    res.json({ score: updated.score, maxScore: updated.maxScore, submittedAt: updated.submittedAt });
  } catch (err) {
    next(err);
  }
});

// Student: view own result (with correct answers after submission)
router.get('/:id/my-result', requireRole('student'), async (req, res, next) => {
  try {
    const exam = await prisma.exam.findFirst({
      where: { id: req.params.id, academyId: req.user.academyId },
      include: { questions: { orderBy: { order: 'asc' } } },
    });
    if (!exam) return res.status(404).json({ message: 'Not found' });
    const attempt = await prisma.examAttempt.findUnique({
      where: { examId_studentId: { examId: exam.id, studentId: req.user.id } },
    });
    if (!attempt || attempt.status !== 'submitted') {
      return res.status(404).json({ message: 'No submitted attempt' });
    }
    const answers = Object.fromEntries((attempt.answers || []).map((a) => [a.questionId, a]));
    res.json({
      exam: { id: exam.id, title: exam.title, totalMarks: exam.totalMarks },
      score: attempt.score,
      maxScore: attempt.maxScore,
      submittedAt: attempt.submittedAt,
      review: exam.questions.map((q) => ({
        id: q.id,
        text: q.text,
        type: q.type,
        options: q.options,
        correctIndex: q.correctIndex,
        correctText: q.correctText,
        marks: q.marks,
        yourAnswer: answers[q.id] || null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
