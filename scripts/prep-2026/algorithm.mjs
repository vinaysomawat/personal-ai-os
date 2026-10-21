// Algorithms (category 'algorithm') — no new rows. GreatFrontEnd's problems ordered by
// how many people completed each on greatfrontend.com/questions/algo
// (questionCompletionCount, Oct 2026), most first; the bottom 10% are deleted.

import { dropAndOrderPatch } from './order.mjs'

const ORDER = [
  // ---- GreatFrontEnd, by completions (83)
  "Stack", // 10305
  "Find Duplicates in Array", // 7033
  "Find Missing Number in Sequence", // 5920
  "Balanced Brackets", // 5288
  "Binary Search", // 4905
  "Insertion Sort", // 4582
  "Selection Sort", // 4573
  "Array Product Excluding Current", // 2854
  "Maximum Sum in Contiguous Array", // 2716
  "Pair sum", // 2706
  "Maximum Product in Contiguous Array", // 2624
  "Most Common Elements", // 2535
  "String Anagram", // 2381
  "Optimal Stock Trading", // 2348
  "Breadth-first Search", // 2222
  "Queue", // 2204
  "Depth-first Search", // 2013
  "Count Set Bits in a Binary Number", // 1808
  "Binary Tree Maximum Depth", // 1786
  "Flip Binary Tree", // 1706
  "String Palindrome", // 1686
  "Binary Tree Equal", // 1669
  "Find Element in Rotated Array", // 1626
  "End of Array Reachable", // 1523
  "Smallest element in rotated sorted array", // 1490
  "Meeting Calendar", // 1264
  "Bubble Sort", // 1246
  "Merge Sort", // 1213
  "Linked List Reversal", // 1138
  "Binary Search Tree Kth Smallest Element", // 1125
  "Staircase Climbing Combinations", // 1104
  "Linked List Detect Cycle", // 1010
  "Binary Tree Level Order Traversal", // 990
  "Validate Binary Search Tree", // 975
  "Quick Sort", // 974
  "Binary Tree Subtree", // 969
  "Binary Search Tree Lowest Common Ancestor", // 961
  "Bit Counting", // 883
  "Linked Lists Combine Two Sorted", // 867
  "Maximum Water Trapped Between Walls", // 759
  "Heap Sort", // 728
  "String Anagram Groups", // 719
  "Bit Reversal", // 691
  "Minimum Coins for Change", // 633
  "Merge Overlapping Intervals", // 616
  "Longest Non-repeating Substring", // 589
  "Count Islands in a Grid", // 566
  "Binary Tree Maximum Total Path", // 518
  "Combinations for Target Sum", // 511
  "Course Dependency", // 490
  "Delete Nth Node from End of Linked List", // 471
  "Binary Tree Rebuilding from Preorder and Inorder Traversals", // 464
  "Longest Consecutive Number Sequence", // 463
  "Neighborhood Theft", // 463
  "Merge New Interval", // 460
  "Is the Graph a Tree", // 457
  "Minimum Meeting Rooms Needed", // 439
  "Triplet Sum", // 434
  "Disjoint Intervals", // 428
  "Distinct Paths in Grid", // 409
  "Longest Common Subsequence", // 409
  "Find the Longest Palindromic Substring", // 391
  "Palindromic Substrings", // 384
  "Topological Sort", // 381
  "Longest Increasing Subsequence", // 374
  "Graph Clone", // 362
  "Find Word in Grid", // 358
  "Binary Tree Serialization and Deserialization", // 352
  "Rearrange Linked List", // 344
  "Graph Count Connected Components", // 342
  "Matrix Zeroing", // 303
  "Neighborhood Theft (Circular)", // 297
  "Longest Repeating Substring After Replacements", // 289
  "Decode Message", // 287
  "Segment Words", // 281
  "Matrix Rotation", // 261
  "Matrix Spiral Traversal", // 241
  "Trie (Prefix Tree)", // 238
  "Sum Without Addition", // 237
  "Linked Lists Combine K Sorted", // 233
  "Word Finder", // 225
  "Ocean Flow", // 190
  "Binary Search Tree", // 184
]

// Bottom 10% by completions (9).
const DROP = [
  "Find Words in Grid", // 178
  "Task Coordination", // 174
  "Number Stream Median", // 156
  "Extraterrestrial Language", // 154
  "Shortest Substring Containing Characters", // 141
  "Linked List", // 132
  "Binary Tree", // 131
  "Dijkstra's Algorithm", // 62
  "Heap", // 57
]

export const patch = dropAndOrderPatch('algorithm', DROP, ORDER)

export default []
