# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project-Specific Rules

These rules override default behavior and must be followed exactly:

### Rule 1: Billing Cycle Modifications Require Test Updates
**Context:** The billing cycle logic is complex with transition periods and historical constraints.
**Requirement:** ANY change to billing cycle constants (`CYCLE_CHANGE_DATE`, `CYCLE_TRANSITION_END_DATE`) or functions (`get_cycle_start()`, `get_current_and_previous_cycle_dates()`) MUST include:
1. Updates to `tests/test_billing_cycle.py` covering the new scenario
2. Running the full test suite: `python -m pytest tests/test_billing_cycle.py -v`
3. Documenting the change in the "Billing Cycle Logic" section of this file

**Rationale:** Billing cycle errors cause financial discrepancies that are hard to detect and expensive to fix.

### Rule 2: Database Schema Changes Require Multi-Step Coordination
**Context:** Four services share one database (bot, backend API, pgAdmin).
**Requirement:** When modifying `db/init/schema.sql`:
1. Update `config/categories.json` if adding allowed values
2. Update all query methods in `src/storage/repository.py` (Python)
3. Update all query modules in `backend/queries/` (Node.js)
4. Update `src/core/models.py` if adding/removing fields
5. Run `make down && make up` to recreate database with new schema
6. Verify changes in React dashboard

**Rationale:** Schema mismatches cause runtime errors in multiple services.

### Rule 3: New API Endpoints Must Follow Existing Patterns
**Context:** The backend API uses consistent parameter handling and query structure.
**Requirement:** New endpoints in `backend/index.js` must:
1. Accept filters via query parameters: `startDate`, `endDate`, `categories[]`, `tags[]`, `methods[]`
2. Use `parseDateFilters()` utility for parameter extraction
3. Apply installment expansion via `getInstallmentDistributionCTE()`
4. Return JSON with consistent structure (e.g., `{ data: [...] }`)
5. Include error handling with descriptive messages

**Rationale:** Consistency reduces frontend complexity and prevents bugs.

### Rule 4: Frontend Components Must Use Existing Utilities
**Context:** The React frontend has established patterns for common tasks.
**Requirement:** When creating new components in `frontend/src/components/`:
1. Use `formatCurrency()` from `utils/formatters.js` for all monetary values
2. Use `Chip.jsx` for badges (categories, tags, methods)
3. Use `SectionTitle.jsx` for section headers
4. Apply Tailwind classes only (no custom CSS files)
5. Implement loading states with opacity transitions (not spinners)
6. Support dark mode by adding `dark:` prefixed Tailwind classes for all color-related styles

**Rationale:** Visual consistency and code reusability.

### Rule 5: Installment Logic Must Use SQL CTEs (Not Application Code)
**Context:** Installment distribution is handled in SQL for consistency across services.
**Requirement:** When querying expenses with installments:
1. Use recursive CTEs from `getInstallmentDistributionCTE()` (Node.js) or repository methods (Python)
2. NEVER calculate prorated amounts in application code (Python/JS)
3. Filter by `period_month` in the CTE result, not by `expense_ts`

**Rationale:** Single source of truth for installment calculations prevents discrepancies.

### Rule 6: Telegram Bot Commands Must Check Authorization
**Context:** The bot is user-specific and must reject unauthorized access.
**Requirement:** All command handlers in `src/bot_service/handlers.py` must:
1. Call `ensure_auth(update)` before processing
2. Return early with error message if unauthorized
3. Log unauthorized access attempts

**Rationale:** Security and privacy.

### Rule 7: Environment Variables Must Have Defaults or Validation
**Context:** Missing environment variables cause cryptic errors.
**Requirement:** When adding new environment variables:
1. Document in `.env.example` with explanation
2. Add to "Environment Setup" section of this file
3. Provide default value in `src/core/config.py` when safe (backend uses env vars directly in `backend/index.js`)
4. Add validation in `make env-check` target if critical

**Rationale:** Easier onboarding and clearer error messages.

### Rule 8: MoM Comparisons Must Handle Transition Cycles
**Context:** Month-over-Month calculations span different billing cycle lengths.
**Requirement:** When implementing trend analysis:
1. Use `getPreviousPeriod()` (Node.js) or `get_current_and_previous_cycle_dates()` (Python)
2. NEVER assume cycles are exactly 30 days (transition cycle is 44 days)
3. Calculate daily average when comparing unequal periods
4. Clearly label "Invoice Month" vs. calendar month in UI

**Rationale:** Accurate financial insights during transition period.

### Rule 9: All Monetary Values Must Use 2 Decimal Places
**Context:** Currency formatting inconsistencies confuse users.
**Requirement:** When displaying amounts:
1. Use `formatCurrency()` (React) or `brl()` (Python) for all values
2. ALWAYS format to exactly 2 decimal places (e.g., "R$ 1.234,56")
3. Never display raw Decimal or float values in UI
4. Use Decimal type for calculations (not float) to avoid precision errors

**Rationale:** Financial accuracy and professional presentation.

### Rule 10: Monthly Budget Cap Calculations Must Be Environment-Driven
**Context:** Monthly budget caps are calculated based on business income, accounting fees, and tax deductions.
**Requirement:** When working with budget cap logic:
1. All calculation parameters must come from environment variables (11 CAP_* variables)
2. Use `calculateMonthlyCap()` from `backend/utils/capCalculation.js` (Node.js)
3. NEVER hardcode hourly rates, tax percentages, or accounting fees
4. Cap calculation accounts for:
   - Business days worked (including special month overrides like `CAP_OCTOBER_BUSINESS_DAYS`)
   - Business-day holidays (configured in `config/holidays.json` by CALENDAR month, starting November 2025)
   - Accounting fees starting from a specific month
   - DAS, Pro Labore, and INSS percentages
   - First discount (percentage, optional - can be 0) and second discount (fixed amount)
5. The `/api/cap/:year/:month` endpoint provides detailed cap breakdown for dashboard display
6. Holidays are subtracted from business days: `businessDaysWorked = totalBusinessDays - holidays`
7. **CRITICAL:** Holidays in `config/holidays.json` use CALENDAR month (where work happens), NOT invoice month

**Rationale:** Budget caps are business-specific calculations that must remain configurable and auditable.

---

## Recent Changes (October 2025)

