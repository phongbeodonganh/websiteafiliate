// Chạy trước khi bất kỳ test file nào import code app — đặt biến env ở đây (không
// phải trong beforeAll) vì import tĩnh của test file được đánh giá ngay khi module
// này chạy xong, còn beforeAll thì chạy muộn hơn nhiều (sau khi mọi import tĩnh đã
// xong), lúc đó auth.ts/mongodb.ts đã đọc xong env cũ (undefined) mất rồi.
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'vitest-only-test-secret-never-used-outside-tests';

import { afterAll, afterEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

const mongod = await MongoMemoryServer.create({
  // MongoDB 8.2.6 hangs before emitting any startup output on the Windows test
  // environment. Pin the test binary to the known-working 7.0 release instead
  // of inheriting mongodb-memory-server's moving default.
  binary: { version: '7.0.24' },
  instance: { launchTimeout: 30_000 },
});
process.env.MONGODB_URI = mongod.getUri();

afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});
