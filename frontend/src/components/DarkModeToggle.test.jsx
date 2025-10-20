/**
 * DarkModeToggle Component Tests
 *
 * Tests the dark mode toggle button.
 * Verifies integration with DarkModeContext and proper icon display.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DarkModeToggle } from './DarkModeToggle';
import * as DarkModeContext from '../context/DarkModeContext';

vi.mock('../context/DarkModeContext', () => ({
  useDarkMode: vi.fn(),
}));

describe('DarkModeToggle Component', () => {
  const mockToggleDarkMode = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render toggle button', () => {
    DarkModeContext.useDarkMode.mockReturnValue({
      isDarkMode: false,
      toggleDarkMode: mockToggleDarkMode,
    });

    render(<DarkModeToggle />);

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });

  it('should show moon icon in light mode', () => {
    DarkModeContext.useDarkMode.mockReturnValue({
      isDarkMode: false,
      toggleDarkMode: mockToggleDarkMode,
    });

    const { container } = render(<DarkModeToggle />);

    const moonIcon = container.querySelector('.lucide-moon');
    expect(moonIcon).toBeInTheDocument();
  });

  it('should show sun icon in dark mode', () => {
    DarkModeContext.useDarkMode.mockReturnValue({
      isDarkMode: true,
      toggleDarkMode: mockToggleDarkMode,
    });

    const { container } = render(<DarkModeToggle />);

    const sunIcon = container.querySelector('.lucide-sun');
    expect(sunIcon).toBeInTheDocument();
  });

  it('should have correct aria-label in light mode', () => {
    DarkModeContext.useDarkMode.mockReturnValue({
      isDarkMode: false,
      toggleDarkMode: mockToggleDarkMode,
    });

    render(<DarkModeToggle />);

    const button = screen.getByLabelText('Switch to dark mode');
    expect(button).toBeInTheDocument();
  });

  it('should have correct aria-label in dark mode', () => {
    DarkModeContext.useDarkMode.mockReturnValue({
      isDarkMode: true,
      toggleDarkMode: mockToggleDarkMode,
    });

    render(<DarkModeToggle />);

    const button = screen.getByLabelText('Switch to light mode');
    expect(button).toBeInTheDocument();
  });

  it('should call toggleDarkMode when clicked', () => {
    DarkModeContext.useDarkMode.mockReturnValue({
      isDarkMode: false,
      toggleDarkMode: mockToggleDarkMode,
    });

    render(<DarkModeToggle />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockToggleDarkMode).toHaveBeenCalledTimes(1);
  });

  it('should be positioned fixed in top-right corner', () => {
    DarkModeContext.useDarkMode.mockReturnValue({
      isDarkMode: false,
      toggleDarkMode: mockToggleDarkMode,
    });

    render(<DarkModeToggle />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('fixed');
    expect(button).toHaveClass('top-4');
    expect(button).toHaveClass('right-4');
  });

  it('should have high z-index for floating', () => {
    DarkModeContext.useDarkMode.mockReturnValue({
      isDarkMode: false,
      toggleDarkMode: mockToggleDarkMode,
    });

    render(<DarkModeToggle />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('z-50');
  });

  it('should be rounded', () => {
    DarkModeContext.useDarkMode.mockReturnValue({
      isDarkMode: false,
      toggleDarkMode: mockToggleDarkMode,
    });

    render(<DarkModeToggle />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('rounded-full');
  });

  it('should have shadow', () => {
    DarkModeContext.useDarkMode.mockReturnValue({
      isDarkMode: false,
      toggleDarkMode: mockToggleDarkMode,
    });

    render(<DarkModeToggle />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('shadow-lg');
  });

  it('should have hover effects', () => {
    DarkModeContext.useDarkMode.mockReturnValue({
      isDarkMode: false,
      toggleDarkMode: mockToggleDarkMode,
    });

    render(<DarkModeToggle />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('hover:shadow-xl');
    expect(button).toHaveClass('hover:scale-105');
  });

  it('should support dark mode background classes', () => {
    DarkModeContext.useDarkMode.mockReturnValue({
      isDarkMode: true,
      toggleDarkMode: mockToggleDarkMode,
    });

    render(<DarkModeToggle />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-slate-700');
    expect(button).toHaveClass('dark:bg-slate-800');
  });

  it('should have button type="button" to prevent form submission', () => {
    DarkModeContext.useDarkMode.mockReturnValue({
      isDarkMode: false,
      toggleDarkMode: mockToggleDarkMode,
    });

    render(<DarkModeToggle />);

    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'button');
  });

  it('should show yellow sun icon in dark mode', () => {
    DarkModeContext.useDarkMode.mockReturnValue({
      isDarkMode: true,
      toggleDarkMode: mockToggleDarkMode,
    });

    const { container } = render(<DarkModeToggle />);

    const sunIcon = container.querySelector('.lucide-sun');
    expect(sunIcon).toHaveClass('text-yellow-400');
  });

  it('should show white moon icon in light mode', () => {
    DarkModeContext.useDarkMode.mockReturnValue({
      isDarkMode: false,
      toggleDarkMode: mockToggleDarkMode,
    });

    const { container } = render(<DarkModeToggle />);

    const moonIcon = container.querySelector('.lucide-moon');
    expect(moonIcon).toHaveClass('text-white');
  });

  it('should have transition effects', () => {
    DarkModeContext.useDarkMode.mockReturnValue({
      isDarkMode: false,
      toggleDarkMode: mockToggleDarkMode,
    });

    render(<DarkModeToggle />);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('transition-all');
  });
});