### Cap Calculation Simplification
**Date:** October 26, 2025
**Change:** Removed the 10% first discount from monthly budget cap calculation.

**What changed:**
- `.env`: Set `CAP_FIRST_DISCOUNT_PERCENT=0` (previously 0.10)
- `.env.example`: Updated default to 0 with clarification that it can be disabled
- Documentation: Updated formula from "Net Cap = Net After Deductions - First Discount - Second Discount" to "Net Cap = Net After Deductions - Second Discount"

**Impact:**
- Monthly budget cap increased by ~10% of net revenue
- R$1000 fixed discount (second discount) still applies
- All cap calculation tests passing (88/88)

### Brazil Timezone Implementation (CRITICAL)
**Date:** October 26, 2025
**Change:** All billing cycle date filtering now uses Brazil timezone instead of UTC.

**What changed:**
- `backend/queries/installments.js`: All 6 SQL query functions now use `(expense_ts AT TIME ZONE 'America/Sao_Paulo')::date`
- `frontend/`: Date display uses browser local timezone (Brazil time for Brazil-based users)
- Tests: Updated to use noon UTC timestamps to avoid date conversion issues
- Documentation: Added comprehensive timezone handling section

**Why this matters:**
- **Before**: An expense at 21:00 Brazil time would be counted as the next day (due to UTC conversion)
- **After**: All expenses correctly assigned to billing months based on Brazil local time
- **Example**: Oct 3, 2025 21:56 Brazil time is correctly excluded from Nov 2025 cycle (starts Oct 4 Brazil time)

**Impact:**
- Billing cycle boundaries now respect Brazil local time (midnight to midnight)
- No more confusion about date boundaries
- Oct 3 late-night expenses correctly belong to Oct invoice month, not Nov
- All 88 backend tests passing after timezone adjustments

---

## Quick Start Guide

**For New Developers:**
1. **Prerequisites**: Docker, Docker Compose, Git
2. **Clone**: `git clone <repo-url> && cd financial-tracker`
3. **Configure**: `cp .env.example .env` and fill in required values (see "Environment Setup")
4. **Start**: `make up` (starts all services with build)
5. **Test bot**: Send expense to Telegram bot (format: `35,50 - Uber - Cartão de Crédito - Gastos Pessoais - Transporte`)
6. **View data**: Open http://localhost:5173

**Common First Tasks:**
- Add test data via Telegram bot (`/help` for format)
- Explore dashboards and filters
- Check logs: `make logs-bot`, `make logs-backend`
- Run tests: `make test-all` (runs all 434 tests)
- Review codebase starting with `src/core/` (shared logic)
- Explore test suites: Python, Backend, Frontend (all with 100% pass rate)

**Recommended Learning Path:**
1. Read "Project Overview" and "Key Concepts" sections
2. Study "Architecture & Data Flow" to understand module interactions
3. Review "Billing Cycle Logic" (critical for understanding date ranges)
4. Experiment with bot commands: `/last`, `/balance`, `/undo`
5. Modify a category in `config/categories.json` and rebuild

---

## Project Overview

A full-stack personal expense tracker with multiple interface options:
- **Telegram Bot** (`src/bot_service/`): Receives expenses via messages, validates input, stores in database
- **PostgreSQL Database** (`db`): Stores expense records with installment support and billing cycle transition logic
- **React Dashboard** (`frontend/`): Modern UI with enhanced UX, color-coded visualizations, and smooth interactions (recommended)
- **Express API** (`backend/`): RESTful Node.js backend serving the React dashboard
- **Streamlit Dashboard** (`src/dashboard_service/`): Legacy Python-based UI with basic visualizations (optional, not in docker-compose)

All services share a single PostgreSQL database.

**Dashboard Comparison:**
- **React Dashboard** (Recommended):
  - Port: 5173 (Vite dev server) or 80 (production nginx)
  - Modern responsive design with dark mode
  - Real-time updates and smooth transitions
  - Advanced filtering and search capabilities
  - Included in docker-compose.yml
- **Streamlit Dashboard** (Legacy):
  - Port: 8501
  - Simple Python-based UI
  - Basic charts and tables
  - NOT included in docker-compose.yml (must run manually)
  - Location: `src/dashboard_service/streamlit_app.py`
  - Run with: `cd src/dashboard_service && streamlit run streamlit_app.py`

**Technology Stack:**
- **Backend**: Python 3.13 (bot), Node.js 20 (Express API)
- **Frontend**: React 19 + Vite 7 + Tailwind CSS 3.4
- **Database**: PostgreSQL 16
- **Infrastructure**: Docker + Docker Compose

---

## Development Commands

### Docker Operations
```bash
make up              # Start all services (bot, db, backend, frontend, pgadmin) with build
make stop            # Stop all services (preserves data and volumes)
make rebuild         # Rebuild and restart services (preserves data)
make restart         # Restart all services without rebuilding
make logs-bot        # Tail bot service logs
make logs-backend    # Tail backend API service logs
make logs-frontend   # Tail frontend service logs
make logs-db         # Tail database logs
make backup          # Create database backup
make restore         # Restore database from backup
make env-check       # Validate required environment variables
```

**CRITICAL DATA SAFETY:**
- The Makefile contains NO commands that delete volumes or data
- All operations preserve the database
- NEVER manually run `docker compose down -v` or `docker volume rm` commands
- Always use `make backup` before any significant changes

### Code Quality & Testing
```bash
make lint            # Format and lint Python code with Ruff
make lint-backend    # Lint backend Node.js code with Prettier
make lint-frontend   # Lint frontend React code with ESLint and Prettier
make lint-all        # Run all linters (Python, backend, frontend)
make clean           # Remove caches (Python, Node.js, React, test coverage)
make test-python     # Run Python test suite (126 tests)
make test-backend    # Run backend Node.js tests (88 tests)
make test-frontend   # Run frontend React tests (220 tests)
make test-all        # Run all tests (434 tests total)
make ci              # Run all linters and tests (for CI pipeline)
pytest tests/test_billing_cycle.py -v  # Run specific test file
```

### Local Development (Without Docker)
```bash
cd backend && npm run dev               # Backend on :3001
cd frontend && npm run dev              # Frontend on :5173
# Python services still need database
```

---

## Agent System

The project includes specialized AI agents in `.claude/agents/` for automated tasks:

