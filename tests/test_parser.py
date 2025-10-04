"""
Test suite for the parser module.

Tests cover:
1. Currency parsing (br_to_decimal)
2. Input validation and edge cases
3. Expense message parsing
4. Security: injection attempts and malformed input
"""

import pytest
from decimal import Decimal
from src.core.parser import (
    br_to_decimal,
    parse_message,
    titleize_pt,
    canon_method,
    canon_tag,
    canon_category,
)


class TestBrToDecimal:
    """Tests for Brazilian currency parsing."""

    def test_brazilian_format_with_thousands(self):
        """Should parse 1.234,56 format correctly."""
        assert br_to_decimal("1.234,56") == Decimal("1234.56")

    def test_brazilian_format_without_thousands(self):
        """Should parse 1234,56 format correctly."""
        assert br_to_decimal("1234,56") == Decimal("1234.56")

    def test_very_small_amount(self):
        """Should parse 0,01 correctly."""
        assert br_to_decimal("0,01") == Decimal("0.01")

    def test_large_amount(self):
        """Should parse 999999,99 correctly."""
        assert br_to_decimal("999999,99") == Decimal("999999.99")

    def test_negative_becomes_positive(self):
        """Negative values should be converted to absolute value."""
        assert br_to_decimal("-500,00") == Decimal("500.00")

    def test_integer_amount(self):
        """Should parse 50 as 50.00."""
        assert br_to_decimal("50") == Decimal("50.00")

    def test_with_r_dollar_prefix(self):
        """Should strip R$ prefix."""
        assert br_to_decimal("R$ 1.234,56") == Decimal("1234.56")
        assert br_to_decimal("r$1234,56") == Decimal("1234.56")

    def test_with_whitespace(self):
        """Should handle extra whitespace."""
        assert br_to_decimal("  1.234,56  ") == Decimal("1234.56")

    def test_zero_value(self):
        """Should handle zero."""
        assert br_to_decimal("0") == Decimal("0.00")
        assert br_to_decimal("0,00") == Decimal("0.00")

    def test_invalid_text_raises_error(self):
        """Should raise ValueError for invalid input."""
        with pytest.raises(ValueError, match="Valor inválido"):
            br_to_decimal("abc")

    def test_empty_string_raises_error(self):
        """Should raise ValueError for empty string."""
        with pytest.raises(ValueError, match="Valor inválido"):
            br_to_decimal("")

    def test_multiple_commas_raises_error(self):
        """Should raise ValueError for malformed input."""
        with pytest.raises(ValueError, match="Valor inválido"):
            br_to_decimal("1,234,56")


class TestTitleizePt:
    """Tests for Portuguese title casing."""

    def test_simple_word(self):
        """Should capitalize simple words."""
        assert titleize_pt("uber") == "Uber"

    def test_lowercase_connectives(self):
        """Should keep Portuguese connectives lowercase."""
        assert titleize_pt("gastos de casa") == "Gastos de Casa"
        assert titleize_pt("cartão de crédito") == "Cartão de Crédito"

    def test_first_word_always_capitalized(self):
        """First word should always be capitalized, even if connective."""
        assert titleize_pt("de casa") == "De Casa"

    def test_with_hyphens(self):
        """Should handle hyphenated words."""
        assert titleize_pt("pré-pago") == "Pré-Pago"

    def test_empty_string(self):
        """Should handle empty string."""
        assert titleize_pt("") == ""


class TestCanonFunctions:
    """Tests for canonical value mapping functions."""

    def test_canon_method_valid(self):
        """Should return canonical payment method."""
        assert canon_method("pix") == "Pix"
        assert canon_method("PIX") == "Pix"
        assert canon_method("cartao de credito") == "Cartão de Crédito"
        assert canon_method("Cartão de Crédito") == "Cartão de Crédito"

    def test_canon_method_invalid_raises_error(self):
        """Should raise ValueError for invalid method."""
        with pytest.raises(ValueError, match="Método inválido"):
            canon_method("bitcoin")

    def test_canon_tag_valid(self):
        """Should return canonical tag."""
        assert canon_tag("gastos pessoais") == "Gastos Pessoais"
        assert canon_tag("GASTOS DO CASAL") == "Gastos do Casal"

    def test_canon_tag_invalid_raises_error(self):
        """Should raise ValueError for invalid tag."""
        with pytest.raises(ValueError, match="Tag inválida"):
            canon_tag("outros")

    def test_canon_category_valid(self):
        """Should return canonical category."""
        assert canon_category("alimentacao") == "Alimentação"
        assert canon_category("TRANSPORTE") == "Transporte"

    def test_canon_category_invalid_raises_error(self):
        """Should raise ValueError for invalid category."""
        with pytest.raises(ValueError, match="Categoria inválida"):
            canon_category("investimentos")


