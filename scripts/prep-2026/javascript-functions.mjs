// JS functions (category 'javascript-functions') — no new rows; sets
// sort_order on the 196 GreatFrontEnd problems by frontend-interview
// importance. Tiers: the classics nearly every loop asks (debounce, promise
// utilities, bind, deep clone, event emitter) → core utilities, DOM and the
// React hooks → the niche, very long or library-specific ones (multi-part
// sequels, ORMs, query builders, jQuery).

import { orderPatch } from './order.mjs'

const ORDER = [
  // ---- Must-have (40)
  'Debounce', 'Throttle', 'Promise.all', 'Function.prototype.bind', 'Deep Clone', 'Flatten', 'Event Emitter', 'Curry', 'Memoize',
  'Promise.allSettled', 'Promise.any', 'Promise.race', 'Array.prototype.map', 'Array.prototype.filter', 'Array.prototype.reduce',
  'Function.prototype.call', 'Function.prototype.apply', 'Deep Equal', 'Classnames', 'Once', 'Get', 'Sleep', 'Promisify',
  'Map Async Limit', 'JSON.stringify', 'getElementsByClassName', 'Event Delegation', 'Compose', 'Group By', 'Chunk', 'Unique Array',
  'Cancellable Timeout', 'Cancellable Interval', 'Debounce II', 'Rate Limiter', 'Promise Timeout', 'Deep Merge',
  'usePrevious', 'useDebounce', 'useClickOutside',

  // ---- Core utilities, DOM and React hooks (108)
  'Map Async', 'Promise.resolve', 'Promise.reject', 'Promise.withResolvers', 'Promise Merge', 'Promisify II', 'Curry II',
  'Make Counter', 'Make Counter II', 'Limit', 'Memoize II', 'Event Emitter II', 'Observable', 'Middlewares', 'Singleton',
  'Array.prototype.at', 'Array.prototype.concat', 'Array.prototype.square',
  'Deep Clone II', 'Deep Set', 'Deep Omit', 'Deep Map', 'Squash Object', 'Unsquash Object', 'Camel Case Keys', 'Is Empty', 'Object Map',
  'Data Merging', 'Intersection', 'Difference', 'Compact', 'Count By', 'From Pairs', 'Range', 'Find Index', 'Find Last Index',
  'Max By', 'Min By', 'Mean', 'Sum', 'Clamp', 'In Range', 'Size', 'Fill', 'Drop While', 'Drop Right While',
  'Function Length', 'Number of Arguments', 'Curry III', 'JSON.stringify II', 'Classnames II', 'Class Variance Authority',
  'Undo / Redo Manager', 'localStorage With Expiry', 'URLSearchParams', 'Template Engine', 'Schema Validator', 'JSON Patch',
  'List Format', 'Type Utilities', 'Type Utilities II', 'API Client', 'Resumable Interval', 'Map With History', 'Console Log History',
  'Test Runner', 'Assert Lite',
  'getElementsByTagName', 'getElementsByStyle', 'Identical DOM Trees', 'Corresponding Node Across Pages', 'HTML Serializer',
  'HTML Sanitizer', 'Focus Trap', 'Text Search', 'Table of Contents', 'Extract Anchor Elements', 'Lowest Hiding Element', 'Node Registry',
  'useInterval', 'useTimeout', 'useThrottle', 'useToggle', 'useBoolean', 'useCounter', 'useEffectOnce', 'useWindowSize',
  'useMediaQuery', 'useEventListener', 'useHover', 'useKeyPress', 'useFocus', 'useIdle', 'useBreakpoint', 'useClickAnywhere',
  'useCountdown', 'useQuery', 'useArray', 'useMap', 'useSet', 'useObject', 'useStep', 'useCycle', 'useDefault', 'useStateWithReset',
  'useInputControl', 'useMediatedState', 'useBoolean II', 'useCounter II',

  // ---- Niche, long or library-specific (48)
  'Compact II', 'Cycle', 'Conforms To', 'Intersection By', 'Intersection With', 'Union By', 'Range Right',
  'Object Update', 'Object Update II', 'Deep Set II', 'Data Selection', 'Reading Order', 'Reading Order II', 'Text Between Nodes',
  'Text Search II', 'getElementsByTagNameHierarchy', 'Styled Text Ranges', 'Styled Text Ranges II', 'Styled Text Ranges III',
  'Styled Text Ranges IV', 'Rich Text to HTML', 'Template Engine II', 'Schema Validator II', 'Schema Validator III', 'URLSearchParams II',
  'Undo / Redo Manager II', 'Undoable Database', 'Undoable Database II', 'Spreadsheet', 'Spreadsheet II', 'Spreadsheet III',
  'Superjson', 'Superjson II', 'Mini Object-relational Mapper', 'Mini Object-relational Mapper II', 'Mini Object-relational Mapper III',
  'Drizzle Query Builder', 'Drizzle Query Builder II', 'Drizzle Query Builder III', 'Test Runner II', 'Test Runner III', 'Test Runner IV',
  'Turtle', 'Backbone Model', 'jQuery Class Manipulation', 'jQuery.contains', 'jQuery.css',
]

export const patch = orderPatch('javascript-functions', ORDER)

export default []
