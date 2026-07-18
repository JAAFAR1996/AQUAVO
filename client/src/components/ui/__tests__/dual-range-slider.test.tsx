/**
 * DualRangeSlider accessibility tests (Phase D).
 * The price-range filter's two thumbs must each carry a distinct Arabic
 * accessible name and expose their current value to assistive technology.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DualRangeSlider } from '../dual-range-slider';

function renderSlider(value: [number, number] = [10000, 80000]) {
    return render(
        <DualRangeSlider
            min={0}
            max={100000}
            step={1000}
            value={value}
            onValueChange={vi.fn()}
            formatValue={(v) => `${v.toLocaleString()} د.ع`}
        />
    );
}

describe('DualRangeSlider accessibility', () => {
    it('gives the minimum-price thumb a distinct Arabic accessible name', () => {
        renderSlider();
        expect(screen.getByRole('slider', { name: 'الحد الأدنى للسعر' })).toBeInTheDocument();
    });

    it('gives the maximum-price thumb a distinct Arabic accessible name', () => {
        renderSlider();
        expect(screen.getByRole('slider', { name: 'الحد الأقصى للسعر' })).toBeInTheDocument();
    });

    it('exposes the two thumbs as separate, distinctly-named sliders', () => {
        renderSlider();
        const sliders = screen.getAllByRole('slider');
        expect(sliders).toHaveLength(2);
        const names = sliders.map((s) => s.getAttribute('aria-label'));
        expect(new Set(names).size).toBe(2);
    });

    it('exposes the current value of each thumb', () => {
        renderSlider([10000, 80000]);
        const min = screen.getByRole('slider', { name: 'الحد الأدنى للسعر' });
        const max = screen.getByRole('slider', { name: 'الحد الأقصى للسعر' });
        // Radix supplies aria-valuenow; the component adds a formatted aria-valuetext.
        expect(min).toHaveAttribute('aria-valuenow', '10000');
        expect(max).toHaveAttribute('aria-valuenow', '80000');
        expect(min).toHaveAttribute('aria-valuetext', '10,000 د.ع');
        expect(max).toHaveAttribute('aria-valuetext', '80,000 د.ع');
    });
});
