import type { KnipConfig } from 'knip'

// TODO: revisit ignores once Module 2 (AI testing) lands tests that consume
// many of the currently "unused" library bits. The goal of this gate is to
// land the lint/format/types/knip/test pipeline, not to clean the codebase.

const config: KnipConfig = {
  entry: ['src/router.tsx', 'src/routes/**/*.{ts,tsx}'],
  project: ['src/**/*.{ts,tsx}'],
  ignore: [
    'src/routeTree.gen.ts',
    // shadcn on-deck primitives — kept for the next wave of UI work
    'src/components/ui/**',
  ],
  // Many catalog tool / activity-store exports are used only within their own
  // file (e.g. catalogTools[] aggregates each tool, ui-store self-uses types).
  // This suppresses the false-positive "unused export" noise without removing
  // the named exports.
  ignoreExportsUsedInFile: true,
  ignoreDependencies: [
    // Bundled into Vite plugin, knip doesn't trace plugin internals
    '@tanstack/router-plugin',
    // Tailwind v4 plugin loads via @tailwindcss/vite, not direct import
    '@tailwindcss/typography',
    // Used implicitly by tooling
    'tailwindcss',
    // CSS-imported animations
    'tw-animate-css',
    // Auto-loaded by TanStack Start SSR
    '@tanstack/react-router-ssr-query',
    // Type-only standard schema spec
    '@standard-schema/spec',
    // Reserved for Module 2 (AI testing) — will be consumed once test files
    // exist in src/**/*.test.tsx. Remove from this list at that time.
    '@testing-library/dom',
    '@testing-library/react',
  ],
}

export default config
