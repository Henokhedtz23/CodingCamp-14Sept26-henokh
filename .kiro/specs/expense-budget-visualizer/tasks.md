# Implementation Plan: Expense & Budget Visualizer

## Overview

Implement the Expense & Budget Visualizer as a plain HTML/CSS/Vanilla JS single-page app with no build step. The implementation follows the IIFE-structured `js/app.js` design, with `StorageService`, `AppState`, `TransactionService`, `CategoryService`, `ChartService`, render functions, and event handlers wired together in a single file. Chart.js 4.4.1 is loaded via CDN. All data is persisted to browser localStorage. Property tests are written as a standalone `tests/property-tests.html` page using fast-check's CDN/UMD build — no test runner or build step required.

## Tasks

- [x] 1. Create project file structure and HTML shell
  - [x] 1.1 Create the directory structure and `index.html` entry point
    - Create `index.html` at the project root with the full HTML5 boilerplate
    - Add the inline `<script>` in `<head>` that reads `ebv_theme` from localStorage and sets `data-theme` on `<html>` before any paint (prevents flash-of-wrong-theme)
    - Link `css/style.css` via `<link>` in `<head>`
    - Load Chart.js 4.4.1 via `<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js">` before `js/app.js`
    - Link `js/app.js` via `<script defer>` at the end of `<body>`
    - Scaffold all semantic HTML sections: theme toggle button, balance display, transaction form (item name, amount, category selector, custom category input, submit buttons), sort control, transaction list (`<ul>`), pie chart (`<canvas>`), and `role="alert"` error regions
    - Create `css/style.css` as an empty file and `js/app.js` as an empty IIFE skeleton
    - _Requirements: 11.1, 11.2, 11.3_

- [x] 2. Implement CSS styles and theme system
  - [x] 2.1 Write all CSS custom properties and layout styles in `css/style.css`
    - Define CSS custom properties under `[data-theme="light"]` and `[data-theme="dark"]` on the `<html>` element for all colors, backgrounds, and borders
    - Implement responsive layout using flexbox/grid so all elements are fully visible at 320 px and above without horizontal scrolling (Requirement 10.1)
    - Set minimum font size to 16 px and ensure text/background contrast ratios meet 4.5:1 in both themes (Requirement 10.2)
    - Add visible focus indicators on all interactive elements with at least 3:1 contrast against adjacent colors (Requirements 10.3, 10.4)
    - Style the transaction list as a scrollable container; style the form, sort control, balance display, and chart area
    - Add transitions of ≤ 100 ms for theme switching (Requirement 9.2)
    - _Requirements: 9.1, 9.2, 10.1, 10.2, 10.3, 10.4_

- [x] 3. Implement `StorageService` in `js/app.js`
  - [x] 3.1 Write `StorageService` with `load()` and `save()` methods inside the IIFE
    - Define `KEYS` constant: `{ TRANSACTIONS: 'ebv_transactions', CATEGORIES: 'ebv_categories', THEME: 'ebv_theme' }`
    - `load()` wraps all localStorage reads in try/catch; returns `{ transactions, categories, theme }` with safe defaults (empty array, `DEFAULT_CATEGORIES`, `'light'`) on any failure; sets `AppState.error` when storage is unavailable (Requirements 8.5, 8.6, 9.4, 9.5)
    - `save(state)` wraps all localStorage writes in try/catch; on failure shows a warning via `showError()` but leaves in-memory state intact (Requirements 8.1–8.4, 8.7)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_


- [x] 4. Implement `TransactionService` in `js/app.js`
  - [x] 4.1 Write `TransactionService` with `validate()`, `add()`, `remove()`, `sort()`, and `computeBalance()` methods
    - `validate(name, amountStr, category)` returns `{ valid, errors[] }`; rejects empty/whitespace name, amount outside 0.01–999,999,999.99, and empty category (Requirements 1.4, 1.5, 1.6)
    - `add(state, name, amount, category)` generates a unique `id` using `crypto.randomUUID()` with `Date.now() + Math.random()` fallback, sets `createdAt` to current timestamp; returns new transactions array (newest first)
    - `remove(state, id)` filters out the matching transaction; returns new array
    - `sort(transactions, sortOrder)` implements stable sort for `'amount-asc'`, `'amount-desc'`, `'category-az'`; ties in amount are broken by original `createdAt` (Requirements 4.1, 4.3)
    - `computeBalance(transactions)` sums all amounts; returns 0 for empty list (Requirements 6.1, 6.4)
    - _Requirements: 1.4, 1.5, 1.6, 4.1, 4.3, 5.2, 6.1, 6.4_


- [x] 5. Implement `CategoryService` in `js/app.js`
  - [x] 5.1 Write `CategoryService` with `DEFAULT_CATEGORIES`, `validateNew()`, `add()`, and `remove()` methods
    - `DEFAULT_CATEGORIES` is `['Food', 'Transport', 'Fun']`
    - `validateNew(name, existing)` rejects empty/whitespace names and case-insensitive duplicates against all existing categories; returns `{ valid, error }` (Requirements 2.3, 2.4)
    - `add(existing, name)` returns a new array with the new category appended
    - `remove(existing, name)` returns a new array with the named category removed
    - _Requirements: 2.1, 2.3, 2.4, 2.5_



- [x] 6. Implement `ChartService` in `js/app.js`
  - [x] 6.1 Write `ChartService` with `aggregate()` method
    - Build `categoryTotals` map summing amounts > 0 only (excludes zero/negative amounts per Requirement 7.6)
    - Sort categories by total descending; take top 10 as individual segments
    - If more than 10 distinct categories, sum the remainder into a single `'Other'` segment (Requirement 7.7)
    - Return `{ labels: string[], data: number[], colors: string[] }` compatible with Chart.js 4.x dataset format
    - Percentage labels are rounded to 1 decimal place via `toFixed(1)` (Requirement 7.2)
    - _Requirements: 7.1, 7.2, 7.6, 7.7_



