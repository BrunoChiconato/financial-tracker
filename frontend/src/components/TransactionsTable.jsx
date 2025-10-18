/**
 * TransactionsTable Component
 *
 * Displays a detailed, sortable table of all filtered transactions.
 * Features sticky header, fixed height scrollable container, and chip-based badges.
 * Shows expense date/time, amount, description, category, method, tag, and installment info.
 *
 * @param {Object} props - Component properties
 * @param {Array<Object>} props.expenses - List of expense transactions from API
 * @returns {JSX.Element} Rendered transactions table
 */

import { useState } from 'react';
import { SectionTitle } from './SectionTitle';
import { Chip } from './Chip';

export function TransactionsTable({ expenses }) {
  const [sortConfig, setSortConfig] = useState({
    key: 'expense_ts',
    direction: 'desc',
  });

  if (!expenses || expenses.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
        <SectionTitle title="Lançamentos" />
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
          Nenhum lançamento encontrado
        </p>
      </div>
    );
  }

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedExpenses = [...expenses].sort((a, b) => {
    const aValue = a[sortConfig.key];
    const bValue = b[sortConfig.key];

    if (aValue === bValue) return 0;

    const comparison = aValue < bValue ? -1 : 1;
    return sortConfig.direction === 'asc' ? comparison : -comparison;
  });

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return '↕';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
      <SectionTitle title="Lançamentos" />

      <div className="mt-3 border dark:border-slate-700 rounded-lg overflow-hidden">
        <div className="h-96 overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="sticky top-0 bg-white dark:bg-slate-800 border-b dark:border-slate-700 text-slate-600 dark:text-slate-400 z-10">
              <tr>
                <th
                  onClick={() => handleSort('expense_ts')}
                  className="py-2 px-3 text-left w-[160px] cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Data e Hora {getSortIcon('expense_ts')}
                </th>
                <th
                  onClick={() => handleSort('description')}
                  className="py-2 px-3 text-left cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Descrição {getSortIcon('description')}
                </th>
                <th
                  onClick={() => handleSort('amount')}
                  className="py-2 px-3 text-right w-[120px] cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Valor (R$) {getSortIcon('amount')}
                </th>
                <th
                  onClick={() => handleSort('category')}
                  className="py-2 px-3 text-left w-[140px] cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Categoria {getSortIcon('category')}
                </th>
                <th
                  onClick={() => handleSort('method')}
                  className="py-2 px-3 text-left w-[140px] cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Método {getSortIcon('method')}
                </th>
                <th
                  onClick={() => handleSort('tag')}
                  className="py-2 px-3 text-left w-[140px] cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Tag {getSortIcon('tag')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedExpenses.map((expense, index) => (
                <tr key={`${expense.id}-${index}`} className="border-b dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                  <td className="py-2 px-3 whitespace-nowrap font-mono text-xs text-slate-900 dark:text-slate-300">
                    {formatDateTime(expense.expense_ts)}
                  </td>
                  <td className="py-2 px-3 text-slate-900 dark:text-slate-100">{expense.description}</td>
                  <td className="py-2 px-3 text-right font-medium text-slate-900 dark:text-slate-100">
                    {parseFloat(expense.amount).toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </td>
                  <td className="py-2 px-3">
                    <Chip>{expense.category}</Chip>
                  </td>
                  <td className="py-2 px-3">
                    <Chip>{expense.method}</Chip>
                  </td>
                  <td className="py-2 px-3">
                    <Chip>{expense.tag}</Chip>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 text-xs text-slate-600 dark:text-slate-400">
        Total de {expenses.length} lançamento{expenses.length !== 1 ? 's' : ''}
      </div>
    </div>
  );
}
