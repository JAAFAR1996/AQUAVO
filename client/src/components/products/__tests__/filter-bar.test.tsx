/**
 * FilterBar quick-filter chip accessibility tests (Phase D).
 * Toggle-style filter chips must report aria-pressed reflecting the active
 * state, and activation (native button → click / Enter / Space) must still
 * change the filter state without altering filter behaviour.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterBar } from '../filter-bar';
import type { FilterState } from '../filter-modal';

function baseFilters(overrides: Partial<FilterState> = {}): FilterState {
    return {
        priceRange: [0, 100000],
        categories: [],
        brands: [],
        difficulties: [],
        tags: [],
        ...overrides,
    };
}

function renderBar(filters: FilterState, onFiltersChange = vi.fn()) {
    render(
        <FilterBar
            filters={filters}
            onFiltersChange={onFiltersChange}
            onOpenFilterModal={vi.fn()}
            activeFiltersCount={0}
            maxPrice={100000}
            minPrice={0}
        />
    );
    return { onFiltersChange };
}

describe('FilterBar quick-filter chips', () => {
    it('reports aria-pressed="false" on an inactive chip', () => {
        renderBar(baseFilters({ tags: [] }));
        expect(screen.getByRole('button', { name: 'جديد' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('reports aria-pressed="true" on an active chip', () => {
        renderBar(baseFilters({ tags: ['جديد'] }));
        expect(screen.getByRole('button', { name: 'جديد' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('changes filter state on activation (adds the tag)', async () => {
        const user = userEvent.setup();
        const { onFiltersChange } = renderBar(baseFilters({ tags: [] }));
        await user.click(screen.getByRole('button', { name: 'جديد' }));
        expect(onFiltersChange).toHaveBeenCalledTimes(1);
        expect(onFiltersChange).toHaveBeenCalledWith(
            expect.objectContaining({ tags: expect.arrayContaining(['جديد']) })
        );
    });

    it('changes filter state on activation (removes an active tag) without touching price/category filters', async () => {
        const user = userEvent.setup();
        const { onFiltersChange } = renderBar(baseFilters({ tags: ['جديد'], priceRange: [1000, 5000], categories: ['فلاتر'] }));
        await user.click(screen.getByRole('button', { name: 'جديد' }));
        expect(onFiltersChange).toHaveBeenCalledTimes(1);
        const next = onFiltersChange.mock.calls[0][0] as FilterState;
        expect(next.tags).not.toContain('جديد');
        // Unrelated filter dimensions are preserved unchanged.
        expect(next.priceRange).toEqual([1000, 5000]);
        expect(next.categories).toEqual(['فلاتر']);
    });

    it('activates a chip via keyboard (Enter) same as a click', async () => {
        const user = userEvent.setup();
        const { onFiltersChange } = renderBar(baseFilters({ tags: [] }));
        const chip = screen.getByRole('button', { name: 'جديد' });
        chip.focus();
        await user.keyboard('{Enter}');
        expect(onFiltersChange).toHaveBeenCalledTimes(1);
        expect(onFiltersChange).toHaveBeenCalledWith(
            expect.objectContaining({ tags: expect.arrayContaining(['جديد']) })
        );
    });

    it('activates a chip via keyboard (Space) same as a click', async () => {
        const user = userEvent.setup();
        const { onFiltersChange } = renderBar(baseFilters({ tags: [] }));
        const chip = screen.getByRole('button', { name: 'جديد' });
        chip.focus();
        await user.keyboard(' ');
        expect(onFiltersChange).toHaveBeenCalledTimes(1);
        expect(onFiltersChange).toHaveBeenCalledWith(
            expect.objectContaining({ tags: expect.arrayContaining(['جديد']) })
        );
    });
});

describe('FilterBar mobile touch targets (WCAG 2.5.8 target size, min 44px)', () => {
    it('gives every quick-filter chip a >=44px min-height class', () => {
        renderBar(baseFilters());
        for (const name of ['جديد', 'الأكثر مبيعاً', 'صديق للبيئة']) {
            expect(screen.getByRole('button', { name })).toHaveClass('min-h-11');
        }
    });

    it('gives the الفلاتر trigger button a >=44px min-height class', () => {
        renderBar(baseFilters());
        expect(screen.getByRole('button', { name: /الفلاتر/ })).toHaveClass('min-h-11');
    });

    it('gives the السعر trigger button a >=44px min-height class', () => {
        renderBar(baseFilters());
        expect(screen.getByRole('button', { name: /السعر/ })).toHaveClass('min-h-11');
    });

    it('does not leave h-auto overriding the touch-target min-height on the trigger buttons', () => {
        renderBar(baseFilters());
        expect(screen.getByRole('button', { name: /الفلاتر/ })).not.toHaveClass('h-auto');
        expect(screen.getByRole('button', { name: /السعر/ })).not.toHaveClass('h-auto');
    });

    // The shared Button used to shrink to md:min-h-9 / md:min-h-8 at tablet width,
    // so these controls carried an explicit `md:min-h-11` to counter it. 681f54eb
    // removed the shrinking variants outright, which makes the unprefixed
    // `min-h-11` apply at EVERY breakpoint — a stronger guarantee than the old
    // counter-class. What must never come back is a breakpoint-scoped override
    // that drops any of these controls back under 44px.
    it('keeps the trigger buttons at >=44px min-height at tablet width too', () => {
        renderBar(baseFilters());
        for (const name of [/الفلاتر/, /السعر/]) {
            const button = screen.getByRole('button', { name });
            expect(button).toHaveClass('min-h-11');
            expect(button.className).not.toMatch(/\b(sm|md|lg|xl):min-h-(?!11\b|12\b)/);
        }
    });

    it('keeps every quick-filter chip at >=44px min-height at tablet width too', () => {
        renderBar(baseFilters());
        for (const name of ['جديد', 'الأكثر مبيعاً', 'صديق للبيئة']) {
            const chip = screen.getByRole('button', { name });
            expect(chip).toHaveClass('min-h-11');
            expect(chip.className).not.toMatch(/\b(sm|md|lg|xl):min-h-(?!11\b|12\b)/);
        }
    });
});

/**
 * Text-containment regression tests (visual QA finding on /products mobile
 * & tablet: "الأكثر مبيعاً" / "صديق للبيئة" wrapped to 2 lines inside a
 * 44px-tall pill because the label span had no `whitespace-nowrap`, and the
 * buttons could be squeezed by the overflow-x-auto row because they had no
 * `flex-shrink-0`.)
 */
