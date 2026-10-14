// UI coding (category 'ui-coding') — no new rows; sets sort_order on the 79
// machine-coding problems (GreatFrontEnd + Prep additions) by how often the
// component comes up in machine-coding rounds. Tiers: the staples (typeahead,
// todo, tabs, modal, carousel, data table, infinite scroll, virtualized list)
// → the second wave (pickers, games, forms, widgets) → the III/IV sequels.

import { orderPatch } from './order.mjs'

const ORDER = [
  // ---- Must-have (29)
  'Autocomplete / Typeahead', 'Todo List', 'Tabs', 'Accordion', 'Modal Dialog', 'Star Rating', 'Image Carousel', 'Data Table',
  'Progress Bars', 'Infinite scroll list', 'Nested Checkboxes', 'Tic-tac-toe', 'Virtualized list (10,000 rows)',
  'Dropdown menu (accessible)', 'File Explorer', 'Pagination component', 'Toast notifications', 'Tooltip', 'Multi-step form wizard',
  'useDebounce and useThrottle hooks', 'useFetch hook with cancellation and caching', 'Like Button', 'Stopwatch', 'Traffic Light',
  'Kanban board', 'Drag-and-drop sortable list', 'Transfer List', 'Job Board', 'Grid Lights',

  // ---- Second wave (38)
  'Tabs II', 'Accordion II', 'Modal Dialog II', 'Data Table II', 'Image Carousel II', 'Progress Bars II', 'File Explorer II',
  'Tree view with expand/collapse and selection', 'Multi-select with chips', 'Date picker', 'Comment box with @mentions',
  'Image gallery with lightbox', 'File uploader with progress', 'Resizable split pane', 'Dark mode toggle without flash',
  'Auth Code Input', 'Selectable Cells', 'Memory Game', 'Wordle', 'Connect Four', 'Whack-A-Mole', 'Users Database', 'Signup Form',
  'Contact Form', 'Flight Booker', 'Mortgage Calculator', 'Temperature Converter', 'Undoable Counter', 'Digital Clock', 'Analog Clock',
  'Dice Roller', 'Progress Bar', 'Counter', 'Holy Grail', 'Generate Table', 'Tweet', 'Birth Year Histogram', 'Pixel Art',

  // ---- III / IV sequels (12)
  'Accordion III', 'Tabs III', 'Modal Dialog III', 'Modal Dialog IV', 'Data Table III', 'Data Table IV', 'Image Carousel III',
  'Progress Bars III', 'Progress Bars IV', 'File Explorer III', 'Tic-tac-toe II', 'Transfer List II',
]

export const patch = orderPatch('ui-coding', ORDER)

export default []
