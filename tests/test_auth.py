"""
Test suite for authentication functionality.

Tests the critical ensure_auth() function to prevent bypass vulnerabilities.
"""

import pytest
from unittest.mock import Mock, AsyncMock, patch
from telegram import Update, User, Message
from src.bot_service.handlers import ensure_auth


class TestEnsureAuth:
    """Tests for the ensure_auth function - CRITICAL SECURITY."""

    @pytest.mark.asyncio
    async def test_valid_user_is_authorized(self):
        """Authorized user should be granted access."""
        update = Mock(spec=Update)
        update.effective_user = Mock(spec=User)
        update.effective_user.id = 12345
        update.message = Mock(spec=Message)
        update.message.reply_text = AsyncMock()

        with patch("src.bot_service.handlers.config.ALLOWED_USER_ID", 12345):
            result = await ensure_auth(update)

        assert result is True
        update.message.reply_text.assert_not_called()

    @pytest.mark.asyncio
    async def test_invalid_user_is_rejected(self):
        """Unauthorized user should be denied access."""
        update = Mock(spec=Update)
        update.effective_user = Mock(spec=User)
        update.effective_user.id = 99999
        update.message = Mock(spec=Message)
        update.message.reply_text = AsyncMock()

        with patch("src.bot_service.handlers.config.ALLOWED_USER_ID", 12345):
            result = await ensure_auth(update)

        assert result is False
        update.message.reply_text.assert_called_once_with("Usuário não autorizado.")

    @pytest.mark.asyncio
    async def test_user_id_zero_denies_access(self):
        """
        CRITICAL: User ID 0 should deny access when ALLOWED_USER_ID is misconfigured.

        This test prevents the authentication bypass vulnerability where
        ALLOWED_USER_ID=0 would disable authentication.
        """
        update = Mock(spec=Update)
        update.effective_user = Mock(spec=User)
        update.effective_user.id = 0
        update.message = Mock(spec=Message)
        update.message.reply_text = AsyncMock()

        with patch("src.bot_service.handlers.config.ALLOWED_USER_ID", 0):
            result = await ensure_auth(update)

        assert result is False
        update.message.reply_text.assert_called_once()
        assert "não configurado" in update.message.reply_text.call_args[0][0]

    @pytest.mark.asyncio
    async def test_allowed_user_id_negative_denies_access(self):
        """Negative ALLOWED_USER_ID should deny all access."""
        update = Mock(spec=Update)
        update.effective_user = Mock(spec=User)
        update.effective_user.id = 12345
        update.message = Mock(spec=Message)
        update.message.reply_text = AsyncMock()

        with patch("src.bot_service.handlers.config.ALLOWED_USER_ID", -1):
            result = await ensure_auth(update)

        assert result is False
        update.message.reply_text.assert_called_once()

    @pytest.mark.asyncio
    async def test_allowed_user_id_none_denies_access(self):
        """None ALLOWED_USER_ID should deny all access."""
        update = Mock(spec=Update)
        update.effective_user = Mock(spec=User)
        update.effective_user.id = 12345
        update.message = Mock(spec=Message)
        update.message.reply_text = AsyncMock()

        with patch("src.bot_service.handlers.config.ALLOWED_USER_ID", None):
            result = await ensure_auth(update)

        assert result is False

    @pytest.mark.asyncio
    async def test_no_effective_user_denies_access(self):
        """Request without effective_user should be denied."""
        update = Mock(spec=Update)
        update.effective_user = None
        update.message = Mock(spec=Message)
        update.message.reply_text = AsyncMock()

        with patch("src.bot_service.handlers.config.ALLOWED_USER_ID", 12345):
            result = await ensure_auth(update)

        assert result is False
        update.message.reply_text.assert_called_once()

    @pytest.mark.asyncio
    async def test_no_message_does_not_crash(self):
        """Should handle updates without message gracefully."""
        update = Mock(spec=Update)
        update.effective_user = Mock(spec=User)
        update.effective_user.id = 99999
        update.message = None

        with patch("src.bot_service.handlers.config.ALLOWED_USER_ID", 12345):
            result = await ensure_auth(update)

        assert result is False

    @pytest.mark.asyncio
    async def test_large_user_id_works(self):
        """Should handle large Telegram user IDs correctly."""
        large_id = 9999999999
        update = Mock(spec=Update)
        update.effective_user = Mock(spec=User)
        update.effective_user.id = large_id
        update.message = Mock(spec=Message)
        update.message.reply_text = AsyncMock()

        with patch("src.bot_service.handlers.config.ALLOWED_USER_ID", large_id):
            result = await ensure_auth(update)

        assert result is True

    @pytest.mark.asyncio
    async def test_logging_on_unauthorized_access(self):
        """Should log unauthorized access attempts."""
        update = Mock(spec=Update)
        update.effective_user = Mock(spec=User)
        update.effective_user.id = 99999
        update.message = Mock(spec=Message)
        update.message.reply_text = AsyncMock()

        with patch("src.bot_service.handlers.config.ALLOWED_USER_ID", 12345):
            with patch("src.bot_service.handlers.log") as mock_log:
                result = await ensure_auth(update)

        assert result is False
        mock_log.warning.assert_called_once()
        assert "99999" in str(mock_log.warning.call_args)

    @pytest.mark.asyncio
    async def test_logging_on_misconfiguration(self):
        """Should log error when ALLOWED_USER_ID is misconfigured."""
        update = Mock(spec=Update)
        update.effective_user = Mock(spec=User)
        update.effective_user.id = 12345
        update.message = Mock(spec=Message)
        update.message.reply_text = AsyncMock()

        with patch("src.bot_service.handlers.config.ALLOWED_USER_ID", 0):
            with patch("src.bot_service.handlers.log") as mock_log:
                result = await ensure_auth(update)

        assert result is False
        mock_log.error.assert_called_once()
        assert "not configured" in str(mock_log.error.call_args)
