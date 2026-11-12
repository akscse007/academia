import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { ensureBootstrap } from './bootstrap.js';
import User from '../models/User.js';
import Academy from '../models/Academy.js';
import Batch from '../models/Batch.js';
import Enrollment from '../models/Enrollment.js';
import { slugify } from './slug.js';

async function run() {
  await connectDB(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/student_saas');
  await ensureBootstrap();

  const email = 'teacher@brightfuture.test';
  let owner = await User.findOne({ email });
  let academy;
  if (!owner) {
    owner = await User.create({
      name: 'Ravi Sharma',
      email,
      password: 'Teacher@123',
      role: 'teacher',
      status: 'active',
      phone: '9876543210',
    });
    academy = await Academy.create({
      name: 'Bright Future Academy',
      slug: slugify('Bright Future Academy'),
      ownerUserId: owner._id,
      ownerName: owner.name,
      email: 'contact@brightfuture.test',
      contactNumber: '9876543210',
      address: '123 Education Street, Mumbai',
      description: 'A premium coaching centre for Grade 8-12 students.',
      welcomeMessage: 'Welcome to Bright Future! Shape your tomorrow today.',
      upiId: 'brightfuture@upi',
      theme: { primaryColor: '#2563eb', accentColor: '#1e40af', mode: 'light' },
      status: 'active',
    });
    owner.academyId = academy._id;
    await owner.save();
    console.log('Sample teacher + academy created');
  } else {
    academy = await Academy.findById(owner.academyId);
  }

  const batches = await Promise.all([
    Batch.findOneAndUpdate(
      { academyId: academy._id, name: 'Grade 10 - Mathematics' },
      {
        academyId: academy._id,
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
      { upsert: true, new: true }
    ),
    Batch.findOneAndUpdate(
      { academyId: academy._id, name: 'Grade 12 - Physics' },
      {
        academyId: academy._id,
        name: 'Grade 12 - Physics',
        subject: 'Physics',
        monthlyFee: 3500,
        admissionFee: 1500,
        capacity: 30,
      },
      { upsert: true, new: true }
    ),
  ]);

  const studentEmail = 'student@brightfuture.test';
  let student = await User.findOne({ email: studentEmail, academyId: academy._id });
  if (!student) {
    student = await User.create({
      name: 'Anika Verma',
      email: studentEmail,
      phone: '9123456780',
      password: 'Student@123',
      role: 'student',
      academyId: academy._id,
      status: 'active',
      profile: { academicInfo: 'Grade 10' },
    });
    await Enrollment.create({
      academyId: academy._id,
      studentId: student._id,
      batchId: batches[0]._id,
    });
    console.log('Sample student created and enrolled');
  }

  console.log('\nSample accounts ready:');
  console.log(`  Platform owner : ${process.env.PLATFORM_OWNER_EMAIL || 'owner@yourplatform.com'}`);
  console.log(`  Teacher        : ${email} / Teacher@123 (academy slug: ${academy.slug})`);
  console.log(`  Student        : ${studentEmail} / Student@123 (academy slug: ${academy.slug})`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
