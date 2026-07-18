/**
 * CategoryScrollBar count-badge contrast tests.
 *
 * A browser-verified WCAG audit found the category-count badges (e.g. "(4)",
 * "(13)") rendering at 4.02:1 contrast on /products at 390px — below the
 * WCAG AA normal-text threshold of 4.5:1. This was caused by the badge text
 * inheriting `text-muted-foreground` (translucent white) at reduced opacity
 * over a translucent chip background, which composites down to ~#7a848a on
 * ~#152731.
 *
 * The fix gives the badge an explicit, solid foreground/background pair
 * (identity colors #0B1E28 / #075F6B backgrounds with #F6F4EF foreground)
 * so the ratio is fixed and calculable rather than dependent on inherited/
 * stacked opacity. This file asserts the resolved colors reach >=4.5:1 in
 * both the inactive and active states, that the two states stay visually
 * distinguishable, that the badge text stays in the accessible name, that no
 * rejected brand token is introduced, and that category-toggle behaviour is
 * unchanged.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CategoryScrollBar } from '../category-scroll-bar';

// ---------------------------------------------------------------------------
// WCAG 2.x relative luminance / contrast ratio (calculated, not eyeballed)
// ---------------------------------------------------------------------------
function hexToRgb(hex: string): [number, number, number] {
    const clean = hex.replace('#', '');
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return [r, g, b];
}

function channelLuminance(c: number): number {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function relativeLuminance([r, g, b]: [number, number, number]): number {
    return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

function contrastRatio(hexA: string, hexB: string): number {
    const lA = relativeLuminance(hexToRgb(hexA));
    const lB = relativeLuminance(hexToRgb(hexB));
    const lighter = Math.max(lA, lB);
    const darker = Math.min(lA, lB);
    return (lighter + 0.05) / (darker + 0.05);
}

// Resolved token pairs actually applied by CategoryScrollBar's badges.
const INACTIVE_BG = '#0B1E28'; // --aqv-bg-dark
const ACTIVE_BG = '#075F6B'; // --aqv-primary-dark-shade
const BADGE_FG = '#F6F4EF'; // --aqv-bg-light, reused as near-white badge text

const REJECTED_TOKENS = ['#FF7B5A', '#ff7b5a', '#FFD700', '#ffd700', '#199BB8', '#199bb8'];

function baseProps(overrides: Partial<React.ComponentProps<typeof CategoryScrollBar>> = {}) {
    return {
        categories: ['فلاتر', 'سخانات'],
        selectedCategories: [] as string[],
        onCategoryToggle: vi.fn(),
        categoryCounts: new Map([
            ['فلاتر', 4],
            ['سخانات', 13],
        ]),
        ...overrides,
    };
}

describe('CategoryScrollBar badge contrast (WCAG AA >= 4.5:1)', () => {
    it('calculates the inactive badge ratio as >= 4.5:1 (was 4.02:1 pre-fix)', () => {
        const ratio = contrastRatio(BADGE_FG, INACTIVE_BG);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('calculates the active badge ratio as >= 4.5:1', () => {
        const ratio = contrastRatio(BADGE_FG, ACTIVE_BG);
        expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('keeps active and inactive badge backgrounds visually distinguishable', () => {
        expect(ACTIVE_BG.toLowerCase()).not.toBe(INACTIVE_BG.toLowerCase());
        // The two backgrounds must differ by a perceptible luminance gap too,
        // not merely a different hex string.
        const diff = Math.abs(
            relativeLuminance(hexToRgb(ACTIVE_BG)) - relativeLuminance(hexToRgb(INACTIVE_BG))
        );
        expect(diff).toBeGreaterThan(0.01);
    });

    it('does not introduce any rejected brand token', () => {
        const combined = [INACTIVE_BG, ACTIVE_BG, BADGE_FG].join(' ');
        for (const rejected of REJECTED_TOKENS) {
            expect(combined.toLowerCase()).not.toContain(rejected.toLowerCase());
        }
    });
});

describe('CategoryScrollBar rendering + behaviour (contrast fix must not regress)', () => {
    it('renders the desktop badge with the fixed inactive colors and count exposed as text', () => {
        render(<CategoryScrollBar {...baseProps()} />);
        // Desktop pill count badge for "فلاتر" (4)
        const badge = screen.getAllByText('4')[0];
        expect(badge).toBeInTheDocument();
        expect(badge.className).toContain('bg-[#0B1E28]');
        expect(badge.className).toContain('text-[#F6F4EF]');
    });

    it('renders the active badge with the fixed active colors when the category is selected', () => {
        render(<CategoryScrollBar {...baseProps({ selectedCategories: ['فلاتر'] })} />);
        const badge = screen.getAllByText('4')[0];
        expect(badge.className).toContain('bg-[#075F6B]');
        expect(badge.className).toContain('text-[#F6F4EF]');
    });

    it('exposes the mobile inactive count text "(13)" inside the accessible button', () => {
        render(<CategoryScrollBar {...baseProps()} />);
        const buttons = screen.getAllByRole('button', { name: /سخانات/ });
        // At least one rendered button (mobile chip) must include the count in its accessible name.
        expect(buttons.some(btn => /\(13\)/.test(btn.textContent ?? ''))).toBe(true);
    });

    it('toggles category selection on click without altering the count value', async () => {
        const user = userEvent.setup();
        const onCategoryToggle = vi.fn();
        render(<CategoryScrollBar {...baseProps({ onCategoryToggle })} />);
        const buttons = screen.getAllByRole('button', { name: /فلاتر/ });
        await user.click(buttons[0]);
        expect(onCategoryToggle).toHaveBeenCalledWith('فلاتر');
    });

    it('clears all selected categories when the "الكل" button is clicked', async () => {
        const user = userEvent.setup();
        const onCategoryToggle = vi.fn();
        render(
            <CategoryScrollBar
                {...baseProps({ selectedCategories: ['فلاتر'], onCategoryToggle })}
            />
        );
        const allButtons = screen.getAllByRole('button', { name: 'الكل' });
        await user.click(allButtons[0]);
        expect(onCategoryToggle).toHaveBeenCalledWith('فلاتر');
    });
});

/**
 * Accessible-name tests for the desktop arrow-scroll icon buttons.
 *
 * axe flagged both icon-only scroll buttons (containing only a Chevron icon,
 * no text) as `button-name` violations (critical). Each now gets a distinct
 * aria-label whose wording is tied to the REAL effect of the scroll() call it
 * triggers, not to the icon shape or button position (both of which are
 * mirrored/inverted under the RTL scrollBy sign convention used here).
 *
 * Verified direction mapping (see scroll() in category-scroll-bar.tsx):
 *   scroll("left")  -> scrollBy left delta that always moves scrollLeft
 *                      TOWARD 0 (the start), in both RTL (-max..0) and LTR
 *                      (0..max) ranges -> reveals EARLIER categories.
 *   scroll("right") -> scrollBy left delta that always moves scrollLeft
 *                      AWAY FROM 0 (toward the far end) -> reveals LATER
 *                      categories.
 * This holds independent of document.dir, so the two aria-labels below are
 * fixed to "السابقة" (earlier/previous) for the scroll("left") button and
 * "التالية" (next/later) for the scroll("right") button.
 */
