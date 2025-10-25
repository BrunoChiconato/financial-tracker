/**
 * Test Setup and Utilities
 *
 * Provides helper functions for database setup, teardown, and test data creation.
 * All tests use a real PostgreSQL database to validate complex SQL logic.
 */

import { query, getClient } from '../db.js';

/**
 * Clears all data from the expenses table.
 * Used in beforeEach to ensure clean test state.
 */
export async function clearDatabase() {
  await query('DELETE FROM public.expenses');
  await query('ALTER SEQUENCE expenses_id_seq RESTART WITH 1');
}

/**
 * Inserts a test expense into the database.
 *
 * @param {Object} expense - Expense data
 * @param {Date} expense.expense_ts - Expense timestamp
 * @param {number} expense.amount - Amount
 * @param {string} expense.description - Description
 * @param {string} expense.method - Payment method
 * @param {string} expense.tag - Tag
 * @param {string} expense.category - Category
 * @param {number} expense.installments - Installments (optional)
 * @returns {Promise<Object>} Inserted expense with ID
 */
export async function insertExpense({
  expense_ts = new Date(),
  amount,
  description,
  method = 'Pix',
  tag = 'Gastos Pessoais',
  category = 'Outros',
  installments = null,
}) {
  const result = await query(
    `INSERT INTO public.expenses
     (expense_ts, amount, description, method, tag, category, installments)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [expense_ts, amount, description, method, tag, category, installments]
  );

  return result.rows[0];
}

/**
 * Creates multiple test expenses for a date range.
 *
 * @param {Array<Object>} expenses - Array of expense objects
 * @returns {Promise<Array<Object>>} Inserted expenses
 */
export async function insertMultipleExpenses(expenses) {
  const results = [];
  for (const expense of expenses) {
    const result = await insertExpense(expense);
    results.push(result);
  }
  return results;
}

/**
 * Sample test data for common scenarios.
 */
export const testData = {
  oldCycleExpenses: [
    {
      expense_ts: new Date('2025-09-05T10:00:00Z'),
      amount: 100.5,
      description: 'Grocery Shopping',
      method: 'Cartão de Crédito',
      tag: 'Gastos de Casa',
      category: 'Supermercado',
    },
    {
      expense_ts: new Date('2025-09-15T14:30:00Z'),
      amount: 50.0,
      description: 'Uber Ride',
      method: 'Pix',
      tag: 'Gastos Pessoais',
      category: 'Transporte',
    },
  ],

  transitionCycleExpenses: [
    {
      expense_ts: new Date('2025-10-10T09:00:00Z'),
      amount: 200.0,
      description: 'Restaurant',
      method: 'Cartão de Débito',
      tag: 'Gastos do Casal',
      category: 'Alimentação',
    },
    {
      expense_ts: new Date('2025-11-05T16:00:00Z'),
      amount: 150.75,
      description: 'Pharmacy',
      method: 'Pix',
      tag: 'Gastos Pessoais',
      category: 'Saúde',
    },
  ],

  newCycleExpenses: [
    {
      expense_ts: new Date('2025-11-20T11:00:00Z'),
      amount: 300.0,
      description: 'Electronics',
      method: 'Cartão de Crédito',
      tag: 'Gastos Pessoais',
      category: 'Eletrônicos',
    },
    {
      expense_ts: new Date('2025-12-10T13:00:00Z'),
      amount: 80.25,
      description: 'Gas Station',
      method: 'Pix',
      tag: 'Gastos Pessoais',
      category: 'Transporte',
    },
  ],

  installmentExpense: {
    expense_ts: new Date('2025-09-10T10:00:00Z'),
    amount: 600.0,
    description: 'Laptop',
    method: 'Cartão de Crédito',
    tag: 'Gastos Pessoais',
    category: 'Eletrônicos',
    installments: 3,
  },
};

/**
 * Validates expense response schema.
 *
 * @param {Object} expense - Expense object to validate
 */
export function validateExpenseSchema(expense) {
  expect(expense).toHaveProperty('id');
  expect(expense).toHaveProperty('expense_ts');
  expect(expense).toHaveProperty('amount');
  expect(expense).toHaveProperty('description');
  expect(expense).toHaveProperty('method');
  expect(expense).toHaveProperty('tag');
  expect(expense).toHaveProperty('category');
  expect(expense).toHaveProperty('installment_number');
  expect(expense).toHaveProperty('installments');
}

/**
 * Validates summary response schema.
 *
 * @param {Object} summary - Summary object to validate
 */
export function validateSummarySchema(summary) {
  expect(summary).toHaveProperty('current');
  expect(summary.current).toHaveProperty('totalSpent');
  expect(summary.current).toHaveProperty('avgDaily');
  expect(summary.current).toHaveProperty('transactionCount');

  expect(summary).toHaveProperty('previous');
  expect(summary.previous).toHaveProperty('totalSpent');
  expect(summary.previous).toHaveProperty('avgDaily');

  expect(summary).toHaveProperty('mom');
  expect(summary.mom).toHaveProperty('totalSpent');
  expect(summary.mom).toHaveProperty('avgDaily');
}

/**
 * Validates MoM trend item schema.
 *
 * @param {Object} item - Trend item to validate
 * @param {string} groupBy - 'category' or 'tag'
 */
export function validateMoMTrendSchema(item, groupBy) {
  expect(item).toHaveProperty(groupBy);
  expect(item).toHaveProperty('currentTotal');
  expect(item).toHaveProperty('previousTotal');
  expect(item).toHaveProperty('variationAmount');
  expect(item).toHaveProperty('variationPercentage');
}