### Available Agents

**test-doctor** - Test remediation specialist
- **Purpose**: Automatically diagnose and fix failing tests across all suites (Python, Backend, Frontend)
- **When to use**: When you have failing tests and need comprehensive analysis and fixes
- **Capabilities**: Analyzes test output, identifies root causes, applies fixes, verifies solutions
- **Usage**: Mentioned in troubleshooting section (line 755, 897)

**repo-auditor** - Repository documentation auditor
- **Purpose**: Analyzes codebase and compares against documentation to find gaps and inconsistencies
- **When to use**: Periodic documentation audits or before major releases
- **Capabilities**: Scans all code, identifies undocumented features, finds outdated references
- **Output**: Structured report with priorities (critical, medium, low)

**repo-remediator** - Repository issue remediation
- **Purpose**: Automatically fixes code issues, applies best practices, and resolves technical debt
- **When to use**: After audits identify issues that need fixing
- **Capabilities**: Multi-file edits, refactoring, dependency updates
- **Usage**: Follow-up action after repo-auditor findings

**git-conventional-committer** - Commit message generator
- **Purpose**: Creates conventional commit messages following project standards
- **When to use**: When committing changes that need descriptive, standardized messages
- **Capabilities**: Analyzes git diff, generates semantic commit messages, follows conventions
- **Format**: Follows Angular/Conventional Commits specification

### How to Invoke Agents

Agents are invoked through Claude Code's Task tool system. They run autonomously and return results when complete.

**Note**: Agents see the full conversation history and can reference previous context. They have access to all file operations (Read, Edit, Write, Glob, Grep, Bash) but work independently.

### Agent Configuration

Agent settings are configured in `.claude/settings.json` which defines:
- Agent timeout limits
- Tool permissions
- Model preferences (haiku for quick tasks, sonnet for complex analysis)

---

## Architecture & Data Flow

### Core Module (`src/core/`)
Shared business logic used by both bot and dashboard services.

- **`models.py`**: `Expense` dataclass - the central data contract for all expense records
- **`parser.py`**: Text parsing and validation
  - `parse_message()`: Parses Telegram messages into `Expense` objects
  - `br_to_decimal()`: Handles Brazilian currency format (1.234,56), supports negative values
  - Validates negative amounts cannot have multiple installments (rejects if `amount < 0 and installments > 1`)
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
  - Key methods: `add_expense()`, `get_total_spent_in_period()`, `get_last_n_expenses()`, `delete_last_expense()`, `get_all_expenses_as_dataframe()`, `get_expenses_in_range_as_dataframe()`
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

### Backend API (`backend/`)
- **`index.js`**: Express server and API endpoint definitions
- **`db.js`**: PostgreSQL connection pool management
- **`queries/installments.js`**: Complex SQL queries with recursive CTEs for installment distribution
  - **CRITICAL**: Uses `(expense_ts AT TIME ZONE 'America/Sao_Paulo')::date` for Brazil timezone date filtering
  - All billing cycle boundaries respect Brazil local time, not UTC
- **`utils/billingCycle.js`**: Billing cycle calculations (matches Python logic)
- **`utils/capCalculation.js`**: Monthly budget cap calculation logic
- **`utils/formatters.js`**: Currency and number formatting
- **`utils/logger.js`**: Winston-based logging system
  - Configurable log levels (info, warn, error, debug)
  - Structured logging with timestamps
  - Console output for development, file output for production
  - Request/response logging for API debugging
- **`middleware/validation.js`**: Request validation middleware
  - Date format validation (YYYY-MM-DD)
  - Required parameter checking
  - Array parameter handling (categories[], tags[], methods[])
  - Descriptive error responses for invalid requests

**API Endpoints:**
- `GET /api/health` - Database connectivity check
- `GET /api/filters/metadata` - Filter options initialization
- `GET /api/expenses` - Filtered transaction list with installment expansion
- `GET /api/summary` - KPI cards (total, daily avg, count) with MoM
- `GET /api/charts/category` - Top 10 categories
- `GET /api/charts/tag` - Tag distribution
- `GET /api/trends/mom` - Month-over-month comparison table
- `GET /api/cap/:year/:month` - Monthly budget cap calculation

### Frontend (`frontend/src/`)
- **`App.jsx`**: Main layout and component composition
- **`hooks/useFinanceData.js`**: Central state management hook for filters and API calls
- **`services/apiService.js`**: Abstracted API client (Axios-based)
- **`utils/billingCycle.js`**: Frontend billing cycle calculations
- **`utils/formatters.js`**: Currency, date, and number formatting
- **`context/DarkModeContext.jsx`**: Dark mode state with localStorage persistence

**Key Components:**
- `HeroSection.jsx`: Monthly budget card + 3 KPI cards with MoM trends
- `Filters.jsx`: Collapsible filter sidebar with debounced search
- `FilterGroup.jsx`: Reusable filter group component for checkboxes (used by Filters)
- `CategoryChart.jsx`, `TagChart.jsx`: Bar chart visualizations
- `BarRow.jsx`: Individual bar chart row component (used by chart components)
- `TrendsTable.jsx`: MoM comparison table with arrow indicators
- `TransactionsTable.jsx`: Sortable and filterable transaction table
- `DarkModeToggle.jsx`: Theme switcher component with localStorage persistence
- `Chip.jsx`, `SectionTitle.jsx`, `KpiCard.jsx`: Atomic UI components

### Database (`db/init/schema.sql`)
Single table: `public.expenses`
- Fields: `id`, `expense_ts`, `amount`, `description`, `method`, `tag`, `category`, `installments`, `parsed`
- `amount` field: NUMERIC(12,2) supporting both positive and negative values (for refunds/chargebacks)
- Constraints enforce valid payment methods, tags, and categories
- Indexes on: `expense_ts`, `method`, `tag`, `category`
- Installments stored as integer, prorated via SQL during queries

### Data Flow

**Input Path (Telegram → Database):**
1. User sends message to Telegram bot
2. `handlers.py:on_text()` → `parser.py:parse_message()`
3. Parser validates and canonicalizes fields
4. `ExpenseRepository.add_expense()` inserts into PostgreSQL (timestamp stored with Brazil timezone offset)
5. Bot responds with confirmation

