/**
 * BarRow Component Tests
 *
 * Tests the horizontal bar row component used in charts.
 * Verifies Rule 9: formatCurrency() usage for monetary values.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BarRow } from './BarRow';
import * as formatters from '../utils/formatters';

vi.mock('../utils/formatters', async () => {
  const actual = await vi.importActual('../utils/formatters');
  return {
    ...actual,
    formatCurrency: vi.fn((val) => `R$ ${val.toFixed(2)}`),
  };
});

describe('BarRow Component', () => {
  it('should render label and formatted value', () => {
    render(<BarRow label="Alimentação" value={500} max={1000} />);

    expect(screen.getByText('Alimentação')).toBeInTheDocument();
    expect(screen.getByText('R$ 500.00')).toBeInTheDocument();
  });

  it('should call formatCurrency with correct value (Rule 9)', () => {
    render(<BarRow label="Transporte" value={250.5} max={1000} />);

    expect(formatters.formatCurrency).toHaveBeenCalledWith(250.5);
  });

  it('should calculate correct percentage width', () => {
    const { container } = render(<BarRow label="Test" value={300} max={1000} />);
    const bar = container.querySelector('.bg-slate-700');

    expect(bar).toHaveStyle({ width: '30%' });
  });

  it('should handle 100% width when value equals max', () => {
    const { container } = render(<BarRow label="Test" value={1000} max={1000} />);
    const bar = container.querySelector('.bg-slate-700');

    expect(bar).toHaveStyle({ width: '100%' });
  });

  it('should handle 0% width when value is zero', () => {
    const { container } = render(<BarRow label="Test" value={0} max={1000} />);
    const bar = container.querySelector('.bg-slate-700');

    expect(bar).toHaveStyle({ width: '0%' });
  });

  it('should handle edge case when max is zero', () => {
    const { container } = render(<BarRow label="Test" value={100} max={0} />);
    const bar = container.querySelector('.bg-slate-700');

    expect(bar).toHaveStyle({ width: '0%' });
  });

  it('should support dark mode classes', () => {
    const { container } = render(<BarRow label="Test" value={500} max={1000} />);

    const labelContainer = container.querySelector('.text-slate-700');
    expect(labelContainer?.className).toContain('dark:text-slate-300');

    const valueContainer = container.querySelector('.text-slate-600');
    expect(valueContainer?.className).toContain('dark:text-slate-400');
  });

  it('should render multiple bars with different percentages', () => {
    const { rerender, container } = render(<BarRow label="Category 1" value={500} max={1000} />);
    let bar = container.querySelector('.bg-slate-700');
    expect(bar).toHaveStyle({ width: '50%' });

    rerender(<BarRow label="Category 2" value={750} max={1000} />);
    bar = container.querySelector('.bg-slate-700');
    expect(bar).toHaveStyle({ width: '75%' });
  });
});
