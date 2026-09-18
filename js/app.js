/* js/app.js — Expense & Budget Visualizer
   Single IIFE containing all application logic.
   Sections are scaffolded here and will be filled in subsequent tasks. */

(function () {
  'use strict';

  /* ================================================================
     1. STORAGE SERVICE
        Responsible for all localStorage reads and writes.
        Implemented in Task 3.1
  ================================================================ */
  const StorageService = {
    KEYS: {
      TRANSACTIONS: 'ebv_transactions',
      CATEGORIES:   'ebv_categories',
      THEME:        'ebv_theme',
    },

    /**
     * Load all persisted data from localStorage.
     * Returns safe defaults on any failure and sets AppState.error.
     * @returns {{ transactions: object[], categories: string[], theme: 'light'|'dark' }}
     */
    load() {
      const defaults = {
        transactions: [],
        categories:   CategoryService.DEFAULT_CATEGORIES.slice(),
        theme:        'light',
      };

      try {
        // Attempt a test write/read to confirm localStorage is available
        const testKey = '__ebv_test__';
        localStorage.setItem(testKey, '1');
        localStorage.removeItem(testKey);
      } catch (e) {
        // localStorage is unavailable — return defaults and flag error
        AppState.error = 'Saved data could not be loaded: storage is unavailable.';
        return Object.assign({}, defaults);
      }

      let transactions = defaults.transactions;
      let categories   = defaults.categories;
      let theme        = defaults.theme;
      let hadError     = false;

      // Load transactions
      try {
        const raw = localStorage.getItem(this.KEYS.TRANSACTIONS);
        if (raw !== null) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            transactions = parsed;
          }
        }
      } catch (e) {
        hadError = true;
        transactions = defaults.transactions;
      }

      // Load categories
      try {
        const raw = localStorage.getItem(this.KEYS.CATEGORIES);
        if (raw !== null) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            categories = parsed;
          }
        }
      } catch (e) {
        hadError = true;
        categories = defaults.categories;
      }

      // Load theme
      try {
        const raw = localStorage.getItem(this.KEYS.THEME);
        if (raw === 'light' || raw === 'dark') {
          theme = raw;
        }
      } catch (e) {
        // Non-fatal — fall back to default 'light'
        theme = defaults.theme;
      }

      if (hadError) {
        AppState.error = 'Some saved data could not be loaded.';
      }

      return { transactions, categories, theme };
    },

    /**
     * Persist transactions, categories, and theme from state to localStorage.
     * On failure, shows a warning but leaves in-memory state intact.
     * @param {object} state — AppState
     */
    save(state) {
      try {
        localStorage.setItem(this.KEYS.TRANSACTIONS, JSON.stringify(state.transactions));
        localStorage.setItem(this.KEYS.CATEGORIES,   JSON.stringify(state.categories));
        localStorage.setItem(this.KEYS.THEME,        state.theme);
      } catch (e) {
        const message = 'Warning: current data could not be saved. Changes may be lost on reload.';
        const alertEl = document.getElementById('global-alert');
        // showError may not be defined yet at module parse time; call it safely at runtime
        if (typeof showError === 'function' && alertEl) {
          showError(message, alertEl);
        } else if (alertEl) {
          // Minimal fallback if showError is not yet available
          alertEl.textContent = message;
          alertEl.classList.remove('alert-banner--hidden');
        }
      }
    },
  };


  /* ================================================================
     2. APP STATE
        Single source of truth for all runtime state.
        Populated during initialization at the bottom of this IIFE.
  ================================================================ */
  const AppState = {
    transactions: [],               // Transaction[] — ordered newest first
    categories:   [],               // string[]
    theme:        'light',          // 'light' | 'dark'
    sortOrder:    'amount-asc',     // 'amount-asc' | 'amount-desc' | 'category-az' | 'category-za'
    error:        null,             // transient error string | null
  };


  /* ================================================================
     3. TRANSACTION SERVICE
        Pure functions for transaction manipulation and validation.
        Implemented in Task 4.1
  ================================================================ */
  const TransactionService = {
    /**
     * Validate raw form inputs.
     * @param {string} name        — item name from the text input
     * @param {string} amountStr   — raw string from the amount input
     * @param {string} category    — selected category value
     * @returns {{ valid: boolean, errors: string[] }}
     */
    validate(name, amountStr, category) {
      const errors = [];

      // Validate name: must be non-empty / non-whitespace
      if (!name || name.trim().length === 0) {
        errors.push('Item name is required.');
      }

      // Validate amount: must be a number in the range 0.01 – 999,999,999.99
      const amount = parseFloat(amountStr);
      if (amountStr === '' || amountStr === null || amountStr === undefined || isNaN(amount)) {
        errors.push('Amount is required and must be a valid number.');
      } else if (amount < 0.01 || amount > 999999999.99) {
        errors.push('Amount must be between 0.01 and 999,999,999.99.');
      }

      // Validate category: must be non-empty
      if (!category || category.trim().length === 0) {
        errors.push('Category is required.');
      }

      return { valid: errors.length === 0, errors };
    },

    /**
     * Add a new transaction to the list (prepended — newest first).
     * @param {object} state       — AppState
     * @param {string} name
     * @param {number} amount
     * @param {string} category
     * @returns {Transaction[]} new array with transaction prepended
     */
    add(state, name, amount, category) {
      // Generate a unique id — prefer crypto.randomUUID(), fall back to timestamp+random
      let id;
      try {
        id = crypto.randomUUID();
      } catch (e) {
        id = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
      }

      const transaction = {
        id,
        name:      name.trim(),
        amount:    parseFloat(parseFloat(amount).toFixed(2)),
        category:  category.trim(),
        createdAt: Date.now(),
      };

      // Prepend so the list stays newest-first
      return [transaction, ...state.transactions];
    },

    /**
     * Remove a transaction by id.
     * @param {object} state — AppState
     * @param {string} id
     * @returns {Transaction[]} new array without the matching transaction
     */
    remove(state, id) {
      return state.transactions.filter(function (t) { return t.id !== id; });
    },

    /**
     * Stable sort transactions by the given sortOrder.
     * Ties in amount are broken by createdAt (original insertion order).
     * @param {Transaction[]} transactions
     * @param {'amount-asc'|'amount-desc'|'category-az'} sortOrder
     * @returns {Transaction[]} sorted copy (original array is not mutated)
     */
    sort(transactions, sortOrder) {
      // Work on a shallow copy to avoid mutating the original array
      const copy = transactions.slice();

      copy.sort(function (a, b) {
        if (sortOrder === 'amount-asc') {
          if (a.amount !== b.amount) return a.amount - b.amount;
          // Tie-break: earlier createdAt first
          return a.createdAt - b.createdAt;
        }

        if (sortOrder === 'amount-desc') {
          if (a.amount !== b.amount) return b.amount - a.amount;
          // Tie-break: earlier createdAt first (preserves insertion order)
          return a.createdAt - b.createdAt;
        }

        if (sortOrder === 'category-az') {
          const cmp = a.category.localeCompare(b.category);
          if (cmp !== 0) return cmp;
          // Tie-break: earlier createdAt first
          return a.createdAt - b.createdAt;
        }

        if (sortOrder === 'category-za') {
          const cmp = b.category.localeCompare(a.category);
          if (cmp !== 0) return cmp;
          // Tie-break: earlier createdAt first
          return a.createdAt - b.createdAt;
        }

        // Unknown sort order — preserve original order
        return 0;
      });

      return copy;
    },

    /**
     * Sum all transaction amounts.
     * @param {Transaction[]} transactions
     * @returns {number} total, or 0 when list is empty
     */
    computeBalance(transactions) {
      if (!transactions || transactions.length === 0) return 0;

      // Use integer arithmetic (cents) to avoid floating-point drift
      const totalCents = transactions.reduce(function (sum, t) {
        return sum + Math.round(t.amount * 100);
      }, 0);

      return totalCents / 100;
    },
  };


  /* ================================================================
     4. CATEGORY SERVICE
        Pure functions for category management.
        Implemented in Task 5.1
  ================================================================ */
  const CategoryService = {
    DEFAULT_CATEGORIES: ['Food', 'Transport', 'Fun'],

    /**
     * Validate a new category name against the existing list.
     * Rejects empty/whitespace-only names and case-insensitive duplicates.
     * @param {string}   name     — candidate category name
     * @param {string[]} existing — current category list
     * @returns {{ valid: boolean, error: string | null }}
     */
    validateNew(name, existing) {
      // Reject empty or whitespace-only names
      if (!name || name.trim().length === 0) {
        return { valid: false, error: 'Category name is required.' };
      }

      // Reject case-insensitive duplicates
      const normalized = name.trim().toLowerCase();
      const isDuplicate = existing.some(function (cat) {
        return cat.toLowerCase() === normalized;
      });
      if (isDuplicate) {
        return { valid: false, error: 'A category with that name already exists.' };
      }

      return { valid: true, error: null };
    },

    /**
     * Append a new category name to the existing list.
     * @param {string[]} existing
     * @param {string}   name
     * @returns {string[]} new array with name appended
     */
    add(existing, name) {
      return existing.concat([name.trim()]);
    },

    /**
     * Remove a category by name (exact match).
     * @param {string[]} existing
     * @param {string}   name
     * @returns {string[]} new array without the named category
     */
    remove(existing, name) {
      return existing.filter(function (cat) { return cat !== name; });
    },
  };


  /* ================================================================
     5. CHART SERVICE
        Aggregates transaction data for Chart.js.
        Implemented in Task 6.1
  ================================================================ */
  const ChartService = {
    // Predefined palette of distinct colors for pie segments (Chart.js 4.x backgroundColor)
    PALETTE: [
      '#4e79a7', '#f28e2b', '#e15759', '#76b7b2',
      '#59a14f', '#edc948', '#b07aa1', '#ff9da7',
      '#9c755f', '#bab0ac',
      // 'Other' always gets this neutral gray
      '#aaaaaa',
    ],

    /**
     * Build Chart.js-compatible dataset from transactions.
     * - Sums amounts > 0 per category (excludes zero/negative — Requirement 7.6)
     * - Sorts categories by total descending; top 10 become individual segments
     * - If > 10 distinct categories, the remainder is summed into a single 'Other' segment (Requirement 7.7)
     * - Returns raw totals (not percentages); percentages are rendered by renderChart()
     * @param {object[]} transactions
     * @returns {{ labels: string[], data: number[], colors: string[] }}
     */
    aggregate(transactions) {
      // Build category → total map (positive amounts only)
      const totalsMap = {};
      if (Array.isArray(transactions)) {
        transactions.forEach(function (t) {
          if (t.amount > 0) {
            if (Object.prototype.hasOwnProperty.call(totalsMap, t.category)) {
              // Use integer cents to avoid float drift, same as computeBalance
              totalsMap[t.category] = Math.round(totalsMap[t.category] * 100 + t.amount * 100) / 100;
            } else {
              totalsMap[t.category] = Math.round(t.amount * 100) / 100;
            }
          }
        });
      }

      // Convert to array and sort by total descending
      const sorted = Object.keys(totalsMap)
        .map(function (cat) { return { category: cat, total: totalsMap[cat] }; })
        .sort(function (a, b) { return b.total - a.total; });

      const labels = [];
      const data   = [];
      const colors = [];

      if (sorted.length === 0) {
        return { labels: labels, data: data, colors: colors };
      }

      // Take top 10 as individual segments
      const top     = sorted.slice(0, 10);
      const rest    = sorted.slice(10);

      top.forEach(function (item, i) {
        labels.push(item.category);
        data.push(item.total);
        colors.push(ChartService.PALETTE[i] || ChartService.PALETTE[0]);
      });

      // Group the remainder into 'Other' (only when there are extra categories)
      if (rest.length > 0) {
        const otherTotal = rest.reduce(function (sum, item) {
          return Math.round(sum * 100 + item.total * 100) / 100;
        }, 0);
        labels.push('Other');
        data.push(otherTotal);
        // 'Other' always uses the last palette slot (neutral gray)
        colors.push(ChartService.PALETTE[10]);
      }

      return { labels: labels, data: data, colors: colors };
    },
  };


  /* ================================================================
     6. RENDER FUNCTIONS
        Thin DOM-manipulation functions.
        Implemented in Tasks 7.1 and 7.2
  ================================================================ */

  // Holds the active Chart.js instance so we can destroy it before recreating
  var _chartInstance = null;

  /** Render the transaction list <ul> (Task 7.1) */
  function renderTransactionList(transactions, sortOrder) {
    var listEl       = document.getElementById('transaction-list');
    var emptyStateEl = document.getElementById('transaction-empty-state');

    if (!listEl || !emptyStateEl) return;

    // Remove all previously rendered transaction items (class="transaction-item")
    var existing = listEl.querySelectorAll('.transaction-item');
    for (var i = 0; i < existing.length; i++) {
      listEl.removeChild(existing[i]);
    }

    var sorted = TransactionService.sort(transactions, sortOrder);

    if (sorted.length === 0) {
      // Show the empty-state element
      emptyStateEl.style.display = '';
      return;
    }

    // Hide the empty-state element
    emptyStateEl.style.display = 'none';

    // Build a document fragment with one <li> per transaction
    var fragment = document.createDocumentFragment();

    sorted.forEach(function (tx) {
      var li = document.createElement('li');
      li.className = 'transaction-item';
      li.setAttribute('data-id', tx.id);

      // Info column: name + amount·category meta line
      var infoDiv = document.createElement('div');
      infoDiv.className = 'transaction-item__info';

      var nameSpan = document.createElement('span');
      nameSpan.className = 'transaction-item__name';
      nameSpan.textContent = tx.name;

      var metaSpan = document.createElement('span');
      metaSpan.className = 'transaction-item__meta';
      metaSpan.textContent = '$' + tx.amount.toFixed(2) + ' · ' + tx.category;

      infoDiv.appendChild(nameSpan);
      infoDiv.appendChild(metaSpan);

      var deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn btn--delete';
      deleteBtn.type = 'button';
      deleteBtn.setAttribute('data-id', tx.id);
      deleteBtn.setAttribute('aria-label', 'Delete ' + tx.name);
      deleteBtn.textContent = 'Delete';

      li.appendChild(infoDiv);
      li.appendChild(deleteBtn);

      fragment.appendChild(li);
    });

    listEl.appendChild(fragment);
  }

  /** Update the balance display (Task 7.1) */
  function renderBalance(transactions) {
    var balanceEl = document.getElementById('balance-display');
    if (!balanceEl) return;

    var balance = TransactionService.computeBalance(transactions);
    balanceEl.textContent = '$' + balance.toFixed(2);
  }

  /** Repopulate the category <select> (Task 7.1) */
  function renderCategories(categories) {
    var selectEl = document.getElementById('select-category');
    if (!selectEl) return;

    // Clear all existing options
    while (selectEl.options.length > 0) {
      selectEl.remove(0);
    }

    // Build one <option> per category
    categories.forEach(function (cat) {
      var option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      selectEl.appendChild(option);
    });

    // Reset to first option
    selectEl.selectedIndex = 0;
  }

  /** Create or update the Chart.js pie chart (Task 7.2) */
  function renderChart(transactions) {
    var canvasEl      = document.getElementById('spending-chart');
    var containerEl   = document.getElementById('chart-container');
    var placeholderEl = document.getElementById('chart-placeholder');
    var loadErrorEl   = document.getElementById('chart-load-error');

    if (!canvasEl || !containerEl || !placeholderEl) return;

    // Empty state — destroy any existing chart and show the placeholder
    if (!transactions || transactions.length === 0) {
      if (_chartInstance) {
        _chartInstance.destroy();
        _chartInstance = null;
      }
      containerEl.setAttribute('aria-hidden', 'true');
      containerEl.style.display = 'none';
      placeholderEl.style.display = '';
      if (loadErrorEl) {
        loadErrorEl.classList.add('chart-error--hidden');
      }
      return;
    }

    // Transactions exist — hide placeholder, attempt to render chart
    placeholderEl.style.display = 'none';

    // Chart.js failed to load from CDN
    if (typeof Chart === 'undefined') {
      containerEl.setAttribute('aria-hidden', 'true');
      containerEl.style.display = 'none';
      if (loadErrorEl) {
        loadErrorEl.classList.remove('chart-error--hidden');
      }
      return;
    }

    // Show the canvas container
    containerEl.style.display = '';
    containerEl.setAttribute('aria-hidden', 'false');
    if (loadErrorEl) {
      loadErrorEl.classList.add('chart-error--hidden');
    }

    // Destroy any previous Chart.js instance to avoid "canvas already in use" errors
    if (_chartInstance) {
      _chartInstance.destroy();
      _chartInstance = null;
    }

    var aggregated = ChartService.aggregate(transactions);
    var labels = aggregated.labels;
    var data   = aggregated.data;
    var colors = aggregated.colors;

    // Compute total for percentage calculation in labels and tooltips
    var total = data.reduce(function (sum, v) { return sum + v; }, 0);

    // Register the datalabels plugin only if it loaded from CDN (Requirement 7.2)
    var datalabelsLoaded = typeof ChartDataLabels !== 'undefined';
    if (datalabelsLoaded) {
      Chart.register(ChartDataLabels);
    }

    // Build the plugins config — datalabels only when the CDN script loaded
    var pluginsConfig = {
      legend: {
        display: true,
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            var label      = context.label || '';
            var value      = context.parsed;
            var percentage = total > 0 ? (value / total * 100) : 0;
            return label + ': ' + percentage.toFixed(1) + '%';
          },
        },
      },
    };

    if (datalabelsLoaded) {
      // Persistent segment labels: "Category: XX.X%" (Requirement 7.2)
      pluginsConfig.datalabels = {
        formatter: function (value, context) {
          var pct = total > 0 ? (value / total * 100).toFixed(1) : '0.0';
          return context.chart.data.labels[context.dataIndex] + ': ' + pct + '%';
        },
        color: '#fff',
        font: { size: 12, weight: 'bold' },
        textStrokeColor: '#000',
        textStrokeWidth: 2,
      };
    }

    _chartInstance = new Chart(canvasEl, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
        }],
      },
      options: {
        responsive: true,
        plugins: pluginsConfig,
      },
    });
  }

  /** Apply data-theme to <html> (Task 7.2) */
  function renderTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  /**
   * Display an error message in a role="alert" element (Task 7.2)
   * @param {string}      message
   * @param {HTMLElement} targetEl
   */
  function showError(message, targetEl) {
    if (!targetEl) return;
    targetEl.textContent = message;
    // Remove any CSS hide class that ends with '--hidden' (e.g. alert-banner--hidden, chart-error--hidden)
    var classesToRemove = [];
    for (var i = 0; i < targetEl.classList.length; i++) {
      if (targetEl.classList[i].indexOf('--hidden') !== -1) {
        classesToRemove.push(targetEl.classList[i]);
      }
    }
    classesToRemove.forEach(function (cls) { targetEl.classList.remove(cls); });
  }

  /**
   * Clear an error message from a role="alert" element (Task 7.2)
   * @param {HTMLElement} targetEl
   */
  function clearError(targetEl) {
    if (!targetEl) return;
    targetEl.textContent = '';
    // Re-apply the appropriate hide class based on the element's base class
    if (targetEl.classList.contains('alert-banner')) {
      targetEl.classList.add('alert-banner--hidden');
    } else if (targetEl.classList.contains('chart-error')) {
      targetEl.classList.add('chart-error--hidden');
    }
    // field-error spans have no hide class — clearing textContent is sufficient
  }


  /* ================================================================
     7. EVENT HANDLERS
        Wires DOM events to service calls and render updates.
        Implemented in Tasks 9.1 – 9.5
  ================================================================ */

  /** Transaction form submit (Task 9.1) */
  function handleTransactionSubmit(event) {
    event.preventDefault();

    var nameInput     = document.getElementById('input-name');
    var amountInput   = document.getElementById('input-amount');
    var categorySelect = document.getElementById('select-category');

    var errorNameEl     = document.getElementById('error-name');
    var errorAmountEl   = document.getElementById('error-amount');
    var errorCategoryEl = document.getElementById('error-category');

    var nameVal     = nameInput     ? nameInput.value     : '';
    var amountVal   = amountInput   ? amountInput.value   : '';
    var categoryVal = categorySelect ? categorySelect.value : '';

    // Clear any previous field errors
    clearError(errorNameEl);
    clearError(errorAmountEl);
    clearError(errorCategoryEl);

    var result = TransactionService.validate(nameVal, amountVal, categoryVal);

    if (!result.valid) {
      // Map each error message to the relevant field error container
      result.errors.forEach(function (msg) {
        var lc = msg.toLowerCase();
        if (lc.indexOf('name') !== -1 && errorNameEl) {
          showError(msg, errorNameEl);
        } else if (lc.indexOf('amount') !== -1 && errorAmountEl) {
          showError(msg, errorAmountEl);
        } else if (lc.indexOf('category') !== -1 && errorCategoryEl) {
          showError(msg, errorCategoryEl);
        }
      });
      return; // Do NOT add the transaction
    }

    // Valid — add the transaction and update all state + UI
    var amount = parseFloat(amountVal);
    AppState.transactions = TransactionService.add(AppState, nameVal, amount, categoryVal);
    StorageService.save(AppState);

    renderTransactionList(AppState.transactions, AppState.sortOrder);
    renderBalance(AppState.transactions);
    renderChart(AppState.transactions);

    // Reset the form to its default empty state (Requirement 1.7)
    event.target.reset();
    // reset() restores the native default; also explicitly reset the category to index 0
    if (categorySelect) {
      categorySelect.selectedIndex = 0;
    }
  }

  /** Custom category form submit (Task 9.2) */
  function handleCategorySubmit() {
    var customCategoryInput = document.getElementById('input-custom-category');
    var errorCustomCatEl    = document.getElementById('error-custom-category');

    var nameVal = customCategoryInput ? customCategoryInput.value : '';

    // Clear any previous error
    clearError(errorCustomCatEl);

    var result = CategoryService.validateNew(nameVal, AppState.categories);

    if (!result.valid) {
      showError(result.error, errorCustomCatEl);
      return;
    }

    // Valid — add the category and update all state + UI
    AppState.categories = CategoryService.add(AppState.categories, nameVal);
    StorageService.save(AppState);

    renderCategories(AppState.categories);

    // Clear the input field
    if (customCategoryInput) {
      customCategoryInput.value = '';
    }
  }

  /** Delete button via event delegation on <ul> (Task 9.3) */
  function handleDeleteTransaction(event) {
    // Only handle clicks on delete buttons (or their descendants inside a delete button)
    var btn = event.target.closest
      ? event.target.closest('.btn--delete')
      : (event.target.classList.contains('btn--delete') ? event.target : null);

    if (!btn) return;

    var id = btn.getAttribute('data-id');
    if (!id) return;

    var errorDeleteEl = document.getElementById('error-delete');

    // Requirement 5.5: check localStorage availability before mutating state
    try {
      var testKey = '__ebv_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
    } catch (e) {
      // Storage unavailable — show error, leave state and UI unchanged
      if (errorDeleteEl) {
        showError('Deletion could not be completed: storage is unavailable.', errorDeleteEl);
      }
      return;
    }

    // Clear any previous delete error
    if (errorDeleteEl) {
      clearError(errorDeleteEl);
    }

    // Remove the transaction and persist
    AppState.transactions = TransactionService.remove(AppState, id);
    StorageService.save(AppState);

    // Update all affected UI components (Requirements 5.2, 5.3, 5.4)
    renderTransactionList(AppState.transactions, AppState.sortOrder);
    renderBalance(AppState.transactions);
    renderChart(AppState.transactions);
  }

  /** Sort control change (Task 9.4) */
  function handleSortChange() {
    var sortSelect = document.getElementById('select-sort');
    if (!sortSelect) return;

    AppState.sortOrder = sortSelect.value;
    renderTransactionList(AppState.transactions, AppState.sortOrder);
  }

  /** Theme toggle click (Task 9.5) */
  function handleThemeToggle() {
    // Flip the theme (Requirements 9.2, 9.3)
    AppState.theme = AppState.theme === 'light' ? 'dark' : 'light';

    // Apply the new theme to all UI components immediately (within 100 ms per Req 9.2)
    renderTheme(AppState.theme);

    // Persist the selected theme (Requirement 9.3)
    StorageService.save(AppState);

    // Update the toggle button's aria-label and aria-pressed to reflect the new theme (Req 9.1)
    var toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      if (AppState.theme === 'dark') {
        toggleBtn.setAttribute('aria-label', 'Switch to light mode');
        toggleBtn.setAttribute('aria-pressed', 'true');
      } else {
        toggleBtn.setAttribute('aria-label', 'Switch to dark mode');
        toggleBtn.setAttribute('aria-pressed', 'false');
      }
    }
  }


  /* ================================================================
     8. INITIALIZATION
        Bootstraps the app: load state → render all components → attach events.
        Implemented in Task 9.5
  ================================================================ */
  function init() {
    // ── 1. Load persisted state ────────────────────────────────
    var saved = StorageService.load();

    // ── 2. Populate AppState ───────────────────────────────────
    AppState.transactions = saved.transactions;
    AppState.categories   = saved.categories;
    AppState.theme        = saved.theme;
    // sortOrder stays at its default 'amount-asc' (Requirement 4.2)

    // ── 3–7. Render all components ─────────────────────────────
    renderTheme(AppState.theme);
    renderCategories(AppState.categories);           // Requirements 2.5, 2.6
    renderTransactionList(AppState.transactions, AppState.sortOrder);
    renderBalance(AppState.transactions);
    renderChart(AppState.transactions);

    // ── 8. Show warning banner if load produced an error ───────
    if (AppState.error) {
      var alertEl = document.getElementById('global-alert');
      showError(AppState.error, alertEl);
      AppState.error = null; // consume the transient error
    }

    // ── 9. Attach event listeners ──────────────────────────────

    // Task 9.1: Transaction form
    var formEl = document.getElementById('transaction-form');
    if (formEl) {
      formEl.addEventListener('submit', handleTransactionSubmit);
    }

    // Clear field errors as the user corrects each field (Task 9.1)
    var nameInput       = document.getElementById('input-name');
    var amountInput     = document.getElementById('input-amount');
    var categorySelect  = document.getElementById('select-category');
    var errorNameEl     = document.getElementById('error-name');
    var errorAmountEl   = document.getElementById('error-amount');
    var errorCategoryEl = document.getElementById('error-category');

    if (nameInput && errorNameEl) {
      nameInput.addEventListener('input', function () { clearError(errorNameEl); });
    }
    if (amountInput && errorAmountEl) {
      amountInput.addEventListener('input', function () { clearError(errorAmountEl); });
    }
    if (categorySelect && errorCategoryEl) {
      categorySelect.addEventListener('change', function () { clearError(errorCategoryEl); });
    }

    // Task 9.3: Delete transaction via event delegation on the list
    var transactionListEl = document.getElementById('transaction-list');
    if (transactionListEl) {
      transactionListEl.addEventListener('click', handleDeleteTransaction);
    }

    // Task 9.4: Sort control
    var sortSelect = document.getElementById('select-sort');
    if (sortSelect) {
      sortSelect.addEventListener('change', handleSortChange);
    }

    // Task 9.2: Custom category button
    var addCategoryBtn      = document.getElementById('btn-add-category');
    var customCategoryInput = document.getElementById('input-custom-category');
    var errorCustomCatEl    = document.getElementById('error-custom-category');

    if (addCategoryBtn) {
      addCategoryBtn.addEventListener('click', handleCategorySubmit);
    }

    // Clear custom category error as the user types
    if (customCategoryInput && errorCustomCatEl) {
      customCategoryInput.addEventListener('input', function () { clearError(errorCustomCatEl); });
    }

    // Task 9.5: Theme toggle button (Requirement 9.1, 9.2, 9.3)
    var themeToggleBtn = document.getElementById('theme-toggle');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', handleThemeToggle);

      // Sync initial aria-label and aria-pressed to match the restored theme (Requirement 9.4)
      if (AppState.theme === 'dark') {
        themeToggleBtn.setAttribute('aria-label', 'Switch to light mode');
        themeToggleBtn.setAttribute('aria-pressed', 'true');
      } else {
        themeToggleBtn.setAttribute('aria-label', 'Switch to dark mode');
        themeToggleBtn.setAttribute('aria-pressed', 'false');
      }
    }
  }

  // Kick off the app
  init();

})();
