import express from 'express';
import fs from 'fs';
import prisma from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { uploader, fileUrl, fileLocalPath } from '../middleware/upload.js';

const router = express.Router();
router.use(authenticate);

// Helpers to return batch ids in a flat array for API compatibility
function flattenNote(n) {
  if (!n) return n;
  const batchIds = (n.batches || []).map((nb) => ({
    _id: nb.batch?.id || nb.batchId,
    id: nb.batch?.id || nb.batchId,
    name: nb.batch?.name,
  }));
  const { batches, ...rest } = n;
  return { ...rest, batchIds };
}

router.get('/', async (req, res, next) => {
  try {
    const academyId = req.user.academyId;
    if (req.user.role === 'teacher') {
      const list = await prisma.note.findMany({
        where: { academyId },
        orderBy: { createdAt: 'desc' },
        include: { batches: { include: { batch: { select: { id: true, name: true } } } } },
      });
      return res.json(list.map(flattenNote));
    }
    if (req.user.role === 'student') {
      const enrollments = await prisma.enrollment.findMany({
        where: { studentId: req.user.id, status: 'active' },
        select: { batchId: true },
      });
      const batchIds = enrollments.map((e) => e.batchId);
      const list = await prisma.note.findMany({
        where: {
          academyId,
          published: true,
          batches: { some: { batchId: { in: batchIds } } },
        },
        orderBy: { createdAt: 'desc' },
        include: { batches: { include: { batch: { select: { id: true, name: true } } } } },
      });
      return res.json(list.map(flattenNote));
    }
    res.json([]);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  requireRole('teacher'),
  uploader('notes', { max: 50 }).single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ message: 'File required' });
      const { title, description, folder, batchIds, published, recordingPermission } = req.body;
      const parsedBatchIds = typeof batchIds === 'string' ? JSON.parse(batchIds) : batchIds || [];

      const note = await prisma.note.create({
        data: {
          academyId: req.user.academyId,
          title,
          description: description || '',
          folder: folder || 'General',
          fileUrl: fileUrl(req, req.file),
          storageKey: req.file.filename,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          published: published !== 'false',
          recordingPermission: recordingPermission === 'true',
          uploadedById: req.user.id,
          batches: {
            create: parsedBatchIds.map((bid) => ({ batchId: bid })),
          },
        },
        include: { batches: { include: { batch: { select: { id: true, name: true } } } } },
      });

      if (parsedBatchIds.length) {
        const enrollments = await prisma.enrollment.findMany({
          where: { batchId: { in: parsedBatchIds }, status: 'active' },
          select: { studentId: true },
        });
        if (enrollments.length) {
          await prisma.notification.createMany({
            data: enrollments.map((e) => ({
              userId: e.studentId,
              academyId: req.user.academyId,
              title: 'New study material',
              message: `New material added: ${title}`,
              type: 'new_note',
              link: `/notes/${note.id}`,
            })),
          });
        }
      }

      res.status(201).json(flattenNote(note));
    } catch (err) {
      next(err);
    }
  }
);

router.put('/:id', requireRole('teacher'), async (req, res, next) => {
  try {
    const existing = await prisma.note.findFirst({
      where: { id: req.params.id, academyId: req.user.academyId },
    });
    if (!existing) return res.status(404).json({ message: 'Not found' });
    const b = req.body || {};
    const data = {};
    for (const k of ['title', 'description', 'folder', 'published', 'recordingPermission']) {
      if (k in b) data[k] = b[k];
    }
    let update = prisma.note.update({ where: { id: existing.id }, data });
    if (Array.isArray(b.batchIds)) {
      await prisma.noteBatch.deleteMany({ where: { noteId: existing.id } });
      update = prisma.note.update({
        where: { id: existing.id },
        data: {
          ...data,
          batches: { create: b.batchIds.map((bid) => ({ batchId: bid })) },
        },
      });
    }
    const n = await update;
    res.json(n);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireRole('teacher'), async (req, res, next) => {
  try {
    const existing = await prisma.note.findFirst({
      where: { id: req.params.id, academyId: req.user.academyId },
    });
    if (!existing) return res.status(404).json({ message: 'Not found' });
    await prisma.note.delete({ where: { id: existing.id } });
    const local = fileLocalPath(existing.fileUrl);
    if (local) fs.unlink(local, () => {});
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/stream', async (req, res, next) => {
  try {
    const n = await prisma.note.findFirst({
      where: { id: req.params.id, academyId: req.user.academyId },
      include: { batches: true },
    });
    if (!n) return res.status(404).json({ message: 'Not found' });

    if (req.user.role === 'student') {
      if (!n.published) return res.status(403).json({ message: 'Not available' });
      const batchIds = n.batches.map((b) => b.batchId);
      const enrolled = await prisma.enrollment.findFirst({
        where: { studentId: req.user.id, batchId: { in: batchIds }, status: 'active' },
      });
      if (!enrolled) return res.status(403).json({ message: 'Not enrolled' });
      if (req.query.mode === 'recording' && !n.recordingPermission) {
        return res.status(403).json({ message: 'Recording not permitted' });
      }
    }

    const local = fileLocalPath(n.fileUrl);
    if (!local || !fs.existsSync(local)) return res.status(404).json({ message: 'File missing' });
    res.setHeader('Content-Type', n.mimeType || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(n.title)}.pdf"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    fs.createReadStream(local).pipe(res);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const n = await prisma.note.findFirst({
      where: { id: req.params.id, academyId: req.user.academyId },
      include: { batches: { include: { batch: { select: { id: true, name: true } } } } },
    });
    if (!n) return res.status(404).json({ message: 'Not found' });
    if (req.user.role === 'student') {
      if (!n.published) return res.status(403).json({ message: 'Forbidden' });
      const enrolled = await prisma.enrollment.findFirst({
        where: {
          studentId: req.user.id,
          batchId: { in: n.batches.map((b) => b.batchId) },
          status: 'active',
        },
      });
      if (!enrolled) return res.status(403).json({ message: 'Forbidden' });
    }
    res.json(flattenNote(n));
  } catch (err) {
    next(err);
  }
});

export default router;
