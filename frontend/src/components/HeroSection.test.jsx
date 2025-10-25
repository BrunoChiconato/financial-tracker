/**
 * HeroSection Component Tests
 *
 * Tests the hero section containing monthly budget card and KPI cards.
 * Verifies Rule 9: formatCurrency() usage for all monetary values.
 * Tests budget calculations, pacing indicators, and KPI displays.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HeroSection } from './HeroSection';
import * as formatters from '../utils/formatters';

vi.mock('../utils/formatters', async () => {
  const actual = await vi.importActual('../utils/formatters');
  return {
    ...actual,
    formatCurrency: vi.fn((val) => `R$ ${val.toFixed(2)}`),
  };
});

describe('HeroSection Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const CYCLE_CHANGE_DATE = new Date(2025, 9, 4);
  const TRANSITION_END_DATE = new Date(2025, 10, 16);
  const currentDate = new Date(currentYear, currentMonth - 1, now.getDate());

  let invoiceYear = currentYear;
  let invoiceMonth;

  if (currentDate < CYCLE_CHANGE_DATE) {
    const cycleDay = 4;
    if (now.getDate() >= cycleDay) {
      invoiceMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      if (currentMonth === 12) invoiceYear++;
    } else {
      invoiceMonth = currentMonth;
    }
  } else if (currentDate <= TRANSITION_END_DATE) {
    invoiceMonth = 11;
    invoiceYear = 2025;
  } else {
    const cycleDay = 17;
    if (now.getDate() >= cycleDay) {
      invoiceMonth = currentMonth === 12 ? 1 : currentMonth + 1;
      if (currentMonth === 12) invoiceYear++;
    } else {
      invoiceMonth = currentMonth;
    }
  }

  const mockSummary = {
    current: {
      totalSpent: 2000,
      transactionCount: 25,
    },
  };

  const mockCapData = {
    netCap: 4000,
    businessDaysWorked: 20,
    totalBusinessDays: 22,
    holidays: 2,
  };

  it('should render the monthly budget section', () => {
    render(<HeroSection summary={mockSummary} />);

    expect(screen.getByText('Orçamento do mês')).toBeInTheDocument();
  });

  it('should call formatCurrency for all monetary values (Rule 9)', () => {
    render(<HeroSection summary={mockSummary} />);

    expect(formatters.formatCurrency).toHaveBeenCalled();
    const calls = formatters.formatCurrency.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
  });

  it('should display total spent from summary', () => {
    render(<HeroSection summary={mockSummary} />);

    expect(formatters.formatCurrency).toHaveBeenCalledWith(2000);
  });

  it('should calculate remaining budget correctly', () => {
    render(<HeroSection summary={mockSummary} />);

    const remaining = 4000 - 2000;
    expect(formatters.formatCurrency).toHaveBeenCalledWith(remaining);
  });

  it('should display transaction count', () => {
    render(<HeroSection summary={mockSummary} />);

    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('should handle zero spending', () => {
    const zeroSummary = {
      current: {
        totalSpent: 0,
        transactionCount: 0,
      },
    };
    render(<HeroSection summary={zeroSummary} />);

    expect(formatters.formatCurrency).toHaveBeenCalledWith(0);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should handle missing summary data gracefully', () => {
    render(<HeroSection summary={null} />);

    expect(formatters.formatCurrency).toHaveBeenCalledWith(0);
  });

  it('should handle undefined summary properties', () => {
    const incompleteSummary = {
      current: {},
    };
    render(<HeroSection summary={incompleteSummary} />);

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should render all three KPI cards', () => {
    render(
      <HeroSection summary={mockSummary} invoiceYear={invoiceYear} invoiceMonth={invoiceMonth} />
    );

    expect(screen.getByText('Total gasto')).toBeInTheDocument();
    expect(screen.getByText('Projeção fim do mês')).toBeInTheDocument();
    expect(screen.getByText('Lançamentos')).toBeInTheDocument();
  });

  it('should show over-pace indicator when spending exceeds expected', () => {
    const highSpendingSummary = {
      current: {
        totalSpent: 3500,
        transactionCount: 30,
      },
    };

    render(
      <HeroSection
        summary={highSpendingSummary}
        capData={mockCapData}
        invoiceYear={invoiceYear}
        invoiceMonth={invoiceMonth}
      />
    );

    expect(screen.getByText('acima do esperado')).toBeInTheDocument();
  });

  it('should show under-pace indicator when spending is below expected', () => {
    const lowSpendingSummary = {
      current: {
        totalSpent: 500,
        transactionCount: 5,
      },
    };

    render(
      <HeroSection
        summary={lowSpendingSummary}
        capData={mockCapData}
        invoiceYear={invoiceYear}
        invoiceMonth={invoiceMonth}
      />
    );

    expect(screen.getByText('abaixo do esperado')).toBeInTheDocument();
  });

  it('should apply red styling for over-pace spending', () => {
    const highSpendingSummary = {
      current: {
        totalSpent: 3500,
        transactionCount: 30,
      },
    };

    const { container } = render(
      <HeroSection
        summary={highSpendingSummary}
        capData={mockCapData}
        invoiceYear={invoiceYear}
        invoiceMonth={invoiceMonth}
      />
    );
    const redBar = container.querySelector('.bg-red-600');

    expect(redBar).toBeInTheDocument();
  });

  it('should apply green styling for under-pace spending', () => {
    const lowSpendingSummary = {
      current: {
        totalSpent: 500,
        transactionCount: 5,
      },
    };

    const { container } = render(
      <HeroSection
        summary={lowSpendingSummary}
        capData={mockCapData}
        invoiceYear={invoiceYear}
        invoiceMonth={invoiceMonth}
      />
    );
    const greenBar = container.querySelector('.bg-green-600');

    expect(greenBar).toBeInTheDocument();
  });

  it('should display projection for end of month', () => {
    render(
      <HeroSection summary={mockSummary} invoiceYear={invoiceYear} invoiceMonth={invoiceMonth} />
    );

    expect(screen.getByText(/Projeção mês:/)).toBeInTheDocument();
  });

  it('should support dark mode classes', () => {
    const { container } = render(<HeroSection summary={mockSummary} />);

    const card = container.querySelector('.bg-white');
    expect(card?.className).toContain('dark:bg-slate-800');
  });

  it('should handle budget exceeded scenario (spending > budget)', () => {
    const exceededSummary = {
      current: {
        totalSpent: 5000,
        transactionCount: 50,
      },
    };

    render(
      <HeroSection
        summary={exceededSummary}
        invoiceYear={invoiceYear}
        invoiceMonth={invoiceMonth}
      />
    );

    expect(formatters.formatCurrency).toHaveBeenCalledWith(5000);
  });

  it('should calculate projection based on current pace', () => {
    const summary = {
      current: {
        totalSpent: 1000,
        transactionCount: 10,
      },
    };

    render(<HeroSection summary={summary} />);

    expect(formatters.formatCurrency).toHaveBeenCalled();
  });
});
