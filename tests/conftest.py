"""Pytest configuration file for setting up test environment."""

import os


def pytest_configure(config):
    """Set up environment variables needed for testing."""
    os.environ.setdefault("TELEGRAM_BOT_TOKEN", "test-token")
    os.environ.setdefault("ALLOWED_USER_ID", "0")
