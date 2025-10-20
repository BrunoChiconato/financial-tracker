/**
 * TrendsTable Component
 *
 * Displays Month-over-Month comparison table grouped by category or tag.
 * Shows current period, previous period, and variation (amount and percentage).
 * Uses icons to indicate increase/decrease trends instead of relying solely on color.
 *
 * @param {Object} props - Component properties
 * @param {Array<Object>} props.data - MoM trends data from API
 * @param {string} props.groupBy - Current grouping mode ('category' or 'tag')
 * @param {Function} props.setGroupBy - Function to change grouping mode
 * @returns {JSX.Element} Rendered trends table
 */

import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { SectionTitle } from './SectionTitle';
import { formatCurrency } from '../utils/formatters';

export function TrendsTable({ data, groupBy, setGroupBy }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
        <SectionTitle title="Resumo e Tendências (MoM)" />
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
          Nenhum dado disponível
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <SectionTitle title="Resumo e Tendências (MoM)" />
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-600 dark:text-slate-400">Analisar por:</span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setGroupBy('category')}
              className={`px-3 py-1 rounded-md transition-colors ${
                groupBy === 'category'
                  ? 'bg-slate-700 dark:bg-slate-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              Categoria
            </button>
            <button
              type="button"
              onClick={() => setGroupBy('tag')}
              className={`px-3 py-1 rounded-md transition-colors ${
                groupBy === 'tag'
                  ? 'bg-slate-700 dark:bg-slate-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              Tag
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto border dark:border-slate-700 rounded-lg">
        <table className="min-w-full text-sm">
          <thead className="text-left text-slate-600 dark:text-slate-400 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <tr>
              <th className="py-2 px-4">{groupBy === 'category' ? 'Categoria' : 'Tag'}</th>
              <th className="py-2 px-4 text-right">Total</th>
              <th className="py-2 px-4 text-right">Variação (R$)</th>
              <th className="py-2 px-4 text-right">Variação (%)</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => {
              const variationAmount = row.variationAmount;
              const absVariation = Math.abs(variationAmount);
              const absPercentage = Math.abs(row.variationPercentage);

              const isIncrease = variationAmount > 0;
              const isDecrease = variationAmount < 0;
              const isNoChange = variationAmount === 0;

              const variationColorClass = isNoChange
                ? 'text-slate-700 dark:text-slate-300'
                : isIncrease
                  ? 'text-red-700 dark:text-red-400'
                  : 'text-green-700 dark:text-green-400';

              return (
                <tr key={index} className="border-b dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="py-2 px-4 font-medium text-slate-900 dark:text-slate-100">
                    {row.category || row.tag}
                  </td>
                  <td className="py-2 px-4 text-right text-slate-900 dark:text-slate-100">
                    {formatCurrency(row.currentTotal)}
                  </td>
                  <td className={`py-2 px-4 text-right font-medium ${variationColorClass}`}>
                    <span className="inline-flex items-center gap-1">
                      {isIncrease ? (
                        <ArrowUpRight className="h-4 w-4" />
                      ) : isDecrease ? (
                        <ArrowDownRight className="h-4 w-4" />
                      ) : null}
                      {formatCurrency(absVariation)}
                    </span>
                  </td>
                  <td className={`py-2 px-4 text-right font-medium ${variationColorClass}`}>
                    {absPercentage > 0 ? `${absPercentage.toFixed(1)}%` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
