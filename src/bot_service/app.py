"""
Telegram Bot Application Module.

This module initializes and starts the Telegram bot for the Financial Tracker.
It registers all command handlers and message handlers for expense tracking.
"""

import logging

from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, filters

from src.core import config
from src.bot_service import handlers

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
log = logging.getLogger(__name__)


def main():
    """
    Initializes and starts the Telegram bot.

    Configures all command and message handlers, then starts polling for updates.
    Requires TELEGRAM_BOT_TOKEN to be set in environment variables.

    Handlers registered:
        - /help: Display usage instructions
        - /health: Check database connectivity
        - /last: Show last 5 expenses
        - /undo: Delete most recent expense
        - /balance: Show current billing cycle spending
        - Text messages: Parse and store expenses

    Returns:
        None
    """
    if not config.TELEGRAM_BOT_TOKEN:
        log.error("TELEGRAM_BOT_TOKEN is not set. Bot cannot start.")
        return

    log.info("Starting bot...")
    app = ApplicationBuilder().token(config.TELEGRAM_BOT_TOKEN).build()

    app.add_handler(CommandHandler("help", handlers.cmd_help))
    app.add_handler(CommandHandler("health", handlers.cmd_health))
    app.add_handler(CommandHandler("last", handlers.cmd_last))
    app.add_handler(CommandHandler("undo", handlers.cmd_undo))
    app.add_handler(CommandHandler("balance", handlers.cmd_balance))

    app.add_handler(MessageHandler(filters.TEXT & (~filters.COMMAND), handlers.on_text))
    app.add_error_handler(handlers.on_error)

    log.info("Bot started and polling for messages.")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
