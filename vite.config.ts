import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  optimizeDeps: { exclude: ['isolated-vm', 'quickjs-emscripten'] },
  ssr: {
    external: [
      'isolated-vm',
      'esbuild',
      'quickjs-emscripten',
      'quickjs-emscripten-core',
      '@jitl/quickjs-wasmfile-release-asyncify',
      '@jitl/quickjs-wasmfile-release-sync',
      '@jitl/quickjs-wasmfile-debug-asyncify',
      '@jitl/quickjs-wasmfile-debug-sync',
    ],
  },
  plugins: [
    devtools(),
    nitro({ rollupConfig: { external: [/^@sentry\//, 'isolated-vm'] } }),
    tailwindcss(),
    tanstackStart({
      router: {
        entry: 'app/router',
        routesDirectory: 'app/routes',
        generatedRouteTree: 'app/routeTree.gen.ts',
      },
    }),
    viteReact(),
  ],
})

export default config
