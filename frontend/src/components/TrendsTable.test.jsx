/**
 * TrendsTable Component Tests
 *
 * Tests the Month-over-Month comparison table component.
 * Verifies Rule 9: formatCurrency() usage for all monetary values.
 * Tests grouping toggle, variation indicators, and color-coding.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrendsTable } from './TrendsTable';
import * as formatters from '../utils/formatters';

vi.mock('../utils/formatters', async () => {
  const actual = await vi.importActual('../utils/formatters');
  return {
    ...actual,
    formatCurrency: vi.fn((val) => `R$ ${parseFloat(val).toFixed(2)}`),
  };
});

describe('TrendsTable Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCategoryData = [
    {
      category: 'Alimentação',
      currentTotal: 500,
      previousTotal: 400,
      variationAmount: 100,
      variationPercentage: 25.0,
    },
    {
      category: 'Transporte',
      currentTotal: 200,
      previousTotal: 250,
      variationAmount: -50,
      variationPercentage: -20.0,
    },
    {
      category: 'Saúde',
      currentTotal: 150,
      previousTotal: 150,
      variationAmount: 0,
      variationPercentage: 0,
    },
  ];

  const mockTagData = [
    {
      tag: 'Gastos Pessoais',
      currentTotal: 600,
      previousTotal: 500,
      variationAmount: 100,
      variationPercentage: 20.0,
    },
    {
      tag: 'Gastos do Casal',
      currentTotal: 300,
      previousTotal: 350,
      variationAmount: -50,
      variationPercentage: -14.3,
    },
  ];

  const mockSetGroupBy = vi.fn();

  it('should render section title', () => {
    render(<TrendsTable data={mockCategoryData} groupBy="category" setGroupBy={mockSetGroupBy} />);

    expect(screen.getByText('Resumo e Tendências (MoM)')).toBeInTheDocument();
  });

  it('should call formatCurrency for all monetary values (Rule 9)', () => {
    render(<TrendsTable data={mockCategoryData} groupBy="category" setGroupBy={mockSetGroupBy} />);

    expect(formatters.formatCurrency).toHaveBeenCalledWith(500);
    expect(formatters.formatCurrency).toHaveBeenCalledWith(200);
    expect(formatters.formatCurrency).toHaveBeenCalledWith(150);

    expect(formatters.formatCurrency).toHaveBeenCalledWith(100);
    expect(formatters.formatCurrency).toHaveBeenCalledWith(50);
    expect(formatters.formatCurrency).toHaveBeenCalledWith(0);
  });

  it('should display all categories in category mode', () => {
    render(<TrendsTable data={mockCategoryData} groupBy="category" setGroupBy={mockSetGroupBy} />);

    expect(screen.getByText('Alimentação')).toBeInTheDocument();
    expect(screen.getByText('Transporte')).toBeInTheDocument();
    expect(screen.getByText('Saúde')).toBeInTheDocument();
  });

  it('should display all tags in tag mode', () => {
    render(<TrendsTable data={mockTagData} groupBy="tag" setGroupBy={mockSetGroupBy} />);

    expect(screen.getByText('Gastos Pessoais')).toBeInTheDocument();
    expect(screen.getByText('Gastos do Casal')).toBeInTheDocument();
  });

  it('should show "Categoria" header when groupBy is category', () => {
    render(<TrendsTable data={mockCategoryData} groupBy="category" setGroupBy={mockSetGroupBy} />);

    expect(screen.getAllByText('Categoria')[0]).toBeInTheDocument();
  });

  it('should show "Tag" header when groupBy is tag', () => {
    render(<TrendsTable data={mockTagData} groupBy="tag" setGroupBy={mockSetGroupBy} />);

    expect(screen.getAllByText('Tag')[0]).toBeInTheDocument();
  });

  it('should render grouping toggle buttons', () => {
    render(<TrendsTable data={mockCategoryData} groupBy="category" setGroupBy={mockSetGroupBy} />);

    const categoryButton = screen.getByRole('button', { name: 'Categoria' });
    const tagButton = screen.getByRole('button', { name: 'Tag' });

    expect(categoryButton).toBeInTheDocument();
    expect(tagButton).toBeInTheDocument();
  });

  it('should highlight active grouping button', () => {
    render(<TrendsTable data={mockCategoryData} groupBy="category" setGroupBy={mockSetGroupBy} />);

    const categoryButton = screen.getByRole('button', { name: 'Categoria' });
    expect(categoryButton).toHaveClass('bg-slate-700');
  });

  it('should call setGroupBy when clicking category button', () => {
    render(<TrendsTable data={mockTagData} groupBy="tag" setGroupBy={mockSetGroupBy} />);

    const categoryButton = screen.getByRole('button', { name: 'Categoria' });
    fireEvent.click(categoryButton);

    expect(mockSetGroupBy).toHaveBeenCalledWith('category');
  });

  it('should call setGroupBy when clicking tag button', () => {
    render(<TrendsTable data={mockCategoryData} groupBy="category" setGroupBy={mockSetGroupBy} />);

    const tagButton = screen.getByRole('button', { name: 'Tag' });
    fireEvent.click(tagButton);

    expect(mockSetGroupBy).toHaveBeenCalledWith('tag');
  });

  it('should display variation percentages with 1 decimal place', () => {
    render(<TrendsTable data={mockCategoryData} groupBy="category" setGroupBy={mockSetGroupBy} />);

    expect(screen.getByText('25.0%')).toBeInTheDocument();
    expect(screen.getByText('20.0%')).toBeInTheDocument();
  });

  it('should show up arrow for positive variation (increase)', () => {
    const { container } = render(
      <TrendsTable data={mockCategoryData} groupBy="category" setGroupBy={mockSetGroupBy} />
    );

    const upArrows = container.querySelectorAll('.lucide-arrow-up-right');
    expect(upArrows.length).toBeGreaterThan(0);
  });

  it('should show down arrow for negative variation (decrease)', () => {
    const { container } = render(
      <TrendsTable data={mockCategoryData} groupBy="category" setGroupBy={mockSetGroupBy} />
    );

    const downArrows = container.querySelectorAll('.lucide-arrow-down-right');
    expect(downArrows.length).toBeGreaterThan(0);
  });

  it('should show no arrow for zero variation', () => {
    render(<TrendsTable data={mockCategoryData} groupBy="category" setGroupBy={mockSetGroupBy} />);

    const healthRow = screen.getByText('Saúde').closest('tr');
    const arrows = healthRow.querySelectorAll('.lucide');
    expect(arrows.length).toBe(0);
  });

  it('should apply red styling for positive variation (spending increased)', () => {
    const { container } = render(
      <TrendsTable data={mockCategoryData} groupBy="category" setGroupBy={mockSetGroupBy} />
    );

    const redText = container.querySelector('.text-red-700');
    expect(redText).toBeInTheDocument();
  });

  it('should apply green styling for negative variation (spending decreased)', () => {
    const { container } = render(
      <TrendsTable data={mockCategoryData} groupBy="category" setGroupBy={mockSetGroupBy} />
    );

    const greenText = container.querySelector('.text-green-700');
    expect(greenText).toBeInTheDocument();
  });

  it('should apply neutral styling for zero variation', () => {
    render(<TrendsTable data={mockCategoryData} groupBy="category" setGroupBy={mockSetGroupBy} />);

    const healthRow = screen.getByText('Saúde').closest('tr');
    const neutralText = healthRow.querySelector('.text-slate-700');
    expect(neutralText).toBeInTheDocument();
  });

  it('should display empty state when no data', () => {
    render(<TrendsTable data={[]} groupBy="category" setGroupBy={mockSetGroupBy} />);

    expect(screen.getByText('Nenhum dado disponível')).toBeInTheDocument();
  });

  it('should handle null data gracefully', () => {
    render(<TrendsTable data={null} groupBy="category" setGroupBy={mockSetGroupBy} />);

    expect(screen.getByText('Nenhum dado disponível')).toBeInTheDocument();
  });

  it('should handle undefined data gracefully', () => {
    render(<TrendsTable groupBy="category" setGroupBy={mockSetGroupBy} />);

    expect(screen.getByText('Nenhum dado disponível')).toBeInTheDocument();
  });

  it('should render all table headers', () => {
    render(<TrendsTable data={mockCategoryData} groupBy="category" setGroupBy={mockSetGroupBy} />);

    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Variação (R$)')).toBeInTheDocument();
    expect(screen.getByText('Variação (%)')).toBeInTheDocument();
  });

  it('should support dark mode classes', () => {
    const { container } = render(
      <TrendsTable data={mockCategoryData} groupBy="category" setGroupBy={mockSetGroupBy} />
    );

    const card = container.querySelector('.bg-white');
    expect(card?.className).toContain('dark:bg-slate-800');
  });

  it('should show em-dash for zero percentage variation', () => {
    render(<TrendsTable data={mockCategoryData} groupBy="category" setGroupBy={mockSetGroupBy} />);

    const healthRow = screen.getByText('Saúde').closest('tr');
    expect(healthRow.textContent).toContain('—');
  });

  it('should display absolute values for variation amounts', () => {
    render(<TrendsTable data={mockCategoryData} groupBy="category" setGroupBy={mockSetGroupBy} />);

    expect(formatters.formatCurrency).toHaveBeenCalledWith(50);
  });

  it('should have hover effect on table rows', () => {
    const { container } = render(
      <TrendsTable data={mockCategoryData} groupBy="category" setGroupBy={mockSetGroupBy} />
    );

    const row = container.querySelector('tbody tr');
    expect(row).toHaveClass('hover:bg-slate-50');
  });

  it('should render with scrollable table wrapper', () => {
    const { container } = render(
      <TrendsTable data={mockCategoryData} groupBy="category" setGroupBy={mockSetGroupBy} />
    );

    const scrollWrapper = container.querySelector('.overflow-x-auto');
    expect(scrollWrapper).toBeInTheDocument();
  });

  it('should handle single row data', () => {
    const singleRow = [mockCategoryData[0]];
    render(<TrendsTable data={singleRow} groupBy="category" setGroupBy={mockSetGroupBy} />);

    expect(screen.getByText('Alimentação')).toBeInTheDocument();
  });

  it('should render correct number of data rows', () => {
    const { container } = render(
      <TrendsTable data={mockCategoryData} groupBy="category" setGroupBy={mockSetGroupBy} />
    );

    const rows = container.querySelectorAll('tbody tr');
    expect(rows.length).toBe(mockCategoryData.length);
  });
});
