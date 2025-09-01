import re
from decimal import Decimal, InvalidOperation

from src.core import config
from src.core.models import Expense


def titleize_pt(s: str) -> str:
    """Title-case for Portuguese, keeping common connectives in lowercase."""
    words = re.split(r"(\s+|-)", s.strip().lower())
    output, is_first = [], True
    for token in words:
        if not token.strip() or re.fullmatch(r"\s+|-", token):
            output.append(token)
            continue
        if is_first or token not in config.LOWER_WORDS:
            output.append(token.capitalize())
        else:
            output.append(token)
        is_first = False
    return "".join(output)


def canon_method(raw: str) -> str:
    """Finds the canonical payment method from a raw string."""
    key = config._strip_accents_lower(raw)
    if key in config.ALLOWED_METHODS:
        return config.ALLOWED_METHODS[key]
    raise ValueError(
        "Método inválido. Use: Pix, Cartão de Crédito, Cartão de Débito ou Boleto."
    )


def canon_tag(raw: str) -> str:
    """Finds the canonical tag from a raw string."""
    key = config._strip_accents_lower(raw)
    if key in config.ALLOWED_TAGS:
        return config.ALLOWED_TAGS[key]
    raise ValueError(
        "Tag inválida. Use: Gastos Pessoais, Gastos do Casal ou Gastos de Casa."
    )


def canon_category(raw: str) -> str:
    """Finds the canonical category from a raw string."""
    key = config._strip_accents_lower(raw)
    if key in config.ALLOWED_CATEGORIES:
        return config.ALLOWED_CATEGORIES[key]
    allowed_values = ", ".join(config.CATEGORIES_DISPLAY)
    raise ValueError(f"Categoria inválida. Use: {allowed_values}.")


def br_to_decimal(s: str) -> Decimal:
    """Parses Brazilian currency-like strings into a Decimal."""
    text = s.strip()
    text = re.sub(r"[Rr]\$\s?", "", text)

    if re.search(r"\d+\.\d{3},\d{1,2}$", text):
        text = text.replace(".", "").replace(",", ".")
    elif "," in text and "." not in text:
        text = text.replace(",", ".")

    try:
        value = Decimal(text)
    except InvalidOperation:
        raise ValueError(f"Valor inválido: '{s}'")

    return abs(value).quantize(Decimal("0.01"))


def parse_message(text: str) -> Expense:
    """
    Parses a raw text message into a structured Expense object.
    Format: Value - Description - Method - Tag - Category [- Installments]
    """
    parts = config.SEP_RE.split(text.strip(), maxsplit=5)

    if len(parts) < 5:
        raise ValueError(
            "Lançamento Incorreto: Utilize o formato: Valor - Descrição - Método - Tag - Categoria [- Parcelas]"
        )

    val_s, desc_raw, method_raw, tag_raw, category_raw = parts[:5]
    inst_raw = parts[5] if len(parts) > 5 else None

    if not desc_raw.strip():
        raise ValueError("A descrição não pode estar vazia.")

    installments = None
    if inst_raw and inst_raw.strip():
        if not re.fullmatch(r"\d+", inst_raw.strip()):
            raise ValueError("Parcelas deve ser um número inteiro (ex.: 3).")
        installments = int(inst_raw.strip())

    return Expense(
        amount=br_to_decimal(val_s),
        description=titleize_pt(desc_raw),
        method=canon_method(method_raw),
        tag=canon_tag(tag_raw),
        category=canon_category(category_raw),
        installments=installments,
    )
