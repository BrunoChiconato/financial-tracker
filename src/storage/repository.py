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
    It is the single source of truth for database interaction.
    """

    def __init__(self):
        """Initializes the repository by preparing the database connection string."""
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
        Inserts a new expense record into the database.
        Args:
            expense: An Expense object containing the data to be inserted.
        Returns:
            The ID of the newly created expense record.
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

        Installments are distributed across billing cycles based on the original purchase date.
        Purchases on/after Oct 4, 2025 follow the new cycle (17th-16th), while purchases
        before follow the old cycle (4th-3rd).
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
        """Deletes the most recent expense and returns its ID if successful."""
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
        """Checks if a connection to the database can be established."""
        try:
            async with await self._get_conn() as conn:
                await conn.execute("SELECT 1")
            return True
        except psycopg.Error:
            return False

    async def get_last_n_expenses(self, limit: int = 5) -> List[Expense]:
        """Fetches the last N expense records from the database."""
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
        Fetches all expenses, generating installment rows, and returns them as a pandas DataFrame.

        Installments are distributed across billing cycles by adding the appropriate
        number of days to align with the next cycle start dates. This handles the
        transition from 4th-3rd cycles to 17th-16th cycles starting Oct 4, 2025.
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
        Fetches expenses within a date range, generating installment rows,
        and returns them as a pandas DataFrame.

        Installments are distributed across billing cycles by adding the appropriate
        number of days to align with the next cycle start dates. This handles the
        transition from 4th-3rd cycles to 17th-16th cycles starting Oct 4, 2025.
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
