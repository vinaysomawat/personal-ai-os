// Theory (category 'quiz') — no new rows. GreatFrontEnd's quiz questions
// ordered by how many people completed each on greatfrontend.com/questions/quiz
// (questionCompletionCount, Oct 2026), most first; the bottom 20% are deleted.
// The linkless Prep additions (TypeScript, React 19, a11y, security) follow.

import { dropAndOrderPatch } from './order.mjs'

const ORDER = [
  // ---- GreatFrontEnd, by completions (226)
  "What's the difference between a JavaScript variable that is: `null`, `undefined` or undeclared?", // 7329
  "What is the difference between `==` and `===` in JavaScript?", // 7132
  "Describe the difference between `<script>`, `<script async>` and `<script defer>`", // 6945
  "What are the differences between JavaScript variables created using `let`, `var` or `const`?", // 6768
  "What's the difference between `block`, `inline`, and `inline-block`?", // 6396
  "Describe the difference between a cookie, `sessionStorage` and `localStorage` in browsers", // 6287
  "Explain the concept of \"hoisting\" in JavaScript", // 5910
  "Explain your understanding of the box model and how you would tell the browser in CSS to render your layout in different box models.", // 5653
  "What does `* { box-sizing: border-box; }` do?", // 5603
  "What's the difference between `.call` and `.apply` in JavaScript?", // 5410
  "Explain event delegation in JavaScript", // 5328
  "Describe event bubbling in JavaScript and browsers", // 5056
  "What is the CSS `display` property and can you give a few examples of its use?", // 4873
  "What is the event loop in JavaScript runtimes?", // 4629
  "What is a closure in JavaScript, and how/why would you use one?", // 4554
  "What's the difference between a `relative`, `fixed`, `absolute`, `sticky` and `static`-ally positioned element?", // 4503
  "Explain how `this` works in JavaScript", // 4368
  "What are the pros and cons of using Promises instead of callbacks in JavaScript?", // 4129
  "Explain how prototypal inheritance works in JavaScript", // 3995
  "What is CSS selector specificity and how does it work?", // 3899
  "Explain `Function.prototype.bind` in JavaScript", // 3505
  "What is the difference between state and props in React?", // 3469
  "Explain how a browser determines what elements match a CSS selector.", // 3356
  "Is there any reason you'd want to use `translate()` instead of `absolute` positioning, or vice-versa? And why?", // 3158
  "Why is it generally a good idea to position CSS `<link>`s between `<head></head>` and JS `<script>`s just before `</body>`?", // 3136
  "Explain the difference between synchronous and asynchronous functions in JavaScript", // 3064
  "What's a typical use case for anonymous functions in JavaScript?", // 2827
  "Have you played around with the new CSS Flexbox or Grid specs?", // 2707
  "Difference between: `function Person(){}`, `const person = Person()`, and `const person = new Person()` in JavaScript?", // 2652
  "What is React? Describe the benefits of React", // 2558
  "Describe event capturing in JavaScript and browsers", // 2473
  "What is the purpose of the `key` prop in React?", // 2261
  "Explain the differences on the usage of `foo` between `function foo() {}` and `var foo = function() {}` in JavaScript", // 2239
  "What is the difference between a `Map` object and a plain object in JavaScript?", // 2204
  "Describe `z-index` and how stacking context is formed.", // 2110
  "What advantage is there for using the JavaScript arrow syntax for a method in a constructor?", // 2099
  "What kind of things must you be wary of when designing or developing for multilingual sites?", // 2084
  "What is the difference between React Node, React Element, and a React Component?", // 2057
  "Can you offer a use case for the new arrow => function syntax?", // 2056
  "What is the definition of a higher-order function in JavaScript?", // 2015
  "What are the various data types in JavaScript?", // 1998
  "What is the difference between `mouseenter` and `mouseover` event in JavaScript and browsers?", // 1983
  "What is JSX and how does it work?", // 1945
  "Explain the differences between CommonJS modules and ES modules in JavaScript", // 1888
  "What is the consequence of using array indices as the value for `key`s in React?", // 1803
  "What are the various ways to create objects in JavaScript?", // 1799
  "What are the benefits of using hooks in React?", // 1773
  "What are the rules of React hooks?", // 1731
  "Describe Block Formatting Context (BFC) and how it works.", // 1668
  "Are you familiar with styling SVG?", // 1666
  "Explain the concept of a callback function in asynchronous operations", // 1662
  "What are the differences between JavaScript ES2015 classes and ES5 function constructors?", // 1652
  "What is the difference between controlled and uncontrolled React Components?", // 1568
  "Explain AJAX in as much detail as possible", // 1561
  "What are some pitfalls about using context in React?", // 1533
  "What's the difference between an \"attribute\" and a \"property\" in the DOM?", // 1477
  "Explain what a single page app is and how to make one SEO-friendly", // 1472
  "Explain the concept of a microtask queue", // 1459
  "What are `data-` attributes good for?", // 1450
  "Describe pseudo-elements and discuss what they are used for.", // 1418
  "Explain the concept of caching and how it can be used to improve performance", // 1391
  "What is `'use strict';` (strict mode) in JavaScript for?", // 1384
  "Describe `float`s and how they work.", // 1372
  "Explain the difference between mutable and immutable objects in JavaScript", // 1359
  "What does the dependency array of `useEffect` affect?", // 1349
  "What is the difference between `useEffect` and `useLayoutEffect` in React?", // 1323
  "What is the `useRef` hook in React and when should it be used?", // 1312
  "What does re-rendering mean in React?", // 1298
  "What is virtual DOM in React?", // 1294
  "Explain the concept of debouncing and throttling", // 1275
  "What language constructs do you use for iterating over object properties and array items in JavaScript?", // 1273
  "Why you would use a `srcset` attribute in an image tag?", // 1266
  "What is the `useCallback` hook in React and when should it be used?", // 1259
  "How do you serve a page with content in multiple languages?", // 1252
  "What is progressive rendering?", // 1252
  "Have you ever used a grid system, and if so, what do you prefer?", // 1251
  "What are React Fragments used for?", // 1237
  "What is the `useMemo` hook in React and when should it be used?", // 1231
  "What are the different ways to visually hide content (and make it available only for screen readers)?", // 1216
  "Explain CSS sprites, and how you would implement them on a page or site.", // 1208
  "What is reconciliation in React?", // 1199
  "Difference between document `load` event and document `DOMContentLoaded` event?", // 1168
  "What are the advantages/disadvantages of using CSS preprocessors?", // 1168
  "Explain the concept of destructuring assignment for objects and arrays", // 1161
  "How do you handle asynchronous data loading in React applications?", // 1156
  "How does virtual DOM in React work? What are its benefits and downsides?", // 1155
  "Explain the concept of hoisting with regards to functions", // 1147
  "How is responsive design different from adaptive design?", // 1140
  "What is the purpose of callback function argument format of `setState()` in React and when should it be used?", // 1139
  "How do you reset a component's state in React?", // 1131
  "Explain the concept of code coverage and how it can be used to assess test quality", // 1128
  "Why is it, in general, a good idea to leave the global JavaScript scope of a website as-is and never touch it?", // 1127
  "What's the difference between \"resetting\" and \"normalizing\" CSS?", // 1111
  "What is the `useReducer` hook in React and when should it be used?", // 1097
  "What are proxies in JavaScript used for?", // 1083
  "How would one optimize the performance of React contexts to reduce rerenders?", // 1069
  "How would you approach fixing browser-specific styling issues?", // 1069
  "Explain the concept of Content Security Policy (CSP) and how it enhances security", // 1062
  "How do you decide between using React state, context, and external state managers?", // 1054
  "Explain the concept of lazy loading and how it can improve performance", // 1039
  "What's the difference between feature detection, feature inference, and using the UA string?", // 1033
  "Explain the concept of error propagation in JavaScript", // 1023
  "What does a doctype do?", // 1021
  "What are the advantages and disadvantages of using AJAX?", // 1016
  "What are some of the \"gotchas\" for writing efficient CSS?", // 1011
  "Explain the concept of Cross-Site Request Forgery (CSRF) and its mitigation techniques", // 1009
  "How do you serve your pages for feature-constrained browsers?", // 1008
  "Explain the difference between `document.querySelector()` and `document.getElementById()`", // 1007
  "Why is extending built-in JavaScript objects not a good idea?", // 1007
  "Explain one-way data flow of React and its benefits", // 995
  "Explain how JSONP works (and how it's not really Ajax)", // 993
  "Explain the concept of lexical scoping", // 992
  "Explain the concept of scope in JavaScript", // 987
  "What are `Symbol`s used for in JavaScript?", // 985
  "Why might you want to create static class members in JavaScript?", // 972
  "What is the `useId` hook in React and when should it be used?", // 956
  "Can you explain the difference between coding a website to be responsive versus using a mobile-first strategy?", // 952
  "Explain the concept of input validation and its importance in security", // 924
  "What are higher order components in React?", // 918
  "Why does React recommend against mutating state?", // 913
  "Explain the concept of inheritance in ES2015 classes", // 912
  "Explain the different states of a Promise", // 910
  "What is React strict mode and what are its benefits?", // 905
  "When would you use `document.write()`?", // 900
  "Explain what happens when the `useState` setter function is called in React", // 889
  "Explain why the following doesn't work as an IIFE: `function foo(){}();`. What needs to be changed to properly make it an IIFE?", // 887
  "Explain the same-origin policy with regards to JavaScript", // 876
  "What is `forwardRef()` in React used for?", // 867
  "What are the differences between `Map`/`Set` and `WeakMap`/`WeakSet` in JavaScript?", // 866
  "What is code splitting in a React application?", // 858
  "Explain the difference in hoisting between `var`, `let`, and `const`", // 856
  "What tools and techniques do you use for debugging JavaScript code?", // 847
  "Explain the concept of the spread operator and its uses", // 838
  "What are the benefits of using spread syntax in JavaScript and how is it different from rest syntax?", // 837
  "Consider HTML5 as an open web platform. What are the building blocks of HTML5?", // 833
  "Explain what React hydration is", // 829
  "Explain the concept of test-driven development (TDD)", // 827
  "What are error boundaries in React for?", // 825
  "Explain server-side rendering of React applications and its benefits", // 823
  "Can you give an example of an `@media` property other than `screen`?", // 821
  "How do you abort a web request using `AbortController` in JavaScript?", // 819
  "What are React Portals used for?", // 815
  "Why would you use something like the `load` event?", // 815
  "What are JavaScript polyfills for?", // 814
  "What is React Fiber and how is it an improvement over the previous approach?", // 813
  "What are workers in JavaScript used for?", // 803
  "Explain the difference between shallow copy and deep copy", // 798
  "How do you test React applications?", // 796
  "Explain the concept of partial application", // 793
  "What are some React anti-patterns?", // 792
  "Explain the difference between global scope, function scope, and block scope", // 787
  "Explain the concept of `this` binding in event handlers", // 782
  "What is React Suspense and what does it enable?", // 774
  "Explain the composition pattern in React", // 768
  "How can you share code between JavaScript files?", // 765
  "Explain the presentational vs container component pattern in React", // 757
  "How do you localize React applications?", // 755
  "Explain the concept of the Prototype pattern", // 746
  "Explain the concept of the Web Socket API", // 745
  "What are some common pitfalls when doing data fetching in React?", // 745
  "Describe what you like and dislike about the CSS preprocessors you have used.", // 743
  "How does JavaScript garbage collection work?", // 742
  "How do you add, remove, and modify HTML elements using JavaScript?", // 738
  "Explain the difference between dot notation and bracket notation for accessing object properties", // 735
  "How can closures be used to create private variables?", // 732
  "How do you debug React applications?", // 732
  "Have you used or implemented media queries or mobile-specific layouts/CSS?", // 729
  "What existing CSS frameworks have you used locally, or in production?", // 727
  "What is the Flux pattern and what are its benefits?", // 724
  "How do you organize your code?", // 711
  "Explain the concept of tree shaking in module bundling", // 707
  "Explain the concept of the Singleton pattern", // 699
  "How do you manipulate CSS styles using JavaScript?", // 699
  "Explain the difference between unit testing, integration testing, and end-to-end testing", // 696
  "Explain the different ways the `this` keyword can be bound", // 695
  "What are the differences between `XMLHttpRequest` and `fetch()` in JavaScript and browsers?", // 690
  "How do `<iframe>` on a page communicate?", // 679
  "What are render props in React and what are they for?", // 678
  "What is the difference between `event.preventDefault()` and `event.stopPropagation()`?", // 678
  "What are server-sent events?", // 676
  "Explain static generation of React applications and its benefits", // 665
  "How can you avoid problems related to hoisting?", // 662
  "Explain the difference between classical inheritance and prototypal inheritance", // 656
  "Explain the concept of tagged templates", // 653
  "Have you ever worked with retina graphics?", // 652
  "What are the various clearing techniques and which is appropriate for what context?", // 647
  "What are JavaScript object getters and setters for?", // 645
  "What are some of the advantages and disadvantages of using TypeScript and compile-to-JavaScript languages", // 642
  "What is the DOM and how is it structured?", // 641
  "What is the difference between `innerHTML` and `textContent`?", // 634
  "Explain the event phases in a browser", // 633
  "What are Promises and how do they work?", // 619
  "How is `Promise.all()` different from `Promise.allSettled()`?", // 614
  "How can you optimize DOM manipulation for better performance?", // 601
  "How can you optimize network requests for better performance?", // 600
  "What do you think of CommonJS vs ESM?", // 596
  "What are iterators and generators in JavaScript and what are they used for?", // 583
  "How do you check the data type of a variable?", // 572
  "How do you convert a string to a number in JavaScript?", // 572
  "What is the use of `Promise.all()`", // 567
  "How can you test asynchronous code in JavaScript?", // 563
  "What are JavaScript object property flags and descriptors?", // 563
  "How do you access the index of an element in an array during iteration?", // 561
  "How do you add, remove, and update elements in an array?", // 558
  "How can you implement secure authentication and authorization in JavaScript applications?", // 555
  "How do you check if an object has a specific property?", // 555
  "How do you handle errors in asynchronous operations?", // 554
  "How do you convert a `Set` to an array in JavaScript?", // 545
  "Explain the concept of the Strategy pattern", // 541
  "How do you make an HTTP request using the Fetch API?", // 537
  "What are callback functions and how are they used?", // 532
  "How do you prevent the default behavior of an event?", // 531
  "How do you detect if JavaScript is disabled on a page?", // 528
  "How do you handle errors using `try...catch` blocks?", // 528
  "How do you create a constructor function?", // 522
  "How can you create custom error objects?", // 512
  "How do currying and partial application differ from each other?", // 512
  "How do `Set`s and `Map`s handle equality checks for objects?", // 506
  "How does hoisting affect function declarations and expressions?", // 502
  "How do you reliably determine whether an object is empty?", // 487
  "What is async/await and how does it simplify asynchronous code?", // 487
  "How do you import and export modules in JavaScript?", // 485
  "How can you prevent clickjacking attacks?", // 484
  "How can you prevent SQL injection vulnerabilities in JavaScript applications?", // 480
  "Explain the Observer pattern and its use cases", // 478
  "How do you redirect to a new page in JavaScript?", // 468

  // ---- Prep additions (41)
  "Compare client-side state libraries: Context, Redux Toolkit, Zustand, TanStack Query. When do you use each?",
  "Explain caching and revalidation in the Next.js App Router.",
  "Explain mapped and conditional types with an example.",
  "Explain unknown vs any vs never.",
  "How do function overloads work in TypeScript, and when would you use a union or generic instead?",
  "How do Suspense and streaming work in Next.js?",
  "How do you handle accessibility in a single-page app's route changes?",
  "How do you make a custom component keyboard accessible?",
  "How do you make an icon-only button accessible?",
  "How do you make forms accessible?",
  "How do you manage focus when opening and closing a modal dialog?",
  "How do you narrow types in TypeScript?",
  "How do you secure third-party scripts and dependencies on the frontend?",
  "How do you type React components, props, children, and events?",
  "How does keyof and indexed access (T[K]) work?",
  "How should a frontend store auth tokens, and what are the trade-offs?",
  "How would you prevent data-fetching waterfalls in a React or Next.js app?",
  "How would you test a web app for accessibility?",
  "How would you type an API response safely when you can't trust the server?",
  "Name the utility types you use most and what they do.",
  "What are discriminated unions, and how do they help in React state?",
  "What are generics in TypeScript, and when would you use constraints?",
  "What are React Server Components, and how do they differ from SSR?",
  "What are Server Actions, and what are their trade-offs?",
  "What are WCAG color contrast requirements?",
  "What does as const do?",
  "What does prefers-reduced-motion do, and how should apps respect it?",
  "What does satisfies do, and how is it different from a type annotation?",
  "What is an aria-live region, and when would you use one?",
  "What is clickjacking, and how do you prevent it?",
  "What is CORS, and why doesn't it protect your API from attackers?",
  "What is semantic HTML, and why does it matter for accessibility?",
  "What is structural typing, and what pitfalls does it cause?",
  "What is the accessible name of an element, and how is it computed?",
  "What is the difference between type and interface in TypeScript?",
  "What is the React Compiler, and how does it change memoization?",
  "What is useTransition / concurrent rendering, and when would you use it?",
  "What new hooks did React 19 add, and what problems do they solve?",
  "What's the difference between strict mode options like strictNullChecks and noImplicitAny, and why enable them?",
  "What's the first rule of ARIA, and when should you use ARIA attributes?",
  "When do you need 'use client' in Next.js App Router?",
]