**Output Path (Database → Frontend):**
1. React app calls `useFinanceData()` hook
2. Hook calls `apiService` functions
3. Backend Express API receives request
4. `queries/installments.js` generates SQL with recursive CTEs
5. **SQL filters use Brazil timezone**: `(expense_ts AT TIME ZONE 'America/Sao_Paulo')::date`
6. CTEs expand installments across billing cycles
7. Backend returns filtered/aggregated data
8. Frontend renders charts and tables in user's local timezone

---

## Timezone Handling (CRITICAL)

The system uses **Brazil timezone (America/Sao_Paulo, UTC-3)** for all billing cycle boundaries and date filtering. This is essential because expenses are tracked and input in Brazil local time.

### Implementation Details

**Database:**
- PostgreSQL timezone set to `America/Sao_Paulo`
- Timestamps stored with timezone offset (e.g., `2025-10-03 21:56:27-03`)
- All date comparisons use Brazil timezone conversion

**Backend (`backend/queries/installments.js`):**
- All SQL queries use: `(expense_ts AT TIME ZONE 'America/Sao_Paulo')::date`
- Date boundaries calculated in Brazil time, not UTC
- Example: Nov 2025 cycle = Oct 4 00:00 to Nov 16 23:59 **Brazil time**

**Frontend:**
- Displays dates in user's browser local timezone (Brazil time for Brazil-based users)
- Date pickers and filters send dates as YYYY-MM-DD strings
- Backend interprets these as Brazil timezone dates

**Critical Example:**
- Expense at `2025-10-03 21:56:27-03` (Oct 3, 21:56 Brazil time)
- UTC equivalent: `2025-10-04 00:56:27Z` (Oct 4, 00:56 UTC)
- **Billing cycle filter**: Uses Brazil date (Oct 3) → Excluded from Nov 2025 cycle ✓
- **Dashboard display**: Shows Oct 3, 21:56 (local time) ✓

### Why This Matters

Without Brazil timezone filtering, date boundaries would be off by 3 hours:
- ❌ Expense at 21:00 Brazil time would count as next day (midnight UTC)
- ❌ Billing cycles would start/end at 21:00 local time instead of midnight
- ❌ Month-end expenses would be incorrectly assigned to next month

With Brazil timezone filtering:
- ✅ All boundaries respect Brazil local time (midnight to midnight)
- ✅ Expenses assigned to correct billing month based on when they occurred locally
- ✅ No confusion about which day an expense belongs to

---

## Key Concepts

### Billing Cycle Logic
The system implements a **transitional billing cycle** that changed on October 4, 2025. **All dates and boundaries use Brazil timezone (America/Sao_Paulo).**

#### Old Logic (Before October 4, 2025)
- Cycle runs from the **4th to 3rd** of the next month (Brazil time)
- Example: Sept 4 00:00 - Oct 3 23:59, 2025 Brazil time (invoice month: October)
- Last old cycle: Sept 4 - Oct 3, 2025

#### Transition Cycle (October 4 - November 16, 2025)
- **44-day special cycle** bridging old and new schedules
- Oct 4 00:00 - Nov 16 23:59, 2025 Brazil time (invoice month: November)
- Handles the shift from day 4 to day 17

#### New Logic (From November 17, 2025 onwards)
- Cycle runs from the **17th to 16th** of the next month (Brazil time)
- Examples:
  - Nov 17 00:00 - Dec 16 23:59, 2025 Brazil time (invoice month: December)
  - Dec 17 00:00 - Jan 16 23:59, 2026 Brazil time (invoice month: January)

#### Implementation Details
- **CRITICAL**: All cycle boundaries use Brazil timezone, not UTC
- `get_cycle_reset_day_for_date()`: Returns 4 for dates before Oct 4, 2025; 17 after
- `get_cycle_start()`: Calculates cycle start with transition handling
- `get_current_and_previous_cycle_dates()`: Returns current and previous cycles, handling cross-transition scenarios
- `getPreviousPeriod()` (backend): Uses `billingCycleRange()` to correctly calculate previous invoice month dates
- Backend SQL filters: `(expense_ts AT TIME ZONE 'America/Sao_Paulo')::date`
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

**Negative Values (Refunds/Chargebacks):**
The system supports negative amounts for registering refunds, chargebacks, or credits:
- Format: `-150,50 - Estorno Uber - Pix - Gastos Pessoais - Transporte`
- Negative values reduce the total spent (net calculation)
- **CRITICAL**: Negative values CANNOT have multiple installments (only 1x or no installments)
- Parser validation rejects negative amounts with `installments > 1`
- Use cases: Reimbursements, chargebacks, returned items, credits received
- Display: Mixed with regular expenses, reducing totals in all metrics

### Configuration Files

**`config/categories.json`** - Defines allowed values for:
- Payment methods (Pix, Cartão de Crédito, Cartão de Débito, Boleto)
- Tags (Gastos Pessoais, Gastos do Casal, Gastos de Casa)
- Categories (Alimentação, Transporte, etc.)

Modify this file to add/change allowed values. Database constraints must be updated separately in `schema.sql`.

**`config/holidays.json`** - Stores business-day holidays per calendar month:
- Format: `{ "2025": { "11": 2, "12": 3 }, "2026": { "1": 1 } }`
- Keys are calendar year and calendar month (1-12) where business days are counted
- Values are the number of non-working days (holidays) in that calendar month
- **CRITICAL - Calendar Month Logic:** Holidays are stored by CALENDAR MONTH, which is `invoice_month - 1`
- **Examples to clarify:**
  - December 2025 invoice month (Nov 17 - Dec 16 billing cycle) → Business days counted in **November** → Use `"2025": { "11": <holidays> }`
  - January 2026 invoice month (Dec 17 - Jan 16 billing cycle) → Business days counted in **December** → Use `"2025": { "12": <holidays> }`
  - November 2025 invoice month (Oct 4 - Nov 16 transition cycle) → Business days counted in **October** → Use `"2025": { "10": <holidays> }`
- **Why calendar month?** Cap calculation counts business days in the calendar month where work actually occurs (typically the month before invoice)
- Includes Brazilian national/bank holidays and personal non-working days
- Starting from November 2025, holidays are subtracted from business days in cap calculation
- Missing entries default to 0 holidays
- **Backend implementation**: `backend/utils/capCalculation.js` converts `invoiceMonth` to `calendarMonth` via `invoiceMonth - 1` before looking up holidays

