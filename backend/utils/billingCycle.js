/**
 * Billing Cycle Utilities
 *
 * Handles the complex billing cycle transition logic for the Financial Tracker.
 * Manages the transition from old cycle (4th-3rd) to new cycle (17th-16th) starting Oct 4, 2025.
 */

import { addMonths, subMonths, addDays, subDays } from 'date-fns';

const CYCLE_RESET_DAY_OLD = 4;
const CYCLE_RESET_DAY_NEW = 17;
const CYCLE_CHANGE_DATE = new Date('2025-10-04');
const CYCLE_TRANSITION_END_DATE = new Date('2025-11-16');

/**
 * Returns the invoice month (as Date object) for a given expense date.
 *
 * The invoice month is the month when the billing cycle ends (when the bill is due).
 * Handles the transition from old cycle (4th-3rd) to new cycle (17th-16th).
 *
 * @param {Date} expenseDate - The expense date
 * @returns {Date} The invoice month (first day of month)
 */
export function getInvoiceMonth(expenseDate) {
  const expDate = new Date(expenseDate);

  if (expDate < CYCLE_CHANGE_DATE) {
    if (expDate.getDate() >= CYCLE_RESET_DAY_OLD) {
      const nextMonth = addMonths(expDate, 1);
      return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1);
    } else {
      return new Date(expDate.getFullYear(), expDate.getMonth(), 1);
    }
  }

  if (expDate <= CYCLE_TRANSITION_END_DATE) {
    return new Date(2025, 10, 1);
  }

  if (expDate.getDate() >= CYCLE_RESET_DAY_NEW) {
    const nextMonth = addMonths(expDate, 1);
    return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1);
  } else {
    return new Date(expDate.getFullYear(), expDate.getMonth(), 1);
  }
}

/**
 * Calculates the billing cycle date range for a given invoice month.
 *
 * @param {number} year - Invoice year
 * @param {number} month - Invoice month (1-12)
 * @returns {{start: Date, end: Date}} Billing cycle start and end dates
 */
export function billingCycleRange(year, month) {
  const invoiceMonth = new Date(year, month - 1, 1);

  const transitionInvoiceMonth = new Date(
    CYCLE_TRANSITION_END_DATE.getFullYear(),
    CYCLE_TRANSITION_END_DATE.getMonth(),
    1
  );

  if (invoiceMonth.getTime() === transitionInvoiceMonth.getTime()) {
    return {
      start: CYCLE_CHANGE_DATE,
      end: CYCLE_TRANSITION_END_DATE,
    };
  }

  const changeMonth = new Date(CYCLE_CHANGE_DATE.getFullYear(), CYCLE_CHANGE_DATE.getMonth(), 1);

  if (invoiceMonth >= addMonths(changeMonth, 1)) {
    const cycleDay = CYCLE_RESET_DAY_NEW;
    const end = new Date(year, month - 1, cycleDay - 1);
    const start = addDays(subMonths(end, 1), 1);
    return { start, end };
  } else {
    const cycleDay = CYCLE_RESET_DAY_OLD;
    const end = new Date(year, month - 1, cycleDay - 1);
    const start = addDays(subMonths(end, 1), 1);
    return { start, end };
  }
}

/**
 * Generates a list of available invoice months from the database date range.
 * Uses billing cycle logic to determine valid invoice months.
 *
 * @param {Date} minDate - Earliest expense date
 * @param {Date} maxDate - Latest expense date
 * @returns {Array<{year: number, month: number, label: string}>} Invoice months
 */
export function generateInvoiceMonths(minDate, maxDate) {
  const invoiceMonthsSet = new Set();

  let currentDate = new Date(minDate);
  while (currentDate <= maxDate) {
    const invoiceMonth = getInvoiceMonth(currentDate);
    const year = invoiceMonth.getFullYear();
    const month = invoiceMonth.getMonth() + 1;
    const key = `${year}-${month}`;

    invoiceMonthsSet.add(key);

    currentDate = addDays(currentDate, 1);
  }

  const months = Array.from(invoiceMonthsSet)
    .map((key) => {
      const [year, month] = key.split('-').map(Number);
      return {
        year,
        month,
        label: `${String(month).padStart(2, '0')}/${year}`,
      };
    })
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

  return months;
}

/**
 * Calculates the previous period dates based on the current period.
 *
 * @param {Date} startDate - Current period start
 * @param {Date} endDate - Current period end
 * @param {boolean} useInvoiceMonth - Whether invoice month mode is active
 * @returns {{start: Date, end: Date}} Previous period dates
 */
export function getPreviousPeriod(startDate, endDate, useInvoiceMonth = false) {
  if (useInvoiceMonth) {
    const currentInvoiceMonth = getInvoiceMonth(endDate);
    const previousInvoiceDate = subMonths(currentInvoiceMonth, 1);
    const previousYear = previousInvoiceDate.getFullYear();
    const previousMonth = previousInvoiceDate.getMonth() + 1;

    return billingCycleRange(previousYear, previousMonth);
  } else {
    const duration = endDate.getTime() - startDate.getTime();
    const previousEnd = subDays(startDate, 1);
    const previousStart = new Date(previousEnd.getTime() - duration);
    return {
      start: previousStart,
      end: previousEnd,
    };
  }
}

/**
 * Parses date filters from query parameters.
 * Handles both invoice month mode and custom date range mode.
 *
 * @param {Object} queryParams - Express request query parameters
 * @param {string} queryParams.startDate - Start date string (YYYY-MM-DD)
 * @param {string} queryParams.endDate - End date string (YYYY-MM-DD)
 * @param {string} queryParams.useInvoiceMonth - Whether to use invoice month mode
 * @param {string} queryParams.invoiceYear - Invoice year (if using invoice month)
 * @param {string} queryParams.invoiceMonth - Invoice month (1-12)
 * @returns {{startDate: string, endDate: string}} Parsed date range in YYYY-MM-DD format
 */
export function parseDateFilters(queryParams) {
  let { startDate, endDate, useInvoiceMonth, invoiceYear, invoiceMonth } = queryParams;

  if (useInvoiceMonth === 'true' && invoiceYear && invoiceMonth) {
    const cycle = billingCycleRange(parseInt(invoiceYear), parseInt(invoiceMonth));
    startDate = cycle.start.toISOString().split('T')[0];
    endDate = cycle.end.toISOString().split('T')[0];
  }

  return { startDate, endDate };
}