describe('CategoryScrollBar desktop arrow-scroll buttons (a11y: button-name)', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    // jsdom reports scrollWidth/clientWidth as 0 by default, so the arrows
    // (which are conditionally rendered based on scroll position vs size)
    // never appear unless we simulate an overflowing, partially-scrolled
    // container. This mocks the layout metrics on the scrollable row so both
    // showLeftArrow and showRightArrow become true, then fires the "resize"
    // listener the component itself attaches to recompute their visibility.
    function renderWithBothArrowsVisible() {
        // jsdom's layout engine always reports 0 for scrollWidth/clientWidth,
        // so the real getters must be replaced (not just shadowed with an
        // own-property after mount) BEFORE the component's effect runs, or
        // checkScrollPosition() computes against all-zero metrics and both
        // arrows stay hidden.
        vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(1000);
        vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300);
        vi.spyOn(HTMLElement.prototype, 'scrollLeft', 'get').mockReturnValue(100);

        const utils = render(<CategoryScrollBar {...baseProps()} />);
        // Two elements share the `.overflow-x-auto` class: the mobile chip
        // row (index 0) and the desktop pill row (index 1, inside the
        // `hidden sm:block` wrapper) which owns the arrow buttons.
        const scrollContainer = utils.container.querySelectorAll(
            '.overflow-x-auto'
        )[1] as HTMLElement;
        expect(scrollContainer).toBeTruthy();

        // Trigger a recompute now that the mocked metrics are in place (the
        // component's own "resize" listener calls checkScrollPosition()).
        act(() => {
            window.dispatchEvent(new Event('resize'));
        });

        return { ...utils, scrollContainer };
    }

    it('gives both icon-only scroll buttons a non-empty accessible name', () => {
        renderWithBothArrowsVisible();
        const earlierBtn = screen.getByRole('button', { name: 'التمرير لعرض الفئات السابقة' });
        const laterBtn = screen.getByRole('button', { name: 'التمرير لعرض الفئات التالية' });
        expect(earlierBtn).toBeInTheDocument();
        expect(laterBtn).toBeInTheDocument();
    });

    it('gives the two scroll buttons distinct accessible names', () => {
        renderWithBothArrowsVisible();
        const earlierBtn = screen.getByRole('button', { name: 'التمرير لعرض الفئات السابقة' });
        const laterBtn = screen.getByRole('button', { name: 'التمرير لعرض الفئات التالية' });
        expect(earlierBtn.getAttribute('aria-label')).not.toBe(laterBtn.getAttribute('aria-label'));
    });

    it('labels the scroll("left") button as revealing earlier categories', () => {
        renderWithBothArrowsVisible();
        const earlierBtn = screen.getByRole('button', { name: 'التمرير لعرض الفئات السابقة' });
        // scroll("left") is wired to the ChevronRight icon rendered at the
        // right-0 edge (showLeftArrow branch) in the component source.
        expect(earlierBtn.querySelector('svg')).toBeTruthy();
    });

    it('labels the scroll("right") button as revealing later categories', () => {
        renderWithBothArrowsVisible();
        const laterBtn = screen.getByRole('button', { name: 'التمرير لعرض الفئات التالية' });
        // scroll("right") is wired to the ChevronLeft icon rendered at the
        // left-0 edge (showRightArrow branch) in the component source.
        expect(laterBtn.querySelector('svg')).toBeTruthy();
    });

    it('marks the decorative chevron icons as aria-hidden', () => {
        renderWithBothArrowsVisible();
        const earlierBtn = screen.getByRole('button', { name: 'التمرير لعرض الفئات السابقة' });
        const laterBtn = screen.getByRole('button', { name: 'التمرير لعرض الفئات التالية' });
        expect(earlierBtn.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
        expect(laterBtn.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('activates the earlier-categories scroll handler via click (keyboard-equivalent activation)', async () => {
        const user = userEvent.setup();
        const { scrollContainer } = renderWithBothArrowsVisible();
        const scrollBySpy = vi.fn();
        scrollContainer.scrollBy = scrollBySpy;

        const earlierBtn = screen.getByRole('button', { name: 'التمرير لعرض الفئات السابقة' });
        earlierBtn.focus();
        await user.keyboard('{Enter}');
        expect(scrollBySpy).toHaveBeenCalledTimes(1);

        await user.keyboard(' ');
        expect(scrollBySpy).toHaveBeenCalledTimes(2);
    });

    it('activates the later-categories scroll handler via click (keyboard-equivalent activation)', async () => {
        const user = userEvent.setup();
        const { scrollContainer } = renderWithBothArrowsVisible();
        const scrollBySpy = vi.fn();
        scrollContainer.scrollBy = scrollBySpy;

        const laterBtn = screen.getByRole('button', { name: 'التمرير لعرض الفئات التالية' });
        laterBtn.focus();
        await user.keyboard('{Enter}');
        expect(scrollBySpy).toHaveBeenCalledTimes(1);
    });

    it('does not render the desktop arrow buttons when the row does not overflow (unchanged conditional render)', () => {
        // Default jsdom layout metrics (scrollWidth === clientWidth === 0)
        // mean showLeftArrow/showRightArrow both stay false on mount.
        render(<CategoryScrollBar {...baseProps()} />);
        expect(screen.queryByRole('button', { name: 'التمرير لعرض الفئات السابقة' })).toBeNull();
        expect(screen.queryByRole('button', { name: 'التمرير لعرض الفئات التالية' })).toBeNull();
    });
});

/**
 * RTL scroll-arrow visibility regression tests.
 *
 * Bug: checkScrollPosition()'s RTL branch had showRightArrow/showLeftArrow
 * swapped. In RTL, scrollLeft uses the negative-scrollLeft convention:
 * scrollLeft=0 is the START (first/rightmost category) and
 * scrollLeft=-(scrollWidth-clientWidth) is the END (last/leftmost category).
 * At the start, the actionable arrow is "التالية" (next, scroll("right")) —
 * pre-fix, it was hidden and the no-op "السابقة" (previous) showed instead.
 * At the end, the reverse should hold. These tests set document.dir="rtl"
 * and drive the scroll container through both boundaries to assert the
 * correct (not the inverted) arrow is visible at each edge.
 */
describe('CategoryScrollBar RTL scroll-arrow visibility (checkScrollPosition)', () => {
    const originalDir = document.documentElement.dir;

    afterEach(() => {
        document.documentElement.dir = originalDir;
        vi.restoreAllMocks();
    });

    function renderRTLWithScrollLeft(scrollLeft: number, scrollWidth = 1000, clientWidth = 300) {
        document.documentElement.dir = 'rtl';
        vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(scrollWidth);
        vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(clientWidth);
        vi.spyOn(HTMLElement.prototype, 'scrollLeft', 'get').mockReturnValue(scrollLeft);

        const utils = render(<CategoryScrollBar {...baseProps()} />);
        act(() => {
            window.dispatchEvent(new Event('resize'));
        });
        return utils;
    }

    it('at the RTL start (scrollLeft=0), shows the actionable "التالية" (next) arrow, not the no-op "السابقة"', () => {
        renderRTLWithScrollLeft(0);
        expect(screen.getByRole('button', { name: 'التمرير لعرض الفئات التالية' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'التمرير لعرض الفئات السابقة' })).toBeNull();
    });

    it('at the RTL true end (scrollLeft=-(scrollWidth-clientWidth)), shows "السابقة" (previous), not "التالية"', () => {
        renderRTLWithScrollLeft(-(1000 - 300));
        expect(screen.getByRole('button', { name: 'التمرير لعرض الفئات السابقة' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'التمرير لعرض الفئات التالية' })).toBeNull();
    });

    it('at the RTL true end with subpixel rounding noise, still hides "التالية" (tolerance guards against false positives)', () => {
        // Browsers can report a fractional scrollLeft a hair short of the exact
        // computed end (e.g. -1773.33 vs a computed -1774). Without a tolerance
        // buffer this used to make both arrows appear simultaneously.
        renderRTLWithScrollLeft(-999.5, 1000, 300);
        expect(screen.queryByRole('button', { name: 'التمرير لعرض الفئات التالية' })).toBeNull();
        expect(screen.getByRole('button', { name: 'التمرير لعرض الفئات السابقة' })).toBeInTheDocument();
    });

    it('in the RTL middle of the strip, shows both arrows (both directions actionable)', () => {
        renderRTLWithScrollLeft(-350, 1000, 300);
        expect(screen.getByRole('button', { name: 'التمرير لعرض الفئات التالية' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'التمرير لعرض الفئات السابقة' })).toBeInTheDocument();
    });
});