### Monthly Budget Cap Calculation
The system calculates a monthly spending cap based on business income and deductions:

**Formula:**
1. Total Business Days = Weekdays in calendar month (Mon-Fri)
2. Business Days Worked = Total Business Days - Holidays (from `config/holidays.json`)
3. Gross Income = Hourly Rate × Daily Hours × Business Days Worked
4. Total Deductions = Accounting Fee + DAS + Pro Labore + INSS
5. Net After Deductions = Gross Income - Total Deductions
6. Net Cap = Net After Deductions - Second Discount (First Discount currently set to 0)

**Special Considerations:**
- Holidays are configured in `config/holidays.json` starting from November 2025
- Accounting fee only applies from `CAP_ACCOUNTING_START_MONTH/YEAR` onwards
- October 2025 has special business day override (`CAP_OCTOBER_BUSINESS_DAYS`) due to transition cycle
- All percentages stored as decimals (e.g., 0.06 for 6%)
- Cap calculation respects billing cycle dates (not calendar month)
- Frontend displays holiday breakdown: "Dias úteis trabalhados: 18 (20 disponíveis - 2 feriados)"

---

## Environment Setup

Required variables in `.env`:

**Database:**
- `POSTGRES_PASSWORD`, `POSTGRES_USER`, `POSTGRES_DB`: Database credentials
- `DB_HOST`, `DB_PORT`: Database connection details

**Telegram Bot:**
- `TELEGRAM_BOT_TOKEN`: Bot token from @BotFather
- `ALLOWED_USER_ID`: Numeric Telegram user ID for authentication
- `TZ`: Timezone (e.g., America/Sao_Paulo)

**Monthly Budget Cap (11 variables):**
- `CAP_HOURLY_RATE`: Hourly billing rate
- `CAP_DAILY_HOURS`: Expected work hours per day
- `CAP_ACCOUNTING_FEE`: Monthly accounting service fee
- `CAP_ACCOUNTING_START_MONTH`, `CAP_ACCOUNTING_START_YEAR`: When accounting fees began
- `CAP_DAS_PERCENT`: DAS tax percentage (as decimal, e.g., 0.06 for 6%)
- `CAP_PRO_LABORE_PERCENT`: Pro labore percentage
- `CAP_INSS_PERCENT`: INSS tax percentage
- `CAP_FIRST_DISCOUNT_PERCENT`: First discount percentage (set to 0 to disable)
- `CAP_SECOND_DISCOUNT_FIXED`: Second discount fixed amount
- `CAP_START_MONTH`, `CAP_START_YEAR`: When budget cap tracking started
- `CAP_OCTOBER_BUSINESS_DAYS`: Override for October 2025 business days (transition month)

**pgAdmin:**
- `PGADMIN_DEFAULT_EMAIL`, `PGADMIN_DEFAULT_PASSWORD`: Admin UI credentials

**Legacy:**
- `CYCLE_RESET_DAY`: Kept for backward compatibility (actual cycle logic uses hardcoded dates in config.py)

---

## Testing

### Comprehensive Test Suite
The project maintains a complete test suite with **100% pass rate**:

**Test Coverage by Suite:**
- **Python (pytest)**: 126 tests
  - Billing cycle logic (36 tests): old/transition/new cycles, edge cases
  - Message parsing and validation (43 tests): Brazilian currency format, canonicalization
  - Authorization logic (10 tests)
  - Utility functions (26 tests): BRL formatting, Markdown escaping
  - Invoice month calculations (11 tests)

- **Backend (Jest/Node.js)**: 88 tests
  - API endpoints (expenses, summary, trends, filters)
  - Installment expansion with recursive CTEs
  - MoM calculations across billing cycles
  - Filter application and date range handling
  - Budget cap calculations with holidays

- **Frontend (Vitest/React)**: 220 tests
  - Component rendering and interactions
  - Dark mode support
  - Debounced search functionality
  - Chart and table components
  - Utility functions (formatters)

**Total: 434 tests, all passing**

### Running Tests
```bash
make test-all           # Run all 434 tests (Python + Backend + Frontend)
make test-python        # Run Python tests only (126 tests)
make test-backend       # Run backend tests only (88 tests, requires PostgreSQL)
make test-frontend      # Run frontend tests only (220 tests)
make ci                 # Run linters + all tests (CI pipeline)
```

**Individual Test Suites:**
```bash
pytest tests/test_billing_cycle.py -v   # Run specific Python test file
cd backend && npm test                   # Run backend tests directly
cd frontend && npm test                  # Run frontend tests directly
```

### Critical Test Notes
- **Backend tests require PostgreSQL**: Run `make up` first to start database
- **Timezone handling**: Tests use noon UTC timestamps (e.g., `2025-09-15T12:00:00Z`) to ensure dates remain in the same calendar day when converted to Brazil timezone (UTC-3)
- **Billing cycle transitions**: Tests cover all three cycle periods (old/transition/new)
- **Test isolation**: Each test suite clears database and uses fresh test data
- **Date creation pattern**: Always use explicit times like `new Date('2025-09-15T12:00:00Z')` instead of `new Date('2025-09-15')` to avoid timezone conversion issues

### Service Testing
- **Bot**: Send test message to Telegram bot
- **React Dashboard**: Access http://localhost:5173
- **Database**: Use pgAdmin at http://localhost:5050 or connect via psql
- **Health check**: Send `/health` command to bot or `curl http://localhost:3001/api/health`

---

## Continuous Integration (CI/CD)

The project uses GitHub Actions for automated testing and quality checks.

### CI Workflows

**Primary CI Workflow** (`.github/workflows/ci.yml`)
- **Triggers**: Push to `main`, pull requests, manual dispatch
- **Jobs** (6 parallel jobs):
  1. **python-tests**: Runs pytest on Python test suite (126 tests)
  2. **python-lint**: Runs Ruff formatter and linter on Python code
  3. **backend-tests**: Runs Jest on backend API tests (88 tests, requires PostgreSQL service)
  4. **backend-lint**: Runs Prettier on backend Node.js code
  5. **frontend-tests**: Runs Vitest on React component tests (220 tests)
  6. **frontend-lint**: Runs ESLint and Prettier on frontend code
