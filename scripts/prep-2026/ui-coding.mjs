// UI coding (category 'ui-coding'). GreatFrontEnd's problems ordered by
// how many people completed each on greatfrontend.com/questions/user-interface
// (questionCompletionCount, Oct 2026), most first; the bottom 10% are deleted.
// The linkless Prep additions follow, in their earlier order, then problems seen in
// Oct 2026 frontend interview reports (the only new rows, exported below).

import { dropAndOrderPatch } from './order.mjs'

const ORDER = [
  // ---- GreatFrontEnd, by completions (53)
  "Counter", // 47963
  "Contact Form", // 26058
  "Holy Grail", // 20410
  "Todo List", // 18649
  "Accordion", // 13936
  "Tabs", // 13324
  "Job Board", // 7661
  "Star Rating", // 7411
  "Progress Bars", // 7410
  "Traffic Light", // 5609
  "Progress Bar", // 5132
  "Data Table", // 5003
  "Mortgage Calculator", // 4941
  "Like Button", // 4468
  "Temperature Converter", // 4269
  "File Explorer", // 3973
  "Flight Booker", // 3858
  "Image Carousel", // 3649
  "Digital Clock", // 3555
  "Modal Dialog", // 3293
  "Tic-tac-toe", // 3273
  "Generate Table", // 3244
  "Stopwatch", // 2984
  "Transfer List", // 2670
  "Tweet", // 2653
  "Dice Roller", // 1928
  "Grid Lights", // 1835
  "Signup Form", // 1682
  "Accordion II", // 1625
  "Data Table II", // 1407
  "Tabs II", // 1323
  "Progress Bars II", // 1259
  "Undoable Counter", // 1224
  "Analog Clock", // 1142
  "Nested Checkboxes", // 1008
  "Accordion III", // 954
  "Progress Bars III", // 885
  "Tabs III", // 829
  "Users Database", // 673
  "Image Carousel II", // 608
  "Modal Dialog II", // 605
  "File Explorer II", // 590
  "Memory Game", // 575
  "Modal Dialog III", // 562
  "File Explorer III", // 534
  "Auth Code Input", // 499
  "Whack-A-Mole", // 489
  "Progress Bars IV", // 481
  "Tic-tac-toe II", // 479
  "Data Table III", // 415
  "Transfer List II", // 413
  "Birth Year Histogram", // 366
  "Connect Four", // 350

  // ---- Prep additions (20)
  "Autocomplete / Typeahead",
  "Infinite scroll list",
  "Virtualized list (10,000 rows)",
  "Dropdown menu (accessible)",
  "Pagination component",
  "Toast notifications",
  "Tooltip",
  "Multi-step form wizard",
  "useDebounce and useThrottle hooks",
  "useFetch hook with cancellation and caching",
  "Kanban board",
  "Drag-and-drop sortable list",
  "Tree view with expand/collapse and selection",
  "Multi-select with chips",
  "Date picker",
  "Comment box with @mentions",
  "Image gallery with lightbox",
  "File uploader with progress",
  "Resizable split pane",
  "Dark mode toggle without flash",

  // ---- From Oct 2026 interview reports (3)
  "Live orders table (search, virtualization, websocket updates)",
  "Spreadsheet grid with formulas",
  "2048 game",
]

// Bottom 10% by completions (6).
const DROP = [
  "Pixel Art", // 320
  "Wordle", // 278
  "Image Carousel III", // 267
  "Data Table IV", // 259
  "Modal Dialog IV", // 256
  "Selectable Cells", // 165
]

export const patch = dropAndOrderPatch('ui-coding', DROP, ORDER)

const T = ['UI Components', 'Performance']

export default [
  {
    title: 'Live orders table (search, virtualization, websocket updates)', difficulty: 'hard', topics: T,
    answer_hints: 'normalize rows into a Map by id so a websocket patch is O(1); batch incoming messages per animation frame instead of a setState per message; debounced search over a derived filtered list (useMemo); virtualize with a fixed row height + overscan; keep scroll position and selection stable when rows above change; reconnect with backoff and resync from a snapshot + sequence number; flash a changed cell without re-rendering the whole table',
  },
  {
    title: 'Spreadsheet grid with formulas', difficulty: 'hard', topics: ['UI Components', 'State Management'],
    answer_hints: 'store raw input per cell id (A1) and compute values separately; parse =A1+B2 / =SUM(A1:A3) into tokens; build a dependency graph and recompute only dependents in topological order; detect cycles and show #REF / #CYCLE; edit mode vs display mode, Enter/Tab/arrow navigation; virtualize big grids; keep a cell memoized so typing in one cell does not re-render the grid',
  },
  {
    title: '2048 game', difficulty: 'medium', topics: ['UI Components', 'State Management'],
    answer_hints: 'board as a 4x4 array, one pure slide-and-merge function for a single row, reuse it for all four directions by rotating/reversing; a tile merges at most once per move; spawn a 2 (90%) or 4 in a random empty cell only if the board changed; win at 2048, lose when no empty cell and no neighbouring equal tiles; arrow keys + swipe, score, undo as a stack of past boards',
  },
]
