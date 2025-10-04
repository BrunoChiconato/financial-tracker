import re
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from decimal import Decimal

from src.core import config


def get_cycle_reset_day_for_date(reference_date: date) -> int:
    """
    Returns the appropriate cycle reset day based on the reference date.

    Returns 4 for dates before October 4, 2025, and 17 for dates from
    October 4, 2025 onwards (following the credit card cycle change).

    Args:
        reference_date: The date to check against the transition date.

    Returns:
        The cycle reset day (4 or 17).
    """
    if reference_date >= config.CYCLE_CHANGE_DATE:
        return config.CYCLE_RESET_DAY_NEW
    return config.CYCLE_RESET_DAY_OLD


def get_cycle_start(today: date) -> date:
    """
    Calculates the start date of the current billing cycle.

    Handles the transition from old billing cycle (4th-3rd) to new cycle
    (17th-16th) starting October 4, 2025, with a transition cycle from
    Oct 4 to Nov 16, 2025.
    """
    if config.CYCLE_CHANGE_DATE <= today <= config.CYCLE_TRANSITION_END_DATE:
        return config.CYCLE_CHANGE_DATE

    if today > config.CYCLE_TRANSITION_END_DATE:
        cycle_day = config.CYCLE_RESET_DAY_NEW
    else:
        cycle_day = config.CYCLE_RESET_DAY_OLD

    if today.day >= cycle_day:
        return date(today.year, today.month, cycle_day)

    first_of_month = today.replace(day=1)
    prev_month_last = first_of_month - timedelta(days=1)
    return date(prev_month_last.year, prev_month_last.month, cycle_day)


def brl(v: Decimal) -> str:
    """Formats a Decimal value into a BRL currency string."""
    return f"R$ {v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def escape_markdown_v2(text: str) -> str:
    """Escapes special characters for Telegram's MarkdownV2 parse mode."""
    escape_chars = r"[_*\[\]()~`>#+-=|{}.!]"
    return re.sub(f"({escape_chars})", r"\\\1", text)


def get_current_and_previous_cycle_dates(today: date) -> dict[str, dict[str, date]]:
    """
    Calculates the start/end dates for the current and previous billing cycles.

    Handles the transition from old billing cycle (4th-3rd) to new cycle
    (17th-16th) with special handling for the transition period (Oct 4 - Nov 16, 2025).
    """
    if config.CYCLE_CHANGE_DATE <= today <= config.CYCLE_TRANSITION_END_DATE:
        current_cycle_start = config.CYCLE_CHANGE_DATE
        current_cycle_end = config.CYCLE_TRANSITION_END_DATE
        previous_cycle_end = config.CYCLE_CHANGE_DATE - relativedelta(days=1)
        previous_cycle_start = previous_cycle_end - relativedelta(months=1) + relativedelta(days=1)
    elif today > config.CYCLE_TRANSITION_END_DATE:
        cycle_day = config.CYCLE_RESET_DAY_NEW

        if today.day < cycle_day:
            current_cycle_end = today.replace(day=cycle_day) - relativedelta(days=1)
        else:
            current_cycle_end = (
                today.replace(day=cycle_day) + relativedelta(months=1)
            ) - relativedelta(days=1)

        current_cycle_start = (
            current_cycle_end + relativedelta(days=1)
        ) - relativedelta(months=1)

        transition_next_cycle_start = config.CYCLE_TRANSITION_END_DATE + relativedelta(days=1)
        if current_cycle_start == transition_next_cycle_start:
            previous_cycle_start = config.CYCLE_CHANGE_DATE
            previous_cycle_end = config.CYCLE_TRANSITION_END_DATE
        else:
            previous_cycle_start = current_cycle_start - relativedelta(months=1)
            previous_cycle_end = current_cycle_end - relativedelta(months=1)
    else:
        cycle_day = config.CYCLE_RESET_DAY_OLD

        if today.day < cycle_day:
            current_cycle_end = today.replace(day=cycle_day) - relativedelta(days=1)
        else:
            current_cycle_end = (
                today.replace(day=cycle_day) + relativedelta(months=1)
            ) - relativedelta(days=1)

        current_cycle_start = (
            current_cycle_end + relativedelta(days=1)
        ) - relativedelta(months=1)

        previous_cycle_start = current_cycle_start - relativedelta(months=1)
        previous_cycle_end = current_cycle_end - relativedelta(months=1)

    return {
        "current": {"start": current_cycle_start, "end": current_cycle_end},
        "previous": {"start": previous_cycle_start, "end": previous_cycle_end},
    }
