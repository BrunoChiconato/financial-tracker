# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Python-based personal expense tracker with three main services:
- **Telegram Bot** (`bot_service`): Receives expenses via messages, validates input, stores in database
- **PostgreSQL Database** (`db`): Stores expense records with installment support
- **Streamlit Dashboard** (`dashboard_service`): Interactive web UI for expense visualization and analysis

All services run in Docker containers and share a single PostgreSQL database.

## Development Commands

### Docker Operations
```bash
make up              # Start all services (bot, db, dashboard, pgadmin) with build
make down            # Stop all services and remove volumes
make stop            # Stop services WITHOUT removing volumes (preserves data)
make rebuild         # Rebuild and restart services (preserves data)
make restart         # Restart all services without rebuilding
make logs-bot        # Tail bot service logs
make logs-dashboard  # Tail dashboard service logs
make logs-db         # Tail database logs
make prune           # Remove unused Docker images/containers/networks
```

### Code Quality & Testing
```bash
make lint            # Format and lint Python code with Ruff
make clean           # Remove caches and __pycache__ directories
pytest tests/        # Run test suite (requires: uv pip install pytest)
```

### Environment Validation
```bash
make env-check       # Validate required environment variables
```

### Direct Docker Compose
```bash
docker compose up -d --build
docker compose down -v
```

## Architecture & Data Flow

### Core Module (`src/core/`)
Shared business logic used by both bot and dashboard services.

- **`models.py`**: `Expense` dataclass - the central data contract for all expense records
- **`parser.py`**: Text parsing and validation
  - `parse_message()`: Parses Telegram messages into `Expense` objects
  - `br_to_decimal()`: Handles Brazilian currency format (1.234,56)
  - `titleize_pt()`: Title-case with Portuguese grammar rules
  - Canonical value functions: `canon_method()`, `canon_tag()`, `canon_category()`
- **`config.py`**: Environment variables and configuration
  - Loads allowed values from `config/categories.json`
  - Database credentials, bot token, cycle settings
  - `CYCLE_RESET_DAY_OLD = 4`: Old billing cycle day (before Oct 4, 2025)
  - `CYCLE_RESET_DAY_NEW = 17`: New billing cycle day (from Oct 4, 2025)
  - `CYCLE_CHANGE_DATE`: Transition date (Oct 4, 2025)
  - `CYCLE_TRANSITION_END_DATE`: End of transition cycle (Nov 16, 2025)
- **`utils.py`**: Utility functions
  - `get_cycle_reset_day_for_date()`: Returns appropriate cycle day based on date
  - `get_cycle_start()`: Calculates billing cycle start date with transition logic
  - `get_current_and_previous_cycle_dates()`: Cycle boundaries with transition handling
  - `brl()`: Formats Decimal to Brazilian currency string
  - `escape_markdown_v2()`: Telegram message formatting

### Storage Module (`src/storage/`)
- **`repository.py`**: `ExpenseRepository` class - single source of truth for all database operations
  - Uses `psycopg` (PostgreSQL adapter) with async connections
  - Key methods:
    - `add_expense()`: Inserts expense with timestamp
    - `get_total_spent_in_period()`: Calculates sum with installment prorating
    - `get_last_n_expenses()`: Fetches recent entries for `/last` command
    - `delete_last_expense()`: Removes most recent entry for `/undo`
    - `get_all_expenses_as_dataframe()`: Returns pandas DataFrame for dashboard
    - `get_expenses_in_range_as_dataframe()`: Filtered DataFrame by date range
  - All installment logic handled via SQL CTEs (Common Table Expressions)

### Bot Service (`src/bot_service/`)
- **`app.py`**: Bot initialization and command routing
- **`handlers.py`**: Telegram command handlers
  - Text messages → `on_text()` → parse → save → confirm registration
  - `/help`: Display usage instructions with allowed values
  - `/last`: Show last 5 expenses in formatted table
  - `/undo`: Delete most recent expense
  - `/balance`: Show current cycle spending (invoice month and period)
  - `/health`: Check database connectivity
  - All commands check `ALLOWED_USER_ID` via `ensure_auth()`

