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
          name: 'node',
          environment: 'node',
          include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
          exclude: ['src/**/*.dom.test.ts', 'src/**/*.dom.test.tsx', 'node_modules', 'dist'],
          setupFiles: ['./test/setup-global.ts'],
        },
      },
      {
        resolve: { alias: { '#': `${rootDir}src` } },
        test: {
          name: 'dom',
          include: ['src/**/*.dom.test.{ts,tsx}'],
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
  },
})