- [x] 7. Implement render functions in `js/app.js`
  - [x] 7.1 Write `renderTransactionList()`, `renderBalance()`, and `renderCategories()`
    - `renderTransactionList(transactions, sortOrder)` applies `TransactionService.sort()` then builds list item DOM for each transaction showing name, amount formatted to 2 decimal places with `$` symbol, category, and a delete button; shows empty-state message when list is empty (Requirements 3.1, 3.2, 3.4)
    - `renderBalance(transactions)` updates the balance display element with `$` + `computeBalance().toFixed(2)`; shows `$0.00` when no transactions (Requirements 6.1, 6.2, 6.3, 6.4)
    - `renderCategories(categories)` clears and repopulates the `<select>` element options; resets selector to first default option after a successful transaction add (Requirements 1.3, 1.7, 2.1, 2.5)
    - _Requirements: 1.3, 1.7, 3.1, 3.2, 3.4, 6.1, 6.2, 6.3, 6.4_

  - [x] 7.2 Write `renderChart()`, `renderTheme()`, `showError()`, and `clearError()`
    - `renderChart(transactions)` calls `ChartService.aggregate()` then creates or updates a Chart.js 4.x `'pie'` instance on the `<canvas>` element; shows placeholder message (replacing the chart) when no transactions (Requirements 7.1, 7.2, 7.3, 7.4, 7.5); gracefully hides chart area if Chart.js CDN failed to load and shows inline "Chart could not be loaded" message
    - `renderTheme(theme)` sets `data-theme` attribute on `<html>` (Requirements 9.1, 9.2)
    - `showError(message, targetEl)` writes the message into a `role="alert"` container so screen readers announce it (Requirement 10.2); `clearError(targetEl)` clears it
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 9.1, 9.2, 10.2_

- [x] 8. Checkpoint — verify core services and rendering
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement event handlers and wire everything together in `js/app.js`
  - [x] 9.1 Wire the transaction form submit handler
    - On form submit: call `TransactionService.validate()`; if invalid show errors via `showError()` on the relevant fields; if valid call `TransactionService.add()`, update `AppState.transactions`, call `StorageService.save()`, then call `renderTransactionList()`, `renderBalance()`, `renderChart()`, and reset the form (Requirement 1.7); clear field errors via `clearError()` on re-input
    - _Requirements: 1.4, 1.5, 1.6, 1.7, 3.1, 5.3, 5.4, 6.2, 7.3, 8.1_

  - [x] 9.2 Wire the custom category form submit handler
    - On category add submit: call `CategoryService.validateNew()`; if invalid show error; if valid call `CategoryService.add()`, update `AppState.categories`, call `StorageService.save()`, then call `renderCategories()` (Requirements 2.2, 2.3, 2.4); restore custom categories from `StorageService.load()` on app init and call `renderCategories()` (Requirements 2.5, 2.6)
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6, 8.3_

  - [x] 9.3 Wire the delete button handler on the transaction list
    - Use event delegation on the `<ul>` element; on delete button click: if storage unavailable show error and leave state unchanged (Requirement 5.5); otherwise call `TransactionService.remove()`, update `AppState.transactions`, call `StorageService.save()`, then call `renderTransactionList()`, `renderBalance()`, `renderChart()` (Requirements 5.2, 5.3, 5.4)
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.3, 7.4, 8.2_

  - [x] 9.4 Wire the sort control change handler
    - On sort control change: update `AppState.sortOrder`, call `renderTransactionList()` within 300 ms (Requirement 4.3); default sort order is `'amount-asc'` on load (Requirement 4.2)
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 9.5 Wire the theme toggle handler and app initialization
    - On theme toggle click: flip `AppState.theme`, call `renderTheme()`, call `StorageService.save()` (Requirements 9.2, 9.3)
    - Write the IIFE initialization block that calls `StorageService.load()` first, populates `AppState`, then calls all render functions in order: `renderTheme()`, `renderCategories()`, `renderTransactionList()`, `renderBalance()`, `renderChart()`; shows warning banner if load returned an error (Requirements 8.5, 8.6, 9.4, 9.5, 9.6)
    - _Requirements: 8.5, 8.6, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [x] 10. Final checkpoint — full integration and accessibility pass
  - Ensure all tests pass, ask the user if questions arise.
  - Verify keyboard navigation: logical tab order across form, sort control, transaction list delete buttons, theme toggle; visible focus indicators present on all interactive elements (Requirement 10.3, 10.4)
  - Verify `role="alert"` elements are present for all error and warning messages (Requirement 10.2)
  - Verify the app opens correctly by loading `index.html` directly in a browser (Requirement 11.3)

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests live in `tests/property-tests.html` and use fast-check's CDN/UMD build — no build step or test runner required
- Each task references specific requirements for traceability
- Checkpoints (tasks 8 and 10) ensure incremental validation
- Property tests validate universal correctness properties defined in the design document
- Unit-style tests can be run from the browser console by calling service functions directly (e.g., `TransactionService.validate(...)`)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["4.1", "5.1", "6.1", "3.2"] },
    { "id": 3, "tasks": ["7.1", "4.2", "4.3", "4.4", "4.5", "5.2", "6.2"] },
    { "id": 4, "tasks": ["7.2"] },
    { "id": 5, "tasks": ["9.1", "9.2", "9.3", "9.4", "9.5"] }
  ]
}
```
