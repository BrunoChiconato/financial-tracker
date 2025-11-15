/**
 * Formatting Utilities
 *
 * Provides formatting functions for currency, dates, and numbers in Brazilian format.
 */

/**
 * Formats a number as Brazilian Real currency.
 *
 * @param {number} value - The numeric value to format
 * @returns {string} Formatted currency string (e.g., "R$ 1.234,56")
 */
export const formatCurrency = (value) => {
  if (value === null || value === undefined || isNaN(value)) {
    return 'R$ 0,00';
  }

  const formatted = Number(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `R$ ${formatted}`;
};

/**
 * Formats a date to Brazilian format (DD/MM/YYYY) in local time.
 * Uses local Brazil time to match user's timezone.
 *
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted date string
 */
export const formatDateBR = (date) => {
  if (!date) return '';

  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Formats a date and time to Brazilian format (DD/MM/YYYY HH:mm) in local time.
 * Uses local Brazil time to match user's timezone.
 *
 * @param {Date|string} datetime - The datetime to format
 * @returns {string} Formatted datetime string
 */
export const formatDateTimeBR = (datetime) => {
  if (!datetime) return '';

  const d = new Date(datetime);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

/**
 * Formats a number with thousand separators (Brazilian format).
 *
 * @param {number} value - The numeric value to format
 * @param {number} decimals - Number of decimal places (default: 0)
 * @returns {string} Formatted number string
 */
export const formatNumber = (value, decimals = 0) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }

  return Number(value).toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * Formats a MoM percentage change with sign.
 *
 * @param {number} percentage - The percentage value
 * @returns {string} Formatted percentage (e.g., "+15.3%" or "-5.2%")
 */
export const formatMoMPercentage = (percentage) => {
  if (percentage === null || percentage === undefined || isNaN(percentage)) {
    return '0.0%';
  }

  const sign = percentage > 0 ? '+' : '';
  return `${sign}${percentage.toFixed(1)}%`;
};

/**
 * Gets the color class for a MoM variation.
 *
 * @param {number} value - The variation value
 * @returns {string} CSS class name
 */
export const getMoMColorClass = (value) => {
  if (value > 0) return 'text-red';
  if (value < 0) return 'text-green';
  return 'text-neutral';
};
