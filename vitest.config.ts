import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    css: false,
    globals: true,
    include: ['src/**/*.test.{ts,tsx}']
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