describe('FilterBar quick-filter chip + trigger text containment', () => {
    it('gives every quick-filter chip label whitespace-nowrap so multi-word Arabic labels do not wrap to 2 lines', () => {
        renderBar(baseFilters());
        for (const name of ['جديد', 'الأكثر مبيعاً', 'صديق للبيئة']) {
            const btn = screen.getByRole('button', { name });
            const label = btn.querySelector('span');
            expect(label).not.toBeNull();
            expect(label).toHaveClass('whitespace-nowrap');
        }
    });

    it('gives every quick-filter chip flex-shrink-0 so the row scrolls instead of squeezing the chip', () => {
        renderBar(baseFilters());
        for (const name of ['جديد', 'الأكثر مبيعاً', 'صديق للبيئة']) {
            expect(screen.getByRole('button', { name })).toHaveClass('flex-shrink-0');
        }
    });

    it('gives the الفلاتر and السعر trigger buttons flex-shrink-0', () => {
        renderBar(baseFilters());
        expect(screen.getByRole('button', { name: /الفلاتر/ })).toHaveClass('flex-shrink-0');
        expect(screen.getByRole('button', { name: /السعر/ })).toHaveClass('flex-shrink-0');
    });

    it('gives the الفلاتر and السعر trigger labels whitespace-nowrap', () => {
        renderBar(baseFilters());
        const filterLabel = screen.getByRole('button', { name: /الفلاتر/ }).querySelector('span');
        const priceLabel = screen.getByRole('button', { name: /السعر/ }).querySelector('span');
        expect(filterLabel).toHaveClass('whitespace-nowrap');
        expect(priceLabel).toHaveClass('whitespace-nowrap');
    });
});
