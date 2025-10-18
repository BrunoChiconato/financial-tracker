/**
 * DarkModeToggle Component
 *
 * A button that toggles between light and dark modes.
 * Uses sun and moon icons to indicate the current mode.
 * Positioned as a floating button in the top-right corner.
 *
 * @returns {JSX.Element} Rendered toggle button
 */

import { Sun, Moon } from 'lucide-react';
import { useDarkMode } from '../context/DarkModeContext';

export function DarkModeToggle() {
  const { isDarkMode, toggleDarkMode } = useDarkMode();

  return (
    <button
      type="button"
      onClick={toggleDarkMode}
      className="fixed top-4 right-4 z-50 p-3 rounded-full bg-slate-700 dark:bg-slate-800 border border-slate-600 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDarkMode ? (
        <Sun className="h-5 w-5 text-yellow-400" />
      ) : (
        <Moon className="h-5 w-5 text-white" />
      )}
    </button>
  );
}