// Bottom 20% by completions (57).
const DROP = [
  "What are event listeners and how are they used?", // 466
  "What are the potential pitfalls of using closures?", // 464
  "How do you get the query string values of the current page in JavaScript?", // 463
  "What are default parameters and how are they used?", // 460
  "What are rest parameters and how are they used?", // 454
  "What are `Set`s and `Map`s and how are they used?", // 451
  "What are some best practices for handling sensitive data in JavaScript?", // 445
  "What is the ternary operator and how is it used?", // 445
  "What is the spread operator and how is it used?", // 442
  "What are some common performance bottlenecks in JavaScript applications?", // 440
  "What is Cross-Site Scripting (XSS) and how can you prevent it?", // 429
  "What is currying and how does it work?", // 425
  "What is the purpose of the `finally` block?", // 425
  "How do you write unit tests for JavaScript code?", // 424
  "Provide some examples of how currying and partial application can be used", // 416
  "What is the purpose of the `switch` statement?", // 415
  "What are some tools that can be used to measure and analyze JavaScript performance?", // 413
  "What are the advantages of using the spread operator with arrays and objects?", // 413
  "What is the prototype chain and how does it work?", // 413
  "What is the purpose of the `break` and `continue` statements?", // 413
  "What are the different methods for iterating over an array?", // 411
  "How do you use `window.history` API?", // 410
  "What are some techniques for reducing reflows and repaints?", // 410
  "What are the potential issues caused by hoisting?", // 409
  "What are modules and why are they useful?", // 406
  "What is the difference between a parameter and an argument?", // 405
  "What are the different ways to make an API call in JavaScript?", // 403
  "What are template literals and how are they used?", // 402
  "What are the common pitfalls of using the `this` keyword?", // 400
  "What are Web Workers and how can they be used to improve performance?", // 400
  "What is the purpose of the `new` keyword?", // 400
  "What is `Object.freeze()` for?", // 389
  "What are Progressive Web Applications (PWAs)?", // 384
  "What are some popular JavaScript testing frameworks?", // 384
  "What are design patterns and why are they useful?", // 381
  "What are the different ways to copy an object or an array?", // 380
  "What is recursion and how is it used in JavaScript?", // 380
  "What are the benefits of using currying and partial application?", // 378
  "What are some best practices for writing maintainable and effective tests in JavaScript?", // 375
  "What are the different types of errors in JavaScript?", // 373
  "What are some tools that can be used for JavaScript testing?", // 369
  "What are the different types of testing in software development?", // 369
  "What is `Object.seal()` for?", // 366
  "What is the difference between the Window object and the Document object?", // 364
  "What are mocks and stubs and how are they used in testing?", // 362
  "What are some tools and techniques for identifying security vulnerabilities in JavaScript code?", // 361
  "How do you validate form elements using the Constraint Validation API?", // 355
  "What are the benefits of using a module bundler?", // 355
  "What are some common security headers and their purpose?", // 351
  "What is `Object.preventExtensions()` for?", // 341
  "What is the difference between `setTimeout()`, `setImmediate()`, and `process.nextTick()`?", // 326
  "What is the `Intl` namespace object for?", // 322
  "What are the metadata fields of a module?", // 309
  "What is the Factory pattern and how is it used?", // 288
  "What is the Module pattern and how does it help with encapsulation?", // 285
  "What is the Decorator pattern and how is it used?", // 268
  "What is the Command pattern and how is it used?", // 254
]

export const patch = dropAndOrderPatch('quiz', DROP, ORDER)

export default []
