/**
 * Financial Tracker Backend API
 *
 * Express server providing RESTful endpoints for the Financial Tracker dashboard.
 * All data is fetched from PostgreSQL with complex billing cycle and installment logic.
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { query, testConnection } from './db.js';
import {
  getExpensesQuery,
  getSummaryQuery,
  getCategoryBreakdownQuery,
  getTagBreakdownQuery,
  getMoMTrendQuery,
  getFilterMetadataQuery,
} from './queries/installments.js';
import {
  billingCycleRange,
  generateInvoiceMonths,
  getPreviousPeriod,
  parseDateFilters,
} from './utils/billingCycle.js';
import { formatCurrency, calculateMoM } from './utils/formatters.js';
import { getCurrentMonthlyCap, calculateMonthlyCap } from './utils/capCalculation.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ],
  credentials: true,
}));

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    message: 'Financial Tracker API',
    version: '1.0.0',
    endpoints: [
      'GET /api/health',
      'GET /api/filters/metadata',
      'GET /api/expenses',
      'GET /api/summary',
      'GET /api/charts/category',
      'GET /api/charts/tag',
      'GET /api/trends/mom',
      'GET /api/cap',
      'GET /api/cap/:year/:month',
    ],
  });
});

/**
 * Health check endpoint
 */
app.get('/api/health', async (req, res) => {
  try {
    const isConnected = await testConnection();
    res.json({
      status: isConnected ? 'healthy' : 'unhealthy',
      database: isConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
    });
  }
});

/**
 * GET /api/filters/metadata
 *
 * Returns filter initialization data:
 * - Available categories
 * - Available tags
 * - Date range (min/max dates from database)
 * - Available invoice months
 */
app.get('/api/filters/metadata', async (req, res) => {
  try {
    const metadataQuery = getFilterMetadataQuery();
    const result = await query(metadataQuery.text, metadataQuery.values);

    if (result.rows.length === 0) {
      return res.json({
        categories: [],
        tags: [],
        dateRange: { min: null, max: null },
        invoiceMonths: [],
      });
    }

    const { categories, tags, min_date, max_date } = result.rows[0];

    const invoiceMonths = min_date && max_date
      ? generateInvoiceMonths(new Date(min_date), new Date(max_date))
      : [];

    res.json({
      categories: categories || [],
      tags: tags || [],
      dateRange: {
        min: min_date,
        max: max_date,
      },
      invoiceMonths,
    });
  } catch (error) {
    console.error('Error fetching filter metadata:', error);
    res.status(500).json({ error: 'Failed to fetch filter metadata' });
  }
});

/**
 * GET /api/expenses
 *
 * Returns filtered list of expenses with installment distribution.
 *
 * Query parameters:
 * - startDate: Start date (YYYY-MM-DD)
 * - endDate: End date (YYYY-MM-DD)
 * - useInvoiceMonth: Boolean flag
 * - invoiceYear: Invoice year (if useInvoiceMonth = true)
 * - invoiceMonth: Invoice month (1-12) (if useInvoiceMonth = true)
 * - categories: Comma-separated list of categories
 * - tags: Comma-separated list of tags
 * - search: Description search term
 */
