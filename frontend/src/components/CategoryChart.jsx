/**
 * CategoryChart Component
 *
 * Displays spending breakdown by category using horizontal bar chart.
 * Categories are sorted by value in descending order for easy comparison.
 * Uses BarRow component for consistent styling across the application.
 *
 * @param {Object} props - Component properties
 * @param {Array<Object>} props.data - Category breakdown data from API
 * @returns {JSX.Element} Rendered category chart
 */

import { SectionTitle } from './SectionTitle';
import { BarRow } from './BarRow';

export function CategoryChart({ data }) {
  const sortedData = [...(data || [])].sort((a, b) => b.amount - a.amount);
  const maxValue = sortedData.length > 0 ? sortedData[0].amount : 1;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
      <SectionTitle title="Gastos por Categoria" />
      <div className="mt-4 space-y-2">
        {sortedData.length > 0 ? (
          sortedData.map((item) => (
            <BarRow
              key={item.category}
              label={item.category}
              value={item.amount}
              max={maxValue}
            />
          ))
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
            Nenhum dado disponível para o período selecionado
          </p>
        )}
      </div>
    </div>
  );
}
