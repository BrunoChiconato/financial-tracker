"""
Application Configuration Module.

Loads environment variables, application settings, and allowed values from
the configuration file. Defines all constants used throughout the application
including database credentials, billing cycle dates, and validation rules.
"""

import json
import os
import re
import unicodedata
from datetime import date
from pathlib import Path


def _strip_accents_lower(s: str) -> str:
    """
    Normalizes accents, removes extra whitespace, and lowercases a string.

    Used for case-insensitive and accent-insensitive matching of categories,
    tags, and payment methods.

    Args:
        s: The input string to normalize.

    Returns:
        Normalized, lowercased string without accents.
    """
    n = unicodedata.normalize("NFKD", s)
    n = "".join(ch for ch in n if not unicodedata.combining(ch))
    return re.sub(r"\s+", " ", n).strip().lower()


def _load_app_config() -> dict:
    """
    Loads allowed values for categories, tags, and methods from the config file.

    Attempts to load from /app/config/categories.json (Docker path) first,
    then falls back to the local development path if not found.

    Returns:
        Dictionary containing methods, tags, and categories_display lists.

    Raises:
        FileNotFoundError: If the configuration file cannot be found.
    """
    config_path = Path("/app/config/categories.json")
    if not config_path.exists():
        config_path = Path(__file__).parent.parent.parent / "config" / "categories.json"

    if not config_path.exists():
        raise FileNotFoundError(f"Configuration file not found at {config_path}")

    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)


_app_config: dict = _load_app_config()

POSTGRES_PASSWORD: str = os.getenv("POSTGRES_PASSWORD", "change_me")
POSTGRES_USER: str = os.getenv("POSTGRES_USER", "finance")
POSTGRES_DB: str = os.getenv("POSTGRES_DB", "finance")

DB_HOST: str = os.getenv("DB_HOST", "db")
if not DB_HOST or not DB_HOST.strip():
    raise ValueError("DB_HOST cannot be empty")

DB_PORT: int = int(os.getenv("DB_PORT", "5432"))
if not (1 <= DB_PORT <= 65535):
    raise ValueError(f"DB_PORT must be between 1 and 65535, got {DB_PORT}")

TELEGRAM_BOT_TOKEN: str | None = os.environ.get("TELEGRAM_BOT_TOKEN")
if not TELEGRAM_BOT_TOKEN:
    raise ValueError("Missing required environment variable: TELEGRAM_BOT_TOKEN")

ALLOWED_USER_ID: int = int(os.getenv("ALLOWED_USER_ID", "0"))
TZ: str = os.getenv("TZ", "America/Sao_Paulo")
CYCLE_RESET_DAY_OLD: int = 4
CYCLE_RESET_DAY_NEW: int = 17
CYCLE_CHANGE_DATE: date = date(2025, 10, 4)
CYCLE_TRANSITION_END_DATE: date = date(2025, 11, 16)

ALLOWED_METHODS: dict[str, str] = _app_config.get("methods", {})
ALLOWED_TAGS: dict[str, str] = _app_config.get("tags", {})
CATEGORIES_DISPLAY: list[str] = _app_config.get("categories_display", [])

ALLOWED_CATEGORIES: dict[str, str] = {
    _strip_accents_lower(cat): cat for cat in CATEGORIES_DISPLAY
}

SEP_RE: re.Pattern[str] = re.compile(r"\s*(?:-+(?!\d)|;|\||,(?!\d))\s*")

LOWER_WORDS: set[str] = {
    "de",
    "da",
    "do",
    "das",
    "dos",
    "e",
    "em",
    "no",
    "na",
    "nos",
    "nas",
    "para",
    "por",
    "com",
    "ao",
    "a",
    "à",
    "às",
    "o",
    "os",
    "um",
    "uma",
    "umas",
    "uns",
}
