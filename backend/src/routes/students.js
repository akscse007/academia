import express from 'express';
import { customAlphabet } from 'nanoid';
import prisma from '../lib/prisma.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { hashPassword } from '../utils/password.js';

const router = express.Router();
router.use(authenticate, requireRole('teacher'));

const pwdAlphabet = customAlphabet('ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789', 10);

function generatePassword() {
  return pwdAlphabet();
}

function appOrigin(req) {
  // Prefer explicit APP_URL in production (e.g. https://yourdomain.com).
  // Else fall back to the request's origin header, else synthesise from the host.
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  if (req.headers.origin) return req.headers.origin;
  return `${req.protocol}://${req.get('host')}`;
}

function strip(u) {
  if (!u) return u;
  const { password, ...rest } = u;
  return rest;
}

router.get('/', async (req, res, next) => {
  try {
    const { status, q } = req.query;
    const where = { academyId: req.user.academyId, role: 'student' };
    if (status) where.status = status;
    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ];
    }
    const list = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json(list.map(strip));
  } catch (err) {
    next(err);
  }
});

// Teacher creates a student account directly (auto-approved + optional batch enrollment)
router.post('/', async (req, res, next) => {
  try {
    const { name, email, phone, password, academicInfo, guardian, address, batchIds = [] } = req.body;
    if (!name || !email) return res.status(400).json({ message: 'Name and email are required' });

    const emailLower = email.toLowerCase();
    const exists = await prisma.user.findUnique({
      where: { email_academyId: { email: emailLower, academyId: req.user.academyId } },
    });
    if (exists) return res.status(409).json({ message: 'Email already exists in this academy' });

    const generatedPassword = password && password.length >= 6 ? password : generatePassword();
    const hashed = await hashPassword(generatedPassword);

    const student = await prisma.user.create({
      data: {
        name,
        email: emailLower,
        phone: phone || '',
        password: hashed,
        role: 'student',
        academyId: req.user.academyId,
        status: 'active',
        academicInfo: academicInfo || '',
        guardian: guardian || '',
        address: address || '',
      },
    });

    // Optional batch enrollments
    if (Array.isArray(batchIds) && batchIds.length) {
      const batches = await prisma.batch.findMany({
        where: { id: { in: batchIds }, academyId: req.user.academyId },
        select: { id: true, name: true },
      });
      for (const b of batches) {
        await prisma.enrollment.create({
          data: { studentId: student.id, batchId: b.id, academyId: req.user.academyId },
        });
      }
    }

    await prisma.notification.create({
      data: {
        userId: student.id,
        academyId: req.user.academyId,
        title: 'Account created',
        message: 'Your account has been created by your teacher. Welcome!',
        type: 'approval',
      },
    });

    const { password: _p, ...publicUser } = student;
    res.status(201).json({
      student: publicUser,
      credentials: {
        email: student.email,
        password: generatedPassword,
        loginUrl: `${appOrigin(req)}/a/${req.academy.slug}/login`,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const s = await prisma.user.findFirst({
      where: { id: req.params.id, academyId: req.user.academyId, role: 'student' },
      include: {
        enrollments: {
          where: { status: 'active' },
          include: { batch: true },
        },
      },
    });
    if (!s) return res.status(404).json({ message: 'Not found' });
    res.json(strip(s));
  } catch (err) {
    next(err);
  }
});

router.put('/:id/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['pending', 'active', 'rejected', 'suspended'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    const existing = await prisma.user.findFirst({
      where: { id: req.params.id, academyId: req.user.academyId, role: 'student' },
    });
    if (!existing) return res.status(404).json({ message: 'Not found' });
    const s = await prisma.user.update({ where: { id: existing.id }, data: { status } });
    await prisma.notification.create({
      data: {
        userId: s.id,
        academyId: req.user.academyId,
        title: `Registration ${status}`,
        message:
          status === 'active'
            ? 'Your registration has been approved. You can access your dashboard.'
            : `Your registration status: ${status}`,
        type: 'approval',
      },
    });
    res.json(strip(s));
  } catch (err) {
    next(err);
  }
});

// Reset student password - returns new password so teacher can share it
router.post('/:id/reset-password', async (req, res, next) => {
  try {
    const existing = await prisma.user.findFirst({
      where: { id: req.params.id, academyId: req.user.academyId, role: 'student' },
    });
    if (!existing) return res.status(404).json({ message: 'Not found' });
    const newPassword = generatePassword();
    const hashed = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: existing.id }, data: { password: hashed } });
    res.json({
      email: existing.email,
      password: newPassword,
      loginUrl: `${appOrigin(req)}/a/${req.academy.slug}/login`,
    });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const existing = await prisma.user.findFirst({
      where: { id: req.params.id, academyId: req.user.academyId, role: 'student' },
    });
    if (!existing) return res.status(404).json({ message: 'Not found' });
    const b = req.body || {};
    const data = {};
    if ('name' in b) data.name = b.name;
    if ('phone' in b) data.phone = b.phone;
    if (b.profile) {
      if ('address' in b.profile) data.address = b.profile.address;
      if ('academicInfo' in b.profile) data.academicInfo = b.profile.academicInfo;
      if ('guardian' in b.profile) data.guardian = b.profile.guardian;
      if ('profilePicUrl' in b.profile) data.profilePicUrl = b.profile.profilePicUrl;
    }
    const s = await prisma.user.update({ where: { id: existing.id }, data });
    res.json(strip(s));
  } catch (err) {
    next(err);
  }
});

export default router;
