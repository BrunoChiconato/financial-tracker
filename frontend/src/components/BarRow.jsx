/**
 * BarRow Component
 *
 * Displays a horizontal bar chart row for category or tag visualization.
 * Shows the label, a proportional filled bar, and the monetary value.
 *
 * @param {Object} props - Component properties
 * @param {string} props.label - Category or tag name
 * @param {number} props.value - Monetary value
 * @param {number} props.max - Maximum value for calculating bar width percentage
 * @returns {JSX.Element} Rendered bar row
 */
import { formatCurrency } from '../utils/formatters';

export function BarRow({ label, value, max }) {
  const pct = max > 0 ? (value / max) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
        <span className="text-xs text-slate-600 dark:text-slate-400">
          {formatCurrency(value)}
        </span>
      </div>
      <div className="h-6 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md overflow-hidden">
        <div className="h-full bg-slate-700 dark:bg-slate-400" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