app.get('/api/expenses', async (req, res) => {
  try {
    const { categories, tags, methods, search } = req.query;
    const { startDate, endDate } = parseDateFilters(req.query);

    const filters = {
      startDate,
      endDate,
      categories: categories ? categories.split(',') : [],
      tags: tags ? tags.split(',') : [],
      methods: methods ? methods.split(',') : [],
      search,
    };

    const expensesQuery = getExpensesQuery(filters);
    const result = await query(expensesQuery.text, expensesQuery.values);

    res.json({
      expenses: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

/**
 * GET /api/summary
 *
 * Returns summary statistics for the current and previous periods.
 *
 * Query parameters: same as /api/expenses
 *
 * Response:
 * - totalSpent: Total amount spent in current period
 * - avgDaily: Average daily spending
 * - transactionCount: Number of transactions
 * - mom: Month-over-Month comparison data
 */
app.get('/api/summary', async (req, res) => {
  try {
    const { categories, tags, methods, useInvoiceMonth } = req.query;
    const { startDate, endDate } = parseDateFilters(req.query);

    const categoriesArray = categories ? categories.split(',') : [];
    const tagsArray = tags ? tags.split(',') : [];
    const methodsArray = methods ? methods.split(',') : [];

    const currentSummaryQuery = getSummaryQuery(
      startDate,
      endDate,
      categoriesArray,
      tagsArray,
      methodsArray
    );
    const currentResult = await query(
      currentSummaryQuery.text,
      currentSummaryQuery.values
    );

    const currentData = currentResult.rows[0];
    const totalSpent = parseFloat(currentData.total_spent) || 0;
    const transactionCount = parseInt(currentData.transaction_count) || 0;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDuration = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const avgDaily = totalSpent / daysDuration;

    const previousPeriod = getPreviousPeriod(
      start,
      end,
      useInvoiceMonth === 'true'
    );

    const previousSummaryQuery = getSummaryQuery(
      previousPeriod.start.toISOString().split('T')[0],
      previousPeriod.end.toISOString().split('T')[0],
      categoriesArray,
      tagsArray,
      methodsArray
    );
    const previousResult = await query(
      previousSummaryQuery.text,
      previousSummaryQuery.values
    );

    const previousData = previousResult.rows[0];
    const previousTotalSpent = parseFloat(previousData.total_spent) || 0;

    const previousDaysDuration = Math.floor(
      (previousPeriod.end.getTime() - previousPeriod.start.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;
    const previousAvgDaily = previousTotalSpent / previousDaysDuration;

    const momTotal = calculateMoM(totalSpent, previousTotalSpent);
    const momAvgDaily = calculateMoM(avgDaily, previousAvgDaily);

    res.json({
      current: {
        totalSpent,
        avgDaily,
        transactionCount,
        period: { start: startDate, end: endDate },
      },
      previous: {
        totalSpent: previousTotalSpent,
        avgDaily: previousAvgDaily,
        period: {
          start: previousPeriod.start.toISOString().split('T')[0],
          end: previousPeriod.end.toISOString().split('T')[0],
        },
      },
      mom: {
        totalSpent: momTotal,
        avgDaily: momAvgDaily,
      },
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

/**
 * GET /api/charts/category
 *
 * Returns spending breakdown by category (top 10).
 */
app.get('/api/charts/category', async (req, res) => {
  try {
    const { categories, tags, methods } = req.query;
    const { startDate, endDate } = parseDateFilters(req.query);

    const categoriesArray = categories ? categories.split(',') : [];
    const tagsArray = tags ? tags.split(',') : [];
    const methodsArray = methods ? methods.split(',') : [];

    const categoryQuery = getCategoryBreakdownQuery(
      startDate,
      endDate,
      categoriesArray,
      tagsArray,
      methodsArray
    );
    const result = await query(categoryQuery.text, categoryQuery.values);

    const data = result.rows.map((row) => ({
      category: row.category,
      amount: parseFloat(row.total_amount),
      amountFormatted: formatCurrency(parseFloat(row.total_amount)),
    }));

    res.json({ data });
  } catch (error) {
    console.error('Error fetching category breakdown:', error);
    res.status(500).json({ error: 'Failed to fetch category breakdown' });
  }
});

/**
 * GET /api/charts/tag
 *
 * Returns spending breakdown by tag.
 */
app.get('/api/charts/tag', async (req, res) => {
  try {
    const { categories, tags, methods } = req.query;
    const { startDate, endDate } = parseDateFilters(req.query);

    const categoriesArray = categories ? categories.split(',') : [];
    const tagsArray = tags ? tags.split(',') : [];
    const methodsArray = methods ? methods.split(',') : [];

    const tagQuery = getTagBreakdownQuery(
      startDate,
      endDate,
      categoriesArray,
      tagsArray,
      methodsArray
    );
    const result = await query(tagQuery.text, tagQuery.values);

    const data = result.rows.map((row) => ({
      tag: row.tag,
      amount: parseFloat(row.total_amount),
      amountFormatted: formatCurrency(parseFloat(row.total_amount)),
    }));

    res.json({ data });
  } catch (error) {
    console.error('Error fetching tag breakdown:', error);
    res.status(500).json({ error: 'Failed to fetch tag breakdown' });
  }
});

/**
 * GET /api/trends/mom
 *
 * Returns Month-over-Month comparison by category or tag.
 *
 * Query parameter:
 * - groupBy: 'category' or 'tag'
 * - (plus all other filter parameters)
 */
app.get('/api/trends/mom', async (req, res) => {
  try {
    const { groupBy = 'category', categories, tags, methods, useInvoiceMonth } = req.query;
    const { startDate, endDate } = parseDateFilters(req.query);

    const start = new Date(startDate);
    const end = new Date(endDate);

    const previousPeriod = getPreviousPeriod(
      start,
      end,
      useInvoiceMonth === 'true'
    );

    const categoriesArray = categories ? categories.split(',') : [];
    const tagsArray = tags ? tags.split(',') : [];
    const methodsArray = methods ? methods.split(',') : [];

    const momQuery = getMoMTrendQuery(
      groupBy,
      startDate,
      endDate,
      previousPeriod.start.toISOString().split('T')[0],
      previousPeriod.end.toISOString().split('T')[0],
      categoriesArray,
      tagsArray,
      methodsArray
    );

    const result = await query(momQuery.text, momQuery.values);

    const data = result.rows.map((row) => ({
      [groupBy]: row[groupBy],
      currentTotal: parseFloat(row.current_total),
      previousTotal: parseFloat(row.previous_total),
      variationAmount: parseFloat(row.variation_amount),
      variationPercentage: parseFloat(row.variation_percentage),
    }));

    res.json({ data, groupBy });
  } catch (error) {
    console.error('Error fetching MoM trends:', error);
    res.status(500).json({ error: 'Failed to fetch MoM trends' });
  }
});

/**
 * GET /api/cap
 *
 * Returns the monthly budget cap for the current invoice month.
 *
 * The cap is calculated based on business days, hourly rate, and configurable
 * deductions. All sensitive parameters are stored in environment variables.
 *
 * Response:
 * - cap: The calculated monthly budget cap in BRL (or null if not applicable)
 * - applicable: Boolean indicating if cap should be displayed
 */
app.get('/api/cap', async (req, res) => {
  try {
    const capData = getCurrentMonthlyCap();

    res.json({
      ...capData,
      cap: capData ? parseFloat(capData.netCap) : null,
      applicable: capData !== null,
    });
  } catch (error) {
    console.error('Error calculating monthly cap:', error);
    res.status(500).json({ error: 'Failed to calculate monthly cap' });
  }
});

/**
 * GET /api/cap/:year/:month
 *
 * Returns the monthly budget cap for a specific invoice month.
 *
 * Path parameters:
 * - year: Invoice year (e.g., 2025)
 * - month: Invoice month (1-12)
 *
 * Response:
 * - cap: The calculated monthly budget cap in BRL (or null if not applicable)
 * - applicable: Boolean indicating if cap should be displayed
 * - invoiceYear: The invoice year
 * - invoiceMonth: The invoice month
 */
app.get('/api/cap/:year/:month', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const month = parseInt(req.params.month);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({
        error: 'Invalid year or month. Month must be between 1 and 12.',
      });
    }

    const capData = calculateMonthlyCap(year, month);

    res.json({
      ...capData,
      cap: capData ? parseFloat(capData.netCap) : null,
      applicable: capData !== null,
      invoiceYear: year,
      invoiceMonth: month,
    });
  } catch (error) {
    console.error('Error calculating monthly cap:', error);
    res.status(500).json({ error: 'Failed to calculate monthly cap' });
  }
});

const server = app.listen(PORT, async () => {
  console.log(`\n🚀 Financial Tracker API running on port ${PORT}`);
  console.log(`📍 API URL: http://localhost:${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/api/health\n`);

  await testConnection();
});

export default app;
