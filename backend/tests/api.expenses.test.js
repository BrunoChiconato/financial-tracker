/**
 * Integration Tests: /api/expenses
 *
 * Tests expense list endpoint with focus on:
 * - Parameter validation (startDate, endDate required)
 * - Filter application (categories, tags, methods, search)
 * - Installment expansion via recursive CTE
 * - Date range filtering
 */

import request from 'supertest';
import app from '../index.js';
import {
  clearDatabase,
  insertExpense,
  insertMultipleExpenses,
  testData,
  validateExpenseSchema,
} from './setup.js';

describe('GET /api/expenses', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe('Parameter Validation', () => {
    it('should return expenses with valid date range', async () => {
      await insertExpense({
        expense_ts: new Date('2025-09-10'),
        amount: 100,
        description: 'Test Expense',
      });

      const response = await request(app).get('/api/expenses').query({
        startDate: '2025-09-01',
        endDate: '2025-09-30',
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('expenses');
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.expenses)).toBe(true);
    });

    it('should filter expenses by date range correctly', async () => {
      await insertMultipleExpenses([
        {
          expense_ts: new Date('2025-08-15'),
          amount: 100,
          description: 'August Expense',
        },
        {
          expense_ts: new Date('2025-09-10'),
          amount: 200,
          description: 'September Expense',
        },
        {
          expense_ts: new Date('2025-10-05'),
          amount: 150,
          description: 'October Expense',
        },
      ]);

      const response = await request(app).get('/api/expenses').query({
        startDate: '2025-09-01',
        endDate: '2025-09-30',
      });

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(1);
      expect(response.body.expenses[0].description).toContain('September');
    });

    it('should use invoice month to determine date range', async () => {
      await insertExpense({
        expense_ts: new Date('2025-09-15'),
        amount: 100,
        description: 'Old Cycle Expense',
      });

      const response = await request(app).get('/api/expenses').query({
        useInvoiceMonth: 'true',
        invoiceYear: '2025',
        invoiceMonth: '10',
      });

      expect(response.status).toBe(200);
      expect(response.body.count).toBeGreaterThan(0);
    });
  });

  describe('Filter Application', () => {
    beforeEach(async () => {
      await insertMultipleExpenses([
        {
          expense_ts: new Date('2025-09-10'),
          amount: 100,
          description: 'Grocery',
          category: 'Supermercado',
          tag: 'Gastos de Casa',
          method: 'Cartão de Crédito',
        },
        {
          expense_ts: new Date('2025-09-11'),
          amount: 50,
          description: 'Uber',
          category: 'Transporte',
          tag: 'Gastos Pessoais',
          method: 'Pix',
        },
        {
          expense_ts: new Date('2025-09-12'),
          amount: 200,
          description: 'Restaurant',
          category: 'Alimentação',
          tag: 'Gastos do Casal',
          method: 'Cartão de Débito',
        },
      ]);
    });

    it('should filter by single category', async () => {
      const response = await request(app).get('/api/expenses').query({
        startDate: '2025-09-01',
        endDate: '2025-09-30',
        categories: 'Transporte',
      });

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(1);
      expect(response.body.expenses[0].category).toBe('Transporte');
    });

    it('should filter by multiple categories', async () => {
      const response = await request(app).get('/api/expenses').query({
        startDate: '2025-09-01',
        endDate: '2025-09-30',
        categories: 'Transporte,Supermercado',
      });

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(2);
    });

    it('should filter by single tag', async () => {
      const response = await request(app).get('/api/expenses').query({
        startDate: '2025-09-01',
        endDate: '2025-09-30',
        tags: 'Gastos Pessoais',
      });

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(1);
      expect(response.body.expenses[0].tag).toBe('Gastos Pessoais');
    });

    it('should filter by multiple tags', async () => {
      const response = await request(app).get('/api/expenses').query({
        startDate: '2025-09-01',
        endDate: '2025-09-30',
        tags: 'Gastos Pessoais,Gastos de Casa',
      });

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(2);
    });

    it('should filter by payment method', async () => {
      const response = await request(app).get('/api/expenses').query({
        startDate: '2025-09-01',
        endDate: '2025-09-30',
        methods: 'Pix',
      });

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(1);
      expect(response.body.expenses[0].method).toBe('Pix');
    });

    it('should filter by description search (case insensitive)', async () => {
      const response = await request(app).get('/api/expenses').query({
        startDate: '2025-09-01',
        endDate: '2025-09-30',
        search: 'uber',
      });

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(1);
      expect(response.body.expenses[0].description).toContain('Uber');
    });

    it('should combine multiple filters (category + tag + method)', async () => {
      const response = await request(app).get('/api/expenses').query({
        startDate: '2025-09-01',
        endDate: '2025-09-30',
        categories: 'Supermercado',
        tags: 'Gastos de Casa',
        methods: 'Cartão de Crédito',
      });

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(1);
      expect(response.body.expenses[0].description).toContain('Grocery');
    });

    it('should return empty array when no expenses match filters', async () => {
      const response = await request(app).get('/api/expenses').query({
        startDate: '2025-09-01',
        endDate: '2025-09-30',
        categories: 'Viagem',
      });

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(0);
      expect(response.body.expenses).toEqual([]);
    });
  });

  describe('Installment Expansion (Critical Business Logic)', () => {
    it('should expand 3-installment expense into 3 separate entries', async () => {
      await insertExpense({
        expense_ts: new Date('2025-09-10T10:00:00Z'),
        amount: 600,
        description: 'Laptop',
        installments: 3,
      });

      const response = await request(app).get('/api/expenses').query({
        startDate: '2025-09-01',
        endDate: '2025-12-31',
      });

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(3);

      response.body.expenses.forEach((expense) => {
        validateExpenseSchema(expense);
        expect(parseFloat(expense.amount)).toBeCloseTo(200, 2);
        expect(expense.description).toContain('Laptop');
        expect(expense.description).toMatch(/\(\d\/3\)/);
        expect(expense.installments).toBe(3);
      });
    });

    it('should correctly distribute installments across billing cycles', async () => {
      await insertExpense({
        expense_ts: new Date('2025-09-10T10:00:00Z'),
        amount: 300,
        description: 'Purchase',
        installments: 3,
      });

      const response = await request(app).get('/api/expenses').query({
        startDate: '2025-09-01',
        endDate: '2025-12-31',
      });

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(3);

      const installmentNumbers = response.body.expenses
        .map((e) => e.installment_number)
        .sort((a, b) => a - b);

      expect(installmentNumbers).toEqual([1, 2, 3]);
    });

    it('should handle transition cycle installment correctly (Oct 4 - Nov 16)', async () => {
      await insertExpense({
        expense_ts: new Date('2025-10-10T10:00:00Z'),
        amount: 450,
        description: 'Transition Purchase',
        installments: 3,
      });

      const response = await request(app).get('/api/expenses').query({
        startDate: '2025-10-01',
        endDate: '2026-01-31',
      });

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(3);

      response.body.expenses.forEach((expense) => {
        expect(parseFloat(expense.amount)).toBeCloseTo(150, 2);
      });
    });

    it('should not expand single-installment expenses', async () => {
      await insertExpense({
        expense_ts: new Date('2025-09-10'),
        amount: 100,
        description: 'Single Payment',
        installments: 1,
      });

      const response = await request(app).get('/api/expenses').query({
        startDate: '2025-09-01',
        endDate: '2025-09-30',
      });

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(1);
      expect(response.body.expenses[0].installment_number).toBe(1);
      expect(response.body.expenses[0].installments).toBe(1);
    });

    it('should filter installments by period_month, not original expense_ts', async () => {
      await insertExpense({
        expense_ts: new Date('2025-09-10T10:00:00Z'),
        amount: 600,
        description: 'Multi-Month Purchase',
        installments: 3,
      });

      const response = await request(app).get('/api/expenses').query({
        startDate: '2025-10-01',
        endDate: '2025-10-31',
      });

      expect(response.status).toBe(200);
      expect(response.body.count).toBeGreaterThan(0);
    });

    it('should handle large installment numbers correctly', async () => {
      await insertExpense({
        expense_ts: new Date('2025-01-10'),
        amount: 1200,
        description: 'Annual Subscription',
        installments: 12,
      });

      const response = await request(app).get('/api/expenses').query({
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      });

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(12);

      response.body.expenses.forEach((expense) => {
        expect(parseFloat(expense.amount)).toBeCloseTo(100, 2);
      });
    });
  });

  describe('Response Schema', () => {
    it('should return expenses with correct schema', async () => {
      await insertExpense({
        expense_ts: new Date('2025-09-10'),
        amount: 100,
        description: 'Test',
      });

      const response = await request(app).get('/api/expenses').query({
        startDate: '2025-09-01',
        endDate: '2025-09-30',
      });

      expect(response.status).toBe(200);
      expect(response.body.expenses.length).toBeGreaterThan(0);

      const expense = response.body.expenses[0];
      validateExpenseSchema(expense);
    });

    it('should sort expenses by date descending (newest first)', async () => {
      await insertMultipleExpenses([
        {
          expense_ts: new Date('2025-09-10T10:00:00Z'),
          amount: 100,
          description: 'First',
        },
        {
          expense_ts: new Date('2025-09-15T10:00:00Z'),
          amount: 200,
          description: 'Second',
        },
        {
          expense_ts: new Date('2025-09-05T10:00:00Z'),
          amount: 150,
          description: 'Third',
        },
      ]);

      const response = await request(app).get('/api/expenses').query({
        startDate: '2025-09-01',
        endDate: '2025-09-30',
      });

      expect(response.status).toBe(200);
      expect(response.body.expenses[0].description).toBe('Second');
      expect(response.body.expenses[2].description).toBe('Third');
    });
  });

  describe('Edge Cases', () => {
    it('should return empty array when no expenses in date range', async () => {
      await insertExpense({
        expense_ts: new Date('2025-08-10'),
        amount: 100,
        description: 'August Expense',
      });

      const response = await request(app).get('/api/expenses').query({
        startDate: '2025-09-01',
        endDate: '2025-09-30',
      });

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(0);
      expect(response.body.expenses).toEqual([]);
    });

    it('should handle expenses with null installments correctly', async () => {
      await insertExpense({
        expense_ts: new Date('2025-09-10'),
        amount: 100,
        description: 'No Installments',
        installments: null,
      });

      const response = await request(app).get('/api/expenses').query({
        startDate: '2025-09-01',
        endDate: '2025-09-30',
      });

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(1);
      expect(response.body.expenses[0].installment_number).toBe(1);
    });

    it('should handle same-day multiple expenses', async () => {
      const sameDate = new Date('2025-09-10T10:00:00Z');
      await insertMultipleExpenses([
        { expense_ts: sameDate, amount: 100, description: 'Expense 1' },
        { expense_ts: sameDate, amount: 200, description: 'Expense 2' },
        { expense_ts: sameDate, amount: 150, description: 'Expense 3' },
      ]);

      const response = await request(app).get('/api/expenses').query({
        startDate: '2025-09-01',
        endDate: '2025-09-30',
      });

      expect(response.status).toBe(200);
      expect(response.body.count).toBe(3);
    });
  });
});
