export interface QuizQuestion {
  id: string
  question: string
  options: string[]
  correctIndex: number
  explanation: string
}

// Deterministic-first (Product Principle 2): a hand-authored, accuracy-
// checked pool of DSA/algorithms/JS fundamentals questions — the kind of
// thing a "quick warm-up before you practice" quiz should cover, not
// personalized to weak areas (that's Recommended for You's job). No AI
// involved: fixed CS/JS knowledge doesn't need generation, and a wrong
// AI-authored answer key would be far worse than a static one reviewed once.
export const TODAYS_QUIZ_BANK: QuizQuestion[] = [
  { id: 'binary-search', question: 'What is the time complexity of binary search on a sorted array of n elements?', options: ['O(log n)', 'O(n)', 'O(n log n)', 'O(1)'], correctIndex: 0, explanation: 'Binary search halves the search space on each comparison, giving logarithmic time.' },
  { id: 'hash-map-lookup', question: 'What is the average-case time complexity of a lookup in a hash map?', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n^2)'], correctIndex: 0, explanation: 'Hashing the key to a bucket gives constant-time average access; worst case degrades to O(n) under heavy collisions.' },
  { id: 'big-o-def', question: 'What does Big-O notation describe?', options: ['An upper bound on how runtime/space scales with input size', 'The exact runtime in seconds', 'The memory address layout of a program', 'A compiler optimization level'], correctIndex: 0, explanation: 'Big-O bounds worst-case growth rate, not a literal measurement.' },
  { id: 'preorder-traversal', question: 'Which binary tree traversal visits the root before its subtrees?', options: ['Pre-order', 'In-order', 'Post-order', 'Level-order'], correctIndex: 0, explanation: 'Pre-order visits root, then left subtree, then right subtree.' },
  { id: 'quicksort-worst-case', question: 'What is the worst-case time complexity of quicksort?', options: ['O(n^2)', 'O(n log n)', 'O(n)', 'O(log n)'], correctIndex: 0, explanation: 'A consistently poor pivot choice (e.g. already-sorted input with a naive pivot) degrades quicksort to quadratic time.' },
  { id: 'stack-lifo', question: 'Which data structure gives last-in-first-out (LIFO) access?', options: ['Stack', 'Queue', 'Hash map', 'Min-heap'], correctIndex: 0, explanation: 'A stack pushes and pops from the same end, so the most recently added item comes out first.' },
  { id: 'dp-purpose', question: 'What class of problem is dynamic programming best suited for?', options: ['Overlapping subproblems with optimal substructure', 'Sorting large datasets', 'Generating random numbers', 'Reducing network latency'], correctIndex: 0, explanation: 'DP caches solutions to overlapping subproblems to avoid recomputing them.' },
  { id: 'dijkstra', question: "Which algorithm finds shortest paths in a weighted graph with no negative edge weights?", options: ["Dijkstra's algorithm", 'Depth-first search', 'Bubble sort', 'Binary search'], correctIndex: 0, explanation: "Dijkstra's algorithm greedily expands the lowest-cost unvisited node." },
  { id: 'hash-collision', question: 'What is a hash collision?', options: ['Two different keys hashing to the same bucket', 'A stack overflow', 'A failed compilation', 'An out-of-bounds array access'], correctIndex: 0, explanation: 'Collisions are resolved via chaining or open addressing when distinct keys land in the same slot.' },
  { id: 'merge-sort-stable', question: 'Which sorting algorithm is stable and runs in O(n log n) in the worst case?', options: ['Merge sort', 'Quicksort', 'Selection sort', 'Bubble sort'], correctIndex: 0, explanation: 'Merge sort always splits and merges in O(n log n) and preserves the relative order of equal elements.' },
  { id: 'array-vs-linked-insert', question: 'Which structure gives O(1) insertion at the front without shifting elements?', options: ['Linked list', 'Array (unsorted)', 'Sorted array', 'Static array'], correctIndex: 0, explanation: 'A linked list just repoints the head pointer; an array needs to shift every existing element over.' },
  { id: 'bst-inorder', question: 'In-order traversal of a binary search tree visits nodes in what order?', options: ['Ascending sorted order', 'Descending sorted order', 'Insertion order', 'Random order'], correctIndex: 0, explanation: 'Left subtree, then root, then right subtree — which is exactly ascending order for a valid BST.' },
  { id: 'bfs-shortest-path', question: 'Which traversal finds the shortest path in an unweighted graph?', options: ['Breadth-first search', 'Depth-first search', 'Post-order traversal', 'Quicksort'], correctIndex: 0, explanation: 'BFS explores level by level, so the first time it reaches a node is via the fewest edges.' },
  { id: 'heap-peek', question: 'What is the time complexity of finding the minimum element in a min-heap?', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], correctIndex: 0, explanation: 'The minimum is always at the root, so peeking it is constant time (extracting it is O(log n)).' },
  { id: 'two-pointer', question: 'The "two pointer" technique is most useful for which kind of problem?', options: ['Finding pairs/subarrays in a sorted array or string', 'Traversing a graph', 'Hashing arbitrary objects', 'Balancing a binary tree'], correctIndex: 0, explanation: 'Moving two indices inward or in tandem avoids a nested loop when the input is sorted or has a monotonic property.' },
  { id: 'recursion-base-case', question: 'What happens if a recursive function has no base case?', options: ['It recurses until a stack overflow', 'It always returns undefined', 'JavaScript automatically memoizes it', 'It runs once and stops'], correctIndex: 0, explanation: 'Without a terminating condition, each call keeps pushing a new stack frame until the call stack is exhausted.' },
  { id: 'sliding-window', question: 'The "sliding window" technique is typically used to avoid what?', options: ['Recomputing an overlapping subarray/substring sum from scratch each time', 'Sorting an array', 'Hash collisions', 'Stack overflow'], correctIndex: 0, explanation: 'Expanding/shrinking a window incrementally reuses the previous computation instead of rescanning the whole range.' },
  { id: 'trie-use', question: 'A trie (prefix tree) is most commonly used for what?', options: ['Autocomplete / prefix matching over a set of strings', 'Finding the shortest path in a graph', 'Sorting numbers', 'Balancing load across servers'], correctIndex: 0, explanation: 'Each path from the root spells out a prefix, making shared-prefix lookups fast.' },
  { id: 'space-complexity-recursion', question: 'What contributes to the space complexity of a recursive function (beyond its explicit data structures)?', options: ['The call stack depth', 'The number of function arguments only', 'The size of the return value only', 'Nothing — recursion is always O(1) space'], correctIndex: 0, explanation: 'Each pending recursive call holds a stack frame until it returns, so deep recursion has real memory cost.' },
  { id: 'array-vs-set-lookup', question: 'Why is checking membership with a Set generally faster than with an Array?', options: ['Set lookup is O(1) average via hashing; Array.includes is O(n)', 'Sets are always smaller than arrays', 'Arrays cannot store unique values', 'Sets sort their contents automatically'], correctIndex: 0, explanation: 'A Set hashes its entries for near-constant-time lookup, while Array.includes has to scan linearly.' },
  { id: 'js-closure', question: 'What is a closure in JavaScript?', options: ["A function that retains access to its outer scope's variables after that scope has returned", 'A function with no parameters', 'A block of code inside curly braces', 'A method that closes a database connection'], correctIndex: 0, explanation: 'The inner function keeps a live reference to variables in the lexical scope it was defined in.' },
  { id: 'js-hoisting', question: 'What does "hoisting" mean in JavaScript?', options: ['Variable and function declarations are conceptually moved to the top of their scope before execution', 'JavaScript automatically optimizes loops', 'Variables are deleted after their block ends', 'Functions are always executed in reverse order'], correctIndex: 0, explanation: '`var` and function declarations are registered in scope before the code actually runs, though `let`/`const` stay in a "temporal dead zone" until their line executes.' },
  { id: 'js-event-loop', question: 'In the JS event loop, which runs first after the current synchronous code finishes: a pending microtask (e.g. a resolved Promise) or a pending macrotask (e.g. a setTimeout callback)?', options: ['The microtask', 'The macrotask', 'They always run in the order they were scheduled', 'It is undefined behavior'], correctIndex: 0, explanation: 'The microtask queue is fully drained before the event loop moves on to the next macrotask.' },
  { id: 'js-this-binding', question: 'In a regular (non-arrow) JavaScript function, what determines the value of `this`?', options: ['How the function is called (its call-site), not where it is defined', 'Where the function is defined in the source file', 'The function\'s name', 'The number of arguments passed'], correctIndex: 0, explanation: 'Regular functions get `this` from the call-site (e.g. `obj.method()` binds `this` to `obj`); arrow functions instead inherit `this` lexically from their enclosing scope.' },
  { id: 'js-prototype-chain', question: 'How does JavaScript resolve a property that is not found directly on an object?', options: ["It walks up the object's prototype chain until it finds the property or reaches null", 'It throws an error immediately', 'It returns 0 by default', 'It searches all global variables'], correctIndex: 0, explanation: 'Property lookup falls back through `Object.getPrototypeOf(obj)` repeatedly before giving up.' },
  { id: 'react-key-prop', question: 'Why does React need a stable `key` prop when rendering a list?', options: ['To efficiently identify which items changed, were added, or were removed between renders', 'To style list items differently', 'To sort the list automatically', 'It is only needed for accessibility'], correctIndex: 0, explanation: 'Keys let React\'s reconciler match elements across renders instead of re-creating the whole list.' },
  { id: 'react-usestate-batching', question: 'What happens if you call a state setter twice with the same computed value inside one React event handler?', options: ['React batches the updates into a single re-render', 'Each call triggers its own separate re-render', 'The second call is silently ignored', 'React throws a warning and stops'], correctIndex: 0, explanation: 'React batches state updates within the same synchronous event handler (and, since React 18, in most async contexts too) into one re-render.' },
  { id: 'array-sort-mutates', question: 'Does JavaScript\'s Array.prototype.sort() mutate the original array?', options: ['Yes, it sorts in place and also returns the same array', 'No, it always returns a new array', 'Only for arrays of numbers', 'Only if a compare function is provided'], correctIndex: 0, explanation: '`sort()` reorders the array in place; if you need the original preserved, copy it first (e.g. `[...arr].sort()`).' },
  { id: 'promise-all-vs-allsettled', question: 'How does Promise.allSettled differ from Promise.all?', options: ['allSettled waits for every promise and never rejects, returning each result\'s status; all() rejects as soon as any promise rejects', 'allSettled runs promises sequentially, all() runs them in parallel', 'There is no difference', 'allSettled only works with 2 promises'], correctIndex: 0, explanation: '`Promise.all` short-circuits on the first rejection; `allSettled` always resolves once every promise has settled, one way or another.' },
  { id: 'debounce-vs-throttle', question: 'What is the key difference between debouncing and throttling a function?', options: ['Debounce waits for a pause in calls before firing once; throttle fires at most once per fixed interval regardless of pauses', 'They are the same technique with different names', 'Debounce only works on click events; throttle only works on scroll events', 'Throttle always fires more often than debounce'], correctIndex: 0, explanation: 'Debounce collapses a burst into one trailing call; throttle guarantees a steady maximum call rate.' },
  { id: 'graph-cycle-detection', question: 'Which technique detects a cycle in a directed graph via DFS?', options: ['Tracking nodes currently on the recursion stack ("gray" nodes)', 'Counting total edges vs. nodes', 'Sorting nodes alphabetically', 'Running BFS twice'], correctIndex: 0, explanation: 'If DFS reaches a node that is still on the current recursion path (not just previously visited), that back edge means a cycle.' },
  { id: 'topological-sort', question: 'Topological sort is only defined for which kind of graph?', options: ['A directed acyclic graph (DAG)', 'Any undirected graph', 'A graph with negative weights', 'A complete graph'], correctIndex: 0, explanation: 'It orders nodes so every directed edge points forward — impossible if there is a cycle.' },
  { id: 'dp-memo-vs-tabulation', question: 'What is the difference between memoization and tabulation in dynamic programming?', options: ['Memoization is top-down recursion with caching; tabulation is bottom-up, filling a table iteratively', 'Memoization is always faster', 'Tabulation cannot handle 2D problems', 'They produce different final answers'], correctIndex: 0, explanation: 'Both avoid recomputation — memoization caches recursive calls, tabulation builds the answer iteratively from the base cases up.' },
  { id: 'lru-cache-structure', question: 'An LRU (least-recently-used) cache is typically implemented with which combination of structures?', options: ['A hash map plus a doubly linked list', 'A single sorted array', 'A binary search tree only', 'A stack only'], correctIndex: 0, explanation: 'The hash map gives O(1) lookup; the doubly linked list gives O(1) reordering to track recency.' },
  { id: 'array-vs-linkedlist-access', question: 'Why is random access (by index) O(1) for an array but O(n) for a singly linked list?', options: ["An array's elements sit at computable contiguous memory offsets; a linked list must be walked node by node from the head", 'Linked lists are always stored on disk', 'Arrays are never larger than 100 elements', 'Linked lists sort themselves automatically'], correctIndex: 0, explanation: 'Contiguous memory lets an array compute `base + index * size` directly; a linked list has no such shortcut.' },
  { id: 'binary-vs-linear-search-precondition', question: 'What precondition does binary search require that linear search does not?', options: ['The data must already be sorted', 'The data must be a linked list', 'The data must contain only integers', 'The data must fit in memory'], correctIndex: 0, explanation: "Binary search relies on being able to discard half the remaining range based on a comparison, which only works if the range is ordered." },
  { id: 'queue-fifo', question: 'Which data structure gives first-in-first-out (FIFO) access?', options: ['Queue', 'Stack', 'Heap', 'Trie'], correctIndex: 0, explanation: 'A queue removes from the front in the same order items were added at the back.' },
  { id: 'bit-manipulation-power-of-two', question: 'Which bitwise expression checks whether a positive integer n is a power of two?', options: ['(n & (n - 1)) === 0', '(n | (n - 1)) === 0', '(n ^ (n - 1)) === 0', '(n % 2) === 0'], correctIndex: 0, explanation: 'A power of two has exactly one set bit, so subtracting 1 flips every bit up to and including that one — ANDing with the original yields 0.' },
  { id: 'js-var-let-const-scope', question: 'What is the key scoping difference between `var` and `let`/`const` in JavaScript?', options: ['`var` is function-scoped; `let`/`const` are block-scoped', '`var` is block-scoped; `let`/`const` are function-scoped', 'There is no difference, only stylistic', '`var` cannot be reassigned'], correctIndex: 0, explanation: '`var` ignores block boundaries like `if`/`for` and attaches to the nearest function scope; `let`/`const` respect the enclosing `{}` block.' },
  { id: 'js-async-await', question: 'What does `await` do inside an `async` function?', options: ['Pauses execution of that function until the awaited Promise settles, without blocking the rest of the program', 'Blocks the entire JavaScript thread until the Promise resolves', 'Converts a synchronous function into a Promise automatically', 'Cancels the Promise if it takes too long'], correctIndex: 0, explanation: 'Under the hood it is syntactic sugar over `.then()` — the rest of the event loop keeps running while that one async function is suspended.' },
  { id: 'js-shallow-vs-deep-copy', question: 'What does `{ ...obj }` (object spread) produce?', options: ['A shallow copy — nested objects/arrays are still shared by reference', 'A full deep copy of every nested value', 'A frozen, immutable copy', 'A reference to the same object, not a copy at all'], correctIndex: 0, explanation: 'Spread copies top-level properties only; a nested object inside `obj` is still the same reference in the copy.' },
  { id: 'react-usememo-purpose', question: 'What is `useMemo` primarily used for in React?', options: ['Memoizing an expensive computed value so it is not recalculated on every render unless its dependencies change', 'Persisting state across page reloads', 'Fetching data from an API', 'Preventing a component from ever re-rendering'], correctIndex: 0, explanation: 'It caches the result of a computation between renders, recomputing only when a dependency in its array actually changes.' },
  { id: 'react-controlled-input', question: 'What makes a React `<input>` a "controlled" component?', options: ["Its value is driven by React state via `value` + `onChange`, not the DOM's own internal state", 'It uses a `ref` instead of state', 'It cannot be edited by the user', 'It is wrapped in a `<form>` tag'], correctIndex: 0, explanation: 'A controlled input\'s displayed value always comes from React state, with `onChange` updating that state on every keystroke.' },
  { id: 'space-vs-time-tradeoff', question: 'What does a classic "space-time tradeoff" in algorithm design usually involve?', options: ['Using extra memory (e.g. a cache or lookup table) to reduce computation time', 'Always minimizing both time and space simultaneously', 'Choosing a slower language to save memory', 'Running an algorithm twice to save space'], correctIndex: 0, explanation: 'Precomputing or caching results trades additional memory for faster lookups later, e.g. memoization.' },
  { id: 'graph-representation', question: 'What is the main advantage of an adjacency list over an adjacency matrix for a sparse graph?', options: ['It uses O(V + E) space instead of O(V^2), avoiding wasted space for edges that do not exist', 'It makes edge lookups faster in every case', 'It is required for weighted graphs', 'It cannot represent directed graphs'], correctIndex: 0, explanation: 'A sparse graph has far fewer edges than the V^2 possible pairs, so a matrix wastes most of its cells on non-edges.' },
  { id: 'insertion-sort-best-case', question: "What is insertion sort's best-case time complexity, and when does it occur?", options: ['O(n), when the input is already sorted', 'O(n^2), always, regardless of input', 'O(log n), when the input is reversed', 'O(1), always'], correctIndex: 0, explanation: 'On an already-sorted array, each element only needs one comparison against its predecessor to confirm its position.' },
  { id: 'js-null-vs-undefined', question: 'What is the conventional difference between `null` and `undefined` in JavaScript?', options: ['`undefined` means a variable was declared but never assigned a value; `null` is an explicit "no value" assigned intentionally', 'They are exactly interchangeable in every case', '`null` is a primitive but `undefined` is an object', '`undefined` can only appear in arrays'], correctIndex: 0, explanation: 'JS itself sets unassigned variables/missing properties to `undefined`; `null` is a value developers assign on purpose to mean "empty."' },
  { id: 'graph-dfs-vs-bfs-usecase', question: 'Which is generally preferred for exploring all paths deep into a maze/tree structure before backtracking?', options: ['Depth-first search', 'Breadth-first search', "Dijkstra's algorithm", 'Binary search'], correctIndex: 0, explanation: 'DFS commits to one path as far as possible before backtracking, which suits maze/path-enumeration problems; BFS is better for shortest-path-by-edge-count.' },
  { id: 'counting-sort-constraint', question: 'Counting sort achieves O(n + k) time, but only works well under what constraint?', options: ['The input values are integers within a known, reasonably small range k', 'The input must already be partially sorted', 'The array must contain no duplicates', 'The array must be a linked list'], correctIndex: 0, explanation: "It counts occurrences of each possible value, so a huge or non-integer value range makes it impractical." },
]

