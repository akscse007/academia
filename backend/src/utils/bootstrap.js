import prisma from '../lib/prisma.js';
import { hashPassword } from './password.js';
import { slugify } from './slug.js';

export async function ensureBootstrap() {
  const email = (process.env.PLATFORM_OWNER_EMAIL || 'owner@yourplatform.com').toLowerCase();
  const existing = await prisma.user.findFirst({ where: { email, role: 'platform_owner' } });
  if (!existing) {
    await prisma.user.create({
      data: {
        name: process.env.PLATFORM_OWNER_NAME || 'Platform Owner',
        email,
        password: await hashPassword(process.env.PLATFORM_OWNER_PASSWORD || 'Owner@12345'),
        role: 'platform_owner',
        status: 'active',
      },
    });
    console.log(`Platform owner created: ${email}`);
  }

  const anyDev = await prisma.developer.findFirst();
  if (!anyDev) {
    await prisma.developer.create({
      data: {
        name: 'Your Name',
        intro: 'Software developer building modern SaaS products.',
        about:
          'Hi! I build full-stack web applications with a focus on education technology. ' +
          'This platform is designed to help teachers run their coaching centres with ease.',
        skills: ['React', 'Node.js', 'PostgreSQL', 'Prisma', 'Express', 'Tailwind CSS'],
        projects: [],
        email: 'developer@example.com',
      },
    });
    console.log('Developer profile seeded');
  }

  if (process.env.AUTO_SEED === 'true') {
    await seedSample();
  }
}

export async function seedSample() {
  const teacherEmail = 'teacher@brightfuture.test';
  const existingTeacher = await prisma.user.findFirst({ where: { email: teacherEmail } });
  if (existingTeacher) return;

  const owner = await prisma.user.create({
    data: {
      name: 'Ravi Sharma',
      email: teacherEmail,
      password: await hashPassword('Teacher@123'),
      role: 'teacher',
      status: 'active',
      phone: '9876543210',
    },
  });
  const slug = slugify('Bright Future Academy');
  const academy = await prisma.academy.create({
    data: {
      name: 'Bright Future Academy',
      slug,
      ownerUserId: owner.id,
      ownerName: owner.name,
      email: 'contact@brightfuture.test',
      contactNumber: '9876543210',
      address: '123 Education Street, Mumbai',
      description: 'A premium coaching centre for Grade 8-12 students.',
      welcomeMessage: 'Welcome to Bright Future! Shape your tomorrow today.',
      upiId: 'brightfuture@upi',
      primaryColor: '#2563eb',
      accentColor: '#1e40af',
      themeMode: 'light',
      status: 'active',
    },
  });
  await prisma.user.update({ where: { id: owner.id }, data: { academyId: academy.id } });

  const batch1 = await prisma.batch.create({
    data: {
      academyId: academy.id,
      name: 'Grade 10 - Mathematics',
      subject: 'Mathematics',
      description: 'Full syllabus with weekly tests',
      monthlyFee: 2500,
      admissionFee: 1000,
      capacity: 40,
      schedule: [
        { day: 'mon', from: '17:00', to: '18:30' },
        { day: 'wed', from: '17:00', to: '18:30' },
        { day: 'fri', from: '17:00', to: '18:30' },
      ],
    },
  });
  await prisma.batch.create({
    data: {
      academyId: academy.id,
      name: 'Grade 12 - Physics',
      subject: 'Physics',
      monthlyFee: 3500,
      admissionFee: 1500,
      capacity: 30,
    },
  });

  const student = await prisma.user.create({
    data: {
      name: 'Anika Verma',
      email: 'student@brightfuture.test',
      phone: '9123456780',
      password: await hashPassword('Student@123'),
      role: 'student',
      academyId: academy.id,
      status: 'active',
      academicInfo: 'Grade 10',
    },
  });
  await prisma.enrollment.create({
    data: {
      academyId: academy.id,
      studentId: student.id,
      batchId: batch1.id,
    },
  });
  console.log(`Sample academy seeded (slug: ${slug})`);
}
