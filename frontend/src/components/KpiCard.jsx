/**
 * KpiCard Component
 *
 * Displays a key performance indicator with an icon, label, and value.
 * Used for highlighting important metrics like total spent, projections, and transaction counts.
 *
 * @param {Object} props - Component properties
 * @param {React.Component} props.icon - Lucide React icon component
 * @param {string} props.label - Metric label/description
 * @param {string} props.value - Metric value to display
 * @param {boolean} [props.subtle] - If true, applies slightly reduced opacity
 * @returns {JSX.Element} Rendered KPI card
 */
// eslint-disable-next-line no-unused-vars
export function KpiCard({ icon: Icon, label, value, subtle }) {
  return (
    <div
      className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 ${subtle ? 'opacity-95' : ''}`}
    >
      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
        <Icon className="h-5 w-5" />
        <span className="text-sm">{label}</span>
      </div>
      <div className="mt-2 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        {value}
      </div>
    </div>
  );
}
