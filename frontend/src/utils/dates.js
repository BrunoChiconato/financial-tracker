/**
 * Date Utilities
 *
 * Helper functions for date manipulation and formatting.
 */

import { format, addMonths, subMonths } from 'date-fns';

/**
 * Formats a date to YYYY-MM-DD (for API requests).
 *
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string
 */
export const formatDateISO = (date) => {
  if (!date) return '';
  return format(new Date(date), 'yyyy-MM-dd');
};

/**
 * Gets today's date.
 *
 * @returns {Date} Today's date
 */
export const getToday = () => {
  return new Date();
};

/**
 * Gets the first day of the current month.
 *
 * @returns {Date} First day of current month
 */
export const getFirstDayOfMonth = () => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), 1);
};

/**
 * Adds months to a date.
 *
 * @param {Date} date - The base date
 * @param {number} months - Number of months to add
 * @returns {Date} New date
 */
export const addMonthsToDate = (date, months) => {
  return addMonths(new Date(date), months);
};

/**
 * Subtracts months from a date.
 *
 * @param {Date} date - The base date
 * @param {number} months - Number of months to subtract
 * @returns {Date} New date
 */
export const subMonthsFromDate = (date, months) => {
  return subMonths(new Date(date), months);
};