- **Services**: PostgreSQL 16 container for backend tests
- **Node Version**: 20.x
- **Python Version**: 3.13

**Lint-Only Workflow** (`.github/workflows/lint.yml`)
- **Triggers**: Push to any branch
- **Jobs**: Runs all linters in parallel (Python, Backend, Frontend)
- **Purpose**: Fast feedback on code style before CI runs

### Running CI Locally

```bash
make ci                 # Runs all linters and tests (same as CI)
make lint-all           # Run all linters only
make test-all           # Run all tests only
```

### CI Badge Status

Check CI status on GitHub repository main page. All checks must pass before merging pull requests.

### Dependency Audit

The CI workflow includes `npm audit` for both backend and frontend to check for security vulnerabilities in dependencies.

---

## API Documentation

The Express API (`backend/`) serves the React dashboard with the following endpoints:

### GET /api/filters/metadata
**Description:** Initialization data for filter components.

**Response:**
```json
{
  "categories": ["Alimentação", "Transporte", ...],
  "tags": ["Gastos Pessoais", "Gastos do Casal", "Gastos de Casa"],
  "dateRange": {
    "min": "2024-01-01",
    "max": "2025-12-31"
  },
  "invoiceMonths": [
    { "month": 1, "year": 2025, "label": "Jan/2025" },
    ...
  ]
}
```

### GET /api/expenses
**Description:** Filtered list of transactions with installment expansion.

**Query Parameters:**
- `startDate` (required): Start date (YYYY-MM-DD)
- `endDate` (required): End date (YYYY-MM-DD)
- `categories[]` (optional): Filter by categories (repeatable)
- `tags[]` (optional): Filter by tags (repeatable)
- `methods[]` (optional): Filter by payment methods (repeatable)
- `searchText` (optional): Text search in description

**Response:** `{ data: [ { id, expense_ts, amount, description, method, tag, category, installments, period_amount, installment_number }, ... ] }`

### GET /api/summary
**Description:** Summary cards with MoM comparisons.

**Query Parameters:** Same as `/api/expenses`

**Response:**
```json
{
  "current": { "total": "2543.67", "dailyAvg": "84.79", "count": 42 },
  "previous": { "total": "2198.45", "dailyAvg": "73.28", "count": 38 },
  "variation": { "total": "345.22", "totalPercent": 15.7, "dailyAvg": "11.51", "count": 4 }
}
```

### GET /api/charts/category
**Description:** Category spending breakdown (top 10).

**Query Parameters:** Same as `/api/expenses`

**Response:** `{ data: [ { category: "Alimentação", total: "856.34" }, ... ] }`

### GET /api/charts/tag
**Description:** Tag distribution data.

**Query Parameters:** Same as `/api/expenses`

**Response:** `{ data: [ { tag: "Gastos Pessoais", total: "1234.56" }, ... ] }`

### GET /api/trends/mom
**Description:** Month-over-Month comparison table.

**Query Parameters:**
- All from `/api/expenses`, plus:
- `groupBy`: Either `category` or `tag`

**Response:** `{ data: [ { name: "Alimentação", current: "856.34", previous: "723.12", variation: "133.22", percentChange: 18.4 }, ... ] }`

### GET /api/cap/:year/:month
**Description:** Monthly budget cap calculation for a specific invoice month.

**Path Parameters:**
- `year` (required): Invoice year (e.g., 2025)
- `month` (required): Invoice month number (1-12)

**Response:**
```json
{
  "year": 2025,
  "month": 11,
  "grossIncome": "8960.00",
  "accountingFee": "350.00",
  "dasAmount": "537.60",
  "proLaboreAmount": "1792.00",
  "inssAmount": "179.20",
  "totalDeductions": "2858.80",
  "firstDiscount": "610.07",
  "secondDiscount": "500.00",
  "netCap": "4991.13",
  "businessDaysWorked": 16,
  "totalBusinessDays": 18,
  "holidays": 2,
  "cap": 4991.13,
  "applicable": true,
  "invoiceYear": 2025,
  "invoiceMonth": 11
}
```

**Notes:**
- Cap calculation considers billing cycle dates (not calendar month)
- Holidays from `config/holidays.json` are subtracted from business days (starting November 2025)
- Accounting fee only applies from `CAP_ACCOUNTING_START_MONTH/YEAR` onwards
- October 2025 has special business day override due to transition cycle
- `businessDaysWorked = totalBusinessDays - holidays`

### Error Responses
All endpoints return errors in this format:
```json
{
  "error": "Error message here",
  "details": "Optional additional context"
}
```

Common HTTP status codes: `200` (Success), `400` (Bad request), `500` (Internal server error)

---

## Common Patterns

### Adding a new category/tag/method
1. Update `config/categories.json`
2. Update database constraint in `db/init/schema.sql`
3. Rebuild and restart: `make down && make up`

### Adding a new bot command
1. Define handler in `src/bot_service/handlers.py`
2. Register in `src/bot_service/app.py`
3. Add to `/help` command text

### Adding a new API endpoint
1. Add endpoint in `backend/index.js` (follow existing patterns)
2. Create SQL query in `backend/queries/` if needed (use CTEs for installments)
3. Add corresponding function in `frontend/src/services/apiService.js`
4. Update `useFinanceData.js` hook if needed
5. Test with various filter combinations

### Adding a new React component
1. Create component in `frontend/src/components/`
2. Use `formatCurrency()`, `Chip`, and `SectionTitle` utilities
3. Add dark mode support with `dark:` Tailwind classes
4. Import and use in `App.jsx`
5. Test with light/dark themes

### Modifying billing cycle logic
1. Update constants in `src/core/config.py` (`CYCLE_CHANGE_DATE`, `CYCLE_TRANSITION_END_DATE`, etc.)
2. Update logic in `src/core/utils.py` functions
3. Update `backend/utils/billingCycle.js` to match
4. Update `frontend/src/utils/billingCycle.js` to match
5. **CRITICAL**: Update tests in `tests/test_billing_cycle.py` to cover new scenarios
6. Run test suite to verify: `python -m pytest tests/test_billing_cycle.py -v`
7. Restart services: `make restart` or `make rebuild`

