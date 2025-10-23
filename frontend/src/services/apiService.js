/**
 * API Service
 *
 * Centralized module for all backend API calls.
 * All endpoints communicate with the Express backend at http://localhost:3001
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Builds query string from filter parameters.
 *
 * @param {Object} filters - Filter parameters
 * @returns {string} Query string
 */
const buildQueryString = (filters) => {
  const params = new URLSearchParams();

  if (filters.startDate) params.append('startDate', filters.startDate);
  if (filters.endDate) params.append('endDate', filters.endDate);
  if (filters.useInvoiceMonth) params.append('useInvoiceMonth', 'true');
  if (filters.invoiceYear) params.append('invoiceYear', filters.invoiceYear);
  if (filters.invoiceMonth) params.append('invoiceMonth', filters.invoiceMonth);
  if (filters.categories?.length > 0) params.append('categories', filters.categories.join(','));
  if (filters.tags?.length > 0) params.append('tags', filters.tags.join(','));
  if (filters.methods?.length > 0) params.append('methods', filters.methods.join(','));
  if (filters.search) params.append('search', filters.search);
  if (filters.groupBy) params.append('groupBy', filters.groupBy);

  return params.toString();
};

/**
 * Fetches filter metadata (categories, tags, date range, invoice months).
 *
 * @returns {Promise<Object>} Filter metadata
 */
export const getFilterMetadata = async () => {
  const response = await api.get('/api/filters/metadata');
  return response.data;
};

/**
 * Fetches filtered expenses.
 *
 * @param {Object} filters - Filter parameters
 * @returns {Promise<Object>} Expenses data
 */
export const getExpenses = async (filters) => {
  const queryString = buildQueryString(filters);
  const response = await api.get(`/api/expenses?${queryString}`);
  return response.data;
};

/**
 * Fetches summary statistics with MoM comparison.
 *
 * @param {Object} filters - Filter parameters
 * @returns {Promise<Object>} Summary data
 */
export const getSummary = async (filters) => {
  const queryString = buildQueryString(filters);
  const response = await api.get(`/api/summary?${queryString}`);
  return response.data;
};

/**
 * Fetches category spending breakdown.
 *
 * @param {Object} filters - Filter parameters
 * @returns {Promise<Object>} Category breakdown data
 */
export const getCategoryBreakdown = async (filters) => {
  const queryString = buildQueryString(filters);
  const response = await api.get(`/api/charts/category?${queryString}`);
  return response.data;
};

/**
 * Fetches tag spending breakdown.
 *
 * @param {Object} filters - Filter parameters
 * @returns {Promise<Object>} Tag breakdown data
 */
export const getTagBreakdown = async (filters) => {
  const queryString = buildQueryString(filters);
  const response = await api.get(`/api/charts/tag?${queryString}`);
  return response.data;
};

/**
 * Fetches Month-over-Month trend data.
 *
 * @param {Object} filters - Filter parameters (must include groupBy: 'category' or 'tag')
 * @returns {Promise<Object>} MoM trend data
 */
export const getMoMTrends = async (filters) => {
  const queryString = buildQueryString(filters);
  const response = await api.get(`/api/trends/mom?${queryString}`);
  return response.data;
};

/**
 * Fetches the monthly budget cap for the current invoice month.
 *
 * The cap is calculated dynamically based on business days, hourly rates,
 * and deductions configured in environment variables on the backend.
 *
 * @returns {Promise<Object>} Cap data { cap: number|null, applicable: boolean }
 */
export const getMonthlyCap = async () => {
  const response = await api.get('/api/cap');
  return response.data;
};

/**
 * Fetches the monthly budget cap for a specific invoice month.
 *
 * @param {number} year - Invoice year (e.g., 2025)
 * @param {number} month - Invoice month (1-12)
 * @returns {Promise<Object>} Cap data
 */
export const getMonthlyCapForPeriod = async (year, month) => {
  const response = await api.get(`/api/cap/${year}/${month}`);
  return response.data;
};

/**
 * Health check endpoint.
 *
 * @returns {Promise<Object>} Health status
 */
export const checkHealth = async () => {
  const response = await api.get('/api/health');
  return response.data;
};

export default api;
