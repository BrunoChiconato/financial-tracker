/**
 * Integration Tests: /api/filters/metadata
 *
 * Tests filter metadata endpoint which provides:
 * - Available categories
 * - Available tags
 * - Date range (min/max)
 * - Invoice months (with installment expansion)
 */

import request from 'supertest';
import app from '../index.js';
import { clearDatabase, insertExpense, insertMultipleExpenses, testData } from './setup.js';

describe('GET /api/filters/metadata', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe('Response Schema', () => {
    it('should return correct schema when database is empty', async () => {
      const response = await request(app).get('/api/filters/metadata');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('categories');
      expect(response.body).toHaveProperty('tags');
      expect(response.body).toHaveProperty('dateRange');
      expect(response.body).toHaveProperty('invoiceMonths');

      expect(Array.isArray(response.body.categories)).toBe(true);
      expect(Array.isArray(response.body.tags)).toBe(true);
      expect(Array.isArray(response.body.invoiceMonths)).toBe(true);
      expect(response.body.dateRange).toHaveProperty('min');
      expect(response.body.dateRange).toHaveProperty('max');
    });

    it('should return all distinct categories and tags', async () => {
      await insertMultipleExpenses([
        {
          expense_ts: new Date('2025-09-10'),
          amount: 100,
          description: 'Test 1',
          category: 'Alimentação',
          tag: 'Gastos Pessoais',
        },
        {
          expense_ts: new Date('2025-09-11'),
          amount: 200,
          description: 'Test 2',
          category: 'Transporte',
          tag: 'Gastos do Casal',
        },
        {
          expense_ts: new Date('2025-09-12'),
          amount: 150,
          description: 'Test 3',
          category: 'Alimentação',
          tag: 'Gastos Pessoais',
        },
      ]);

      const response = await request(app).get('/api/filters/metadata');

      expect(response.status).toBe(200);
      expect(response.body.categories).toContain('Alimentação');
      expect(response.body.categories).toContain('Transporte');
      expect(response.body.categories.length).toBe(2);

      expect(response.body.tags).toContain('Gastos Pessoais');
      expect(response.body.tags).toContain('Gastos do Casal');
      expect(response.body.tags.length).toBe(2);
    });
  });

  describe('Date Range Calculation', () => {
    it('should return correct min and max dates', async () => {
      await insertMultipleExpenses([
        {
          expense_ts: new Date('2025-01-15T10:00:00Z'),
          amount: 100,
          description: 'First Expense',
        },
        {
          expense_ts: new Date('2025-06-20T14:00:00Z'),
          amount: 200,
          description: 'Last Expense',
        },
        {
          expense_ts: new Date('2025-03-10T12:00:00Z'),
          amount: 150,
          description: 'Middle Expense',
        },
      ]);

      const response = await request(app).get('/api/filters/metadata');

      expect(response.status).toBe(200);
      const minDate = new Date(response.body.dateRange.min);
      const maxDate = new Date(response.body.dateRange.max);

      expect(minDate.toISOString()).toContain('2025-01-15');
      expect(maxDate.toISOString()).toContain('2025-06-20');
    });

    it('should account for future installment dates in max date', async () => {
      await insertExpense({
        expense_ts: new Date('2025-09-10T10:00:00Z'),
        amount: 300,
        description: 'Installment Purchase',
        installments: 3,
      });

      const response = await request(app).get('/api/filters/metadata');

      expect(response.status).toBe(200);
      const maxDate = new Date(response.body.dateRange.max);

      const minDate = new Date(response.body.dateRange.min);
      expect(maxDate.getTime()).toBeGreaterThan(minDate.getTime());
    });
  });

  describe('Invoice Month Generation', () => {
    it('should generate correct invoice months for old billing cycle', async () => {
      await insertMultipleExpenses(testData.oldCycleExpenses);

      const response = await request(app).get('/api/filters/metadata');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.invoiceMonths)).toBe(true);
      expect(response.body.invoiceMonths.length).toBeGreaterThan(0);

      const firstMonth = response.body.invoiceMonths[0];
      expect(firstMonth).toHaveProperty('year');
      expect(firstMonth).toHaveProperty('month');
      expect(firstMonth).toHaveProperty('label');
      expect(typeof firstMonth.year).toBe('number');
      expect(typeof firstMonth.month).toBe('number');
      expect(typeof firstMonth.label).toBe('string');
    });

    it('should generate transition invoice month (Nov 2025)', async () => {
      await insertMultipleExpenses(testData.transitionCycleExpenses);

      const response = await request(app).get('/api/filters/metadata');

      expect(response.status).toBe(200);

      const novemberMonth = response.body.invoiceMonths.find(
        (m) => m.year === 2025 && m.month === 11
      );
      expect(novemberMonth).toBeDefined();
      expect(novemberMonth.label).toBe('11/2025');
    });

    it('should generate correct invoice months for new billing cycle', async () => {
      await insertMultipleExpenses(testData.newCycleExpenses);

      const response = await request(app).get('/api/filters/metadata');

      expect(response.status).toBe(200);

      const decemberMonth = response.body.invoiceMonths.find(
        (m) => m.year === 2025 && m.month === 12
      );
      expect(decemberMonth).toBeDefined();
      expect(decemberMonth.label).toBe('12/2025');
    });

    it('should sort invoice months chronologically', async () => {
      await insertMultipleExpenses([
        ...testData.oldCycleExpenses,
        ...testData.transitionCycleExpenses,
        ...testData.newCycleExpenses,
      ]);

      const response = await request(app).get('/api/filters/metadata');

      expect(response.status).toBe(200);
      const months = response.body.invoiceMonths;

      for (let i = 1; i < months.length; i++) {
        const prev = months[i - 1];
        const curr = months[i];

        if (prev.year !== curr.year) {
          expect(curr.year).toBeGreaterThan(prev.year);
        } else {
          expect(curr.month).toBeGreaterThanOrEqual(prev.month);
        }
      }
    });

    it('should include future installment months in invoice months', async () => {
      await insertExpense(testData.installmentExpense);

      const response = await request(app).get('/api/filters/metadata');

      expect(response.status).toBe(200);

      const invoiceMonths = response.body.invoiceMonths;
      expect(invoiceMonths.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single expense correctly', async () => {
      await insertExpense({
        expense_ts: new Date('2025-10-15'),
        amount: 100,
        description: 'Single Expense',
      });

      const response = await request(app).get('/api/filters/metadata');

      expect(response.status).toBe(200);
      expect(response.body.categories.length).toBe(1);
      expect(response.body.tags.length).toBe(1);
      expect(response.body.invoiceMonths.length).toBeGreaterThan(0);
    });

    it('should return empty arrays when no expenses exist', async () => {
      const response = await request(app).get('/api/filters/metadata');

      expect(response.status).toBe(200);
      expect(response.body.categories).toEqual([]);
      expect(response.body.tags).toEqual([]);
      expect(response.body.dateRange.min).toBeNull();
      expect(response.body.dateRange.max).toBeNull();
      expect(response.body.invoiceMonths).toEqual([]);
    });
  });
});
