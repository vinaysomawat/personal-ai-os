// UI coding (category 'ui-coding') — no new rows. GreatFrontEnd's problems ordered by
// how many people completed each on greatfrontend.com/questions/user-interface
// (questionCompletionCount, Oct 2026), most first; the bottom 10% are deleted.
// The linkless Prep additions follow, in their earlier order.

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

export default []
