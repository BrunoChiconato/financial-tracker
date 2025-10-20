/**
 * Formatters Utility Tests
 *
 * Tests for all formatting functions to ensure compliance with Rule 9:
 * All monetary values must use 2 decimal places in Brazilian format.
 */
import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatDateBR,
  formatDateTimeBR,
  formatNumber,
  formatMoMPercentage,
  getMoMColorClass,
} from './formatters';

describe('formatCurrency', () => {
  it('should format positive numbers with exactly 2 decimal places', () => {
    expect(formatCurrency(1234.56)).toBe('R$ 1.234,56');
    expect(formatCurrency(100)).toBe('R$ 100,00');
    expect(formatCurrency(0.5)).toBe('R$ 0,50');
  });

  it('should format numbers with more than 2 decimals by rounding', () => {
    expect(formatCurrency(1234.567)).toBe('R$ 1.234,57');
    expect(formatCurrency(0.999)).toBe('R$ 1,00');
  });

  it('should handle zero correctly', () => {
    expect(formatCurrency(0)).toBe('R$ 0,00');
  });

  it('should handle negative numbers', () => {
    expect(formatCurrency(-100.50)).toBe('R$ -100,50');
    expect(formatCurrency(-1234.56)).toBe('R$ -1.234,56');
  });

  it('should handle null, undefined, and NaN as R$ 0,00', () => {
    expect(formatCurrency(null)).toBe('R$ 0,00');
    expect(formatCurrency(undefined)).toBe('R$ 0,00');
    expect(formatCurrency(NaN)).toBe('R$ 0,00');
  });

  it('should format large numbers with thousand separators', () => {
    expect(formatCurrency(1234567.89)).toBe('R$ 1.234.567,89');
    expect(formatCurrency(1000000)).toBe('R$ 1.000.000,00');
  });

  it('should always show exactly 2 decimal places (Rule 9)', () => {
    expect(formatCurrency(35.5)).toBe('R$ 35,50');
    expect(formatCurrency(100.1)).toBe('R$ 100,10');
    expect(formatCurrency(99)).toBe('R$ 99,00');
  });
});

describe('formatDateBR', () => {
  it('should format dates in DD/MM/YYYY format', () => {
    const date = new Date('2025-01-15T10:30:00');
    expect(formatDateBR(date)).toBe('15/01/2025');
  });

  it('should handle date strings', () => {
    // Use explicit Date object to avoid timezone issues
    const date = new Date(2025, 11, 25); // Month is 0-indexed
    expect(formatDateBR(date)).toBe('25/12/2025');
  });

  it('should pad single digit days and months with zeros', () => {
    const date = new Date('2025-03-05T00:00:00');
    expect(formatDateBR(date)).toBe('05/03/2025');
  });

  it('should handle null or undefined as empty string', () => {
    expect(formatDateBR(null)).toBe('');
    expect(formatDateBR(undefined)).toBe('');
  });
});

describe('formatDateTimeBR', () => {
  it('should format datetime in DD/MM/YYYY HH:mm format', () => {
    const datetime = new Date('2025-01-15T14:30:00');
    expect(formatDateTimeBR(datetime)).toBe('15/01/2025 14:30');
  });

  it('should pad hours and minutes with zeros', () => {
    const datetime = new Date('2025-03-05T09:05:00');
    expect(formatDateTimeBR(datetime)).toBe('05/03/2025 09:05');
  });

  it('should handle null or undefined as empty string', () => {
    expect(formatDateTimeBR(null)).toBe('');
    expect(formatDateTimeBR(undefined)).toBe('');
  });
});

describe('formatNumber', () => {
  it('should format numbers with Brazilian thousand separators', () => {
    expect(formatNumber(1234)).toBe('1.234');
    expect(formatNumber(1234567)).toBe('1.234.567');
  });

  it('should respect decimal places parameter', () => {
    expect(formatNumber(1234.56, 0)).toBe('1.235');
    expect(formatNumber(1234.56, 2)).toBe('1.234,56');
    expect(formatNumber(1234.567, 3)).toBe('1.234,567');
  });

  it('should default to 0 decimal places', () => {
    expect(formatNumber(1234.99)).toBe('1.235');
  });

  it('should handle null, undefined, and NaN as "0"', () => {
    expect(formatNumber(null)).toBe('0');
    expect(formatNumber(undefined)).toBe('0');
    expect(formatNumber(NaN)).toBe('0');
  });
});

describe('formatMoMPercentage', () => {
  it('should format positive percentages with + sign', () => {
    expect(formatMoMPercentage(15.3)).toBe('+15.3%');
    expect(formatMoMPercentage(5.0)).toBe('+5.0%');
  });

  it('should format negative percentages with - sign', () => {
    expect(formatMoMPercentage(-10.5)).toBe('-10.5%');
    expect(formatMoMPercentage(-2.3)).toBe('-2.3%');
  });

  it('should format zero without sign', () => {
    expect(formatMoMPercentage(0)).toBe('0.0%');
  });

  it('should round to 1 decimal place', () => {
    expect(formatMoMPercentage(15.67)).toBe('+15.7%');
    expect(formatMoMPercentage(-8.34)).toBe('-8.3%');
  });

  it('should handle null, undefined, and NaN as 0.0%', () => {
    expect(formatMoMPercentage(null)).toBe('0.0%');
    expect(formatMoMPercentage(undefined)).toBe('0.0%');
    expect(formatMoMPercentage(NaN)).toBe('0.0%');
  });
});

describe('getMoMColorClass', () => {
  it('should return red class for positive values (spending increased)', () => {
    expect(getMoMColorClass(100)).toBe('text-red');
    expect(getMoMColorClass(0.01)).toBe('text-red');
  });

  it('should return green class for negative values (spending decreased)', () => {
    expect(getMoMColorClass(-100)).toBe('text-green');
    expect(getMoMColorClass(-0.01)).toBe('text-green');
  });

  it('should return neutral class for zero', () => {
    expect(getMoMColorClass(0)).toBe('text-neutral');
  });
});
