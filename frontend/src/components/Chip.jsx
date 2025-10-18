/**
 * Chip Component
 *
 * A small badge/pill component used to display tags, categories, and payment methods.
 * Provides consistent styling across the application with neutral slate colors.
 *
 * @param {Object} props - Component properties
 * @param {React.ReactNode} props.children - Content to display inside the chip
 * @returns {JSX.Element} Rendered chip component
 */
export function Chip({ children }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-300 dark:border-slate-600 px-2 py-0.5 text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-700">
      {children}
    </span>
  );
}
