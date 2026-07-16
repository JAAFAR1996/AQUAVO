/**
 * CompareButton state-transition tests (Phase D gap-closure).
 *
 * The compare toggle must keep its accessible Arabic name and aria-pressed in
 * sync with the real comparison state. Rendered through the REAL
 * ComparisonProvider (not a static mock) so a reversed ternary or a stale
 * accessible label would fail this test.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComparisonProvider } from '@/contexts/comparison-context';
import { CompareButton } from '../product-comparison';

vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

function renderCompare() {
    return render(
        <ComparisonProvider>
            <CompareButton productId="p1" variant="icon" />
        </ComparisonProvider>
    );
}

// The only button in the tree; its accessible name changes with state, so we
// read the live element's attributes rather than re-querying by name.
function getBtn() {
    return screen.getByRole('button');
}

describe('CompareButton state transitions', () => {
    beforeEach(() => {
        localStorage.clear();
        // Force reduced-motion so the add path skips the canvas-confetti import.
        vi.stubGlobal(
            'matchMedia',
            vi.fn().mockReturnValue({
                matches: true,
                media: '(prefers-reduced-motion: reduce)',
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                addListener: vi.fn(),
                removeListener: vi.fn(),
                dispatchEvent: vi.fn(),
            })
        );
    });
    afterEach(() => {
        vi.unstubAllGlobals();
        localStorage.clear();
    });

    it('starts not-pressed with the "add to compare" name', () => {
        renderCompare();
        const btn = getBtn();
        expect(btn).toHaveAttribute('aria-pressed', 'false');
        expect(btn).toHaveAccessibleName('إضافة للمقارنة');
    });

    it('toggles pressed/name on mouse activation and back again', async () => {
        const user = userEvent.setup();
        renderCompare();

        // Initial
        expect(getBtn()).toHaveAttribute('aria-pressed', 'false');
        expect(getBtn()).toHaveAccessibleName('إضافة للمقارنة');

        // Activate → in comparison
        await user.click(getBtn());
        expect(getBtn()).toHaveAttribute('aria-pressed', 'true');
        expect(getBtn()).toHaveAccessibleName('إزالة من المقارنة');

        // Activate again → removed
        await user.click(getBtn());
        expect(getBtn()).toHaveAttribute('aria-pressed', 'false');
        expect(getBtn()).toHaveAccessibleName('إضافة للمقارنة');
    });

    it('toggles via native keyboard activation (Enter and Space)', async () => {
        const user = userEvent.setup();
        renderCompare();

        getBtn().focus();
        expect(getBtn()).toHaveFocus();

        await user.keyboard('{Enter}');
        expect(getBtn()).toHaveAttribute('aria-pressed', 'true');
        expect(getBtn()).toHaveAccessibleName('إزالة من المقارنة');

        await user.keyboard(' ');
        expect(getBtn()).toHaveAttribute('aria-pressed', 'false');
        expect(getBtn()).toHaveAccessibleName('إضافة للمقارنة');
    });

    it('keeps the decorative compare icon out of the accessible name', () => {
        renderCompare();
        const icon = getBtn().querySelector('svg');
        expect(icon).not.toBeNull();
        expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
});
