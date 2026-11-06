// Where to learn more about a question's topic — deterministic, client-safe, no
// AI. Links are per topic, not per question. Tags with nothing to read about
// (Must-have, Shiprocket, Fit, Layoff...) are left out on purpose, so they show
// no links. Check a link loads before adding it; video ids were checked against
// YouTube's oEmbed titles.

export interface TopicLink { label: string; href: string }

const link = (label: string, href: string): TopicLink => ({ label, href })
const video = (id: string, label = 'YouTube'): TopicLink => link(label, `https://www.youtube.com/watch?v=${id}`)
const search = (query: string): TopicLink => link('YouTube search', `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`)

const MDN = 'https://developer.mozilla.org/en-US/docs'
const ANGULAR = 'https://angular.dev'
const CLAUDE = 'https://platform.claude.com/docs/en'
const FOWLER = 'https://martinfowler.com/articles'

const JS = [link('MDN guide', `${MDN}/Web/JavaScript/Guide`), link('javascript.info', 'https://javascript.info/'), video('PkZNo7MFNFg')]
const ASYNC = [link('MDN promises', `${MDN}/Web/JavaScript/Guide/Using_promises`), link('javascript.info', 'https://javascript.info/async'), video('8aGhZQkoFbQ', 'Event loop talk')]
const ARRAYS = [link('MDN Array', `${MDN}/Web/JavaScript/Reference/Global_Objects/Array`), link('javascript.info', 'https://javascript.info/array-methods'), search('javascript array methods explained')]
const DOM = [link('MDN DOM', `${MDN}/Web/API/Document_Object_Model`), link('javascript.info', 'https://javascript.info/document'), video('cCOL7MC4Pl0', 'Browser event loop talk')]
const REACT = [link('React docs', 'https://react.dev/learn'), link('Patterns.dev', 'https://www.patterns.dev/'), video('bMknfKXIFA8')]
const REACT_STATE = [link('React: managing state', 'https://react.dev/learn/managing-state'), link('Redux essentials', 'https://redux.js.org/tutorials/essentials/part-1-overview-concepts'), link('TanStack Query', 'https://tanstack.com/query/latest/docs/framework/react/overview'), search('react state management patterns')]
const HOOKS = [link('React hooks', 'https://react.dev/reference/react/hooks'), search('react hooks explained')]
const FORMS = [link('React forms', 'https://react.dev/reference/react-dom/components/form'), link('Angular forms', `${ANGULAR}/guide/forms`), search('react forms best practices')]
const CSS = [link('MDN CSS', `${MDN}/Web/CSS`), link('web.dev Learn CSS', 'https://web.dev/learn/css'), link('Flexbox guide', 'https://css-tricks.com/snippets/css/a-guide-to-flexbox/'), video('OXGznpKZ_sA')]
const A11Y = [link('web.dev Learn Accessibility', 'https://web.dev/learn/accessibility'), link('WAI-ARIA patterns', 'https://www.w3.org/WAI/ARIA/apg/'), search('web accessibility for developers')]
const PERF = [link('web.dev Learn Performance', 'https://web.dev/learn/performance'), link('Web Vitals', 'https://web.dev/articles/vitals'), search('frontend performance optimization core web vitals')]
const NETWORK = [link('MDN HTTP', `${MDN}/Web/HTTP/Guides/Overview`), link('Browser Networking book', 'https://hpbn.co/'), search('how http and browsers work')]
const TS = [link('TS handbook', 'https://www.typescriptlang.org/docs/handbook/intro.html'), link('React + TS cheatsheet', 'https://react-typescript-cheatsheet.netlify.app/'), video('30LWjhZzg50')]
const NEXT = [link('Next.js docs', 'https://nextjs.org/docs'), link('Server and client components', 'https://nextjs.org/docs/app/getting-started/server-and-client-components'), search('next.js app router rendering explained')]
const TESTING = [link('Testing Library', 'https://testing-library.com/docs/react-testing-library/intro/'), link('Playwright', 'https://playwright.dev/docs/intro'), link('Kent C. Dodds', 'https://kentcdodds.com/blog/write-tests'), search('react testing strategy')]
const SYSTEM_DESIGN = [link('Front-end playbook', 'https://www.greatfrontend.com/front-end-system-design-playbook'), link('System Design Primer', 'https://github.com/donnemartin/system-design-primer'), video('i7twT3x5yv8')]
const ALGORITHMS = [link('NeetCode roadmap', 'https://neetcode.io/roadmap'), link('Big-O cheat sheet', 'https://www.bigocheatsheet.com/'), search('neetcode algorithms explained')]
const DATA_STRUCTURES = [link('VisuAlgo', 'https://visualgo.net/en'), link('NeetCode roadmap', 'https://neetcode.io/roadmap'), search('data structures explained javascript')]
const UI_COMPONENTS = [link('ARIA component patterns', 'https://www.w3.org/WAI/ARIA/apg/patterns/'), link('Patterns.dev', 'https://www.patterns.dev/'), search('react machine coding interview component')]
const SECURITY = [link('OWASP Top 10', 'https://owasp.org/projects/top-ten'), link('OWASP cheat sheets', 'https://cheatsheetseries.owasp.org/'), link('MDN web security', `${MDN}/Web/Security`), search('web security for frontend developers')]
const BUILD = [link('Webpack concepts', 'https://webpack.js.org/concepts/'), link('Vite guide', 'https://vite.dev/guide/'), search('how javascript bundlers work')]
const MFE = [link('Micro Frontends', 'https://micro-frontends.org/'), link('Martin Fowler', `${FOWLER}/micro-frontends.html`), link('Module Federation', 'https://module-federation.io/'), video('w58aZjACETQ')]
const MONOREPO = [link('monorepo.tools', 'https://monorepo.tools/'), link('Turborepo', 'https://turborepo.dev/docs'), search('monorepo explained turborepo nx')]
const CICD = [link('GitHub Actions', 'https://docs.github.com/en/actions'), link('Martin Fowler on CI', `${FOWLER}/continuousIntegration.html`), video('R8_veQiYBjI')]
const DELIVERY = [link('Feature toggles', `${FOWLER}/feature-toggles.html`), link('DORA', 'https://dora.dev/'), search('canary deployment feature flags explained')]
const DESIGN_SYSTEM = [link('Storybook', 'https://storybook.js.org/docs'), link('Design Systems', 'https://www.designsystems.com/'), search('building a design system frontend')]
const ARCHITECTURE = [link('Martin Fowler', 'https://martinfowler.com/architecture/'), link('Patterns.dev', 'https://www.patterns.dev/'), search('frontend architecture at scale')]
const TECH_LEAD = [link('StaffEng guides', 'https://staffeng.com/guides/'), link('ADRs', 'https://adr.github.io/'), search('tech lead responsibilities software engineering')]
const CODE_REVIEW = [link('Google review guide', 'https://google.github.io/eng-practices/review/'), search('how to do code review senior engineer')]
const ANGULAR_CORE = [link('Angular docs', `${ANGULAR}/overview`), video('3qBXWUpoPHo')]
const ANGULAR_PERF = [link('Angular performance', `${ANGULAR}/best-practices/runtime-performance`), search('angular change detection onpush explained')]
const LLM = [link('Claude docs', `${CLAUDE}/get-started`), link('Prompt engineering', `${CLAUDE}/build-with-claude/prompt-engineering/overview`), video('zjkBMFhNj_g', 'Karpathy intro')]
const EMBEDDINGS = [link('Embeddings guide', `${CLAUDE}/build-with-claude/embeddings`), link('Contextual retrieval', 'https://www.anthropic.com/research/contextual-retrieval'), search('embeddings and chunking explained')]
const VECTORS = [link('What is a vector DB', 'https://www.pinecone.io/learn/vector-database/'), link('pgvector', 'https://github.com/pgvector/pgvector'), search('vector databases explained')]
const RAG = [link('RAG explained', 'https://www.pinecone.io/learn/retrieval-augmented-generation/'), link('Contextual retrieval', 'https://www.anthropic.com/research/contextual-retrieval'), video('T-D1OfcDW1M')]
const AGENTS = [link('Building effective agents', 'https://www.anthropic.com/research/building-effective-agents'), link('LangGraph', 'https://langchain-ai.github.io/langgraph/'), video('ZaPbP9DwBOE')]
const MCP = [link('MCP docs', 'https://modelcontextprotocol.io/'), link('A2A protocol', 'https://a2a-protocol.org/'), search('model context protocol explained')]
const EVALS = [link('Hamel Husain on evals', 'https://hamel.dev/blog/posts/evals/'), link('OWASP LLM Top 10', 'https://genai.owasp.org/llm-top-10/'), search('llm evals in production')]
const AI_UX = [link('AI SDK', 'https://ai-sdk.dev/docs/introduction'), search('building ai chat ui streaming react')]
const AI_FRAMEWORKS = [link('Hugging Face Transformers', 'https://huggingface.co/docs/transformers/index'), link('LangGraph', 'https://langchain-ai.github.io/langgraph/'), video('wjZofJX0v4M', 'Transformers explained')]
const AI_TOOLS = [link('Claude Code docs', 'https://code.claude.com/docs/en/overview'), link('Prompt engineering', `${CLAUDE}/build-with-claude/prompt-engineering/overview`), search('ai coding assistant workflow for senior engineers')]
const AI_SECURITY = [link('OWASP LLM Top 10', 'https://genai.owasp.org/llm-top-10/'), search('prompt injection explained')]
const AI_ADOPTION = [link('DORA', 'https://dora.dev/'), link('Claude Code docs', 'https://code.claude.com/docs/en/overview'), search('rolling out ai coding tools engineering team')]
const API = [link('REST guide', 'https://restfulapi.net/'), link('Stripe API (a model to copy)', 'https://docs.stripe.com/api'), link('GraphQL', 'https://graphql.org/learn/'), video('GZvSYJDk-us')]
const NODE = [link('Node.js docs', 'https://nodejs.org/learn'), link('Node event loop', 'https://nodejs.org/learn/asynchronous-work/event-loop-timers-and-nexttick'), video('Oe421EPjeBE')]
const AUTH = [link('OWASP auth', 'https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html'), link('OAuth 2.0', 'https://oauth.net/2/'), search('oauth oidc jwt explained')]
const SQL = [link('SQLBolt (exercises)', 'https://sqlbolt.com/'), link('Use The Index, Luke', 'https://use-the-index-luke.com/'), link('Postgres tutorial', 'https://www.postgresql.org/docs/current/tutorial.html'), video('HXV3zeQKqGY')]
const RLS = [link('Supabase RLS', 'https://supabase.com/docs/guides/database/postgres/row-level-security'), search('supabase row level security explained')]
const FASTAPI = [link('FastAPI tutorial', 'https://fastapi.tiangolo.com/tutorial/'), search('fastapi full course')]
const PY_ASYNC = [link('Python asyncio', 'https://docs.python.org/3/library/asyncio.html'), search('python asyncio explained')]
const LOCKS = [link('Postgres locking', 'https://www.postgresql.org/docs/current/explicit-locking.html'), search('database deadlocks and locking explained')]
const CACHING = [link('MDN HTTP caching', `${MDN}/Web/HTTP/Guides/Caching`), link('web.dev HTTP cache', 'https://web.dev/articles/http-cache'), search('caching strategies system design')]
const NEXT_CACHING = [link('Next.js caching', 'https://nextjs.org/docs/app/guides/caching-without-cache-components'), ...CACHING.slice(0, 1), search('next.js caching explained')]
const SOLID = [link('SOLID overview', 'https://en.wikipedia.org/wiki/SOLID'), search('solid principles python')]
const AWS = [link('AWS getting started', 'https://aws.amazon.com/getting-started/'), link('Well-Architected', 'https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html'), search('aws for developers ecs lambda s3 explained')]
const CONTAINERS = [link('Docker docs', 'https://docs.docker.com/get-started/'), link('Kubernetes overview', 'https://kubernetes.io/docs/concepts/overview/'), video('3c-iBn73dDE', 'Docker course'), video('X48VuDVv0do', 'Kubernetes course')]
const MICROSERVICES = [link('microservices.io', 'https://microservices.io/'), link('Martin Fowler', `${FOWLER}/microservices.html`), link('Kafka intro', 'https://kafka.apache.org/intro'), video('lTAcCNbJ7KE')]
const REALTIME = [link('MDN WebSockets', `${MDN}/Web/API/WebSockets_API`), search('websockets vs server sent events')]
const I18N = [link('MDN Intl', `${MDN}/Web/JavaScript/Reference/Global_Objects/Intl`), search('internationalization in react')]

