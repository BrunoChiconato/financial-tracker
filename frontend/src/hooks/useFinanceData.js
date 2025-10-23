/**
 * useFinanceData Hook
 *
 * Custom hook that manages all application state, filters, and data fetching.
 * This is the single source of truth for the dashboard's data.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getFilterMetadata,
  getExpenses,
  getSummary,
  getCategoryBreakdown,
  getTagBreakdown,
  getMoMTrends,
  getMonthlyCapForPeriod,
} from '../services/apiService';
import { formatDateISO } from '../utils/dates';
import { getCurrentInvoiceMonth } from '../utils/billingCycle';

export const useFinanceData = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [metadata, setMetadata] = useState({
    categories: [],
    tags: [],
    dateRange: { min: null, max: null },
    invoiceMonths: [],
  });

  const [filters, setFilters] = useState({
    useInvoiceMonth: true,
    invoiceYear: null,
    invoiceMonth: null,
    startDate: null,
    endDate: null,
    categories: [],
    tags: [],
    methods: [],
    search: '',
    groupBy: 'category',
  });

  const [data, setData] = useState({
    expenses: [],
    summary: null,
    categoryBreakdown: [],
    tagBreakdown: [],
    momTrends: [],
    cap: null,
  });

  /**
   * Fetches filter metadata on component mount.
   */
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setLoading(true);
        const meta = await getFilterMetadata();
        setMetadata(meta);

        const { invoiceYear, invoiceMonth } = getCurrentInvoiceMonth();

        setFilters((prev) => ({
          ...prev,
          invoiceYear,
          invoiceMonth,
          categories: meta.categories || [],
          tags: meta.tags || [],
        }));

        setError(null);
      } catch (err) {
        console.error('Error fetching metadata:', err);
        setError('Failed to load filter options');
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, []);

  /**
   * Fetches all dashboard data based on current filters.
   */
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const filterParams = {
        useInvoiceMonth: filters.useInvoiceMonth,
        invoiceYear: filters.invoiceYear,
        invoiceMonth: filters.invoiceMonth,
        startDate: filters.startDate ? formatDateISO(filters.startDate) : null,
        endDate: filters.endDate ? formatDateISO(filters.endDate) : null,
        categories: filters.categories,
        tags: filters.tags,
        methods: filters.methods,
        search: filters.search,
        groupBy: filters.groupBy,
      };

      const [expensesData, summaryData, categoryData, tagData, momData, capData] =
        await Promise.all([
          getExpenses(filterParams),
          getSummary(filterParams),
          getCategoryBreakdown(filterParams),
          getTagBreakdown(filterParams),
          getMoMTrends(filterParams),
          getMonthlyCapForPeriod(filters.invoiceYear, filters.invoiceMonth),
        ]);

      setData({
        expenses: expensesData.expenses || [],
        summary: summaryData,
        categoryBreakdown: categoryData.data || [],
        tagBreakdown: tagData.data || [],
        momTrends: momData.data || [],
        cap: capData.applicable ? capData.cap : null,
      });

      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  /**
   * Fetches data whenever filters change (except on initial mount).
   */
  useEffect(() => {
    if (filters.invoiceYear && filters.invoiceMonth) {
      fetchData();
    }
  }, [filters, fetchData]);

  /**
   * Updates filter values.
   *
   * @param {Object} newFilters - Partial filter object to merge
   */
  const updateFilters = (newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  /**
   * Toggles between invoice month and date range mode.
   */
  const toggleInvoiceMonthMode = () => {
    setFilters((prev) => ({ ...prev, useInvoiceMonth: !prev.useInvoiceMonth }));
  };

  /**
   * Sets the selected invoice month.
   *
   * @param {number} year - Invoice year
   * @param {number} month - Invoice month (1-12)
   */
  const setInvoiceMonth = (year, month) => {
    setFilters((prev) => ({
      ...prev,
      invoiceYear: year,
      invoiceMonth: month,
    }));
  };

  /**
   * Sets date range (for non-invoice month mode).
   *
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   */
  const setDateRange = (startDate, endDate) => {
    setFilters((prev) => ({
      ...prev,
      startDate,
      endDate,
    }));
  };

  /**
   * Sets selected categories.
   *
   * @param {Array<string>} categories - Selected category names
   */
  const setCategories = (categories) => {
    setFilters((prev) => ({ ...prev, categories }));
  };

  /**
   * Sets selected tags.
   *
   * @param {Array<string>} tags - Selected tag names
   */
  const setTags = (tags) => {
    setFilters((prev) => ({ ...prev, tags }));
  };

  /**
   * Sets selected methods.
   *
   * @param {Array<string>} methods - Selected payment method names
   */
  const setMethods = (methods) => {
    setFilters((prev) => ({ ...prev, methods }));
  };

  /**
   * Sets search term.
   *
   * @param {string} search - Search query
   */
  const setSearch = (search) => {
    setFilters((prev) => ({ ...prev, search }));
  };

  /**
   * Sets MoM grouping mode (category or tag).
   *
   * @param {string} groupBy - 'category' or 'tag'
   */
  const setGroupBy = (groupBy) => {
    setFilters((prev) => ({ ...prev, groupBy }));
  };

  return {
    loading,
    error,
    metadata,
    filters,
    data,
    updateFilters,
    toggleInvoiceMonthMode,
    setInvoiceMonth,
    setDateRange,
    setCategories,
    setTags,
    setMethods,
    setSearch,
    setGroupBy,
    refreshData: fetchData,
  };
};
