import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

// Stub module for the server-only Next.js guard package (not installed standalone).
const serverOnlyStub = resolve(import.meta.dirname, 'tests/__server-only-stub.ts');

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      // `server-only` is a Next.js build-time guard; not installed as a standalone
      // package and unnecessary in vitest. Stub it to an empty module.
      'server-only': serverOnlyStub,
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    // Mỗi test file được cấp 1 MongoMemoryServer riêng (setup.ts) — chạy tuần tự
    // để tránh nhiều instance mongod cùng khởi động song song trên CI runner nhỏ.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
