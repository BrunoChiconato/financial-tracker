/**
 * Filters Component
 *
 * Provides all filter controls for the dashboard using collapsible FilterGroup components.
 * Includes category, tag, and method filters with search functionality.
 * The date/month selection is handled in the main header, so this focuses on
 * content filtering.
 *
 * @param {Object} props - Component properties
 * @param {Object} props.metadata - Available filter options (categories, tags, methods)
 * @param {Object} props.filters - Current filter state
 * @param {Function} props.setCategories - Update selected categories
 * @param {Function} props.setTags - Update selected tags
 * @param {Function} props.setSearch - Update search term
 * @returns {JSX.Element} Rendered filters sidebar
 */

import { useState, useEffect, useRef } from 'react';
import { SectionTitle } from './SectionTitle';
import { FilterGroup } from './FilterGroup';

export function Filters({ metadata, filters, setCategories, setTags, setMethods, setSearch }) {
  const [localSearch, setLocalSearch] = useState(filters.search || '');
  const debounceTimerRef = useRef(null);
  useEffect(() => {
    setLocalSearch(filters.search || '');
  }, [filters.search]);

  const handleSearchInput = (e) => {
    const value = e.target.value;
    setLocalSearch(value);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setSearch(value);
    }, 300);
  };

  const handleCategoryToggle = (category, checked) => {
    const newCategories = checked
      ? [...filters.categories, category]
      : filters.categories.filter((c) => c !== category);
    setCategories(newCategories);
  };

  const handleTagToggle = (tag, checked) => {
    const newTags = checked ? [...filters.tags, tag] : filters.tags.filter((t) => t !== tag);
    setTags(newTags);
  };

  const handleMethodToggle = (method, checked) => {
    const newMethods = checked
      ? [...filters.methods, method]
      : filters.methods.filter((m) => m !== method);
    setMethods(newMethods);
  };

  const paymentMethods = ['Cartão de Crédito', 'Pix', 'Cartão de Débito', 'Boleto'];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
      <SectionTitle title="Filtros" />

      <div className="mt-4 space-y-3">
        <FilterGroup
          title="Categorias"
          items={metadata.categories || []}
          selectedItems={filters.categories || []}
          onToggle={handleCategoryToggle}
          onSelectAll={setCategories}
        />
        <FilterGroup
          title="Tags"
          items={metadata.tags || []}
          selectedItems={filters.tags || []}
          onToggle={handleTagToggle}
          onSelectAll={setTags}
        />
        <FilterGroup
          title="Método"
          items={paymentMethods}
          selectedItems={filters.methods || []}
          onToggle={handleMethodToggle}
          onSelectAll={setMethods}
        />
      </div>

      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Buscar na Descrição
        </label>
        <input
          type="text"
          placeholder="Digite para buscar..."
          value={localSearch}
          onChange={handleSearchInput}
          className="mt-2 w-full rounded-md border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
        />
      </div>
    </div>
  );
}
