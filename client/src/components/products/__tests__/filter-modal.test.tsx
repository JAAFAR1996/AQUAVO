/**
 * FilterModal FilterPill accessibility + behaviour tests (Phase D gap-closure).
 *
 * Covers the source change in filter-modal.tsx: toggle-style FilterPills must
 * report aria-pressed reflecting the selected state, activation must change the
 * real selected filter state (propagated on Apply), decorative icon/check
 * glyphs must not be announced, and existing filter behaviour must be unchanged.
 */
import { describe, it, expect, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
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

describe('FilterModal draft preview and brand disclosure', () => {
    const brands = Array.from({ length: 12 }, (_, index) => `Brand ${index + 1}`);
    const mount = (overrides: Partial<React.ComponentProps<typeof FilterModal>> = {}) => render(
        <FilterModal isOpen onClose={vi.fn()} filters={baseFilters()} onApplyFilters={vi.fn()}
            availableBrands={brands} maxPrice={100000} {...overrides} />,
    );

    it('shows eight brands, reveals the rest, and keeps a selected extra brand visible on collapse', async () => {
        const user = userEvent.setup();
        mount();
        expect(screen.getByRole('button', { name: 'Brand 8' })).toBeVisible();
        expect(screen.queryByRole('button', { name: 'Brand 9' })).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: 'عرض باقي الماركات (4)' }));
        await user.click(screen.getByRole('button', { name: 'Brand 12' }));
        await user.click(screen.getByRole('button', { name: 'عرض ماركات أقل' }));
        expect(screen.getByRole('button', { name: 'Brand 12' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.queryByRole('button', { name: 'Brand 9' })).not.toBeInTheDocument();
    });

    it('does not hide a single remaining brand', () => {
        mount({ availableBrands: brands.slice(0, 9) });
        expect(screen.getByRole('button', { name: 'Brand 9' })).toBeVisible();
        expect(screen.queryByRole('button', { name: /عرض باقي الماركات/ })).not.toBeInTheDocument();
    });

    it('discards cancelled drafts when reopened with the current applied filters', async () => {
        const user = userEvent.setup();
        const filters = baseFilters();
        const props = { onClose: vi.fn(), onApplyFilters: vi.fn(), filters, availableBrands: brands, maxPrice: 100000 };
        const { rerender } = render(<FilterModal {...props} isOpen />);
        await user.click(screen.getByRole('button', { name: 'Brand 1' }));
        rerender(<FilterModal {...props} isOpen={false} />);
        rerender(<FilterModal {...props} isOpen />);
        expect(screen.getByRole('button', { name: 'Brand 1' })).toHaveAttribute('aria-pressed', 'false');
        expect(props.onApplyFilters).not.toHaveBeenCalled();
    });

    it('hides the old count during a draft change and ignores late responses', async () => {
        const user = userEvent.setup();
        let resolveOld!: (count: number) => void;
        const getResultCount = vi.fn((draft: FilterState) => draft.brands.length
            ? Promise.resolve(0) : new Promise<number>(resolve => { resolveOld = resolve; }));
        mount({ getResultCount, resultCount: 99 });
        await waitFor(() => expect(getResultCount).toHaveBeenCalledTimes(1));
        await user.click(screen.getByRole('button', { name: 'Brand 1' }));
        expect(screen.getByRole('button', { name: 'جاري حساب النتائج…' })).toHaveAttribute('aria-busy', 'true');
        expect(screen.queryByText('عرض 99 منتج')).not.toBeInTheDocument();
        await screen.findByRole('button', { name: 'عرض 0 منتج' });
        await act(async () => resolveOld(99));
        expect(screen.getByRole('button', { name: 'عرض 0 منتج' })).toBeVisible();
    });

    it('still applies the draft after a preview error without showing an invented count', async () => {
        const user = userEvent.setup();
        const apply = vi.fn();
        mount({ onApplyFilters: apply, getResultCount: vi.fn().mockRejectedValue(new Error('offline')) });
        await screen.findByRole('status');
        await user.click(screen.getByRole('button', { name: 'عرض النتائج' }));
        expect(apply).toHaveBeenCalledWith(baseFilters());
    });
});
