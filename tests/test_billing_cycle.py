"""
Test suite for billing cycle logic with transition from old to new cycle.

Tests verify that:
1. Old logic (4th-3rd cycle) works correctly for dates before October 4, 2025
2. New logic (17th-16th cycle) works correctly for dates from October 4, 2025 onwards
3. Transition cycle (Oct 4 - Nov 16, 2025) is handled correctly
4. Edge cases around the transition date are handled properly
"""

import pytest
from datetime import date
from dateutil.relativedelta import relativedelta
from src.core.utils import (
    get_cycle_reset_day_for_date,
    get_cycle_start,
    get_current_and_previous_cycle_dates,
)
from src.core import config


def billing_cycle_range(year: int, month: int) -> tuple[date, date]:
    """
    Test version of billing_cycle_range to avoid importing streamlit.

    Invoice month represents the month when the cycle is typically due/analyzed.

    Examples:
    - Invoice month Sept 2025 → Aug 4 to Sept 3 (old logic)
    - Invoice month Oct 2025 → Oct 4 to Nov 16 (transition cycle)
    - Invoice month Nov 2025 → Nov 17 to Dec 16 (new logic)
    - Invoice month Dec 2025 → Dec 17 to Jan 16 (new logic)
    """
    invoice_month = date(year, month, 1)

    if invoice_month == date(2025, 10, 1):
        return config.CYCLE_CHANGE_DATE, config.CYCLE_TRANSITION_END_DATE

    if invoice_month >= date(2025, 11, 1):
        cycle_day = config.CYCLE_RESET_DAY_NEW
        start = invoice_month + relativedelta(day=cycle_day)
        end = start + relativedelta(months=1, days=-1)
    else:
        cycle_day = config.CYCLE_RESET_DAY_OLD
        start = invoice_month + relativedelta(day=cycle_day)
        end = start + relativedelta(months=1, days=-1)

    return start, end


class TestGetCycleResetDayForDate:
    """Tests for get_cycle_reset_day_for_date function."""

    def test_old_cycle_day_before_transition(self):
        """Dates before Oct 4, 2025 should return day 4."""
        assert get_cycle_reset_day_for_date(date(2025, 8, 15)) == 4
        assert get_cycle_reset_day_for_date(date(2025, 9, 30)) == 4
        assert get_cycle_reset_day_for_date(date(2025, 10, 3)) == 4

    def test_new_cycle_day_on_and_after_transition(self):
        """Dates from Oct 4, 2025 onwards should return day 17."""
        assert get_cycle_reset_day_for_date(date(2025, 10, 4)) == 17
        assert get_cycle_reset_day_for_date(date(2025, 10, 20)) == 17
        assert get_cycle_reset_day_for_date(date(2025, 11, 17)) == 17
        assert get_cycle_reset_day_for_date(date(2026, 1, 20)) == 17


class TestGetCycleStartOldLogic:
    """Tests for get_cycle_start with old logic (before Oct 4, 2025)."""

    def test_august_2025_cycle(self):
        """Aug 15, 2025 should return Aug 4, 2025."""
        assert get_cycle_start(date(2025, 8, 15)) == date(2025, 8, 4)

    def test_september_2025_cycle(self):
        """Sept 25, 2025 should return Sept 4, 2025."""
        assert get_cycle_start(date(2025, 9, 25)) == date(2025, 9, 4)

    def test_october_3_2025_last_old_cycle(self):
        """Oct 3, 2025 (last day of old cycle) should return Sept 4, 2025."""
        assert get_cycle_start(date(2025, 10, 3)) == date(2025, 9, 4)

    def test_september_3_2025_boundary(self):
        """Sept 3, 2025 (last day of Aug cycle) should return Aug 4, 2025."""
        assert get_cycle_start(date(2025, 9, 3)) == date(2025, 8, 4)

    def test_september_4_2025_cycle_start(self):
        """Sept 4, 2025 (cycle start) should return Sept 4, 2025."""
        assert get_cycle_start(date(2025, 9, 4)) == date(2025, 9, 4)


class TestGetCycleStartTransitionPeriod:
    """Tests for get_cycle_start during transition period (Oct 4 - Nov 16, 2025)."""

    def test_october_4_2025_transition_start(self):
        """Oct 4, 2025 should return Oct 4, 2025 (start of transition cycle)."""
        assert get_cycle_start(date(2025, 10, 4)) == date(2025, 10, 4)

    def test_october_20_2025_during_transition(self):
        """Oct 20, 2025 (during transition) should return Oct 4, 2025."""
        assert get_cycle_start(date(2025, 10, 20)) == date(2025, 10, 4)

    def test_november_10_2025_during_transition(self):
        """Nov 10, 2025 (during transition) should return Oct 4, 2025."""
        assert get_cycle_start(date(2025, 11, 10)) == date(2025, 10, 4)

    def test_november_16_2025_transition_end(self):
        """Nov 16, 2025 (last day of transition) should return Oct 4, 2025."""
        assert get_cycle_start(date(2025, 11, 16)) == date(2025, 10, 4)


