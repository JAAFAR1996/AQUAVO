/**
 * FilterModal FilterPill accessibility + behaviour tests (Phase D gap-closure).
 *
 * Covers the source change in filter-modal.tsx: toggle-style FilterPills must
 * report aria-pressed reflecting the selected state, activation must change the
 * real selected filter state (propagated on Apply), decorative icon/check
 * glyphs must not be announced, and existing filter behaviour must be unchanged.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterModal, type FilterState } from '../filter-modal';

function baseFilters(overrides: Partial<FilterState> = {}): FilterState {
    return {
        priceRange: [0, 100000],
        categories: ['فلاتر'],
        brands: [],
        difficulties: [],
        tags: [],
        ...overrides,
    };
}

function renderModal(filters: FilterState, onApplyFilters = vi.fn()) {
    render(
        <FilterModal
            isOpen
            onClose={vi.fn()}
            filters={filters}
            onApplyFilters={onApplyFilters}
            availableBrands={["YEE", "Houyi"]}
            maxPrice={100000}
            minPrice={0}
            resultCount={12}
        />
    );
    return { onApplyFilters };
}

describe('FilterModal FilterPill', () => {
    it('reports aria-pressed="false" on an inactive tag pill', () => {
        renderModal(baseFilters({ tags: [] }));
        expect(screen.getByRole('button', { name: 'جديد' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('reports aria-pressed="true" on an active tag pill', () => {
        renderModal(baseFilters({ tags: ['جديد'] }));
        expect(screen.getByRole('button', { name: 'جديد' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('flips aria-pressed when activated and back when activated again', async () => {
        const user = userEvent.setup();
        renderModal(baseFilters({ tags: [] }));
        const pill = screen.getByRole('button', { name: 'جديد' });

        expect(pill).toHaveAttribute('aria-pressed', 'false');
        await user.click(pill);
        expect(pill).toHaveAttribute('aria-pressed', 'true');
        await user.click(pill);
        expect(pill).toHaveAttribute('aria-pressed', 'false');
    });

    it('changes the real selected filter state and propagates it on Apply', async () => {
        const user = userEvent.setup();
        const { onApplyFilters } = renderModal(baseFilters({ tags: [] }));

        await user.click(screen.getByRole('button', { name: 'جديد' }));
        await user.click(screen.getByRole('button', { name: /عرض .* منتج/ }));

        expect(onApplyFilters).toHaveBeenCalledTimes(1);
        const applied = onApplyFilters.mock.calls[0][0] as FilterState;
        expect(applied.tags).toContain('جديد');
        // Unrelated filter dimensions are preserved unchanged.
        expect(applied.categories).toEqual(['فلاتر']);
        expect(applied.priceRange).toEqual([0, 100000]);
        expect(applied.brands).toEqual([]);
    });

    it('removes the filter when toggled off before Apply', async () => {
        const user = userEvent.setup();
        const { onApplyFilters } = renderModal(baseFilters({ tags: ['جديد'] }));

        await user.click(screen.getByRole('button', { name: 'جديد' })); // toggle off
        await user.click(screen.getByRole('button', { name: /عرض .* منتج/ }));

        const applied = onApplyFilters.mock.calls[0][0] as FilterState;
        expect(applied.tags).not.toContain('جديد');
    });

    it('does not redundantly announce the decorative icon or check glyph', () => {
        renderModal(baseFilters({ tags: ['جديد'] }));
        const pill = screen.getByRole('button', { name: 'جديد' });
        // The accessible name is exactly the label — icon/check do not leak in.
        expect(pill).toHaveAccessibleName('جديد');
        // A selected pill renders both a leading icon and a trailing check; every
        // svg glyph inside it must be hidden from assistive technology.
        const svgs = Array.from(pill.querySelectorAll('svg'));
        expect(svgs.length).toBeGreaterThanOrEqual(2);
        for (const svg of svgs) {
            expect(svg).toHaveAttribute('aria-hidden', 'true');
        }
    });
});
