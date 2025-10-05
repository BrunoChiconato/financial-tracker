"""
Tests for invoice month calculation logic in the Streamlit dashboard.

This test suite verifies that the get_invoice_month_for_date function
correctly maps expense dates to their corresponding billing cycle invoice months,
especially during the transition period from Oct 4 - Nov 16, 2025.
"""

from datetime import date
from dateutil.relativedelta import relativedelta
import pytest

from src.core import config


def get_invoice_month_for_date(expense_date: date) -> date:
    """
    Returns the invoice month (as first day of month) for a given expense date.

    The invoice month is the month when the billing cycle containing this
    expense ends (when the bill is due).
    """
    if expense_date < config.CYCLE_CHANGE_DATE:
        if expense_date.day >= config.CYCLE_RESET_DAY_OLD:
            return (expense_date + relativedelta(months=1)).replace(day=1)
        else:
            return expense_date.replace(day=1)

    if expense_date <= config.CYCLE_TRANSITION_END_DATE:
        return date(2025, 11, 1)

    if expense_date.day >= config.CYCLE_RESET_DAY_NEW:
        return (expense_date + relativedelta(months=1)).replace(day=1)
    else:
        return expense_date.replace(day=1)


class TestInvoiceMonthCalculation:
    """Test cases for invoice month calculation across different billing cycles."""

    def test_old_cycle_beginning(self):
        """Expenses on day 4+ should belong to next month's invoice (old cycle)."""
        assert get_invoice_month_for_date(date(2025, 9, 4)) == date(2025, 10, 1)
        assert get_invoice_month_for_date(date(2025, 9, 15)) == date(2025, 10, 1)
        assert get_invoice_month_for_date(date(2025, 9, 30)) == date(2025, 10, 1)

    def test_old_cycle_end(self):
        """Expenses on day 1-3 should belong to current month's invoice (old cycle)."""
        assert get_invoice_month_for_date(date(2025, 10, 1)) == date(2025, 10, 1)
        assert get_invoice_month_for_date(date(2025, 10, 2)) == date(2025, 10, 1)
        assert get_invoice_month_for_date(date(2025, 10, 3)) == date(2025, 10, 1)

    def test_transition_cycle_start(self):
        """Oct 4, 2025 starts the transition cycle (invoice month Nov 2025)."""
        assert get_invoice_month_for_date(date(2025, 10, 4)) == date(2025, 11, 1)

    def test_transition_cycle_middle(self):
        """All dates in transition period belong to Nov 2025 invoice."""
        assert get_invoice_month_for_date(date(2025, 10, 15)) == date(2025, 11, 1)
        assert get_invoice_month_for_date(date(2025, 11, 1)) == date(2025, 11, 1)
        assert get_invoice_month_for_date(date(2025, 11, 10)) == date(2025, 11, 1)

    def test_transition_cycle_end(self):
        """Nov 16, 2025 is the last day of transition cycle (invoice month Nov 2025)."""
        assert get_invoice_month_for_date(date(2025, 11, 16)) == date(2025, 11, 1)

    def test_new_cycle_start(self):
        """Nov 17, 2025 starts the first new cycle (invoice month Dec 2025)."""
        assert get_invoice_month_for_date(date(2025, 11, 17)) == date(2025, 12, 1)

    def test_new_cycle_beginning(self):
        """Expenses on day 17+ should belong to next month's invoice (new cycle)."""
        assert get_invoice_month_for_date(date(2025, 12, 17)) == date(2026, 1, 1)
        assert get_invoice_month_for_date(date(2025, 12, 25)) == date(2026, 1, 1)
        assert get_invoice_month_for_date(date(2025, 12, 31)) == date(2026, 1, 1)

    def test_new_cycle_end(self):
        """Expenses on day 1-16 should belong to current month's invoice (new cycle)."""
        assert get_invoice_month_for_date(date(2026, 1, 1)) == date(2026, 1, 1)
        assert get_invoice_month_for_date(date(2026, 1, 10)) == date(2026, 1, 1)
        assert get_invoice_month_for_date(date(2026, 1, 16)) == date(2026, 1, 1)

    def test_six_installment_purchase_oct_4(self):
        """
        Verify the specific bug case: a 6-installment purchase on Oct 4, 2025.

        Expected installment distribution:
        1. Oct 4, 2025 → Nov 2025 invoice
        2. Nov 17, 2025 → Dec 2025 invoice
        3. Dec 17, 2025 → Jan 2026 invoice
        4. Jan 17, 2026 → Feb 2026 invoice
        5. Feb 17, 2026 → Mar 2026 invoice
        6. Mar 17, 2026 → Apr 2026 invoice (this was missing!)
        """
        installment_dates = [
            date(2025, 10, 4),
            date(2025, 11, 17),
            date(2025, 12, 17),
            date(2026, 1, 17),
            date(2026, 2, 17),
            date(2026, 3, 17),
        ]

        expected_invoice_months = [
            date(2025, 11, 1),
            date(2025, 12, 1),
            date(2026, 1, 1),
            date(2026, 2, 1),
            date(2026, 3, 1),
            date(2026, 4, 1),
        ]

        for inst_date, expected_invoice in zip(
            installment_dates, expected_invoice_months
        ):
            actual_invoice = get_invoice_month_for_date(inst_date)
            assert actual_invoice == expected_invoice, (
                f"Installment {inst_date} should belong to invoice month "
                f"{expected_invoice.strftime('%m/%Y')}, but got "
                f"{actual_invoice.strftime('%m/%Y')}"
            )

    def test_year_boundary_old_cycle(self):
        """Test year transitions with old cycle logic."""
        assert get_invoice_month_for_date(date(2024, 12, 4)) == date(2025, 1, 1)
        assert get_invoice_month_for_date(date(2025, 1, 3)) == date(2025, 1, 1)

    def test_year_boundary_new_cycle(self):
        """Test year transitions with new cycle logic."""
        assert get_invoice_month_for_date(date(2025, 12, 17)) == date(2026, 1, 1)
        assert get_invoice_month_for_date(date(2026, 1, 16)) == date(2026, 1, 1)
        assert get_invoice_month_for_date(date(2026, 1, 17)) == date(2026, 2, 1)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
