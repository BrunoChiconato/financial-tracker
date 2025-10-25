/**
 * TagChart Component
 *
 * Displays tag spending composition using a 100% stacked horizontal bar.
 * Shows each tag's proportional contribution to total spending with percentages.
 * Replaces the previous pie chart for better precision and accessibility.
 *
 * @param {Object} props - Component properties
 * @param {Array<Object>} props.data - Tag breakdown data from API
 * @returns {JSX.Element} Rendered tag composition chart
 */

import { SectionTitle } from './SectionTitle';
import { formatCurrency } from '../utils/formatters';

const TAG_COLORS = ['bg-slate-300', 'bg-slate-400', 'bg-slate-500', 'bg-slate-600', 'bg-slate-700'];

export function TagChart({ data }) {
  const tagData = data || [];
  const total = tagData.reduce((sum, tag) => sum + tag.amount, 0);

  const tagPercentages = tagData.map((item, index) => ({
    name: item.tag,
    value: item.amount,
    percentage: total > 0 ? (item.amount / total) * 100 : 0,
    colorClass: TAG_COLORS[index % TAG_COLORS.length],
  }));

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
      <SectionTitle title="Composição por Tag" />
      {tagPercentages.length > 0 && total > 0 ? (
        <>
          <div className="mt-6">
            <div className="h-8 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 flex">
              {tagPercentages.map((tag) => (
                <div
                  key={tag.name}
                  className={`h-full first:rounded-l-md last:rounded-r-md border-r border-white/60 dark:border-slate-900/60 flex items-center justify-center text-[11px] text-white font-medium ${tag.colorClass}`}
                  style={{ width: `${tag.percentage}%` }}
                  title={`${tag.name}: ${tag.percentage.toFixed(1)}%`}
                >
                  {tag.percentage >= 10 && (
                    <span className="px-1 truncate">
                      {tag.name} {tag.percentage.toFixed(1)}%
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {tagPercentages.map((tag) => (
              <div key={tag.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-sm ${tag.colorClass}`} />
                  <span className="text-slate-700 dark:text-slate-300">{tag.name}</span>
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  {formatCurrency(tag.value)} • {tag.percentage.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
          Nenhum dado disponível para o período selecionado
        </p>
      )}
    </div>
  );
}
