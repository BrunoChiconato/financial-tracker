/**
 * Filters Component Tests
 *
 * Tests the main filters sidebar component with categories, tags, methods, and search.
 * Verifies debouncing, filter toggling, and integration with FilterGroup.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Filters } from './Filters';

describe('Filters Component', () => {
  const mockMetadata = {
    categories: ['Alimentação', 'Transporte', 'Saúde', 'Lazer'],
    tags: ['Gastos Pessoais', 'Gastos do Casal', 'Gastos de Casa'],
  };

  const mockFilters = {
    categories: ['Alimentação'],
    tags: ['Gastos Pessoais'],
    methods: ['Pix'],
    search: '',
  };

  const mockSetCategories = vi.fn();
  const mockSetTags = vi.fn();
  const mockSetMethods = vi.fn();
  const mockSetSearch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should render filters title', () => {
    render(
      <Filters
        metadata={mockMetadata}
        filters={mockFilters}
        setCategories={mockSetCategories}
        setTags={mockSetTags}
        setMethods={mockSetMethods}
        setSearch={mockSetSearch}
      />
    );

    expect(screen.getByText('Filtros')).toBeInTheDocument();
  });

  it('should render all three filter groups', () => {
    render(
      <Filters
        metadata={mockMetadata}
        filters={mockFilters}
        setCategories={mockSetCategories}
        setTags={mockSetTags}
        setMethods={mockSetMethods}
        setSearch={mockSetSearch}
      />
    );

    expect(screen.getByText('Categorias')).toBeInTheDocument();
    expect(screen.getByText('Tags')).toBeInTheDocument();
    expect(screen.getByText('Método')).toBeInTheDocument();
  });

  it('should render search input', () => {
    render(
      <Filters
        metadata={mockMetadata}
        filters={mockFilters}
        setCategories={mockSetCategories}
        setTags={mockSetTags}
        setMethods={mockSetMethods}
        setSearch={mockSetSearch}
      />
    );

    expect(screen.getByPlaceholderText('Digite para buscar...')).toBeInTheDocument();
    expect(screen.getByText('Buscar na Descrição')).toBeInTheDocument();
  });

  it('should display categories from metadata', () => {
    render(
      <Filters
        metadata={mockMetadata}
        filters={mockFilters}
        setCategories={mockSetCategories}
        setTags={mockSetTags}
        setMethods={mockSetMethods}
        setSearch={mockSetSearch}
      />
    );

    expect(screen.getByText('Alimentação')).toBeInTheDocument();
    expect(screen.getByText('Transporte')).toBeInTheDocument();
    expect(screen.getByText('Saúde')).toBeInTheDocument();
    expect(screen.getByText('Lazer')).toBeInTheDocument();
  });

  it('should display tags from metadata', () => {
    render(
      <Filters
        metadata={mockMetadata}
        filters={mockFilters}
        setCategories={mockSetCategories}
        setTags={mockSetTags}
        setMethods={mockSetMethods}
        setSearch={mockSetSearch}
      />
    );

    expect(screen.getByText('Gastos Pessoais')).toBeInTheDocument();
    expect(screen.getByText('Gastos do Casal')).toBeInTheDocument();
    expect(screen.getByText('Gastos de Casa')).toBeInTheDocument();
  });

  it('should display payment methods', () => {
    render(
      <Filters
        metadata={mockMetadata}
        filters={mockFilters}
        setCategories={mockSetCategories}
        setTags={mockSetTags}
        setMethods={mockSetMethods}
        setSearch={mockSetSearch}
      />
    );

    expect(screen.getByText('Cartão de Crédito')).toBeInTheDocument();
    expect(screen.getByText('Pix')).toBeInTheDocument();
    expect(screen.getByText('Cartão de Débito')).toBeInTheDocument();
    expect(screen.getByText('Boleto')).toBeInTheDocument();
  });

  it('should check selected categories', () => {
    render(
      <Filters
        metadata={mockMetadata}
        filters={mockFilters}
        setCategories={mockSetCategories}
        setTags={mockSetTags}
        setMethods={mockSetMethods}
        setSearch={mockSetSearch}
      />
    );

    const alimentacaoCheckbox = screen.getByLabelText('Alimentação');
    const transporteCheckbox = screen.getByLabelText('Transporte');

    expect(alimentacaoCheckbox).toBeChecked();
    expect(transporteCheckbox).not.toBeChecked();
  });

  it('should add category when checking unchecked item', () => {
    render(
      <Filters
        metadata={mockMetadata}
        filters={mockFilters}
        setCategories={mockSetCategories}
        setTags={mockSetTags}
        setMethods={mockSetMethods}
        setSearch={mockSetSearch}
      />
    );

    const transporteCheckbox = screen.getByLabelText('Transporte');
    fireEvent.click(transporteCheckbox);

    expect(mockSetCategories).toHaveBeenCalledWith(['Alimentação', 'Transporte']);
  });

  it('should remove category when unchecking checked item', () => {
    render(
      <Filters
        metadata={mockMetadata}
        filters={mockFilters}
        setCategories={mockSetCategories}
        setTags={mockSetTags}
        setMethods={mockSetMethods}
        setSearch={mockSetSearch}
      />
    );

    const alimentacaoCheckbox = screen.getByLabelText('Alimentação');
    fireEvent.click(alimentacaoCheckbox);

    expect(mockSetCategories).toHaveBeenCalledWith([]);
  });

  it('should add tag when checking unchecked item', () => {
    render(
      <Filters
        metadata={mockMetadata}
        filters={mockFilters}
        setCategories={mockSetCategories}
        setTags={mockSetTags}
        setMethods={mockSetMethods}
        setSearch={mockSetSearch}
      />
    );

    const casalCheckbox = screen.getByLabelText('Gastos do Casal');
    fireEvent.click(casalCheckbox);

    expect(mockSetTags).toHaveBeenCalledWith(['Gastos Pessoais', 'Gastos do Casal']);
  });

  it('should remove tag when unchecking checked item', () => {
    render(
      <Filters
        metadata={mockMetadata}
        filters={mockFilters}
        setCategories={mockSetCategories}
        setTags={mockSetTags}
        setMethods={mockSetMethods}
        setSearch={mockSetSearch}
      />
    );

    const pessoaisCheckbox = screen.getByLabelText('Gastos Pessoais');
    fireEvent.click(pessoaisCheckbox);

    expect(mockSetTags).toHaveBeenCalledWith([]);
  });

  it('should add method when checking unchecked item', () => {
    render(
      <Filters
        metadata={mockMetadata}
        filters={mockFilters}
        setCategories={mockSetCategories}
        setTags={mockSetTags}
        setMethods={mockSetMethods}
        setSearch={mockSetSearch}
      />
    );

    const creditCardCheckbox = screen.getByLabelText('Cartão de Crédito');
    fireEvent.click(creditCardCheckbox);

    expect(mockSetMethods).toHaveBeenCalledWith(['Pix', 'Cartão de Crédito']);
  });

  it('should remove method when unchecking checked item', () => {
    render(
      <Filters
        metadata={mockMetadata}
        filters={mockFilters}
        setCategories={mockSetCategories}
        setTags={mockSetTags}
        setMethods={mockSetMethods}
        setSearch={mockSetSearch}
      />
    );

    const pixCheckbox = screen.getByLabelText('Pix');
    fireEvent.click(pixCheckbox);

    expect(mockSetMethods).toHaveBeenCalledWith([]);
  });

  it('should debounce search input (300ms)', async () => {
    render(
      <Filters
        metadata={mockMetadata}
        filters={mockFilters}
        setCategories={mockSetCategories}
        setTags={mockSetTags}
        setMethods={mockSetMethods}
        setSearch={mockSetSearch}
      />
    );

    const searchInput = screen.getByPlaceholderText('Digite para buscar...');
    fireEvent.change(searchInput, { target: { value: 'uber' } });

    // Should not call immediately
    expect(mockSetSearch).not.toHaveBeenCalled();

    // Fast-forward time
    vi.advanceTimersByTime(300);

    // Should call after debounce delay
    await waitFor(() => {
      expect(mockSetSearch).toHaveBeenCalledWith('uber');
    });
  });

  it('should cancel previous debounce timer on rapid typing', async () => {
    render(
      <Filters
        metadata={mockMetadata}
        filters={mockFilters}
        setCategories={mockSetCategories}
        setTags={mockSetTags}
        setMethods={mockSetMethods}
        setSearch={mockSetSearch}
      />
    );

    const searchInput = screen.getByPlaceholderText('Digite para buscar...');

    fireEvent.change(searchInput, { target: { value: 'u' } });
    vi.advanceTimersByTime(100);

    fireEvent.change(searchInput, { target: { value: 'ub' } });
    vi.advanceTimersByTime(100);

    fireEvent.change(searchInput, { target: { value: 'uber' } });
    vi.advanceTimersByTime(300);

    // Should only call once with final value
    await waitFor(() => {
      expect(mockSetSearch).toHaveBeenCalledTimes(1);
      expect(mockSetSearch).toHaveBeenCalledWith('uber');
    });
  });

  it('should update local search state immediately', () => {
    render(
      <Filters
        metadata={mockMetadata}
        filters={mockFilters}
        setCategories={mockSetCategories}
        setTags={mockSetTags}
        setMethods={mockSetMethods}
        setSearch={mockSetSearch}
      />
    );

    const searchInput = screen.getByPlaceholderText('Digite para buscar...');
    fireEvent.change(searchInput, { target: { value: 'uber' } });

    expect(searchInput).toHaveValue('uber');
  });

  it('should sync local search with filters.search prop', () => {
    const { rerender } = render(
      <Filters
        metadata={mockMetadata}
        filters={mockFilters}
        setCategories={mockSetCategories}
        setTags={mockSetTags}
        setMethods={mockSetMethods}
        setSearch={mockSetSearch}
      />
    );

    const searchInput = screen.getByPlaceholderText('Digite para buscar...');
    expect(searchInput).toHaveValue('');

    // Update external filter state
    rerender(
      <Filters
        metadata={mockMetadata}
        filters={{ ...mockFilters, search: 'new value' }}
        setCategories={mockSetCategories}
        setTags={mockSetTags}
        setMethods={mockSetMethods}
        setSearch={mockSetSearch}
      />
    );

    expect(searchInput).toHaveValue('new value');
  });

  it('should handle empty metadata gracefully', () => {
    render(
      <Filters
        metadata={{ categories: [], tags: [] }}
        filters={mockFilters}
        setCategories={mockSetCategories}
        setTags={mockSetTags}
        setMethods={mockSetMethods}
        setSearch={mockSetSearch}
      />
    );

    expect(screen.getByText('Filtros')).toBeInTheDocument();
  });

  it('should handle null metadata gracefully', () => {
    render(
      <Filters
        metadata={{}}
        filters={mockFilters}
        setCategories={mockSetCategories}
        setTags={mockSetTags}
        setMethods={mockSetMethods}
        setSearch={mockSetSearch}
      />
    );

    expect(screen.getByText('Filtros')).toBeInTheDocument();
  });

  it('should support dark mode classes', () => {
    const { container } = render(
      <Filters
        metadata={mockMetadata}
        filters={mockFilters}
        setCategories={mockSetCategories}
        setTags={mockSetTags}
        setMethods={mockSetMethods}
        setSearch={mockSetSearch}
      />
    );

    const card = container.querySelector('.bg-white');
    expect(card?.className).toContain('dark:bg-slate-800');
  });

  it('should have proper spacing between filter groups', () => {
    const { container } = render(
      <Filters
        metadata={mockMetadata}
        filters={mockFilters}
        setCategories={mockSetCategories}
        setTags={mockSetTags}
        setMethods={mockSetMethods}
        setSearch={mockSetSearch}
      />
    );

    const filterContainer = container.querySelector('.space-y-3');
    expect(filterContainer).toBeInTheDocument();
  });

  it('should separate search with border', () => {
    const { container } = render(
      <Filters
        metadata={mockMetadata}
        filters={mockFilters}
        setCategories={mockSetCategories}
        setTags={mockSetTags}
        setMethods={mockSetMethods}
        setSearch={mockSetSearch}
      />
    );

    const searchSection = container.querySelector('.border-t');
    expect(searchSection).toBeInTheDocument();
  });
});
