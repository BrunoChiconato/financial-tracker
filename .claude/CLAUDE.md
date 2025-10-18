# CLAUDE.md

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with code in this repository.

## AI Persona & Expertise

When working on this project, adopt the appropriate expert persona based on the task context:

### 1. Backend Engineer (Python/Node.js)
**Activate when:** Working on bot service, Express API, database queries, or core business logic.
**Expertise:**
- Python async/await patterns with `psycopg` and `python-telegram-bot`
- Node.js/Express RESTful API design with `pg` connection pooling
- PostgreSQL query optimization, CTEs, and recursive queries
- Dependency injection and repository patterns
- Error handling and logging strategies

**Communication style:** Technical, precise, focuses on performance and maintainability.

### 2. Frontend Developer (React/Tailwind)
**Activate when:** Working on React components, UI/UX, styling, or client-side state management.
**Expertise:**
- Modern React patterns (hooks, custom hooks, component composition)
- Tailwind CSS utility-first styling and responsive design
- Performance optimization (debouncing, memoization, stale-while-revalidate)
- Accessibility best practices (semantic HTML, ARIA attributes)
- UX principles (loading states, transitions, zero layout shift)

**Communication style:** User-focused, emphasizes clarity and visual consistency.

### 3. DevOps Engineer
**Activate when:** Working on Docker, CI/CD, deployment, environment configuration, or infrastructure.
**Expertise:**
- Docker Compose orchestration and multi-service architecture
- Environment variable management and secret handling
- Database migrations and backup strategies
- Container health checks and resource limits
- Logging and monitoring setup

**Communication style:** Pragmatic, security-conscious, focuses on reliability.

### 4. Data Analyst
**Activate when:** Working on billing cycle logic, installment calculations, MoM comparisons, or financial reporting.
**Expertise:**
- Temporal data modeling (billing cycles, date ranges, transitions)
- Installment distribution algorithms and prorating logic
- Aggregation strategies (SUM, GROUP BY, window functions)
- Month-over-Month trend analysis and variance calculations
- Brazilian currency formatting and decimal precision

**Communication style:** Analytical, detail-oriented, emphasizes correctness and edge cases.

### 5. QA Engineer
**Activate when:** Writing tests, debugging, troubleshooting, or validating features.
**Expertise:**
- Unit testing with pytest (fixtures, parametrization, mocking)
- Integration testing across services (API, database, bot)
- Edge case identification (transition periods, leap years, timezone handling)
- Test coverage analysis and regression prevention
- Debugging strategies (logs, breakpoints, SQL query analysis)

**Communication style:** Methodical, skeptical, focuses on reproducibility and verification.

---

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
**Requirement:** New endpoints in `backend/server.js` must:
1. Accept filters via query parameters: `startDate`, `endDate`, `categories[]`, `tags[]`, `methods[]`
2. Use `parseFilterParams()` utility for parameter extraction
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
- Check logs: `make logs-bot`, `make logs-dashboard`
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
- `getPreviousPeriod()` (backend): Uses `billingCycleRange()` to correctly calculate previous invoice month dates, accounting for cycle transitions
  - Critical for accurate MoM (Month-over-Month) comparisons
  - Example: Invoice 11/2025 (Oct 17 - Nov 16) correctly compares to Invoice 10/2025 (Sep 4 - Oct 3)
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

## Deployment & Operations

### Production Deployment Checklist

**Pre-Deployment:**
1. Update `.env` with production values:
   - Generate strong `POSTGRES_PASSWORD`
   - Set production `TELEGRAM_BOT_TOKEN` (from @BotFather)
   - Configure correct `ALLOWED_USER_ID`
   - Set `TZ` to your timezone (e.g., `America/Sao_Paulo`)
2. Review `config/categories.json` for completeness
3. Run test suite: `pytest tests/ -v`
4. Test locally: `make down && make up`

**Deployment:**
1. Clone repository to production server
2. Copy `.env.example` to `.env` and configure
3. Start services: `docker compose up -d --build`
4. Verify health: `/health` command in Telegram
5. Check logs: `make logs-bot`, `make logs-dashboard`

