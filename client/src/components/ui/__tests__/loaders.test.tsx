/**
 * Behavior guards for the branded route loader:
 *  - the pending marker mounts immediately so Flow Gate sees a lazy route,
 *  - the visual waits briefly so fast navigations do not flash,
 *  - once shown it exposes one polite status and the concise AQUAVO copy,
 *  - it clears its timer cleanly on unmount.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { PageLoader } from '../loaders';

describe('PageLoader (branded route transition)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('mounts its pending marker immediately but keeps the visual hidden', () => {
    const { container } = render(<PageLoader />);
    const loader = container.querySelector('[data-aqv-loader]');
    expect(loader).toBeInTheDocument();
    expect(loader).toHaveAttribute('data-visible', 'false');
  });

  it('reveals a single polite status with the concise Arabic message after 180ms', () => {
    render(<PageLoader />);
    act(() => {
      vi.advanceTimersByTime(180);
    });
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('dir', 'rtl');
    expect(status).toHaveAttribute('data-visible', 'true');
    expect(screen.getByText('العمق يتشكّل…')).toBeInTheDocument();
  });

  it('clears its delay timer on unmount (cannot get stuck / leak)', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { unmount } = render(<PageLoader />);
    unmount();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});
