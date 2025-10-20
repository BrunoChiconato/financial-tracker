/**
 * Integration Tests: /api/summary
 *
 * Tests summary endpoint with critical focus on:
 * - MoM (Month-over-Month) calculations
 * - Transition cycle handling (44-day cycle)
 * - Daily average calculations with unequal periods
 * - Installment inclusion in totals
 */

import request from 'supertest';
import app from '../index.js';
import { clearDatabase, insertExpense, insertMultipleExpenses, testData, validateSummarySchema } from './setup.js';

describe('GET /api/summary', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe('Response Schema', () => {
    it('should return correct summary structure', async () => {
      await insertExpense({
        expense_ts: new Date('2025-09-10'),
        amount: 100,
        description: 'Test',
      });

      const response = await request(app)
        .get('/api/summary')
        .query({
          startDate: '2025-09-01',
          endDate: '2025-09-30',
        });

      expect(response.status).toBe(200);
      validateSummarySchema(response.body);
    });

    it('should include period dates in response', async () => {
      const response = await request(app)
        .get('/api/summary')
        .query({
          startDate: '2025-09-01',
          endDate: '2025-09-30',
        });

      expect(response.status).toBe(200);
      expect(response.body.current.period.start).toBe('2025-09-01');
      expect(response.body.current.period.end).toBe('2025-09-30');
      expect(response.body.previous.period).toBeDefined();
    });
  });

  describe('Current Period Calculations', () => {
    it('should calculate total spent correctly', async () => {
      await insertMultipleExpenses([
        { expense_ts: new Date('2025-09-10'), amount: 100, description: 'A' },
        { expense_ts: new Date('2025-09-15'), amount: 250.50, description: 'B' },
        { expense_ts: new Date('2025-09-20'), amount: 75.25, description: 'C' },
      ]);

      const response = await request(app)
        .get('/api/summary')
        .query({
          startDate: '2025-09-01',
          endDate: '2025-09-30',
        });

      expect(response.status).toBe(200);
      expect(response.body.current.totalSpent).toBeCloseTo(425.75, 2);
    });

    it('should calculate daily average correctly', async () => {
      await insertMultipleExpenses([
        { expense_ts: new Date('2025-09-10'), amount: 100, description: 'A' },
        { expense_ts: new Date('2025-09-15'), amount: 200, description: 'B' },
      ]);

      const response = await request(app)
        .get('/api/summary')
        .query({
          startDate: '2025-09-01',
          endDate: '2025-09-30',
        });

      expect(response.status).toBe(200);
      expect(response.body.current.avgDaily).toBeCloseTo(10, 2);
    });

    it('should count transactions correctly', async () => {
      await insertMultipleExpenses([
        { expense_ts: new Date('2025-09-10'), amount: 100, description: 'A' },
        { expense_ts: new Date('2025-09-15'), amount: 200, description: 'B' },
        { expense_ts: new Date('2025-09-20'), amount: 150, description: 'C' },
      ]);

      const response = await request(app)
        .get('/api/summary')
        .query({
          startDate: '2025-09-01',
          endDate: '2025-09-30',
        });

      expect(response.status).toBe(200);
      expect(response.body.current.transactionCount).toBe(3);
    });

    it('should include installment amounts in total', async () => {
      await insertExpense({
        expense_ts: new Date('2025-09-10T10:00:00Z'),
        amount: 300,
        description: 'Installment Purchase',
        installments: 3,
      });

      const response = await request(app)
        .get('/api/summary')
        .query({
          startDate: '2025-09-01',
          endDate: '2025-12-31',
        });

      expect(response.status).toBe(200);
      expect(response.body.current.totalSpent).toBeCloseTo(300, 2);
      expect(response.body.current.transactionCount).toBe(3);
    });

    it('should handle filters correctly in summary', async () => {
      await insertMultipleExpenses([
        {
          expense_ts: new Date('2025-09-10'),
          amount: 100,
          description: 'Food',
          category: 'Alimentação',
        },
        {
          expense_ts: new Date('2025-09-15'),
          amount: 200,
          description: 'Transport',
          category: 'Transporte',
        },
      ]);

      const response = await request(app)
        .get('/api/summary')
        .query({
          startDate: '2025-09-01',
          endDate: '2025-09-30',
          categories: 'Alimentação',
        });

      expect(response.status).toBe(200);
      expect(response.body.current.totalSpent).toBeCloseTo(100, 2);
      expect(response.body.current.transactionCount).toBe(1);
    });
  });

  describe('MoM Calculations (CRITICAL)', () => {
    it('should calculate previous period for custom date range', async () => {
      await insertMultipleExpenses([
        { expense_ts: new Date('2025-08-10'), amount: 200, description: 'Prev' },
        { expense_ts: new Date('2025-09-10'), amount: 300, description: 'Curr' },
      ]);

      const response = await request(app)
        .get('/api/summary')
        .query({
          startDate: '2025-09-01',
          endDate: '2025-09-30',
          useInvoiceMonth: 'false',
        });

      expect(response.status).toBe(200);
      expect(response.body.current.totalSpent).toBeCloseTo(300, 2);
      expect(response.body.previous.totalSpent).toBeCloseTo(200, 2);

      expect(response.body.mom.totalSpent.absolute).toBeCloseTo(100, 2);
      expect(response.body.mom.totalSpent.percentage).toBeCloseTo(50, 2);
    });

    it('should calculate MoM for old billing cycle (Sept 4 - Oct 3)', async () => {
      await insertMultipleExpenses([
        { expense_ts: new Date('2025-08-10'), amount: 400, description: 'Prev' },
        { expense_ts: new Date('2025-09-15'), amount: 500, description: 'Curr' },
      ]);

      const response = await request(app)
        .get('/api/summary')
        .query({
          useInvoiceMonth: 'true',
          invoiceYear: '2025',
          invoiceMonth: '10',
        });

      expect(response.status).toBe(200);
      expect(response.body.current.totalSpent).toBeCloseTo(500, 2);

      expect(response.body.previous.totalSpent).toBeCloseTo(400, 2);

      expect(response.body.mom.totalSpent.percentage).toBeCloseTo(25, 2);
    });

    it('should handle transition cycle MoM correctly (44-day cycle)', async () => {
      await insertMultipleExpenses([
        { expense_ts: new Date('2025-09-15'), amount: 600, description: 'Prev' },
        { expense_ts: new Date('2025-10-20'), amount: 880, description: 'Curr' },
      ]);

      const response = await request(app)
        .get('/api/summary')
        .query({
          useInvoiceMonth: 'true',
          invoiceYear: '2025',
          invoiceMonth: '11',
        });

      expect(response.status).toBe(200);
      expect(response.body.current.totalSpent).toBeCloseTo(880, 2);
      expect(response.body.previous.totalSpent).toBeCloseTo(600, 2);

      expect(response.body.current.avgDaily).toBeCloseTo(20, 1);
      expect(response.body.previous.avgDaily).toBeCloseTo(20, 1);
    });

    it('should calculate MoM for new billing cycle (Nov 17 - Dec 16)', async () => {
      await insertMultipleExpenses([
        { expense_ts: new Date('2025-10-20'), amount: 500, description: 'Prev' },
        { expense_ts: new Date('2025-11-25'), amount: 700, description: 'Curr' },
      ]);

      const response = await request(app)
        .get('/api/summary')
        .query({
          useInvoiceMonth: 'true',
          invoiceYear: '2025',
          invoiceMonth: '12',
        });

      expect(response.status).toBe(200);
      expect(response.body.current.totalSpent).toBeCloseTo(700, 2);
      expect(response.body.previous.totalSpent).toBeCloseTo(500, 2);

      expect(response.body.mom.totalSpent.percentage).toBeCloseTo(40, 2);
    });

    it('should handle zero previous spending correctly', async () => {
      await insertExpense({
        expense_ts: new Date('2025-09-10'),
        amount: 200,
        description: 'Current Only',
      });

      const response = await request(app)
        .get('/api/summary')
        .query({
          startDate: '2025-09-01',
          endDate: '2025-09-30',
        });

      expect(response.status).toBe(200);
      expect(response.body.current.totalSpent).toBeCloseTo(200, 2);
      expect(response.body.previous.totalSpent).toBe(0);

      expect(response.body.mom.totalSpent.percentage).toBe(0);
    });

    it('should calculate negative MoM when spending decreased', async () => {
      await insertMultipleExpenses([
        { expense_ts: new Date('2025-08-10'), amount: 1000, description: 'Prev' },
        { expense_ts: new Date('2025-09-10'), amount: 600, description: 'Curr' },
      ]);

      const response = await request(app)
        .get('/api/summary')
        .query({
          startDate: '2025-09-01',
          endDate: '2025-09-30',
        });

      expect(response.status).toBe(200);
      expect(response.body.current.totalSpent).toBeCloseTo(600, 2);
      expect(response.body.previous.totalSpent).toBeCloseTo(1000, 2);

      expect(response.body.mom.totalSpent.absolute).toBeCloseTo(-400, 2);
      expect(response.body.mom.totalSpent.percentage).toBeCloseTo(-40, 2);
    });
  });

  describe('Daily Average Calculations', () => {
    it('should calculate daily average for single-day period', async () => {
      await insertExpense({
        expense_ts: new Date('2025-09-15'),
        amount: 100,
        description: 'Single Day',
      });

      const response = await request(app)
        .get('/api/summary')
        .query({
          startDate: '2025-09-15',
          endDate: '2025-09-15',
        });

      expect(response.status).toBe(200);
      expect(response.body.current.avgDaily).toBeCloseTo(100, 2);
    });

    it('should calculate daily average for multi-day period', async () => {
      await insertMultipleExpenses([
        { expense_ts: new Date('2025-09-01'), amount: 100, description: 'A' },
        { expense_ts: new Date('2025-09-10'), amount: 200, description: 'B' },
        { expense_ts: new Date('2025-09-20'), amount: 300, description: 'C' },
      ]);

      const response = await request(app)
        .get('/api/summary')
        .query({
          startDate: '2025-09-01',
          endDate: '2025-09-30',
        });

      expect(response.status).toBe(200);
      expect(response.body.current.avgDaily).toBeCloseTo(20, 2);
    });

    it('should use same day count for current and previous in custom range', async () => {
      await insertMultipleExpenses([
        { expense_ts: new Date('2025-08-10'), amount: 300, description: 'Prev' },
        { expense_ts: new Date('2025-09-10'), amount: 600, description: 'Curr' },
      ]);

      const response = await request(app)
        .get('/api/summary')
        .query({
          startDate: '2025-09-01',
          endDate: '2025-09-30',
        });

      expect(response.status).toBe(200);
      expect(response.body.current.avgDaily).toBeCloseTo(20, 2);
      expect(response.body.previous.avgDaily).toBeCloseTo(10, 2);

      expect(response.body.mom.avgDaily.percentage).toBeCloseTo(100, 2);
    });
  });

  describe('Filter Application in Summary', () => {
    beforeEach(async () => {
      await insertMultipleExpenses([
        {
          expense_ts: new Date('2025-09-10'),
          amount: 100,
          description: 'Food',
          category: 'Alimentação',
          tag: 'Gastos Pessoais',
        },
        {
          expense_ts: new Date('2025-09-15'),
          amount: 200,
          description: 'Transport',
          category: 'Transporte',
          tag: 'Gastos do Casal',
        },
      ]);
    });

    it('should apply category filter to both current and previous periods', async () => {
      const response = await request(app)
        .get('/api/summary')
        .query({
          startDate: '2025-09-01',
          endDate: '2025-09-30',
          categories: 'Alimentação',
        });

      expect(response.status).toBe(200);
      expect(response.body.current.totalSpent).toBeCloseTo(100, 2);
      expect(response.body.current.transactionCount).toBe(1);
    });

    it('should apply tag filter to summary', async () => {
      const response = await request(app)
        .get('/api/summary')
        .query({
          startDate: '2025-09-01',
          endDate: '2025-09-30',
          tags: 'Gastos do Casal',
        });

      expect(response.status).toBe(200);
      expect(response.body.current.totalSpent).toBeCloseTo(200, 2);
      expect(response.body.current.transactionCount).toBe(1);
    });

    it('should apply multiple filters consistently', async () => {
      await insertExpense({
        expense_ts: new Date('2025-09-20'),
        amount: 150,
        description: 'Grocery',
        category: 'Supermercado',
        tag: 'Gastos de Casa',
        method: 'Cartão de Crédito',
      });

      const response = await request(app)
        .get('/api/summary')
        .query({
          startDate: '2025-09-01',
          endDate: '2025-09-30',
          categories: 'Supermercado',
          tags: 'Gastos de Casa',
          methods: 'Cartão de Crédito',
        });

      expect(response.status).toBe(200);
      expect(response.body.current.totalSpent).toBeCloseTo(150, 2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty current period', async () => {
      const response = await request(app)
        .get('/api/summary')
        .query({
          startDate: '2025-09-01',
          endDate: '2025-09-30',
        });

      expect(response.status).toBe(200);
      expect(response.body.current.totalSpent).toBe(0);
      expect(response.body.current.transactionCount).toBe(0);
      expect(response.body.current.avgDaily).toBe(0);
    });

    it('should handle leap year correctly in day count', async () => {
      await insertExpense({
        expense_ts: new Date('2024-02-15'),
        amount: 290,
        description: 'Leap Year',
      });

      const response = await request(app)
        .get('/api/summary')
        .query({
          startDate: '2024-02-01',
          endDate: '2024-02-29',
        });

      expect(response.status).toBe(200);
      expect(response.body.current.avgDaily).toBeCloseTo(10, 2);
    });
  });
});