### Dashboard Service (`src/dashboard_service/`)
- **`streamlit_app.py`**: Interactive expense dashboard
  - Filtering: date range, categories, tags, text search
  - Two filter modes: specific dates or billing month (invoice month)
  - Charts: spending by category (horizontal bar), spending by tag (pie chart)
  - Month-over-Month (MoM) comparison: compares current period with previous period
  - Metrics: total spent, daily average, number of entries
  - Summary tables with MoM variation by category/tag
  - Detailed table with all filtered expenses
  - `billing_cycle_range()`: Calculates cycle dates for invoice month filtering with transition support

### Database (`db/init/schema.sql`)
Single table: `public.expenses`
- Fields: `id`, `expense_ts`, `amount`, `description`, `method`, `tag`, `category`, `installments`
- Constraints enforce valid payment methods, tags, and categories
- Indexes on: `expense_ts`, `method`, `tag`, `category`
- Installments stored as integer, prorated via SQL during queries

## Key Concepts

### Billing Cycle Logic
The system implements a **transitional billing cycle** that changed on October 4, 2025:

#### Old Logic (Before October 4, 2025)
- Cycle runs from the **4th to 3rd** of the next month
- Example: Sept 4 - Oct 3, 2025 (invoice month: October)
- Last old cycle: Sept 4 - Oct 3, 2025

#### Transition Cycle (October 4 - November 16, 2025)
- **44-day special cycle** bridging old and new schedules
- Oct 4 - Nov 16, 2025 (invoice month: November)
- Handles the shift from day 4 to day 17

#### New Logic (From November 17, 2025 onwards)
- Cycle runs from the **17th to 16th** of the next month
- Examples:
  - Nov 17 - Dec 16, 2025 (invoice month: December)
  - Dec 17 - Jan 16, 2026 (invoice month: January)
  - Jan 17 - Feb 16, 2026 (invoice month: February)

#### Implementation Details
- `get_cycle_reset_day_for_date()`: Returns 4 for dates before Oct 4, 2025; 17 after
- `get_cycle_start()`: Calculates cycle start with transition handling
- `get_current_and_previous_cycle_dates()`: Returns current and previous cycles, handling cross-transition scenarios
- Dashboard filters by "invoice month" (the month when the cycle ends)
- All historical data before Oct 4, 2025 uses old logic - **no retroactive changes**

### Installment Handling
- Expenses with `installments > 1` are prorated across months in SQL queries
- Original record stored once with total amount
- CTEs in repository methods generate virtual rows for each installment month
- Dashboard and balance calculations automatically include prorated amounts

### Input Format
Telegram messages use 5-6 parts separated by `-`, `,`, `;`, or `|`:
```
Amount - Description - Method - Tag - Category [- Installments]
```
Example: `35,50 - Uber - Cartão de Crédito - Gastos Pessoais - Transporte`

### Configuration File
`config/categories.json` defines allowed values for:
- Payment methods (Pix, Cartão de Crédito, Cartão de Débito, Boleto)
- Tags (Gastos Pessoais, Gastos do Casal, Gastos de Casa)
- Categories (Alimentação, Transporte, etc.)

Modify this file to add/change allowed values. Database constraints must be updated separately in `schema.sql`.

## Environment Setup

Required variables in `.env`:
- `POSTGRES_PASSWORD`, `POSTGRES_USER`, `POSTGRES_DB`: Database credentials
- `TELEGRAM_BOT_TOKEN`: Bot token from @BotFather
- `ALLOWED_USER_ID`: Numeric Telegram user ID for authentication
- `TZ`: Timezone (e.g., America/Sao_Paulo)
- `CYCLE_RESET_DAY`: Legacy cycle day variable (kept for backward compatibility, actual cycle logic uses hardcoded dates in config.py)

## Testing

