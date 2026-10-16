import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // Several suites each load a PostgreSQL WASM instance; bound memory and CPU contention.
  test: { include: ['test/**/*.test.ts'], environment: 'node', maxWorkers: 4 },
});
