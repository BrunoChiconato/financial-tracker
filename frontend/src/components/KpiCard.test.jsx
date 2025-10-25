/**
 * KpiCard Component Tests
 *
 * Tests the KPI card component used in the hero section.
 * Ensures proper rendering of icons, labels, and values.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KpiCard } from './KpiCard';
import { Wallet, TrendingUp, List } from 'lucide-react';

describe('KpiCard Component', () => {
  it('should render label and value', () => {
    render(<KpiCard icon={Wallet} label="Total gasto" value="R$ 1.234,56" />);

    expect(screen.getByText('Total gasto')).toBeInTheDocument();
    expect(screen.getByText('R$ 1.234,56')).toBeInTheDocument();
  });

  it('should render the provided icon', () => {
    const { container } = render(
      <KpiCard icon={TrendingUp} label="Projeção" value="R$ 2.000,00" />
    );

    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should apply subtle opacity when subtle prop is true', () => {
    const { container } = render(
      <KpiCard icon={TrendingUp} label="Projeção" value="R$ 2.000,00" subtle={true} />
    );

    const card = container.querySelector('.opacity-95');
    expect(card).toBeInTheDocument();
  });

  it('should not apply subtle opacity when subtle prop is false', () => {
    const { container } = render(
      <KpiCard icon={Wallet} label="Total" value="R$ 1.000,00" subtle={false} />
    );

    const card = container.querySelector('.opacity-95');
    expect(card).toBeNull();
  });

  it('should render numeric values correctly', () => {
    render(<KpiCard icon={List} label="Lançamentos" value="42" />);

    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('should support dark mode classes', () => {
    const { container } = render(<KpiCard icon={Wallet} label="Test" value="100" />);

    const card = container.querySelector('.bg-white');
    expect(card?.className).toContain('dark:bg-slate-800');

    const label = container.querySelector('.text-slate-700');
    expect(label?.className).toContain('dark:text-slate-300');

    const value = container.querySelector('.text-slate-900');
    expect(value?.className).toContain('dark:text-slate-100');
  });

  it('should render with correct font styling for value', () => {
    render(<KpiCard icon={Wallet} label="Test" value="1000" />);

    const value = screen.getByText('1000');
    expect(value).toHaveClass('text-xl');
    expect(value).toHaveClass('font-semibold');
    expect(value).toHaveClass('tracking-tight');
  });

  it('should render all three main icons used in HeroSection', () => {
    const { rerender } = render(<KpiCard icon={Wallet} label="Total gasto" value="R$ 1.000,00" />);
    expect(screen.getByText('Total gasto')).toBeInTheDocument();

    rerender(<KpiCard icon={TrendingUp} label="Projeção fim do mês" value="R$ 2.000,00" />);
    expect(screen.getByText('Projeção fim do mês')).toBeInTheDocument();

    rerender(<KpiCard icon={List} label="Lançamentos" value="42" />);
    expect(screen.getByText('Lançamentos')).toBeInTheDocument();
  });
});
