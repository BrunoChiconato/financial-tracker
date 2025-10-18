/**
 * App Component
 *
 * Main application component that orchestrates the entire dashboard.
 * Manages state through the useFinanceData hook and renders all UI components.
 * Uses Tailwind CSS for styling with a slate-based color scheme.
 */

import { useState, useLayoutEffect, useRef } from 'react';
import { Wallet, Filter } from 'lucide-react';
import { useFinanceData } from './hooks/useFinanceData';
import { HeroSection } from './components/HeroSection';
import { CategoryChart } from './components/CategoryChart';
import { TagChart } from './components/TagChart';
import { TrendsTable } from './components/TrendsTable';
import { TransactionsTable } from './components/TransactionsTable';
import { Filters } from './components/Filters';
import { DarkModeToggle } from './components/DarkModeToggle';

function App() {
  const [showFilters, setShowFilters] = useState(false);
  const scrollYRef = useRef(0);
  const shouldRestoreScrollRef = useRef(false);
  const previousDataRef = useRef(null);
  const {
    loading,
    error,
    metadata,
    filters,
    data,
    toggleInvoiceMonthMode,
    setInvoiceMonth,
    setDateRange,
    setCategories,
    setTags,
    setMethods,
    setSearch,
    setGroupBy,
  } = useFinanceData();

  const displayData = loading && previousDataRef.current ? previousDataRef.current : data;

  useLayoutEffect(() => {
    if (!loading) {
      previousDataRef.current = data;
      if (shouldRestoreScrollRef.current) {
        window.scrollTo(0, scrollYRef.current);
        shouldRestoreScrollRef.current = false;
      }
    }
  }, [loading, data]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6">
        <DarkModeToggle />
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 max-w-lg text-center">
          <h1 className="text-2xl font-semibold text-red-600 dark:text-red-400 mb-3">⚠️ Erro</h1>
          <p className="text-slate-700 dark:text-slate-300 mb-2">{error}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Verifique se o backend está rodando em http://localhost:3001
          </p>
        </div>
      </div>
    );
  }

  const currentMonth = metadata.invoiceMonths.find(
    (m) => m.year === filters.invoiceYear && m.month === filters.invoiceMonth
  );
  const monthLabel = currentMonth
    ? `${currentMonth.month.toString().padStart(2, '0')}/${currentMonth.year}`
    : '';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      <DarkModeToggle />
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-800/80 backdrop-blur border-b border-slate-200 dark:border-slate-700">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            <h1 className="text-lg font-semibold">Dashboard de Gastos</h1>
          </div>
          <div className="w-28">
            {loading && (
              <div className="text-sm text-slate-600 dark:text-slate-400">Carregando...</div>
            )}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <label className="text-sm">Mês: </label>
            <select
              className="rounded-md border-slate-300 dark:border-slate-600 text-sm px-2 py-1 bg-white dark:bg-slate-700 dark:text-slate-200 border focus:outline-none focus:ring-2 focus:ring-slate-400"
              value={monthLabel}
              onChange={(e) => {
                const [month, year] = e.target.value.split('/');
                setInvoiceMonth(parseInt(year), parseInt(month));
              }}
            >
              {metadata.invoiceMonths.map((m) => {
                const value = `${m.month.toString().padStart(2, '0')}/${m.year}`;
                return (
                  <option key={value} value={value}>
                    {value}
                  </option>
                );
              })}
            </select>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center gap-2 rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Filter className="h-4 w-4" /> Filtros
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6 space-y-6">
        {displayData.summary ? (
          <div className={`transition-opacity duration-150 ${loading ? 'opacity-50' : 'opacity-100'}`}>
            <HeroSection summary={displayData.summary} />

            <div className="grid grid-cols-12 gap-4 mt-6">
              <div className="col-span-12 lg:col-span-7">
                <CategoryChart data={displayData.categoryBreakdown} />
              </div>
              <div className="col-span-12 lg:col-span-5">
                <TagChart data={displayData.tagBreakdown} />
              </div>
            </div>

            <div className="grid grid-cols-12 gap-4 mt-6">
              <div className={`col-span-12 ${showFilters ? 'lg:col-span-8' : 'lg:col-span-12'}`}>
                <TrendsTable
                  data={displayData.momTrends}
                  groupBy={filters.groupBy}
                  setGroupBy={(groupBy) => {
                    scrollYRef.current = window.scrollY;
                    shouldRestoreScrollRef.current = true;
                    setGroupBy(groupBy);
                  }}
                />
              </div>
              {showFilters && (
                <div className="col-span-12 lg:col-span-4">
                  <Filters
                    metadata={metadata}
                    filters={filters}
                    setInvoiceMonth={setInvoiceMonth}
                    setDateRange={setDateRange}
                    setCategories={setCategories}
                    setTags={setTags}
                    setMethods={setMethods}
                    setSearch={setSearch}
                    toggleInvoiceMonthMode={toggleInvoiceMonthMode}
                  />
                </div>
              )}
            </div>

            <div className="mt-6">
              <TransactionsTable expenses={displayData.expenses} />
            </div>
          </div>
        ) : loading ? (
          <div className="text-center py-12 text-slate-600 dark:text-slate-400">
            Carregando dados...
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default App;
