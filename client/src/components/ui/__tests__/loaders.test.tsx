/**
 * Behavior guards for the branded route loader:
 *  - a ~140ms delay so fast navigations never flash the loader,
 *  - once shown it exposes a single polite status for screen readers,
 *  - it mounts/unmounts cleanly (as a Suspense fallback it can never get stuck).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { PageLoader } from '../loaders';

describe('PageLoader (branded route transition)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    // Switch back to real timers; any un-advanced delay timer is simply dropped
    // (avoids firing a post-test setState outside act()).
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('renders nothing during the ~140ms delay (no flash on fast navigation)', () => {
    const { container } = render(<PageLoader />);
    expect(container.firstChild).toBeNull();
  });

  it('reveals a single polite status with the Arabic loading message after the delay', () => {
    render(<PageLoader />);
    act(() => {
      vi.advanceTimersByTime(160);
    });
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('dir', 'rtl');
    expect(screen.getByText('جارٍ تجهيز الصفحة...')).toBeInTheDocument();
  });

  it('clears its delay timer on unmount (cannot get stuck / leak)', () => {
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { unmount } = render(<PageLoader />);
    unmount();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});
