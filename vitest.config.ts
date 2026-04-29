import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { playwright } from '@vitest/browser-playwright'

const rootDir = fileURLToPath(new URL('.', import.meta.url))

// Stub `@tanstack/react-start/server` because its static `import("#tanstack-start-...")`
// only resolves under the TanStack Start Vite plugin, which tests don't run.
const aliases = {
  '#': `${rootDir}src`,
  '@tanstack/react-start/server': `${rootDir}test/stubs/react-start-server.ts`,
}

// Browser project additionally needs `node:async_hooks` shimmed (pulled in by session-context).
const componentAliases = {
  ...aliases,
  'node:async_hooks': `${rootDir}test/stubs/async-hooks.ts`,
}

export default defineConfig({
  resolve: { alias: aliases },
  test: {
    projects: [
      {
        resolve: { alias: aliases },
        test: {
          name: 'unit',
          environment: 'node',
          include: ['test/unit/**/*.test.ts'],
          setupFiles: ['./test/setup-global.ts'],
        },
      },
      {
        resolve: { alias: componentAliases },
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