class TestGetCycleStartNewLogic:
    """Tests for get_cycle_start with new logic (after Nov 16, 2025)."""

    def test_november_17_2025_first_regular_new_cycle(self):
        """Nov 17, 2025 should return Nov 17, 2025 (first regular new cycle)."""
        assert get_cycle_start(date(2025, 11, 17)) == date(2025, 11, 17)

    def test_december_20_2025_new_cycle(self):
        """Dec 20, 2025 should return Dec 17, 2025."""
        assert get_cycle_start(date(2025, 12, 20)) == date(2025, 12, 17)

    def test_january_20_2026_new_cycle(self):
        """Jan 20, 2026 should return Jan 17, 2026."""
        assert get_cycle_start(date(2026, 1, 20)) == date(2026, 1, 17)

    def test_december_16_2025_boundary(self):
        """Dec 16, 2025 (last day of Nov cycle) should return Nov 17, 2025."""
        assert get_cycle_start(date(2025, 12, 16)) == date(2025, 11, 17)

    def test_december_17_2025_cycle_start(self):
        """Dec 17, 2025 (cycle start) should return Dec 17, 2025."""
        assert get_cycle_start(date(2025, 12, 17)) == date(2025, 12, 17)


class TestGetCurrentAndPreviousCycleDatesOldLogic:
    """Tests for get_current_and_previous_cycle_dates with old logic."""

    def test_august_15_2025_cycles(self):
        """Aug 15, 2025 should return correct current and previous cycles."""
        result = get_current_and_previous_cycle_dates(date(2025, 8, 15))
        assert result["current"]["start"] == date(2025, 8, 4)
        assert result["current"]["end"] == date(2025, 9, 3)
        assert result["previous"]["start"] == date(2025, 7, 4)
        assert result["previous"]["end"] == date(2025, 8, 3)

    def test_september_25_2025_cycles(self):
        """Sept 25, 2025 should return correct current and previous cycles."""
        result = get_current_and_previous_cycle_dates(date(2025, 9, 25))
        assert result["current"]["start"] == date(2025, 9, 4)
        assert result["current"]["end"] == date(2025, 10, 3)
        assert result["previous"]["start"] == date(2025, 8, 4)
        assert result["previous"]["end"] == date(2025, 9, 3)

    def test_october_3_2025_last_old_cycle_day(self):
        """Oct 3, 2025 (last day of old cycle) should return correct cycles."""
        result = get_current_and_previous_cycle_dates(date(2025, 10, 3))
        assert result["current"]["start"] == date(2025, 9, 4)
        assert result["current"]["end"] == date(2025, 10, 3)
        assert result["previous"]["start"] == date(2025, 8, 4)
        assert result["previous"]["end"] == date(2025, 9, 3)


class TestGetCurrentAndPreviousCycleDatesTransition:
    """Tests for get_current_and_previous_cycle_dates during transition."""

    def test_october_4_2025_transition_start(self):
        """Oct 4, 2025 should return transition cycle as current."""
        result = get_current_and_previous_cycle_dates(date(2025, 10, 4))
        assert result["current"]["start"] == date(2025, 10, 4)
        assert result["current"]["end"] == date(2025, 11, 16)
        assert result["previous"]["start"] == date(2025, 9, 4)
        assert result["previous"]["end"] == date(2025, 10, 3)

    def test_october_20_2025_during_transition(self):
        """Oct 20, 2025 should return transition cycle as current."""
        result = get_current_and_previous_cycle_dates(date(2025, 10, 20))
        assert result["current"]["start"] == date(2025, 10, 4)
        assert result["current"]["end"] == date(2025, 11, 16)
        assert result["previous"]["start"] == date(2025, 9, 4)
        assert result["previous"]["end"] == date(2025, 10, 3)

    def test_november_16_2025_transition_end(self):
        """Nov 16, 2025 (last day of transition) should return transition cycle."""
        result = get_current_and_previous_cycle_dates(date(2025, 11, 16))
        assert result["current"]["start"] == date(2025, 10, 4)
        assert result["current"]["end"] == date(2025, 11, 16)
        assert result["previous"]["start"] == date(2025, 9, 4)
        assert result["previous"]["end"] == date(2025, 10, 3)


class TestGetCurrentAndPreviousCycleDatesNewLogic:
    """Tests for get_current_and_previous_cycle_dates with new logic."""

    def test_november_17_2025_first_regular_new_cycle(self):
        """Nov 17, 2025 should have transition cycle as previous."""
        result = get_current_and_previous_cycle_dates(date(2025, 11, 17))
        assert result["current"]["start"] == date(2025, 11, 17)
        assert result["current"]["end"] == date(2025, 12, 16)
        assert result["previous"]["start"] == date(2025, 10, 4)
        assert result["previous"]["end"] == date(2025, 11, 16)

    def test_december_20_2025_new_cycle(self):
        """Dec 20, 2025 should return correct new cycles."""
        result = get_current_and_previous_cycle_dates(date(2025, 12, 20))
        assert result["current"]["start"] == date(2025, 12, 17)
        assert result["current"]["end"] == date(2026, 1, 16)
        assert result["previous"]["start"] == date(2025, 11, 17)
        assert result["previous"]["end"] == date(2025, 12, 16)

    def test_january_20_2026_new_cycle(self):
        """Jan 20, 2026 should return correct new cycles."""
        result = get_current_and_previous_cycle_dates(date(2026, 1, 20))
        assert result["current"]["start"] == date(2026, 1, 17)
        assert result["current"]["end"] == date(2026, 2, 16)
        assert result["previous"]["start"] == date(2025, 12, 17)
        assert result["previous"]["end"] == date(2026, 1, 16)


