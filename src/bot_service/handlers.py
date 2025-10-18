"""
Telegram Bot Command Handlers Module.

This module contains all Telegram bot command handlers for the Financial Tracker.
Each handler processes specific user commands or messages and interacts with
the database repository to manage expense records.

All handlers require user authorization via ensure_auth() before processing.
"""

import logging
import traceback
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
    """
    Checks if the user is authorized to use the bot.

    Args:
        update: The Telegram update object containing user information.

    Returns:
        True if user is authorized, False otherwise.

    Raises:
        None - sends rejection message to unauthorized users.
    """
    uid = update.effective_user.id if update.effective_user else None

    if config.ALLOWED_USER_ID is None or config.ALLOWED_USER_ID <= 0:
        log.error("ALLOWED_USER_ID not configured properly. Denying all access.")
        if update.message:
            await update.message.reply_text("Bot não configurado corretamente.")
        return False

    if uid is None or uid != config.ALLOWED_USER_ID:
        log.warning(f"Unauthorized access attempt from user ID: {uid}")
        if update.message:
            await update.message.reply_text("Usuário não autorizado.")
        return False

    return True


async def cmd_help(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Handles the /help command - displays usage instructions.

    Shows the user how to format expense messages and lists all available commands.
    Includes allowed values for payment methods, tags, and categories.

    Args:
        update: The Telegram update object containing the command message.
        context: The Telegram context object.

    Returns:
        None
    """
    if not await ensure_auth(update):
        return

    categories_text = " | ".join(config.CATEGORIES_DISPLAY)
    help_text = (
        "<b>Como lançar um gasto?</b>\n"
        "Use 5 ou 6 partes, nesta ordem, separadas por '-', ';', '|' ou ',':\n"
        "<b>Valor - Descrição - Método - Tag - Categoria [- Parcelas]</b>\n\n"
        "• Valor: número em BRL (ex.: 35,50)\n"
        "• Descrição: texto livre\n"
        "• Método: {Pix | Cartão de Crédito | Cartão de Débito | Boleto}\n"
        "• Tag: {Gastos Pessoais | Gastos do Casal | Gastos de Casa}\n"
        f"• Categoria: {{{categories_text}}}\n"
        "• Parcelas (opcional): número inteiro (ex.: 3)\n\n"
        "<b>Comandos:</b>\n"
        "/last: Mostra os 5 últimos lançamentos\n"
        "/undo: Apaga o último lançamento\n"
        "/health: Testa a conexão com o banco\n"
        "/balance: Total gasto no ciclo atual (mês e período)\n"
        "/help: Exibe esta ajuda"
    )
    await update.message.reply_text(help_text, parse_mode="HTML")


async def cmd_health(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Handles the /health command - checks database connectivity.

    Tests the connection to the PostgreSQL database and reports status to the user.

    Args:
        update: The Telegram update object containing the command message.
        context: The Telegram context object.

    Returns:
        None
    """
    if not await ensure_auth(update):
        return

    if await repo.check_connection():
        await update.message.reply_text("✅ Banco OK")
    else:
        await update.message.reply_text("💥 Banco indisponível")


async def cmd_undo(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Handles the /undo command - deletes the most recent expense.

    Removes the last expense entry from the database and confirms deletion to the user.

    Args:
        update: The Telegram update object containing the command message.
        context: The Telegram context object.

    Returns:
        None
    """
    if not await ensure_auth(update):
        return

    deleted_id = await repo.delete_last_expense()
    if deleted_id:
        await update.message.reply_text(f"Último lançamento removido (#{deleted_id}).")
    else:
        await update.message.reply_text("Nada para remover.")


async def cmd_last(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Handles the /last command - shows the last 5 expense entries.

    Retrieves and displays the 5 most recent expenses in a formatted table with
    date, amount, and description columns.

    Args:
        update: The Telegram update object containing the command message.
        context: The Telegram context object.

    Returns:
        None
    """
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
    """
    Handles text messages - parses and stores expense entries.

    Parses user-provided text messages in the format:
    "Amount - Description - Method - Tag - Category [- Installments]"

    Validates the input, stores the expense in the database, and sends a
    confirmation message with the registered expense details.

    Args:
        update: The Telegram update object containing the text message.
        context: The Telegram context object.

    Returns:
        None

    Raises:
        ValueError: If the message format is invalid or contains disallowed values.
    """
    if not await ensure_auth(update) or not update.message or not update.message.text:
        return

    try:
        expense: "Expense" = parse_message(update.message.text.strip())
        expense_id = await repo.add_expense(expense)

        safe_description = utils.escape_markdown_v2(expense.description)
        safe_tag = utils.escape_markdown_v2(expense.tag)
        safe_category = utils.escape_markdown_v2(expense.category)
        safe_method = utils.escape_markdown_v2(expense.method)

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
            f"✅ Lançamento Registrado\n\n```\n{table_str}\n```",
            parse_mode="MarkdownV2",
        )

    except ValueError as e:
        await update.message.reply_text(f"⚠️ {e}")
    except Exception as e:
        log.error(f"An unexpected error occurred: {e}", exc_info=True)
        await update.message.reply_text(
            "💥 Ocorreu um erro inesperado ao processar sua solicitação."
        )


async def cmd_balance(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """
    Handles the /balance command - displays current billing cycle spending.

    Shows the user the total amount spent in the current billing cycle,
    including the invoice month name, cycle period dates, and spending total
    from cycle start until today.

    Handles the billing cycle transition from old (4th-3rd) to new (17th-16th) logic.

    Args:
        update: The Telegram update object containing the command message.
        context: The Telegram context object.

    Returns:
        None
    """
    if not await ensure_auth(update):
        return

    today = date.today()
    cycle = utils.get_current_and_previous_cycle_dates(today)["current"]
    start, end = cycle["start"], cycle["end"]

    spent = await repo.get_total_spent_in_period(start, today)

    months = [
        "",
        "Janeiro",
        "Fevereiro",
        "Março",
        "Abril",
        "Maio",
        "Junho",
        "Julho",
        "Agosto",
        "Setembro",
        "Outubro",
        "Novembro",
        "Dezembro",
    ]
    invoice_month_number = end.month
    invoice_month_name = months[invoice_month_number]

    start_s = start.strftime("%d/%m/%Y")
    end_s = end.strftime("%d/%m/%Y")

    msg_text = (
        "<b>📊 Balanço do Ciclo Atual</b>\n\n"
        f"• Mês da fatura: <b>{invoice_month_name}</b> ({invoice_month_number})\n"
        f"• Período: <b>{start_s}</b> a <b>{end_s}</b>\n"
        f"• Gasto até hoje: <b>{utils.brl(spent)}</b>"
    )

    await update.message.reply_text(msg_text, parse_mode="HTML")


async def on_error(update: object, context: ContextTypes.DEFAULT_TYPE):
    """
    Global error handler for the bot.

    Logs unhandled exceptions and sends a user-friendly error message
    to the user if possible.

    Args:
        update: The Telegram update object (may be any object type).
        context: The Telegram context object containing the error.

    Returns:
        None
    """
    exc_text = "".join(
        traceback.format_exception(None, context.error, context.error.__traceback__)
    )
    log.error("Unhandled exception:\n%s", exc_text)

    if isinstance(update, Update) and update.effective_message:
        await update.effective_message.reply_text(
            "💥 Ocorreu um erro ao formatar a mensagem. Tente novamente."
        )
