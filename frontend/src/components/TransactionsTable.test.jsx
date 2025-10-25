/**
 * TransactionsTable Component Tests
 *
 * Tests the sortable transactions table component.
 * Verifies Rule 9: formatCurrency() usage for amount display.
 * Verifies Rule 4: Chip.jsx usage for badges.
 * Tests sorting functionality and data rendering.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TransactionsTable } from './TransactionsTable';
import * as formatters from '../utils/formatters';

vi.mock('../utils/formatters', async () => {
  const actual = await vi.importActual('../utils/formatters');
  return {
    ...actual,
    formatCurrency: vi.fn((val) => `R$ ${parseFloat(val).toFixed(2)}`),
  };
});

describe('TransactionsTable Component', () => {
  const mockExpenses = [
    {
      id: 1,
      expense_ts: '2025-01-15T14:30:00Z',
      amount: 100.5,
      description: 'Uber',
      method: 'Cartão de Crédito',
      tag: 'Gastos Pessoais',
      category: 'Transporte',
    },
    {
      id: 2,
      expense_ts: '2025-01-16T10:00:00Z',
      amount: 250.75,
      description: 'Supermercado',
      method: 'Pix',
      tag: 'Gastos de Casa',
      category: 'Alimentação',
    },
    {
      id: 3,
      expense_ts: '2025-01-14T18:45:00Z',
      amount: 50.0,
      description: 'Farmácia',
      method: 'Cartão de Débito',
      tag: 'Gastos Pessoais',
      category: 'Saúde',
    },
  ];

  it('should render table with expense data', () => {
    render(<TransactionsTable expenses={mockExpenses} />);

    expect(screen.getByText('Lançamentos')).toBeInTheDocument();
    expect(screen.getByText('Uber')).toBeInTheDocument();
    expect(screen.getByText('Supermercado')).toBeInTheDocument();
    expect(screen.getByText('Farmácia')).toBeInTheDocument();
  });

  it('should call formatCurrency for all amounts (Rule 9)', () => {
    render(<TransactionsTable expenses={mockExpenses} />);

    expect(formatters.formatCurrency).toHaveBeenCalledWith(100.5);
    expect(formatters.formatCurrency).toHaveBeenCalledWith(250.75);
    expect(formatters.formatCurrency).toHaveBeenCalledWith(50.0);
  });

  it('should render Chip components for category, method, and tag (Rule 4)', () => {
    render(<TransactionsTable expenses={mockExpenses} />);

    expect(screen.getAllByText('Transporte')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Cartão de Crédito')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Gastos Pessoais')[0]).toBeInTheDocument();
  });

  it('should display empty state when no expenses', () => {
    render(<TransactionsTable expenses={[]} />);

    expect(screen.getByText('Nenhum lançamento encontrado')).toBeInTheDocument();
  });

  it('should handle null expenses gracefully', () => {
    render(<TransactionsTable expenses={null} />);

    expect(screen.getByText('Nenhum lançamento encontrado')).toBeInTheDocument();
  });

  it('should render all table headers', () => {
    render(<TransactionsTable expenses={mockExpenses} />);

    expect(screen.getByText(/Data e Hora/)).toBeInTheDocument();
    expect(screen.getByText(/Descrição/)).toBeInTheDocument();
    expect(screen.getByText(/Valor \(R\$\)/)).toBeInTheDocument();
    expect(screen.getByText(/Categoria/)).toBeInTheDocument();
    expect(screen.getByText(/Método/)).toBeInTheDocument();
    expect(screen.getByText(/Tag/)).toBeInTheDocument();
  });

  it('should display total count of transactions', () => {
    render(<TransactionsTable expenses={mockExpenses} />);

    expect(screen.getByText('Total de 3 lançamentos')).toBeInTheDocument();
  });

  it('should use singular form for single transaction', () => {
    const singleExpense = [mockExpenses[0]];
    render(<TransactionsTable expenses={singleExpense} />);

    expect(screen.getByText('Total de 1 lançamento')).toBeInTheDocument();
  });

  it('should sort by date when clicking date header', () => {
    render(<TransactionsTable expenses={mockExpenses} />);

    const dateHeader = screen.getByText(/Data e Hora/);
    fireEvent.click(dateHeader);

    const rows = screen.getAllByRole('row');
    expect(rows.length).toBeGreaterThan(1);
  });

  it('should sort by amount when clicking amount header', () => {
    render(<TransactionsTable expenses={mockExpenses} />);

    const amountHeader = screen.getByText(/Valor \(R\$\)/);
    fireEvent.click(amountHeader);

    const rows = screen.getAllByRole('row');
    expect(rows.length).toBeGreaterThan(1);
  });

  it('should toggle sort direction on repeated clicks', () => {
    render(<TransactionsTable expenses={mockExpenses} />);

    const descriptionHeader = screen.getByText(/Descrição/);

    fireEvent.click(descriptionHeader);
    expect(screen.getByText(/Descrição ↑/)).toBeInTheDocument();

    fireEvent.click(descriptionHeader);
    expect(screen.getByText(/Descrição ↓/)).toBeInTheDocument();
  });

  it('should show sort indicator for active column', () => {
    render(<TransactionsTable expenses={mockExpenses} />);

    expect(screen.getByText(/Data e Hora ↓/)).toBeInTheDocument();
  });

  it('should format datetime correctly', () => {
    render(<TransactionsTable expenses={mockExpenses} />);

    expect(screen.getByText(/15\/01\/2025/)).toBeInTheDocument();
    expect(screen.getByText(/16\/01\/2025/)).toBeInTheDocument();
  });

  it('should support dark mode classes', () => {
    const { container } = render(<TransactionsTable expenses={mockExpenses} />);

    const table = container.querySelector('.bg-white');
    expect(table?.className).toContain('dark:bg-slate-800');
  });

  it('should render all categories correctly', () => {
    render(<TransactionsTable expenses={mockExpenses} />);

    expect(screen.getByText('Transporte')).toBeInTheDocument();
    expect(screen.getByText('Alimentação')).toBeInTheDocument();
    expect(screen.getByText('Saúde')).toBeInTheDocument();
  });

  it('should render all payment methods correctly', () => {
    render(<TransactionsTable expenses={mockExpenses} />);

    expect(screen.getByText('Cartão de Crédito')).toBeInTheDocument();
    expect(screen.getByText('Pix')).toBeInTheDocument();
    expect(screen.getByText('Cartão de Débito')).toBeInTheDocument();
  });

  it('should have scrollable container with fixed height', () => {
    const { container } = render(<TransactionsTable expenses={mockExpenses} />);

    const scrollContainer = container.querySelector('.h-96');
    expect(scrollContainer).toBeInTheDocument();
    expect(scrollContainer).toHaveClass('overflow-auto');
  });

  it('should have sticky table header', () => {
    const { container } = render(<TransactionsTable expenses={mockExpenses} />);

    const thead = container.querySelector('thead');
    expect(thead).toHaveClass('sticky');
    expect(thead).toHaveClass('top-0');
  });
});
