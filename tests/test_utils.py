"""
Test suite for utility functions in src/core/utils.py.

Tests cover currency formatting and Telegram markdown escaping functions.
These are critical for data integrity (Rule 9: 2 decimal places) and security.
"""

from decimal import Decimal
from src.core.utils import brl, escape_markdown_v2


class TestBrlCurrencyFormatting:
    """Tests for brl() currency formatting function - CRITICAL for Rule 9."""

    def test_standard_amount(self):
        """Should format standard amounts with 2 decimal places."""
        assert brl(Decimal("1234.56")) == "R$ 1.234,56"

    def test_amount_without_cents(self):
        """Should format whole numbers with ,00 decimals."""
        assert brl(Decimal("100")) == "R$ 100,00"
        assert brl(Decimal("1000")) == "R$ 1.000,00"

    def test_small_amount(self):
        """Should format small amounts correctly."""
        assert brl(Decimal("0.01")) == "R$ 0,01"
        assert brl(Decimal("9.99")) == "R$ 9,99"

    def test_large_amount(self):
        """Should format large amounts with proper thousand separators."""
        assert brl(Decimal("999999.99")) == "R$ 999.999,99"
        assert brl(Decimal("1000000.00")) == "R$ 1.000.000,00"

    def test_zero_value(self):
        """Should format zero with 2 decimal places."""
        assert brl(Decimal("0")) == "R$ 0,00"
        assert brl(Decimal("0.00")) == "R$ 0,00"

    def test_exactly_two_decimal_places(self):
        """CRITICAL: All values must have EXACTLY 2 decimal places (Rule 9)."""
        test_cases = [
            (Decimal("1"), "R$ 1,00"),
            (Decimal("1.1"), "R$ 1,10"),
            (Decimal("1.10"), "R$ 1,10"),
            (Decimal("123.4"), "R$ 123,40"),
            (Decimal("123.45"), "R$ 123,45"),
        ]
        for value, expected in test_cases:
            assert brl(value) == expected

    def test_rounding_behavior(self):
        """Should round to 2 decimal places when necessary."""
        assert brl(Decimal("1.234")) == "R$ 1,23"
        assert brl(Decimal("1.235")) == "R$ 1,24"

    def test_very_large_number(self):
        """Should handle very large numbers with multiple thousand separators."""
        assert brl(Decimal("1234567.89")) == "R$ 1.234.567,89"

    def test_negative_amount_formatting(self):
        """Should handle negative amounts (even though app uses absolute values)."""
        assert brl(Decimal("-100.50")) == "R$ -100,50"
        assert brl(Decimal("-1234.56")) == "R$ -1.234,56"


class TestEscapeMarkdownV2:
    """Tests for Telegram MarkdownV2 escaping - security and formatting."""

    def test_escape_underscores(self):
        """Should escape underscores used for italics."""
        assert escape_markdown_v2("test_value") == r"test\_value"
        assert escape_markdown_v2("_italic_") == r"\_italic\_"

    def test_escape_asterisks(self):
        """Should escape asterisks used for bold."""
        assert escape_markdown_v2("test*bold") == r"test\*bold"
        assert escape_markdown_v2("**bold**") == r"\*\*bold\*\*"

    def test_escape_brackets(self):
        """Should escape square brackets used for links."""
        assert escape_markdown_v2("[link]") == r"\[link\]"
        assert escape_markdown_v2("test[0]") == r"test\[0\]"

    def test_escape_parentheses(self):
        """Should escape parentheses used in links."""
        assert escape_markdown_v2("(test)") == r"\(test\)"
        assert escape_markdown_v2("value (1/3)") == r"value \(1/3\)"

    def test_escape_backticks(self):
        """Should escape backticks used for code blocks."""
        assert escape_markdown_v2("`code`") == r"\`code\`"

    def test_escape_tildes(self):
        """Should escape tildes used for strikethrough."""
        assert escape_markdown_v2("~strikethrough~") == r"\~strikethrough\~"

    def test_escape_special_characters(self):
        """Should escape all MarkdownV2 special characters."""
        special_chars = "_*[]()~`>#+-=|{}.!"
        result = escape_markdown_v2(special_chars)
        for char in special_chars:
            assert f"\\{char}" in result

    def test_escape_dots_and_exclamation(self):
        """Should escape dots and exclamation marks."""
        assert escape_markdown_v2("R$ 1.234,56!") == r"R$ 1\.234,56\!"

    def test_escape_hyphens_and_equals(self):
        """Should escape hyphens and equals signs."""
        assert escape_markdown_v2("test-value=123") == r"test\-value\=123"

    def test_escape_pipes_and_braces(self):
        """Should escape pipes and curly braces."""
        assert escape_markdown_v2("a|b {c}") == r"a\|b \{c\}"

    def test_plain_text_unchanged(self):
        """Plain alphanumeric text should remain unchanged."""
        plain_text = "Uber ABC123"
        assert escape_markdown_v2(plain_text) == plain_text

    def test_empty_string(self):
        """Should handle empty strings."""
        assert escape_markdown_v2("") == ""

    def test_common_expense_description(self):
        """Should properly escape typical expense descriptions."""
        desc = "Café (manhã) - R$ 15,00!"
        expected = r"Café \(manhã\) \- R$ 15,00\!"
        assert escape_markdown_v2(desc) == expected

    def test_installment_description(self):
        """Should escape installment notation used in bot messages."""
        desc = "Netflix (1/12)"
        expected = r"Netflix \(1/12\)"
        assert escape_markdown_v2(desc) == expected

    def test_sql_injection_safe(self):
        """Should safely escape SQL-like strings (defense in depth)."""
        malicious = "DROP TABLE expenses; --"
        result = escape_markdown_v2(malicious)
        assert "\\" in result

    def test_markdown_injection_prevention(self):
        """Should prevent markdown injection attacks."""
        attack = "**bold** [click](http://evil.com)"
        result = escape_markdown_v2(attack)
        assert "**" not in result
        assert "[" not in result or "\\[" in result

    def test_unicode_characters_preserved(self):
        """Should preserve unicode characters while escaping markdown."""
        text = "Café ☕ - R$ 10,00"
        result = escape_markdown_v2(text)
        assert "☕" in result
        assert "\\-" in result
        assert "$" in result

    def test_multiple_special_chars_in_sequence(self):
        """Should handle multiple special characters in sequence."""
        text = "!!??**"
        result = escape_markdown_v2(text)
        assert result == r"\!\!\?\?\*\*"