class TestBillingCycleRangeOldLogic:
    """Tests for billing_cycle_range with old logic (invoice months before Nov 2025)."""

    def test_august_2025_invoice_month(self):
        """August 2025 invoice month should return Aug 4 - Sept 3."""
        start, end = billing_cycle_range(2025, 8)
        assert start == date(2025, 8, 4)
        assert end == date(2025, 9, 3)

    def test_september_2025_invoice_month(self):
        """September 2025 invoice month should return Sept 4 - Oct 3."""
        start, end = billing_cycle_range(2025, 9)
        assert start == date(2025, 9, 4)
        assert end == date(2025, 10, 3)

    def test_october_2025_invoice_month(self):
        """October 2025 invoice month should return transition cycle (Oct 4 - Nov 16)."""
        start, end = billing_cycle_range(2025, 10)
        assert start == date(2025, 10, 4)
        assert end == date(2025, 11, 16)


class TestBillingCycleRangeTransition:
    """Tests for billing_cycle_range during transition (invoice month Oct 2025)."""

    def test_november_2025_invoice_month_new_logic(self):
        """November 2025 invoice month should return Nov 17 - Dec 16 (new logic)."""
        start, end = billing_cycle_range(2025, 11)
        assert start == date(2025, 11, 17)
        assert end == date(2025, 12, 16)


class TestBillingCycleRangeNewLogic:
    """Tests for billing_cycle_range with new logic (invoice months from Dec 2025)."""

    def test_december_2025_invoice_month(self):
        """December 2025 invoice month should return Dec 17 - Jan 16."""
        start, end = billing_cycle_range(2025, 12)
        assert start == date(2025, 12, 17)
        assert end == date(2026, 1, 16)

    def test_january_2026_invoice_month(self):
        """January 2026 invoice month should return Jan 17 - Feb 16."""
        start, end = billing_cycle_range(2026, 1)
        assert start == date(2026, 1, 17)
        assert end == date(2026, 2, 16)

    def test_february_2026_invoice_month(self):
        """February 2026 invoice month should return Feb 17 - Mar 16."""
        start, end = billing_cycle_range(2026, 2)
        assert start == date(2026, 2, 17)
        assert end == date(2026, 3, 16)


class TestEdgeCases:
    """Additional edge case tests for transition period."""

    def test_cycle_boundaries_september_to_october(self):
        """Test boundaries around Sept/Oct transition."""
        sept_3 = get_current_and_previous_cycle_dates(date(2025, 9, 3))
        sept_4 = get_current_and_previous_cycle_dates(date(2025, 9, 4))

        assert sept_3["current"]["start"] == date(2025, 8, 4)
        assert sept_3["current"]["end"] == date(2025, 9, 3)

        assert sept_4["current"]["start"] == date(2025, 9, 4)
        assert sept_4["current"]["end"] == date(2025, 10, 3)

    def test_cycle_boundaries_october_to_november(self):
        """Test boundaries around Oct/Nov transition."""
        oct_3 = get_current_and_previous_cycle_dates(date(2025, 10, 3))
        oct_4 = get_current_and_previous_cycle_dates(date(2025, 10, 4))

        assert oct_3["current"]["start"] == date(2025, 9, 4)
        assert oct_3["current"]["end"] == date(2025, 10, 3)

        assert oct_4["current"]["start"] == date(2025, 10, 4)
        assert oct_4["current"]["end"] == date(2025, 11, 16)

    def test_cycle_boundaries_november_to_december(self):
        """Test boundaries around Nov/Dec transition."""
        nov_16 = get_current_and_previous_cycle_dates(date(2025, 11, 16))
        nov_17 = get_current_and_previous_cycle_dates(date(2025, 11, 17))

        assert nov_16["current"]["start"] == date(2025, 10, 4)
        assert nov_16["current"]["end"] == date(2025, 11, 16)

        assert nov_17["current"]["start"] == date(2025, 11, 17)
        assert nov_17["current"]["end"] == date(2025, 12, 16)

    def test_transition_cycle_length(self):
        """Verify transition cycle is 44 days long (Oct 4 - Nov 16)."""
        result = get_current_and_previous_cycle_dates(date(2025, 10, 15))
        cycle_length = (result["current"]["end"] - result["current"]["start"]).days + 1
        assert cycle_length == 44