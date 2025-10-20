/**
 * Chip Component Tests
 *
 * Tests the Chip badge component used throughout the application.
 * Verifies Rule 4: Use Chip.jsx for badges (categories, tags, methods).
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Chip } from './Chip';

describe('Chip Component', () => {
  it('should render children content', () => {
    render(<Chip>Test Label</Chip>);
    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  it('should apply correct base styling classes', () => {
    const { container } = render(<Chip>Badge</Chip>);
    const chip = container.querySelector('span');

    expect(chip).toHaveClass('inline-flex');
    expect(chip).toHaveClass('items-center');
    expect(chip).toHaveClass('rounded-full');
    expect(chip).toHaveClass('border');
  });

  it('should support dark mode classes', () => {
    const { container } = render(<Chip>Dark Mode</Chip>);
    const chip = container.querySelector('span');

    expect(chip?.className).toContain('dark:border-slate-600');
    expect(chip?.className).toContain('dark:text-slate-300');
    expect(chip?.className).toContain('dark:bg-slate-700');
  });

  it('should render category names correctly', () => {
    render(<Chip>Alimentação</Chip>);
    expect(screen.getByText('Alimentação')).toBeInTheDocument();
  });

  it('should render payment method names correctly', () => {
    render(<Chip>Cartão de Crédito</Chip>);
    expect(screen.getByText('Cartão de Crédito')).toBeInTheDocument();
  });

  it('should render tag names correctly', () => {
    render(<Chip>Gastos Pessoais</Chip>);
    expect(screen.getByText('Gastos Pessoais')).toBeInTheDocument();
  });

  it('should handle empty children', () => {
    const { container } = render(<Chip></Chip>);
    const chip = container.querySelector('span');
    expect(chip).toBeInTheDocument();
    expect(chip?.textContent).toBe('');
  });

  it('should render multiple chips independently', () => {
    const { rerender } = render(<Chip>First</Chip>);
    expect(screen.getByText('First')).toBeInTheDocument();

    rerender(<Chip>Second</Chip>);
    expect(screen.getByText('Second')).toBeInTheDocument();
  });
});
