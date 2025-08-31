import os
import re
import logging
import asyncio
import unicodedata
from decimal import Decimal, InvalidOperation

import psycopg
from telegram import Update
from telegram.ext import (
    ApplicationBuilder,
    CommandHandler,
    MessageHandler,
    filters,
    ContextTypes,
)

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s"
)
log = logging.getLogger("tgexp")

DB_CFG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "5432")),
    "dbname": os.getenv("DB_NAME", "finance"),
    "user": os.getenv("DB_USER", "finance"),
    "password": os.getenv("DB_PASSWORD", "changeme"),
}
BOT_TOKEN = os.environ["TELEGRAM_BOT_TOKEN"]
ALLOWED_USER_ID = int(os.getenv("ALLOWED_USER_ID", "0"))

SEP_RE = re.compile(r"\s*(?:-+|;|\||,(?!\d))\s*")

LOWER_WORDS = {
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


def _strip_accents_lower(s: str) -> str:
    """Normalize accents and lowercase for canonical comparisons."""
    n = unicodedata.normalize("NFKD", s)
    n = "".join(ch for ch in n if not unicodedata.combining(ch))
    return re.sub(r"\s+", " ", n).strip().lower()


ALLOWED_METHODS = {
    "pix": "Pix",
    "cartao de credito": "Cartão de Crédito",
    "cartao de debito": "Cartão de Débito",
    "boleto": "Boleto",
}
ALLOWED_TAGS = {
    "gastos pessoais": "Gastos Pessoais",
    "gastos do casal": "Gastos do Casal",
    "gastos de casa": "Gastos de Casa",
}

CATEGORIES_DISPLAY = [
    "Alimentação",
    "Assinatura",
    "Casa",
    "Compras",
    "Educação",
    "Eletrônicos",
    "Lazer",
    "Operação bancária",
    "Outros",
    "Pix",
    "Saúde",
    "Serviços",
    "Supermercado",
    "Transporte",
    "Vestuário",
    "Viagem",
]
ALLOWED_CATEGORIES = {_strip_accents_lower(x): x for x in CATEGORIES_DISPLAY}


def titleize_pt(s: str) -> str:
    """
    Title-case for Portuguese, keeping common connectives in lowercase,
    except when they are the first token.
    """
    w = re.split(r"(\s+|-)", s.strip().lower())
    out, first = [], True
    for tok in w:
        if not tok.strip() or re.fullmatch(r"\s+|-", tok):
            out.append(tok)
            continue
        if first or tok not in LOWER_WORDS:
            out.append(tok[:1].upper() + tok[1:])
        else:
            out.append(tok)
        first = False
    return "".join(out)


def canon_method(raw: str) -> str:
    key = _strip_accents_lower(raw)
    if key in ALLOWED_METHODS:
        return ALLOWED_METHODS[key]
    raise ValueError(
        "Método inválido. Use: Pix, Cartão de Crédito, Cartão de Débito ou Boleto."
    )


def canon_tag(raw: str) -> str:
    key = _strip_accents_lower(raw)
    if key in ALLOWED_TAGS:
        return ALLOWED_TAGS[key]
    raise ValueError(
        "Tag inválida. Use: Gastos Pessoais, Gastos do Casal ou Gastos de Casa."
    )


def canon_category(raw: str) -> str:
    key = _strip_accents_lower(raw)
    if key in ALLOWED_CATEGORIES:
        return ALLOWED_CATEGORIES[key]
    raise ValueError("Categoria inválida. Use: " + ", ".join(CATEGORIES_DISPLAY) + ".")


def br_to_decimal(s: str) -> Decimal:
    """
    Parse Brazilian currency-like strings:
    - Accepts "R$ 1.234,56", "123,45", "12.345,00", "10"
    - Strips currency symbol, normalizes comma to dot only for decimals
    """
    t = s.strip()
    t = re.sub(r"[Rr]\$ ?", "", t)
    if re.search(r"\d+\.\d{3},\d{1,2}$", t):
        t = t.replace(".", "").replace(",", ".")
    elif "," in t and "." not in t:
        t = t.replace(",", ".")
    try:
        v = Decimal(t)
    except InvalidOperation:
        raise ValueError(f"Valor inválido: {s}")
    if v < 0:
        v = -v
    return v.quantize(Decimal("0.01"))


def parse_message(text: str):
    """
    Expected: Valor - Descrição - Método - Tag - Categoria [- Parcelas]
    Separators: '-', ';', '|', or ',' (comma separators will not split decimal numbers).
    No fallback: missing required fields cause errors.
    """
    parts = SEP_RE.split(text.strip(), maxsplit=5)

    if len(parts) < 5:
        raise ValueError(
            "Lançamento Incorreto: Utilize o formato: Valor - Descrição - Método - Tag - Categoria [- Parcelas]"
        )

    val_s, desc_raw, method_raw, tag_raw, category_raw = parts[:5]
    inst_raw = parts[5] if len(parts) == 6 else None

    amount = br_to_decimal(val_s)
    desc = titleize_pt(desc_raw)
    method = canon_method(method_raw)
    tag = canon_tag(tag_raw)
    category = canon_category(category_raw)

    installments = None
    if inst_raw is not None and inst_raw.strip():
        if not re.fullmatch(r"\d+", inst_raw.strip()):
            raise ValueError("Parcelas deve ser um número inteiro (ex.: 3).")
        installments = int(inst_raw.strip())

    if not desc.strip():
        raise ValueError("Descrição vazia.")

    return amount, desc, method, tag, category, installments


async def db_connect():
    """Open an autocommit async connection."""
    return await psycopg.AsyncConnection.connect(
        host=DB_CFG["host"],
        port=DB_CFG["port"],
        dbname=DB_CFG["dbname"],
        user=DB_CFG["user"],
        password=DB_CFG["password"],
        autocommit=True,
    )


async def ensure_auth(update: Update) -> bool:
    """Restrict access to a single allowed user id if configured."""
    uid = update.effective_user.id if update.effective_user else 0
    if ALLOWED_USER_ID and uid != ALLOWED_USER_ID:
        if update.message:
            await update.message.reply_text("Usuário não autorizado.")
        return False
    return True


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not await ensure_auth(update):
        return

    categories_text = " | ".join(CATEGORIES_DISPLAY)
    await update.message.reply_text(
        "*Como lançar um gasto?*\n"
        "Use 5 ou 6 partes, nesta ordem, separadas por '-', ';', '|', ou ',':\n"
        "*Valor - Descrição - Método - Tag - Categoria [- Parcelas]*\n\n"
        "• Valor: número em BRL (ex.: 35,50 ou R$ 35,50)\n"
        "• Descrição: texto livre (será formatado como Título)\n"
        "• Método: {Pix | Cartão de Crédito | Cartão de Débito | Boleto}\n"
        "• Tag: {Gastos Pessoais | Gastos do Casal | Gastos de Casa}\n"
        f"• Categoria: {{{categories_text}}}\n"
        "• Parcelas (opcional): inteiro (ex.: 3)\n\n"
        "*Exemplos:*\n"
        "• 35,50 - Tênis de Corrida - Cartão de Crédito - Gastos Pessoais - Vestuário\n"
        "• 35,50, Tênis de Corrida, Cartão de Crédito, Gastos Pessoais, Vestuário\n"
        "• 120 | Mercado | Pix | Gastos de Casa | Supermercado | 2\n\n"
        "*Comandos:*\n"
        "/last: Mostra os 5 últimos lançamentos (com parcelas)\n"
        "/undo: Apaga o último lançamento\n"
        "/health: Testa a conexão com o banco\n"
        "/help: Exibe esta ajuda",
        parse_mode="Markdown",
    )


async def cmd_health(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not await ensure_auth(update):
        return
    try:
        async with await db_connect() as conn:
            rs = await conn.execute("SELECT 1")
            await rs.fetchone()
        await update.message.reply_text("✅ Banco OK")
    except Exception as e:
        await update.message.reply_text(
            f"💥 Banco indisponível: {e.__class__.__name__}"
        )


async def cmd_last(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not await ensure_auth(update):
        return
    async with await db_connect() as conn:
        rs = await conn.execute(
            """
            SELECT id, expense_ts, amount, description, method, tag, category, installments
            FROM public.expenses
            ORDER BY id DESC
            LIMIT 5
            """
        )
        rows = await rs.fetchall()

    if not rows:
        await update.message.reply_text("Nenhum lançamento ainda.")
        return

    lines = []
    for rec_id, ts, amount, desc, method, tag, category, inst in rows:
        amt = f"R$ {amount:.2f}".replace(".", ",")
        suf = f" — {inst}x" if inst else ""
        lines.append(
            f"#{rec_id} {ts} — {amt} — {desc} — {method} — {tag} — {category}{suf}"
        )
    await update.message.reply_text("\n".join(lines))


async def cmd_undo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not await ensure_auth(update):
        return
    async with await db_connect() as conn:
        rs = await conn.execute(
            """
            DELETE FROM public.expenses
            WHERE id = (SELECT id FROM public.expenses ORDER BY id DESC LIMIT 1)
            RETURNING id
            """
        )
        row = await rs.fetchone()
    if row:
        await update.message.reply_text(f"Último lançamento removido (#{row[0]}).")
    else:
        await update.message.reply_text("Nada para remover.")


async def insert_with_retry(params, max_attempts=3):
    """
    Insert a row using a short retry loop for transient connection issues.
    Expects params = (amount, description, method, tag, installments).
    """
    attempt = 0
    delay = 0.8
    while True:
        attempt += 1
        try:
            async with await db_connect() as conn:
                rs = await conn.execute(
                    """
                    INSERT INTO public.expenses
                        (expense_ts, amount, description, method, tag, category, installments)
                    VALUES
                        (CURRENT_DATE, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    params,
                )
                return await rs.fetchone()
        except (psycopg.OperationalError, psycopg.InterfaceError):
            if attempt >= max_attempts:
                raise
            await asyncio.sleep(delay)
            delay *= 2
        except Exception:
            raise


async def on_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not await ensure_auth(update):
        return
    msg = update.message
    text = msg.text.strip()

    try:
        amount, desc, method, tag, category, installments = parse_message(text)
    except Exception as e:
        await msg.reply_text(f"⚠️ {e}")
        return

    try:
        row = await insert_with_retry(
            (amount, desc, method, tag, category, installments)
        )
    except Exception as ex:
        if isinstance(ex, (psycopg.OperationalError, psycopg.InterfaceError)):
            await msg.reply_text(
                "💥 Banco indisponível no momento. Tente novamente em instantes."
            )
        else:
            await msg.reply_text(f"💥 Erro ao salvar: {ex.__class__.__name__}")
        log.exception("Insert error")
        return

    rec_id = row[0]
    amt = f"R$ {amount:.2f}".replace(".", ",")
    suf = f" — {installments}x" if installments else ""
    await msg.reply_text(
        f"✅ Lançado #{rec_id}: {amt} — {desc} — {method} — {tag} — {category}{suf}"
    )


def main():
    app = ApplicationBuilder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("help", cmd_help))
    app.add_handler(CommandHandler("health", cmd_health))
    app.add_handler(CommandHandler("last", cmd_last))
    app.add_handler(CommandHandler("undo", cmd_undo))
    app.add_handler(MessageHandler(filters.TEXT & (~filters.COMMAND), on_text))
    log.info("Bot started. Waiting for messages...")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
