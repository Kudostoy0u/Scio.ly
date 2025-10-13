import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    css: false,
    globals: true,
    include: [
      'src/lib/utils/__tests__/team-auth-v2.test.ts',
      'src/app/api/teams/**/__tests__/**/*.test.ts',
      'src/lib/stores/__tests__/teamStore.test.ts',
      'src/app/teams/__tests__/**/*.test.{ts,tsx}',
      'src/app/teams/components/__tests__/**/*.test.{ts,tsx}'
    ],
    exclude: [
      'node_modules/',
      '**/*.d.ts',
      '**/*.config.{js,ts}',
      '**/mockData/**',
      '**/test-utils/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage/teams',
      exclude: [
        'node_modules/',
        'src/**/*.test.{ts,tsx}',
        'src/**/__tests__/**',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/mockData/**',
        '**/test-utils/**',
        'vitest.setup.ts'
      ],
      include: [
        'src/app/api/teams/**/*.ts',
        'src/app/teams/components/**/*.tsx',
        'src/lib/stores/teamStore.ts',
        'src/lib/utils/team-auth-v2.ts',
        'src/lib/services/cockroachdb-teams.ts'
      ],
      all: true
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000
  },
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'react'
  },
  resolve: {
    alias: {
      '@/': '/Users/kundanbaliga/Programs/Scio.ly/website/src/'
    }
  }
});
