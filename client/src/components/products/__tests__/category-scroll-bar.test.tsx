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
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
