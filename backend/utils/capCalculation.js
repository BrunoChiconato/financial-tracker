/**
 * Monthly Budget Cap Calculation Module
 *
 * Calculates dynamic monthly budget caps based on business days, hourly rates,
 * and configurable deductions. All sensitive values are stored in environment
 * variables to prevent exposure in version control.
 *
 * The calculation follows this formula:
 * 1. Gross Revenue = Business Days × Daily Hours × Hourly Rate
 * 2. Net Revenue = Gross Revenue - (Accounting Fees + DAS + Pro-Labore INSS)
 * 3. Final Cap = Net Revenue - (Net Revenue × First Discount %) - Fixed Deduction
 *
 * @module capCalculation
 */

/**
 * Calculates the number of business days in a given calendar month.
 *
 * Business days are Monday through Friday, excluding weekends.
 * Does not account for holidays.
 *
 * @param {number} year - The year (e.g., 2025)
 * @param {number} month - The month (1-12, where 1 is January)
 * @returns {number} Number of business days in the month
 */
function getBusinessDaysInMonth(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  let businessDays = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDays++;
    }
  }

  return businessDays;
}

/**
 * Calculates the monthly budget cap for a given invoice month.
 *
 * The calculation uses environment variables for all sensitive parameters:
 * - CAP_HOURLY_RATE: Hourly rate in BRL
 * - CAP_DAILY_HOURS: Working hours per day
 * - CAP_ACCOUNTING_FEE: Monthly accounting fee in BRL
 * - CAP_ACCOUNTING_START_MONTH: Calendar month when accounting fees start (e.g., 12 for December)
 * - CAP_ACCOUNTING_START_YEAR: Year when accounting fees start (e.g., 2025)
 * - CAP_DAS_PERCENT: DAS tax percentage (as decimal, e.g., 0.06 for 6%)
 * - CAP_PRO_LABORE_PERCENT: Pro-Labore percentage (as decimal, e.g., 0.29 for 29%)
 * - CAP_INSS_PERCENT: INSS percentage (as decimal, e.g., 0.11 for 11%)
 * - CAP_FIRST_DISCOUNT_PERCENT: First final discount percentage (as decimal, e.g., 0.10 for 10%)
 * - CAP_SECOND_DISCOUNT_FIXED: Second final fixed discount in BRL
 * - CAP_START_MONTH: Calendar month when cap calculation starts (e.g., 10 for October)
 * - CAP_START_YEAR: Year when cap calculation starts (e.g., 2025)
 * - CAP_OCTOBER_BUSINESS_DAYS: Fixed business days for October 2025 (started mid-month)
 *
 * @param {number} invoiceYear - Invoice year (e.g., 2025)
 * @param {number} invoiceMonth - Invoice month (1-12)
 * @returns {number|null} The calculated cap in BRL, or null if cap should not be displayed
 */
export function calculateMonthlyCap(invoiceYear, invoiceMonth) {
  const config = {
    hourlyRate: parseFloat(process.env.CAP_HOURLY_RATE) || 0,
    dailyHours: parseFloat(process.env.CAP_DAILY_HOURS) || 8,
    accountingFee: parseFloat(process.env.CAP_ACCOUNTING_FEE) || 0,
    accountingStartMonth: parseInt(process.env.CAP_ACCOUNTING_START_MONTH) || 12,
    accountingStartYear: parseInt(process.env.CAP_ACCOUNTING_START_YEAR) || 2025,
    dasPercent: parseFloat(process.env.CAP_DAS_PERCENT) || 0,
    proLaborePercent: parseFloat(process.env.CAP_PRO_LABORE_PERCENT) || 0,
    inssPercent: parseFloat(process.env.CAP_INSS_PERCENT) || 0,
    firstDiscountPercent: parseFloat(process.env.CAP_FIRST_DISCOUNT_PERCENT) || 0,
    secondDiscountFixed: parseFloat(process.env.CAP_SECOND_DISCOUNT_FIXED) || 0,
    startMonth: parseInt(process.env.CAP_START_MONTH) || 10,
    startYear: parseInt(process.env.CAP_START_YEAR) || 2025,
    octoberBusinessDays: parseInt(process.env.CAP_OCTOBER_BUSINESS_DAYS) || 13,
  };

  const calendarMonth = invoiceMonth === 1 ? 12 : invoiceMonth - 1;
  const calendarYear = invoiceMonth === 1 ? invoiceYear - 1 : invoiceYear;

  const targetDate = new Date(calendarYear, calendarMonth - 1, 1);
  const startDate = new Date(config.startYear, config.startMonth - 1, 1);

  if (targetDate < startDate) {
    return null;
  }

  let businessDays;
  if (calendarYear === 2025 && calendarMonth === 10) {
    businessDays = config.octoberBusinessDays;
  } else {
    businessDays = getBusinessDaysInMonth(calendarYear, calendarMonth);
  }

  const totalHours = businessDays * config.dailyHours;
  const grossRevenue = totalHours * config.hourlyRate;

  const accountingStartDate = new Date(config.accountingStartYear, config.accountingStartMonth - 1, 1);
  const accountingFee = targetDate >= accountingStartDate ? config.accountingFee : 0;

  const dasDeduction = grossRevenue * config.dasPercent;
  const proLaboreBase = grossRevenue * config.proLaborePercent;
  const inssDeduction = proLaboreBase * config.inssPercent;

  const netRevenue = grossRevenue - (accountingFee + dasDeduction + inssDeduction);

  const firstDiscount = netRevenue * config.firstDiscountPercent;
  const finalCap = netRevenue - firstDiscount - config.secondDiscountFixed;

  return Math.round(finalCap * 100) / 100;
}

/**
 * Gets the cap for the current invoice month based on today's date.
 *
 * @returns {number|null} The calculated cap in BRL, or null if not applicable
 */
export function getCurrentMonthlyCap() {
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

  return calculateMonthlyCap(invoiceYear, invoiceMonth);
}
