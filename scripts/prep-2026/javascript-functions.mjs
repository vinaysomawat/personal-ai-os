// JS functions (category 'javascript-functions') — no new rows. GreatFrontEnd's problems ordered by
// how many people completed each on greatfrontend.com/questions/javascript
// (questionCompletionCount, Oct 2026), most first; the bottom 10% are deleted.

import { dropAndOrderPatch } from './order.mjs'

const ORDER = [
  // ---- GreatFrontEnd, by completions (176)
  "Debounce", // 22207
  "Make Counter", // 20845
  "Flatten", // 18996
  "Mean", // 17787
  "Array.prototype.reduce", // 13075
  "Promise.all", // 12429
  "Throttle", // 11608
  "Classnames", // 11035
  "Array.prototype.filter", // 10931
  "Type Utilities", // 10598
  "useBoolean", // 9129
  "Clamp", // 8941
  "Function Length", // 8654
  "Function.prototype.call", // 8627
  "Deep Clone", // 8317
  "Curry", // 8041
  "Array.prototype.square", // 8004
  "useCounter", // 7625
  "Number of Arguments", // 7493
  "Sleep", // 7362
  "Type Utilities II", // 7308
  "Min By", // 6801
  "Cancellable Interval", // 6493
  "Get", // 6305
  "Cycle", // 6258
  "Array.prototype.map", // 6225
  "Cancellable Timeout", // 5958
  "Chunk", // 5713
  "Compact", // 5635
  "Event Emitter", // 5608
  "List Format", // 5543
  "Deep Equal", // 5423
  "Promise.any", // 5287
  "Function.prototype.bind", // 5011
  "Difference", // 4982
  "Data Merging", // 4916
  "Unique Array", // 4804
  "jQuery.css", // 4423
  "Memoize", // 4418
  "Promisify", // 4116
  "Drop Right While", // 3940
  "Promise.reject", // 3937
  "Count By", // 3883
  "useCounter II", // 3819
  "Promise.race", // 3764
  "getElementsByTagName", // 3761
  "useCycle", // 3716
  "Drop While", // 3622
  "Debounce II", // 3561
  "useQuery", // 3539
  "Find Index", // 3530
  "getElementsByClassName", // 3517
  "From Pairs", // 3489
  "Function.prototype.apply", // 3479
  "Fill", // 3221
  "Once", // 3219
  "Map Async Limit", // 3206
  "useArray", // 3049
  "Squash Object", // 2957
  "JSON.stringify", // 2948
  "Sum", // 2943
  "Array.prototype.concat", // 2933
  "getElementsByStyle", // 2882
  "Find Last Index", // 2836
  "In Range", // 2820
  "useClickAnywhere", // 2800
  "Make Counter II", // 2786
  "Map Async", // 2748
  "Array.prototype.at", // 2721
  "Promise.allSettled", // 2674
  "useDebounce", // 2503
  "Promise.resolve", // 2402
  "Deep Omit", // 2279
  "Object Map", // 2270
  "Intersection", // 2192
  "useDefault", // 2101
  "Promise Timeout", // 2059
  "HTML Serializer", // 2040
  "Curry II", // 1985
  "Data Selection", // 1969
  "Promise Merge", // 1916
  "Compose", // 1856
  "Group By", // 1811
  "Limit", // 1696
  "Camel Case Keys", // 1691
  "Event Emitter II", // 1641
  "useTimeout", // 1563
  "Text Search", // 1552
  "Identical DOM Trees", // 1529
  "Max By", // 1482
  "Size", // 1466
  "Singleton", // 1456
  "Is Empty", // 1381
  "useBoolean II", // 1353
  "useStateWithReset", // 1242
  "useEffectOnce", // 1237
  "jQuery Class Manipulation", // 1180
  "Promise.withResolvers", // 1166
  "useWindowSize", // 1160
  "Memoize II", // 1109
  "useSet", // 1109
  "Range", // 1080
  "Intersection By", // 951
  "Promisify II", // 935
  "useToggle", // 933
  "useFocus", // 891
  "usePrevious", // 856
  "useInputControl", // 842
  "Intersection With", // 794
  "Range Right", // 788
  "Middlewares", // 783
  "Resumable Interval", // 777
  "Turtle", // 756
  "useMap", // 721
  "useClickOutside", // 708
  "Classnames II", // 703
  "useCountdown", // 694
  "Compact II", // 654
  "Union By", // 614
  "useEventListener", // 606
  "Table of Contents", // 596
  "useThrottle", // 596
  "Deep Map", // 592
  "Text Search II", // 556
  "useMediaQuery", // 544
  "useBreakpoint", // 532
  "Conforms To", // 512
  "useInterval", // 506
  "Backbone Model", // 503
  "Deep Merge", // 476
  "Curry III", // 471
  "useHover", // 463
  "useMediatedState", // 448
  "Deep Clone II", // 433
  "useKeyPress", // 404
  "useStep", // 339
  "useIdle", // 337
  "useObject", // 294
  "JSON.stringify II", // 287
  "getElementsByTagNameHierarchy", // 277
  "Undo / Redo Manager", // 159
  "Reading Order", // 157
  "Rate Limiter", // 116
  "Unsquash Object", // 110
  "Map With History", // 91
  "Spreadsheet", // 90
  "localStorage With Expiry", // 87
  "API Client", // 68
  "Undo / Redo Manager II", // 57
  "Styled Text Ranges", // 53
  "Class Variance Authority", // 52
  "Lowest Hiding Element", // 52
  "Undoable Database", // 50
  "Console Log History", // 48
  "Test Runner", // 48
  "Deep Set", // 45
  "Object Update", // 44
  "Reading Order II", // 44
  "jQuery.contains", // 43
  "Mini Object-relational Mapper", // 43
  "JSON Patch", // 40
  "Node Registry", // 34
  "URLSearchParams", // 34
  "Corresponding Node Across Pages", // 33
  "Template Engine", // 32
  "Spreadsheet II", // 31
  "Styled Text Ranges II", // 29
  "Schema Validator", // 27
  "Extract Anchor Elements", // 25
  "Spreadsheet III", // 24
  "Superjson", // 24
  "Undoable Database II", // 24
  "Test Runner II", // 23
  "HTML Sanitizer", // 20
  "Text Between Nodes", // 20
  "Event Delegation", // 19
]

// Bottom 10% by completions (20).
const DROP = [
  "Mini Object-relational Mapper II", // 19
  "Styled Text Ranges III", // 19
  "Assert Lite", // 18
  "Observable", // 18
  "Styled Text Ranges IV", // 16
  "Test Runner III", // 12
  "Drizzle Query Builder", // 10
  "Object Update II", // 10
  "Schema Validator II", // 10
  "Superjson II", // 10
  "Test Runner IV", // 10
  "URLSearchParams II", // 10
  "Deep Set II", // 9
  "Rich Text to HTML", // 8
  "Schema Validator III", // 8
  "Drizzle Query Builder II", // 7
  "Mini Object-relational Mapper III", // 7
  "Drizzle Query Builder III", // 6
  "Focus Trap", // 4
  "Template Engine II", // 4
]

export const patch = dropAndOrderPatch('javascript-functions', DROP, ORDER)

export default []
