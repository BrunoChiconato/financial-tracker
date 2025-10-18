import { useState } from "react";

/**
 * FilterGroup Component
 *
 * A collapsible filter group with search functionality and checkboxes.
 * Used in the sidebar filters to organize categories, tags, and payment methods.
 *
 * @param {Object} props - Component properties
 * @param {string} props.title - Filter group title
 * @param {Array<string>} props.items - List of filter options
 * @param {Array<string>} props.selectedItems - Currently selected items
 * @param {Function} props.onToggle - Callback when an item is toggled
 * @param {Function} props.onSelectAll - Callback to select all items at once
 * @param {boolean} [props.defaultOpen=true] - Whether the group starts expanded
 * @returns {JSX.Element} Rendered filter group
 */
export function FilterGroup({ title, items, selectedItems, onToggle, onSelectAll, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredItems = items.filter((item) =>
    item.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleAll = () => {
    if (selectedItems.length === items.length) {
      onSelectAll([]);
    } else {
      onSelectAll(items);
    }
  };

  return (
    <div className="border dark:border-slate-700 rounded-lg">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <span className="font-medium text-slate-900 dark:text-slate-100">{title}</span>
        <span className="text-slate-500 dark:text-slate-400">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="px-3 pb-2">
          <div className="mb-2">
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-600 px-2 py-1 text-sm bg-white dark:bg-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
            />
          </div>
          <div className="mb-2">
            <button
              type="button"
              onClick={handleToggleAll}
              className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 underline"
            >
              {selectedItems.length === items.length ? "Desmarcar todos" : "Selecionar todos"}
            </button>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {filteredItems.map((item) => (
              <label key={item} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 p-1 rounded">
                <input
                  type="checkbox"
                  checked={selectedItems.includes(item)}
                  onChange={(e) => onToggle(item, e.target.checked)}
                  className="accent-slate-700 dark:accent-slate-500 cursor-pointer"
                />
                <span className="text-slate-900 dark:text-slate-100">{item}</span>
              </label>
            ))}
          </div>
          {filteredItems.length === 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-2">Nenhum item encontrado</p>
          )}
        </div>
      )}
    </div>
  );
}
