/**
 * Billing Cycle Utilities
 *
 * Utilities for calculating the current invoice month based on the billing cycle logic.
 * The billing cycle transitioned from day 4 to day 17 on October 4, 2025.
 */

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

  const CYCLE_CHANGE_DATE = new Date(2025, 9, 4);
  const TRANSITION_END_DATE = new Date(2025, 10, 16);
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
  } else if (currentDate <= TRANSITION_END_DATE) {
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
