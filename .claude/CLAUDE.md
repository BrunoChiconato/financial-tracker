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
**Context:** Four services share one database (bot, Streamlit, backend API, pgAdmin).
**Requirement:** When modifying `db/init/schema.sql`:
1. Update `config/categories.json` if adding allowed values
2. Update all query methods in `src/storage/repository.py` (Python)
3. Update all query modules in `backend/utils/queries/` (Node.js)
4. Update `src/core/models.py` if adding/removing fields
5. Run `make down && make up` to recreate database with new schema
6. Verify changes in both Streamlit and React dashboards

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
3. Provide default value in `src/core/config.py` or `backend/config.js` when safe
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
   - Accounting fees starting from a specific month
   - DAS, Pro Labore, and INSS percentages
   - First discount (percentage) and second discount (fixed amount)
5. The `/api/cap/:year/:month` endpoint provides cap data for dashboard display

**Rationale:** Budget caps are business-specific calculations that must remain configurable and auditable.

---

## Quick Start Guide

**For New Developers:**
1. **Prerequisites**: Docker, Docker Compose, Git
2. **Clone**: `git clone <repo-url> && cd financial-tracker`
3. **Configure**: `cp .env.example .env` and fill in required values (see "Environment Setup")
4. **Start**: `make up` (starts all services with build)
5. **Test bot**: Send expense to Telegram bot (format: `35,50 - Uber - Cartão de Crédito - Gastos Pessoais - Transporte`)
6. **View data**: Open http://localhost:5173 (React) or http://localhost:8501 (Streamlit)

**Common First Tasks:**
- Add test data via Telegram bot (`/help` for format)
- Explore dashboards and filters
- Check logs: `make logs-bot`, `make logs-backend`
- Run tests: `pytest tests/ -v`
- Review codebase starting with `src/core/` (shared logic)

**Recommended Learning Path:**
1. Read "Project Overview" and "Key Concepts" sections
2. Study "Architecture & Data Flow" to understand module interactions
3. Review "Billing Cycle Logic" (critical for understanding date ranges)
4. Experiment with bot commands: `/last`, `/balance`, `/undo`
5. Modify a category in `config/categories.json` and rebuild

---

## Project Overview

A full-stack personal expense tracker with dual dashboard options:
- **Telegram Bot** (`bot_service`): Receives expenses via messages, validates input, stores in database
- **PostgreSQL Database** (`db`): Stores expense records with installment support and billing cycle transition logic
- **React Dashboard** (`frontend/`): Modern UI with enhanced UX, color-coded visualizations, and smooth interactions (recommended)
- **Streamlit Dashboard** (`dashboard_service`): Legacy Python-based dashboard, still functional
- **Express API** (`backend/`): RESTful Node.js backend serving the React dashboard

All services share a single PostgreSQL database. The React and Streamlit dashboards can coexist.

