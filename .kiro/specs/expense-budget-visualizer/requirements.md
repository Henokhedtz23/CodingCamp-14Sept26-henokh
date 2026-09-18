# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that allows users to track personal expenses, categorize transactions, and visualize spending patterns through an interactive pie chart. Built with plain HTML, CSS, and Vanilla JavaScript, it requires no backend server and persists all data in the browser's Local Storage. The app provides a clean, minimal interface with dark/light mode support, making personal budget tracking accessible without any setup overhead.

## Glossary

- **App**: The Expense & Budget Visualizer single-page web application
- **Transaction**: A single expense entry consisting of an item name, amount, and category
- **Category**: A label that groups transactions (e.g., Food, Transport, Fun, or a user-defined label)
- **Transaction_List**: The scrollable UI component that displays all recorded transactions
- **Balance_Display**: The UI component at the top of the page that shows the total sum of all transaction amounts
- **Chart**: The pie chart component that visualizes spending distribution by category
- **Form**: The input form component used to add new transactions
- **Storage**: The browser Local Storage API used to persist all application data
- **Theme**: The visual color scheme of the App, either "light" or "dark"
- **Sort_Control**: The UI control that determines the order in which transactions are displayed

---

## Requirements

### Requirement 1: Transaction Input Form

**User Story:** As a user, I want to fill in a form with an item name, amount, and category so that I can record a new expense transaction.

#### Acceptance Criteria

1. THE Form SHALL provide a text input field for the item name, accepting up to 100 characters.
2. THE Form SHALL provide a numeric input field for the transaction amount, accepting values in the range 0.01 to 999,999,999.99.
3. THE Form SHALL provide a category selector with the default options: Food, Transport, and Fun.
4. WHEN the user submits the Form with all fields filled and a valid amount in the range 0.01 to 999,999,999.99, THE App SHALL add the transaction to the Transaction_List and persist it via Storage within 2 seconds.
5. IF the user submits the Form with any field empty, THEN THE Form SHALL display a validation error message identifying the missing field and SHALL NOT add the transaction.
6. IF the user submits the Form with an amount outside the range 0.01 to 999,999,999.99, THEN THE Form SHALL display a validation error message indicating the amount is invalid and SHALL NOT add the transaction.
7. WHEN a transaction is successfully added, THE Form SHALL reset all input fields to their default empty state and reset the category selector to the first default option.

---

### Requirement 2: Custom Categories

**User Story:** As a user, I want to add custom expense categories so that I can organize transactions beyond the default options.

#### Acceptance Criteria

1. THE Form SHALL provide a text input field that allows the user to enter a new category name of up to 50 characters.
2. WHEN the user submits a non-empty custom category name, THE App SHALL add that category to the category selector and persist the updated category list via Storage within 1 second.
3. IF the user submits an empty string as a custom category name, THEN THE App SHALL display a validation error message indicating the category name is required and SHALL NOT add the category.
4. IF the user submits a category name that already exists (case-insensitive match against all existing default and custom categories), THEN THE App SHALL display a validation error message indicating a duplicate category name and SHALL NOT add the category.
5. WHEN the App loads, THE App SHALL restore all previously saved custom categories from Storage into the category selector before the category selector is available for user interaction.
6. IF the Storage read operation fails during App load, THEN THE App SHALL display the default categories only and SHALL display an error message indicating that custom categories could not be loaded.

---

### Requirement 3: Transaction List Display

**User Story:** As a user, I want to see a scrollable list of all my transactions so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display all persisted transactions, each showing the item name (up to 100 characters), amount (formatted to 2 decimal places with currency symbol), and category.
2. WHEN the number of transactions exceeds the visible area, THE Transaction_List SHALL be scrollable to reveal all entries without pagination or truncation.
3. WHEN the App loads, THE Transaction_List SHALL render all transactions previously saved in Storage, ordered by most recent transaction date first.
4. WHEN there are no transactions, THE Transaction_List SHALL display an empty-state message indicating no transactions have been added.
5. WHEN the number of persisted transactions exceeds 1000 entries, THE Transaction_List SHALL render without exceeding 3 seconds load time on the initial display.

---

### Requirement 4: Sort Transactions

**User Story:** As a user, I want to sort my transactions by amount or by category so that I can find and review entries more easily.

#### Acceptance Criteria

1. THE Sort_Control SHALL provide options to sort the Transaction_List by amount ascending, amount descending, and category alphabetically (A to Z).
2. THE Sort_Control SHALL display the amount ascending option as the default selected sort order on initial load.
3. WHEN the user selects a sort option, THE Transaction_List SHALL re-render all transactions in the selected order within 300 milliseconds, without adding or removing any transactions; transactions with equal amounts SHALL be ordered by their original entry sequence.

---

### Requirement 5: Delete a Transaction

**User Story:** As a user, I want to delete a transaction from the list so that I can correct mistakes or remove outdated entries.

#### Acceptance Criteria

1. THE Transaction_List SHALL render a delete control for each transaction entry.
2. WHEN the user activates the delete control for a transaction, THE App SHALL remove that transaction from the Transaction_List and from Storage.
3. WHEN the user activates the delete control for a transaction, THE App SHALL recalculate and update the Balance_Display to reflect the removed transaction.
4. WHEN the user activates the delete control for a transaction, THE App SHALL recalculate and update the Chart to reflect the removed transaction.
5. IF Storage is unavailable when the user activates the delete control, THEN THE App SHALL display an error message indicating the deletion could not be completed and SHALL retain the transaction in the Transaction_List, the Balance_Display, and the Chart unchanged.