class TestParseMessage:
    """Tests for complete message parsing."""

    def test_valid_message_without_installments(self):
        """Should parse valid message correctly."""
        msg = "35,50 - Uber - Pix - Gastos Pessoais - Transporte"
        expense = parse_message(msg)

        assert expense.amount == Decimal("35.50")
        assert expense.description == "Uber"
        assert expense.method == "Pix"
        assert expense.tag == "Gastos Pessoais"
        assert expense.category == "Transporte"
        assert expense.installments is None

    def test_valid_message_with_installments(self):
        """Should parse message with installments."""
        msg = "300,00 - Netflix - Cartão de Crédito - Gastos Pessoais - Assinatura - 12"
        expense = parse_message(msg)

        assert expense.amount == Decimal("300.00")
        assert expense.description == "Netflix"
        assert expense.method == "Cartão de Crédito"
        assert expense.tag == "Gastos Pessoais"
        assert expense.category == "Assinatura"
        assert expense.installments == 12

    def test_description_titlecased(self):
        """Description should be title-cased."""
        msg = "50,00 - uber de casa - pix - gastos pessoais - transporte"
        expense = parse_message(msg)
        assert expense.description == "Uber de Casa"

    def test_different_separators(self):
        """Should handle different separator characters."""
        separators = ["-", ";", "|", ","]
        for sep in separators:
            msg = f"35,50 {sep} Uber {sep} Pix {sep} Gastos Pessoais {sep} Transporte"
            expense = parse_message(msg)
            assert expense.amount == Decimal("35.50")

    def test_missing_fields_raises_error(self):
        """Should raise ValueError when fields are missing."""
        with pytest.raises(ValueError, match="Lançamento Incorreto"):
            parse_message("35,50 - Uber - Pix")

    def test_empty_description_raises_error(self):
        """Should raise ValueError for empty description."""
        with pytest.raises(ValueError, match="descrição não pode estar vazia"):
            parse_message("35,50 -  - Pix - Gastos Pessoais - Transporte")

    def test_invalid_installments_raises_error(self):
        """Should raise ValueError for non-integer installments."""
        msg = "100,00 - Test - Pix - Gastos Pessoais - Outros - abc"
        with pytest.raises(ValueError, match="Parcelas deve ser um número inteiro"):
            parse_message(msg)

    def test_invalid_method_raises_error(self):
        """Should raise ValueError for invalid payment method."""
        msg = "35,50 - Uber - Bitcoin - Gastos Pessoais - Transporte"
        with pytest.raises(ValueError, match="Método inválido"):
            parse_message(msg)

    def test_invalid_tag_raises_error(self):
        """Should raise ValueError for invalid tag."""
        msg = "35,50 - Uber - Pix - Trabalho - Transporte"
        with pytest.raises(ValueError, match="Tag inválida"):
            parse_message(msg)

    def test_invalid_category_raises_error(self):
        """Should raise ValueError for invalid category."""
        msg = "35,50 - Uber - Pix - Gastos Pessoais - Investimentos"
        with pytest.raises(ValueError, match="Categoria inválida"):
            parse_message(msg)


class TestSecurityAndEdgeCases:
    """Security tests: injection attempts and malformed input."""

    def test_sql_injection_attempt_in_description(self):
        """Should safely handle SQL-like strings in description."""
        msg = "50,00 - DROP TABLE expenses() - Pix - Gastos Pessoais - Outros"
        expense = parse_message(msg)
        assert expense.description == "Drop Table Expenses()"

    def test_very_long_description(self):
        """Should handle very long descriptions."""
        long_desc = "A" * 1000
        msg = f"50,00 - {long_desc} - Pix - Gastos Pessoais - Outros"
        expense = parse_message(msg)
        assert len(expense.description) == 1000

    def test_special_characters_in_description(self):
        """Should handle special characters."""
        msg = "50,00 - Test @#$%^&*() - Pix - Gastos Pessoais - Outros"
        expense = parse_message(msg)
        assert "@#$%^&*()" in expense.description

    def test_unicode_characters(self):
        """Should handle unicode/emoji characters."""
        msg = "50,00 - Café ☕ - Pix - Gastos Pessoais - Alimentação"
        expense = parse_message(msg)
        assert "☕" in expense.description

    def test_empty_installments_field(self):
        """Should treat empty installments field as None."""
        msg = "50,00 - Test - Pix - Gastos Pessoais - Outros - "
        expense = parse_message(msg)
        assert expense.installments is None

    def test_whitespace_only_installments(self):
        """Should treat whitespace-only installments as None."""
        msg = "50,00 - Test - Pix - Gastos Pessoais - Outros -    "
        expense = parse_message(msg)
        assert expense.installments is None

    def test_zero_installments_raises_error(self):
        """Zero installments should raise error (checked by DB constraint)."""
        msg = "100,00 - Test - Pix - Gastos Pessoais - Outros - 0"
        expense = parse_message(msg)
        assert expense.installments == 0

    def test_negative_installments(self):
        """Negative installments should be parsed (DB will reject)."""
        msg = "100,00 - Test - Pix - Gastos Pessoais - Outros - -5"
        with pytest.raises(ValueError, match="Parcelas deve ser um número inteiro"):
            parse_message(msg)

    def test_decimal_installments_raises_error(self):
        """Decimal installments should raise error."""
        msg = "100,00 - Test - Pix - Gastos Pessoais - Outros - 3.5"
        with pytest.raises(ValueError, match="Parcelas deve ser um número inteiro"):
            parse_message(msg)
