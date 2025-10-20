/**
 * CategoryChart Component Tests
 *
 * Tests the horizontal bar chart for category spending breakdown.
 * Verifies proper rendering, sorting, and BarRow component usage.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CategoryChart } from './CategoryChart';

describe('CategoryChart Component', () => {
  const mockData = [
    { category: 'Alimentação', amount: 500 },
    { category: 'Transporte', amount: 300 },
    { category: 'Saúde', amount: 150 },
    { category: 'Lazer', amount: 200 },
  ];

  it('should render section title', () => {
    render(<CategoryChart data={mockData} />);

    expect(screen.getByText('Gastos por Categoria')).toBeInTheDocument();
  });

  it('should render all categories', () => {
    render(<CategoryChart data={mockData} />);

    expect(screen.getByText('Alimentação')).toBeInTheDocument();
    expect(screen.getByText('Transporte')).toBeInTheDocument();
    expect(screen.getByText('Saúde')).toBeInTheDocument();
    expect(screen.getByText('Lazer')).toBeInTheDocument();
  });

  it('should sort categories by amount in descending order', () => {
    const { container } = render(<CategoryChart data={mockData} />);

    const labels = Array.from(container.querySelectorAll('.text-slate-700')).map(
      (el) => el.textContent
    );

    expect(labels[0]).toBe('Alimentação');
    expect(labels[1]).toBe('Transporte');
    expect(labels[2]).toBe('Lazer');
    expect(labels[3]).toBe('Saúde');
  });

  it('should display empty state when no data', () => {
    render(<CategoryChart data={[]} />);

    expect(
      screen.getByText('Nenhum dado disponível para o período selecionado')
    ).toBeInTheDocument();
  });

  it('should handle null data gracefully', () => {
    render(<CategoryChart data={null} />);

    expect(
      screen.getByText('Nenhum dado disponível para o período selecionado')
    ).toBeInTheDocument();
  });

  it('should handle undefined data gracefully', () => {
    render(<CategoryChart />);

    expect(
      screen.getByText('Nenhum dado disponível para o período selecionado')
    ).toBeInTheDocument();
  });

  it('should render BarRow components for each category', () => {
    const { container } = render(<CategoryChart data={mockData} />);

    const bars = container.querySelectorAll('.bg-slate-700');
    expect(bars.length).toBe(mockData.length);
  });

  it('should support dark mode classes', () => {
    const { container } = render(<CategoryChart data={mockData} />);

    const card = container.querySelector('.bg-white');
    expect(card?.className).toContain('dark:bg-slate-800');
  });

  it('should handle single category', () => {
    const singleData = [{ category: 'Alimentação', amount: 500 }];
    render(<CategoryChart data={singleData} />);

    expect(screen.getByText('Alimentação')).toBeInTheDocument();
  });

  it('should maintain original data immutability', () => {
    const originalData = [
      { category: 'B', amount: 100 },
      { category: 'A', amount: 200 },
    ];
    const dataCopy = [...originalData];

    render(<CategoryChart data={originalData} />);

    expect(originalData).toEqual(dataCopy);
  });

  it('should handle categories with same amount', () => {
    const sameAmountData = [
      { category: 'A', amount: 100 },
      { category: 'B', amount: 100 },
      { category: 'C', amount: 100 },
    ];

    render(<CategoryChart data={sameAmountData} />);

    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
  });

  it('should handle zero amounts', () => {
    const zeroData = [
      { category: 'Alimentação', amount: 100 },
      { category: 'Transporte', amount: 0 },
    ];

    render(<CategoryChart data={zeroData} />);

    expect(screen.getByText('Alimentação')).toBeInTheDocument();
    expect(screen.getByText('Transporte')).toBeInTheDocument();
  });

  it('should calculate max value correctly for bar widths', () => {
    const { container } = render(<CategoryChart data={mockData} />);

    const bars = container.querySelectorAll('.bg-slate-700');
    const firstBar = bars[0];

    expect(firstBar).toHaveStyle({ width: '100%' });
  });

  it('should render with proper spacing between bars', () => {
    const { container } = render(<CategoryChart data={mockData} />);

    const barContainer = container.querySelector('.space-y-2');
    expect(barContainer).toBeInTheDocument();
  });
});