---

### Requirement 6: Total Balance Display

**User Story:** As a user, I want to see the total of all my expenses at a glance so that I know how much I have spent overall.

#### Acceptance Criteria

1. THE Balance_Display SHALL show the sum of all transaction amounts formatted to two decimal places with a currency symbol, treating each transaction amount as a positive expense; the displayed total SHALL not exceed 999,999,999.99.
2. WHEN a transaction is added, THE Balance_Display SHALL immediately update to reflect the new total.
3. WHEN a transaction is deleted, THE Balance_Display SHALL immediately update to reflect the new total.
4. WHEN there are no transactions, THE Balance_Display SHALL show a total of $0.00.

---

### Requirement 7: Spending Distribution Chart

**User Story:** As a user, I want to see a pie chart of my spending by category so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Chart SHALL render a pie chart that displays one segment per category present in the current transactions, with each arc size proportional to that category's share of total spending.
2. THE Chart SHALL label each segment with the category name and its percentage of the total spending, rounded to one decimal place.
3. WHEN a transaction is added, THE Chart SHALL update to reflect the new spending distribution within 1 second.
4. WHEN a transaction is deleted, THE Chart SHALL update to reflect the revised spending distribution within 1 second.
5. WHEN there are no transactions, THE Chart SHALL display a placeholder message replacing the chart entirely, indicating no data is available.
6. THE Chart SHALL only include transactions with amounts greater than zero in the spending distribution calculation.
7. WHEN the number of distinct categories exceeds 10, THE Chart SHALL group all categories beyond the top 10 (by total spending) into a single "Other" segment.

---

### Requirement 8: Data Persistence

**User Story:** As a user, I want my transactions and categories to be saved automatically so that my data is not lost when I close or refresh the browser.

#### Acceptance Criteria

1. WHEN a transaction is added, THE App SHALL save the complete transaction list to browser Local Storage.
2. WHEN a transaction is deleted, THE App SHALL save the updated transaction list to browser Local Storage.
3. WHEN a custom category is added, THE App SHALL save the updated category list to browser Local Storage.
4. WHEN a custom category is deleted, THE App SHALL save the updated category list to browser Local Storage.
5. WHEN the App loads, THE App SHALL read all transactions and categories from browser Local Storage and restore the Transaction_List, Balance_Display, and Chart to match the saved data.
6. IF browser Local Storage is unavailable or reading from Local Storage fails, THEN THE App SHALL display a warning message indicating that saved data could not be loaded and SHALL initialize with an empty transaction list and the default category list.
7. IF saving to browser Local Storage fails, THEN THE App SHALL display a warning message indicating that the current data could not be saved.

---

### Requirement 9: Dark / Light Mode Toggle

**User Story:** As a user, I want to switch between dark and light visual themes so that I can use the app comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE App SHALL provide a toggle control that switches the Theme between "light" and "dark", where the control visually indicates the currently active Theme.
2. WHEN the user activates the theme toggle, THE App SHALL apply the selected Theme to all visible UI components within 100 milliseconds, without requiring a page reload.
3. WHEN the user activates the theme toggle, THE App SHALL persist the selected Theme to Storage, overwriting any previously saved value.
4. WHEN the App loads, THE App SHALL restore the previously saved Theme from Storage and apply it before any UI content is rendered.
5. IF no previously saved Theme exists in Storage, THEN THE App SHALL apply the "light" Theme as the default and render all UI components using that Theme.
6. IF Storage is unavailable during App load, THEN THE App SHALL apply the "light" Theme as the fallback and continue rendering without displaying an error to the user.

---

### Requirement 10: Responsive and Accessible Interface

**User Story:** As a user, I want the interface to be readable and usable on different screen sizes and with keyboard navigation so that I can access the app in various contexts.

#### Acceptance Criteria

1. THE App SHALL render all UI elements fully visible without horizontal scrolling or clipping on viewports 320 px wide and above.
2. THE App SHALL use a minimum font size of 16 px and maintain a contrast ratio of at least 4.5:1 between text and background in both the "light" and "dark" Theme, with distinct heading levels establishing visual hierarchy.
3. THE Form SHALL be fully operable using keyboard navigation alone, with a logical tab focus order across all input fields and controls, and a visible focus indicator on the focused element.
4. THE App SHALL display a visible focus indicator on all interactive elements with a contrast ratio of at least 3:1 against adjacent colors.
5. THE App SHALL load and render the initial state in under 2 seconds measured from page request to first interactive render on a 25 Mbps broadband connection.

---

### Requirement 11: File and Code Structure

**User Story:** As a developer, I want the project to follow a clean, prescribed folder structure so that the codebase is easy to navigate and maintain.

#### Acceptance Criteria

1. THE App SHALL contain exactly one CSS file located inside a `css/` directory, referenced via a `<link>` element in `index.html`.
2. THE App SHALL contain exactly one JavaScript file located inside a `js/` directory, referenced via a `<script>` element in `index.html`.
3. THE App SHALL be launchable by opening a single `index.html` file in a modern browser (Chrome, Firefox, Edge, or Safari) without requiring a build step or local server, with all features from Requirements 1 through 10 fully functional.