### Adding or modifying holidays
1. Edit `config/holidays.json` with **calendar months** and holiday counts
   - **CRITICAL**: Use `calendar_month = invoice_month - 1` (the month where business days are worked)
   - **Example 1**: December 2025 invoice (Nov 17 - Dec 16 billing cycle):
     - Business days counted in **November 2025**
     - Configuration: `"2025": { "11": 1 }` (November is month 11)
   - **Example 2**: January 2026 invoice (Dec 17 - Jan 16 billing cycle):
     - Business days counted in **December 2025**
     - Configuration: `"2025": { "12": 2 }` (December is month 12)
   - **Verification formula**: `calendar_month = (invoice_month === 1 ? 12 : invoice_month - 1)`
2. Rebuild containers to apply changes: `make rebuild`
3. Verify in dashboard: Holiday breakdown displays when holidays > 0
   - UI shows: "Dias úteis trabalhados: 19 (20 disponíveis - 1 feriado)"
4. Test API response: `curl http://localhost:3001/api/cap/2025/12 | jq`
   - Verify `holidays`, `totalBusinessDays`, and `businessDaysWorked` fields
   - For December invoice (month 12): should show holidays from November (month 11)

### Running the full test suite
1. Ensure Docker services are running: `make up`
2. Run all tests: `make test-all` (runs all 434 tests)
3. Run specific suite if needed:
   - `make test-python` - Python tests only (no database required)
   - `make test-backend` - Backend API tests (requires database)
   - `make test-frontend` - React component tests (no database required)
4. Review test output for any failures
5. For comprehensive test remediation, use the test-doctor agent

### Fixing failing tests
1. Identify which test suite is failing: `make test-all`
2. Run the specific failing suite with verbose output:
   - Python: `pytest tests/test_file.py -v -s`
   - Backend: `cd backend && npm test -- --verbose`
   - Frontend: `cd frontend && npm test -- --reporter=verbose`
3. Analyze the error message:
   - Assertion failures: Check expected vs actual values
   - Timeout errors: Check async operations or timer mocking
   - Database errors: Ensure PostgreSQL is running (`make up`)
4. Fix the issue in test code or implementation
5. Re-run the specific test to verify fix
6. Run full suite to ensure no regressions: `make test-all`

---

## Deployment & Operations

### Production Deployment Checklist

**Pre-Deployment:**
1. Update `.env` with production values (strong passwords, production bot token, correct user ID, timezone)
2. Review `config/categories.json` for completeness
3. Run full test suite: `make test-all` (ensure all 434 tests pass)
4. Run linters: `make lint-all` (Python, backend, frontend)
5. Test locally: `make down && make up`
6. Verify all services start correctly and health checks pass

**Deployment:**
1. Clone repository to production server
2. Copy `.env.example` to `.env` and configure
3. Start services: `docker compose up -d --build`
4. Verify health: `/health` command in Telegram or `curl http://localhost:3001/api/health`
5. Check logs: `make logs-bot`, `make logs-backend`