// Every question above is hand-authored with the correct option fixed at
// index 0, which would make the quiz trivially gameable. This deterministic
// hash+PRNG reshuffles a question's options (and remaps correctIndex to
// match) seeded by date+question id, so the same day always reshuffles the
// same way — preserving "same day = same quiz" for both a page reload and
// a Retake, while the correct answer's on-screen position varies by day.
function hashSeed(s: string): number {
  let h = 1779033703 ^ s.length
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffleQuestion(q: QuizQuestion, dateStr: string): QuizQuestion {
  const rand = mulberry32(hashSeed(`${dateStr}:${q.id}`))
  const order = q.options.map((_, i) => i)
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  return { ...q, options: order.map(i => q.options[i]), correctIndex: order.indexOf(q.correctIndex) }
}

// Deterministic pick of `count` questions for a given IST calendar date —
// pure function of the date string, so it needs no DB round-trip and a
// "Retake" naturally shows the same set within the same day. Rotates
// through the whole pool via a wrapping window keyed off days-since-epoch,
// so consecutive days don't repeat until the pool cycles (5 days for a
// 50-question pool at 10/day) — same "don't repeat until exhausted" spirit
// as Learning's daily reading pick, just index-based instead of DB-tracked
// since this pool is small enough to not need per-user "already shown" state.
export function getTodaysQuizQuestions(dateStr: string, count = 10, pool: QuizQuestion[] = TODAYS_QUIZ_BANK): QuizQuestion[] {
  if (pool.length === 0) return []
  const daysSinceEpoch = Math.floor(new Date(`${dateStr}T00:00:00Z`).getTime() / 86400000)
  const start = (daysSinceEpoch * count) % pool.length
  return Array.from({ length: Math.min(count, pool.length) }, (_, i) => shuffleQuestion(pool[(start + i) % pool.length], dateStr))
}

export function gradeTodaysQuiz(questionIds: string[], answers: Record<string, number>, dateStr: string, pool: QuizQuestion[] = TODAYS_QUIZ_BANK): number {
  const byId = new Map(pool.map(q => [q.id, q]))
  return questionIds.reduce((score, id) => {
    const q = byId.get(id)
    return q && answers[id] === shuffleQuestion(q, dateStr).correctIndex ? score + 1 : score
  }, 0)
}
