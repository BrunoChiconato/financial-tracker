/**
 * Integration Tests: /api/trends/mom
 *
 * Tests Month-over-Month comparison endpoint with focus on:
 * - Parameter index reuse for filter consistency (CRITICAL)
 * - Grouping by category vs tag
 * - Transition cycle MoM calculations
 * - Variation calculations (absolute and percentage)
 */

import request from 'supertest';
import app from '../index.js';
import { clearDatabase, insertExpense, insertMultipleExpenses, validateMoMTrendSchema } from './setup.js';

describe('GET /api/trends/mom', () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  describe('Response Schema', () => {
    it('should return correct schema for category grouping', async () => {
      await insertExpense({
        expense_ts: new Date('2025-09-10'),
        amount: 100,
        description: 'Test',
        category: 'Alimentação',
      });

      const response = await request(app)
        .get('/api/trends/mom')
        .query({
          startDate: '2025-09-01',
          endDate: '2025-09-30',
          groupBy: 'category',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('groupBy');
      expect(response.body.groupBy).toBe('category');
      expect(Array.isArray(response.body.data)).toBe(true);

      if (response.body.data.length > 0) {
        validateMoMTrendSchema(response.body.data[0], 'category');
      }
    });

    it('should return correct schema for tag grouping', async () => {
      await insertExpense({
        expense_ts: new Date('2025-09-10'),
        amount: 100,
        description: 'Test',
        tag: 'Gastos Pessoais',
      });

      const response = await request(app)
        .get('/api/trends/mom')
        .query({
          startDate: '2025-09-01',
          endDate: '2025-09-30',
          groupBy: 'tag',
        });

      expect(response.status).toBe(200);
      expect(response.body.groupBy).toBe('tag');

      if (response.body.data.length > 0) {
        validateMoMTrendSchema(response.body.data[0], 'tag');
      }
    });

    it('should default to category grouping when not specified', async () => {
      await insertExpense({
        expense_ts: new Date('2025-09-10'),
        amount: 100,
        description: 'Test',
      });

      const response = await request(app)
        .get('/api/trends/mom')
        .query({
          startDate: '2025-09-01',
          endDate: '2025-09-30',
        });

      expect(response.status).toBe(200);
      expect(response.body.groupBy).toBe('category');
    });
  });

  describe('Category Grouping', () => {
    beforeEach(async () => {
      await insertMultipleExpenses([
        {
          expense_ts: new Date('2025-08-10'),
          amount: 200,
          description: 'Prev Food',
          category: 'Alimentação',
        },
        {
          expense_ts: new Date('2025-08-15'),
          amount: 100,
          description: 'Prev Transport',
          category: 'Transporte',
        },
        {
          expense_ts: new Date('2025-09-10'),
          amount: 300,
          description: 'Curr Food',
          category: 'Alimentação',
        },
        {
          expense_ts: new Date('2025-09-15'),
          amount: 150,
          description: 'Curr Transport',
          category: 'Transporte',
        },
      ]);
    });

    it('should group expenses by category', async () => {
      const response = await request(app)
        .get('/api/trends/mom')
        .query({
          startDate: '2025-09-01',
          endDate: '2025-09-30',
          groupBy: 'category',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(2);

      const categories = response.body.data.map((item) => item.category);
      expect(categories).toContain('Alimentação');
      expect(categories).toContain('Transporte');
    });

    it('should calculate current and previous totals by category', async () => {
      const response = await request(app)
        .get('/api/trends/mom')
        .query({
          startDate: '2025-09-01',
          endDate: '2025-09-30',
          groupBy: 'category',
        });

      expect(response.status).toBe(200);

      const alimentacao = response.body.data.find((item) => item.category === 'Alimentação');
      expect(alimentacao.currentTotal).toBeCloseTo(300, 2);
      expect(alimentacao.previousTotal).toBeCloseTo(200, 2);

      const transporte = response.body.data.find((item) => item.category === 'Transporte');
      expect(transporte.currentTotal).toBeCloseTo(150, 2);
      expect(transporte.previousTotal).toBeCloseTo(100, 2);
    });

    it('should calculate variation amount correctly', async () => {
      const response = await request(app)
        .get('/api/trends/mom')
        .query({
          startDate: '2025-09-01',
          endDate: '2025-09-30',
          groupBy: 'category',
        });

      expect(response.status).toBe(200);

      const alimentacao = response.body.data.find((item) => item.category === 'Alimentação');
      expect(alimentacao.variationAmount).toBeCloseTo(100, 2);

      const transporte = response.body.data.find((item) => item.category === 'Transporte');
      expect(transporte.variationAmount).toBeCloseTo(50, 2);
    });

    it('should calculate variation percentage correctly', async () => {
      const response = await request(app)
        .get('/api/trends/mom')
        .query({
          startDate: '2025-09-01',
          endDate: '2025-09-30',
          groupBy: 'category',
        });

      expect(response.status).toBe(200);

      const alimentacao = response.body.data.find((item) => item.category === 'Alimentação');
      expect(alimentacao.variationPercentage).toBeCloseTo(50, 2);

      const transporte = response.body.data.find((item) => item.category === 'Transporte');
      expect(transporte.variationPercentage).toBeCloseTo(50, 2);
    });

    it('should sort categories by current total descending', async () => {
      const response = await request(app)
        .get('/api/trends/mom')
        .query({
          startDate: '2025-09-01',
          endDate: '2025-09-30',
          groupBy: 'category',
        });

      expect(response.status).toBe(200);
      expect(response.body.data[0].category).toBe('Alimentação');
      expect(response.body.data[1].category).toBe('Transporte');
    });
  });

  describe('Tag Grouping', () => {
    beforeEach(async () => {
      await insertMultipleExpenses([
        {
          expense_ts: new Date('2025-08-10'),
          amount: 400,
          description: 'Prev Personal',
          tag: 'Gastos Pessoais',
        },
        {
          expense_ts: new Date('2025-08-15'),
          amount: 200,
          description: 'Prev Couple',
          tag: 'Gastos do Casal',
        },
        {
          expense_ts: new Date('2025-09-10'),
          amount: 500,
          description: 'Curr Personal',
          tag: 'Gastos Pessoais',
        },
        {
          expense_ts: new Date('2025-09-15'),
          amount: 300,
          description: 'Curr Couple',
          tag: 'Gastos do Casal',
        },
      ]);
    });

    it('should group expenses by tag', async () => {
      const response = await request(app)
        .get('/api/trends/mom')
        .query({
          startDate: '2025-09-01',
          endDate: '2025-09-30',
          groupBy: 'tag',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(2);

      const tags = response.body.data.map((item) => item.tag);
      expect(tags).toContain('Gastos Pessoais');
      expect(tags).toContain('Gastos do Casal');
    });

    it('should calculate MoM by tag correctly', async () => {
      const response = await request(app)
        .get('/api/trends/mom')
        .query({
          startDate: '2025-09-01',
          endDate: '2025-09-30',
          groupBy: 'tag',
        });

      expect(response.status).toBe(200);

      const pessoais = response.body.data.find((item) => item.tag === 'Gastos Pessoais');
      expect(pessoais.currentTotal).toBeCloseTo(500, 2);
      expect(pessoais.previousTotal).toBeCloseTo(400, 2);
      expect(pessoais.variationPercentage).toBeCloseTo(25, 2);

      const casal = response.body.data.find((item) => item.tag === 'Gastos do Casal');
      expect(casal.currentTotal).toBeCloseTo(300, 2);
      expect(casal.previousTotal).toBeCloseTo(200, 2);
      expect(casal.variationPercentage).toBeCloseTo(50, 2);
    });
  });

  describe('Invoice Month Mode (Billing Cycle)', () => {
    it('should calculate MoM for old billing cycle', async () => {
      await insertMultipleExpenses([
        {
          expense_ts: new Date('2025-08-10'),
          amount: 300,
          description: 'Prev Food',
          category: 'Alimentação',
        },
        {
          expense_ts: new Date('2025-09-10'),
          amount: 450,
          description: 'Curr Food',
          category: 'Alimentação',
        },
      ]);

      const response = await request(app)
        .get('/api/trends/mom')
        .query({
          useInvoiceMonth: 'true',
          invoiceYear: '2025',
          invoiceMonth: '10',
          groupBy: 'category',
        });

      expect(response.status).toBe(200);

      const alimentacao = response.body.data.find((item) => item.category === 'Alimentação');
      expect(alimentacao.currentTotal).toBeCloseTo(450, 2);
      expect(alimentacao.previousTotal).toBeCloseTo(300, 2);
      expect(alimentacao.variationPercentage).toBeCloseTo(50, 2);
    });

    it('should handle transition cycle MoM (44-day vs 30-day)', async () => {
      await insertMultipleExpenses([
        {
          expense_ts: new Date('2025-09-15'),
          amount: 600,
          description: 'Prev Transport',
          category: 'Transporte',
        },
        {
          expense_ts: new Date('2025-10-20'),
          amount: 880,
          description: 'Curr Transport',
          category: 'Transporte',
        },
      ]);

      const response = await request(app)
        .get('/api/trends/mom')
        .query({
          useInvoiceMonth: 'true',
          invoiceYear: '2025',
          invoiceMonth: '11',
          groupBy: 'category',
        });

      expect(response.status).toBe(200);

      const transporte = response.body.data.find((item) => item.category === 'Transporte');
      expect(transporte.currentTotal).toBeCloseTo(880, 2);
      expect(transporte.previousTotal).toBeCloseTo(600, 2);
      expect(transporte.variationPercentage).toBeCloseTo(46.67, 1);
    });

    it('should calculate MoM for new billing cycle', async () => {
      await insertMultipleExpenses([
        {
          expense_ts: new Date('2025-10-20'),
          amount: 500,
          description: 'Prev Food',
          category: 'Alimentação',
        },
        {
          expense_ts: new Date('2025-11-25'),
          amount: 700,
          description: 'Curr Food',
          category: 'Alimentação',
        },
      ]);

      const response = await request(app)
        .get('/api/trends/mom')
        .query({
          useInvoiceMonth: 'true',
          invoiceYear: '2025',
          invoiceMonth: '12',
          groupBy: 'category',
        });

      expect(response.status).toBe(200);

      const alimentacao = response.body.data.find((item) => item.category === 'Alimentação');
      expect(alimentacao.currentTotal).toBeCloseTo(700, 2);
      expect(alimentacao.previousTotal).toBeCloseTo(500, 2);
      expect(alimentacao.variationPercentage).toBeCloseTo(40, 2);
    });
  });

  describe('Filter Application (CRITICAL: Parameter Index Reuse)', () => {
    beforeEach(async () => {
      await insertMultipleExpenses([
        {
          expense_ts: new Date('2025-08-10'),
          amount: 200,
          description: 'Prev Food Personal',
          category: 'Alimentação',
          tag: 'Gastos Pessoais',
          method: 'Pix',
        },
        {
          expense_ts: new Date('2025-08-15'),
          amount: 100,
          description: 'Prev Food Couple',
          category: 'Alimentação',
          tag: 'Gastos do Casal',
          method: 'Cartão de Crédito',
        },
        {
          expense_ts: new Date('2025-09-10'),
          amount: 300,
          description: 'Curr Food Personal',
          category: 'Alimentação',
          tag: 'Gastos Pessoais',
          method: 'Pix',
        },
        {
          expense_ts: new Date('2025-09-15'),
          amount: 150,
          description: 'Curr Food Couple',
          category: 'Alimentação',
          tag: 'Gastos do Casal',
          method: 'Cartão de Crédito',
        },
      ]);
    });

    it('should apply category filter to both periods using same parameter', async () => {
      const response = await request(app)
        .get('/api/trends/mom')
        .query({
          startDate: '2025-09-01',
          endDate: '2025-09-30',
          groupBy: 'tag',
          categories: 'Alimentação',
        });

      expect(response.status).toBe(200);

      response.body.data.forEach((item) => {
        expect(item).toBeDefined();
      });

      const pessoais = response.body.data.find((item) => item.tag === 'Gastos Pessoais');
      expect(pessoais.currentTotal).toBeCloseTo(300, 2);
      expect(pessoais.previousTotal).toBeCloseTo(200, 2);
    });

    it('should apply tag filter to both periods consistently', async () => {
      const response = await request(app)
        .get('/api/trends/mom')
        .query({
          startDate: '2025-09-01',
          endDate: '2025-09-30',
          groupBy: 'category',
          tags: 'Gastos Pessoais',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);

      const alimentacao = response.body.data[0];
      expect(alimentacao.category).toBe('Alimentação');
      expect(alimentacao.currentTotal).toBeCloseTo(300, 2);
      expect(alimentacao.previousTotal).toBeCloseTo(200, 2);
    });

    it('should apply method filter to both periods', async () => {
      const response = await request(app)
        .get('/api/trends/mom')
        .query({
          startDate: '2025-09-01',
          endDate: '2025-09-30',
          groupBy: 'tag',
          methods: 'Pix',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);

      const pessoais = response.body.data[0];
      expect(pessoais.tag).toBe('Gastos Pessoais');
      expect(pessoais.currentTotal).toBeCloseTo(300, 2);
      expect(pessoais.previousTotal).toBeCloseTo(200, 2);
    });

    it('should apply multiple filters consistently to both periods', async () => {
      const response = await request(app)
        .get('/api/trends/mom')
        .query({
          startDate: '2025-09-01',
          endDate: '2025-09-30',
          groupBy: 'category',
          categories: 'Alimentação',
          tags: 'Gastos do Casal',
          methods: 'Cartão de Crédito',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);

      const alimentacao = response.body.data[0];
      expect(alimentacao.currentTotal).toBeCloseTo(150, 2);
      expect(alimentacao.previousTotal).toBeCloseTo(100, 2);
    });
  });

  describe('Edge Cases', () => {
    it('should handle category appearing only in current period', async () => {
      await insertMultipleExpenses([
        {
          expense_ts: new Date('2025-08-10'),
          amount: 100,
          description: 'Prev Transport',
          category: 'Transporte',
        },
        {
          expense_ts: new Date('2025-09-10'),
          amount: 150,
          description: 'Curr Transport',
          category: 'Transporte',
        },
        {
          expense_ts: new Date('2025-09-15'),
          amount: 200,
          description: 'Curr Food',
          category: 'Alimentação',
        },
      ]);

      const response = await request(app)
        .get('/api/trends/mom')
        .query({
          startDate: '2025-09-01',
          endDate: '2025-09-30',
          groupBy: 'category',
        });

      expect(response.status).toBe(200);

      const alimentacao = response.body.data.find((item) => item.category === 'Alimentação');
      expect(alimentacao.currentTotal).toBeCloseTo(200, 2);
      expect(alimentacao.previousTotal).toBe(0);
      expect(alimentacao.variationPercentage).toBe(0);
    });

    it('should handle category appearing only in previous period', async () => {
      await insertMultipleExpenses([
        {
          expense_ts: new Date('2025-08-10'),
          amount: 300,
          description: 'Prev Food',
          category: 'Alimentação',
        },
        {
          expense_ts: new Date('2025-09-10'),
          amount: 150,
          description: 'Curr Transport',
          category: 'Transporte',
        },
      ]);

      const response = await request(app)
        .get('/api/trends/mom')
        .query({
          startDate: '2025-09-01',
          endDate: '2025-09-30',
          groupBy: 'category',
        });

      expect(response.status).toBe(200);

      const alimentacao = response.body.data.find((item) => item.category === 'Alimentação');
      expect(alimentacao.currentTotal).toBe(0);
      expect(alimentacao.previousTotal).toBeCloseTo(300, 2);
      expect(alimentacao.variationPercentage).toBeCloseTo(-100, 2);
    });

    it('should handle negative variation correctly', async () => {
      await insertMultipleExpenses([
        {
          expense_ts: new Date('2025-08-10'),
          amount: 1000,
          description: 'Prev Food',
          category: 'Alimentação',
        },
        {
          expense_ts: new Date('2025-09-10'),
          amount: 600,
          description: 'Curr Food',
          category: 'Alimentação',
        },
      ]);

      const response = await request(app)
        .get('/api/trends/mom')
        .query({
          startDate: '2025-09-01',
          endDate: '2025-09-30',
          groupBy: 'category',
        });

      expect(response.status).toBe(200);

      const alimentacao = response.body.data[0];
      expect(alimentacao.variationAmount).toBeCloseTo(-400, 2);
      expect(alimentacao.variationPercentage).toBeCloseTo(-40, 2);
    });

    it('should return empty array when no expenses in both periods', async () => {
      const response = await request(app)
        .get('/api/trends/mom')
        .query({
          startDate: '2025-09-01',
          endDate: '2025-09-30',
          groupBy: 'category',
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });
  });
});
