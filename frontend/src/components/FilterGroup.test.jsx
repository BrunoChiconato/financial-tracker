/**
 * FilterGroup Component Tests
 *
 * Tests the collapsible filter group with search functionality.
 * Verifies toggle behavior, search filtering, and select all/deselect all.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FilterGroup } from './FilterGroup';

describe('FilterGroup Component', () => {
  const mockItems = ['Alimentação', 'Transporte', 'Saúde', 'Lazer', 'Educação'];
  const mockSelectedItems = ['Alimentação', 'Transporte'];
  const mockOnToggle = vi.fn();
  const mockOnSelectAll = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render filter group title', () => {
    render(
      <FilterGroup
        title="Categorias"
        items={mockItems}
        selectedItems={mockSelectedItems}
        onToggle={mockOnToggle}
        onSelectAll={mockOnSelectAll}
      />
    );

    expect(screen.getByText('Categorias')).toBeInTheDocument();
  });

  it('should be open by default', () => {
    render(
      <FilterGroup
        title="Categorias"
        items={mockItems}
        selectedItems={mockSelectedItems}
        onToggle={mockOnToggle}
        onSelectAll={mockOnSelectAll}
      />
    );

    expect(screen.getByText('Alimentação')).toBeInTheDocument();
    expect(screen.getByText('Transporte')).toBeInTheDocument();
  });

  it('should respect defaultOpen prop when false', () => {
    render(
      <FilterGroup
        title="Categorias"
        items={mockItems}
        selectedItems={mockSelectedItems}
        onToggle={mockOnToggle}
        onSelectAll={mockOnSelectAll}
        defaultOpen={false}
      />
    );

    expect(screen.queryByText('Alimentação')).not.toBeInTheDocument();
  });

  it('should toggle open/closed when clicking title', () => {
    render(
      <FilterGroup
        title="Categorias"
        items={mockItems}
        selectedItems={mockSelectedItems}
        onToggle={mockOnToggle}
        onSelectAll={mockOnSelectAll}
      />
    );

    const titleButton = screen.getByRole('button', { name: /Categorias/ });

    expect(screen.getByText('Alimentação')).toBeInTheDocument();

    fireEvent.click(titleButton);
    expect(screen.queryByText('Alimentação')).not.toBeInTheDocument();

    fireEvent.click(titleButton);
    expect(screen.getByText('Alimentação')).toBeInTheDocument();
  });

  it('should show minus sign when open', () => {
    render(
      <FilterGroup
        title="Categorias"
        items={mockItems}
        selectedItems={mockSelectedItems}
        onToggle={mockOnToggle}
        onSelectAll={mockOnSelectAll}
      />
    );

    expect(screen.getByText('−')).toBeInTheDocument();
  });

  it('should show plus sign when closed', () => {
    render(
      <FilterGroup
        title="Categorias"
        items={mockItems}
        selectedItems={mockSelectedItems}
        onToggle={mockOnToggle}
        onSelectAll={mockOnSelectAll}
        defaultOpen={false}
      />
    );

    expect(screen.getByText('+')).toBeInTheDocument();
  });

  it('should render all items as checkboxes', () => {
    render(
      <FilterGroup
        title="Categorias"
        items={mockItems}
        selectedItems={mockSelectedItems}
        onToggle={mockOnToggle}
        onSelectAll={mockOnSelectAll}
      />
    );

    mockItems.forEach((item) => {
      expect(screen.getByText(item)).toBeInTheDocument();
    });
  });

  it('should check selected items', () => {
    render(
      <FilterGroup
        title="Categorias"
        items={mockItems}
        selectedItems={mockSelectedItems}
        onToggle={mockOnToggle}
        onSelectAll={mockOnSelectAll}
      />
    );

    const alimentacaoCheckbox = screen.getByLabelText('Alimentação');
    const transporteCheckbox = screen.getByLabelText('Transporte');
    const saudeCheckbox = screen.getByLabelText('Saúde');

    expect(alimentacaoCheckbox).toBeChecked();
    expect(transporteCheckbox).toBeChecked();
    expect(saudeCheckbox).not.toBeChecked();
  });

  it('should call onToggle when checkbox is clicked', () => {
    render(
      <FilterGroup
        title="Categorias"
        items={mockItems}
        selectedItems={mockSelectedItems}
        onToggle={mockOnToggle}
        onSelectAll={mockOnSelectAll}
      />
    );

    const saudeCheckbox = screen.getByLabelText('Saúde');
    fireEvent.click(saudeCheckbox);

    expect(mockOnToggle).toHaveBeenCalledWith('Saúde', true);
  });

  it('should call onToggle with false when unchecking', () => {
    render(
      <FilterGroup
        title="Categorias"
        items={mockItems}
        selectedItems={mockSelectedItems}
        onToggle={mockOnToggle}
        onSelectAll={mockOnSelectAll}
      />
    );

    const alimentacaoCheckbox = screen.getByLabelText('Alimentação');
    fireEvent.click(alimentacaoCheckbox);

    expect(mockOnToggle).toHaveBeenCalledWith('Alimentação', false);
  });

  it('should show "Selecionar todos" when not all selected', () => {
    render(
      <FilterGroup
        title="Categorias"
        items={mockItems}
        selectedItems={mockSelectedItems}
        onToggle={mockOnToggle}
        onSelectAll={mockOnSelectAll}
      />
    );

    expect(screen.getByText('Selecionar todos')).toBeInTheDocument();
  });

  it('should show "Desmarcar todos" when all selected', () => {
    render(
      <FilterGroup
        title="Categorias"
        items={mockItems}
        selectedItems={mockItems}
        onToggle={mockOnToggle}
        onSelectAll={mockOnSelectAll}
      />
    );

    expect(screen.getByText('Desmarcar todos')).toBeInTheDocument();
  });

  it('should call onSelectAll with all items when "Selecionar todos" is clicked', () => {
    render(
      <FilterGroup
        title="Categorias"
        items={mockItems}
        selectedItems={mockSelectedItems}
        onToggle={mockOnToggle}
        onSelectAll={mockOnSelectAll}
      />
    );

    const selectAllButton = screen.getByText('Selecionar todos');
    fireEvent.click(selectAllButton);

    expect(mockOnSelectAll).toHaveBeenCalledWith(mockItems);
  });

  it('should call onSelectAll with empty array when "Desmarcar todos" is clicked', () => {
    render(
      <FilterGroup
        title="Categorias"
        items={mockItems}
        selectedItems={mockItems}
        onToggle={mockOnToggle}
        onSelectAll={mockOnSelectAll}
      />
    );

    const deselectAllButton = screen.getByText('Desmarcar todos');
    fireEvent.click(deselectAllButton);

    expect(mockOnSelectAll).toHaveBeenCalledWith([]);
  });

  it('should filter items based on search term', () => {
    render(
      <FilterGroup
        title="Categorias"
        items={mockItems}
        selectedItems={mockSelectedItems}
        onToggle={mockOnToggle}
        onSelectAll={mockOnSelectAll}
      />
    );

    const searchInput = screen.getByPlaceholderText('Buscar...');
    fireEvent.change(searchInput, { target: { value: 'ali' } });

    expect(screen.getByText('Alimentação')).toBeInTheDocument();
    expect(screen.queryByText('Transporte')).not.toBeInTheDocument();
    expect(screen.queryByText('Saúde')).not.toBeInTheDocument();
  });

  it('should perform case-insensitive search', () => {
    render(
      <FilterGroup
        title="Categorias"
        items={mockItems}
        selectedItems={mockSelectedItems}
        onToggle={mockOnToggle}
        onSelectAll={mockOnSelectAll}
      />
    );

    const searchInput = screen.getByPlaceholderText('Buscar...');
    fireEvent.change(searchInput, { target: { value: 'TRANS' } });

    expect(screen.getByText('Transporte')).toBeInTheDocument();
    expect(screen.queryByText('Alimentação')).not.toBeInTheDocument();
  });

  it('should show "Nenhum item encontrado" when search has no results', () => {
    render(
      <FilterGroup
        title="Categorias"
        items={mockItems}
        selectedItems={mockSelectedItems}
        onToggle={mockOnToggle}
        onSelectAll={mockOnSelectAll}
      />
    );

    const searchInput = screen.getByPlaceholderText('Buscar...');
    fireEvent.change(searchInput, { target: { value: 'xyz' } });

    expect(screen.getByText('Nenhum item encontrado')).toBeInTheDocument();
  });

  it('should render search input', () => {
    render(
      <FilterGroup
        title="Categorias"
        items={mockItems}
        selectedItems={mockSelectedItems}
        onToggle={mockOnToggle}
        onSelectAll={mockOnSelectAll}
      />
    );

    expect(screen.getByPlaceholderText('Buscar...')).toBeInTheDocument();
  });

  it('should have scrollable container for items', () => {
    const { container } = render(
      <FilterGroup
        title="Categorias"
        items={mockItems}
        selectedItems={mockSelectedItems}
        onToggle={mockOnToggle}
        onSelectAll={mockOnSelectAll}
      />
    );

    const scrollContainer = container.querySelector('.max-h-48');
    expect(scrollContainer).toBeInTheDocument();
    expect(scrollContainer).toHaveClass('overflow-y-auto');
  });

  it('should support dark mode classes', () => {
    const { container } = render(
      <FilterGroup
        title="Categorias"
        items={mockItems}
        selectedItems={mockSelectedItems}
        onToggle={mockOnToggle}
        onSelectAll={mockOnSelectAll}
      />
    );

    const border = container.querySelector('.border');
    expect(border?.className).toContain('dark:border-slate-700');
  });

  it('should handle empty items array', () => {
    render(
      <FilterGroup
        title="Categorias"
        items={[]}
        selectedItems={[]}
        onToggle={mockOnToggle}
        onSelectAll={mockOnSelectAll}
      />
    );

    expect(screen.getByText('Categorias')).toBeInTheDocument();
  });

  it('should handle empty selected items array', () => {
    render(
      <FilterGroup
        title="Categorias"
        items={mockItems}
        selectedItems={[]}
        onToggle={mockOnToggle}
        onSelectAll={mockOnSelectAll}
      />
    );

    const alimentacaoCheckbox = screen.getByLabelText('Alimentação');
    expect(alimentacaoCheckbox).not.toBeChecked();
  });

  it('should have hover effect on checkboxes', () => {
    const { container } = render(
      <FilterGroup
        title="Categorias"
        items={mockItems}
        selectedItems={mockSelectedItems}
        onToggle={mockOnToggle}
        onSelectAll={mockOnSelectAll}
      />
    );

    const label = container.querySelector('label');
    expect(label).toHaveClass('hover:bg-slate-50');
  });

  it('should maintain search state when collapsing and expanding', () => {
    render(
      <FilterGroup
        title="Categorias"
        items={mockItems}
        selectedItems={mockSelectedItems}
        onToggle={mockOnToggle}
        onSelectAll={mockOnSelectAll}
      />
    );

    const searchInput = screen.getByPlaceholderText('Buscar...');
    fireEvent.change(searchInput, { target: { value: 'ali' } });

    const titleButton = screen.getByRole('button', { name: /Categorias/ });
    fireEvent.click(titleButton);
    fireEvent.click(titleButton);

    expect(searchInput).toHaveValue('ali');
    expect(screen.getByText('Alimentação')).toBeInTheDocument();
    expect(screen.queryByText('Transporte')).not.toBeInTheDocument();
  });
});
