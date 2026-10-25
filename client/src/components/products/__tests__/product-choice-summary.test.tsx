import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProductChoiceSummary } from '../product-choice-summary';
describe('product choice summary', () => {
  it('hides an empty summary instead of inventing suitability', () => {
    const { container } = render(<ProductChoiceSummary facts={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
  it('keeps scale disclosure and selected option attached to measurements', () => {
    render(<ProductChoiceSummary dimensions variantLabel="كبير" facts={[{kind:'size',label:'الأبعاد',value:'20×30 سم'},{kind:'requirement',label:'يحتاج',value:'مضخة'}]} />);
    expect(screen.getByText('كبير')).toBeVisible();
    expect(screen.getByText('20×30 سم')).toBeVisible();
    expect(screen.getByText(/الصورة مو مقياس/)).toBeVisible();
    expect(screen.queryByText('مضخة')).not.toBeInTheDocument();
  });
});
