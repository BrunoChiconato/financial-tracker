from datetime import date
from decimal import Decimal
from typing import Optional, List

import psycopg
import pandas as pd

from src.core import config
from src.core.models import Expense


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
        """Establishes an asynchronous, autocommit connection to the database."""
        return await psycopg.AsyncConnection.connect(self.dsn, autocommit=True)

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
        Calculates the sum of expenses within a given date range.
        """
        sql = "SELECT COALESCE(SUM(amount), 0) FROM public.expenses WHERE expense_ts::date BETWEEN %s AND %s"
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
        Fetches all expenses and returns them as a pandas DataFrame.
        Uses a synchronous connection, ideal for pandas.read_sql_query.
        """
        sql = "SELECT id, expense_ts, amount, description, method, tag, category, installments FROM public.expenses"
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
            print(f"Database connection error in dashboard: {e}")
            return pd.DataFrame()

    def get_expenses_in_range_as_dataframe(
        self, start_date: date, end_date: date
    ) -> pd.DataFrame:
        """
        Fetches expenses within a specific date range and returns them as a pandas DataFrame.
        """
        sql = "SELECT id, expense_ts, amount, description, method, tag, category, installments FROM public.expenses WHERE expense_ts::date BETWEEN %s AND %s"
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
            print(f"Database connection error in dashboard: {e}")
            return pd.DataFrame()
