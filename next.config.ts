import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Next.js's client Router Cache serves a page from cache for up to 30s
  // after a visit by default, even after a Server Action calls
  // revalidatePath() for that route from elsewhere in the app — e.g.
  // logging a study session on /learning didn't make /dashboard's Today's
  // Progress reflect it on the very next navigation. Disabling this for
  // dynamic routes trades a little navigation-speed for always-fresh data,
  // which matters more in a single-user personal-ops tool than in a
  // multi-user app optimizing for repeat-visit speed.
  experimental: {
    staleTimes: {
      dynamic: 0,
    },
  },
  // swisseph-wasm loads its .wasm/.data files at runtime via a filesystem
  // path computed from import.meta.url, not a static import/require — so
  // Vercel's serverless file-tracer can't discover them on its own and would
  // silently omit them from the deployed function bundle. Force-include them
  // explicitly rather than finding out via a broken production chart calc.
  outputFileTracingIncludes: {
    '/astrology': ['./node_modules/swisseph-wasm/wasm/**'],
  },
  // swisseph-wasm's Emscripten glue code does `const { createRequire } =
  // await import('node:module')` to get a `require()` for reading its .data
  // file on Node — webpack's bundling of that dynamic node: import breaks
  // createRequire into a non-function ("createRequire is not a function"),
  // confirmed by reproducing the error locally. Keeping the package external
  // means Next loads it via Node's native module system at runtime instead
  // of bundling it, which is exactly the wasm-loading behavior it expects.
  serverExternalPackages: ['swisseph-wasm'],
}

export default nextConfig
