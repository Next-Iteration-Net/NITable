class NITable extends HTMLElement {
  static _injectStyles() {
    // Check if styles already exist
    if (document.getElementById("ni-table-styles")) {
      return;
    }
    const style = document.createElement("style");
    style.id = "ni-table-styles";
    style.textContent = `
            :root {
                --ni-table-border-color: oklch(0.96 0.0045 78.3);
                --ni-table-highlight-color: oklch(0.8435 0.1399 93.01);
                --ni-table-highlight-border-color: oklch(0.2 0.0418 231.42);
            }
                
            ni-table table {
                max-height: var(--ni-table-max-height, 500px);
                overflow-y: auto;
                display: block;                
                border-collapse: collapse;
            }
            ni-table table tr {
                border: 1px solid var(--ni-table-border-color);
            }
            ni-table table :is(th, td) {
                border: 1px solid var(--ni-table-border-color);
            }
            ni-table thead th[aria-sort="ascending"] button::after {
              content: var(--ni-table-sort-indicator-asc, '↑') / '';
            }
            ni-table thead th[aria-sort="descending"] button::after {
              content: var(--ni-table-sort-indicator-desc, '↓') / '';
            }
            ni-table .active {
                --ni-table-border-color: var(--ni-table-highlight-border-color);
                background-color: var(--ni-table-highlight-color);
                color: var(--brandBlack);
                border-color: --ni-table-highlight-border-color;
                font-weight: bold;
            }
            ni-table th.active {
                --ni-table-highlight-border-color: var(--ni-table-border-color);
            }
            ni-table table tr:nth-child(1) th {
                position: sticky;
                top: 0;
            
                background-color: var(--ni-table-header-bg,  oklch(0.2 0.0418 231.42));
                color: var(--ni-table-header-color, oklch(0.96 0.0045 78.3));
                border: 1px solid var(--ni-table-border-color, oklch(0.96 0.0045 78.3));
            }            
            ni-table table tr > :is(td:nth-child(1), th:nth-child(1)) {
                position: sticky;
                left: 0;
                background-color: var(--ni-table-header-bg,  oklch(0.2 0.0418 231.42));
                color: var(--ni-table-header-color, oklch(0.96 0.0045 78.3));
                z-index: 2;
                border: 1px solid var(--ni-table-border-color, oklch(0.96 0.0045 78.3));
            }
            ni-table table tr > th:nth-child(1) {
                z-index: 3;
                background-color: var(--ni-table-header-bg,  oklch(0.2 0.0418 231.42));
                border: 1px solid var(--ni-table-border-color, oklch(0.96 0.0045 78.3));
                color: var(--ni-table-header-color, oklch(0.96 0.0045 78.3));
                border: 1px solid var(--ni-table-border-color, oklch(0.96 0.0045 78.3));
            }
            ni-table table th button {
                background: transparent;
                border-radius: 0;
                color: inherit;
                font-family: inherit;
                font-size: inherit;
                line-height: inherit;
                text-align: inherit;
                padding: inherit;
                margin: inherit;
                border: none;
                text-transform: inherit;
                font-weight: inherit;
                letter-spacing: inherit;
            }


            /* IF YOU NEED IT */
			table-sortable thead th[aria-sort="ascending"] button::after {
				content: var(--sort-indicator-asc, '↑') / '';
			}
			table-sortable thead th[aria-sort="descending"] button::after {
				content: var(--sort-indicator-desc, '↓') / '';
			}
			table-sortable .table-sortable-description {
				position: absolute;
				width: 1px;
				height: 1px;
				padding: 0;
				margin: -1px;
				overflow: hidden;
				clip: rect(0, 0, 0, 0);
				white-space: nowrap;
				border: 0;
			}
		`;
    document.head.appendChild(style);
  }
  static _findSortKey(cell) {
    if (cell.hasAttribute("data-sort-value")) {
      return cell.getAttribute("data-sort-value");
    }

    const sortKeyElement = cell.querySelector("[data-sort-as]");
    if (sortKeyElement) {
      // Use the sort key element's text, then append the rest of the cell text
      const sortKeyText = sortKeyElement.textContent.trim().toUpperCase();
      const remainingText = cell.textContent
        .replace(sortKeyElement.textContent, "")
        .trim()
        .toUpperCase();
      return sortKeyText + " " + remainingText;
    }

    return cell.textContent.trim().toUpperCase();
  }

  constructor() {
    super();
    this._handleSort = this._handleSort.bind(this);
  }
  connectedCallback() {
    this._scheduleInitialization();
  }
  disconnectedCallback() {
    if (this._pendingInitFrame !== null) {
      cancelAnimationFrame(this._pendingInitFrame);
      this._pendingInitFrame = null;
    }
    this._removeEventListeners();
    if (this._announcementTimeout) {
      clearTimeout(this._announcementTimeout);
    }
  }

  _scheduleInitialization() {
    if (!this.isConnected) {
      return;
    }

    if (this._pendingInitFrame !== null) {
      cancelAnimationFrame(this._pendingInitFrame);
    }

    this._pendingInitFrame = requestAnimationFrame(() => {
      this._pendingInitFrame = null;
      this._initialize();
    });
  }
  _initialize() {
    NITable._injectStyles();
    this._table = this.querySelector("table");
    this._setupAccessibility();
    this._addEventListeners();
  }

  _setupAccessibility() {
    if (!this._table) return;

    const headers = this._table.querySelectorAll("thead th");
    headers.forEach((th) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = th.textContent.trim();
      th.textContent = "";
      th.appendChild(button);
      th.setAttribute("aria-sort", "none");
    });
  }

  _addEventListeners() {
    if (!this._table) return;

    const buttons = this._table.querySelectorAll("thead th button");

    buttons.forEach((button) => {
      button.addEventListener("click", this._handleSort);
      button.addEventListener("keydown", this._handleKeyDown);
    });
  }
  _removeEventListeners() {
    if (!this._table) return;

    const buttons = this._table.querySelectorAll("thead th button");
    buttons.forEach((button) => {
      button.removeEventListener("click", this._handleSort);
      button.removeEventListener("keydown", this._handleKeyDown);
    });
  }

  _handleSort(event) {
    event.preventDefault();

    const button = event.target.closest("button");
    if (!button) return;

    const th = button.closest("th");
    const column = Array.from(th.parentNode.children).indexOf(th);
    const currentDirection = th.classList.contains("up") ? 1 : -1;
    const direction = currentDirection === 1 ? -1 : 1;

    // Sort the table
    this._sortTable(column, direction, th);
  }

  _sortTable(column, direction, activeHeader) {
    if (!this._table) return;

    // Get all rows from tbody elements
    const rows = Array.from(this._table.querySelectorAll("tbody tr"));

    // Remove all tbody elements
    const tbodies = this._table.querySelectorAll("tbody");
    tbodies.forEach((tbody) => tbody.remove());

    // Clear active states and aria-sort
    const allHeaders = this._table.querySelectorAll("thead th");
    allHeaders.forEach((header) => {
      header.classList.remove("active", "up", "down");
      header.setAttribute("aria-sort", "none");
    });

    // Set active state and aria-sort
    activeHeader.classList.add("active", direction === 1 ? "up" : "down");
    activeHeader.setAttribute("aria-sort", direction === 1 ? "ascending" : "descending");

    // Assign sort keys to rows
    rows.forEach((row) => {
      const cell = row.children[column];
      if (!cell) {
        row._sortKey = "";
        return;
      }

      const sortKey = NITable._findSortKey(cell);
      const normalizedSortKey = sortKey.trim();
      const isNumeric = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(normalizedSortKey);
      const numericValue = isNumeric ? Number(normalizedSortKey) : Number.NaN;

      // Use numeric comparison if the value is a valid number
      row._sortKey = Number.isFinite(numericValue) ? numericValue : sortKey;
    });

    // Sort rows
    rows.sort((a, b) => {
      if (a._sortKey < b._sortKey) return -direction;
      if (a._sortKey > b._sortKey) return direction;
      return 0;
    });

    this._appendSingleTbody(rows);
    this._setActiveTDs(column);

    // Clean up sort keys
    rows.forEach((row) => {
      delete row._sortKey;
    });
  }
  _setActiveTDs(column) {
    if (!this._table || !column) return;

    const rows = Array.from(this._table.querySelectorAll("tbody tr"));
    rows.forEach((row) => {
      Array.from(row.children).forEach((cell, cellIndex) => {
        if (cellIndex === column) {
          cell.classList.add("active");
        } else {
          cell.classList.remove("active");
        }
      });
    });
  }
  _appendSingleTbody(rows) {
    const tbody = document.createElement("tbody");
    rows.forEach((row) => {
      tbody.appendChild(row);
    });
    this._table.appendChild(tbody);
  }
}

customElements.define("ni-table", NITable);
