/**
 * Formatting Utilities
 *
 * Provides formatting functions for currency and dates in Brazilian format.
 */

/**
 * Formats a number as Brazilian Real currency.
 *
 * @param {number} value - The numeric value to format
 * @returns {string} Formatted currency string (e.g., "R$ 1.234,56")
 */
export function formatCurrency(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return 'R$ 0,00';
  }

  const formatted = Number(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `R$ ${formatted}`;
}

/**
 * Calculates Month-over-Month percentage change.
 *
 * @param {number} currentValue - Current period value
 * @param {number} previousValue - Previous period value
 * @returns {{percentage: number, label: string}} MoM data
 */
export function calculateMoM(currentValue, previousValue) {
  if (previousValue === 0 || previousValue === null) {
    return {
      percentage: currentValue > 0 ? 100 : 0,
      label: currentValue > 0 ? 'novo' : '',
    };
  }

  const percentage = ((currentValue - previousValue) / previousValue) * 100;

  return {
    percentage: Number(percentage.toFixed(1)),
    label: `${percentage > 0 ? '+' : ''}${percentage.toFixed(1)}%`,
  };
}

/**
 * Formats a date to Brazilian format (DD/MM/YYYY).
 *
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted date string
 */
export function formatDateBR(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}