**Technology Stack:**
- **Backend**: Python 3.13 (bot, Streamlit), Node.js 20 (Express API)
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
make clean           # Remove caches and __pycache__ directories
pytest tests/        # Run Python test suite
pytest tests/test_billing_cycle.py -v  # Run specific test file
cd backend && npm test                 # Run Node.js tests
cd frontend && npm test                # Run React tests
```

### Local Development (Without Docker)
```bash
cd backend && npm run dev               # Backend on :3001
cd frontend && npm run dev              # Frontend on :5173
# Python services still need database
```

---

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
- **`utils/billingCycle.js`**: Billing cycle calculations (matches Python logic)
- **`utils/capCalculation.js`**: Monthly budget cap calculation logic
- **`utils/formatters.js`**: Currency and number formatting

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
- `HeroSection.jsx`: Monthly budget card + 3 KPI cards
- `Filters.jsx`: Collapsible filter sidebar with debounced search
- `CategoryChart.jsx`, `TagChart.jsx`: Visualizations
- `TrendsTable.jsx`: MoM comparison with arrow indicators
- `TransactionsTable.jsx`: Sortable transaction table
- `Chip.jsx`, `SectionTitle.jsx`, `KpiCard.jsx`: Atomic components

### Database (`db/init/schema.sql`)
Single table: `public.expenses`
- Fields: `id`, `expense_ts`, `amount`, `description`, `method`, `tag`, `category`, `installments`, `parsed`
- Constraints enforce valid payment methods, tags, and categories
- Indexes on: `expense_ts`, `method`, `tag`, `category`
- Installments stored as integer, prorated via SQL during queries

### Data Flow

**Input Path (Telegram → Database):**
1. User sends message to Telegram bot
2. `handlers.py:on_text()` → `parser.py:parse_message()`
3. Parser validates and canonicalizes fields
4. `ExpenseRepository.add_expense()` inserts into PostgreSQL
5. Bot responds with confirmation

**Output Path (Database → Frontend):**
1. React app calls `useFinanceData()` hook
2. Hook calls `apiService` functions
3. Backend Express API receives request
4. `queries/installments.js` generates SQL with recursive CTEs
5. CTEs expand installments across billing cycles
6. Backend returns filtered/aggregated data
7. Frontend renders charts and tables

---

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

#### Implementation Details
- `get_cycle_reset_day_for_date()`: Returns 4 for dates before Oct 4, 2025; 17 after
- `get_cycle_start()`: Calculates cycle start with transition handling
- `get_current_and_previous_cycle_dates()`: Returns current and previous cycles, handling cross-transition scenarios
- `getPreviousPeriod()` (backend): Uses `billingCycleRange()` to correctly calculate previous invoice month dates
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

### Monthly Budget Cap Calculation
The system calculates a monthly spending cap based on business income and deductions:

**Formula:**
1. Gross Income = Hourly Rate × Daily Hours × Business Days Worked
2. Total Deductions = Accounting Fee + DAS + Pro Labore + INSS
3. Net After Deductions = Gross Income - Total Deductions
4. Net Cap = Net After Deductions - First Discount - Second Discount

**Special Considerations:**
- Accounting fee only applies from `CAP_ACCOUNTING_START_MONTH/YEAR` onwards
- October 2025 has special business day override (`CAP_OCTOBER_BUSINESS_DAYS`) due to transition cycle
- All percentages stored as decimals (e.g., 0.06 for 6%)
- Cap calculation respects billing cycle dates (not calendar month)

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
- `CAP_FIRST_DISCOUNT_PERCENT`: First discount percentage
- `CAP_SECOND_DISCOUNT_FIXED`: Second discount fixed amount
- `CAP_START_MONTH`, `CAP_START_YEAR`: When budget cap tracking started
- `CAP_OCTOBER_BUSINESS_DAYS`: Override for October 2025 business days (transition month)

**pgAdmin:**
- `PGADMIN_DEFAULT_EMAIL`, `PGADMIN_DEFAULT_PASSWORD`: Admin UI credentials

**Legacy:**
- `CYCLE_RESET_DAY`: Kept for backward compatibility (actual cycle logic uses hardcoded dates in config.py)

---

## Testing

### Unit Tests
The project includes comprehensive unit tests for the billing cycle logic:
- **Location**: `tests/test_billing_cycle.py`
- **Coverage**: 36+ tests covering old logic, transition period, new logic, and edge cases
- **Run tests**: `python -m pytest tests/test_billing_cycle.py -v`
- **Test configuration**: `tests/conftest.py` sets up test environment variables
- **Dependencies**: pytest (install with `uv pip install pytest`)

### Service Testing
- **Bot**: Send test message to Telegram bot
- **React Dashboard**: Access http://localhost:5173
- **Streamlit Dashboard**: Access http://localhost:8501
- **Database**: Use pgAdmin at http://localhost:5050 or connect via psql
- **Health check**: Send `/health` command to bot or `curl http://localhost:3001/api/health`

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
  "businessDaysWorked": 16
}
```

**Notes:**
- Cap calculation considers billing cycle dates (not calendar month)
- Accounting fee only applies from `CAP_ACCOUNTING_START_MONTH/YEAR` onwards
- October 2025 has special business day override due to transition cycle

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

---

## Deployment & Operations

### Production Deployment Checklist

**Pre-Deployment:**
1. Update `.env` with production values (strong passwords, production bot token, correct user ID, timezone)
2. Review `config/categories.json` for completeness
3. Run test suite: `pytest tests/ -v`
4. Test locally: `make down && make up`

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

**Automated Backups (cron):**
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
1. Review billing cycle dates in logs
2. Check `CYCLE_CHANGE_DATE` and `CYCLE_TRANSITION_END_DATE` in `src/core/config.py`
3. Verify installment distribution CTE in SQL queries
4. Run billing cycle tests: `pytest tests/test_billing_cycle.py -v`
5. Check timezone settings (`TZ` in `.env`)

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

4. **API Security (React Dashboard):**
   - Configure CORS in `backend/index.js` to restrict origins in production
   - Use HTTPS in production (reverse proxy like nginx)
   - Consider adding authentication layer for multi-user scenarios

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