const TOPIC_LINKS: Record<string, TopicLink[]> = {
  // JavaScript and the browser
  'JavaScript Fundamentals': JS, JavaScript: JS, 'Async & Promises': ASYNC, 'Array & Object Methods': ARRAYS, 'DOM & Browser APIs': DOM,
  // React, Next.js, TypeScript, CSS
  React: REACT, 'React & State Management': REACT_STATE, 'State Management': REACT_STATE, State: REACT_STATE, Hooks: HOOKS, Forms: FORMS,
  'Next.js': NEXT, SSR: NEXT, 'Next.js rendering': NEXT, TypeScript: TS, 'CSS & Layout': CSS, CSS, 'UI Components': UI_COMPONENTS, Routing: REACT,
  // Quality
  Accessibility: A11Y, Performance: PERF, 'Performance architecture': PERF, Testing: TESTING, Security: SECURITY, Privacy: SECURITY, i18n: I18N, 'Networking & APIs': NETWORK,
  // Design and architecture
  'System Design': SYSTEM_DESIGN, 'Full-stack': SYSTEM_DESIGN, 'Real-time': REALTIME, 'Architecture strategy': ARCHITECTURE, Architecture: ARCHITECTURE,
  'Micro-frontends': MFE, 'Build & bundling': BUILD, Webpack: BUILD, 'Monorepo & tooling': MONOREPO, Monorepo: MONOREPO,
  'CI/CD & GitHub Actions': CICD, 'CI/CD': CICD, 'Platform & delivery': DELIVERY, Platform: DELIVERY, 'Design system platform': DESIGN_SYSTEM, 'Design systems': DESIGN_SYSTEM,
  'Tech lead': TECH_LEAD, Leadership: TECH_LEAD, 'Code review': CODE_REVIEW,
  // Algorithms
  Algorithms: ALGORITHMS, Sorting: ALGORITHMS, Geometry: ALGORITHMS, 'Data Structures': DATA_STRUCTURES,
  // Angular
  Angular: ANGULAR_CORE, Signals: [link('Angular signals', `${ANGULAR}/guide/signals`), search('angular signals explained')], RxJS: [link('RxJS guide', 'https://rxjs.dev/guide/overview'), search('rxjs explained')],
  'Components & DI': [link('Angular DI', `${ANGULAR}/guide/di`), search('angular dependency injection explained')], 'Change detection': ANGULAR_PERF,
  'State (NgRx)': [link('NgRx docs', 'https://ngrx.io/docs'), search('ngrx explained')], Templates: [link('Angular templates', `${ANGULAR}/guide/templates`), search('angular templates explained')],
  'Routing & forms': [link('Angular routing', `${ANGULAR}/guide/routing`), link('Angular forms', `${ANGULAR}/guide/forms`), search('angular routing and reactive forms')],
  Migration: [link('Angular update guide', `${ANGULAR}/update`), search('frontend framework migration strategy')],
  // AI engineering
  Foundations: LLM, 'LLM fundamentals': LLM, 'Embeddings & chunking': EMBEDDINGS, 'Vector databases': VECTORS, 'RAG & retrieval': RAG, 'Agentic RAG': AGENTS,
  'Agents & workflows': AGENTS, 'Human-in-the-loop': AGENTS, 'MCP & A2A': MCP, 'Evals & production': EVALS, 'AI product UX': AI_UX, Frameworks: AI_FRAMEWORKS, AI: LLM,
  // AI-native
  'AI + coding': AI_TOOLS, 'AI + architecture': AI_TOOLS, 'AI + debugging': AI_TOOLS, 'AI + testing': AI_TOOLS, 'AI + productivity': AI_TOOLS, 'AI + code review': AI_TOOLS,
  'AI workflow': AI_TOOLS, 'AI judgment': AI_TOOLS, 'Prompting & context': AI_TOOLS, 'AI agents & tooling': AGENTS, 'Building AI features': AI_UX,
  'AI security & privacy': AI_SECURITY, 'Leading AI adoption': AI_ADOPTION,
  // Backend
  'API design': API, API, 'Node / Next.js server': NODE, 'Node.js': NODE, 'Auth & security': AUTH, Auth: AUTH, Data: SQL, Database: SQL, 'SQL in practice': SQL,
  'Caching & performance': CACHING, 'Caching in deployment': NEXT_CACHING, 'AI backend': AI_UX, 'Row Level Security': RLS, FastAPI: FASTAPI, 'Python asyncio': PY_ASYNC,
  'Concurrency & deadlocks': LOCKS, 'SOLID & design': SOLID, 'AWS & cloud': AWS, 'Docker & Kubernetes': CONTAINERS, 'Microservices & messaging': MICROSERVICES,
}

// Categories whose questions may carry no topics with links.
const CATEGORY_LINKS: Record<string, { topic: string; links: TopicLink[] }> = {
  'javascript-functions': { topic: 'JavaScript', links: JS },
  'ui-coding': { topic: 'UI coding', links: UI_COMPONENTS },
  'ai-native': { topic: 'AI-assisted work', links: AI_TOOLS },
  angular: { topic: 'Angular', links: ANGULAR_CORE },
}

const MAX_TOPICS = 3

// The bar's rows for a question: up to 3 of its topics with links, one row per
// distinct set of links; a category's links when none of its topics have any.
export function linksFor(q: { topics: string[]; category: string }): { topic: string; links: TopicLink[] }[] {
  const rows: { topic: string; links: TopicLink[] }[] = []
  for (const topic of q.topics) {
    const links = TOPIC_LINKS[topic]
    if (!links || rows.some(r => r.links === links)) continue
    rows.push({ topic, links })
    if (rows.length === MAX_TOPICS) break
  }
  if (rows.length) return rows
  const fallback = CATEGORY_LINKS[q.category]
  return fallback ? [fallback] : []
}
