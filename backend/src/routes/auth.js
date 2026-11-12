import express from 'express';
import prisma from '../lib/prisma.js';
import { signToken } from '../utils/jwt.js';
import { authenticate } from '../middleware/auth.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { slugify } from '../utils/slug.js';

const router = express.Router();

async function uniqueSlug(base) {
  let slug = slugify(base) || 'academy';
  let tries = 0;
  while (await prisma.academy.findUnique({ where: { slug } })) {
    tries += 1;
    slug = `${slugify(base)}-${tries}`;
  }
  return slug;
}

function publicUser(u) {
  const { password, ...rest } = u;
  return rest;
}

function publicAcademy(a) {
  if (!a) return null;
  return {
    id: a.id,
    slug: a.slug,
    name: a.name,
    logoUrl: a.logoUrl,
    theme: { primaryColor: a.primaryColor, accentColor: a.accentColor, mode: a.themeMode },
    welcomeMessage: a.welcomeMessage,
    upiId: a.upiId,
    paymentQrUrl: a.paymentQrUrl,
  };
}

// Register a new teacher + academy
router.post('/register-academy', async (req, res, next) => {
  try {
    const {
      name, email, phone, password,
      academyName, address, contactNumber, academyEmail,
      description, welcomeMessage, primaryColor, upiId,
    } = req.body;
    if (!name || !email || !password || !academyName) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const existingTeacher = await prisma.user.findFirst({
      where: { email: email.toLowerCase(), role: 'teacher' },
    });
    if (existingTeacher) return res.status(409).json({ message: 'Email already registered' });

    const slug = await uniqueSlug(academyName);
    const hashed = await hashPassword(password);

    const result = await prisma.$transaction(async (tx) => {
      const owner = await tx.user.create({
        data: {
          name, email: email.toLowerCase(), phone: phone || '',
          password: hashed, role: 'teacher', status: 'pending',
        },
      });
      const academy = await tx.academy.create({
        data: {
          name: academyName,
          slug,
          ownerUserId: owner.id,
          ownerName: name,
          email: (academyEmail || email).toLowerCase(),
          contactNumber: contactNumber || phone || '',
          address: address || '',
          description: description || '',
          welcomeMessage: welcomeMessage || `Welcome to ${academyName}`,
          upiId: upiId || '',
          primaryColor: primaryColor || '#2563eb',
          accentColor: primaryColor || '#1e40af',
          themeMode: 'light',
          status: 'pending',
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      });
      const updatedOwner = await tx.user.update({
        where: { id: owner.id },
        data: { academyId: academy.id },
      });
      return { owner: updatedOwner, academy };
    });

    res.status(201).json({
      message: 'Academy registered. Awaiting platform owner approval.',
      academy: { id: result.academy.id, slug: result.academy.slug, status: result.academy.status },
    });
  } catch (err) {
    next(err);
  }
});

// Student registers for a specific academy (by slug)
router.post('/register-student/:slug', async (req, res, next) => {
  try {
    const academy = await prisma.academy.findUnique({
      where: { slug: req.params.slug.toLowerCase() },
    });
    if (!academy || academy.status !== 'active') {
      return res.status(404).json({ message: 'Academy not available' });
    }
    const { name, email, phone, password, address, academicInfo, guardian } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const exists = await prisma.user.findUnique({
      where: { email_academyId: { email: email.toLowerCase(), academyId: academy.id } },
    });
    if (exists) return res.status(409).json({ message: 'Email already registered for this academy' });

    const hashed = await hashPassword(password);
    const student = await prisma.user.create({
      data: {
        name, email: email.toLowerCase(), phone: phone || '',
        password: hashed,
        role: 'student',
        academyId: academy.id,
        status: 'pending',
        address: address || '',
        academicInfo: academicInfo || '',
        guardian: guardian || '',
      },
    });

    await prisma.notification.create({
      data: {
        userId: academy.ownerUserId,
        academyId: academy.id,
        title: 'New student registration',
        message: `${name} has registered and is awaiting approval.`,
        type: 'approval',
      },
    });

    res.status(201).json({
      message: 'Registered. Please wait for teacher approval.',
      user: { id: student.id, status: student.status },
    });
  } catch (err) {
    next(err);
  }
});

// Login (owner / teacher / student)
router.post('/login', async (req, res, next) => {
  try {
    const { email, password, academySlug, role } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Missing credentials' });

    let academy = null;
    const where = { email: email.toLowerCase() };
    if (role) where.role = role;

    if (academySlug) {
      academy = await prisma.academy.findUnique({ where: { slug: academySlug.toLowerCase() } });
      if (!academy) return res.status(404).json({ message: 'Academy not found' });
      where.academyId = academy.id;
    }

    const candidates = await prisma.user.findMany({ where, take: 5 });
    if (!candidates.length) return res.status(401).json({ message: 'Invalid credentials' });

    let matched = null;
    for (const u of candidates) {
      if (await comparePassword(password, u.password)) {
        matched = u;
        break;
      }
    }
    if (!matched) return res.status(401).json({ message: 'Invalid credentials' });

    if (matched.status === 'pending') return res.status(403).json({ message: 'Account awaiting approval' });
    if (matched.status === 'suspended' || matched.status === 'rejected') {
      return res.status(403).json({ message: 'Account is not active' });
    }

    if (matched.academyId) {
      const a = academy || (await prisma.academy.findUnique({ where: { id: matched.academyId } }));
      if (!a) return res.status(403).json({ message: 'Academy not found' });
      if (matched.role !== 'platform_owner' && a.status !== 'active') {
        return res.status(403).json({ message: 'Academy is not active' });
      }
      academy = a;
    }

    await prisma.user.update({ where: { id: matched.id }, data: { lastLogin: new Date() } });

    const token = signToken({ sub: matched.id, role: matched.role });
    res.json({
      token,
      user: publicUser(matched),
      academy: publicAcademy(academy),
    });
  } catch (err) {
    next(err);
  }
});

// Current user context
router.get('/me', authenticate, async (req, res) => {
  const user = publicUser(req.user);
  let academy = null;
  if (req.user.academyId) {
    const a = await prisma.academy.findUnique({ where: { id: req.user.academyId } });
    academy = a;
  }
  res.json({ user, academy });
});

// Change password
router.post('/change-password', authenticate, async (req, res, next) => {
  try {
    const { current, next: nextPw } = req.body;
    if (!current || !nextPw) return res.status(400).json({ message: 'Missing fields' });
    const u = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!(await comparePassword(current, u.password))) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    const hashed = await hashPassword(nextPw);
    await prisma.user.update({ where: { id: u.id }, data: { password: hashed } });
    res.json({ message: 'Password updated' });
  } catch (err) {
    next(err);
  }
});

export default router;
