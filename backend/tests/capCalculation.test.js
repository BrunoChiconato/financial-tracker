/**
 * Cap Calculation Tests
 *
 * Tests for the monthly budget cap calculation logic including:
 * - Holiday exclusion from business days
 * - Missing holidays.json fallback
 * - Detailed object structure
 * - October 2025 special case with holidays
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { calculateMonthlyCap } from '../utils/capCalculation.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const originalEnv = { ...process.env };

beforeAll(() => {
  process.env.CAP_HOURLY_RATE = '100';
  process.env.CAP_DAILY_HOURS = '8';
  process.env.CAP_ACCOUNTING_FEE = '350';
  process.env.CAP_ACCOUNTING_START_MONTH = '12';
  process.env.CAP_ACCOUNTING_START_YEAR = '2025';
  process.env.CAP_DAS_PERCENT = '0.06';
  process.env.CAP_PRO_LABORE_PERCENT = '0.20';
  process.env.CAP_INSS_PERCENT = '0.11';
  process.env.CAP_FIRST_DISCOUNT_PERCENT = '0.10';
  process.env.CAP_SECOND_DISCOUNT_FIXED = '500';
  process.env.CAP_START_MONTH = '10';
  process.env.CAP_START_YEAR = '2025';
  process.env.CAP_OCTOBER_BUSINESS_DAYS = '13';
});

afterAll(() => {
  process.env = { ...originalEnv };
});

describe('Cap Calculation - Holidays', () => {
  it('should return detailed cap object with all required fields', () => {
    const result = calculateMonthlyCap(2025, 11);

    expect(result).toBeTruthy();
    expect(result).toHaveProperty('year');
    expect(result).toHaveProperty('month');
    expect(result).toHaveProperty('grossIncome');
    expect(result).toHaveProperty('accountingFee');
    expect(result).toHaveProperty('dasAmount');
    expect(result).toHaveProperty('proLaboreAmount');
    expect(result).toHaveProperty('inssAmount');
    expect(result).toHaveProperty('totalDeductions');
    expect(result).toHaveProperty('firstDiscount');
    expect(result).toHaveProperty('secondDiscount');
    expect(result).toHaveProperty('netCap');
    expect(result).toHaveProperty('businessDaysWorked');
    expect(result).toHaveProperty('totalBusinessDays');
    expect(result).toHaveProperty('holidays');
  });

  it('should subtract holidays from total business days', () => {
    const result = calculateMonthlyCap(2025, 11);

    const expectedWorked = result.totalBusinessDays - result.holidays;
    expect(result.businessDaysWorked).toBe(expectedWorked);
  });

  it('should default to 0 holidays for months not in holidays.json', () => {
    const result = calculateMonthlyCap(2027, 6);

    expect(result.holidays).toBe(0);
    expect(result.businessDaysWorked).toBe(result.totalBusinessDays);
  });

  it('should look up holidays by CALENDAR month, not invoice month', () => {
    const decemberInvoiceMonth = calculateMonthlyCap(2025, 12);

    expect(decemberInvoiceMonth.month).toBe(12);
    expect(decemberInvoiceMonth.holidays).toBe(1);
  });

  it('should handle October 2025 special case with holiday override', () => {
    const result = calculateMonthlyCap(2025, 11);

    expect(result.totalBusinessDays).toBe(13);
  });

  it('should return null for months before CAP_START_MONTH/YEAR', () => {
    const result = calculateMonthlyCap(2025, 9);

    expect(result).toBeNull();
  });

  it('should format all monetary values to 2 decimal places', () => {
    const result = calculateMonthlyCap(2025, 11);

    expect(result.grossIncome).toMatch(/^\d+\.\d{2}$/);
    expect(result.accountingFee).toMatch(/^\d+\.\d{2}$/);
    expect(result.dasAmount).toMatch(/^\d+\.\d{2}$/);
    expect(result.proLaboreAmount).toMatch(/^\d+\.\d{2}$/);
    expect(result.inssAmount).toMatch(/^\d+\.\d{2}$/);
    expect(result.totalDeductions).toMatch(/^\d+\.\d{2}$/);
    expect(result.firstDiscount).toMatch(/^\d+\.\d{2}$/);
    expect(result.secondDiscount).toMatch(/^\d+\.\d{2}$/);
    expect(result.netCap).toMatch(/^\d+\.\d{2}$/);
  });

  it('should calculate gross income based on business days worked', () => {
    const result = calculateMonthlyCap(2025, 12);

    const hourlyRate = parseFloat(process.env.CAP_HOURLY_RATE);
    const dailyHours = parseFloat(process.env.CAP_DAILY_HOURS);
    const expectedGross = result.businessDaysWorked * dailyHours * hourlyRate;

    expect(parseFloat(result.grossIncome)).toBeCloseTo(expectedGross, 2);
  });

  it('should apply accounting fee only from CAP_ACCOUNTING_START_MONTH/YEAR', () => {
    const beforeAccounting = calculateMonthlyCap(2025, 12);
    const afterAccounting = calculateMonthlyCap(2026, 1);

    expect(parseFloat(beforeAccounting.accountingFee)).toBe(0);
    expect(parseFloat(afterAccounting.accountingFee)).toBeGreaterThan(0);
  });

  it('should ensure businessDaysWorked is never negative', async () => {
    const holidaysPath = path.join(__dirname, '../../config/holidays.json');
    const originalData = fs.readFileSync(holidaysPath, 'utf8');

    try {
      const tempHolidays = JSON.parse(originalData);
      if (!tempHolidays['2025']) tempHolidays['2025'] = {};
      tempHolidays['2025']['10'] = 999;
      fs.writeFileSync(holidaysPath, JSON.stringify(tempHolidays, null, 2));

      const { calculateMonthlyCap: freshCalc } = await import(
        '../utils/capCalculation.js?t=' + Date.now()
      );
      const result = freshCalc(2025, 11);

      expect(result.businessDaysWorked).toBeGreaterThanOrEqual(0);
    } finally {
      fs.writeFileSync(holidaysPath, originalData);
    }
  });
});

describe('Cap Calculation - Edge Cases', () => {
  it('should handle December to January invoice month transition', () => {
    const dec = calculateMonthlyCap(2025, 12);
    const jan = calculateMonthlyCap(2026, 1);

    expect(dec).toBeTruthy();
    expect(jan).toBeTruthy();
    expect(dec.year).toBe(2025);
    expect(dec.month).toBe(12);
    expect(jan.year).toBe(2026);
    expect(jan.month).toBe(1);
  });

  it('should return consistent results for the same month', () => {
    const result1 = calculateMonthlyCap(2025, 11);
    const result2 = calculateMonthlyCap(2025, 11);

    expect(result1).toEqual(result2);
  });

  it('should handle months with different numbers of business days', () => {
    const nov = calculateMonthlyCap(2025, 12);
    const feb = calculateMonthlyCap(2026, 2);

    expect(nov).toBeTruthy();
    expect(feb).toBeTruthy();
    expect(nov.totalBusinessDays).not.toBe(feb.totalBusinessDays);
  });
});
