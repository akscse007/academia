import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { memoryImageUploader, fileToDataUrl } from '../middleware/upload.js';

const router = express.Router();

// Public branding
router.get('/public/:slug', async (req, res) => {
  const a = await prisma.academy.findUnique({ where: { slug: req.params.slug.toLowerCase() } });
  if (!a) return res.status(404).json({ message: 'Academy not found' });
  if (a.status !== 'active') return res.status(403).json({ message: 'Academy not available' });
  res.json({
    id: a.id,
    slug: a.slug,
    name: a.name,
    logoUrl: a.logoUrl,
    description: a.description,
    welcomeMessage: a.welcomeMessage,
    loginBanner: a.loginBanner,
    dashboardBanner: a.dashboardBanner,
    theme: { primaryColor: a.primaryColor, accentColor: a.accentColor, mode: a.themeMode },
    contactNumber: a.contactNumber,
    email: a.email,
    address: a.address,
  });
});

router.get('/me', authenticate, requireRole('teacher'), async (req, res) => {
  const a = await prisma.academy.findUnique({ where: { id: req.user.academyId } });
  res.json(a);
});

router.put('/me', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const b = req.body || {};
    const data = {};
    const map = {
      name: 'name', address: 'address', contactNumber: 'contactNumber',
      email: 'email', description: 'description', welcomeMessage: 'welcomeMessage',
      upiId: 'upiId', ownerName: 'ownerName',
    };
    for (const [key, col] of Object.entries(map)) if (key in b) data[col] = b[key];
    if (b.theme) {
      if (b.theme.primaryColor) data.primaryColor = b.theme.primaryColor;
      if (b.theme.accentColor) data.accentColor = b.theme.accentColor;
      if (b.theme.mode) data.themeMode = b.theme.mode;
    }
    if (b.feeSettings) {
      if ('lateFeePerDay' in b.feeSettings) data.lateFeePerDay = Number(b.feeSettings.lateFeePerDay);
      if ('gracePeriodDays' in b.feeSettings) data.gracePeriodDays = Number(b.feeSettings.gracePeriodDays);
      if ('currency' in b.feeSettings) data.currency = b.feeSettings.currency;
    }
    const a = await prisma.academy.update({ where: { id: req.user.academyId }, data });
    res.json(a);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/me/logo',
  authenticate,
  requireRole('teacher'),
  memoryImageUploader(2).single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ message: 'No file' });
      const dataUrl = fileToDataUrl(req.file);
      const a = await prisma.academy.update({
        where: { id: req.user.academyId },
        data: { logoUrl: dataUrl },
      });
      res.json({ logoUrl: a.logoUrl });
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/me/qr',
  authenticate,
  requireRole('teacher'),
  memoryImageUploader(2).single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ message: 'No file' });
      const dataUrl = fileToDataUrl(req.file);
      const a = await prisma.academy.update({
        where: { id: req.user.academyId },
        data: { paymentQrUrl: dataUrl },
      });
      res.json({ paymentQrUrl: a.paymentQrUrl });
    } catch (err) {
      next(err);
    }
  }
);

router.get('/me/summary', authenticate, requireRole('teacher'), async (req, res, next) => {
  try {
    const academyId = req.user.academyId;
    const currentMonth = new Date().toISOString().slice(0, 7);

    const [totalStudents, pendingStudents, activeBatches, totalMaterials, collectedAgg, enrollments, successfulThisMonth] =
      await Promise.all([
        prisma.user.count({ where: { academyId, role: 'student', status: 'active' } }),
        prisma.user.count({ where: { academyId, role: 'student', status: 'pending' } }),
        prisma.batch.count({ where: { academyId, status: 'active' } }),
        prisma.note.count({ where: { academyId } }),
        prisma.payment.aggregate({
          where: { academyId, status: 'successful' },
          _sum: { amount: true },
        }),
        prisma.enrollment.findMany({
          where: {
            academyId,
            status: 'active',
            batch: { status: 'active' },
            student: { status: 'active' },
          },
          include: { batch: { select: { monthlyFee: true } } },
        }),
        prisma.payment.findMany({
          where: {
            academyId,
            forMonth: currentMonth,
            type: 'monthly',
            status: { in: ['successful', 'awaiting_verification'] },
          },
          select: { studentId: true, batchId: true, status: true, amount: true },
        }),
      ]);

    // Index: key `<studentId>:<batchId>` → best status
    const rank = { successful: 2, awaiting_verification: 1 };
    const payIdx = {};
    for (const p of successfulThisMonth) {
      const key = `${p.studentId}:${p.batchId}`;
      const cur = payIdx[key];
      if (!cur || (rank[p.status] || 0) > (rank[cur.status] || 0)) payIdx[key] = p;
    }

    let currentMonthExpected = 0;
    let currentMonthCollected = 0;
    let currentMonthOutstanding = 0;
    let studentsOutstandingSet = new Set();

    for (const e of enrollments) {
      const fee = Math.max(
        0,
        Number(e.monthlyFeeOverride ?? e.batch.monthlyFee) - Number(e.discount || 0)
      );
      if (fee <= 0) continue;
      currentMonthExpected += fee;
      const hit = payIdx[`${e.studentId}:${e.batchId}`];
      if (hit?.status === 'successful') currentMonthCollected += Number(hit.amount);
      else {
        currentMonthOutstanding += fee;
        studentsOutstandingSet.add(e.studentId);
      }
    }

    res.json({
      totalStudents,
      pendingStudents,
      activeBatches,
      totalMaterials,
      collected: Number(collectedAgg._sum.amount || 0),
      // Legacy field: now equals currentMonthOutstanding so existing UI shows it
      outstanding: currentMonthOutstanding,
      currentMonth,
      currentMonthExpected,
      currentMonthCollected,
      currentMonthOutstanding,
      studentsOutstanding: studentsOutstandingSet.size,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
