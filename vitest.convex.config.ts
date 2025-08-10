// vitest.convex.config.ts
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'edge-runtime', // Convexはサーバーサイド実行のためnode環境を使用
    setupFiles: ['./vitest.convex.setup.ts'],
    include: [
      'convex/**/*.{test,spec}.{js,ts,mts,cts}',
      'app/api/**/*.{test,spec}.{js,ts}'
    ],
    exclude: [
      'node_modules/',
      '.next/',
      'convex/_generated/',
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/coverage/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'convex/_generated/**',
        '**/*.d.ts',
        '**/*.config.*'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
      '@/convex': resolve(__dirname, './convex'),
    },
  },
})