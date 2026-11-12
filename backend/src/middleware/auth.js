import { verifyToken } from '../utils/jwt.js';
import prisma from '../lib/prisma.js';

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Not authenticated' });

    const decoded = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user) return res.status(401).json({ message: 'User not found' });
    if (user.status === 'suspended' || user.status === 'rejected') {
      return res.status(403).json({ message: 'Account is not active' });
    }
    // Remove password from downstream handlers
    delete user.password;
    req.user = user;
    if (user.academyId) {
      const academy = await prisma.academy.findUnique({ where: { id: user.academyId } });
      if (!academy) return res.status(403).json({ message: 'Academy missing' });
      if (user.role !== 'platform_owner' && academy.status !== 'active') {
        return res.status(403).json({ message: 'Academy not active' });
      }
      req.academy = academy;
    }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}

export function requireActiveStudent(req, res, next) {
  if (req.user.role !== 'student') return next();
  if (req.user.status !== 'active') {
    return res.status(403).json({ message: 'Awaiting approval' });
  }
  next();
}
