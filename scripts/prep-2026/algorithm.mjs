// Algorithms (category 'algorithm') — no new rows; sets sort_order on the 92
// GreatFrontEnd algo problems so the queue runs by frontend-interview
// importance instead of difficulty → alphabetical. Tiers: the Blind-75 core
// most asked in frontend loops → core mediums (intervals, DP, graphs, trie,
// bits) → the hards and textbook implementations (sorts, data structures).

import { orderPatch } from './order.mjs'

const ORDER = [
  // ---- Must-have (32)
  'Pair sum', 'Balanced Brackets', 'String Anagram', 'Find Duplicates in Array', 'Longest Non-repeating Substring',
  'Maximum Sum in Contiguous Array', 'Optimal Stock Trading', 'Array Product Excluding Current', 'Merge Overlapping Intervals',
  'Binary Search', 'Find Element in Rotated Array', 'Linked List Reversal', 'Linked List Detect Cycle', 'Linked Lists Combine Two Sorted',
  'Binary Tree Maximum Depth', 'Flip Binary Tree', 'Binary Tree Equal', 'Binary Tree Level Order Traversal', 'Validate Binary Search Tree',
  'Binary Search Tree Lowest Common Ancestor', 'Count Islands in a Grid', 'Breadth-first Search', 'Depth-first Search',
  'Staircase Climbing Combinations', 'Most Common Elements', 'String Anagram Groups', 'Triplet Sum', 'Maximum Water Trapped Between Walls',
  'Longest Consecutive Number Sequence', 'String Palindrome', 'Find Missing Number in Sequence', 'Matrix Spiral Traversal',
  // ---- Core mediums (41)
  'Binary Tree Subtree', 'Binary Search Tree Kth Smallest Element', 'Delete Nth Node from End of Linked List',
  'Smallest element in rotated sorted array', 'Merge New Interval', 'Minimum Meeting Rooms Needed', 'Meeting Calendar', 'Disjoint Intervals',
  'Matrix Rotation', 'Matrix Zeroing', 'Find the Longest Palindromic Substring', 'Palindromic Substrings',
  'Longest Repeating Substring After Replacements', 'Maximum Product in Contiguous Array', 'End of Array Reachable', 'Minimum Coins for Change',
  'Neighborhood Theft', 'Neighborhood Theft (Circular)', 'Distinct Paths in Grid', 'Decode Message', 'Segment Words',
  'Longest Increasing Subsequence', 'Longest Common Subsequence', 'Combinations for Target Sum', 'Find Word in Grid', 'Course Dependency',
  'Topological Sort', 'Graph Clone', 'Graph Count Connected Components', 'Is the Graph a Tree', 'Ocean Flow', 'Trie (Prefix Tree)',
  'Word Finder', 'Binary Tree Rebuilding from Preorder and Inorder Traversals', 'Rearrange Linked List', 'Task Coordination',
  "Dijkstra's Algorithm", 'Sum Without Addition', 'Count Set Bits in a Binary Number', 'Bit Counting', 'Bit Reversal',
  // ---- Hards, then textbook implementations (19)
  'Linked Lists Combine K Sorted', 'Number Stream Median', 'Shortest Substring Containing Characters',
  'Binary Tree Serialization and Deserialization', 'Binary Tree Maximum Total Path', 'Find Words in Grid', 'Extraterrestrial Language',
  'Merge Sort', 'Quick Sort', 'Heap', 'Heap Sort', 'Binary Search Tree', 'Binary Tree', 'Linked List', 'Stack', 'Queue',
  'Insertion Sort', 'Selection Sort', 'Bubble Sort',
]

export const patch = orderPatch('algorithm', ORDER)

export default []
