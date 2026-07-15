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
}

export default nextConfig
