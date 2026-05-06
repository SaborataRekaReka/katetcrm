import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/app/lib/__tests__/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage/unit',
      reporter: ['text-summary', 'json-summary', 'html', 'lcov'],
      include: [
        'src/app/lib/leadAdapter.ts',
        'src/app/lib/applicationAdapter.ts',
        'src/app/lib/reservationAdapter.ts',
        'src/app/lib/departureAdapter.ts',
        'src/app/lib/clientAdapter.ts',
        'src/app/lib/clientWorkspaceAdapter.ts',
      ],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
});
