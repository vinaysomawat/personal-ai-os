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
  // swisseph-wasm is exact-pinned (no `^`) in package.json, deliberately —
  // both quirks documented below were discovered the hard way in production,
  // and a routine `npm update` picking up a patch/minor release could
  // silently reintroduce either. Bump it manually, and re-verify both
  // workarounds still apply, rather than letting semver auto-update it.
  //
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

// Known issue, confirmed 2026-08-20, not yet fixed: swisseph.wasm +
// swisseph.data (~2.75MB) leak into api/telegram/[module]/route.js's bundle
// (verified via .next/server/app/api/telegram/[module]/route.js.nft.json),
// not just /astrology's — because handler.ts statically imports all 7
// Telegram modules (including ./modules/astrology, which chains to
// ephemeris.ts) into one shared MODULES dispatch object for a single
// catch-all webhook route. Every Telegram message across all 7 bots pays
// this cold-start weight, not just Astrology's. Converting to dynamic
// per-module imports would NOT fix it — Vercel's file tracer resolves a
// literal-string dynamic import() identically to a static one. Excluding
// swisseph-wasm from this route's trace via outputFileTracingExcludes also
// isn't safe as-is — the Astrology Telegram bot genuinely needs it
// reachable at runtime through this same route. An actual fix needs
// Astrology's Telegram webhook split into its own serverless function,
// separate from the other 6 modules — a real routing restructure, not a
// config tweak, so it's deliberately left as a documented known issue
// rather than attempted as a quick fix.

export default nextConfig
