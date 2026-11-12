import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate, requireRole('platform_owner'));

router.get('/stats', async (_req, res, next) => {
  try {
    const [academies, students, teachers, pendingAcademies] = await Promise.all([
      prisma.academy.count(),
      prisma.user.count({ where: { role: 'student' } }),
      prisma.user.count({ where: { role: 'teacher' } }),
      prisma.academy.count({ where: { status: 'pending' } }),
    ]);
    res.json({ academies, students, teachers, pendingAcademies });
  } catch (err) {
    next(err);
  }
});

router.get('/academies', async (req, res, next) => {
  try {
    const { status, q } = req.query;
    const where = {};
    if (status) where.status = status;
    if (q) where.name = { contains: q, mode: 'insensitive' };
    const list = await prisma.academy.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json(list);
  } catch (err) {
    next(err);
  }
});

router.put('/academies/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['pending', 'active', 'suspended', 'deactivated'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const a = await prisma.academy.update({
      where: { id: req.params.id },
      data: { status },
    });

    if (status === 'active') {
      await prisma.user.updateMany({
        where: { academyId: a.id, role: 'teacher' },
        data: { status: 'active' },
      });
      await prisma.notification.create({
        data: {
          userId: a.ownerUserId,
          academyId: a.id,
          title: 'Academy approved',
          message: `${a.name} has been activated. You can now sign in.`,
          type: 'approval',
        },
      });
    }

    await prisma.activityLog.create({
      data: { userId: req.user.id, academyId: a.id, action: `academy.${status}` },
    });
    res.json(a);
  } catch (err) {
    next(err);
  }
});

router.put('/academies/:id/subscription', async (req, res, next) => {
  try {
    const { plan, expiresAt } = req.body;
    const a = await prisma.academy.update({
      where: { id: req.params.id },
      data: {
        subscriptionPlan: plan,
        subscriptionExpiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });
    res.json(a);
  } catch (err) {
    next(err);
  }
});

router.get('/developer', async (_req, res) => {
  let d = await prisma.developer.findFirst();
  if (!d) d = await prisma.developer.create({ data: {} });
  res.json(d);
});

router.put('/developer', async (req, res, next) => {
  try {
    let d = await prisma.developer.findFirst();
    const body = req.body || {};
    const data = {};
    const allowed = [
      'name', 'photoUrl', 'intro', 'about', 'email', 'website',
      'github', 'linkedin', 'twitter', 'instagram',
    ];
    for (const k of allowed) if (k in body) data[k] = body[k];
    if (Array.isArray(body.skills)) data.skills = body.skills;
    if (Array.isArray(body.projects)) data.projects = body.projects;
    if (!d) d = await prisma.developer.create({ data });
    else d = await prisma.developer.update({ where: { id: d.id }, data });
    res.json(d);
  } catch (err) {
    next(err);
  }
});

router.get('/activity', async (_req, res) => {
  const rows = await prisma.activityLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 });
  res.json(rows);
});

export default router;
