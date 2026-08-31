import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
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
