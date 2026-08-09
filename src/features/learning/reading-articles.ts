// Curated, hand-verified frontend/tech reading pool (every URL fetched and
// confirmed live before being added, not AI-generated — same practice as
// suggested-resources.ts, avoids the real risk of an LLM inventing a
// plausible-but-fake link). Backs the Learning page's daily reading habit
// (see getLearningData()'s daily-read pick). Moved here from the old
// Coding-only "Daily Tech Read" (trending/system-design-articles.ts, now
// unused) and roughly 4x'd (7 → 31) across more categories — the old pool
// was small enough to visibly repeat within two weeks of daily use.
export interface ReadingArticle {
  title: string
  url: string
  source: string
  category: string
  // Rough estimate, used to prefer a same-day-completable pick (~30-60min)
  // for the daily read; longer pieces are still in the pool (real, useful
  // content) but naturally sort behind shorter ones so they don't get
  // picked as a one-sitting "today" read.
  estimatedMinutes: number
}

export const READING_ARTICLES: ReadingArticle[] = [
  // JS Deep Dive
  {
    title: 'Closures — MDN JavaScript Guide',
    url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures',
    source: 'developer.mozilla.org',
    category: 'JS Deep Dive',
    estimatedMinutes: 15,
  },
  {
    title: 'The event loop — MDN',
    url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop',
    source: 'developer.mozilla.org',
    category: 'JS Deep Dive',
    estimatedMinutes: 15,
  },
  {
    title: 'Using Promises — MDN',
    url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises',
    source: 'developer.mozilla.org',
    category: 'JS Deep Dive',
    estimatedMinutes: 20,
  },
  // React Fundamentals
  {
    title: 'Render and Commit — react.dev',
    url: 'https://react.dev/learn/render-and-commit',
    source: 'react.dev',
    category: 'React Fundamentals',
    estimatedMinutes: 15,
  },
  {
    title: 'Thinking in React — react.dev',
    url: 'https://react.dev/learn/thinking-in-react',
    source: 'react.dev',
    category: 'React Fundamentals',
    estimatedMinutes: 25,
  },
  {
    title: 'You Might Not Need an Effect — react.dev',
    url: 'https://react.dev/learn/you-might-not-need-an-effect',
    source: 'react.dev',
    category: 'React Fundamentals',
    estimatedMinutes: 30,
  },
  {
    title: 'A Complete Guide to useEffect — overreacted.io',
    url: 'https://overreacted.io/a-complete-guide-to-useeffect/',
    source: 'overreacted.io',
    category: 'React Fundamentals',
    estimatedMinutes: 45,
  },
  {
    title: 'Why React Re-Renders — Josh Comeau',
    url: 'https://www.joshwcomeau.com/react/why-react-re-renders/',
    source: 'joshwcomeau.com',
    category: 'React Fundamentals',
    estimatedMinutes: 30,
  },
  {
    title: 'Making Sense of React Server Components — Josh Comeau',
    url: 'https://www.joshwcomeau.com/react/server-components/',
    source: 'joshwcomeau.com',
    category: 'React Fundamentals',
    estimatedMinutes: 35,
  },
  // Advanced React / State Management
  {
    title: 'Application State Management with React — Kent C. Dodds',
    url: 'https://kentcdodds.com/blog/application-state-management-with-react',
    source: 'kentcdodds.com',
    category: 'State Management',
    estimatedMinutes: 20,
  },
  {
    title: 'Stop using isLoading booleans — Kent C. Dodds',
    url: 'https://kentcdodds.com/blog/stop-using-isloading-booleans',
    source: 'kentcdodds.com',
    category: 'State Management',
    estimatedMinutes: 15,
  },
  {
    title: 'Patterns.dev',
    url: 'https://www.patterns.dev/',
    source: 'patterns.dev',
    category: 'Advanced React',
    estimatedMinutes: 30,
  },
  // System Design
  {
    title: 'Micro Frontends — Martin Fowler (Cam Jackson)',
    url: 'https://martinfowler.com/articles/micro-frontends.html',
    source: 'martinfowler.com',
    category: 'System Design',
    estimatedMinutes: 25,
  },
  {
    title: 'Monolith First — Martin Fowler',
    url: 'https://martinfowler.com/bliki/MonolithFirst.html',
    source: 'martinfowler.com',
    category: 'System Design',
    estimatedMinutes: 15,
  },
  {
    title: 'Atomic Design — Brad Frost',
    url: 'https://bradfrost.com/blog/post/atomic-web-design/',
    source: 'bradfrost.com',
    category: 'System Design',
    estimatedMinutes: 20,
  },
  {
    title: 'monorepo.tools',
    url: 'https://monorepo.tools/',
    source: 'monorepo.tools',
    category: 'System Design',
    estimatedMinutes: 15,
  },
  {
    title: 'Micro-Frontends: a Sociotechnical Journey — InfoQ',
    url: 'https://www.infoq.com/articles/adopt-micro-frontends/',
    source: 'infoq.com',
    category: 'Micro-Frontends',
    estimatedMinutes: 30,
  },
  {
    title: 'Monorepos are changing how teams build software — Vercel',
    url: 'https://vercel.com/blog/monorepos',
    source: 'vercel.com',
    category: 'Monorepo',
    estimatedMinutes: 15,
  },
  {
    title: 'How to choose the best rendering strategy for your app — Vercel',
    url: 'https://vercel.com/blog/how-to-choose-the-best-rendering-strategy-for-your-app',
    source: 'vercel.com',
    category: 'Rendering',
    estimatedMinutes: 20,
  },
  {
    title: 'Front End System Design Playbook: All-in-one Deep Dive — GreatFrontEnd',
    url: 'https://www.greatfrontend.com/front-end-system-design-playbook',
    source: 'greatfrontend.com',
    category: 'System Design',
    estimatedMinutes: 120,
  },
  // Performance
  {
    title: 'Critical Rendering Path — web.dev',
    url: 'https://web.dev/articles/critical-rendering-path',
    source: 'web.dev',
    category: 'Performance',
    estimatedMinutes: 15,
  },
  {
    title: 'Rendering on the Web — web.dev',
    url: 'https://web.dev/articles/rendering-on-the-web',
    source: 'web.dev',
    category: 'Performance',
    estimatedMinutes: 20,
  },
  {
    title: 'Rendering performance — web.dev',
    url: 'https://web.dev/articles/rendering-performance',
    source: 'web.dev',
    category: 'Performance',
    estimatedMinutes: 20,
  },
  {
    title: 'Prevent unnecessary network requests with the HTTP Cache — web.dev',
    url: 'https://web.dev/articles/http-cache',
    source: 'web.dev',
    category: 'Performance',
    estimatedMinutes: 20,
  },
  {
    title: 'Web Vitals — web.dev',
    url: 'https://web.dev/articles/vitals',
    source: 'web.dev',
    category: 'Performance',
    estimatedMinutes: 15,
  },
  {
    title: 'Interaction to Next Paint (INP) — web.dev',
    url: 'https://web.dev/articles/inp',
    source: 'web.dev',
    category: 'Performance',
    estimatedMinutes: 15,
  },
  // API Design
  {
    title: 'API contracts and everything I wish I knew — Evil Martians',
    url: 'https://evilmartians.com/chronicles/api-contracts-and-everything-i-wish-i-knew-a-frontend-survival-guide',
    source: 'evilmartians.com',
    category: 'API Design',
    estimatedMinutes: 30,
  },
  // CSS
  {
    title: 'The Rules of Margin Collapse — Josh Comeau',
    url: 'https://www.joshwcomeau.com/css/rules-of-margin-collapse/',
    source: 'joshwcomeau.com',
    category: 'CSS',
    estimatedMinutes: 25,
  },
  // Testing
  {
    title: 'Write tests. Not too many. Mostly integration. — Kent C. Dodds',
    url: 'https://kentcdodds.com/blog/write-tests',
    source: 'kentcdodds.com',
    category: 'Testing',
    estimatedMinutes: 10,
  },
  // Accessibility
  {
    title: 'Understanding the Web Content Accessibility Guidelines (WCAG) — MDN',
    url: 'https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Understanding_WCAG',
    source: 'developer.mozilla.org',
    category: 'Accessibility',
    estimatedMinutes: 15,
  },
  // State Management (Advanced React)
  {
    title: 'Scalable Frontend #3 — The State Layer',
    url: 'https://blog.codeminer42.com/scalable-frontend-3-the-state-layer-b23ed69ca57c/',
    source: 'blog.codeminer42.com',
    category: 'State Management',
    estimatedMinutes: 20,
  },
]
