/**
 * Billing Cycle Utilities
 *
 * Utilities for calculating the current invoice month based on the billing cycle logic.
 * The billing cycle transitioned from day 4 to day 17 on October 4, 2025.
 */

const CYCLE_RESET_DAY_OLD = 4;
const CYCLE_RESET_DAY_NEW = 17;
const CYCLE_CHANGE_DATE = new Date(2025, 9, 4);
const CYCLE_TRANSITION_END_DATE = new Date(2025, 10, 16);

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
      start: new Date(CYCLE_CHANGE_DATE),
      end: new Date(CYCLE_TRANSITION_END_DATE),
    };
  }

  const changeMonth = new Date(CYCLE_CHANGE_DATE.getFullYear(), CYCLE_CHANGE_DATE.getMonth(), 1);

  if (invoiceMonth >= new Date(changeMonth.getFullYear(), changeMonth.getMonth() + 1, 1)) {
    const cycleDay = CYCLE_RESET_DAY_NEW;
    const end = new Date(year, month - 1, cycleDay - 1);
    const start = new Date(end.getFullYear(), end.getMonth() - 1, cycleDay);
    return { start, end };
  } else {
    const cycleDay = CYCLE_RESET_DAY_OLD;
    const end = new Date(year, month - 1, cycleDay - 1);
    const start = new Date(end.getFullYear(), end.getMonth() - 1, cycleDay);
    return { start, end };
  }
}

/**
 * Calculates the number of days in a billing cycle for a given invoice month.
 *
 * @param {number} year - Invoice year
 * @param {number} month - Invoice month (1-12)
 * @returns {number} Number of days in the billing cycle
 */
export function getBillingCycleDays(year, month) {
  const { start, end } = billingCycleRange(year, month);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
}

/**
 * Calculates which day of the current billing cycle we are in.
 *
 * @returns {number} Current day of the billing cycle (1 to totalDays)
 */
export function getCurrentDayOfCycle() {
  const now = new Date();
  const { invoiceYear, invoiceMonth } = getCurrentInvoiceMonth();
  const { start } = billingCycleRange(invoiceYear, invoiceMonth);

  const diffTime = now - start;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

  return Math.max(diffDays, 1);
}

/**
 * Calculates the current invoice month based on the billing cycle logic.
 *
 * Billing cycle rules:
 * - Before Oct 4, 2025: Cycle runs from 4th to 3rd of next month
 * - Oct 4 - Nov 16, 2025: Transition cycle (invoice month is November)
 * - After Nov 16, 2025: Cycle runs from 17th to 16th of next month
 *
 * @returns {Object} Object with invoiceYear and invoiceMonth
 */
export function getCurrentInvoiceMonth() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const currentDate = new Date(currentYear, currentMonth - 1, now.getDate());

  let invoiceYear = currentYear;
  let invoiceMonth;

  if (currentDate < CYCLE_CHANGE_DATE) {
    const cycleDay = 4;
    if (now.getDate() >= cycleDay) {
      invoiceMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      if (currentMonth === 12) invoiceYear++;
    } else {
      invoiceMonth = currentMonth;
    }
  } else if (currentDate <= CYCLE_TRANSITION_END_DATE) {
    invoiceMonth = 11;
    invoiceYear = 2025;
  } else {
    const cycleDay = 17;
    if (now.getDate() >= cycleDay) {
      invoiceMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      if (currentMonth === 12) invoiceYear++;
    } else {
      invoiceMonth = currentMonth;
    }
  }

  return { invoiceYear, invoiceMonth };
}
