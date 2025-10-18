"""
Database Repository Module.

Provides the ExpenseRepository class, which serves as the single source of truth
for all database operations related to expenses. Handles complex SQL queries with
recursive CTEs for installment distribution across billing cycles.

All database operations are performed asynchronously except for DataFrame operations
which use synchronous connections for pandas compatibility.
"""

from datetime import date
from decimal import Decimal
from typing import Optional, List
import logging

import psycopg
import pandas as pd

from src.core import config
from src.core.models import Expense

log = logging.getLogger(__name__)


class ExpenseRepository:
    """
    Handles all database operations related to expenses.

    This class serves as the single source of truth for database interactions,
    providing methods to create, read, update, and delete expense records.
    Implements complex installment distribution logic across billing cycles
    using PostgreSQL recursive CTEs.

    All async methods use autocommit connections for simplicity.
    Synchronous methods are provided for pandas DataFrame operations.
    """

    def __init__(self):
        """
        Initializes the repository by preparing the database connection string.

        The connection string is built from environment variables loaded in
        the config module. Connection parameters include host, port, database
        name, user, and password.
        """
        self.dsn = (
            f"host={config.DB_HOST} port={config.DB_PORT} "
            f"dbname={config.POSTGRES_DB} user={config.POSTGRES_USER} "
            f"password={config.POSTGRES_PASSWORD}"
        )

    async def _get_conn(self) -> psycopg.AsyncConnection:
        """
        Establishes an asynchronous, autocommit connection to the database.

        Returns:
            An async database connection with autocommit enabled.

        Raises:
            psycopg.OperationalError: If connection fails or times out.
        """
        return await psycopg.AsyncConnection.connect(
            self.dsn, autocommit=True, connect_timeout=10
        )

    async def add_expense(self, expense: Expense) -> int:
        """
        Inserts a new expense record into the database with current timestamp.

        The expense timestamp is automatically set to NOW() at insertion time.
        All other fields (amount, description, method, tag, category, installments)
        are taken from the provided Expense object.

        Args:
            expense: An Expense object containing the data to be inserted.
                The id and expense_ts fields are ignored; they will be set by the database.

        Returns:
            The ID of the newly created expense record.

        Raises:
            RuntimeError: If the database fails to return an ID after insertion.
            psycopg.Error: If database connection or query execution fails.
        """
        sql = """
            INSERT INTO public.expenses
                (expense_ts, amount, description, method, tag, category, installments)
            VALUES
                (NOW(), %s, %s, %s, %s, %s, %s)
            RETURNING id
        """
        params = (
            expense.amount,
            expense.description,
            expense.method,
            expense.tag,
            expense.category,
            expense.installments,
        )
        async with await self._get_conn() as conn:
            cursor = await conn.execute(sql, params)
            result = await cursor.fetchone()
            if not result:
                raise RuntimeError("Failed to retrieve ID after expense insertion.")
            return result[0]

    async def get_total_spent_in_period(self, start_dt: date, end_dt: date) -> Decimal:
        """
        Calculates the sum of expenses within a given date range, considering installments.

        Uses a recursive CTE to distribute installment payments across billing cycles.
        The installment distribution logic handles the transition from old billing cycle
        (4th-3rd) to new cycle (17th-16th) that occurred on Oct 4, 2025, with a
        special 44-day transition period ending Nov 16, 2025.

        Args:
            start_dt: Start date of the period (inclusive).
            end_dt: End date of the period (inclusive).

        Returns:
            Total amount spent during the period, quantized to 2 decimal places.
            Returns Decimal("0.00") if no expenses found.

        Raises:
            psycopg.Error: If database connection or query execution fails.
        """
        sql = """
            WITH RECURSIVE installment_cycles AS (
                SELECT
                    id,
                    expense_ts,
                    amount / installments AS installment_amount,
                    installments,
                    1 AS installment_number,
                    expense_ts AS current_ts
                FROM public.expenses
                WHERE installments > 1

                UNION ALL

                SELECT
                    ic.id,
                    ic.expense_ts,
                    ic.installment_amount,
                    ic.installments,
                    ic.installment_number + 1,
                    CASE
                        WHEN ic.current_ts::date >= DATE '2025-10-04' AND ic.current_ts::date < DATE '2025-11-17'
                        THEN DATE '2025-11-17' + (ic.current_ts::time)
                        ELSE ic.current_ts + INTERVAL '1 month'
                    END
                FROM installment_cycles ic
                WHERE ic.installment_number < ic.installments
            ),
            monthly_expenses AS (
                SELECT current_ts AS expense_ts, installment_amount AS amount
                FROM installment_cycles

                UNION ALL

                SELECT expense_ts, amount
                FROM public.expenses
                WHERE installments IS NULL OR installments <= 1
            )
            SELECT COALESCE(SUM(amount), 0) FROM monthly_expenses
            WHERE expense_ts::date BETWEEN %s AND %s
        """
        async with await self._get_conn() as conn:
            cursor = await conn.execute(sql, (start_dt, end_dt))
            row = await cursor.fetchone()

        total = row[0] if row and row[0] is not None else Decimal("0")
        return Decimal(total).quantize(Decimal("0.01"))

    async def delete_last_expense(self) -> Optional[int]:
        """
        Deletes the most recent expense record from the database.

        Identifies the expense with the highest ID (most recently inserted)
        and removes it from the database.

        Returns:
            The ID of the deleted expense if successful, None if no expenses exist.

        Raises:
            psycopg.Error: If database connection or query execution fails.
        """
        sql = """
            DELETE FROM public.expenses
            WHERE id = (SELECT id FROM public.expenses ORDER BY id DESC LIMIT 1)
            RETURNING id
        """
        async with await self._get_conn() as conn:
            cursor = await conn.execute(sql)
            row = await cursor.fetchone()
        return row[0] if row else None

    async def check_connection(self) -> bool:
        """
        Checks if a connection to the database can be established.

        Performs a simple SELECT 1 query to verify database connectivity.
        Used for health checks and startup validation.

        Returns:
            True if connection successful, False if connection fails.
        """
        try:
            async with await self._get_conn() as conn:
                await conn.execute("SELECT 1")
            return True
        except psycopg.Error:
            return False

    async def get_last_n_expenses(self, limit: int = 5) -> List[Expense]:
        """
        Fetches the last N expense records from the database.

        Retrieves expenses ordered by ID in descending order (most recent first).
        This returns the original expense records without installment distribution.

        Args:
            limit: Maximum number of expenses to retrieve (default: 5).

        Returns:
            List of Expense objects with id and expense_ts fields populated.
            Returns empty list if no expenses exist.

        Raises:
            psycopg.Error: If database connection or query execution fails.
        """
        sql = """
            SELECT id, expense_ts, amount, description, method, tag, category, installments
            FROM public.expenses
            ORDER BY id DESC
            LIMIT %s
        """
        expenses = []
        async with await self._get_conn() as conn:
            cursor = await conn.execute(sql, (limit,))
            rows = await cursor.fetchall()
            for row in rows:
                exp = Expense(
                    amount=row[2],
                    description=row[3],
                    method=row[4],
                    tag=row[5],
                    category=row[6],
                    installments=row[7],
                )
                exp.id = row[0]
                exp.expense_ts = row[1]
                expenses.append(exp)
        return expenses

    def get_all_expenses_as_dataframe(self) -> pd.DataFrame:
        """
        Fetches all expenses with installment distribution as a pandas DataFrame.

        Uses a recursive CTE to generate virtual rows for each installment payment.
        Installment descriptions are appended with "(X/Y)" to indicate the installment
        number. Timestamps are converted to the configured timezone.

        The installment distribution handles the billing cycle transition from
        old (4th-3rd) to new (17th-16th) schedules starting Oct 4, 2025.

        Returns:
            pandas DataFrame with columns: id, expense_ts, amount, description,
            method, tag, category, installment_number, installments.
            Returns empty DataFrame if database connection fails.

        Note:
            This method uses a synchronous connection for pandas compatibility.
            Database errors are logged and an empty DataFrame is returned.
        """
        sql = """
            WITH RECURSIVE installment_cycles AS (
                SELECT
                    id,
                    expense_ts,
                    amount / installments AS installment_amount,
                    description,
                    method,
                    tag,
                    category,
                    installments,
                    1 AS installment_number,
                    expense_ts AS current_ts
                FROM public.expenses
                WHERE installments > 1

                UNION ALL

                SELECT
                    ic.id,
                    ic.expense_ts,
                    ic.installment_amount,
                    ic.description,
                    ic.method,
                    ic.tag,
                    ic.category,
                    ic.installments,
                    ic.installment_number + 1,
                    CASE
                        WHEN ic.current_ts::date >= DATE '2025-10-04' AND ic.current_ts::date < DATE '2025-11-17'
                        THEN DATE '2025-11-17' + (ic.current_ts::time)
                        ELSE ic.current_ts + INTERVAL '1 month'
                    END
                FROM installment_cycles ic
                WHERE ic.installment_number < ic.installments
            ),
            monthly_expenses AS (
                SELECT
                    id,
                    current_ts AS expense_ts,
                    installment_amount AS amount,
                    description || ' (' || installment_number || '/' || installments || ')' AS description,
                    method,
                    tag,
                    category,
                    installment_number,
                    installments
                FROM installment_cycles

                UNION ALL

                SELECT
                    id,
                    expense_ts,
                    amount,
                    description,
                    method,
                    tag,
                    category,
                    1 AS installment_number,
                    COALESCE(installments, 1) AS installments
                FROM public.expenses
                WHERE installments IS NULL OR installments <= 1
            )
            SELECT * FROM monthly_expenses ORDER BY expense_ts DESC
        """
        try:
            with psycopg.connect(self.dsn) as conn:
                df = pd.read_sql_query(sql, conn, parse_dates=["expense_ts"])

            if (
                pd.api.types.is_datetime64_any_dtype(df["expense_ts"])
                and df["expense_ts"].dt.tz is not None
            ):
                df["expense_ts"] = df["expense_ts"].dt.tz_convert(config.TZ)

            return df
        except psycopg.Error as e:
            log.error(
                f"Database connection error in get_all_expenses_as_dataframe: {e}",
                exc_info=True,
            )
            return pd.DataFrame()

    def get_expenses_in_range_as_dataframe(
        self, start_date: date, end_date: date
    ) -> pd.DataFrame:
        """
        Fetches expenses within a date range with installment distribution as a DataFrame.

        Uses a recursive CTE to generate virtual rows for each installment payment,
        filtering to only include expenses whose distributed installment dates fall
        within the specified range. Installment descriptions are appended with "(X/Y)".

        The installment distribution handles the billing cycle transition from
        old (4th-3rd) to new (17th-16th) schedules starting Oct 4, 2025.

        Args:
            start_date: Start date of the range (inclusive).
            end_date: End date of the range (inclusive).

        Returns:
            pandas DataFrame with columns: id, expense_ts, amount, description,
            method, tag, category, installment_number, installments.
            Returns empty DataFrame if database connection fails or no data found.

        Note:
            This method uses a synchronous connection for pandas compatibility.
            Database errors are logged and an empty DataFrame is returned.
        """
        sql = """
            WITH RECURSIVE installment_cycles AS (
                SELECT
                    id,
                    expense_ts,
                    amount / installments AS installment_amount,
                    description,
                    method,
                    tag,
                    category,
                    installments,
                    1 AS installment_number,
                    expense_ts AS current_ts
                FROM public.expenses
                WHERE installments > 1

                UNION ALL

                SELECT
                    ic.id,
                    ic.expense_ts,
                    ic.installment_amount,
                    ic.description,
                    ic.method,
                    ic.tag,
                    ic.category,
                    ic.installments,
                    ic.installment_number + 1,
                    CASE
                        WHEN ic.current_ts::date >= DATE '2025-10-04' AND ic.current_ts::date < DATE '2025-11-17'
                        THEN DATE '2025-11-17' + (ic.current_ts::time)
                        ELSE ic.current_ts + INTERVAL '1 month'
                    END
                FROM installment_cycles ic
                WHERE ic.installment_number < ic.installments
            ),
            monthly_expenses AS (
                SELECT
                    id,
                    current_ts AS expense_ts,
                    installment_amount AS amount,
                    description || ' (' || installment_number || '/' || installments || ')' AS description,
                    method,
                    tag,
                    category,
                    installment_number,
                    installments
                FROM installment_cycles

                UNION ALL

                SELECT
                    id,
                    expense_ts,
                    amount,
                    description,
                    method,
                    tag,
                    category,
                    1 AS installment_number,
                    COALESCE(installments, 1) AS installments
                FROM public.expenses
                WHERE installments IS NULL OR installments <= 1
            )
            SELECT * FROM monthly_expenses
            WHERE expense_ts::date BETWEEN %s AND %s
            ORDER BY expense_ts DESC
        """
        try:
            with psycopg.connect(self.dsn) as conn:
                df = pd.read_sql_query(
                    sql, conn, params=(start_date, end_date), parse_dates=["expense_ts"]
                )

            if (
                pd.api.types.is_datetime64_any_dtype(df["expense_ts"])
                and df["expense_ts"].dt.tz is not None
            ):
                df["expense_ts"] = df["expense_ts"].dt.tz_convert(config.TZ)
            return df
        except psycopg.Error as e:
            log.error(
                f"Database connection error in get_expenses_in_range_as_dataframe: {e}",
                exc_info=True,
            )
            return pd.DataFrame()