### Service Testing
- **Bot**: Send test message to Telegram bot
- **Dashboard**: Access http://localhost:8501
- **Database**: Use pgAdmin at http://localhost:5050 or connect via psql
- **Health check**: Send `/health` command to bot

### Unit Tests
The project includes comprehensive unit tests for the billing cycle logic:
- **Location**: `tests/test_billing_cycle.py`
- **Coverage**: 36 tests covering old logic, transition period, new logic, and edge cases
- **Run tests**: `python -m pytest tests/test_billing_cycle.py -v`
- **Test configuration**: `tests/conftest.py` sets up test environment variables
- **Dependencies**: pytest (install with `uv pip install pytest`)

## Common Patterns

### Adding a new category/tag/method
1. Update `config/categories.json`
2. Update database constraint in `db/init/schema.sql`
3. Rebuild and restart: `make down && make up`

### Adding a new bot command
1. Define handler in `src/bot_service/handlers.py`
2. Register in `src/bot_service/app.py`
3. Add to `/help` command text

### Adding a new dashboard chart
1. Edit `src/dashboard_service/streamlit_app.py`
2. Use existing DataFrame from `repository.get_expenses_in_range_as_dataframe()`
3. Apply filters and groupby operations
4. Render with Plotly or Streamlit built-in charts

### Modifying expense parsing
1. Update `parse_message()` in `src/core/parser.py`
2. Update `Expense` dataclass in `src/core/models.py` if fields change
3. Update database schema if new fields needed
4. Update repository queries to handle new fields

### Modifying billing cycle logic
1. Update constants in `src/core/config.py` (`CYCLE_CHANGE_DATE`, `CYCLE_TRANSITION_END_DATE`, etc.)
2. Update logic in `src/core/utils.py` functions:
   - `get_cycle_reset_day_for_date()`
   - `get_cycle_start()`
   - `get_current_and_previous_cycle_dates()`
3. Update `billing_cycle_range()` in `src/dashboard_service/streamlit_app.py`
4. **CRITICAL**: Update tests in `tests/test_billing_cycle.py` to cover new scenarios
5. Run test suite to verify: `python -m pytest tests/test_billing_cycle.py -v`
6. Restart services: `make restart` or `make rebuild`

## Recent Changes & Features

### October 2025 - Billing Cycle Transition
- **Breaking Change**: Billing cycle changed from 4th-3rd to 17th-16th starting Oct 4, 2025
- Added 44-day transition cycle (Oct 4 - Nov 16, 2025)
- All historical data preserved with old logic
- Comprehensive test suite added (36 tests)
- Updated dashboard invoice month filtering to handle transition

### Removed Features
- **Spending Cap**: The monthly spending limit feature has been removed from the application
  - No cap enforcement in bot or dashboard
  - No cap-related database fields or queries
  - Users can track spending without automated limits

## Code Documentation and Commenting Style

**Primary Rule: Document with Docstrings**
- Your primary method for documenting code MUST be through docstrings (e.g., Python's `"""docstrings"""`, Java/JS's `/** JSDoc */`).
- Every function, class, and module you create or modify should have a clear and comprehensive docstring that explains its purpose, arguments, and return values.

**Inline Comments: Restricted Use Only**
- You MUST AVOID using inline comments (like `#` or `//`) to explain *what* a line of code is doing. The code itself should be readable and self-explanatory.
- You are only permitted to use inline comments in two specific scenarios:
    1.  **Standard Markers:** For universally recognized markers such as `TODO:`, `FIXME:`, `NOTE:`, or `HACK:`.
    2.  **Explaining the "Why":** To clarify the reasoning behind a non-obvious or complex implementation detail, business rule, or optimization choice. The comment should explain *why* the code is written that way, not *what* it does.

**Example of Forbidden Comment:**
```python
# Increment the counter
counter += 1
```

**Example of Permitted Comment:**
```python
# HACK: We must process this array in reverse to avoid a race condition
# caused by the legacy API. See ticket #1234 for details.
for item in reversed(items):
    process(item)
```