import logging
from datetime import date
from typing import TYPE_CHECKING

from telegram import Update
from telegram.ext import ContextTypes

from src.core import config
from src.core import utils
from src.core.parser import parse_message
from src.storage.repository import ExpenseRepository

if TYPE_CHECKING:
    from src.core.models import Expense

log = logging.getLogger(__name__)
repo = ExpenseRepository()


async def ensure_auth(update: Update) -> bool:
    """Checks if the user is authorized to use the bot."""
    uid = update.effective_user.id if update.effective_user else 0
    if config.ALLOWED_USER_ID and uid != config.ALLOWED_USER_ID:
        if update.message:
            await update.message.reply_text("Usuário não autorizado.")
        return False
    return True


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not await ensure_auth(update):
        return

    categories_text = " | ".join(config.CATEGORIES_DISPLAY)
    await update.message.reply_text(
        "*Como lançar um gasto?*\n"
        "Use 5 ou 6 partes, nesta ordem, separadas por '-', ';', '|', ou ',':\n"
        "*Valor - Descrição - Método - Tag - Categoria [- Parcelas]*\n\n"
        "• Valor: número em BRL (ex.: 35,50)\n"
        "• Descrição: texto livre\n"
        "• Método: {Pix | Cartão de Crédito | Cartão de Débito | Boleto}\n"
        "• Tag: {Gastos Pessoais | Gastos do Casal | Gastos de Casa}\n"
        f"• Categoria: {{{categories_text}}}\n"
        "• Parcelas (opcional): número inteiro (ex.: 3)\n\n"
        "*Comandos:*\n"
        "/last: Mostra os 5 últimos lançamentos\n"
        "/undo: Apaga o último lançamento\n"
        "/health: Testa a conexão com o banco\n"
        "/help: Exibe esta ajuda",
        parse_mode="Markdown",
    )


async def cmd_health(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not await ensure_auth(update):
        return

    if await repo.check_connection():
        await update.message.reply_text("✅ Banco OK")
    else:
        await update.message.reply_text("💥 Banco indisponível")


async def cmd_undo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not await ensure_auth(update):
        return

    deleted_id = await repo.delete_last_expense()
    if deleted_id:
        await update.message.reply_text(f"Último lançamento removido (#{deleted_id}).")
    else:
        await update.message.reply_text("Nada para remover.")


async def cmd_last(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not await ensure_auth(update):
        return

    expenses = await repo.get_last_n_expenses(limit=5)
    if not expenses:
        await update.message.reply_text("Nenhum lançamento encontrado.")
        return

    headers = ["Data", "Valor", "Descrição"]

    col_widths = {h: len(h) for h in headers}
    table_data = []

    for exp in expenses:
        row = {
            "Data": exp.expense_ts.strftime("%d/%m/%Y %H:%M"),
            "Valor": utils.brl(exp.amount),
            "Descrição": exp.description,
        }
        table_data.append(row)

        for header in headers:
            col_widths[header] = max(col_widths[header], len(row[header]))

    header_line = " | ".join(h.ljust(col_widths[h]) for h in headers)
    separator_line = "-+-".join("-" * col_widths[h] for h in headers)

    row_lines = []
    for row in table_data:
        row_line = " | ".join(row[h].ljust(col_widths[h]) for h in headers)
        row_lines.append(row_line)

    final_table = "\n".join([header_line, separator_line] + row_lines)

    await update.message.reply_text(
        f"*Últimos 5 Lançamentos:*\n\n```\n{final_table}\n```", parse_mode="MarkdownV2"
    )


async def on_text(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if not await ensure_auth(update) or not update.message or not update.message.text:
        return

    try:
        expense: "Expense" = parse_message(update.message.text.strip())
        expense_id = await repo.add_expense(expense)

        today = date.today()
        cycle_start = utils.get_cycle_start(today)
        spent = await repo.get_total_spent_in_period(cycle_start, today)
        remaining = config.MONTHLY_CAP - spent
        if remaining >= 0:
            balance_line = f"💵 Saldo restante do mês: {utils.brl(remaining)}"
        else:
            overage = -remaining
            balance_line = f"💸 Você ultrapassou o teto do mês em: {utils.brl(overage)}"

        safe_description = utils.escape_markdown_v2(expense.description)
        safe_tag = utils.escape_markdown_v2(expense.tag)
        safe_category = utils.escape_markdown_v2(expense.category)
        safe_method = utils.escape_markdown_v2(expense.method)
        safe_balance_line = utils.escape_markdown_v2(balance_line)

        table_lines = [
            f"{'ID':<11}: {expense_id}",
            f"{'Valor':<11}: {utils.escape_markdown_v2(utils.brl(expense.amount))}",
            f"{'Descrição':<11}: {safe_description}",
            f"{'Tag':<11}: {safe_tag}",
            f"{'Categoria':<11}: {safe_category}",
            f"{'Método':<11}: {safe_method}",
        ]

        if expense.installments:
            table_lines.append(f"{'Parcelas':<11}: {expense.installments}x")

        table_str = "\n".join(table_lines)

        await update.message.reply_text(
            f"✅ Lançamento Registrado\n\n```\n{table_str}\n```\n\n{safe_balance_line}",
            parse_mode="MarkdownV2",
        )

    except ValueError as e:
        await update.message.reply_text(f"⚠️ {e}")
    except Exception as e:
        log.error(f"An unexpected error occurred: {e}", exc_info=True)
        await update.message.reply_text(
            "💥 Ocorreu um erro inesperado ao processar sua solicitação."
        )
