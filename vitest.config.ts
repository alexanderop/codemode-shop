import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { playwright } from '@vitest/browser-playwright'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  resolve: {
    alias: { '#': `${rootDir}src` },
  },
  test: {
    projects: [
      {
        resolve: { alias: { '#': `${rootDir}src` } },
        test: {
          name: 'unit',
          environment: 'node',
          include: ['test/unit/**/*.test.ts'],
          setupFiles: ['./test/setup-global.ts'],
        },
      },
      {
        resolve: { alias: { '#': `${rootDir}src` } },
        test: {
          name: 'component',
          include: ['test/component/**/*.test.{ts,tsx}'],
          setupFiles: ['./test/setup-global.ts'],
          browser: {
            enabled: true,
            provider: playwright(),
            headless: true,
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        '**/node_modules/**',
        '**/*.json',
        '**/*.test.{ts,tsx}',
        '**/*.config.{ts,js,mjs}',
        'test/**',
        'dist/**',
        '.claude/**',
        '.output/**',
        '.nitro/**',
        'coverage/**',
        'playwright-report/**',
        'test-results/**',
      ],
    },
  },
})