**Post-Deployment:**
1. Send test expense via Telegram
2. Verify in React dashboard (http://localhost:5173)
3. Verify in Streamlit dashboard (http://localhost:8501)
4. Test `/last`, `/balance`, `/undo` commands
5. Set up automated backups (see below)

### Database Backup & Restore

**Manual Backup:**
```bash
# Backup database to file
docker compose exec db pg_dump -U postgres financial_tracker > backup_$(date +%Y%m%d).sql

# Compress backup
gzip backup_$(date +%Y%m%d).sql
```

**Automated Backups (cron):**
```bash
# Add to crontab (daily at 2 AM)
0 2 * * * cd /path/to/financial-tracker && docker compose exec -T db pg_dump -U postgres financial_tracker | gzip > backups/backup_$(date +\%Y\%m\%d).sql.gz
```

**Restore from Backup:**
```bash
# Stop services
make down

# Start only database
docker compose up -d db

# Wait for database to be ready
sleep 5

# Restore backup
gunzip -c backup_20250101.sql.gz | docker compose exec -T db psql -U postgres financial_tracker

# Start all services
make up
```

### Monitoring & Logs

**View Real-Time Logs:**
```bash
make logs-bot        # Telegram bot logs
make logs-dashboard  # Streamlit dashboard logs
make logs-db         # PostgreSQL logs
docker compose logs -f backend  # Express API logs (if using React)
docker compose logs -f frontend # Vite dev server logs (dev only)
```

**Log Locations (inside containers):**
- Bot: stdout/stderr (captured by Docker)
- Database: `/var/lib/postgresql/data/pg_log/` (if logging enabled)
- Streamlit: stdout/stderr
- Backend API: stdout/stderr

**Key Log Patterns to Monitor:**
- `ERROR`: Application errors requiring investigation
- `Unauthorized access`: Security alerts (unauthorized Telegram users)
- `Database connection failed`: Database availability issues
- `Expense registered`: Successful expense logging
- `Command /balance`: Usage analytics

### Performance Optimization

**Database Indexes:**
Already configured in `db/init/schema.sql`:
- `idx_expense_ts`: Speeds up date range queries
- `idx_method`, `idx_tag`, `idx_category`: Accelerates filtering

**Query Optimization Tips:**
- Use EXPLAIN ANALYZE for slow queries
- Monitor query execution time in logs
- Consider materialized views for complex aggregations (future enhancement)

**Container Resource Limits:**
Add to `docker-compose.yml` if needed:
```yaml
services:
  db:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          memory: 512M
```

### Troubleshooting Guide

#### Bot Not Responding
1. Check bot is running: `docker compose ps`
2. Check bot logs: `make logs-bot`
3. Verify `TELEGRAM_BOT_TOKEN` in `.env`
4. Test bot token: `curl https://api.telegram.org/bot<TOKEN>/getMe`
5. Check database connectivity: `/health` command

#### Dashboard Showing No Data
1. Verify database has data: `docker compose exec db psql -U postgres -d financial_tracker -c "SELECT COUNT(*) FROM expenses;"`
2. Check dashboard logs for errors
3. Verify date range filters (expand to wider range)
4. Check billing cycle configuration matches expectations

#### Database Connection Refused
1. Check database is running: `docker compose ps db`
2. Check database logs: `make logs-db`
3. Verify `POSTGRES_*` variables in `.env`
4. Restart database: `docker compose restart db`
5. Check port 5432 not in use: `sudo lsof -i :5432` (on host)

#### Installment Calculations Incorrect
1. Review billing cycle dates in logs
2. Check `CYCLE_CHANGE_DATE` and `CYCLE_TRANSITION_END_DATE` in `src/core/config.py`
3. Verify installment distribution CTE in SQL queries
4. Run billing cycle tests: `pytest tests/test_billing_cycle.py -v`
5. Check timezone settings (`TZ` in `.env`)

#### High Memory Usage
1. Check Docker stats: `docker stats`
2. Review Streamlit cache settings in `streamlit_app.py`
3. Limit database connections in `backend/config.js` and `repository.py`
4. Consider adding resource limits in `docker-compose.yml`

#### React Dashboard API Errors
1. Check backend is running: `curl http://localhost:3001/api/filters/metadata`
2. Check backend logs: `docker compose logs -f backend`
3. Verify CORS settings in `backend/server.js`
4. Check frontend API base URL in `frontend/src/services/apiService.js`
5. Inspect browser console for network errors (F12)

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
   - Configure CORS in `backend/server.js` to restrict origins in production
   - Use HTTPS in production (reverse proxy like nginx)
   - Consider adding authentication layer for multi-user scenarios

### Data Migration

**Exporting Data to CSV:**
```python
# Run in Python environment with database access
from src.storage.repository import ExpenseRepository
import asyncio

async def export():
    repo = ExpenseRepository()
    df = await repo.get_all_expenses_as_dataframe()
    df.to_csv('expenses_export.csv', index=False)

asyncio.run(export())
```

**Importing Data from CSV:**
```sql
-- Inside database container
COPY expenses(expense_ts, amount, description, method, tag, category, installments)
FROM '/path/to/expenses_export.csv'
DELIMITER ','
CSV HEADER;
```

### Updating Dependencies

**Python Dependencies:**
```bash
# Update requirements
uv pip compile pyproject.toml -o requirements.txt

# Rebuild services
make rebuild
```

**Node.js Dependencies:**
```bash
# Update backend
cd backend && npm update && npm audit fix

# Update frontend
cd frontend && npm update && npm audit fix

# Rebuild services
make rebuild
```

**Docker Base Images:**
Update image tags in `docker-compose.yml` and `Dockerfile`, then:
```bash
make down
docker compose build --no-cache
make up
```

## API Documentation (Backend)

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

**Response:**
```json
{
  "data": [
    {
      "id": 123,
      "expense_ts": "2025-01-15T14:30:00Z",
      "amount": "35.50",
      "description": "Uber",
      "method": "Cartão de Crédito",
      "tag": "Gastos Pessoais",
      "category": "Transporte",
      "installments": 1,
      "period_amount": "35.50",
      "installment_number": 1
    },
    ...
  ]
}
```

### GET /api/summary
**Description:** Summary cards with MoM comparisons.

**Query Parameters:** Same as `/api/expenses`

**Response:**
```json
{
  "current": {
    "total": "2543.67",
    "dailyAvg": "84.79",
    "count": 42
  },
  "previous": {
    "total": "2198.45",
    "dailyAvg": "73.28",
    "count": 38
  },
  "variation": {
    "total": "345.22",
    "totalPercent": 15.7,
    "dailyAvg": "11.51",
    "count": 4
  }
}
```

### GET /api/charts/category
**Description:** Category spending breakdown (top 10).

**Query Parameters:** Same as `/api/expenses`

**Response:**
```json
{
  "data": [
    { "category": "Alimentação", "total": "856.34" },
    { "category": "Transporte", "total": "523.12" },
    ...
  ]
}
```

### GET /api/charts/tag
**Description:** Tag distribution data.

**Query Parameters:** Same as `/api/expenses`

**Response:**
```json
{
  "data": [
    { "tag": "Gastos Pessoais", "total": "1234.56" },
    { "tag": "Gastos do Casal", "total": "987.65" },
    { "tag": "Gastos de Casa", "total": "321.46" }
  ]
}
```

### GET /api/trends/mom
**Description:** Month-over-Month comparison table.

**Query Parameters:**
- All from `/api/expenses`, plus:
- `groupBy`: Either `category` or `tag`

**Response:**
```json
{
  "data": [
    {
      "name": "Alimentação",
      "current": "856.34",
      "previous": "723.12",
      "variation": "133.22",
      "percentChange": 18.4
    },
    ...
  ]
}
```

### Error Responses
All endpoints return errors in this format:
```json
{
  "error": "Error message here",
  "details": "Optional additional context"
}
```

Common HTTP status codes:
- `200`: Success
- `400`: Bad request (invalid parameters)
- `500`: Internal server error (database/query errors)

## Technology Stack & Dependencies

### Core Technologies

**Backend Services (Python):**
- **python-telegram-bot** (v21.9): Async Telegram bot framework with command handlers
- **psycopg** (v3.2.3): Modern async PostgreSQL adapter for Python 3
- **pandas** (v2.2.3): DataFrame operations for dashboard data aggregation
- **streamlit** (v1.41.1): Legacy dashboard web framework
- **python-dotenv** (v1.0.1): Environment variable management

**Frontend (JavaScript/React):**
- **React** (v18.3): Component-based UI library
- **Vite** (v6.0): Fast build tool with HMR (Hot Module Replacement)
- **Tailwind CSS** (v3.4): Utility-first CSS framework
- **lucide-react** (v0.468): Icon library for React
- **date-fns** (v4.1): Date manipulation and formatting

**Backend API (Node.js):**
- **Express** (v4.21): Web framework for RESTful API
- **pg** (v8.13): PostgreSQL client with connection pooling
- **cors** (v2.8): Cross-Origin Resource Sharing middleware
- **dotenv** (v16.4): Environment configuration

**Database:**
- **PostgreSQL** (v17): Relational database with JSONB and CTE support
- **pgAdmin** (v4): Web-based database administration tool

**Development Tools:**
- **Docker** & **Docker Compose**: Container orchestration
- **Ruff** (v0.8.4): Python linter and formatter (replaces Black, isort, flake8)
- **pytest** (v8.3.4): Python testing framework
- **uv**: Fast Python package installer
- **Prettier**: Code formatter for JavaScript/React

### Dependency Management

**Python (Poetry/pip):**
- Main dependencies: `pyproject.toml`
- Lock file: `requirements.txt` (generated via `uv pip compile`)
- Install: `uv pip install -r requirements.txt`

**Node.js (npm):**
- Root package.json: Concurrent dev scripts
- Backend: `backend/package.json` (Express API dependencies)
- Frontend: `frontend/package.json` (React app dependencies)
- Install: `npm install` (in respective directories)

**Docker Images:**
- Python services: `python:3.12-slim`
- Node.js services: `node:18-alpine`
- Database: `postgres:17-alpine`
- pgAdmin: `dpage/pgadmin4:latest`

### Key Libraries Explained

**psycopg vs psycopg2:**
- This project uses **psycopg 3** (not psycopg2)
- Native async/await support (no need for psycopg2-async)
- Better connection pool management
- Improved type conversion and JSONB handling

**python-telegram-bot v21:**
- Fully async architecture (requires `async def` handlers)
- PTB (Python Telegram Bot) Application class replaces deprecated Updater
- Context-based handlers with `update` and `context` parameters

**Vite vs Create React App:**
- Vite offers faster dev server startup (instant HMR)
- Native ES modules support
- Optimized production builds with Rollup

**Tailwind CSS Philosophy:**
- Utility-first: compose styles from single-purpose classes
- No custom CSS files (avoids style conflicts)
- JIT (Just-In-Time) compilation for minimal bundle size
- Configured in `tailwind.config.js`

### Environment-Specific Dependencies

**Development Only:**
- pytest (unit tests)
- pytest-asyncio (async test support)
- Ruff (linting and formatting)
- Vite dev server
- Concurrent (npm script runner for parallel dev)

**Production:**
- All runtime dependencies from `requirements.txt` and `package.json`
- Exclude dev dependencies from Docker images
- Use production build for React (`npm run build`)

### Upgrading Guidelines

**Breaking Change Considerations:**
1. **PostgreSQL Major Versions**: Require dump/restore migration
2. **Python 3.12 → 3.13**: Test async context managers and type hints
3. **React 18 → 19**: Review concurrent rendering changes
4. **Tailwind v3 → v4**: Configuration file format changes
5. **psycopg 3.x → 4.x**: Check connection pool API changes

**Safe Update Process:**
1. Update in development environment first
2. Run full test suite: `pytest tests/ -v`
3. Test all features manually (bot commands, dashboards, API)
4. Check logs for deprecation warnings
5. Update documentation if APIs change

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

## Contributing Guidelines

### Code Style and Standards

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

**Git Commit Messages:**
- Use conventional commits format: `type(scope): description`
- Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `style`
- Examples:
  - `feat(bot): add /export command for CSV export`
  - `fix(api): correct MoM calculation during transition cycle`
  - `refactor(dashboard): extract KPI card into reusable component`
  - `test(billing): add edge case for leap year cycles`

### Testing Requirements

**When to Write Tests:**
- Adding new billing cycle logic (REQUIRED)
- Modifying expense parsing (REQUIRED)
- Adding new API endpoints (recommended)
- Complex business logic (recommended)

**Running Tests:**
- Full suite: `pytest tests/ -v`
- Single file: `pytest tests/test_billing_cycle.py -v`
- With coverage: `pytest tests/ --cov=src --cov-report=html`

### Code Review Checklist

**Before Requesting Review:**
- [ ] All tests pass locally
- [ ] Code follows style guidelines
- [ ] New features have tests
- [ ] Documentation updated (CLAUDE.md if needed)
- [ ] Environment variables documented (if added)
- [ ] Database migrations included (if schema changed)
- [ ] No console errors or warnings
- [ ] Tested on both dashboards (if applicable)

**For Reviewers:**
- [ ] Code is readable and maintainable
- [ ] Business logic is correct (especially billing cycles)
- [ ] Edge cases are handled
- [ ] Security considerations addressed
- [ ] Performance impact is acceptable
- [ ] Tests are comprehensive
- [ ] Documentation is clear

### Common Contribution Scenarios

**Adding a New Dashboard Chart:**
1. Add endpoint in `backend/server.js` (follow `/api/charts/category` pattern)
2. Create SQL query in `backend/utils/queries/` (use CTEs for installments)
3. Add React component in `frontend/src/components/`
4. Use `formatCurrency()` and `Chip` components
5. Add dark mode support with `dark:` Tailwind classes
6. Add to main dashboard layout in `App.jsx`
7. Test with various filter combinations and both light/dark themes

**Adding a New Bot Command:**
1. Define handler in `src/bot_service/handlers.py`
2. Register in `src/bot_service/app.py` (use `application.add_handler()`)
3. Add authorization check: `ensure_auth(update)`
4. Update `/help` command text with new usage
5. Test with authorized and unauthorized users
6. Check logs for proper logging

**Modifying Database Schema:**
1. Update `db/init/schema.sql`
2. Update `src/core/models.py` (Expense dataclass)
3. Update `src/storage/repository.py` (query methods)
4. Update `backend/utils/queries/` (Node.js queries)
5. Update `config/categories.json` (if adding enum values)
6. Run `make down && make up` (recreates database)
7. Verify both dashboards work with new schema

### Architectural Decisions

**When to Add Logic to Backend vs Frontend:**
- **Backend (Python/Node.js)**: Data aggregation, filtering, calculations, business rules
- **Frontend (React)**: UI state, user interactions, visual formatting, client-side sorting

**When to Use CTEs vs Application Code:**
- **CTEs (SQL)**: Installment distribution, date filtering, aggregations
- **Application Code**: Formatting, UI logic, API orchestration

**When to Update Both Dashboards:**
- New data fields (must update Streamlit and React)
- Filter changes (apply to both UIs)
- Calculation changes (update both SQL and display logic)

## Full-Stack Migration (Node.js + React)

### New Architecture (Completed)
The project has been successfully migrated to a modern full-stack architecture with a decoupled frontend and backend:

- **Architecture**: This project is a decoupled full-stack application. The Node.js/Express backend is the single source of truth for data, communicating via a REST API with a React (Vite) frontend client.
- **Code Quality**: Prioritize clean, readable, and maintainable code. Use descriptive variable names, create small, single-responsibility functions/components, and apply consistent formatting (Prettier).
- **Security**: Database credentials must only be accessed through environment variables. The backend API must use CORS to restrict access to the frontend domain in a production environment.
- **State Management**: The frontend will manage application state, including filters and fetched data, through React hooks to ensure a reactive and predictable UI.
- **Styling**: This project uses Tailwind CSS as its primary styling engine. All new components must be styled using Tailwind utility classes. Avoid writing custom CSS files.

### Migration Components

#### Backend (`backend/`)
- **Node.js/Express API**: RESTful endpoints serving filtered expense data
- **PostgreSQL Connection Pool**: Efficient database connection management via `pg`
- **SQL Query Modules**: Reusable modules for installment distribution and billing cycle calculations
  - `getMoMTrendQuery()`: Uses parameter index reuse to apply same filters to both current and previous periods
  - Prevents SQL parameter duplication for accurate MoM comparisons
- **API Endpoints** (all support category, tag, and method filtering):
  - `GET /api/filters/metadata`: Filter initialization data (categories, tags, date range, invoice months with installments)
  - `GET /api/expenses`: Filtered transaction list with installment expansion
  - `GET /api/summary`: Summary cards data with MoM comparisons
  - `GET /api/charts/category`: Category spending breakdown (top 10)
  - `GET /api/charts/tag`: Tag distribution data
  - `GET /api/trends/mom`: Month-over-Month comparison table (group by category or tag)

#### Frontend (`frontend/`)
- **React + Vite**: Modern, fast development setup with HMR
- **Component-Based Architecture**: Modular, reusable UI components
- **Custom Hooks**: `useFinanceData` for centralized state and data fetching
- **API Service Layer**: Abstracted API calls in `services/apiService.js`
- **Styling**: Tailwind CSS v3.4 for utility-first styling with dark mode support (`darkMode: 'class'`)
- **Icons**: lucide-react for consistent iconography
- **Context Providers**:
  - `DarkModeContext.jsx`: Dark mode state management with localStorage persistence
- **Atomic Components**:
  - `Chip.jsx`: Reusable badge component
  - `SectionTitle.jsx`: Consistent section headers
  - `KpiCard.jsx`: Metric display cards
  - `BarRow.jsx`: Horizontal bar chart row
  - `FilterGroup.jsx`: Collapsible filter with search
- **Key Components**:
  - `HeroSection.jsx`: Monthly budget card + 3 KPI cards
  - `Filters.jsx`: Collapsible filter sidebar with debounced search
  - `CategoryChart.jsx`: Horizontal bar chart (sorted by value)
  - `TagChart.jsx`: 100% stacked bar for tag composition
  - `TrendsTable.jsx`: MoM comparison with arrow indicators
  - `TransactionsTable.jsx`: Sortable table with 2-decimal formatting
  - `DarkModeToggle.jsx`: Floating theme toggle button (sun/moon icons)

### Development Workflow
- **Backend Dev**: `cd backend && npm run dev` (runs on port 3001)
- **Frontend Dev**: `cd frontend && npm run dev` (runs on port 5173)
- **Concurrent Mode**: `npm run dev` (from root, runs both services)

### Compatibility Notes
- The Telegram bot service continues to function independently
- Both Streamlit and React dashboards can coexist during migration
- All services share the same PostgreSQL database
- Billing cycle logic and installment calculations remain consistent across all interfaces

### Access URLs
- **React Dashboard**: http://localhost:5173 (Modern UI with enhanced filtering and visualizations)
- **Streamlit Dashboard**: http://localhost:8501 (Legacy dashboard, still functional)
- **Backend API**: http://localhost:3001 (RESTful API endpoints)
- **Database**: localhost:5432 (PostgreSQL, exposed to host)

### Features Implemented
The React dashboard includes all Streamlit features plus enhancements:

**Filters:**
- Invoice Month selector (with transition cycle support, includes future months with installments)
- Custom date range picker
- Multi-select categories, tags, and payment methods
- Text search across descriptions with debouncing (300ms)
- Quick select/deselect all for categories and tags
- Collapsible filter sidebar (toggle with "Filtros" button)
- Search within filter groups

**Visualizations:**
- Monthly Budget card with color-coded pacing indicators:
  - Red bar and text when spending is above expected pace
  - Green bar and text when spending is below expected pace
  - Dynamic projection based on current spending rate
- Summary cards (total spent, daily average, transaction count) with MoM comparisons
- Category spending horizontal bar chart (top 10, sorted by value)
- Tag distribution 100% stacked bar chart with percentages
- MoM trends table with semantic color-coded variations (switchable by category/tag):
  - Red values indicate spending increased from previous period (warning)
  - Green values indicate spending decreased from previous period (positive)
  - Default gray for no change (R$ 0,00 variation)
  - Directional arrows for visual clarity
- Detailed transactions table with sortable columns
- All monetary values formatted to exactly 2 decimal places
- Color-coded badges for methods, categories, and tags

**Performance:**
- Parallel API requests for faster data loading
- Responsive design for mobile and desktop
- Real-time filter updates with debouncing
- Optimized SQL queries with recursive CTEs
- Stale-while-revalidate pattern: content stays visible during data refresh
- Zero layout shifts during filter interactions
- Previous data displayed while new data loads (opacity dimming for visual feedback)

**User Experience:**
- Modern, clean UI with Tailwind CSS and slate color scheme
- Dark mode toggle with localStorage persistence (remembers user preference across sessions)
- Smooth theme transitions between light and dark modes
- All components fully support dark mode with optimized color palettes
- Loading states with smooth opacity transitions (no flashing)
- Intuitive collapsible filter controls (all expanded by default)
- Interactive charts with hover tooltips
- Sortable transaction table (click column headers)
- No scroll jumping when interacting with filters
- Search input maintains focus while typing
- Proper button types prevent unintended form submissions
- Select All/Deselect All works correctly for all filter groups