**Post-Deployment:**
1. Send test expense via Telegram
2. Verify in React dashboard (http://localhost:5173)
3. Test `/last`, `/balance`, `/undo` commands
4. Set up automated backups (cron job)

### Database Backup & Restore

**Manual Backup:**
```bash
docker compose exec db pg_dump -U postgres financial_tracker > backup_$(date +%Y%m%d).sql
gzip backup_$(date +%Y%m%d).sql
```

**Automated Backups Setup:**
The project includes helper scripts in `scripts/` directory:

1. **`scripts/backup.sh`** - Manual backup script
   - Creates timestamped backup in `backups/` directory
   - Automatically compresses with gzip
   - Usage: `./scripts/backup.sh`

2. **`scripts/setup-daily-backup.sh`** - Automated backup configuration
   - Sets up daily cron job at 2 AM
   - Creates `backups/` directory if missing
   - Configures automatic cleanup of old backups (keeps last 30 days)
   - Usage: `./scripts/setup-daily-backup.sh`
   - **IMPORTANT**: Run this once on server setup to enable automated backups

3. **`scripts/restore.sh`** - Backup restoration script
   - Restores from specified backup file
   - Automatically handles compressed (.gz) and uncompressed (.sql) files
   - Usage: `./scripts/restore.sh backups/backup_20250101.sql.gz`

**Manual Cron Setup (Alternative):**
```bash
# Add to crontab (daily at 2 AM)
0 2 * * * cd /path/to/financial-tracker && docker compose exec -T db pg_dump -U postgres financial_tracker | gzip > backups/backup_$(date +\%Y\%m\%d).sql.gz
```

**Restore from Backup:**
```bash
make down
docker compose up -d db
sleep 5
gunzip -c backup_20250101.sql.gz | docker compose exec -T db psql -U postgres financial_tracker
make up
```

**Backup Best Practices:**
- Run automated backups daily during low-traffic hours (2-4 AM)
- Keep at least 30 days of backups (90 days for production)
- Store backups off-site or in separate disk/cloud storage
- Test restoration procedure monthly to verify backup integrity
- Document backup location and access credentials securely

### Troubleshooting

**Bot Not Responding:**
1. Check bot is running: `docker compose ps`
2. Check bot logs: `make logs-bot`
3. Verify `TELEGRAM_BOT_TOKEN` in `.env`
4. Test bot token: `curl https://api.telegram.org/bot<TOKEN>/getMe`
5. Check database connectivity: `/health` command

**Dashboard Showing No Data:**
1. Verify database has data: `docker compose exec db psql -U postgres -d financial_tracker -c "SELECT COUNT(*) FROM expenses;"`
2. Check backend logs for errors: `make logs-backend`
3. Verify date range filters (expand to wider range)
4. Check browser console for API errors (F12)

**Database Connection Refused:**
1. Check database is running: `docker compose ps db`
2. Check database logs: `make logs-db`
3. Verify `POSTGRES_*` variables in `.env`
4. Restart database: `docker compose restart db`

**Installment Calculations Incorrect:**
1. **Verify timezone**: All date filtering uses Brazil timezone `(expense_ts AT TIME ZONE 'America/Sao_Paulo')::date`
2. Review billing cycle dates in logs
3. Check `CYCLE_CHANGE_DATE` and `CYCLE_TRANSITION_END_DATE` in `src/core/config.py`
4. Verify installment distribution CTE in SQL queries: `backend/queries/installments.js`
5. Run billing cycle tests: `pytest tests/test_billing_cycle.py -v`
6. Check database timezone: `docker compose exec db psql -U admin -d finance -c "SHOW timezone;"`
7. Verify `TZ=America/Sao_Paulo` in `.env`

**Date Boundary Issues (Expenses in Wrong Month):**
1. **Root cause**: Likely timezone mismatch between Brazil time and UTC
2. **Verify SQL filtering**: Check `backend/queries/installments.js` uses `AT TIME ZONE 'America/Sao_Paulo'`
3. **Test specific expense**:
   ```sql
   SELECT id, expense_ts,
     (expense_ts AT TIME ZONE 'America/Sao_Paulo')::date as brazil_date,
     (expense_ts AT TIME ZONE 'UTC')::date as utc_date
   FROM expenses WHERE id = [expense_id];
   ```
4. **Verify billing cycle boundaries**: Ensure they use Brazil time (00:00-23:59 local)
5. **Frontend display**: Dates should show in user's browser timezone
6. **Test filter**: Query with date range and verify results match expected Brazil timezone dates
7. **Common issue**: Late-night expenses (e.g., 23:00 Brazil time) should NOT appear in next day's invoice month

**Cap Calculations Incorrect:**
1. Verify `config/holidays.json` uses **calendar months** (where work happens), NOT invoice months
   - Example: For December 2025 invoice month, configure November holiday in `"2025": { "11": 1 }`
2. Check backend logs for holiday loading errors: `docker logs tgexp_backend 2>&1 | grep -i holiday`
   - If you see "Could not load holidays.json", verify volume mount in `docker-compose.yml`:
     ```yaml
     backend:
       volumes:
         - ./config:/config:ro
     ```
3. Test API endpoint directly: `curl http://localhost:3001/api/cap/2025/12`
   - Response should include `"holidays": 1` (or your configured value)
   - Response should show `"businessDaysWorked"` = `"totalBusinessDays"` - `"holidays"`
4. After config changes, rebuild containers: `make rebuild`
5. Verify environment variables are set correctly in `.env` (11 CAP_* variables)

**Test Failures:**
1. **Check test dependencies**: Ensure PostgreSQL is running for backend tests (`make up`)
2. **Run specific test suite**: Isolate the failing suite with `make test-python`, `make test-backend`, or `make test-frontend`
3. **Review test output**: Look for assertion errors, timeout issues, or database connection problems
4. **Common issues**:
   - Backend tests fail with "ECONNREFUSED": Database not running → run `make up`
   - Frontend debounce tests timeout: Timer mocking issue → check `vi.useFakeTimers()` in test
   - Python tests fail on billing cycles: Check `CYCLE_CHANGE_DATE` and `CYCLE_TRANSITION_END_DATE` in `src/core/config.py`
5. **CRITICAL - Brazil Timezone for Billing Cycles**: All date filtering uses Brazil timezone
   - **Rationale**: User tracks and inputs expenses in Brazil local time
   - **Implementation**: SQL queries use `(expense_ts AT TIME ZONE 'America/Sao_Paulo')::date`
   - **Location**: `backend/queries/installments.js` (6 query functions)
   - **Impact**: Billing cycle boundaries respect Brazil local time, not UTC
   - **Example**: Expense at Oct 3, 2025 21:56 Brazil time → excluded from Nov 2025 cycle (starts Oct 4 Brazil time)
   - **Frontend**: Displays dates in user's local browser timezone (Brazil time for Brazil-based users)
6. **Use test-doctor agent**: For comprehensive test remediation, use the test-doctor agent to automatically diagnose and fix test issues

### Security Best Practices

1. **Environment Variables:**
   - Never commit `.env` to version control (already in `.gitignore`)
   - Use strong passwords (minimum 16 characters)
   - Rotate `TELEGRAM_BOT_TOKEN` periodically via @BotFather

2. **Database:**
   - Change default PostgreSQL port in production (edit `docker-compose.yml`)
   - Enable SSL connections for remote access
   - Restrict pgAdmin access (change default credentials)

3. **Bot Authorization:**
   - Only one `ALLOWED_USER_ID` supported (single-user system)
   - Get your user ID: send `/start` to @userinfobot
   - Unauthorized users receive rejection message (logged for monitoring)

4. **API Security (React Dashboard - CRITICAL):**
   - **⚠️ CRITICAL WARNING**: The React dashboard has NO authentication - anyone with network access can view all financial data
   - **NEVER expose the dashboard to public internet without authentication**
   - Recommended deployment options:
     - Run on `localhost` only for personal use
     - Use VPN/SSH tunnel for remote access
     - Deploy behind authentication proxy (nginx with basic auth, Authelia, etc.)
     - Implement JWT/OAuth authentication layer before production use
   - Configure CORS in `backend/index.js` to restrict origins in production
   - Use HTTPS in production (reverse proxy like nginx or Caddy)
   - The Telegram bot is the only component with built-in authentication (via `ALLOWED_USER_ID`)

---

## Project Code Generation and Code Style Standards

This is a global directive for all agents (main and sub-agents) interacting with this codebase.

**Primary Directive**
You MUST NOT write inline comments (e.g., `// loop over users`, `# increment counter`).

**Python:**
- Follow PEP 8 conventions (enforced by Ruff)
- Use type hints for function signatures: `def func(x: int) -> str:`
- Async functions for I/O operations (database, API calls)
- Format with Ruff: `make lint`
- Maximum line length: 100 characters

**JavaScript/React:**
- Use ES6+ syntax (arrow functions, destructuring, async/await)
- Functional components with hooks (no class components)
- Props destructuring in component signatures
- Format with Prettier (configured in `frontend/.prettierrc`)
- Maximum line length: 80 characters

**SQL:**
- Use CTEs for complex queries (improves readability)
- Parameterized queries only (prevents SQL injection)
- Index frequently filtered columns
- EXPLAIN ANALYZE for performance validation

**Documentation:**
- Document with docstrings (Python `"""docstrings"""`, JS `/** JSDoc */`)
- Code should be self-explanatory

**General Principles**
- **DRY (Don't Repeat Yourself):** Actively seek and reuse existing functions or components before writing new ones.
- **Modularity:** New code should be placed in the correct module/directory as defined by the existing architecture.
- **Readability:** Prioritize clear variable and function names over complex, short-hand syntax.