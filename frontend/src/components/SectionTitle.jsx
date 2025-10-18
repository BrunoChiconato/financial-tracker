/**
 * SectionTitle Component
 *
 * Provides consistent section headers throughout the dashboard.
 * Displays a main title with an optional descriptive subtitle.
 *
 * @param {Object} props - Component properties
 * @param {string} props.title - Main section title
 * @param {string} [props.subtitle] - Optional descriptive subtitle
 * @returns {JSX.Element} Rendered section title
 */
export function SectionTitle({ title, subtitle }) {
  return (
    <div>
      <h3 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      {subtitle && <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}
