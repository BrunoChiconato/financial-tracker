import re
from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from decimal import Decimal

from src.core import config


def get_cycle_start(today: date) -> date:
    """Calculates the start date of the current billing cycle."""
    if today.day >= config.CYCLE_RESET_DAY:
        return date(today.year, today.month, config.CYCLE_RESET_DAY)

    first_of_month = today.replace(day=1)
    prev_month_last = first_of_month - timedelta(days=1)
    return date(prev_month_last.year, prev_month_last.month, config.CYCLE_RESET_DAY)


def brl(v: Decimal) -> str:
    """Formats a Decimal value into a BRL currency string."""
    return f"R$ {v:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def escape_markdown_v2(text: str) -> str:
    """Escapes special characters for Telegram's MarkdownV2 parse mode."""
    escape_chars = r"[_*\[\]()~`>#+-=|{}.!]"
    return re.sub(f"({escape_chars})", r"\\\1", text)


def get_current_and_previous_cycle_dates(today: date) -> dict:
    """
    Calculates the start and end dates for the current and previous billing cycles.
    A cycle starts on day 4 of a month and ends on day 3 of the next month.
    """
    cycle_reset_day = config.CYCLE_RESET_DAY  # Dia 4

    if today.day < cycle_reset_day:
        current_cycle_end = today.replace(day=cycle_reset_day) - relativedelta(days=1)
    else:
        current_cycle_end = (
            today.replace(day=cycle_reset_day) + relativedelta(months=1)
        ) - relativedelta(days=1)

    current_cycle_start = (current_cycle_end + relativedelta(days=1)) - relativedelta(
        months=1
    )

    previous_cycle_start = current_cycle_start - relativedelta(months=1)
    previous_cycle_end = current_cycle_end - relativedelta(months=1)

    return {
        "current": {"start": current_cycle_start, "end": current_cycle_end},
        "previous": {"start": previous_cycle_start, "end": previous_cycle_end},
    }
