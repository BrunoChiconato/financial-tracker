/**
 * SectionTitle Component Tests
 *
 * Tests the reusable section header component.
 * Verifies Rule 4: Use of SectionTitle.jsx for section headers.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SectionTitle } from './SectionTitle';

describe('SectionTitle Component', () => {
  it('should render the title', () => {
    render(<SectionTitle title="Gastos por Categoria" />);

    expect(screen.getByText('Gastos por Categoria')).toBeInTheDocument();
  });

  it('should render title as h3 element', () => {
    render(<SectionTitle title="Test Title" />);

    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toHaveTextContent('Test Title');
  });

  it('should not render subtitle when not provided', () => {
    const { container } = render(<SectionTitle title="Test Title" />);

    const paragraph = container.querySelector('p');
    expect(paragraph).not.toBeInTheDocument();
  });

  it('should render subtitle when provided', () => {
    render(<SectionTitle title="Test Title" subtitle="This is a subtitle" />);

    expect(screen.getByText('This is a subtitle')).toBeInTheDocument();
  });

  it('should render subtitle with smaller font', () => {
    const { container } = render(
      <SectionTitle title="Test Title" subtitle="This is a subtitle" />
    );

    const subtitle = screen.getByText('This is a subtitle');
    expect(subtitle).toHaveClass('text-xs');
  });

  it('should support dark mode classes for title', () => {
    render(<SectionTitle title="Test Title" />);

    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toHaveClass('text-slate-900');
    expect(heading).toHaveClass('dark:text-slate-100');
  });

  it('should support dark mode classes for subtitle', () => {
    render(<SectionTitle title="Test Title" subtitle="Subtitle text" />);

    const subtitle = screen.getByText('Subtitle text');
    expect(subtitle).toHaveClass('text-slate-600');
    expect(subtitle).toHaveClass('dark:text-slate-400');
  });

  it('should have semibold font weight for title', () => {
    render(<SectionTitle title="Test Title" />);

    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toHaveClass('font-semibold');
  });

  it('should handle empty title gracefully', () => {
    render(<SectionTitle title="" />);

    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toBeInTheDocument();
  });

  it('should handle special characters in title', () => {
    render(<SectionTitle title="Gastos & Receitas (R$)" />);

    expect(screen.getByText('Gastos & Receitas (R$)')).toBeInTheDocument();
  });

  it('should handle long titles', () => {
    const longTitle = 'This is a very long title that might wrap to multiple lines';
    render(<SectionTitle title={longTitle} />);

    expect(screen.getByText(longTitle)).toBeInTheDocument();
  });

  it('should handle long subtitles', () => {
    const longSubtitle = 'This is a very long subtitle with a lot of descriptive text';
    render(<SectionTitle title="Short" subtitle={longSubtitle} />);

    expect(screen.getByText(longSubtitle)).toBeInTheDocument();
  });

  it('should have proper spacing for subtitle', () => {
    render(<SectionTitle title="Title" subtitle="Subtitle" />);

    const subtitle = screen.getByText('Subtitle');
    expect(subtitle).toHaveClass('mt-0.5');
  });
});
