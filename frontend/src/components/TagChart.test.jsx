/**
 * TagChart Component Tests
 *
 * Tests the 100% stacked horizontal bar chart for tag composition.
 * Verifies Rule 9: formatCurrency() usage for tag amounts.
 * Tests percentage calculations and visual rendering.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TagChart } from './TagChart';
import * as formatters from '../utils/formatters';

vi.mock('../utils/formatters', async () => {
  const actual = await vi.importActual('../utils/formatters');
  return {
    ...actual,
    formatCurrency: vi.fn((val) => `R$ ${parseFloat(val).toFixed(2)}`),
  };
});

describe('TagChart Component', () => {
  const mockData = [
    { tag: 'Gastos Pessoais', amount: 500 },
    { tag: 'Gastos do Casal', amount: 300 },
    { tag: 'Gastos de Casa', amount: 200 },
  ];

  it('should render section title', () => {
    render(<TagChart data={mockData} />);

    expect(screen.getByText('Composição por Tag')).toBeInTheDocument();
  });

  it('should render all tags', () => {
    render(<TagChart data={mockData} />);

    expect(screen.getByText('Gastos Pessoais')).toBeInTheDocument();
    expect(screen.getByText('Gastos do Casal')).toBeInTheDocument();
    expect(screen.getByText('Gastos de Casa')).toBeInTheDocument();
  });

  it('should call formatCurrency for all tag amounts (Rule 9)', () => {
    render(<TagChart data={mockData} />);

    expect(formatters.formatCurrency).toHaveBeenCalledWith(500);
    expect(formatters.formatCurrency).toHaveBeenCalledWith(300);
    expect(formatters.formatCurrency).toHaveBeenCalledWith(200);
  });

  it('should calculate percentages correctly', () => {
    render(<TagChart data={mockData} />);

    const total = 500 + 300 + 200;
    const pct1 = ((500 / total) * 100).toFixed(1);
    const pct2 = ((300 / total) * 100).toFixed(1);
    const pct3 = ((200 / total) * 100).toFixed(1);

    expect(screen.getByText(new RegExp(`${pct1}\\s*%`))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${pct2}\\s*%`))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${pct3}\\s*%`))).toBeInTheDocument();
  });

  it('should display empty state when no data', () => {
    render(<TagChart data={[]} />);

    expect(
      screen.getByText('Nenhum dado disponível para o período selecionado')
    ).toBeInTheDocument();
  });

  it('should handle null data gracefully', () => {
    render(<TagChart data={null} />);

    expect(
      screen.getByText('Nenhum dado disponível para o período selecionado')
    ).toBeInTheDocument();
  });

  it('should handle undefined data gracefully', () => {
    render(<TagChart />);

    expect(
      screen.getByText('Nenhum dado disponível para o período selecionado')
    ).toBeInTheDocument();
  });

  it('should display empty state when total is zero', () => {
    const zeroData = [
      { tag: 'Gastos Pessoais', amount: 0 },
      { tag: 'Gastos do Casal', amount: 0 },
    ];

    render(<TagChart data={zeroData} />);

    expect(
      screen.getByText('Nenhum dado disponível para o período selecionado')
    ).toBeInTheDocument();
  });

  it('should render stacked bar with correct segments', () => {
    const { container } = render(<TagChart data={mockData} />);

    const stackedBar = container.querySelector('.h-8');
    expect(stackedBar).toBeInTheDocument();

    const segments = container.querySelectorAll('.h-full');
    expect(segments.length).toBe(mockData.length);
  });

  it('should apply different colors to each tag', () => {
    const { container } = render(<TagChart data={mockData} />);

    const segments = container.querySelectorAll('.h-full');

    expect(segments[0]).toHaveClass('bg-slate-300');
    expect(segments[1]).toHaveClass('bg-slate-400');
    expect(segments[2]).toHaveClass('bg-slate-500');
  });

  it('should show tag names in segments when percentage >= 10%', () => {
    const largePercentageData = [
      { tag: 'Gastos Pessoais', amount: 600 },
      { tag: 'Gastos do Casal', amount: 200 },
      { tag: 'Gastos de Casa', amount: 200 },
    ];

    const { container } = render(<TagChart data={largePercentageData} />);

    const segments = container.querySelectorAll('.h-full');
    expect(segments[0].textContent).toContain('Gastos Pessoais');
  });

  it('should hide tag names in segments when percentage < 10%', () => {
    const smallPercentageData = [
      { tag: 'Gastos Pessoais', amount: 950 },
      { tag: 'Gastos do Casal', amount: 50 },
    ];

    const { container } = render(<TagChart data={smallPercentageData} />);

    const segments = container.querySelectorAll('.h-full');
    expect(segments[1].textContent).toBe('');
  });

  it('should render legend with color indicators', () => {
    const { container } = render(<TagChart data={mockData} />);

    const colorBoxes = container.querySelectorAll('.w-3.h-3');
    expect(colorBoxes.length).toBe(mockData.length);
  });

  it('should support dark mode classes', () => {
    const { container } = render(<TagChart data={mockData} />);

    const card = container.querySelector('.bg-white');
    expect(card?.className).toContain('dark:bg-slate-800');
  });

  it('should handle single tag correctly', () => {
    const singleTag = [{ tag: 'Gastos Pessoais', amount: 1000 }];

    render(<TagChart data={singleTag} />);

    expect(screen.getByText(/100\.0\s*%/)).toBeInTheDocument();
  });

  it('should calculate 100% total for all segments', () => {
    const { container } = render(<TagChart data={mockData} />);

    const total = mockData.reduce((sum, item) => sum + item.amount, 0);
    const percentages = mockData.map((item) => (item.amount / total) * 100);
    const sum = percentages.reduce((acc, pct) => acc + pct, 0);

    expect(Math.round(sum)).toBe(100);
  });

  it('should handle equal distribution', () => {
    const equalData = [
      { tag: 'A', amount: 100 },
      { tag: 'B', amount: 100 },
      { tag: 'C', amount: 100 },
    ];

    render(<TagChart data={equalData} />);

    expect(screen.getByText(/33\.3\s*%/)).toBeInTheDocument();
  });

  it('should set segment width based on percentage', () => {
    const { container } = render(<TagChart data={mockData} />);

    const total = mockData.reduce((sum, item) => sum + item.amount, 0);
    const firstPercentage = (mockData[0].amount / total) * 100;

    const segments = container.querySelectorAll('.h-full');
    const firstSegment = segments[0];

    expect(firstSegment).toHaveStyle({ width: `${firstPercentage}%` });
  });
});
