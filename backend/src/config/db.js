import mongoose from 'mongoose';

export async function connectDB(uri) {
  mongoose.set('strictQuery', true);
  if (process.env.USE_MEMORY_DB === 'true') {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const mem = await MongoMemoryServer.create({ instance: { dbName: 'student_saas' } });
    const memUri = mem.getUri();
    await mongoose.connect(memUri, { serverSelectionTimeoutMS: 15000 });
    console.log(`MongoDB (in-memory) connected at ${memUri}`);
    return;
  }
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  console.log('MongoDB connected');
}
